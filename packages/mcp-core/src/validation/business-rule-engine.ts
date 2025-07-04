import { ValidationResult, ValidationError, ValidationWarning, ValidationContext, ValidationErrorCodes } from './model-validators'

/**
 * Business rule definition
 */
export interface BusinessRule {
  id: string
  name: string
  description: string
  category: 'data_integrity' | 'business_logic' | 'security' | 'performance' | 'compliance'
  severity: 'error' | 'warning' | 'info'
  enabled: boolean
  priority: number // Higher number = higher priority
  appliesTo: string[] // Model names this rule applies to
  conditions: RuleCondition[]
  actions: RuleAction[]
  metadata?: Record<string, any>
}

/**
 * Rule condition definition
 */
export interface RuleCondition {
  field: string
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'not_contains' | 'in' | 'not_in' | 'exists' | 'not_exists' | 'regex' | 'custom'
  value: any
  customValidator?: (data: any, context: ValidationContext) => Promise<boolean>
}

/**
 * Rule action definition
 */
export interface RuleAction {
  type: 'validate' | 'transform' | 'log' | 'notify' | 'block'
  message: string
  code: string
  transform?: (data: any) => any
  metadata?: Record<string, any>
}

/**
 * Rule execution result
 */
export interface RuleExecutionResult {
  ruleId: string
  ruleName: string
  passed: boolean
  severity: 'error' | 'warning' | 'info'
  message?: string
  code?: string
  transformedData?: any
  metadata?: Record<string, any>
}

/**
 * Cross-model validation context
 */
export interface CrossModelContext extends ValidationContext {
  relatedModels?: Record<string, any>
  currentModel: string
  modelData: any
}

/**
 * Business rule validation engine with complex business logic enforcement
 */
export class BusinessRuleEngine {
  private rules: Map<string, BusinessRule> = new Map()
  private rulesByModel: Map<string, BusinessRule[]> = new Map()
  private dbConnection: any

  constructor(dbConnection?: any) {
    this.dbConnection = dbConnection
    this.initializeSystemRules()
  }

  /**
   * Initialize system-defined business rules
   */
  private initializeSystemRules(): void {
    // List hierarchy depth rule
    this.addRule({
      id: 'list_max_depth',
      name: 'Maximum List Hierarchy Depth',
      description: 'Prevents lists from being nested too deeply',
      category: 'business_logic',
      severity: 'error',
      enabled: true,
      priority: 100,
      appliesTo: ['list'],
      conditions: [
        {
          field: 'parentListId',
          operator: 'exists',
          value: true
        }
      ],
      actions: [
        {
          type: 'validate',
          message: 'Maximum nesting depth of 5 levels exceeded',
          code: ValidationErrorCodes.BUSINESS_RULE_VIOLATION
        }
      ]
    })

    // Item dependency completion rule
    this.addRule({
      id: 'item_dependency_completion',
      name: 'Item Dependency Completion Check',
      description: 'Ensures items cannot be completed while dependencies are incomplete',
      category: 'business_logic',
      severity: 'error',
      enabled: true,
      priority: 90,
      appliesTo: ['item'],
      conditions: [
        {
          field: 'status',
          operator: 'equals',
          value: 'completed'
        },
        {
          field: 'dependencies',
          operator: 'exists',
          value: true
        }
      ],
      actions: [
        {
          type: 'validate',
          message: 'Cannot complete item while dependencies are incomplete',
          code: ValidationErrorCodes.BUSINESS_RULE_VIOLATION
        }
      ]
    })

    // Due date reasonableness rule
    this.addRule({
      id: 'reasonable_due_date',
      name: 'Reasonable Due Date',
      description: 'Warns about unreasonable due dates',
      category: 'data_integrity',
      severity: 'warning',
      enabled: true,
      priority: 50,
      appliesTo: ['item'],
      conditions: [
        {
          field: 'dueDate',
          operator: 'exists',
          value: true
        }
      ],
      actions: [
        {
          type: 'validate',
          message: 'Due date appears unreasonable',
          code: 'UNREASONABLE_DUE_DATE'
        }
      ]
    })

    // Workload balance rule
    this.addRule({
      id: 'user_workload_balance',
      name: 'User Workload Balance',
      description: 'Warns when assigning too many items to a single user',
      category: 'performance',
      severity: 'warning',
      enabled: true,
      priority: 60,
      appliesTo: ['item'],
      conditions: [
        {
          field: 'assignedTo',
          operator: 'exists',
          value: true
        }
      ],
      actions: [
        {
          type: 'validate',
          message: 'User has high workload - consider redistributing tasks',
          code: 'HIGH_USER_WORKLOAD'
        }
      ]
    })

    // Data retention rule
    this.addRule({
      id: 'data_retention_compliance',
      name: 'Data Retention Compliance',
      description: 'Ensures compliance with data retention policies',
      category: 'compliance',
      severity: 'error',
      enabled: true,
      priority: 95,
      appliesTo: ['list', 'item'],
      conditions: [
        {
          field: 'status',
          operator: 'equals',
          value: 'deleted'
        }
      ],
      actions: [
        {
          type: 'validate',
          message: 'Data retention policy violation',
          code: 'DATA_RETENTION_VIOLATION'
        }
      ]
    })
  }

  /**
   * Add a business rule
   */
  addRule(rule: BusinessRule): void {
    this.rules.set(rule.id, rule)
    
    // Index by model
    for (const modelName of rule.appliesTo) {
      if (!this.rulesByModel.has(modelName)) {
        this.rulesByModel.set(modelName, [])
      }
      this.rulesByModel.get(modelName)!.push(rule)
    }
    
    // Sort rules by priority (higher priority first)
    for (const modelRules of this.rulesByModel.values()) {
      modelRules.sort((a, b) => b.priority - a.priority)
    }
  }

  /**
   * Remove a business rule
   */
  removeRule(ruleId: string): void {
    const rule = this.rules.get(ruleId)
    if (rule) {
      this.rules.delete(ruleId)
      
      // Remove from model index
      for (const modelName of rule.appliesTo) {
        const modelRules = this.rulesByModel.get(modelName)
        if (modelRules) {
          const index = modelRules.findIndex(r => r.id === ruleId)
          if (index >= 0) {
            modelRules.splice(index, 1)
          }
        }
      }
    }
  }

  /**
   * Execute business rules for a model
   */
  async executeRules(
    modelName: string, 
    data: any, 
    context: CrossModelContext
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      success: true,
      errors: [],
      warnings: []
    }

    const modelRules = this.rulesByModel.get(modelName) || []
    const enabledRules = modelRules.filter(rule => rule.enabled)

    for (const rule of enabledRules) {
      try {
        const ruleResult = await this.executeRule(rule, data, context)
        
        if (!ruleResult.passed) {
          const validationItem = {
            field: 'business_rule',
            code: ruleResult.code || ValidationErrorCodes.BUSINESS_RULE_VIOLATION,
            message: ruleResult.message || `Business rule '${rule.name}' failed`,
            severity: ruleResult.severity,
            context: {
              ruleId: rule.id,
              ruleName: rule.name,
              ...ruleResult.metadata
            }
          }

          if (ruleResult.severity === 'error') {
            result.success = false
            result.errors.push(validationItem as ValidationError)
          } else if (ruleResult.severity === 'warning') {
            result.warnings.push(validationItem as ValidationWarning)
          }
        }

        // Apply transformations if any
        if (ruleResult.transformedData) {
          Object.assign(data, ruleResult.transformedData)
        }

      } catch (error) {
        result.success = false
        result.errors.push({
          field: 'business_rule',
          code: 'RULE_EXECUTION_ERROR',
          message: `Error executing rule '${rule.name}': ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'error',
          context: { ruleId: rule.id, ruleName: rule.name }
        })
      }
    }

    return result
  }

  /**
   * Execute a single business rule
   */
  private async executeRule(
    rule: BusinessRule, 
    data: any, 
    context: CrossModelContext
  ): Promise<RuleExecutionResult> {
    // Check if all conditions are met
    const conditionsMet = await this.evaluateConditions(rule.conditions, data, context)
    
    if (!conditionsMet) {
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        passed: true,
        severity: rule.severity
      }
    }

    // Execute actions
    for (const action of rule.actions) {
      switch (action.type) {
        case 'validate':
          const validationPassed = await this.executeValidationAction(action, data, context)
          if (!validationPassed) {
            return {
              ruleId: rule.id,
              ruleName: rule.name,
              passed: false,
              severity: rule.severity,
              message: action.message,
              code: action.code,
              metadata: action.metadata
            }
          }
          break

        case 'transform':
          if (action.transform) {
            const transformedData = action.transform(data)
            return {
              ruleId: rule.id,
              ruleName: rule.name,
              passed: true,
              severity: rule.severity,
              transformedData,
              metadata: action.metadata
            }
          }
          break

        case 'log':
          console.log(`Business rule log [${rule.name}]: ${action.message}`, {
            ruleId: rule.id,
            data,
            context
          })
          break

        case 'notify':
          // This would trigger notifications
          break

        case 'block':
          return {
            ruleId: rule.id,
            ruleName: rule.name,
            passed: false,
            severity: 'error',
            message: action.message,
            code: action.code,
            metadata: action.metadata
          }
      }
    }

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      passed: true,
      severity: rule.severity
    }
  }

  /**
   * Evaluate rule conditions
   */
  private async evaluateConditions(
    conditions: RuleCondition[], 
    data: any, 
    context: CrossModelContext
  ): Promise<boolean> {
    for (const condition of conditions) {
      const conditionMet = await this.evaluateCondition(condition, data, context)
      if (!conditionMet) {
        return false
      }
    }
    return true
  }

  /**
   * Evaluate a single condition
   */
  private async evaluateCondition(
    condition: RuleCondition, 
    data: any, 
    context: CrossModelContext
  ): Promise<boolean> {
    const fieldValue = this.getFieldValue(data, condition.field)

    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value
      case 'not_equals':
        return fieldValue !== condition.value
      case 'greater_than':
        return fieldValue > condition.value
      case 'less_than':
        return fieldValue < condition.value
      case 'contains':
        return Array.isArray(fieldValue) ? fieldValue.includes(condition.value) : 
               typeof fieldValue === 'string' ? fieldValue.includes(condition.value) : false
      case 'not_contains':
        return Array.isArray(fieldValue) ? !fieldValue.includes(condition.value) : 
               typeof fieldValue === 'string' ? !fieldValue.includes(condition.value) : true
      case 'in':
        return Array.isArray(condition.value) ? condition.value.includes(fieldValue) : false
      case 'not_in':
        return Array.isArray(condition.value) ? !condition.value.includes(fieldValue) : true
      case 'exists':
        return condition.value ? (fieldValue !== null && fieldValue !== undefined) : 
                                (fieldValue === null || fieldValue === undefined)
      case 'not_exists':
        return condition.value ? (fieldValue === null || fieldValue === undefined) : 
                                (fieldValue !== null && fieldValue !== undefined)
      case 'regex':
        if (typeof fieldValue === 'string' && typeof condition.value === 'string') {
          const regex = new RegExp(condition.value)
          return regex.test(fieldValue)
        }
        return false
      case 'custom':
        if (condition.customValidator) {
          return await condition.customValidator(data, context)
        }
        return true
      default:
        return true
    }
  }

  /**
   * Execute validation action
   */
  private async executeValidationAction(
    action: RuleAction, 
    data: any, 
    context: CrossModelContext
  ): Promise<boolean> {
    // This would contain the specific validation logic for each action
    // For now, we'll implement some common validations
    
    switch (action.code) {
      case ValidationErrorCodes.BUSINESS_RULE_VIOLATION:
        // Generic business rule validation
        return false
      
      case 'UNREASONABLE_DUE_DATE':
        return this.validateReasonableDueDate(data)
      
      case 'HIGH_USER_WORKLOAD':
        return await this.validateUserWorkload(data, context)
      
      default:
        return true
    }
  }

  /**
   * Helper validation methods
   */
  private validateReasonableDueDate(data: any): boolean {
    if (!data.dueDate) return true
    
    const dueDate = new Date(data.dueDate)
    const now = new Date()
    const oneYearFromNow = new Date()
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1)
    
    // Warn if due date is more than 1 year in the future or in the past
    return dueDate >= now && dueDate <= oneYearFromNow
  }

  private async validateUserWorkload(data: any, context: CrossModelContext): Promise<boolean> {
    if (!data.assignedTo) return true
    
    // This would check the user's current workload
    // For now, we'll simulate
    const userWorkload = await this.getUserWorkload(data.assignedTo)
    return userWorkload < 20 // Arbitrary threshold
  }

  private async getUserWorkload(userId: string): Promise<number> {
    // This would query the database for the user's current workload
    return 5 // Placeholder
  }

  private getFieldValue(data: any, fieldPath: string): any {
    const parts = fieldPath.split('.')
    let value = data
    
    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part]
      } else {
        return undefined
      }
    }
    
    return value
  }

  /**
   * Get rules for a model
   */
  getRulesForModel(modelName: string): BusinessRule[] {
    return this.rulesByModel.get(modelName) || []
  }

  /**
   * Get all rules
   */
  getAllRules(): BusinessRule[] {
    return Array.from(this.rules.values())
  }

  /**
   * Enable/disable a rule
   */
  setRuleEnabled(ruleId: string, enabled: boolean): void {
    const rule = this.rules.get(ruleId)
    if (rule) {
      rule.enabled = enabled
    }
  }
}

import { z } from 'zod'
import { BaseModelValidator, ValidationContext, ValidationResult, ModelConstraint, ValidationErrorCodes } from './model-validators'
import { ValidationSchemas } from './schemas'

/**
 * Item model types
 */
export interface Item {
  id: string
  listId: string
  title: string
  description?: string
  position: number
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'blocked'
  dueDate?: Date
  estimatedDuration?: number
  actualDuration?: number
  tags?: string[]
  dependencies?: string[]
  createdBy?: string
  assignedTo?: string
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
  metadata?: Record<string, any>
}

export interface CreateItemData {
  listId: string
  title: string
  description?: string
  position?: number
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  dueDate?: Date
  estimatedDuration?: number
  tags?: string[]
  dependencies?: string[]
  assignedTo?: string
  metadata?: Record<string, any>
}

export interface UpdateItemData {
  title?: string
  description?: string
  position?: number
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'blocked'
  dueDate?: Date
  estimatedDuration?: number
  actualDuration?: number
  tags?: string[]
  dependencies?: string[]
  assignedTo?: string
  completedAt?: Date
  metadata?: Record<string, any>
}

/**
 * Item model validator with dependency management and business rules
 */
export class ItemValidator extends BaseModelValidator<Item, CreateItemData, UpdateItemData> {
  protected modelName = 'item'
  protected createSchema = ValidationSchemas.createItemSchema
  protected updateSchema = ValidationSchemas.updateItemSchema

  constructor() {
    super()
    this.initializeConstraints()
    this.initializeBusinessRules()
  }

  /**
   * Initialize database constraints
   */
  private initializeConstraints(): void {
    // List foreign key constraint
    this.addConstraint({
      name: 'list_exists',
      type: 'foreign_key',
      validate: async (data: CreateItemData | UpdateItemData, context: ValidationContext): Promise<ValidationResult> => {
        const listId = (data as CreateItemData).listId
        if (!listId) {
          return { success: true, errors: [], warnings: [] }
        }

        const listExists = await this.checkListExists(listId, context)
        
        if (!listExists) {
          return {
            success: false,
            errors: [{
              field: 'listId',
              code: ValidationErrorCodes.FOREIGN_KEY_VIOLATION,
              message: `List with ID '${listId}' does not exist`,
              severity: 'error',
              context: { listId }
            }],
            warnings: []
          }
        }

        return { success: true, errors: [], warnings: [] }
      }
    })

    // Dependencies constraint
    this.addConstraint({
      name: 'dependencies_exist',
      type: 'foreign_key',
      validate: async (data: CreateItemData | UpdateItemData, context: ValidationContext): Promise<ValidationResult> => {
        if (!data.dependencies || data.dependencies.length === 0) {
          return { success: true, errors: [], warnings: [] }
        }

        const errors = []
        for (const depId of data.dependencies) {
          const exists = await this.checkItemExists(depId, context)
          if (!exists) {
            errors.push({
              field: 'dependencies',
              code: ValidationErrorCodes.FOREIGN_KEY_VIOLATION,
              message: `Dependency item with ID '${depId}' does not exist`,
              severity: 'error' as const,
              context: { dependencyId: depId }
            })
          }
        }

        return {
          success: errors.length === 0,
          errors,
          warnings: []
        }
      }
    })

    // Circular dependency constraint
    this.addConstraint({
      name: 'no_circular_dependencies',
      type: 'check',
      validate: async (data: CreateItemData | UpdateItemData, context: ValidationContext): Promise<ValidationResult> => {
        if (!data.dependencies || data.dependencies.length === 0) {
          return { success: true, errors: [], warnings: [] }
        }

        // This would check for circular dependencies in the dependency graph
        const hasCircularDep = await this.checkCircularDependencies(data.dependencies, context)
        
        if (hasCircularDep) {
          return {
            success: false,
            errors: [{
              field: 'dependencies',
              code: ValidationErrorCodes.CIRCULAR_DEPENDENCY,
              message: 'Adding these dependencies would create a circular dependency',
              severity: 'error',
              context: { dependencies: data.dependencies }
            }],
            warnings: []
          }
        }

        return { success: true, errors: [], warnings: [] }
      }
    })

    // Assigned user constraint
    this.addConstraint({
      name: 'assigned_user_exists',
      type: 'foreign_key',
      validate: async (data: CreateItemData | UpdateItemData, context: ValidationContext): Promise<ValidationResult> => {
        if (!data.assignedTo) {
          return { success: true, errors: [], warnings: [] }
        }

        const userExists = await this.checkUserExists(data.assignedTo, context)
        
        if (!userExists) {
          return {
            success: false,
            errors: [{
              field: 'assignedTo',
              code: ValidationErrorCodes.FOREIGN_KEY_VIOLATION,
              message: `User with ID '${data.assignedTo}' does not exist`,
              severity: 'error',
              context: { assignedTo: data.assignedTo }
            }],
            warnings: []
          }
        }

        return { success: true, errors: [], warnings: [] }
      }
    })
  }

  /**
   * Initialize business rules
   */
  private initializeBusinessRules(): void {
    // Due date validation rule
    this.addBusinessRule({
      name: 'due_date_validation',
      type: 'business_rule',
      validate: async (data: CreateItemData | UpdateItemData, context: ValidationContext): Promise<ValidationResult> => {
        const errors = []
        const warnings = []

        if (data.dueDate) {
          const now = new Date()
          const dueDate = new Date(data.dueDate)

          // Warning for past due dates
          if (dueDate < now) {
            warnings.push({
              field: 'dueDate',
              code: 'PAST_DUE_DATE',
              message: 'Due date is in the past',
              context: { dueDate: data.dueDate, now }
            })
          }

          // Warning for very distant due dates (more than 1 year)
          const oneYearFromNow = new Date()
          oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1)
          
          if (dueDate > oneYearFromNow) {
            warnings.push({
              field: 'dueDate',
              code: 'DISTANT_DUE_DATE',
              message: 'Due date is more than one year in the future',
              context: { dueDate: data.dueDate, oneYearFromNow }
            })
          }
        }

        return {
          success: true,
          errors,
          warnings
        }
      }
    })

    // Duration validation rule
    this.addBusinessRule({
      name: 'duration_validation',
      type: 'business_rule',
      validate: async (data: CreateItemData | UpdateItemData, context: ValidationContext): Promise<ValidationResult> => {
        const errors = []
        const warnings = []

        // Actual duration should not exceed estimated duration by more than 200%
        if (data.actualDuration && data.estimatedDuration) {
          const ratio = data.actualDuration / data.estimatedDuration
          if (ratio > 2.0) {
            warnings.push({
              field: 'actualDuration',
              code: 'DURATION_OVERRUN',
              message: `Actual duration (${data.actualDuration}min) significantly exceeds estimated duration (${data.estimatedDuration}min)`,
              context: { 
                actualDuration: data.actualDuration, 
                estimatedDuration: data.estimatedDuration,
                ratio 
              }
            })
          }
        }

        // Very long durations (more than 40 hours) should be warned
        if (data.estimatedDuration && data.estimatedDuration > 2400) { // 40 hours
          warnings.push({
            field: 'estimatedDuration',
            code: 'LONG_DURATION',
            message: 'Estimated duration is very long (>40 hours). Consider breaking into smaller tasks.',
            context: { estimatedDuration: data.estimatedDuration }
          })
        }

        return {
          success: true,
          errors,
          warnings
        }
      }
    })

    // Status transition rule
    this.addBusinessRule({
      name: 'valid_status_transition',
      type: 'business_rule',
      validate: async (data: UpdateItemData, context: ValidationContext): Promise<ValidationResult> => {
        if (!data.status || context.operation !== 'update') {
          return { success: true, errors: [], warnings: [] }
        }

        const currentStatus = await this.getCurrentStatus(context)
        const isValidTransition = this.isValidStatusTransition(currentStatus, data.status)
        
        if (!isValidTransition) {
          return {
            success: false,
            errors: [{
              field: 'status',
              code: ValidationErrorCodes.INVALID_STATE_TRANSITION,
              message: `Invalid status transition from '${currentStatus}' to '${data.status}'`,
              severity: 'error',
              context: { currentStatus, newStatus: data.status }
            }],
            warnings: []
          }
        }

        return { success: true, errors: [], warnings: [] }
      }
    })

    // Dependency completion rule
    this.addBusinessRule({
      name: 'dependency_completion_check',
      type: 'business_rule',
      validate: async (data: UpdateItemData, context: ValidationContext): Promise<ValidationResult> => {
        if (data.status !== 'in_progress' && data.status !== 'completed') {
          return { success: true, errors: [], warnings: [] }
        }

        const incompleteDependencies = await this.getIncompleteDependencies(context)
        
        if (incompleteDependencies.length > 0) {
          const severity = data.status === 'completed' ? 'error' : 'warning'
          const message = data.status === 'completed' 
            ? 'Cannot complete item while dependencies are incomplete'
            : 'Starting item while dependencies are incomplete'

          const result = {
            field: 'status',
            code: data.status === 'completed' 
              ? ValidationErrorCodes.BUSINESS_RULE_VIOLATION 
              : 'INCOMPLETE_DEPENDENCIES',
            message,
            severity,
            context: { 
              status: data.status, 
              incompleteDependencies: incompleteDependencies.map(d => d.id) 
            }
          }

          return {
            success: severity !== 'error',
            errors: severity === 'error' ? [result] : [],
            warnings: severity === 'warning' ? [result] : []
          }
        }

        return { success: true, errors: [], warnings: [] }
      }
    })
  }

  /**
   * Helper methods for constraint validation
   */
  private async checkListExists(listId: string, context: ValidationContext): Promise<boolean> {
    // This would be implemented with actual database access
    return true // Placeholder
  }

  private async checkItemExists(itemId: string, context: ValidationContext): Promise<boolean> {
    // This would be implemented with actual database access
    return true // Placeholder
  }

  private async checkUserExists(userId: string, context: ValidationContext): Promise<boolean> {
    // This would be implemented with actual database access
    return true // Placeholder
  }

  private async checkCircularDependencies(dependencies: string[], context: ValidationContext): Promise<boolean> {
    // This would check for circular dependencies in the dependency graph
    return false // Placeholder
  }

  private async getCurrentStatus(context: ValidationContext): Promise<string> {
    // This would get the current status from the database
    return 'pending' // Placeholder
  }

  private async getIncompleteDependencies(context: ValidationContext): Promise<Item[]> {
    // This would get incomplete dependencies from the database
    return [] // Placeholder
  }

  private isValidStatusTransition(currentStatus: string, newStatus: string): boolean {
    const validTransitions: Record<string, string[]> = {
      'pending': ['in_progress', 'cancelled', 'blocked'],
      'in_progress': ['completed', 'cancelled', 'blocked', 'pending'],
      'completed': ['in_progress'], // Allow reopening
      'cancelled': ['pending', 'in_progress'],
      'blocked': ['pending', 'in_progress', 'cancelled']
    }

    return validTransitions[currentStatus]?.includes(newStatus) || false
  }
}

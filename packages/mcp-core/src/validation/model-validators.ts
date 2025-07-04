import { z } from 'zod'
import { ValidationSchemas } from './schemas'

/**
 * Enhanced model validation system that connects Zod schemas to database models
 * with automatic validation, constraint checking, and business rule enforcement
 */

export interface ValidationContext {
  operation: 'create' | 'update' | 'delete'
  userId?: string
  skipBusinessRules?: boolean
  skipConstraints?: boolean
  transaction?: any
}

export interface ValidationResult<T = any> {
  success: boolean
  data?: T
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

export interface ValidationError {
  field: string
  code: string
  message: string
  severity: 'error' | 'warning'
  context?: Record<string, any>
}

export interface ValidationWarning {
  field: string
  code: string
  message: string
  context?: Record<string, any>
}

export interface ModelConstraint {
  name: string
  type: 'foreign_key' | 'unique' | 'check' | 'business_rule'
  validate: (data: any, context: ValidationContext) => Promise<ValidationResult>
  dependencies?: string[]
}

/**
 * Base model validator class
 */
export abstract class BaseModelValidator<TModel, TCreate, TUpdate> {
  protected abstract modelName: string
  protected abstract createSchema: z.ZodSchema<TCreate>
  protected abstract updateSchema: z.ZodSchema<TUpdate>
  protected constraints: Map<string, ModelConstraint> = new Map()
  protected businessRules: Map<string, ModelConstraint> = new Map()

  /**
   * Validate data for creation
   */
  async validateCreate(data: unknown, context: ValidationContext): Promise<ValidationResult<TCreate>> {
    const result: ValidationResult<TCreate> = {
      success: true,
      errors: [],
      warnings: []
    }

    try {
      // Schema validation
      const schemaResult = await this.validateSchema(data, this.createSchema, 'create')
      if (!schemaResult.success) {
        result.success = false
        result.errors.push(...schemaResult.errors)
        return result
      }

      result.data = schemaResult.data

      // Constraint validation
      if (!context.skipConstraints) {
        const constraintResult = await this.validateConstraints(result.data, context)
        result.errors.push(...constraintResult.errors)
        result.warnings.push(...constraintResult.warnings)
        if (!constraintResult.success) {
          result.success = false
        }
      }

      // Business rule validation
      if (!context.skipBusinessRules) {
        const businessRuleResult = await this.validateBusinessRules(result.data, context)
        result.errors.push(...businessRuleResult.errors)
        result.warnings.push(...businessRuleResult.warnings)
        if (!businessRuleResult.success) {
          result.success = false
        }
      }

    } catch (error) {
      result.success = false
      result.errors.push({
        field: 'general',
        code: 'VALIDATION_ERROR',
        message: error instanceof Error ? error.message : 'Unknown validation error',
        severity: 'error'
      })
    }

    return result
  }

  /**
   * Validate data for update
   */
  async validateUpdate(data: unknown, context: ValidationContext): Promise<ValidationResult<TUpdate>> {
    const result: ValidationResult<TUpdate> = {
      success: true,
      errors: [],
      warnings: []
    }

    try {
      // Schema validation
      const schemaResult = await this.validateSchema(data, this.updateSchema, 'update')
      if (!schemaResult.success) {
        result.success = false
        result.errors.push(...schemaResult.errors)
        return result
      }

      result.data = schemaResult.data

      // Constraint validation
      if (!context.skipConstraints) {
        const constraintResult = await this.validateConstraints(result.data, context)
        result.errors.push(...constraintResult.errors)
        result.warnings.push(...constraintResult.warnings)
        if (!constraintResult.success) {
          result.success = false
        }
      }

      // Business rule validation
      if (!context.skipBusinessRules) {
        const businessRuleResult = await this.validateBusinessRules(result.data, context)
        result.errors.push(...businessRuleResult.errors)
        result.warnings.push(...businessRuleResult.warnings)
        if (!businessRuleResult.success) {
          result.success = false
        }
      }

    } catch (error) {
      result.success = false
      result.errors.push({
        field: 'general',
        code: 'VALIDATION_ERROR',
        message: error instanceof Error ? error.message : 'Unknown validation error',
        severity: 'error'
      })
    }

    return result
  }

  /**
   * Validate schema using Zod
   */
  protected async validateSchema<T>(
    data: unknown, 
    schema: z.ZodSchema<T>, 
    operation: string
  ): Promise<ValidationResult<T>> {
    try {
      const validatedData = await schema.parseAsync(data)
      return {
        success: true,
        data: validatedData,
        errors: [],
        warnings: []
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.issues.map(issue => ({
          field: issue.path.join('.'),
          code: issue.code,
          message: issue.message,
          severity: 'error' as const,
          context: { operation, expected: issue.expected, received: issue.received }
        }))
        return {
          success: false,
          errors,
          warnings: []
        }
      }
      throw error
    }
  }

  /**
   * Validate constraints
   */
  protected async validateConstraints(data: any, context: ValidationContext): Promise<ValidationResult> {
    const result: ValidationResult = {
      success: true,
      errors: [],
      warnings: []
    }

    for (const [name, constraint] of this.constraints) {
      try {
        const constraintResult = await constraint.validate(data, context)
        result.errors.push(...constraintResult.errors)
        result.warnings.push(...constraintResult.warnings)
        if (!constraintResult.success) {
          result.success = false
        }
      } catch (error) {
        result.success = false
        result.errors.push({
          field: 'constraint',
          code: 'CONSTRAINT_ERROR',
          message: `Constraint '${name}' validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'error',
          context: { constraint: name }
        })
      }
    }

    return result
  }

  /**
   * Validate business rules
   */
  protected async validateBusinessRules(data: any, context: ValidationContext): Promise<ValidationResult> {
    const result: ValidationResult = {
      success: true,
      errors: [],
      warnings: []
    }

    for (const [name, rule] of this.businessRules) {
      try {
        const ruleResult = await rule.validate(data, context)
        result.errors.push(...ruleResult.errors)
        result.warnings.push(...ruleResult.warnings)
        if (!ruleResult.success) {
          result.success = false
        }
      } catch (error) {
        result.success = false
        result.errors.push({
          field: 'business_rule',
          code: 'BUSINESS_RULE_ERROR',
          message: `Business rule '${name}' validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'error',
          context: { rule: name }
        })
      }
    }

    return result
  }

  /**
   * Add constraint
   */
  addConstraint(constraint: ModelConstraint): void {
    this.constraints.set(constraint.name, constraint)
  }

  /**
   * Add business rule
   */
  addBusinessRule(rule: ModelConstraint): void {
    this.businessRules.set(rule.name, rule)
  }

  /**
   * Remove constraint
   */
  removeConstraint(name: string): void {
    this.constraints.delete(name)
  }

  /**
   * Remove business rule
   */
  removeBusinessRule(name: string): void {
    this.businessRules.delete(name)
  }

  /**
   * Get all constraints
   */
  getConstraints(): ModelConstraint[] {
    return Array.from(this.constraints.values())
  }

  /**
   * Get all business rules
   */
  getBusinessRules(): ModelConstraint[] {
    return Array.from(this.businessRules.values())
  }

  /**
   * Validate deletion constraints
   */
  async validateDelete(id: string, context: ValidationContext): Promise<ValidationResult> {
    const result: ValidationResult = {
      success: true,
      errors: [],
      warnings: []
    }

    // Check foreign key constraints that would prevent deletion
    for (const [name, constraint] of this.constraints) {
      if (constraint.type === 'foreign_key') {
        try {
          const constraintResult = await constraint.validate({ id }, { ...context, operation: 'delete' })
          result.errors.push(...constraintResult.errors)
          result.warnings.push(...constraintResult.warnings)
          if (!constraintResult.success) {
            result.success = false
          }
        } catch (error) {
          result.success = false
          result.errors.push({
            field: 'foreign_key',
            code: 'FK_CONSTRAINT_ERROR',
            message: `Foreign key constraint '${name}' prevents deletion: ${error instanceof Error ? error.message : 'Unknown error'}`,
            severity: 'error',
            context: { constraint: name, id }
          })
        }
      }
    }

    return result
  }

  /**
   * Get model name
   */
  getModelName(): string {
    return this.modelName
  }

  /**
   * Get create schema
   */
  getCreateSchema(): z.ZodSchema<TCreate> {
    return this.createSchema
  }

  /**
   * Get update schema
   */
  getUpdateSchema(): z.ZodSchema<TUpdate> {
    return this.updateSchema
  }
}

/**
 * Validation registry for managing model validators
 */
export class ValidationRegistry {
  private static instance: ValidationRegistry
  private validators: Map<string, BaseModelValidator<any, any, any>> = new Map()

  static getInstance(): ValidationRegistry {
    if (!ValidationRegistry.instance) {
      ValidationRegistry.instance = new ValidationRegistry()
    }
    return ValidationRegistry.instance
  }

  /**
   * Register a model validator
   */
  register<TModel, TCreate, TUpdate>(
    modelName: string,
    validator: BaseModelValidator<TModel, TCreate, TUpdate>
  ): void {
    this.validators.set(modelName, validator)
  }

  /**
   * Get a model validator
   */
  get<TModel, TCreate, TUpdate>(
    modelName: string
  ): BaseModelValidator<TModel, TCreate, TUpdate> | null {
    return this.validators.get(modelName) || null
  }

  /**
   * Check if a validator is registered
   */
  has(modelName: string): boolean {
    return this.validators.has(modelName)
  }

  /**
   * Get all registered model names
   */
  getModelNames(): string[] {
    return Array.from(this.validators.keys())
  }

  /**
   * Validate data for any model
   */
  async validateCreate(
    modelName: string,
    data: unknown,
    context: ValidationContext
  ): Promise<ValidationResult> {
    const validator = this.get(modelName)
    if (!validator) {
      return {
        success: false,
        errors: [{
          field: 'model',
          code: 'VALIDATOR_NOT_FOUND',
          message: `No validator registered for model '${modelName}'`,
          severity: 'error'
        }],
        warnings: []
      }
    }

    return await validator.validateCreate(data, context)
  }

  /**
   * Validate update data for any model
   */
  async validateUpdate(
    modelName: string,
    data: unknown,
    context: ValidationContext
  ): Promise<ValidationResult> {
    const validator = this.get(modelName)
    if (!validator) {
      return {
        success: false,
        errors: [{
          field: 'model',
          code: 'VALIDATOR_NOT_FOUND',
          message: `No validator registered for model '${modelName}'`,
          severity: 'error'
        }],
        warnings: []
      }
    }

    return await validator.validateUpdate(data, context)
  }

  /**
   * Validate deletion for any model
   */
  async validateDelete(
    modelName: string,
    id: string,
    context: ValidationContext
  ): Promise<ValidationResult> {
    const validator = this.get(modelName)
    if (!validator) {
      return {
        success: false,
        errors: [{
          field: 'model',
          code: 'VALIDATOR_NOT_FOUND',
          message: `No validator registered for model '${modelName}'`,
          severity: 'error'
        }],
        warnings: []
      }
    }

    return await validator.validateDelete(id, context)
  }
}

/**
 * Global validation registry instance
 */
export const validationRegistry = ValidationRegistry.getInstance()

/**
 * Validation error codes
 */
export const ValidationErrorCodes = {
  REQUIRED_FIELD: 'REQUIRED_FIELD',
  INVALID_TYPE: 'INVALID_TYPE',
  INVALID_FORMAT: 'INVALID_FORMAT',
  OUT_OF_RANGE: 'OUT_OF_RANGE',
  DUPLICATE_VALUE: 'DUPLICATE_VALUE',
  FOREIGN_KEY_VIOLATION: 'FOREIGN_KEY_VIOLATION',
  BUSINESS_RULE_VIOLATION: 'BUSINESS_RULE_VIOLATION',
  CONSTRAINT_VIOLATION: 'CONSTRAINT_VIOLATION',
  CIRCULAR_DEPENDENCY: 'CIRCULAR_DEPENDENCY',
  INVALID_STATE_TRANSITION: 'INVALID_STATE_TRANSITION',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  CONSTRAINT_ERROR: 'CONSTRAINT_ERROR',
  BUSINESS_RULE_ERROR: 'BUSINESS_RULE_ERROR',
  FK_CONSTRAINT_ERROR: 'FK_CONSTRAINT_ERROR',
  VALIDATOR_NOT_FOUND: 'VALIDATOR_NOT_FOUND'
} as const

export type ValidationErrorCode = typeof ValidationErrorCodes[keyof typeof ValidationErrorCodes]

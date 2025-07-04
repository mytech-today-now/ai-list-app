import { z } from 'zod'
import { BaseModelValidator, ValidationContext, ValidationResult, ModelConstraint, ValidationErrorCodes } from './model-validators'
import { ValidationSchemas } from './schemas'

/**
 * List model types
 */
export interface List {
  id: string
  title: string
  description?: string
  parentListId?: string
  position: number
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'active' | 'completed' | 'archived' | 'deleted'
  createdBy?: string
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
  metadata?: Record<string, any>
}

export interface CreateListData {
  title: string
  description?: string
  parentListId?: string
  position?: number
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  createdBy?: string
  metadata?: Record<string, any>
}

export interface UpdateListData {
  title?: string
  description?: string
  parentListId?: string
  position?: number
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  status?: 'active' | 'completed' | 'archived' | 'deleted'
  completedAt?: Date
  metadata?: Record<string, any>
}

/**
 * List model validator with hierarchical constraints and business rules
 */
export class ListValidator extends BaseModelValidator<List, CreateListData, UpdateListData> {
  protected modelName = 'list'
  protected createSchema = ValidationSchemas.createListSchema
  protected updateSchema = ValidationSchemas.updateListSchema

  constructor() {
    super()
    this.initializeConstraints()
    this.initializeBusinessRules()
  }

  /**
   * Initialize database constraints
   */
  private initializeConstraints(): void {
    // Parent list foreign key constraint
    this.addConstraint({
      name: 'parent_list_exists',
      type: 'foreign_key',
      validate: async (data: CreateListData | UpdateListData, context: ValidationContext): Promise<ValidationResult> => {
        if (!data.parentListId) {
          return { success: true, errors: [], warnings: [] }
        }

        // This would be implemented with actual database access
        // For now, we'll simulate the validation
        const parentExists = await this.checkParentListExists(data.parentListId, context)
        
        if (!parentExists) {
          return {
            success: false,
            errors: [{
              field: 'parentListId',
              code: ValidationErrorCodes.FOREIGN_KEY_VIOLATION,
              message: `Parent list with ID '${data.parentListId}' does not exist`,
              severity: 'error',
              context: { parentListId: data.parentListId }
            }],
            warnings: []
          }
        }

        return { success: true, errors: [], warnings: [] }
      }
    })

    // Circular reference constraint
    this.addConstraint({
      name: 'no_circular_reference',
      type: 'check',
      validate: async (data: CreateListData | UpdateListData, context: ValidationContext): Promise<ValidationResult> => {
        if (!data.parentListId) {
          return { success: true, errors: [], warnings: [] }
        }

        const wouldCreateCircle = await this.checkCircularReference(data.parentListId, context)
        
        if (wouldCreateCircle) {
          return {
            success: false,
            errors: [{
              field: 'parentListId',
              code: ValidationErrorCodes.CIRCULAR_DEPENDENCY,
              message: 'Setting this parent would create a circular reference',
              severity: 'error',
              context: { parentListId: data.parentListId }
            }],
            warnings: []
          }
        }

        return { success: true, errors: [], warnings: [] }
      }
    })

    // Title uniqueness within parent constraint
    this.addConstraint({
      name: 'unique_title_within_parent',
      type: 'unique',
      validate: async (data: CreateListData | UpdateListData, context: ValidationContext): Promise<ValidationResult> => {
        if (!data.title) {
          return { success: true, errors: [], warnings: [] }
        }

        const isDuplicate = await this.checkTitleDuplicateInParent(
          data.title, 
          data.parentListId || null, 
          context
        )
        
        if (isDuplicate) {
          return {
            success: false,
            errors: [{
              field: 'title',
              code: ValidationErrorCodes.DUPLICATE_VALUE,
              message: `A list with title '${data.title}' already exists in this parent`,
              severity: 'error',
              context: { title: data.title, parentListId: data.parentListId }
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
    // Maximum nesting depth rule
    this.addBusinessRule({
      name: 'max_nesting_depth',
      type: 'business_rule',
      validate: async (data: CreateListData | UpdateListData, context: ValidationContext): Promise<ValidationResult> => {
        if (!data.parentListId) {
          return { success: true, errors: [], warnings: [] }
        }

        const depth = await this.calculateNestingDepth(data.parentListId, context)
        const maxDepth = 5 // Business rule: maximum 5 levels of nesting
        
        if (depth >= maxDepth) {
          return {
            success: false,
            errors: [{
              field: 'parentListId',
              code: ValidationErrorCodes.BUSINESS_RULE_VIOLATION,
              message: `Maximum nesting depth of ${maxDepth} levels exceeded`,
              severity: 'error',
              context: { currentDepth: depth, maxDepth, parentListId: data.parentListId }
            }],
            warnings: []
          }
        }

        // Warning at 80% of max depth
        if (depth >= maxDepth * 0.8) {
          return {
            success: true,
            errors: [],
            warnings: [{
              field: 'parentListId',
              code: 'APPROACHING_MAX_DEPTH',
              message: `Approaching maximum nesting depth (${depth}/${maxDepth})`,
              context: { currentDepth: depth, maxDepth }
            }]
          }
        }

        return { success: true, errors: [], warnings: [] }
      }
    })

    // Status transition rule
    this.addBusinessRule({
      name: 'valid_status_transition',
      type: 'business_rule',
      validate: async (data: UpdateListData, context: ValidationContext): Promise<ValidationResult> => {
        if (!data.status || context.operation !== 'update') {
          return { success: true, errors: [], warnings: [] }
        }

        // This would get the current status from the database
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

    // Completion date consistency rule
    this.addBusinessRule({
      name: 'completion_date_consistency',
      type: 'business_rule',
      validate: async (data: UpdateListData, context: ValidationContext): Promise<ValidationResult> => {
        const errors = []
        const warnings = []

        // If status is completed, completedAt should be set
        if (data.status === 'completed' && !data.completedAt) {
          warnings.push({
            field: 'completedAt',
            code: 'MISSING_COMPLETION_DATE',
            message: 'Completion date should be set when status is completed',
            context: { status: data.status }
          })
        }

        // If status is not completed, completedAt should not be set
        if (data.status && data.status !== 'completed' && data.completedAt) {
          errors.push({
            field: 'completedAt',
            code: ValidationErrorCodes.BUSINESS_RULE_VIOLATION,
            message: 'Completion date should only be set when status is completed',
            severity: 'error' as const,
            context: { status: data.status, completedAt: data.completedAt }
          })
        }

        return {
          success: errors.length === 0,
          errors,
          warnings
        }
      }
    })
  }

  /**
   * Helper methods for constraint validation
   */
  private async checkParentListExists(parentListId: string, context: ValidationContext): Promise<boolean> {
    // This would be implemented with actual database access
    // For now, we'll simulate the check
    return true // Placeholder
  }

  private async checkCircularReference(parentListId: string, context: ValidationContext): Promise<boolean> {
    // This would traverse the parent hierarchy to check for circular references
    // For now, we'll simulate the check
    return false // Placeholder
  }

  private async checkTitleDuplicateInParent(
    title: string, 
    parentListId: string | null, 
    context: ValidationContext
  ): Promise<boolean> {
    // This would check for duplicate titles within the same parent
    // For now, we'll simulate the check
    return false // Placeholder
  }

  private async calculateNestingDepth(parentListId: string, context: ValidationContext): Promise<number> {
    // This would calculate the actual nesting depth
    // For now, we'll simulate the calculation
    return 1 // Placeholder
  }

  private async getCurrentStatus(context: ValidationContext): Promise<string> {
    // This would get the current status from the database
    // For now, we'll simulate
    return 'active' // Placeholder
  }

  private isValidStatusTransition(currentStatus: string, newStatus: string): boolean {
    const validTransitions: Record<string, string[]> = {
      'active': ['completed', 'archived', 'deleted'],
      'completed': ['active', 'archived', 'deleted'],
      'archived': ['active', 'deleted'],
      'deleted': [] // No transitions from deleted
    }

    return validTransitions[currentStatus]?.includes(newStatus) || false
  }
}

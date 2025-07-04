import { BaseService } from './base'
import { 
  getValidationSystem, 
  ValidationContext, 
  ValidationSystemResult 
} from '@mcp-core/validation'

/**
 * Enhanced base service with integrated validation system
 */
export abstract class EnhancedBaseService<TTable, TSelect, TInsert> extends BaseService<TTable, TSelect, TInsert> {
  protected abstract modelName: string

  /**
   * Create with comprehensive validation
   */
  async createWithValidation(
    data: TInsert, 
    context: Partial<ValidationContext> = {}
  ): Promise<{ success: boolean; data?: TSelect; errors: string[]; warnings: string[] }> {
    try {
      const validationSystem = getValidationSystem()
      
      // Validate the data
      const validationResult = await validationSystem.validateModel(
        this.modelName,
        data,
        {
          operation: 'create',
          ...context
        }
      )

      if (!validationResult.success) {
        return {
          success: false,
          errors: validationResult.errors,
          warnings: validationResult.warnings
        }
      }

      // Create the record if validation passes
      const createdRecord = await this.create(validationResult.modelValidation.data as TInsert)
      
      return {
        success: true,
        data: createdRecord,
        errors: [],
        warnings: validationResult.warnings
      }

    } catch (error) {
      return {
        success: false,
        errors: [`Creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: []
      }
    }
  }

  /**
   * Update with comprehensive validation
   */
  async updateWithValidation(
    id: string | number,
    data: Partial<TInsert>,
    context: Partial<ValidationContext> = {}
  ): Promise<{ success: boolean; data?: TSelect; errors: string[]; warnings: string[] }> {
    try {
      const validationSystem = getValidationSystem()
      
      // Validate the update data
      const validationResult = await validationSystem.validateModel(
        this.modelName,
        data,
        {
          operation: 'update',
          ...context
        }
      )

      if (!validationResult.success) {
        return {
          success: false,
          errors: validationResult.errors,
          warnings: validationResult.warnings
        }
      }

      // Update the record if validation passes
      const updatedRecord = await this.updateById(id, validationResult.modelValidation.data as Partial<TInsert>)
      
      if (!updatedRecord) {
        return {
          success: false,
          errors: [`Record with ID ${id} not found`],
          warnings: validationResult.warnings
        }
      }

      return {
        success: true,
        data: updatedRecord,
        errors: [],
        warnings: validationResult.warnings
      }

    } catch (error) {
      return {
        success: false,
        errors: [`Update failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: []
      }
    }
  }

  /**
   * Delete with cascade analysis
   */
  async deleteWithValidation(
    id: string | number,
    context: Partial<ValidationContext> = {}
  ): Promise<{ success: boolean; cascadeInfo?: any; errors: string[]; warnings: string[] }> {
    try {
      const validationSystem = getValidationSystem()
      
      // Validate the deletion
      const validationResult = await validationSystem.validateDeletion(
        this.modelName,
        String(id),
        {
          operation: 'delete',
          ...context
        }
      )

      if (!validationResult.success) {
        return {
          success: false,
          errors: validationResult.errors,
          warnings: validationResult.warnings
        }
      }

      // Perform the deletion if validation passes
      const deleted = await this.deleteById(id)
      
      if (!deleted) {
        return {
          success: false,
          errors: [`Record with ID ${id} not found or could not be deleted`],
          warnings: validationResult.warnings
        }
      }

      return {
        success: true,
        cascadeInfo: validationResult.metadata.cascadeAnalysis,
        errors: [],
        warnings: validationResult.warnings
      }

    } catch (error) {
      return {
        success: false,
        errors: [`Deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: []
      }
    }
  }

  /**
   * Batch operations with validation
   */
  async batchCreateWithValidation(
    items: TInsert[],
    context: Partial<ValidationContext> = {}
  ): Promise<{ 
    success: boolean; 
    created: TSelect[]; 
    failed: Array<{ item: TInsert; errors: string[] }>; 
    warnings: string[] 
  }> {
    const created: TSelect[] = []
    const failed: Array<{ item: TInsert; errors: string[] }> = []
    const allWarnings: string[] = []

    for (const item of items) {
      const result = await this.createWithValidation(item, context)
      
      if (result.success && result.data) {
        created.push(result.data)
      } else {
        failed.push({ item, errors: result.errors })
      }
      
      allWarnings.push(...result.warnings)
    }

    return {
      success: failed.length === 0,
      created,
      failed,
      warnings: allWarnings
    }
  }

  /**
   * Validate data without persisting
   */
  async validateOnly(
    data: TInsert | Partial<TInsert>,
    operation: 'create' | 'update',
    context: Partial<ValidationContext> = {}
  ): Promise<ValidationSystemResult> {
    const validationSystem = getValidationSystem()
    
    return await validationSystem.validateModel(
      this.modelName,
      data,
      {
        operation,
        ...context
      }
    )
  }

  /**
   * Get validation statistics for this model
   */
  getValidationStats(): Record<string, any> {
    const validationSystem = getValidationSystem()
    const stats = validationSystem.getValidationStats()
    
    return {
      modelName: this.modelName,
      hasValidator: stats.registeredValidators.includes(this.modelName),
      systemHealth: stats.systemHealth,
      lastValidation: new Date().toISOString()
    }
  }
}

/**
 * Enhanced Lists Service with validation
 */
export class EnhancedListsService extends EnhancedBaseService<any, any, any> {
  protected modelName = 'list'
  protected table = {} // This would be the actual lists table
  protected primaryKey = 'id' as const

  /**
   * Create list with hierarchy validation
   */
  async createListWithHierarchyCheck(
    data: any,
    context: Partial<ValidationContext> = {}
  ) {
    // Additional hierarchy-specific validation could go here
    return await this.createWithValidation(data, {
      ...context,
      skipBusinessRules: false // Ensure hierarchy rules are checked
    })
  }

  /**
   * Move list with circular reference prevention
   */
  async moveList(
    listId: string,
    newParentId: string | null,
    context: Partial<ValidationContext> = {}
  ) {
    return await this.updateWithValidation(
      listId,
      { parentListId: newParentId },
      context
    )
  }
}

/**
 * Enhanced Items Service with validation
 */
export class EnhancedItemsService extends EnhancedBaseService<any, any, any> {
  protected modelName = 'item'
  protected table = {} // This would be the actual items table
  protected primaryKey = 'id' as const

  /**
   * Create item with dependency validation
   */
  async createItemWithDependencies(
    data: any,
    context: Partial<ValidationContext> = {}
  ) {
    return await this.createWithValidation(data, {
      ...context,
      skipBusinessRules: false // Ensure dependency rules are checked
    })
  }

  /**
   * Update item status with business rule validation
   */
  async updateItemStatus(
    itemId: string,
    status: string,
    context: Partial<ValidationContext> = {}
  ) {
    return await this.updateWithValidation(
      itemId,
      { status },
      {
        ...context,
        skipBusinessRules: false // Ensure status transition rules are checked
      }
    )
  }

  /**
   * Add dependency with circular reference check
   */
  async addDependency(
    itemId: string,
    dependsOnItemId: string,
    context: Partial<ValidationContext> = {}
  ) {
    // Get current item to add to dependencies
    const currentItem = await this.findById(itemId)
    if (!currentItem) {
      return {
        success: false,
        errors: [`Item with ID ${itemId} not found`],
        warnings: []
      }
    }

    const currentDependencies = currentItem.dependencies || []
    const newDependencies = [...currentDependencies, dependsOnItemId]

    return await this.updateWithValidation(
      itemId,
      { dependencies: newDependencies },
      context
    )
  }
}

/**
 * Service factory with validation integration
 */
export class ValidatedServiceFactory {
  static createListsService(): EnhancedListsService {
    return new EnhancedListsService()
  }

  static createItemsService(): EnhancedItemsService {
    return new EnhancedItemsService()
  }

  /**
   * Initialize all services with validation
   */
  static async initializeServices(): Promise<{
    listsService: EnhancedListsService;
    itemsService: EnhancedItemsService;
  }> {
    // Ensure validation system is initialized
    try {
      const validationSystem = getValidationSystem()
      console.log('✅ Using existing validation system')
    } catch (error) {
      console.warn('⚠️ Validation system not initialized, services will work without validation')
    }

    return {
      listsService: this.createListsService(),
      itemsService: this.createItemsService()
    }
  }
}

// Export service instances
export const enhancedListsService = ValidatedServiceFactory.createListsService()
export const enhancedItemsService = ValidatedServiceFactory.createItemsService()

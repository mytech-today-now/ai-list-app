import { Request, Response } from 'express'
import { randomUUID } from 'crypto'
import { itemsService, listsService } from '../db/services'
import { 
  bulkSchemas,
  BulkCreateItemsSchema,
  BulkUpdateItemsSchema,
  BulkDeleteItemsSchema,
  BulkStatusItemsSchema,
  BulkMoveItemsSchema,
  BulkCreateListsSchema,
  BulkUpdateListsSchema,
  BulkDeleteListsSchema,
  BulkStatusListsSchema
} from '../validation/schemas'
import { NotFoundError, ValidationError, ConflictError } from '../middleware/errorHandler'
import { BulkOperationResult } from '../db/services/base'

/**
 * SemanticType: BulkOperationsController
 * Description: Controller for handling bulk operations on items and lists with proper error handling and response formatting
 * ExtensibleByAI: true
 * AIUseCases:
 *   - Add custom bulk operations
 *   - Extend validation rules
 *   - Add performance optimizations
 *   - Integrate with MCP protocols
 */
export class BulkOperationsController {
  /**
   * Create standardized API response for bulk operations
   */
  private createBulkResponse<T>(
    result: BulkOperationResult<T>,
    message: string,
    correlationId?: string
  ) {
    return {
      success: result.success,
      data: {
        results: result.results,
        summary: result.summary,
        errors: result.errors
      },
      message,
      timestamp: new Date().toISOString(),
      correlationId: correlationId || randomUUID()
    }
  }

  /**
   * Get request context
   */
  private getContext(req: Request, operation: string) {
    return {
      correlationId: req.headers['x-correlation-id'] as string || randomUUID(),
      userId: req.headers['x-user-id'] as string,
      agentId: req.headers['x-agent-id'] as string,
      operation
    }
  }

  /**
   * Validate request data
   */
  private validateData<T>(data: any, schema: any, type: string): { success: boolean; data?: T; errors?: any[] } {
    try {
      const result = schema.parse(data)
      return { success: true, data: result }
    } catch (error: any) {
      return {
        success: false,
        errors: error.errors || [{ message: `Invalid ${type} data` }]
      }
    }
  }

  /**
   * Handle validation errors
   */
  private handleValidationError(res: Response, errors: any[], correlationId: string) {
    res.status(400).json({
      success: false,
      error: 'Validation error',
      message: 'Request validation failed',
      details: errors,
      correlationId,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Handle server errors
   */
  private handleServerError(res: Response, error: Error, operation: string, correlationId: string) {
    console.error(`Bulk ${operation} error:`, error)
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: `Bulk ${operation} operation failed`,
      correlationId,
      timestamp: new Date().toISOString()
    })
  }

  // ===== ITEM BULK OPERATIONS =====

  /**
   * POST /api/bulk/items/create
   * Bulk create items
   */
  async bulkCreateItems(req: Request, res: Response): Promise<void> {
    const context = this.getContext(req, 'bulk-create-items')
    
    try {
      const validation = this.validateData<BulkCreateItemsSchema>(req.body, bulkSchemas.bulkCreateItems, 'bulk create items')
      
      if (!validation.success) {
        this.handleValidationError(res, validation.errors!, context.correlationId)
        return
      }

      const { items, options = {} } = validation.data!

      // Add system fields to each item
      const itemsWithSystemFields = items.map(item => ({
        ...item,
        id: randomUUID(),
        tags: item.tags ? JSON.stringify(item.tags) : null,
        dependencies: item.dependencies ? JSON.stringify(item.dependencies) : null,
        createdBy: context.userId || 'system',
        createdAt: new Date(),
        updatedAt: new Date()
      }))

      const result = await itemsService.bulkCreate(itemsWithSystemFields, {
        continueOnError: options.continueOnError,
        batchSize: 50
      })

      const statusCode = result.success ? 201 : (result.summary.successful > 0 ? 207 : 400)
      
      res.status(statusCode).json(this.createBulkResponse(
        result,
        `Bulk create completed: ${result.summary.successful}/${result.summary.total} items created`,
        context.correlationId
      ))
    } catch (error) {
      this.handleServerError(res, error as Error, 'create items', context.correlationId)
    }
  }

  /**
   * PUT /api/bulk/items/update
   * Bulk update items
   */
  async bulkUpdateItems(req: Request, res: Response): Promise<void> {
    const context = this.getContext(req, 'bulk-update-items')
    
    try {
      const validation = this.validateData<BulkUpdateItemsSchema>(req.body, bulkSchemas.bulkUpdateItems, 'bulk update items')
      
      if (!validation.success) {
        this.handleValidationError(res, validation.errors!, context.correlationId)
        return
      }

      const { updates, options = {} } = validation.data!

      // Add system fields to each update
      const updatesWithSystemFields = updates.map(update => ({
        id: update.id,
        data: {
          ...update.data,
          tags: update.data.tags ? JSON.stringify(update.data.tags) : undefined,
          dependencies: update.data.dependencies ? JSON.stringify(update.data.dependencies) : undefined,
          updatedAt: new Date(),
          ...(update.data.status === 'completed' && !update.data.completedAt ? { completedAt: new Date() } : {})
        }
      }))

      const result = await itemsService.bulkUpdate(updatesWithSystemFields, {
        continueOnError: options.continueOnError,
        batchSize: 50
      })

      const statusCode = result.success ? 200 : (result.summary.successful > 0 ? 207 : 400)
      
      res.status(statusCode).json(this.createBulkResponse(
        result,
        `Bulk update completed: ${result.summary.successful}/${result.summary.total} items updated`,
        context.correlationId
      ))
    } catch (error) {
      this.handleServerError(res, error as Error, 'update items', context.correlationId)
    }
  }

  /**
   * DELETE /api/bulk/items/delete
   * Bulk delete items
   */
  async bulkDeleteItems(req: Request, res: Response): Promise<void> {
    const context = this.getContext(req, 'bulk-delete-items')
    
    try {
      const validation = this.validateData<BulkDeleteItemsSchema>(req.body, bulkSchemas.bulkDeleteItems, 'bulk delete items')
      
      if (!validation.success) {
        this.handleValidationError(res, validation.errors!, context.correlationId)
        return
      }

      const { ids, options = {} } = validation.data!

      const result = await itemsService.bulkDelete(ids, {
        continueOnError: options.continueOnError,
        batchSize: 50
      })

      const statusCode = result.success ? 200 : (result.summary.successful > 0 ? 207 : 400)
      
      res.status(statusCode).json(this.createBulkResponse(
        result,
        `Bulk delete completed: ${result.summary.successful}/${result.summary.total} items deleted`,
        context.correlationId
      ))
    } catch (error) {
      this.handleServerError(res, error as Error, 'delete items', context.correlationId)
    }
  }

  /**
   * PATCH /api/bulk/items/status
   * Bulk update item status
   */
  async bulkUpdateItemStatus(req: Request, res: Response): Promise<void> {
    const context = this.getContext(req, 'bulk-update-item-status')
    
    try {
      const validation = this.validateData<BulkStatusItemsSchema>(req.body, bulkSchemas.bulkStatusItems, 'bulk status items')
      
      if (!validation.success) {
        this.handleValidationError(res, validation.errors!, context.correlationId)
        return
      }

      const { ids, status, options = {} } = validation.data!

      const result = await itemsService.bulkUpdateStatus(ids, status, {
        continueOnError: options.continueOnError,
        validateDependencies: true,
        updateTimestamps: options.updateTimestamps
      })

      const statusCode = result.success ? 200 : (result.summary.successful > 0 ? 207 : 400)
      
      res.status(statusCode).json(this.createBulkResponse(
        result,
        `Bulk status update completed: ${result.summary.successful}/${result.summary.total} items updated to ${status}`,
        context.correlationId
      ))
    } catch (error) {
      this.handleServerError(res, error as Error, 'update item status', context.correlationId)
    }
  }

  /**
   * PATCH /api/bulk/items/move
   * Bulk move items to different list
   */
  async bulkMoveItems(req: Request, res: Response): Promise<void> {
    const context = this.getContext(req, 'bulk-move-items')
    
    try {
      const validation = this.validateData<BulkMoveItemsSchema>(req.body, bulkSchemas.bulkMoveItems, 'bulk move items')
      
      if (!validation.success) {
        this.handleValidationError(res, validation.errors!, context.correlationId)
        return
      }

      const { ids, targetListId, options = {} } = validation.data!

      const result = await itemsService.bulkMoveToList(ids, targetListId, {
        continueOnError: options.continueOnError,
        preservePosition: options.preservePosition
      })

      const statusCode = result.success ? 200 : (result.summary.successful > 0 ? 207 : 400)
      
      res.status(statusCode).json(this.createBulkResponse(
        result,
        `Bulk move completed: ${result.summary.successful}/${result.summary.total} items moved`,
        context.correlationId
      ))
    } catch (error) {
      this.handleServerError(res, error as Error, 'move items', context.correlationId)
    }
  }
}

  // ===== LIST BULK OPERATIONS =====

  /**
   * POST /api/bulk/lists/create
   * Bulk create lists
   */
  async bulkCreateLists(req: Request, res: Response): Promise<void> {
    const context = this.getContext(req, 'bulk-create-lists')

    try {
      const validation = this.validateData<BulkCreateListsSchema>(req.body, bulkSchemas.bulkCreateLists, 'bulk create lists')

      if (!validation.success) {
        this.handleValidationError(res, validation.errors!, context.correlationId)
        return
      }

      const { lists, options = {} } = validation.data!

      // Add system fields to each list
      const listsWithSystemFields = lists.map(list => ({
        ...list,
        id: randomUUID(),
        createdBy: context.userId || 'system',
        createdAt: new Date(),
        updatedAt: new Date()
      }))

      const result = await listsService.bulkCreate(listsWithSystemFields, {
        continueOnError: options.continueOnError,
        batchSize: 25
      })

      const statusCode = result.success ? 201 : (result.summary.successful > 0 ? 207 : 400)

      res.status(statusCode).json(this.createBulkResponse(
        result,
        `Bulk create completed: ${result.summary.successful}/${result.summary.total} lists created`,
        context.correlationId
      ))
    } catch (error) {
      this.handleServerError(res, error as Error, 'create lists', context.correlationId)
    }
  }

  /**
   * PUT /api/bulk/lists/update
   * Bulk update lists
   */
  async bulkUpdateLists(req: Request, res: Response): Promise<void> {
    const context = this.getContext(req, 'bulk-update-lists')

    try {
      const validation = this.validateData<BulkUpdateListsSchema>(req.body, bulkSchemas.bulkUpdateLists, 'bulk update lists')

      if (!validation.success) {
        this.handleValidationError(res, validation.errors!, context.correlationId)
        return
      }

      const { updates, options = {} } = validation.data!

      // Add system fields to each update
      const updatesWithSystemFields = updates.map(update => ({
        id: update.id,
        data: {
          ...update.data,
          updatedAt: new Date(),
          ...(update.data.status === 'completed' && !update.data.completedAt ? { completedAt: new Date() } : {})
        }
      }))

      const result = await listsService.bulkUpdate(updatesWithSystemFields, {
        continueOnError: options.continueOnError,
        batchSize: 25
      })

      const statusCode = result.success ? 200 : (result.summary.successful > 0 ? 207 : 400)

      res.status(statusCode).json(this.createBulkResponse(
        result,
        `Bulk update completed: ${result.summary.successful}/${result.summary.total} lists updated`,
        context.correlationId
      ))
    } catch (error) {
      this.handleServerError(res, error as Error, 'update lists', context.correlationId)
    }
  }

  /**
   * DELETE /api/bulk/lists/delete
   * Bulk delete lists
   */
  async bulkDeleteLists(req: Request, res: Response): Promise<void> {
    const context = this.getContext(req, 'bulk-delete-lists')

    try {
      const validation = this.validateData<BulkDeleteListsSchema>(req.body, bulkSchemas.bulkDeleteLists, 'bulk delete lists')

      if (!validation.success) {
        this.handleValidationError(res, validation.errors!, context.correlationId)
        return
      }

      const { ids, options = {} } = validation.data!

      const result = await listsService.bulkDelete(ids, {
        continueOnError: options.continueOnError,
        batchSize: 25
      })

      const statusCode = result.success ? 200 : (result.summary.successful > 0 ? 207 : 400)

      res.status(statusCode).json(this.createBulkResponse(
        result,
        `Bulk delete completed: ${result.summary.successful}/${result.summary.total} lists deleted`,
        context.correlationId
      ))
    } catch (error) {
      this.handleServerError(res, error as Error, 'delete lists', context.correlationId)
    }
  }

  /**
   * PATCH /api/bulk/lists/status
   * Bulk update list status
   */
  async bulkUpdateListStatus(req: Request, res: Response): Promise<void> {
    const context = this.getContext(req, 'bulk-update-list-status')

    try {
      const validation = this.validateData<BulkStatusListsSchema>(req.body, bulkSchemas.bulkStatusLists, 'bulk status lists')

      if (!validation.success) {
        this.handleValidationError(res, validation.errors!, context.correlationId)
        return
      }

      const { ids, status, options = {} } = validation.data!

      const result = await listsService.bulkUpdateStatus(ids, status, {
        continueOnError: options.continueOnError,
        validateHierarchy: true,
        updateTimestamps: options.updateTimestamps,
        cascadeToItems: options.cascadeToItems
      })

      const statusCode = result.success ? 200 : (result.summary.successful > 0 ? 207 : 400)

      res.status(statusCode).json(this.createBulkResponse(
        result,
        `Bulk status update completed: ${result.summary.successful}/${result.summary.total} lists updated to ${status}`,
        context.correlationId
      ))
    } catch (error) {
      this.handleServerError(res, error as Error, 'update list status', context.correlationId)
    }
  }
}

export const bulkController = new BulkOperationsController()

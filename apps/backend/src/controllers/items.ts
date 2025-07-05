import { Request, Response } from 'express'
import { randomUUID } from 'crypto'
import { BaseCRUDController } from './base'
import { itemsService } from '../db/services'
import { itemSchemas, actionSchemas, ItemCreateSchema, ItemUpdateSchema, ItemQuerySchema } from '../validation/schemas'
import { NotFoundError, ValidationError, ConflictError } from '../middleware/errorHandler'
import { Item } from '../db/schema'

/**
 * SemanticType: ItemsController
 * Description: Enhanced items controller with standardized CRUD operations and proper HTTP status codes
 * ExtensibleByAI: true
 * AIUseCases:
 *   - Add custom item operations
 *   - Extend validation rules
 *   - Add dependency management
 *   - Integrate with MCP protocols
 */

export class ItemsController extends BaseCRUDController<Item, ItemCreateSchema, ItemUpdateSchema, ItemQuerySchema> {
  protected service = itemsService
  protected schemas = itemSchemas
  protected entityName = 'Item'

  /**
   * Override create to add UUID and timestamps
   */
  async create(req: Request, res: Response): Promise<void> {
    const context = this.getContext(req, 'create')
    
    try {
      // Validate request body
      const validation = this.validateData(req.body, this.schemas.create, 'create')

      if (!validation.success) {
        this.handleValidationError(res, validation.errors, context.correlationId)
        return
      }

      // Add system fields
      const itemData = {
        ...validation.data,
        id: randomUUID(),
        tags: validation.data.tags ? JSON.stringify(validation.data.tags) : null,
        dependencies: validation.data.dependencies ? JSON.stringify(validation.data.dependencies) : null,
        createdBy: context.userId || 'system',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const item = await this.service.create(itemData)

      res.status(201).json(this.createResponse(
        true,
        item,
        'Item created successfully',
        undefined,
        context.correlationId
      ))
    } catch (error) {
      this.handleServerError(res, error as Error, 'create', context.correlationId)
    }
  }

  /**
   * Override update to add timestamps and handle status changes
   */
  async update(req: Request, res: Response): Promise<void> {
    const context = this.getContext(req, 'update')
    
    try {
      // Validate parameters
      const paramValidation = this.validateData(req.params, this.schemas.params!, 'parameter')
      if (!paramValidation.success) {
        this.handleValidationError(res, paramValidation.errors, context.correlationId)
        return
      }

      // Validate request body
      const bodyValidation = this.validateData(req.body, this.schemas.update, 'update')
      if (!bodyValidation.success) {
        this.handleValidationError(res, bodyValidation.errors, context.correlationId)
        return
      }

      const { id } = paramValidation.data
      
      // Add timestamp and handle JSON fields
      const updateData: any = {
        ...bodyValidation.data,
        updatedAt: new Date()
      }

      if (bodyValidation.data.tags !== undefined) {
        updateData.tags = bodyValidation.data.tags ? JSON.stringify(bodyValidation.data.tags) : null
      }

      // Handle completion timestamp
      if (bodyValidation.data.status === 'completed' && !bodyValidation.data.completedAt) {
        updateData.completedAt = new Date()
      }

      const updatedItem = await this.service.updateById(id, updateData)

      if (!updatedItem) {
        this.handleNotFound(res, context.correlationId)
        return
      }

      res.json(this.createResponse(
        true,
        updatedItem,
        'Item updated successfully',
        undefined,
        context.correlationId
      ))
    } catch (error) {
      this.handleServerError(res, error as Error, 'update', context.correlationId)
    }
  }

  /**
   * Override list to handle special query parameters
   */
  async list(req: Request, res: Response): Promise<void> {
    const context = this.getContext(req, 'list')
    
    try {
      // Validate query parameters
      const queryValidation = this.validateData(req.query, this.schemas.query!, 'query')
      if (!queryValidation.success) {
        this.handleValidationError(res, queryValidation.errors, context.correlationId)
        return
      }

      const { 
        listId, 
        status, 
        priority, 
        assignedTo, 
        overdue, 
        dueSoon, 
        page = 1, 
        limit = 20,
        ...filters 
      } = queryValidation.data

      let items: any[]
      let total: number

      if (listId) {
        items = await itemsService.findByListId(listId)
        total = items.length
      } else if (status) {
        items = await itemsService.findByStatus(status)
        total = items.length
      } else if (assignedTo) {
        items = await itemsService.findByAssignee(assignedTo)
        total = items.length
      } else if (overdue === 'true') {
        items = await itemsService.findOverdue()
        total = items.length
      } else if (dueSoon) {
        items = await itemsService.findDueSoon(dueSoon)
        total = items.length
      } else {
        // Get items with pagination
        const offset = (page - 1) * limit
        items = await itemsService.findAll({
          orderBy: [{ field: 'createdAt', direction: 'desc' }],
          limit,
          offset,
          ...filters
        })
        total = await itemsService.count()
      }

      const response = this.createResponse(
        true,
        items,
        `Found ${items.length} items`,
        undefined,
        context.correlationId
      )

      // Add pagination for paginated queries
      if (!listId && !status && !assignedTo && overdue !== 'true' && !dueSoon) {
        response.pagination = {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }

      res.json(response)
    } catch (error) {
      this.handleServerError(res, error as Error, 'list', context.correlationId)
    }
  }

  /**
   * Override getById to handle include parameters
   */
  async getById(req: Request, res: Response): Promise<void> {
    const context = this.getContext(req, 'read')
    
    try {
      // Validate parameters
      const paramValidation = this.validateData(req.params, this.schemas.params!, 'parameter')
      if (!paramValidation.success) {
        this.handleValidationError(res, paramValidation.errors, context.correlationId)
        return
      }

      // Validate query parameters
      const queryValidation = this.validateData(req.query, this.schemas.query!, 'query')
      if (!queryValidation.success) {
        this.handleValidationError(res, queryValidation.errors, context.correlationId)
        return
      }

      const { id } = paramValidation.data
      const { include } = queryValidation.data

      let result: any

      if (include === 'dependencies') {
        const item = await itemsService.findById(id)
        if (!item) {
          this.handleNotFound(res, context.correlationId)
          return
        }
        const dependencies = await itemsService.getDependencies(id)
        const dependents = await itemsService.getDependents(id)
        result = { ...item, dependencies, dependents }
      } else {
        result = await itemsService.findById(id)
      }

      if (!result) {
        this.handleNotFound(res, context.correlationId)
        return
      }

      res.json(this.createResponse(
        true,
        result,
        'Item found',
        undefined,
        context.correlationId
      ))
    } catch (error) {
      this.handleServerError(res, error as Error, 'fetch', context.correlationId)
    }
  }

  /**
   * POST /:id/complete - Mark item as completed
   */
  async complete(req: Request, res: Response): Promise<void> {
    const context = this.getContext(req, 'update')
    
    try {
      // Validate parameters
      const paramValidation = this.validateData(req.params, this.schemas.params!, 'parameter')
      if (!paramValidation.success) {
        this.handleValidationError(res, paramValidation.errors, context.correlationId)
        return
      }

      const { id } = paramValidation.data
      const updatedItem = await itemsService.markCompleted(id)

      if (!updatedItem) {
        this.handleNotFound(res, context.correlationId)
        return
      }

      res.json(this.createResponse(
        true,
        updatedItem,
        'Item marked as completed',
        undefined,
        context.correlationId
      ))
    } catch (error) {
      this.handleServerError(res, error as Error, 'complete', context.correlationId)
    }
  }

  /**
   * POST /:id/start - Mark item as in progress
   */
  async start(req: Request, res: Response): Promise<void> {
    const context = this.getContext(req, 'update')
    
    try {
      // Validate parameters
      const paramValidation = this.validateData(req.params, this.schemas.params!, 'parameter')
      if (!paramValidation.success) {
        this.handleValidationError(res, paramValidation.errors, context.correlationId)
        return
      }

      const { id } = paramValidation.data

      // Check if item can be started (dependencies completed)
      const canStart = await itemsService.canStart(id)
      if (!canStart) {
        res.status(400).json(this.createResponse(
          false,
          null,
          'Cannot start item: dependencies not completed',
          'Dependency error',
          context.correlationId
        ))
        return
      }

      const updatedItem = await itemsService.markInProgress(id)

      if (!updatedItem) {
        this.handleNotFound(res, context.correlationId)
        return
      }

      res.json(this.createResponse(
        true,
        updatedItem,
        'Item started',
        undefined,
        context.correlationId
      ))
    } catch (error) {
      this.handleServerError(res, error as Error, 'start', context.correlationId)
    }
  }

  /**
   * POST /:id/move - Move item to different list
   */
  async move(req: Request, res: Response): Promise<void> {
    const context = this.getContext(req, 'update')
    
    try {
      // Validate parameters
      const paramValidation = this.validateData(req.params, this.schemas.params!, 'parameter')
      if (!paramValidation.success) {
        this.handleValidationError(res, paramValidation.errors, context.correlationId)
        return
      }

      // Validate body
      const bodyValidation = this.validateData(req.body, actionSchemas.moveItem, 'move')
      if (!bodyValidation.success) {
        this.handleValidationError(res, bodyValidation.errors, context.correlationId)
        return
      }

      const { id } = paramValidation.data
      const { listId } = bodyValidation.data

      const updatedItem = await itemsService.moveToList(id, listId)
      if (!updatedItem) {
        this.handleNotFound(res, context.correlationId)
        return
      }

      res.json(this.createResponse(
        true,
        updatedItem,
        'Item moved successfully',
        undefined,
        context.correlationId
      ))
    } catch (error) {
      this.handleServerError(res, error as Error, 'move', context.correlationId)
    }
  }

  /**
   * POST /:id/duplicate - Duplicate an item
   */
  async duplicate(req: Request, res: Response): Promise<void> {
    const context = this.getContext(req, 'create')
    
    try {
      // Validate parameters
      const paramValidation = this.validateData(req.params, this.schemas.params!, 'parameter')
      if (!paramValidation.success) {
        this.handleValidationError(res, paramValidation.errors, context.correlationId)
        return
      }

      const { id } = paramValidation.data
      const { listId } = req.body

      const originalItem = await itemsService.findById(id)
      if (!originalItem) {
        this.handleNotFound(res, context.correlationId)
        return
      }

      const duplicatedItem = await itemsService.create({
        id: randomUUID(),
        listId: listId || originalItem.listId,
        title: `${originalItem.title} (Copy)`,
        description: originalItem.description,
        priority: originalItem.priority,
        status: 'pending',
        dueDate: originalItem.dueDate,
        estimatedDuration: originalItem.estimatedDuration,
        tags: originalItem.tags,
        createdBy: context.userId || 'system',
        createdAt: new Date(),
        updatedAt: new Date()
      })

      res.status(201).json(this.createResponse(
        true,
        duplicatedItem,
        'Item duplicated successfully',
        undefined,
        context.correlationId
      ))
    } catch (error) {
      this.handleServerError(res, error as Error, 'duplicate', context.correlationId)
    }
  }

  /**
   * Search items
   */
  async search(req: Request, res: Response): Promise<void> {
    const context = this.getContext(req, 'read')

    try {
      // Validate query parameters
      const queryValidation = this.validateData(req.query, itemSchemas.searchQuery, 'query')
      if (!queryValidation.success) {
        this.handleValidationError(res, queryValidation.errors, context.correlationId)
        return
      }

      const { q, listId, status, limit = 50 } = queryValidation.data

      const results = await itemsService.search(q)

      res.json(this.createResponse(
        true,
        results,
        `Found ${results.length} items matching "${q}"`,
        undefined,
        context.correlationId
      ))
    } catch (error) {
      this.handleServerError(res, error as Error, 'search', context.correlationId)
    }
  }

  /**
   * Advanced search items with comprehensive filtering
   */
  async advancedSearch(req: Request, res: Response): Promise<void> {
    const context = this.getContext(req, 'read')

    try {
      // Validate query parameters
      const queryValidation = this.validateData(req.query, itemSchemas.advancedSearchQuery, 'query')
      if (!queryValidation.success) {
        this.handleValidationError(res, queryValidation.errors, context.correlationId)
        return
      }

      const {
        q,
        fields,
        listId,
        status,
        priority,
        assignedTo,
        tags,
        dueDateFrom,
        dueDateTo,
        createdFrom,
        createdTo,
        updatedFrom,
        updatedTo,
        hasDescription,
        hasDueDate,
        hasAssignee,
        overdue,
        dueSoon,
        estimatedDurationMin,
        estimatedDurationMax,
        page,
        limit,
        sortBy,
        sortOrder,
        includeCompleted
      } = queryValidation.data

      const result = await itemsService.advancedSearch({
        query: q,
        fields,
        listId,
        status,
        priority,
        assignedTo,
        tags,
        dueDateFrom,
        dueDateTo,
        createdFrom,
        createdTo,
        updatedFrom,
        updatedTo,
        hasDescription: hasDescription === 'true' ? true : hasDescription === 'false' ? false : undefined,
        hasDueDate: hasDueDate === 'true' ? true : hasDueDate === 'false' ? false : undefined,
        hasAssignee: hasAssignee === 'true' ? true : hasAssignee === 'false' ? false : undefined,
        overdue: overdue === 'true',
        dueSoon,
        estimatedDurationMin,
        estimatedDurationMax,
        page,
        limit,
        sortBy,
        sortOrder,
        includeCompleted: includeCompleted === 'true'
      })

      const response = this.createResponse(
        true,
        result.items,
        `Found ${result.total} items matching search criteria`,
        undefined,
        context.correlationId
      )

      response.pagination = {
        page: result.page,
        limit,
        total: result.total,
        totalPages: result.totalPages
      }

      res.json(response)
    } catch (error) {
      this.handleServerError(res, error as Error, 'advancedSearch', context.correlationId)
    }
  }

  /**
   * Filter items without search query
   */
  async filter(req: Request, res: Response): Promise<void> {
    const context = this.getContext(req, 'read')

    try {
      // Validate query parameters
      const queryValidation = this.validateData(req.query, itemSchemas.filterQuery, 'query')
      if (!queryValidation.success) {
        this.handleValidationError(res, queryValidation.errors, context.correlationId)
        return
      }

      const {
        listId,
        status,
        priority,
        assignedTo,
        tags,
        dueDateFrom,
        dueDateTo,
        createdFrom,
        createdTo,
        updatedFrom,
        updatedTo,
        hasDescription,
        hasDueDate,
        hasAssignee,
        overdue,
        dueSoon,
        estimatedDurationMin,
        estimatedDurationMax,
        page,
        limit,
        sortBy,
        sortOrder,
        includeCompleted
      } = queryValidation.data

      const result = await itemsService.filter({
        listId,
        status,
        priority,
        assignedTo,
        tags,
        dueDateFrom,
        dueDateTo,
        createdFrom,
        createdTo,
        updatedFrom,
        updatedTo,
        hasDescription: hasDescription === 'true' ? true : hasDescription === 'false' ? false : undefined,
        hasDueDate: hasDueDate === 'true' ? true : hasDueDate === 'false' ? false : undefined,
        hasAssignee: hasAssignee === 'true' ? true : hasAssignee === 'false' ? false : undefined,
        overdue: overdue === 'true',
        dueSoon,
        estimatedDurationMin,
        estimatedDurationMax,
        page,
        limit,
        sortBy,
        sortOrder,
        includeCompleted: includeCompleted === 'true'
      })

      const response = this.createResponse(
        true,
        result.items,
        `Found ${result.total} items matching filter criteria`,
        undefined,
        context.correlationId
      )

      response.pagination = {
        page: result.page,
        limit,
        total: result.total,
        totalPages: result.totalPages
      }

      res.json(response)
    } catch (error) {
      this.handleServerError(res, error as Error, 'filter', context.correlationId)
    }
  }

  /**
   * Get item statistics
   */
  async getStats(req: Request, res: Response): Promise<void> {
    const context = this.getContext(req, 'read')

    try {
      // Validate query parameters
      const queryValidation = this.validateData(req.query, itemSchemas.statsQuery, 'query')
      if (!queryValidation.success) {
        this.handleValidationError(res, queryValidation.errors, context.correlationId)
        return
      }

      const { listId } = queryValidation.data

      let stats
      if (listId) {
        stats = await itemsService.getListStats(listId)
      } else {
        stats = await itemsService.getGlobalStats()
      }

      res.json(this.createResponse(
        true,
        stats,
        'Item statistics retrieved',
        undefined,
        context.correlationId
      ))
    } catch (error) {
      this.handleServerError(res, error as Error, 'fetch', context.correlationId)
    }
  }
}

// Export singleton instance
export const itemsController = new ItemsController()

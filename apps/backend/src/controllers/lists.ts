import { Request, Response } from 'express'
import { randomUUID } from 'crypto'
import { BaseCRUDController } from './base'
import { listsService, itemsService } from '../db/services'
import { listSchemas, actionSchemas, ListCreateSchema, ListUpdateSchema, ListQuerySchema } from '../validation/schemas'
import { NotFoundError, ValidationError, ConflictError } from '../middleware/errorHandler'
import { List } from '../db/schema'

/**
 * SemanticType: ListsController
 * Description: Enhanced lists controller with standardized CRUD operations and proper HTTP status codes
 * ExtensibleByAI: true
 * AIUseCases:
 *   - Add custom list operations
 *   - Extend validation rules
 *   - Add caching strategies
 *   - Integrate with MCP protocols
 */

export class ListsController extends BaseCRUDController<List, ListCreateSchema, ListUpdateSchema, ListQuerySchema> {
  protected service = listsService
  protected schemas = listSchemas
  protected entityName = 'List'

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
      const listData = {
        ...validation.data,
        id: randomUUID(),
        createdBy: context.userId || 'system',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const list = await this.service.create(listData)

      res.status(201).json(this.createResponse(
        true,
        list,
        'List created successfully',
        undefined,
        context.correlationId
      ))
    } catch (error) {
      this.handleServerError(res, error as Error, 'create', context.correlationId)
    }
  }

  /**
   * Override update to add timestamps
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
      
      // Add timestamp
      const updateData = {
        ...bodyValidation.data,
        updatedAt: new Date()
      }

      // Handle completion timestamp
      if (bodyValidation.data.status === 'completed' && !bodyValidation.data.completedAt) {
        updateData.completedAt = new Date()
      }

      const updatedList = await this.service.updateById(id, updateData)

      if (!updatedList) {
        this.handleNotFound(res, context.correlationId)
        return
      }

      res.json(this.createResponse(
        true,
        updatedList,
        'List updated successfully',
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

      const { tree, parent, include, page = 1, limit = 20, ...filters } = queryValidation.data

      let lists: any[]
      let total: number

      if (tree === 'true') {
        // Get hierarchical tree structure
        lists = await listsService.getTree()
        total = lists.length
      } else if (parent !== undefined) {
        // Get lists by parent
        const parentId = parent === 'null' ? null : parent
        lists = await listsService.findByParent(parentId)
        total = lists.length
      } else {
        // Get lists with item counts and pagination
        const offset = (page - 1) * limit
        lists = await listsService.findWithItemCounts({ limit, offset, ...filters })
        total = await listsService.count()
      }

      const response = this.createResponse(
        true,
        lists,
        `Found ${lists.length} lists`,
        undefined,
        context.correlationId
      )

      // Add pagination for non-tree queries
      if (tree !== 'true') {
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

      if (include === 'children') {
        result = await listsService.getHierarchy(id)
      } else if (include === 'items') {
        const list = await listsService.findById(id)
        if (!list) {
          this.handleNotFound(res, context.correlationId)
          return
        }
        const items = await itemsService.findByListId(id)
        result = { ...list, items }
      } else if (include === 'breadcrumbs') {
        const list = await listsService.findById(id)
        if (!list) {
          this.handleNotFound(res, context.correlationId)
          return
        }
        const breadcrumbs = await listsService.getBreadcrumbs(id)
        result = { ...list, breadcrumbs }
      } else {
        result = await listsService.findById(id)
      }

      if (!result) {
        this.handleNotFound(res, context.correlationId)
        return
      }

      res.json(this.createResponse(
        true,
        result,
        'List found',
        undefined,
        context.correlationId
      ))
    } catch (error) {
      this.handleServerError(res, error as Error, 'fetch', context.correlationId)
    }
  }

  /**
   * POST /:id/move - Move list to new parent
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
      const bodyValidation = this.validateData(req.body, actionSchemas.moveList, 'move')
      if (!bodyValidation.success) {
        this.handleValidationError(res, bodyValidation.errors, context.correlationId)
        return
      }

      const { id } = paramValidation.data
      const { parentId } = bodyValidation.data

      const updatedList = await listsService.moveToParent(id, parentId)
      if (!updatedList) {
        this.handleNotFound(res, context.correlationId)
        return
      }

      res.json(this.createResponse(
        true,
        updatedList,
        'List moved successfully',
        undefined,
        context.correlationId
      ))
    } catch (error) {
      if (error.message.includes('circular')) {
        this.handleValidationError(res, ['Cannot create circular reference'], context.correlationId)
        return
      }
      this.handleServerError(res, error as Error, 'move', context.correlationId)
    }
  }

  /**
   * POST /:id/reorder - Reorder list position
   */
  async reorder(req: Request, res: Response): Promise<void> {
    const context = this.getContext(req, 'update')
    
    try {
      // Validate parameters
      const paramValidation = this.validateData(req.params, this.schemas.params!, 'parameter')
      if (!paramValidation.success) {
        this.handleValidationError(res, paramValidation.errors, context.correlationId)
        return
      }

      // Validate body
      const bodyValidation = this.validateData(req.body, actionSchemas.reorderList, 'reorder')
      if (!bodyValidation.success) {
        this.handleValidationError(res, bodyValidation.errors, context.correlationId)
        return
      }

      const { id } = paramValidation.data
      const { position } = bodyValidation.data

      await listsService.reorder(id, position)

      res.json(this.createResponse(
        true,
        null,
        'List reordered successfully',
        undefined,
        context.correlationId
      ))
    } catch (error) {
      this.handleServerError(res, error as Error, 'reorder', context.correlationId)
    }
  }

  /**
   * POST /:id/archive - Archive list
   */
  async archive(req: Request, res: Response): Promise<void> {
    const context = this.getContext(req, 'update')
    
    try {
      // Validate parameters
      const paramValidation = this.validateData(req.params, this.schemas.params!, 'parameter')
      if (!paramValidation.success) {
        this.handleValidationError(res, paramValidation.errors, context.correlationId)
        return
      }

      const { id } = paramValidation.data
      await listsService.archive(id)

      res.json(this.createResponse(
        true,
        null,
        'List archived successfully',
        undefined,
        context.correlationId
      ))
    } catch (error) {
      this.handleServerError(res, error as Error, 'archive', context.correlationId)
    }
  }

  /**
   * POST /:id/complete - Mark list as completed
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

      const completedList = await listsService.updateById(id, {
        status: 'completed',
        completedAt: new Date(),
        updatedAt: new Date()
      })

      if (!completedList) {
        this.handleNotFound(res, context.correlationId)
        return
      }

      res.json(this.createResponse(
        true,
        completedList,
        'List marked as completed',
        undefined,
        context.correlationId
      ))
    } catch (error) {
      this.handleServerError(res, error as Error, 'complete', context.correlationId)
    }
  }

  /**
   * GET /:id/stats - Get list statistics
   */
  async getStats(req: Request, res: Response): Promise<void> {
    const context = this.getContext(req, 'read')

    try {
      // Validate parameters
      const paramValidation = this.validateData(req.params, this.schemas.params!, 'parameter')
      if (!paramValidation.success) {
        this.handleValidationError(res, paramValidation.errors, context.correlationId)
        return
      }

      const { id } = paramValidation.data
      const stats = await listsService.getStats(id)

      if (!stats) {
        this.handleNotFound(res, context.correlationId)
        return
      }

      res.json(this.createResponse(
        true,
        stats,
        'List statistics retrieved',
        undefined,
        context.correlationId
      ))
    } catch (error) {
      this.handleServerError(res, error as Error, 'getStats', context.correlationId)
    }
  }

  /**
   * Advanced search lists with comprehensive filtering
   */
  async advancedSearch(req: Request, res: Response): Promise<void> {
    const context = this.getContext(req, 'read')

    try {
      // Validate query parameters
      const queryValidation = this.validateData(req.query, listSchemas.advancedSearchQuery, 'query')
      if (!queryValidation.success) {
        this.handleValidationError(res, queryValidation.errors, context.correlationId)
        return
      }

      const {
        q,
        fields,
        status,
        priority,
        parentListId,
        hasParent,
        hasChildren,
        hasItems,
        itemCountMin,
        itemCountMax,
        completionRateMin,
        completionRateMax,
        createdFrom,
        createdTo,
        updatedFrom,
        updatedTo,
        page,
        limit,
        sortBy,
        sortOrder,
        includeArchived
      } = queryValidation.data

      const result = await listsService.advancedSearch({
        query: q,
        fields,
        status,
        priority,
        parentListId,
        hasParent: hasParent === 'true' ? true : hasParent === 'false' ? false : undefined,
        hasChildren: hasChildren === 'true' ? true : hasChildren === 'false' ? false : undefined,
        hasItems: hasItems === 'true' ? true : hasItems === 'false' ? false : undefined,
        itemCountMin,
        itemCountMax,
        completionRateMin,
        completionRateMax,
        createdFrom,
        createdTo,
        updatedFrom,
        updatedTo,
        page,
        limit,
        sortBy,
        sortOrder,
        includeArchived: includeArchived === 'true'
      })

      const response = this.createResponse(
        true,
        result.lists,
        `Found ${result.total} lists matching search criteria`,
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
   * Filter lists without search query
   */
  async filter(req: Request, res: Response): Promise<void> {
    const context = this.getContext(req, 'read')

    try {
      // Validate query parameters
      const queryValidation = this.validateData(req.query, listSchemas.filterQuery, 'query')
      if (!queryValidation.success) {
        this.handleValidationError(res, queryValidation.errors, context.correlationId)
        return
      }

      const {
        status,
        priority,
        parentListId,
        hasParent,
        hasChildren,
        hasItems,
        itemCountMin,
        itemCountMax,
        completionRateMin,
        completionRateMax,
        createdFrom,
        createdTo,
        updatedFrom,
        updatedTo,
        page,
        limit,
        sortBy,
        sortOrder,
        includeArchived
      } = queryValidation.data

      const result = await listsService.filter({
        status,
        priority,
        parentListId,
        hasParent: hasParent === 'true' ? true : hasParent === 'false' ? false : undefined,
        hasChildren: hasChildren === 'true' ? true : hasChildren === 'false' ? false : undefined,
        hasItems: hasItems === 'true' ? true : hasItems === 'false' ? false : undefined,
        itemCountMin,
        itemCountMax,
        completionRateMin,
        completionRateMax,
        createdFrom,
        createdTo,
        updatedFrom,
        updatedTo,
        page,
        limit,
        sortBy,
        sortOrder,
        includeArchived: includeArchived === 'true'
      })

      const response = this.createResponse(
        true,
        result.lists,
        `Found ${result.total} lists matching filter criteria`,
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
}

// Export singleton instance
export const listsController = new ListsController()

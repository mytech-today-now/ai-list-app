import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { BaseService } from '../db/services/base'

/**
 * SemanticType: BaseCRUDController
 * Description: Enhanced base controller with standardized CRUD operations, proper HTTP status codes, and comprehensive error handling
 * ExtensibleByAI: true
 * AIUseCases:
 *   - Add custom validation rules
 *   - Extend error handling patterns
 *   - Add caching strategies
 *   - Integrate with MCP protocols
 */

/**
 * Standard API response format
 */
export interface APIResponse<T = any> {
  success: boolean
  data?: T
  message: string
  error?: string
  correlationId?: string
  timestamp?: string
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

/**
 * CRUD operation context
 */
export interface CRUDContext {
  userId?: string
  agentId?: string
  correlationId?: string
  operation: 'create' | 'read' | 'update' | 'delete' | 'list'
}

/**
 * Validation schemas for common operations
 */
export interface CRUDSchemas<TCreate, TUpdate, TQuery> {
  create: z.ZodSchema<TCreate>
  update: z.ZodSchema<TUpdate>
  query?: z.ZodSchema<TQuery>
  params?: z.ZodSchema<{ id: string }>
}

/**
 * Enhanced base controller for CRUD operations
 */
export abstract class BaseCRUDController<TEntity, TCreate, TUpdate, TQuery = any> {
  protected abstract service: BaseService<any, TEntity, TCreate>
  protected abstract schemas: CRUDSchemas<TCreate, TUpdate, TQuery>
  protected abstract entityName: string

  /**
   * Create standardized API response
   */
  protected createResponse<T>(
    success: boolean,
    data: T | null = null,
    message: string,
    error?: string,
    correlationId?: string
  ): APIResponse<T> {
    const response: APIResponse<T> = {
      success,
      message,
      timestamp: new Date().toISOString()
    }

    if (data !== null) {
      response.data = data
    }

    if (error) {
      response.error = error
    }

    if (correlationId) {
      response.correlationId = correlationId
    }

    return response
  }

  /**
   * Validate request data against schema
   */
  protected validateData<T>(
    data: unknown,
    schema: z.ZodSchema<T>,
    operation: string
  ): { success: true; data: T } | { success: false; errors: string[] } {
    try {
      const validatedData = schema.parse(data)
      return { success: true, data: validatedData }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.issues.map(issue => 
          `${issue.path.join('.')}: ${issue.message}`
        )
        return { success: false, errors }
      }
      return { success: false, errors: [`${operation} validation failed`] }
    }
  }

  /**
   * Extract context from request
   */
  protected getContext(req: Request, operation: CRUDContext['operation']): CRUDContext {
    return {
      userId: req.headers['x-user-id'] as string,
      agentId: req.headers['x-agent-id'] as string,
      correlationId: (req as any).correlationId,
      operation
    }
  }

  /**
   * Handle validation errors
   */
  protected handleValidationError(
    res: Response,
    errors: string[],
    correlationId?: string
  ): void {
    res.status(400).json(this.createResponse(
      false,
      null,
      'Validation failed',
      errors.join('; '),
      correlationId
    ))
  }

  /**
   * Handle not found errors
   */
  protected handleNotFound(
    res: Response,
    correlationId?: string
  ): void {
    res.status(404).json(this.createResponse(
      false,
      null,
      `${this.entityName} not found`,
      'The requested resource was not found',
      correlationId
    ))
  }

  /**
   * Handle server errors
   */
  protected handleServerError(
    res: Response,
    error: Error,
    operation: string,
    correlationId?: string
  ): void {
    console.error(`Error in ${operation}:`, error)
    res.status(500).json(this.createResponse(
      false,
      null,
      `Failed to ${operation} ${this.entityName}`,
      'Internal server error',
      correlationId
    ))
  }

  /**
   * Handle conflict errors (409)
   */
  protected handleConflict(
    res: Response,
    message: string,
    correlationId?: string
  ): void {
    res.status(409).json(this.createResponse(
      false,
      null,
      message,
      'Resource conflict',
      correlationId
    ))
  }

  /**
   * Handle forbidden errors (403)
   */
  protected handleForbidden(
    res: Response,
    message: string = 'Access forbidden',
    correlationId?: string
  ): void {
    res.status(403).json(this.createResponse(
      false,
      null,
      message,
      'Forbidden access',
      correlationId
    ))
  }

  /**
   * Handle unauthorized errors (401)
   */
  protected handleUnauthorized(
    res: Response,
    message: string = 'Authentication required',
    correlationId?: string
  ): void {
    res.status(401).json(this.createResponse(
      false,
      null,
      message,
      'Unauthorized access',
      correlationId
    ))
  }

  /**
   * GET /:id - Get entity by ID
   */
  async getById(req: Request, res: Response): Promise<void> {
    const context = this.getContext(req, 'read')
    
    try {
      // Validate parameters
      const paramValidation = this.validateData(
        req.params,
        this.schemas.params || z.object({ id: z.string() }),
        'parameter'
      )

      if (!paramValidation.success) {
        this.handleValidationError(res, paramValidation.errors, context.correlationId)
        return
      }

      const { id } = paramValidation.data
      const entity = await this.service.findById(id)

      if (!entity) {
        this.handleNotFound(res, context.correlationId)
        return
      }

      res.json(this.createResponse(
        true,
        entity,
        `${this.entityName} found`,
        undefined,
        context.correlationId
      ))
    } catch (error) {
      this.handleServerError(res, error as Error, 'fetch', context.correlationId)
    }
  }

  /**
   * POST / - Create new entity
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

      const entity = await this.service.create(validation.data)

      res.status(201).json(this.createResponse(
        true,
        entity,
        `${this.entityName} created successfully`,
        undefined,
        context.correlationId
      ))
    } catch (error) {
      this.handleServerError(res, error as Error, 'create', context.correlationId)
    }
  }

  /**
   * PUT /:id - Update entity
   */
  async update(req: Request, res: Response): Promise<void> {
    const context = this.getContext(req, 'update')
    
    try {
      // Validate parameters
      const paramValidation = this.validateData(
        req.params,
        this.schemas.params || z.object({ id: z.string() }),
        'parameter'
      )

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
      const updatedEntity = await this.service.updateById(id, bodyValidation.data)

      if (!updatedEntity) {
        this.handleNotFound(res, context.correlationId)
        return
      }

      res.json(this.createResponse(
        true,
        updatedEntity,
        `${this.entityName} updated successfully`,
        undefined,
        context.correlationId
      ))
    } catch (error) {
      this.handleServerError(res, error as Error, 'update', context.correlationId)
    }
  }

  /**
   * DELETE /:id - Delete entity
   */
  async delete(req: Request, res: Response): Promise<void> {
    const context = this.getContext(req, 'delete')

    try {
      // Validate parameters
      const paramValidation = this.validateData(
        req.params,
        this.schemas.params || z.object({ id: z.string() }),
        'parameter'
      )

      if (!paramValidation.success) {
        this.handleValidationError(res, paramValidation.errors, context.correlationId)
        return
      }

      const { id } = paramValidation.data
      const deleted = await this.service.deleteById(id)

      if (!deleted) {
        this.handleNotFound(res, context.correlationId)
        return
      }

      res.json(this.createResponse(
        true,
        null,
        `${this.entityName} deleted successfully`,
        undefined,
        context.correlationId
      ))
    } catch (error) {
      this.handleServerError(res, error as Error, 'delete', context.correlationId)
    }
  }

  /**
   * GET / - List entities with pagination and filtering
   */
  async list(req: Request, res: Response): Promise<void> {
    const context = this.getContext(req, 'list')

    try {
      // Parse pagination parameters
      const page = Math.max(1, parseInt(req.query.page as string) || 1)
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20))
      const offset = (page - 1) * limit

      // Validate query parameters if schema provided
      let queryData: any = {}
      if (this.schemas.query) {
        const queryValidation = this.validateData(req.query, this.schemas.query, 'query')
        if (!queryValidation.success) {
          this.handleValidationError(res, queryValidation.errors, context.correlationId)
          return
        }
        queryData = queryValidation.data
      }

      // Get entities with pagination
      const entities = await this.service.findAll({
        limit,
        offset,
        ...queryData
      })

      // Get total count for pagination
      const total = await this.service.count()
      const totalPages = Math.ceil(total / limit)

      const response = this.createResponse(
        true,
        entities,
        `Found ${entities.length} ${this.entityName}s`,
        undefined,
        context.correlationId
      )

      response.pagination = {
        page,
        limit,
        total,
        totalPages
      }

      res.json(response)
    } catch (error) {
      this.handleServerError(res, error as Error, 'list', context.correlationId)
    }
  }

  /**
   * PATCH /:id - Partial update entity
   */
  async patch(req: Request, res: Response): Promise<void> {
    const context = this.getContext(req, 'update')

    try {
      // Validate parameters
      const paramValidation = this.validateData(
        req.params,
        this.schemas.params || z.object({ id: z.string() }),
        'parameter'
      )

      if (!paramValidation.success) {
        this.handleValidationError(res, paramValidation.errors, context.correlationId)
        return
      }

      // For PATCH, make all fields optional
      const partialUpdateSchema = this.schemas.update.partial()
      const bodyValidation = this.validateData(req.body, partialUpdateSchema, 'patch')

      if (!bodyValidation.success) {
        this.handleValidationError(res, bodyValidation.errors, context.correlationId)
        return
      }

      const { id } = paramValidation.data

      // Check if entity exists first
      const existingEntity = await this.service.findById(id)
      if (!existingEntity) {
        this.handleNotFound(res, context.correlationId)
        return
      }

      const updatedEntity = await this.service.updateById(id, bodyValidation.data)

      res.json(this.createResponse(
        true,
        updatedEntity,
        `${this.entityName} updated successfully`,
        undefined,
        context.correlationId
      ))
    } catch (error) {
      this.handleServerError(res, error as Error, 'patch', context.correlationId)
    }
  }

  /**
   * HEAD /:id - Check if entity exists
   */
  async head(req: Request, res: Response): Promise<void> {
    const context = this.getContext(req, 'read')

    try {
      // Validate parameters
      const paramValidation = this.validateData(
        req.params,
        this.schemas.params || z.object({ id: z.string() }),
        'parameter'
      )

      if (!paramValidation.success) {
        res.status(400).end()
        return
      }

      const { id } = paramValidation.data
      const entity = await this.service.findById(id)

      if (!entity) {
        res.status(404).end()
        return
      }

      res.status(200).end()
    } catch (error) {
      res.status(500).end()
    }
  }

  /**
   * OPTIONS / - Return allowed methods
   */
  async options(req: Request, res: Response): Promise<void> {
    res.set('Allow', 'GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS')
    res.status(200).end()
  }
}

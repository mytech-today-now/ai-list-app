import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { APIResponse } from '../controllers/base'

/**
 * SemanticType: ValidationMiddleware
 * Description: Comprehensive validation middleware for request validation with proper HTTP status codes
 * ExtensibleByAI: true
 * AIUseCases:
 *   - Add custom validation rules
 *   - Extend error handling
 *   - Add rate limiting for validation
 *   - Integrate with MCP validation
 */

/**
 * Validation target types
 */
export type ValidationTarget = 'body' | 'params' | 'query' | 'headers'

/**
 * Validation configuration
 */
export interface ValidationConfig {
  target: ValidationTarget
  schema: z.ZodSchema<any>
  optional?: boolean
  stripUnknown?: boolean
}

/**
 * Create standardized validation error response
 */
function createValidationErrorResponse(
  errors: string[],
  correlationId?: string
): APIResponse {
  return {
    success: false,
    message: 'Validation failed',
    error: errors.join('; '),
    correlationId,
    timestamp: new Date().toISOString()
  }
}

/**
 * Extract correlation ID from request
 */
function getCorrelationId(req: Request): string | undefined {
  return (req as any).correlationId
}

/**
 * Validate request data against schema
 */
function validateData<T>(
  data: unknown,
  schema: z.ZodSchema<T>,
  stripUnknown: boolean = true
): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    const parseOptions = stripUnknown ? { stripUnknown: true } : {}
    const validatedData = schema.parse(data, parseOptions)
    return { success: true, data: validatedData }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.issues.map(issue => {
        const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : ''
        return `${path}${issue.message}`
      })
      return { success: false, errors }
    }
    return { success: false, errors: ['Validation failed'] }
  }
}

/**
 * Create validation middleware for a specific target and schema
 */
export function validate(config: ValidationConfig) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { target, schema, optional = false, stripUnknown = true } = config
    const correlationId = getCorrelationId(req)

    // Get data from request based on target
    let data: unknown
    switch (target) {
      case 'body':
        data = req.body
        break
      case 'params':
        data = req.params
        break
      case 'query':
        data = req.query
        break
      case 'headers':
        data = req.headers
        break
      default:
        return res.status(500).json(createValidationErrorResponse(
          ['Invalid validation target'],
          correlationId
        ))
    }

    // Skip validation if optional and data is empty
    if (optional && (!data || (typeof data === 'object' && Object.keys(data).length === 0))) {
      return next()
    }

    // Validate data
    const validation = validateData(data, schema, stripUnknown)

    if (!validation.success) {
      return res.status(400).json(createValidationErrorResponse(
        validation.errors,
        correlationId
      ))
    }

    // Replace request data with validated data
    switch (target) {
      case 'body':
        req.body = validation.data
        break
      case 'params':
        req.params = validation.data
        break
      case 'query':
        req.query = validation.data
        break
      case 'headers':
        // Don't replace headers, just validate
        break
    }

    next()
  }
}

/**
 * Validate request body
 */
export function validateBody<T>(schema: z.ZodSchema<T>, stripUnknown: boolean = true) {
  return validate({ target: 'body', schema, stripUnknown })
}

/**
 * Validate request parameters
 */
export function validateParams<T>(schema: z.ZodSchema<T>) {
  return validate({ target: 'params', schema })
}

/**
 * Validate query parameters
 */
export function validateQuery<T>(schema: z.ZodSchema<T>, optional: boolean = true) {
  return validate({ target: 'query', schema, optional })
}

/**
 * Validate request headers
 */
export function validateHeaders<T>(schema: z.ZodSchema<T>) {
  return validate({ target: 'headers', schema })
}

/**
 * Combine multiple validations
 */
export function validateMultiple(...configs: ValidationConfig[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const correlationId = getCorrelationId(req)
    const allErrors: string[] = []

    for (const config of configs) {
      const { target, schema, optional = false, stripUnknown = true } = config

      // Get data from request
      let data: unknown
      switch (target) {
        case 'body':
          data = req.body
          break
        case 'params':
          data = req.params
          break
        case 'query':
          data = req.query
          break
        case 'headers':
          data = req.headers
          break
        default:
          return res.status(500).json(createValidationErrorResponse(
            ['Invalid validation target'],
            correlationId
          ))
      }

      // Skip if optional and empty
      if (optional && (!data || (typeof data === 'object' && Object.keys(data).length === 0))) {
        continue
      }

      // Validate
      const validation = validateData(data, schema, stripUnknown)

      if (!validation.success) {
        allErrors.push(...validation.errors.map(err => `${target}: ${err}`))
      } else {
        // Update request with validated data
        switch (target) {
          case 'body':
            req.body = validation.data
            break
          case 'params':
            req.params = validation.data
            break
          case 'query':
            req.query = validation.data
            break
        }
      }
    }

    if (allErrors.length > 0) {
      return res.status(400).json(createValidationErrorResponse(
        allErrors,
        correlationId
      ))
    }

    next()
  }
}

/**
 * Validation middleware for common CRUD operations
 */
export const crudValidation = {
  /**
   * Validate ID parameter
   */
  id: validateParams(z.object({
    id: z.string().uuid('Invalid ID format')
  })),

  /**
   * Validate pagination query parameters
   */
  pagination: validateQuery(z.object({
    page: z.coerce.number().min(1).optional(),
    limit: z.coerce.number().min(1).max(100).optional(),
    sort: z.string().optional(),
    order: z.enum(['asc', 'desc']).optional()
  })),

  /**
   * Validate search query parameters
   */
  search: validateQuery(z.object({
    q: z.string().min(1).optional(),
    fields: z.array(z.string()).optional()
  }))
}

/**
 * Rate limiting for validation attempts
 */
const validationAttempts = new Map<string, { count: number; resetTime: number }>()
const MAX_VALIDATION_ATTEMPTS = 100
const VALIDATION_WINDOW = 60 * 1000 // 1 minute

/**
 * Rate limit validation middleware
 */
export function rateLimitValidation(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || 'unknown'
  const now = Date.now()
  const correlationId = getCorrelationId(req)

  // Clean up old entries
  for (const [key, value] of validationAttempts.entries()) {
    if (now > value.resetTime) {
      validationAttempts.delete(key)
    }
  }

  // Check current attempts
  const attempts = validationAttempts.get(ip)
  if (attempts && attempts.count >= MAX_VALIDATION_ATTEMPTS && now < attempts.resetTime) {
    return res.status(429).json({
      success: false,
      message: 'Too many validation attempts',
      error: 'Rate limit exceeded',
      correlationId,
      timestamp: new Date().toISOString(),
      retryAfter: Math.ceil((attempts.resetTime - now) / 1000)
    })
  }

  // Update attempts
  if (attempts && now < attempts.resetTime) {
    attempts.count++
  } else {
    validationAttempts.set(ip, {
      count: 1,
      resetTime: now + VALIDATION_WINDOW
    })
  }

  next()
}

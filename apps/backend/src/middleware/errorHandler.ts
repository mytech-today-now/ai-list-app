import { Request, Response, NextFunction } from 'express'
import { APIResponse } from '../controllers/base'

/**
 * SemanticType: EnhancedErrorHandler
 * Description: Comprehensive error handling middleware with proper HTTP status codes and standardized responses
 * ExtensibleByAI: true
 * AIUseCases:
 *   - Add custom error types
 *   - Extend error logging
 *   - Add error reporting
 *   - Integrate with monitoring systems
 */

/**
 * Custom error classes with proper HTTP status codes
 */
export class HTTPError extends Error {
  public statusCode: number
  public code: string
  public details?: any

  constructor(statusCode: number, message: string, code?: string, details?: any) {
    super(message)
    this.name = 'HTTPError'
    this.statusCode = statusCode
    this.code = code || this.getDefaultCode(statusCode)
    this.details = details
  }

  private getDefaultCode(statusCode: number): string {
    switch (statusCode) {
      case 400: return 'BAD_REQUEST'
      case 401: return 'UNAUTHORIZED'
      case 403: return 'FORBIDDEN'
      case 404: return 'NOT_FOUND'
      case 409: return 'CONFLICT'
      case 422: return 'UNPROCESSABLE_ENTITY'
      case 429: return 'TOO_MANY_REQUESTS'
      case 500: return 'INTERNAL_SERVER_ERROR'
      case 502: return 'BAD_GATEWAY'
      case 503: return 'SERVICE_UNAVAILABLE'
      default: return 'UNKNOWN_ERROR'
    }
  }
}

/**
 * Validation error (400)
 */
export class ValidationError extends HTTPError {
  constructor(message: string, details?: any) {
    super(400, message, 'VALIDATION_ERROR', details)
    this.name = 'ValidationError'
  }
}

/**
 * Authentication error (401)
 */
export class AuthenticationError extends HTTPError {
  constructor(message: string = 'Authentication required', details?: any) {
    super(401, message, 'AUTHENTICATION_ERROR', details)
    this.name = 'AuthenticationError'
  }
}

/**
 * Authorization error (403)
 */
export class AuthorizationError extends HTTPError {
  constructor(message: string = 'Access forbidden', details?: any) {
    super(403, message, 'AUTHORIZATION_ERROR', details)
    this.name = 'AuthorizationError'
  }
}

/**
 * Not found error (404)
 */
export class NotFoundError extends HTTPError {
  constructor(message: string = 'Resource not found', details?: any) {
    super(404, message, 'NOT_FOUND', details)
    this.name = 'NotFoundError'
  }
}

/**
 * Conflict error (409)
 */
export class ConflictError extends HTTPError {
  constructor(message: string, details?: any) {
    super(409, message, 'CONFLICT', details)
    this.name = 'ConflictError'
  }
}

/**
 * Unprocessable entity error (422)
 */
export class UnprocessableEntityError extends HTTPError {
  constructor(message: string, details?: any) {
    super(422, message, 'UNPROCESSABLE_ENTITY', details)
    this.name = 'UnprocessableEntityError'
  }
}

/**
 * Rate limit error (429)
 */
export class RateLimitError extends HTTPError {
  constructor(message: string = 'Too many requests', retryAfter?: number) {
    super(429, message, 'RATE_LIMIT_EXCEEDED', { retryAfter })
    this.name = 'RateLimitError'
  }
}

/**
 * Database error (500)
 */
export class DatabaseError extends HTTPError {
  constructor(message: string = 'Database operation failed', details?: any) {
    super(500, message, 'DATABASE_ERROR', details)
    this.name = 'DatabaseError'
  }
}

/**
 * External service error (502)
 */
export class ExternalServiceError extends HTTPError {
  constructor(message: string = 'External service unavailable', details?: any) {
    super(502, message, 'EXTERNAL_SERVICE_ERROR', details)
    this.name = 'ExternalServiceError'
  }
}

/**
 * Service unavailable error (503)
 */
export class ServiceUnavailableError extends HTTPError {
  constructor(message: string = 'Service temporarily unavailable', details?: any) {
    super(503, message, 'SERVICE_UNAVAILABLE', details)
    this.name = 'ServiceUnavailableError'
  }
}

/**
 * Get correlation ID from request
 */
function getCorrelationId(req: Request): string | undefined {
  return (req as any).correlationId
}

/**
 * Create standardized error response
 */
function createErrorResponse(
  statusCode: number,
  message: string,
  code: string,
  correlationId?: string,
  details?: any,
  stack?: string
): APIResponse {
  const response: APIResponse = {
    success: false,
    message,
    error: code,
    correlationId,
    timestamp: new Date().toISOString()
  }

  if (details) {
    response.data = details
  }

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development' && stack) {
    (response as any).stack = stack
  }

  return response
}

/**
 * Log error with appropriate level
 */
function logError(error: Error, req: Request, statusCode: number) {
  const correlationId = getCorrelationId(req)
  const logLevel = statusCode >= 500 ? 'error' : 'warn'
  
  const logData = {
    error: error.message,
    stack: error.stack,
    statusCode,
    correlationId,
    url: req.url,
    method: req.method,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    timestamp: new Date().toISOString()
  }

  // Use console for now, can be replaced with proper logger
  if (logLevel === 'error') {
    console.error('Request error:', logData)
  } else {
    console.warn('Request warning:', logData)
  }
}

/**
 * Enhanced error handling middleware
 */
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const correlationId = getCorrelationId(req)

  // Handle known HTTP errors
  if (error instanceof HTTPError) {
    logError(error, req, error.statusCode)
    
    const response = createErrorResponse(
      error.statusCode,
      error.message,
      error.code,
      correlationId,
      error.details,
      error.stack
    )

    // Add retry-after header for rate limit errors
    if (error instanceof RateLimitError && error.details?.retryAfter) {
      res.set('Retry-After', error.details.retryAfter.toString())
    }

    res.status(error.statusCode).json(response)
    return
  }

  // Handle Zod validation errors
  if (error.name === 'ZodError') {
    logError(error, req, 400)

    const response = createErrorResponse(
      400,
      'Validation failed',
      'Validation error',
      correlationId,
      error.message,
      error.stack
    )

    res.status(400).json(response)
    return
  }

  // Handle database constraint errors
  if (error.message.includes('UNIQUE constraint') || error.message.includes('duplicate key')) {
    logError(error, req, 409)
    
    const response = createErrorResponse(
      409,
      'Resource already exists',
      'DUPLICATE_RESOURCE',
      correlationId,
      undefined,
      error.stack
    )
    
    res.status(409).json(response)
    return
  }

  // Handle foreign key constraint errors
  if (error.message.includes('FOREIGN KEY constraint') || error.message.includes('foreign key')) {
    logError(error, req, 422)
    
    const response = createErrorResponse(
      422,
      'Invalid reference to related resource',
      'INVALID_REFERENCE',
      correlationId,
      undefined,
      error.stack
    )
    
    res.status(422).json(response)
    return
  }

  // Handle JSON parsing errors
  if (error instanceof SyntaxError && 'body' in error) {
    logError(error, req, 400)
    
    const response = createErrorResponse(
      400,
      'Invalid JSON in request body',
      'INVALID_JSON',
      correlationId,
      undefined,
      error.stack
    )
    
    res.status(400).json(response)
    return
  }

  // Handle unknown errors
  logError(error, req, 500)
  
  const response = createErrorResponse(
    500,
    'Internal server error',
    'INTERNAL_SERVER_ERROR',
    correlationId,
    undefined,
    error.stack
  )
  
  res.status(500).json(response)
}

/**
 * 404 handler for unmatched routes
 */
export function notFoundHandler(req: Request, res: Response): void {
  const correlationId = getCorrelationId(req)
  
  console.warn('Route not found:', {
    url: req.url,
    method: req.method,
    correlationId,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    timestamp: new Date().toISOString()
  })

  const response = createErrorResponse(
    404,
    'The requested resource was not found',
    'NOT_FOUND',
    correlationId
  )

  res.status(404).json(response)
}

/**
 * Async error wrapper for route handlers
 */
export function asyncHandler<T extends Request, U extends Response>(
  fn: (req: T, res: U, next: NextFunction) => Promise<any>
) {
  return (req: T, res: U, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

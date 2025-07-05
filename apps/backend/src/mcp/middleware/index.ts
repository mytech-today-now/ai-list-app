/**
 * MCP Middleware Stack - Core middleware for MCP request processing
 * SemanticType: MCPMiddleware
 * ExtensibleByAI: true
 * AIUseCases: ["Request processing", "Security enforcement", "Performance monitoring"]
 */

import { Request, Response, NextFunction } from 'express';
import { MCPCommand } from '@ai-todo/shared-types';
import { z } from 'zod';

// Extend Express Request interface for MCP
declare global {
  namespace Express {
    interface Request {
      sessionId?: string;
      agentId?: string;
      userId?: string;
      correlationId?: string;
      mcpCommand?: MCPCommand;
      mcpStartTime?: number;
    }
  }
}

/**
 * Core MCP middleware that sets up request context
 */
export const mcpMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Generate correlation ID if not present
  req.correlationId = req.correlationId || `mcp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Set start time for performance tracking
  req.mcpStartTime = Date.now();
  
  // Extract session and agent info from headers
  req.sessionId = req.headers['x-mcp-session-id'] as string;
  req.agentId = req.headers['x-mcp-agent-id'] as string;
  req.userId = req.headers['x-user-id'] as string;
  
  // Set response headers
  res.setHeader('X-MCP-Correlation-ID', req.correlationId);
  res.setHeader('X-MCP-Version', '1.0.0');
  
  next();
};

/**
 * MCP Error Handler
 */
export const mcpErrorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const correlationId = req.correlationId;
  const executionTime = req.mcpStartTime ? Date.now() - req.mcpStartTime : 0;
  
  // Log error
  console.error('MCP Error:', {
    error: error.message,
    stack: error.stack,
    correlationId,
    command: req.mcpCommand,
    executionTime
  });
  
  // Format error response
  const errorResponse = {
    success: false,
    error: {
      code: error.code || 'INTERNAL_ERROR',
      message: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    },
    metadata: {
      correlationId,
      timestamp: new Date().toISOString(),
      executionTime
    }
  };
  
  // Determine status code
  let statusCode = 500;
  if (error.code === 'VALIDATION_ERROR') statusCode = 400;
  if (error.code === 'PERMISSION_ERROR') statusCode = 403;
  if (error.code === 'NOT_FOUND') statusCode = 404;
  if (error.code === 'RATE_LIMIT_EXCEEDED') statusCode = 429;
  
  res.status(statusCode).json(errorResponse);
};

/**
 * MCP Request Logger
 */
export const mcpRequestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Log request
  console.log('MCP Request:', {
    method: req.method,
    url: req.url,
    correlationId: req.correlationId,
    sessionId: req.sessionId,
    agentId: req.agentId,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    timestamp: new Date().toISOString()
  });
  
  // Override res.json to log response
  const originalJson = res.json;
  res.json = function(body: any) {
    const executionTime = Date.now() - startTime;
    
    console.log('MCP Response:', {
      statusCode: res.statusCode,
      correlationId: req.correlationId,
      executionTime,
      success: body.success,
      timestamp: new Date().toISOString()
    });
    
    return originalJson.call(this, body);
  };
  
  next();
};

/**
 * MCP Performance Monitor
 */
export const mcpPerformanceMonitor = (req: Request, res: Response, next: NextFunction) => {
  const startTime = process.hrtime.bigint();
  
  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const executionTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    
    // Log performance metrics
    if (executionTime > 1000) { // Log slow requests (>1s)
      console.warn('Slow MCP Request:', {
        method: req.method,
        url: req.url,
        correlationId: req.correlationId,
        executionTime: `${executionTime.toFixed(2)}ms`,
        statusCode: res.statusCode
      });
    }
    
    // Add performance header
    res.setHeader('X-MCP-Execution-Time', `${executionTime.toFixed(2)}ms`);
  });
  
  next();
};

/**
 * MCP CORS Handler
 */
export const mcpCors = (req: Request, res: Response, next: NextFunction) => {
  // Set CORS headers for MCP requests
  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 
    'Content-Type, Authorization, X-MCP-Session-ID, X-MCP-Agent-ID, X-User-ID, X-Correlation-ID'
  );
  res.setHeader('Access-Control-Expose-Headers', 
    'X-MCP-Correlation-ID, X-MCP-Version, X-MCP-Execution-Time'
  );
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
};

/**
 * MCP Health Check
 */
export const mcpHealthCheck = (req: Request, res: Response, next: NextFunction) => {
  // Add health check endpoint
  if (req.path === '/health') {
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: process.uptime()
    });
    return;
  }
  
  next();
};

// Export all middleware
export * from './auth';
export * from './validation';
export * from './rateLimit';
export * from './logging';

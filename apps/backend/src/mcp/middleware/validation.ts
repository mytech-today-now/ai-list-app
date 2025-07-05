/**
 * MCP Validation Middleware
 * SemanticType: MCPValidationMiddleware
 * ExtensibleByAI: true
 * AIUseCases: ["Request validation", "Schema enforcement", "Data sanitization"]
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { MCPCommand, MCPAction, MCPTargetType } from '@ai-todo/shared-types';

// MCP Command Schema
const MCPCommandSchema = z.object({
  action: z.enum([
    'create', 'read', 'update', 'delete',
    'execute', 'reorder', 'rename', 'status', 'mark_done',
    'rollback', 'plan', 'train', 'deploy', 'test',
    'monitor', 'optimize', 'debug', 'log'
  ] as const),
  targetType: z.enum([
    'list', 'item', 'agent', 'system',
    'batch', 'workflow', 'session'
  ] as const),
  targetId: z.string().min(1, 'Target ID is required'),
  parameters: z.record(z.unknown()).optional(),
  timestamp: z.string().optional(),
  sessionId: z.string().optional(),
  agentId: z.string().optional()
});

// Batch Command Schema
const MCPBatchSchema = z.object({
  commands: z.array(MCPCommandSchema).min(1, 'At least one command is required'),
  options: z.object({
    stopOnError: z.boolean().optional(),
    parallel: z.boolean().optional(),
    maxConcurrency: z.number().min(1).max(10).optional()
  }).optional()
});

// Stream Command Schema
const MCPStreamSchema = MCPCommandSchema;

// Query Parameters Schema
const MCPQuerySchema = z.object({
  limit: z.string().regex(/^\d+$/).transform(Number).refine(n => n > 0 && n <= 1000).optional(),
  offset: z.string().regex(/^\d+$/).transform(Number).refine(n => n >= 0).optional(),
  sessionId: z.string().optional(),
  agentId: z.string().optional()
});

/**
 * Main MCP Validation Middleware
 */
export const mcpValidation = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate based on endpoint
    switch (req.path) {
      case '/command':
        validateCommand(req);
        break;
      case '/batch':
        validateBatch(req);
        break;
      case '/stream':
        validateStream(req);
        break;
      case '/history':
        validateQuery(req);
        break;
      default:
        // No specific validation needed for other endpoints
        break;
    }

    next();
  } catch (error) {
    handleValidationError(error, req, res);
  }
};

/**
 * Validate single command
 */
function validateCommand(req: Request): void {
  const result = MCPCommandSchema.safeParse(req.body);
  
  if (!result.success) {
    throw new ValidationError('Invalid command structure', result.error.errors);
  }
  
  const command = result.data;
  
  // Additional business logic validation
  validateCommandBusinessRules(command);
  
  // Store validated command
  req.mcpCommand = command;
}

/**
 * Validate batch commands
 */
function validateBatch(req: Request): void {
  const result = MCPBatchSchema.safeParse(req.body);
  
  if (!result.success) {
    throw new ValidationError('Invalid batch structure', result.error.errors);
  }
  
  const batch = result.data;
  
  // Validate each command
  batch.commands.forEach((command, index) => {
    try {
      validateCommandBusinessRules(command);
    } catch (error) {
      throw new ValidationError(`Invalid command at index ${index}`, [error.message]);
    }
  });
  
  // Check batch size limits
  if (batch.commands.length > 100) {
    throw new ValidationError('Batch size exceeds maximum limit of 100 commands');
  }
}

/**
 * Validate stream command
 */
function validateStream(req: Request): void {
  const result = MCPStreamSchema.safeParse(req.body);
  
  if (!result.success) {
    throw new ValidationError('Invalid stream command structure', result.error.errors);
  }
  
  const command = result.data;
  validateCommandBusinessRules(command);
  
  req.mcpCommand = command;
}

/**
 * Validate query parameters
 */
function validateQuery(req: Request): void {
  const result = MCPQuerySchema.safeParse(req.query);
  
  if (!result.success) {
    throw new ValidationError('Invalid query parameters', result.error.errors);
  }
  
  // Update query with validated values
  req.query = { ...req.query, ...result.data };
}

/**
 * Validate command business rules
 */
function validateCommandBusinessRules(command: MCPCommand): void {
  // Validate action-target combinations
  validateActionTargetCombination(command.action, command.targetType);
  
  // Validate target ID format
  validateTargetId(command.targetId, command.targetType);
  
  // Validate parameters based on action and target
  validateParameters(command);
  
  // Validate timestamps
  if (command.timestamp) {
    validateTimestamp(command.timestamp);
  }
}

/**
 * Validate action-target combinations
 */
function validateActionTargetCombination(action: MCPAction, targetType: MCPTargetType): void {
  const validCombinations: Record<MCPAction, MCPTargetType[]> = {
    create: ['list', 'item', 'agent', 'session'],
    read: ['list', 'item', 'agent', 'system', 'session'],
    update: ['list', 'item', 'agent', 'session'],
    delete: ['list', 'item', 'agent', 'session'],
    execute: ['list', 'item', 'batch', 'workflow', 'system'],
    reorder: ['list', 'item'],
    rename: ['list', 'item'],
    status: ['list', 'item', 'agent', 'system', 'session'],
    mark_done: ['item'],
    rollback: ['list', 'item', 'batch'],
    plan: ['list', 'workflow', 'system'],
    train: ['agent', 'system'],
    deploy: ['system'],
    test: ['list', 'item', 'system'],
    monitor: ['system', 'agent', 'session'],
    optimize: ['system', 'list'],
    debug: ['system', 'agent'],
    log: ['system', 'agent', 'session']
  };
  
  const validTargets = validCombinations[action];
  if (!validTargets || !validTargets.includes(targetType)) {
    throw new ValidationError(
      `Invalid action-target combination: ${action} cannot be performed on ${targetType}`
    );
  }
}

/**
 * Validate target ID format
 */
function validateTargetId(targetId: string, targetType: MCPTargetType): void {
  // Basic format validation
  if (!targetId || targetId.trim().length === 0) {
    throw new ValidationError('Target ID cannot be empty');
  }
  
  // Length validation
  if (targetId.length > 255) {
    throw new ValidationError('Target ID exceeds maximum length of 255 characters');
  }
  
  // Format validation based on target type
  switch (targetType) {
    case 'list':
    case 'item':
      // Should be UUID or alphanumeric
      if (!/^[a-zA-Z0-9_-]+$/.test(targetId)) {
        throw new ValidationError(`Invalid ${targetType} ID format`);
      }
      break;
    case 'agent':
      // Agent IDs should follow specific format
      if (!/^agent_[a-zA-Z0-9_-]+$/.test(targetId) && targetId !== 'system') {
        throw new ValidationError('Invalid agent ID format');
      }
      break;
    case 'session':
      // Session IDs should be UUIDs or session format
      if (!/^(session_)?[a-zA-Z0-9_-]+$/.test(targetId)) {
        throw new ValidationError('Invalid session ID format');
      }
      break;
  }
}

/**
 * Validate command parameters
 */
function validateParameters(command: MCPCommand): void {
  if (!command.parameters) {
    return;
  }
  
  // Validate parameter size
  const paramString = JSON.stringify(command.parameters);
  if (paramString.length > 10000) {
    throw new ValidationError('Parameters exceed maximum size limit');
  }
  
  // Action-specific parameter validation
  switch (command.action) {
    case 'create':
      validateCreateParameters(command);
      break;
    case 'update':
      validateUpdateParameters(command);
      break;
    case 'execute':
      validateExecuteParameters(command);
      break;
    // Add more specific validations as needed
  }
}

/**
 * Validate create parameters
 */
function validateCreateParameters(command: MCPCommand): void {
  const params = command.parameters!;
  
  switch (command.targetType) {
    case 'list':
      if (!params.title || typeof params.title !== 'string') {
        throw new ValidationError('List creation requires a title parameter');
      }
      break;
    case 'item':
      if (!params.content || typeof params.content !== 'string') {
        throw new ValidationError('Item creation requires a content parameter');
      }
      break;
  }
}

/**
 * Validate update parameters
 */
function validateUpdateParameters(command: MCPCommand): void {
  const params = command.parameters!;
  
  // At least one field should be provided for update
  if (Object.keys(params).length === 0) {
    throw new ValidationError('Update requires at least one parameter');
  }
}

/**
 * Validate execute parameters
 */
function validateExecuteParameters(command: MCPCommand): void {
  // Execute commands may have specific parameter requirements
  // Add validation based on your business logic
}

/**
 * Validate timestamp format
 */
function validateTimestamp(timestamp: string): void {
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) {
    throw new ValidationError('Invalid timestamp format');
  }
  
  // Check if timestamp is not too far in the future
  const now = new Date();
  const maxFuture = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
  
  if (date > maxFuture) {
    throw new ValidationError('Timestamp cannot be more than 24 hours in the future');
  }
}

/**
 * Custom validation error class
 */
class ValidationError extends Error {
  public code = 'VALIDATION_ERROR';
  public details: any;
  
  constructor(message: string, details?: any) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

/**
 * Handle validation errors
 */
function handleValidationError(error: any, req: Request, res: Response): void {
  console.error('MCP Validation Error:', {
    error: error.message,
    details: error.details,
    correlationId: req.correlationId,
    path: req.path,
    body: req.body
  });
  
  res.status(400).json({
    success: false,
    error: {
      code: error.code || 'VALIDATION_ERROR',
      message: error.message,
      details: error.details
    },
    metadata: {
      timestamp: new Date().toISOString(),
      correlationId: req.correlationId
    }
  });
}

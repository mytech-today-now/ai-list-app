/**
 * Validation Schemas - Zod schemas for MCP command validation
 * SemanticType: ValidationSchemas
 * ExtensibleByAI: true
 * AIUseCases: ["Input validation", "Type safety", "Schema evolution"]
 */

import { z } from 'zod';

export class ValidationSchemas {
  // Base schemas
  static readonly prioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);
  static readonly listStatusSchema = z.enum(['active', 'completed', 'archived', 'deleted']);
  static readonly itemStatusSchema = z.enum(['pending', 'in_progress', 'completed', 'cancelled', 'blocked']);
  static readonly agentRoleSchema = z.enum(['reader', 'executor', 'planner', 'admin']);
  static readonly mcpActionSchema = z.enum([
    'create', 'read', 'update', 'delete',
    'execute', 'reorder', 'rename', 'status', 'mark_done',
    'rollback', 'plan', 'train', 'deploy', 'test',
    'monitor', 'optimize', 'debug', 'log'
  ]);

  // ID validation
  static readonly idSchema = z.string()
    .min(1, 'ID cannot be empty')
    .max(255, 'ID cannot exceed 255 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'ID must contain only alphanumeric characters, underscores, and hyphens');

  // Date validation
  static readonly dateTimeSchema = z.string()
    .datetime('Invalid datetime format. Use ISO 8601');

  // List schemas
  static readonly createListSchema = z.object({
    title: z.string()
      .min(1, 'Title is required')
      .max(500, 'Title cannot exceed 500 characters'),
    description: z.string()
      .max(2000, 'Description cannot exceed 2000 characters')
      .optional(),
    parentListId: this.idSchema.optional(),
    priority: this.prioritySchema.optional().default('medium'),
    metadata: z.record(z.unknown()).optional(),
  });

  static readonly updateListSchema = z.object({
    title: z.string()
      .min(1, 'Title cannot be empty')
      .max(500, 'Title cannot exceed 500 characters')
      .optional(),
    description: z.string()
      .max(2000, 'Description cannot exceed 2000 characters')
      .optional(),
    priority: this.prioritySchema.optional(),
    status: this.listStatusSchema.optional(),
    metadata: z.record(z.unknown()).optional(),
  });

  // Item schemas
  static readonly createItemSchema = z.object({
    listId: this.idSchema,
    title: z.string()
      .min(1, 'Title is required')
      .max(500, 'Title cannot exceed 500 characters'),
    description: z.string()
      .max(2000, 'Description cannot exceed 2000 characters')
      .optional(),
    priority: this.prioritySchema.optional().default('medium'),
    dueDate: this.dateTimeSchema.optional(),
    estimatedDuration: z.number()
      .int('Duration must be an integer')
      .min(1, 'Duration must be at least 1 minute')
      .max(10080, 'Duration cannot exceed 1 week (10080 minutes)')
      .optional(),
    tags: z.array(z.string().max(50, 'Tag cannot exceed 50 characters'))
      .max(20, 'Cannot have more than 20 tags')
      .optional(),
    dependencies: z.array(this.idSchema)
      .max(10, 'Cannot have more than 10 dependencies')
      .optional(),
    assignedTo: this.idSchema.optional(),
    metadata: z.record(z.unknown()).optional(),
  });

  static readonly updateItemSchema = z.object({
    title: z.string()
      .min(1, 'Title cannot be empty')
      .max(500, 'Title cannot exceed 500 characters')
      .optional(),
    description: z.string()
      .max(2000, 'Description cannot exceed 2000 characters')
      .optional(),
    priority: this.prioritySchema.optional(),
    status: this.itemStatusSchema.optional(),
    dueDate: this.dateTimeSchema.optional(),
    estimatedDuration: z.number()
      .int('Duration must be an integer')
      .min(1, 'Duration must be at least 1 minute')
      .max(10080, 'Duration cannot exceed 1 week')
      .optional(),
    actualDuration: z.number()
      .int('Duration must be an integer')
      .min(1, 'Duration must be at least 1 minute')
      .max(10080, 'Duration cannot exceed 1 week')
      .optional(),
    tags: z.array(z.string().max(50))
      .max(20, 'Cannot have more than 20 tags')
      .optional(),
    dependencies: z.array(this.idSchema)
      .max(10, 'Cannot have more than 10 dependencies')
      .optional(),
    assignedTo: this.idSchema.optional(),
    metadata: z.record(z.unknown()).optional(),
  });

  // Agent schemas
  static readonly createAgentSchema = z.object({
    name: z.string()
      .min(1, 'Name is required')
      .max(255, 'Name cannot exceed 255 characters'),
    role: this.agentRoleSchema,
    permissions: z.array(this.mcpActionSchema)
      .min(1, 'At least one permission is required')
      .max(20, 'Cannot have more than 20 permissions'),
    configuration: z.record(z.unknown()).optional(),
    metadata: z.record(z.unknown()).optional(),
  });

  static readonly updateAgentSchema = z.object({
    name: z.string()
      .min(1, 'Name cannot be empty')
      .max(255, 'Name cannot exceed 255 characters')
      .optional(),
    role: this.agentRoleSchema.optional(),
    permissions: z.array(this.mcpActionSchema)
      .min(1, 'At least one permission is required')
      .max(20, 'Cannot have more than 20 permissions')
      .optional(),
    configuration: z.record(z.unknown()).optional(),
    metadata: z.record(z.unknown()).optional(),
  });

  // Operation schemas
  static readonly reorderSchema = z.object({
    position: z.number()
      .int('Position must be an integer')
      .min(0, 'Position cannot be negative'),
  });

  static readonly statusQuerySchema = z.object({
    recursive: z.boolean().optional().default(false),
    includeItems: z.boolean().optional().default(true),
    includeDependencies: z.boolean().optional().default(false),
    includeMetadata: z.boolean().optional().default(false),
  });

  static readonly executeSchema = z.object({
    parallel: z.boolean().optional().default(false),
    maxConcurrency: z.number()
      .int('Concurrency must be an integer')
      .min(1, 'Concurrency must be at least 1')
      .max(10, 'Concurrency cannot exceed 10')
      .optional()
      .default(3),
    dryRun: z.boolean().optional().default(false),
  });

  // Session schemas
  static readonly createSessionSchema = z.object({
    agentId: this.idSchema.optional(),
    userId: this.idSchema.optional(),
    expirationMinutes: z.number()
      .int('Expiration must be an integer')
      .min(1, 'Expiration must be at least 1 minute')
      .max(1440, 'Expiration cannot exceed 24 hours')
      .optional()
      .default(60),
    metadata: z.record(z.unknown()).optional(),
  });

  // Query schemas
  static readonly querySchema = z.object({
    filters: z.record(z.unknown()).optional(),
    sort: z.object({
      field: z.string(),
      direction: z.enum(['asc', 'desc']).default('asc'),
    }).optional(),
    pagination: z.object({
      limit: z.number().int().min(1).max(1000).default(50),
      offset: z.number().int().min(0).default(0),
    }).optional(),
  });

  // Batch operation schemas
  static readonly batchOperationSchema = z.object({
    operations: z.array(z.object({
      action: this.mcpActionSchema,
      targetType: z.string(),
      targetId: this.idSchema,
      parameters: z.record(z.unknown()).optional(),
    })).min(1, 'At least one operation is required').max(100, 'Cannot exceed 100 operations'),
    stopOnError: z.boolean().optional().default(true),
    parallel: z.boolean().optional().default(false),
  });

  // System schemas
  static readonly systemConfigSchema = z.object({
    enableLogging: z.boolean().optional(),
    enableValidation: z.boolean().optional(),
    enablePermissions: z.boolean().optional(),
    maxExecutionTime: z.number().int().min(1000).max(300000).optional(), // 1s to 5min
    cacheSize: z.number().int().min(100).max(10000).optional(),
  });

  // Rollback schemas
  static readonly rollbackSchema = z.object({
    actionId: z.number().int().min(1),
    reason: z.string().max(500).optional(),
    force: z.boolean().optional().default(false),
  });

  // Export schemas
  static readonly exportSchema = z.object({
    format: z.enum(['json', 'csv', 'xml']).default('json'),
    includeMetadata: z.boolean().optional().default(true),
    dateRange: z.object({
      start: this.dateTimeSchema,
      end: this.dateTimeSchema,
    }).optional(),
    filters: z.record(z.unknown()).optional(),
  });

  /**
   * Get schema by action and target type
   */
  static getSchema(action: string, targetType: string): z.ZodSchema | null {
    const schemaMap: Record<string, z.ZodSchema> = {
      'create:list': this.createListSchema,
      'update:list': this.updateListSchema,
      'create:item': this.createItemSchema,
      'update:item': this.updateItemSchema,
      'create:agent': this.createAgentSchema,
      'update:agent': this.updateAgentSchema,
      'reorder:item': this.reorderSchema,
      'reorder:list': this.reorderSchema,
      'status:list': this.statusQuerySchema,
      'status:item': this.statusQuerySchema,
      'status:system': z.object({}),
      'execute:list': this.executeSchema,
      'execute:batch': this.batchOperationSchema,
      'rollback:system': this.rollbackSchema,
      'log:system': z.record(z.unknown()),
    };

    return schemaMap[`${action}:${targetType}`] || null;
  }

  /**
   * Validate parameters against schema
   */
  static async validateParameters(
    action: string,
    targetType: string,
    parameters: unknown
  ): Promise<{ valid: boolean; data?: unknown; errors?: string[] }> {
    const schema = this.getSchema(action, targetType);
    
    if (!schema) {
      return { valid: true, data: parameters }; // No validation required
    }

    try {
      const validatedData = await schema.parseAsync(parameters);
      return { valid: true, data: validatedData };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.issues.map(issue => 
          `${issue.path.join('.')}: ${issue.message}`
        );
        return { valid: false, errors };
      }
      return { valid: false, errors: ['Unknown validation error'] };
    }
  }

  /**
   * Get all available schemas
   */
  static getAllSchemas(): string[] {
    return [
      'create:list', 'update:list',
      'create:item', 'update:item',
      'create:agent', 'update:agent',
      'reorder:item', 'reorder:list',
      'status:list', 'status:item', 'status:system',
      'execute:list', 'execute:batch',
      'rollback:system',
      'log:system',
    ];
  }
}

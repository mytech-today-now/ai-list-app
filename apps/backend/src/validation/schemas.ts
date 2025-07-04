import { z } from 'zod'

/**
 * SemanticType: CRUDValidationSchemas
 * Description: Comprehensive validation schemas for all CRUD operations with proper error messages
 * ExtensibleByAI: true
 * AIUseCases:
 *   - Add custom validation rules
 *   - Extend schema validation
 *   - Add business logic validation
 *   - Integrate with MCP validation
 */

// Common validation patterns
const uuidSchema = z.string().uuid('Invalid UUID format')
const nonEmptyStringSchema = z.string().min(1, 'Field cannot be empty')
const optionalStringSchema = z.string().optional()
const prioritySchema = z.enum(['low', 'medium', 'high', 'urgent'], {
  errorMap: () => ({ message: 'Priority must be one of: low, medium, high, urgent' })
})

// List validation schemas
export const listSchemas = {
  create: z.object({
    title: z.string()
      .min(1, 'Title is required')
      .max(500, 'Title must be less than 500 characters'),
    description: optionalStringSchema,
    parentListId: z.string().uuid().optional().nullable(),
    priority: prioritySchema.default('medium'),
    status: z.enum(['active', 'completed', 'archived', 'deleted']).default('active')
  }),
  
  update: z.object({
    title: z.string()
      .min(1, 'Title is required')
      .max(500, 'Title must be less than 500 characters')
      .optional(),
    description: optionalStringSchema,
    priority: prioritySchema.optional(),
    status: z.enum(['active', 'completed', 'archived', 'deleted']).optional(),
    completedAt: z.date().optional().nullable()
  }),
  
  query: z.object({
    tree: z.enum(['true', 'false']).optional(),
    parent: z.string().optional(),
    status: z.enum(['active', 'completed', 'archived', 'deleted']).optional(),
    priority: prioritySchema.optional(),
    include: z.enum(['children', 'items', 'breadcrumbs']).optional(),
    page: z.coerce.number().min(1).optional(),
    limit: z.coerce.number().min(1).max(100).optional()
  }),
  
  params: z.object({
    id: uuidSchema
  })
}

// Item validation schemas
export const itemSchemas = {
  create: z.object({
    listId: uuidSchema,
    title: z.string()
      .min(1, 'Title is required')
      .max(500, 'Title must be less than 500 characters'),
    description: optionalStringSchema,
    priority: prioritySchema.default('medium'),
    status: z.enum(['pending', 'in_progress', 'completed', 'blocked']).default('pending'),
    dueDate: z.coerce.date().optional().nullable(),
    estimatedDuration: z.number().min(0, 'Duration must be positive').optional().nullable(),
    tags: z.array(z.string()).optional(),
    assignedTo: optionalStringSchema,
    dependencies: z.array(uuidSchema).optional()
  }),
  
  update: z.object({
    title: z.string()
      .min(1, 'Title is required')
      .max(500, 'Title must be less than 500 characters')
      .optional(),
    description: optionalStringSchema,
    priority: prioritySchema.optional(),
    status: z.enum(['pending', 'in_progress', 'completed', 'blocked']).optional(),
    dueDate: z.coerce.date().optional().nullable(),
    estimatedDuration: z.number().min(0, 'Duration must be positive').optional().nullable(),
    actualDuration: z.number().min(0, 'Duration must be positive').optional().nullable(),
    tags: z.array(z.string()).optional(),
    assignedTo: optionalStringSchema,
    completedAt: z.date().optional().nullable()
  }),
  
  query: z.object({
    listId: uuidSchema.optional(),
    status: z.enum(['pending', 'in_progress', 'completed', 'blocked']).optional(),
    priority: prioritySchema.optional(),
    assignedTo: z.string().optional(),
    overdue: z.enum(['true', 'false']).optional(),
    dueSoon: z.coerce.number().min(1).optional(), // hours
    include: z.enum(['dependencies']).optional(),
    page: z.coerce.number().min(1).optional(),
    limit: z.coerce.number().min(1).max(100).optional()
  }),
  
  params: z.object({
    id: uuidSchema
  })
}

// Agent validation schemas
export const agentSchemas = {
  create: z.object({
    name: z.string()
      .min(1, 'Name is required')
      .max(255, 'Name must be less than 255 characters'),
    role: z.enum(['reader', 'executor', 'planner', 'admin'], {
      errorMap: () => ({ message: 'Role must be one of: reader, executor, planner, admin' })
    }),
    status: z.enum(['active', 'suspended', 'inactive']).default('active'),
    permissions: z.array(z.string()).default([]),
    configuration: z.record(z.any()).default({}),
    apiKey: z.string().optional()
  }),
  
  update: z.object({
    name: z.string()
      .min(1, 'Name is required')
      .max(255, 'Name must be less than 255 characters')
      .optional(),
    status: z.enum(['active', 'suspended', 'inactive']).optional(),
    permissions: z.array(z.string()).optional(),
    configuration: z.record(z.any()).optional()
  }),
  
  query: z.object({
    role: z.enum(['reader', 'executor', 'planner', 'admin']).optional(),
    status: z.enum(['active', 'suspended', 'inactive']).optional(),
    active: z.enum(['true', 'false']).optional(),
    recent: z.coerce.number().min(1).optional(), // hours
    include: z.enum(['activity']).optional(),
    page: z.coerce.number().min(1).optional(),
    limit: z.coerce.number().min(1).max(100).optional()
  }),
  
  params: z.object({
    id: uuidSchema
  })
}

// Session validation schemas
export const sessionSchemas = {
  create: z.object({
    agentId: uuidSchema,
    userId: z.string().optional(),
    expirationMinutes: z.number()
      .min(1, 'Expiration must be at least 1 minute')
      .max(1440, 'Expiration cannot exceed 24 hours')
      .default(60)
  }),
  
  update: z.object({
    metadata: z.record(z.any(), {
      required_error: 'Metadata is required for session updates'
    })
  }),
  
  query: z.object({
    agentId: uuidSchema.optional(),
    userId: z.string().optional(),
    status: z.enum(['all', 'active', 'expired']).optional(),
    active: z.enum(['true', 'false']).optional(),
    expired: z.enum(['true', 'false']).optional(),
    expiringSoon: z.coerce.number().min(1).optional(), // minutes
    include: z.enum(['agent']).optional(),
    page: z.coerce.number().min(1).optional(),
    limit: z.coerce.number().min(1).max(100).optional()
  }),
  
  params: z.object({
    id: uuidSchema
  })
}

// Action-specific validation schemas
export const actionSchemas = {
  // List actions
  moveList: z.object({
    parentId: uuidSchema.optional().nullable()
  }),
  
  reorderList: z.object({
    position: z.number().min(0, 'Position must be non-negative')
  }),
  
  // Item actions
  moveItem: z.object({
    listId: uuidSchema
  }),
  
  reorderItem: z.object({
    position: z.number().min(0, 'Position must be non-negative')
  }),
  
  // Agent actions
  suspendAgent: z.object({
    reason: z.string().optional()
  }),
  
  updatePermissions: z.object({
    permissions: z.array(z.string(), {
      required_error: 'Permissions array is required'
    })
  }),
  
  verifyApiKey: z.object({
    apiKey: z.string().min(1, 'API key is required')
  }),
  
  // Session actions
  extendSession: z.object({
    additionalMinutes: z.number()
      .min(1, 'Additional minutes must be at least 1')
      .max(1440, 'Cannot extend more than 24 hours')
      .default(60)
  }),
  
  updateActivity: z.object({
    extendMinutes: z.number()
      .min(1, 'Extension must be at least 1 minute')
      .max(1440, 'Cannot extend more than 24 hours')
      .default(60)
  })
}

// Export all schemas
export const validationSchemas = {
  lists: listSchemas,
  items: itemSchemas,
  agents: agentSchemas,
  sessions: sessionSchemas,
  actions: actionSchemas
}

// Type exports for TypeScript
export type ListCreateSchema = z.infer<typeof listSchemas.create>
export type ListUpdateSchema = z.infer<typeof listSchemas.update>
export type ListQuerySchema = z.infer<typeof listSchemas.query>

export type ItemCreateSchema = z.infer<typeof itemSchemas.create>
export type ItemUpdateSchema = z.infer<typeof itemSchemas.update>
export type ItemQuerySchema = z.infer<typeof itemSchemas.query>

export type AgentCreateSchema = z.infer<typeof agentSchemas.create>
export type AgentUpdateSchema = z.infer<typeof agentSchemas.update>
export type AgentQuerySchema = z.infer<typeof agentSchemas.query>

export type SessionCreateSchema = z.infer<typeof sessionSchemas.create>
export type SessionUpdateSchema = z.infer<typeof sessionSchemas.update>
export type SessionQuerySchema = z.infer<typeof sessionSchemas.query>

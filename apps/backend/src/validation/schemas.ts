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

  // Enhanced search and filtering schemas for lists
  advancedSearchQuery: z.object({
    q: z.string().min(1, 'Search query is required'),
    fields: z.array(z.enum(['title', 'description'])).optional().default(['title', 'description']),
    status: z.array(z.enum(['active', 'completed', 'archived', 'deleted'])).optional(),
    priority: z.array(prioritySchema).optional(),
    parentListId: uuidSchema.optional(),
    hasParent: z.enum(['true', 'false']).optional(),
    hasChildren: z.enum(['true', 'false']).optional(),
    hasItems: z.enum(['true', 'false']).optional(),
    itemCountMin: z.coerce.number().min(0).optional(),
    itemCountMax: z.coerce.number().min(0).optional(),
    completionRateMin: z.coerce.number().min(0).max(100).optional(),
    completionRateMax: z.coerce.number().min(0).max(100).optional(),
    createdFrom: z.coerce.date().optional(),
    createdTo: z.coerce.date().optional(),
    updatedFrom: z.coerce.date().optional(),
    updatedTo: z.coerce.date().optional(),
    page: z.coerce.number().min(1).optional().default(1),
    limit: z.coerce.number().min(1).max(100).optional().default(20),
    sortBy: z.enum(['title', 'priority', 'status', 'createdAt', 'updatedAt', 'position', 'itemCount', 'completionRate']).optional().default('updatedAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
    includeArchived: z.enum(['true', 'false']).optional().default('false')
  }),

  filterQuery: z.object({
    status: z.array(z.enum(['active', 'completed', 'archived', 'deleted'])).optional(),
    priority: z.array(prioritySchema).optional(),
    parentListId: uuidSchema.optional(),
    hasParent: z.enum(['true', 'false']).optional(),
    hasChildren: z.enum(['true', 'false']).optional(),
    hasItems: z.enum(['true', 'false']).optional(),
    itemCountMin: z.coerce.number().min(0).optional(),
    itemCountMax: z.coerce.number().min(0).optional(),
    completionRateMin: z.coerce.number().min(0).max(100).optional(),
    completionRateMax: z.coerce.number().min(0).max(100).optional(),
    createdFrom: z.coerce.date().optional(),
    createdTo: z.coerce.date().optional(),
    updatedFrom: z.coerce.date().optional(),
    updatedTo: z.coerce.date().optional(),
    page: z.coerce.number().min(1).optional().default(1),
    limit: z.coerce.number().min(1).max(100).optional().default(20),
    sortBy: z.enum(['title', 'priority', 'status', 'createdAt', 'updatedAt', 'position', 'itemCount', 'completionRate']).optional().default('updatedAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
    includeArchived: z.enum(['true', 'false']).optional().default('false')
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

  searchQuery: z.object({
    q: z.string().min(1, 'Search query is required'),
    listId: uuidSchema.optional(),
    status: z.enum(['pending', 'in_progress', 'completed', 'blocked']).optional(),
    limit: z.coerce.number().min(1).max(100).optional().default(50)
  }),

  // Enhanced search and filtering schemas
  advancedSearchQuery: z.object({
    q: z.string().min(1, 'Search query is required'),
    fields: z.array(z.enum(['title', 'description', 'tags'])).optional().default(['title', 'description']),
    listId: uuidSchema.optional(),
    status: z.array(z.enum(['pending', 'in_progress', 'completed', 'blocked'])).optional(),
    priority: z.array(prioritySchema).optional(),
    assignedTo: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    dueDateFrom: z.coerce.date().optional(),
    dueDateTo: z.coerce.date().optional(),
    createdFrom: z.coerce.date().optional(),
    createdTo: z.coerce.date().optional(),
    updatedFrom: z.coerce.date().optional(),
    updatedTo: z.coerce.date().optional(),
    hasDescription: z.enum(['true', 'false']).optional(),
    hasDueDate: z.enum(['true', 'false']).optional(),
    hasAssignee: z.enum(['true', 'false']).optional(),
    overdue: z.enum(['true', 'false']).optional(),
    dueSoon: z.coerce.number().min(1).max(168).optional(), // hours (max 1 week)
    estimatedDurationMin: z.coerce.number().min(0).optional(),
    estimatedDurationMax: z.coerce.number().min(0).optional(),
    page: z.coerce.number().min(1).optional().default(1),
    limit: z.coerce.number().min(1).max(100).optional().default(20),
    sortBy: z.enum(['title', 'priority', 'status', 'dueDate', 'createdAt', 'updatedAt', 'position']).optional().default('updatedAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
    includeCompleted: z.enum(['true', 'false']).optional().default('true')
  }),

  filterQuery: z.object({
    listId: uuidSchema.optional(),
    status: z.array(z.enum(['pending', 'in_progress', 'completed', 'blocked'])).optional(),
    priority: z.array(prioritySchema).optional(),
    assignedTo: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    dueDateFrom: z.coerce.date().optional(),
    dueDateTo: z.coerce.date().optional(),
    createdFrom: z.coerce.date().optional(),
    createdTo: z.coerce.date().optional(),
    updatedFrom: z.coerce.date().optional(),
    updatedTo: z.coerce.date().optional(),
    hasDescription: z.enum(['true', 'false']).optional(),
    hasDueDate: z.enum(['true', 'false']).optional(),
    hasAssignee: z.enum(['true', 'false']).optional(),
    overdue: z.enum(['true', 'false']).optional(),
    dueSoon: z.coerce.number().min(1).max(168).optional(),
    estimatedDurationMin: z.coerce.number().min(0).optional(),
    estimatedDurationMax: z.coerce.number().min(0).optional(),
    page: z.coerce.number().min(1).optional().default(1),
    limit: z.coerce.number().min(1).max(100).optional().default(20),
    sortBy: z.enum(['title', 'priority', 'status', 'dueDate', 'createdAt', 'updatedAt', 'position']).optional().default('updatedAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
    includeCompleted: z.enum(['true', 'false']).optional().default('true')
  }),

  statsQuery: z.object({
    listId: uuidSchema.optional()
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

// Global search schema
export const globalSearchSchema = z.object({
  q: z.string().min(1, 'Search query is required'),
  types: z.array(z.enum(['lists', 'items', 'agents'])).optional().default(['lists', 'items']),
  fields: z.array(z.enum(['title', 'description', 'name', 'tags'])).optional().default(['title', 'description', 'name']),
  status: z.array(z.string()).optional(),
  priority: z.array(prioritySchema).optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  sortBy: z.enum(['relevance', 'createdAt', 'updatedAt', 'title', 'name']).optional().default('relevance'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  includeArchived: z.enum(['true', 'false']).optional().default('false')
})

// Enhanced pagination schema
export const paginationSchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  offset: z.coerce.number().min(0).optional()
})

// Export all schemas
export const validationSchemas = {
  lists: listSchemas,
  items: itemSchemas,
  agents: agentSchemas,
  sessions: sessionSchemas,
  actions: actionSchemas,
  global: { search: globalSearchSchema },
  common: { pagination: paginationSchema }
}

// Bulk operation validation schemas
export const bulkSchemas = {
  // Bulk items operations
  bulkCreateItems: z.object({
    items: z.array(itemSchemas.create)
      .min(1, 'At least one item is required')
      .max(100, 'Cannot create more than 100 items at once'),
    options: z.object({
      continueOnError: z.boolean().default(false),
      validateDependencies: z.boolean().default(true)
    }).optional()
  }),

  bulkUpdateItems: z.object({
    updates: z.array(z.object({
      id: uuidSchema,
      data: itemSchemas.update
    }))
      .min(1, 'At least one update is required')
      .max(100, 'Cannot update more than 100 items at once'),
    options: z.object({
      continueOnError: z.boolean().default(false),
      validateDependencies: z.boolean().default(true)
    }).optional()
  }),

  bulkDeleteItems: z.object({
    ids: z.array(uuidSchema)
      .min(1, 'At least one ID is required')
      .max(100, 'Cannot delete more than 100 items at once'),
    options: z.object({
      continueOnError: z.boolean().default(false),
      force: z.boolean().default(false) // Skip dependency checks
    }).optional()
  }),

  bulkStatusItems: z.object({
    ids: z.array(uuidSchema)
      .min(1, 'At least one ID is required')
      .max(100, 'Cannot update more than 100 items at once'),
    status: z.enum(['pending', 'in_progress', 'completed', 'blocked']),
    options: z.object({
      continueOnError: z.boolean().default(false),
      updateTimestamps: z.boolean().default(true)
    }).optional()
  }),

  bulkMoveItems: z.object({
    ids: z.array(uuidSchema)
      .min(1, 'At least one ID is required')
      .max(100, 'Cannot move more than 100 items at once'),
    targetListId: uuidSchema,
    options: z.object({
      continueOnError: z.boolean().default(false),
      preservePosition: z.boolean().default(false)
    }).optional()
  }),

  // Bulk lists operations
  bulkCreateLists: z.object({
    lists: z.array(listSchemas.create)
      .min(1, 'At least one list is required')
      .max(50, 'Cannot create more than 50 lists at once'),
    options: z.object({
      continueOnError: z.boolean().default(false),
      validateHierarchy: z.boolean().default(true)
    }).optional()
  }),

  bulkUpdateLists: z.object({
    updates: z.array(z.object({
      id: uuidSchema,
      data: listSchemas.update
    }))
      .min(1, 'At least one update is required')
      .max(50, 'Cannot update more than 50 lists at once'),
    options: z.object({
      continueOnError: z.boolean().default(false),
      validateHierarchy: z.boolean().default(true)
    }).optional()
  }),

  bulkDeleteLists: z.object({
    ids: z.array(uuidSchema)
      .min(1, 'At least one ID is required')
      .max(50, 'Cannot delete more than 50 lists at once'),
    options: z.object({
      continueOnError: z.boolean().default(false),
      force: z.boolean().default(false), // Skip hierarchy checks
      deleteItems: z.boolean().default(false) // Delete contained items
    }).optional()
  }),

  bulkStatusLists: z.object({
    ids: z.array(uuidSchema)
      .min(1, 'At least one ID is required')
      .max(50, 'Cannot update more than 50 lists at once'),
    status: z.enum(['active', 'completed', 'archived', 'deleted']),
    options: z.object({
      continueOnError: z.boolean().default(false),
      updateTimestamps: z.boolean().default(true),
      cascadeToItems: z.boolean().default(false)
    }).optional()
  })
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

// Bulk operation types
export type BulkCreateItemsSchema = z.infer<typeof bulkSchemas.bulkCreateItems>
export type BulkUpdateItemsSchema = z.infer<typeof bulkSchemas.bulkUpdateItems>
export type BulkDeleteItemsSchema = z.infer<typeof bulkSchemas.bulkDeleteItems>
export type BulkStatusItemsSchema = z.infer<typeof bulkSchemas.bulkStatusItems>
export type BulkMoveItemsSchema = z.infer<typeof bulkSchemas.bulkMoveItems>

export type BulkCreateListsSchema = z.infer<typeof bulkSchemas.bulkCreateLists>
export type BulkUpdateListsSchema = z.infer<typeof bulkSchemas.bulkUpdateLists>
export type BulkDeleteListsSchema = z.infer<typeof bulkSchemas.bulkDeleteLists>
export type BulkStatusListsSchema = z.infer<typeof bulkSchemas.bulkStatusLists>

export type SessionCreateSchema = z.infer<typeof sessionSchemas.create>
export type SessionUpdateSchema = z.infer<typeof sessionSchemas.update>
export type SessionQuerySchema = z.infer<typeof sessionSchemas.query>

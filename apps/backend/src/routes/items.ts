import { Router } from 'express'
import { itemsController } from '../controllers/items'
import { validateBody, validateParams, validateQuery, crudValidation, rateLimitValidation } from '../middleware/validation'
import { asyncHandler } from '../middleware/errorHandler'
import { itemSchemas, actionSchemas } from '../validation/schemas'

/**
 * SemanticType: EnhancedItemsRouter
 * Description: Enhanced items router with standardized CRUD operations, validation, and proper HTTP status codes
 * ExtensibleByAI: true
 * AIUseCases:
 *   - Add custom route handlers
 *   - Extend validation rules
 *   - Add dependency management
 *   - Integrate with MCP protocols
 */

const router = Router()

// Apply rate limiting to all routes
router.use(rateLimitValidation)

/**
 * GET /api/items/search
 * Search items by query
 * Status Codes:
 *   200 - Success
 *   400 - Invalid query parameters
 *   500 - Server error
 */
router.get('/search',
  validateQuery(itemSchemas.searchQuery),
  asyncHandler(itemsController.search.bind(itemsController))
)

/**
 * GET /api/items/advanced-search
 * Advanced search items with comprehensive filtering
 * Status Codes:
 *   200 - Success
 *   400 - Invalid query parameters
 *   500 - Server error
 */
router.get('/advanced-search',
  validateQuery(itemSchemas.advancedSearchQuery),
  asyncHandler(itemsController.advancedSearch.bind(itemsController))
)

/**
 * GET /api/items/filter
 * Filter items without search query
 * Status Codes:
 *   200 - Success
 *   400 - Invalid query parameters
 *   500 - Server error
 */
router.get('/filter',
  validateQuery(itemSchemas.filterQuery),
  asyncHandler(itemsController.filter.bind(itemsController))
)

/**
 * GET /api/items/stats
 * Get item statistics
 * Status Codes:
 *   200 - Success
 *   400 - Invalid query parameters
 *   500 - Server error
 */
router.get('/stats',
  validateQuery(itemSchemas.statsQuery),
  asyncHandler(itemsController.getStats.bind(itemsController))
)

/**
 * GET /api/items
 * Get all items with optional filtering and pagination
 * Status Codes:
 *   200 - Success
 *   400 - Invalid query parameters
 *   500 - Server error
 */
router.get('/',
  validateQuery(itemSchemas.query),
  asyncHandler(itemsController.list.bind(itemsController))
)

/**
 * GET /api/items/:id
 * Get a specific item by ID with optional includes
 * Status Codes:
 *   200 - Success
 *   400 - Invalid parameters
 *   404 - Item not found
 *   500 - Server error
 */
router.get('/:id',
  validateParams(itemSchemas.params),
  validateQuery(itemSchemas.query),
  asyncHandler(itemsController.getById.bind(itemsController))
)

/**
 * POST /api/items
 * Create a new item
 * Status Codes:
 *   201 - Created successfully
 *   400 - Validation error
 *   409 - Conflict (duplicate)
 *   500 - Server error
 */
router.post('/',
  validateBody(itemSchemas.create),
  asyncHandler(itemsController.create.bind(itemsController))
)

/**
 * PUT /api/items/:id
 * Update an item (full update)
 * Status Codes:
 *   200 - Updated successfully
 *   400 - Validation error
 *   404 - Item not found
 *   500 - Server error
 */
router.put('/:id',
  validateParams(itemSchemas.params),
  validateBody(itemSchemas.update),
  asyncHandler(itemsController.update.bind(itemsController))
)

/**
 * PATCH /api/items/:id
 * Partially update an item
 * Status Codes:
 *   200 - Updated successfully
 *   400 - Validation error
 *   404 - Item not found
 *   500 - Server error
 */
router.patch('/:id',
  validateParams(itemSchemas.params),
  validateBody(itemSchemas.update.partial()),
  asyncHandler(itemsController.patch.bind(itemsController))
)

/**
 * DELETE /api/items/:id
 * Delete an item
 * Status Codes:
 *   200 - Deleted successfully
 *   404 - Item not found
 *   500 - Server error
 */
router.delete('/:id',
  validateParams(itemSchemas.params),
  asyncHandler(itemsController.delete.bind(itemsController))
)

/**
 * HEAD /api/items/:id
 * Check if item exists
 * Status Codes:
 *   200 - Item exists
 *   404 - Item not found
 *   500 - Server error
 */
router.head('/:id',
  validateParams(itemSchemas.params),
  asyncHandler(itemsController.head.bind(itemsController))
)

/**
 * POST /api/items/:id/complete
 * Mark an item as completed
 * Status Codes:
 *   200 - Completed successfully
 *   404 - Item not found
 *   500 - Server error
 */
router.post('/:id/complete',
  validateParams(itemSchemas.params),
  asyncHandler(itemsController.complete.bind(itemsController))
)

/**
 * POST /api/items/:id/start
 * Mark an item as in progress
 * Status Codes:
 *   200 - Started successfully
 *   400 - Dependencies not completed
 *   404 - Item not found
 *   500 - Server error
 */
router.post('/:id/start',
  validateParams(itemSchemas.params),
  asyncHandler(itemsController.start.bind(itemsController))
)

/**
 * POST /api/items/:id/move
 * Move an item to a different list
 * Status Codes:
 *   200 - Moved successfully
 *   400 - Validation error
 *   404 - Item not found
 *   500 - Server error
 */
router.post('/:id/move',
  validateParams(itemSchemas.params),
  validateBody(actionSchemas.moveItem),
  asyncHandler(itemsController.move.bind(itemsController))
)

/**
 * POST /api/items/:id/duplicate
 * Duplicate an item
 * Status Codes:
 *   201 - Duplicated successfully
 *   404 - Item not found
 *   500 - Server error
 */
router.post('/:id/duplicate',
  validateParams(itemSchemas.params),
  asyncHandler(itemsController.duplicate.bind(itemsController))
)

/**
 * OPTIONS /api/items
 * Get allowed methods
 * Status Codes:
 *   200 - Success
 */
router.options('/',
  asyncHandler(itemsController.options.bind(itemsController))
)

export default router

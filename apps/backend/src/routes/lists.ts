import { Router } from 'express'
import { listsController } from '../controllers/lists'
import { validateBody, validateParams, validateQuery, crudValidation, rateLimitValidation } from '../middleware/validation'
import { asyncHandler } from '../middleware/errorHandler'
import { listSchemas, actionSchemas } from '../validation/schemas'

/**
 * SemanticType: EnhancedListsRouter
 * Description: Enhanced lists router with standardized CRUD operations, validation, and proper HTTP status codes
 * ExtensibleByAI: true
 * AIUseCases:
 *   - Add custom route handlers
 *   - Extend validation rules
 *   - Add caching middleware
 *   - Integrate with MCP protocols
 */

const router = Router()

// Apply rate limiting to all routes
router.use(rateLimitValidation)

/**
 * GET /api/lists/advanced-search
 * Advanced search lists with comprehensive filtering
 * Status Codes:
 *   200 - Success
 *   400 - Invalid query parameters
 *   500 - Server error
 */
router.get('/advanced-search',
  validateQuery(listSchemas.advancedSearchQuery),
  asyncHandler(listsController.advancedSearch.bind(listsController))
)

/**
 * GET /api/lists/filter
 * Filter lists without search query
 * Status Codes:
 *   200 - Success
 *   400 - Invalid query parameters
 *   500 - Server error
 */
router.get('/filter',
  validateQuery(listSchemas.filterQuery),
  asyncHandler(listsController.filter.bind(listsController))
)

/**
 * GET /api/lists
 * Get all lists with optional hierarchy and filtering
 * Status Codes:
 *   200 - Success
 *   400 - Invalid query parameters
 *   500 - Server error
 */
router.get('/',
  validateQuery(listSchemas.query),
  asyncHandler(listsController.list.bind(listsController))
)

/**
 * GET /api/lists/:id
 * Get a specific list by ID with optional includes
 * Status Codes:
 *   200 - Success
 *   400 - Invalid parameters
 *   404 - List not found
 *   500 - Server error
 */
router.get('/:id',
  validateParams(listSchemas.params),
  validateQuery(listSchemas.query),
  asyncHandler(listsController.getById.bind(listsController))
)

/**
 * POST /api/lists
 * Create a new list
 * Status Codes:
 *   201 - Created successfully
 *   400 - Validation error
 *   409 - Conflict (duplicate)
 *   500 - Server error
 */
router.post('/',
  validateBody(listSchemas.create),
  asyncHandler(listsController.create.bind(listsController))
)

/**
 * PUT /api/lists/:id
 * Update a list (full update)
 * Status Codes:
 *   200 - Updated successfully
 *   400 - Validation error
 *   404 - List not found
 *   500 - Server error
 */
router.put('/:id',
  validateParams(listSchemas.params),
  validateBody(listSchemas.update),
  asyncHandler(listsController.update.bind(listsController))
)

/**
 * PATCH /api/lists/:id
 * Partially update a list
 * Status Codes:
 *   200 - Updated successfully
 *   400 - Validation error
 *   404 - List not found
 *   500 - Server error
 */
router.patch('/:id',
  validateParams(listSchemas.params),
  validateBody(listSchemas.update.partial()),
  asyncHandler(listsController.patch.bind(listsController))
)

/**
 * DELETE /api/lists/:id
 * Delete a list
 * Status Codes:
 *   200 - Deleted successfully
 *   404 - List not found
 *   500 - Server error
 */
router.delete('/:id',
  validateParams(listSchemas.params),
  asyncHandler(listsController.delete.bind(listsController))
)

/**
 * HEAD /api/lists/:id
 * Check if list exists
 * Status Codes:
 *   200 - List exists
 *   404 - List not found
 *   500 - Server error
 */
router.head('/:id',
  validateParams(listSchemas.params),
  asyncHandler(listsController.head.bind(listsController))
)

/**
 * OPTIONS /api/lists
 * Get allowed methods
 * Status Codes:
 *   200 - Success
 */
router.options('/',
  asyncHandler(listsController.options.bind(listsController))
)

/**
 * POST /api/lists/:id/move
 * Move a list to a new parent
 * Status Codes:
 *   200 - Moved successfully
 *   400 - Validation error (circular reference)
 *   404 - List not found
 *   500 - Server error
 */
router.post('/:id/move',
  validateParams(listSchemas.params),
  validateBody(actionSchemas.moveList),
  asyncHandler(listsController.move.bind(listsController))
)

/**
 * POST /api/lists/:id/reorder
 * Reorder a list within its parent
 * Status Codes:
 *   200 - Reordered successfully
 *   400 - Validation error
 *   404 - List not found
 *   500 - Server error
 */
router.post('/:id/reorder',
  validateParams(listSchemas.params),
  validateBody(actionSchemas.reorderList),
  asyncHandler(listsController.reorder.bind(listsController))
)

/**
 * POST /api/lists/:id/archive
 * Archive a list and its children
 * Status Codes:
 *   200 - Archived successfully
 *   404 - List not found
 *   500 - Server error
 */
router.post('/:id/archive',
  validateParams(listSchemas.params),
  asyncHandler(listsController.archive.bind(listsController))
)

/**
 * POST /api/lists/:id/complete
 * Mark a list as completed
 * Status Codes:
 *   200 - Completed successfully
 *   404 - List not found
 *   500 - Server error
 */
router.post('/:id/complete',
  validateParams(listSchemas.params),
  asyncHandler(listsController.complete.bind(listsController))
)

/**
 * GET /api/lists/:id/stats
 * Get statistics for a list
 * Status Codes:
 *   200 - Success
 *   404 - List not found
 *   500 - Server error
 */
router.get('/:id/stats',
  validateParams(listSchemas.params),
  asyncHandler(listsController.getStats.bind(listsController))
)

export default router

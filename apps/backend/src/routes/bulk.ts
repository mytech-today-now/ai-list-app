import { Router } from 'express'
import { bulkController } from '../controllers/bulk'
import { validateBody, rateLimitValidation } from '../middleware/validation'
import { asyncHandler } from '../middleware/errorHandler'
import { bulkSchemas } from '../validation/schemas'

/**
 * SemanticType: BulkOperationsRouter
 * Description: Router for bulk operations with validation, rate limiting, and proper HTTP status codes
 * ExtensibleByAI: true
 * AIUseCases:
 *   - Add custom bulk route handlers
 *   - Extend validation rules
 *   - Add caching middleware
 *   - Integrate with MCP protocols
 */

const router = Router()

// Apply rate limiting to all bulk routes (more restrictive than regular routes)
router.use((req, res, next) => {
  // Custom rate limiting for bulk operations
  const bulkRateLimit = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 bulk requests per windowMs
    message: {
      success: false,
      error: 'Rate limit exceeded',
      message: 'Too many bulk operations. Please try again later.',
      retryAfter: 900 // 15 minutes in seconds
    },
    standardHeaders: true,
    legacyHeaders: false
  }
  
  // Apply the rate limit
  rateLimitValidation(req, res, next)
})

// ===== ITEM BULK OPERATIONS =====

/**
 * POST /api/bulk/items/create
 * Bulk create items
 * Status Codes:
 *   201 - All items created successfully
 *   207 - Partial success (some items created, some failed)
 *   400 - Validation error or all items failed
 *   429 - Rate limit exceeded
 *   500 - Server error
 */
router.post('/items/create',
  validateBody(bulkSchemas.bulkCreateItems),
  asyncHandler(bulkController.bulkCreateItems.bind(bulkController))
)

/**
 * PUT /api/bulk/items/update
 * Bulk update items
 * Status Codes:
 *   200 - All items updated successfully
 *   207 - Partial success (some items updated, some failed)
 *   400 - Validation error or all items failed
 *   429 - Rate limit exceeded
 *   500 - Server error
 */
router.put('/items/update',
  validateBody(bulkSchemas.bulkUpdateItems),
  asyncHandler(bulkController.bulkUpdateItems.bind(bulkController))
)

/**
 * DELETE /api/bulk/items/delete
 * Bulk delete items
 * Status Codes:
 *   200 - All items deleted successfully
 *   207 - Partial success (some items deleted, some failed)
 *   400 - Validation error or all items failed
 *   429 - Rate limit exceeded
 *   500 - Server error
 */
router.delete('/items/delete',
  validateBody(bulkSchemas.bulkDeleteItems),
  asyncHandler(bulkController.bulkDeleteItems.bind(bulkController))
)

/**
 * PATCH /api/bulk/items/status
 * Bulk update item status
 * Status Codes:
 *   200 - All items updated successfully
 *   207 - Partial success (some items updated, some failed)
 *   400 - Validation error or all items failed
 *   429 - Rate limit exceeded
 *   500 - Server error
 */
router.patch('/items/status',
  validateBody(bulkSchemas.bulkStatusItems),
  asyncHandler(bulkController.bulkUpdateItemStatus.bind(bulkController))
)

/**
 * PATCH /api/bulk/items/move
 * Bulk move items to different list
 * Status Codes:
 *   200 - All items moved successfully
 *   207 - Partial success (some items moved, some failed)
 *   400 - Validation error or all items failed
 *   429 - Rate limit exceeded
 *   500 - Server error
 */
router.patch('/items/move',
  validateBody(bulkSchemas.bulkMoveItems),
  asyncHandler(bulkController.bulkMoveItems.bind(bulkController))
)

// ===== LIST BULK OPERATIONS =====

/**
 * POST /api/bulk/lists/create
 * Bulk create lists
 * Status Codes:
 *   201 - All lists created successfully
 *   207 - Partial success (some lists created, some failed)
 *   400 - Validation error or all lists failed
 *   429 - Rate limit exceeded
 *   500 - Server error
 */
router.post('/lists/create',
  validateBody(bulkSchemas.bulkCreateLists),
  asyncHandler(bulkController.bulkCreateLists.bind(bulkController))
)

/**
 * PUT /api/bulk/lists/update
 * Bulk update lists
 * Status Codes:
 *   200 - All lists updated successfully
 *   207 - Partial success (some lists updated, some failed)
 *   400 - Validation error or all lists failed
 *   429 - Rate limit exceeded
 *   500 - Server error
 */
router.put('/lists/update',
  validateBody(bulkSchemas.bulkUpdateLists),
  asyncHandler(bulkController.bulkUpdateLists.bind(bulkController))
)

/**
 * DELETE /api/bulk/lists/delete
 * Bulk delete lists
 * Status Codes:
 *   200 - All lists deleted successfully
 *   207 - Partial success (some lists deleted, some failed)
 *   400 - Validation error or all lists failed
 *   429 - Rate limit exceeded
 *   500 - Server error
 */
router.delete('/lists/delete',
  validateBody(bulkSchemas.bulkDeleteLists),
  asyncHandler(bulkController.bulkDeleteLists.bind(bulkController))
)

/**
 * PATCH /api/bulk/lists/status
 * Bulk update list status
 * Status Codes:
 *   200 - All lists updated successfully
 *   207 - Partial success (some lists updated, some failed)
 *   400 - Validation error or all lists failed
 *   429 - Rate limit exceeded
 *   500 - Server error
 */
router.patch('/lists/status',
  validateBody(bulkSchemas.bulkStatusLists),
  asyncHandler(bulkController.bulkUpdateListStatus.bind(bulkController))
)

export default router

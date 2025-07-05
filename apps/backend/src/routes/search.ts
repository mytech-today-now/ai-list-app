import { Router } from 'express'
import { globalSearchController } from '../controllers/global-search'
import { validateQuery, rateLimitValidation } from '../middleware/validation'
import { asyncHandler } from '../middleware/errorHandler'
import { globalSearchSchema } from '../validation/schemas'
import { z } from 'zod'

/**
 * SemanticType: GlobalSearchRouter
 * Description: Global search router for cross-entity search capabilities
 * ExtensibleByAI: true
 * AIUseCases:
 *   - Add custom search endpoints
 *   - Extend search analytics
 *   - Add search personalization
 *   - Integrate with MCP protocols
 */

const router = Router()

// Apply rate limiting to all routes
router.use(rateLimitValidation)

/**
 * GET /api/search
 * Global search across multiple entity types
 * Status Codes:
 *   200 - Success
 *   400 - Invalid query parameters
 *   500 - Server error
 */
router.get('/',
  validateQuery(globalSearchSchema),
  asyncHandler(globalSearchController.search.bind(globalSearchController))
)

/**
 * GET /api/search/suggestions
 * Get search suggestions based on partial query
 * Status Codes:
 *   200 - Success
 *   400 - Invalid query parameters
 *   500 - Server error
 */
router.get('/suggestions',
  validateQuery(z.object({
    q: z.string().min(2, 'Query must be at least 2 characters'),
    types: z.array(z.enum(['lists', 'items', 'agents'])).optional().default(['lists', 'items']),
    limit: z.coerce.number().min(1).max(20).optional().default(10)
  })),
  asyncHandler(globalSearchController.suggestions.bind(globalSearchController))
)

/**
 * GET /api/search/stats
 * Get search statistics and analytics
 * Status Codes:
 *   200 - Success
 *   500 - Server error
 */
router.get('/stats',
  asyncHandler(globalSearchController.stats.bind(globalSearchController))
)

export default router

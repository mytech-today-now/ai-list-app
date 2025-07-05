import { Request, Response } from 'express'
import { BaseCRUDController } from './base'
import { globalSearchService } from '../db/services'
import { globalSearchSchema } from '../validation/schemas'

/**
 * SemanticType: GlobalSearchController
 * Description: Global search controller for searching across multiple entity types
 * ExtensibleByAI: true
 * AIUseCases:
 *   - Add cross-entity search capabilities
 *   - Extend search relevance algorithms
 *   - Add search analytics
 *   - Integrate with MCP protocols
 */

export class GlobalSearchController extends BaseCRUDController<any, any, any, any> {
  protected service = globalSearchService
  protected schemas = { query: globalSearchSchema }
  protected entityName = 'GlobalSearch'

  /**
   * Global search across multiple entity types
   */
  async search(req: Request, res: Response): Promise<void> {
    const context = this.getContext(req, 'read')

    try {
      // Validate query parameters
      const queryValidation = this.validateData(req.query, globalSearchSchema, 'query')
      if (!queryValidation.success) {
        this.handleValidationError(res, queryValidation.errors, context.correlationId)
        return
      }

      const {
        q,
        types,
        fields,
        status,
        priority,
        page,
        limit,
        sortBy,
        sortOrder,
        includeArchived
      } = queryValidation.data

      const result = await globalSearchService.globalSearch({
        query: q,
        types,
        fields,
        status,
        priority,
        page,
        limit,
        sortBy,
        sortOrder,
        includeArchived: includeArchived === 'true'
      })

      const response = this.createResponse(
        true,
        result.results,
        `Found ${result.total} results across ${types.join(', ')} for "${q}"`,
        undefined,
        context.correlationId
      )

      response.pagination = {
        page: result.page,
        limit,
        total: result.total,
        totalPages: result.totalPages
      }

      // Add search metadata
      response.metadata = {
        searchQuery: q,
        searchTypes: types,
        searchFields: fields,
        appliedFilters: {
          status: status || [],
          priority: priority || [],
          includeArchived: includeArchived === 'true'
        }
      }

      res.json(response)
    } catch (error) {
      this.handleServerError(res, error as Error, 'globalSearch', context.correlationId)
    }
  }

  /**
   * Get search suggestions based on partial query
   */
  async suggestions(req: Request, res: Response): Promise<void> {
    const context = this.getContext(req, 'read')

    try {
      const { q, types = ['lists', 'items'], limit = 10 } = req.query

      if (!q || typeof q !== 'string' || q.length < 2) {
        res.json(this.createResponse(
          true,
          [],
          'Query too short for suggestions',
          undefined,
          context.correlationId
        ))
        return
      }

      // Get suggestions by searching with a small limit
      const result = await globalSearchService.globalSearch({
        query: q as string,
        types: Array.isArray(types) ? types as string[] : [types as string],
        page: 1,
        limit: Number(limit),
        sortBy: 'relevance',
        sortOrder: 'desc'
      })

      // Format suggestions
      const suggestions = result.results.map(item => ({
        id: item.id,
        type: item.type,
        title: item.title,
        description: item.description,
        relevanceScore: item.relevanceScore
      }))

      res.json(this.createResponse(
        true,
        suggestions,
        `Found ${suggestions.length} suggestions for "${q}"`,
        undefined,
        context.correlationId
      ))
    } catch (error) {
      this.handleServerError(res, error as Error, 'suggestions', context.correlationId)
    }
  }

  /**
   * Get search statistics and analytics
   */
  async stats(req: Request, res: Response): Promise<void> {
    const context = this.getContext(req, 'read')

    try {
      // This would typically come from a search analytics service
      // For now, return basic stats
      const stats = {
        totalSearchableItems: 0, // Would be calculated from all entities
        searchableTypes: ['lists', 'items', 'agents'],
        averageResultsPerSearch: 0,
        mostSearchedTerms: [],
        searchPerformance: {
          averageResponseTime: 0,
          cacheHitRate: 0
        }
      }

      res.json(this.createResponse(
        true,
        stats,
        'Search statistics retrieved',
        undefined,
        context.correlationId
      ))
    } catch (error) {
      this.handleServerError(res, error as Error, 'stats', context.correlationId)
    }
  }
}

export const globalSearchController = new GlobalSearchController()

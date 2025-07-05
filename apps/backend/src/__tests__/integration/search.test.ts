import request from 'supertest'
import express from 'express'
import { randomUUID } from 'crypto'
import searchRouter from '../../routes/search'
import { globalSearchService } from '../../db/services'

// Mock the database services
jest.mock('../../db/services', () => ({
  globalSearchService: {
    globalSearch: jest.fn()
  }
}))

const app = express()
app.use(express.json())

// Add required middleware
app.use((req, res, next) => {
  req.headers['x-user-id'] = 'test-user'
  req.headers['x-agent-id'] = 'test-agent'
  req.headers['x-correlation-id'] = randomUUID()
  next()
})

app.use('/api/search', searchRouter)

describe('Search API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/search', () => {
    it('should perform global search successfully', async () => {
      const mockResults = {
        results: [
          {
            type: 'list',
            id: 'list-1',
            title: 'Urgent Tasks',
            description: 'High priority items',
            status: 'active',
            priority: 'high',
            relevanceScore: 95,
            metadata: { createdAt: new Date(), updatedAt: new Date() }
          },
          {
            type: 'item',
            id: 'item-1',
            title: 'Urgent Bug Fix',
            description: 'Critical bug needs fixing',
            status: 'pending',
            priority: 'urgent',
            relevanceScore: 90,
            metadata: { listId: 'list-1', createdAt: new Date(), updatedAt: new Date() }
          }
        ],
        total: 2,
        page: 1,
        totalPages: 1
      }

      ;(globalSearchService.globalSearch as jest.Mock).mockResolvedValue(mockResults)

      const response = await request(app)
        .get('/api/search')
        .query({
          q: 'urgent',
          types: 'lists,items',
          priority: 'high,urgent',
          limit: 10
        })
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        data: mockResults.results,
        message: expect.stringContaining('Found 2 results'),
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1
        },
        metadata: {
          searchQuery: 'urgent',
          searchTypes: ['lists', 'items'],
          appliedFilters: {
            priority: ['high', 'urgent'],
            includeArchived: false
          }
        },
        correlationId: expect.any(String),
        timestamp: expect.any(String)
      })

      expect(globalSearchService.globalSearch).toHaveBeenCalledWith({
        query: 'urgent',
        types: ['lists', 'items'],
        fields: ['title', 'description', 'name'],
        status: undefined,
        priority: ['high', 'urgent'],
        page: 1,
        limit: 10,
        sortBy: 'relevance',
        sortOrder: 'desc',
        includeArchived: false
      })
    })

    it('should handle search with default parameters', async () => {
      const mockResults = {
        results: [],
        total: 0,
        page: 1,
        totalPages: 0
      }

      ;(globalSearchService.globalSearch as jest.Mock).mockResolvedValue(mockResults)

      const response = await request(app)
        .get('/api/search')
        .query({ q: 'test' })
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0
        }
      })

      expect(globalSearchService.globalSearch).toHaveBeenCalledWith({
        query: 'test',
        types: ['lists', 'items'],
        fields: ['title', 'description', 'name'],
        status: undefined,
        priority: undefined,
        page: 1,
        limit: 20,
        sortBy: 'relevance',
        sortOrder: 'desc',
        includeArchived: false
      })
    })

    it('should validate required query parameter', async () => {
      const response = await request(app)
        .get('/api/search')
        .expect(400)

      expect(response.body).toMatchObject({
        success: false,
        error: 'Validation failed',
        message: 'Invalid query parameters',
        correlationId: expect.any(String)
      })
    })

    it('should validate query parameter length', async () => {
      const response = await request(app)
        .get('/api/search')
        .query({ q: '' })
        .expect(400)

      expect(response.body).toMatchObject({
        success: false,
        error: 'Validation failed',
        message: 'Invalid query parameters'
      })
    })

    it('should handle database errors', async () => {
      ;(globalSearchService.globalSearch as jest.Mock).mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .get('/api/search')
        .query({ q: 'test' })
        .expect(500)

      expect(response.body).toMatchObject({
        success: false,
        error: 'Internal server error',
        message: 'Failed to globalSearch GlobalSearch',
        correlationId: expect.any(String)
      })
    })
  })

  describe('GET /api/search/suggestions', () => {
    it('should return search suggestions', async () => {
      const mockResults = {
        results: [
          {
            type: 'list',
            id: 'list-1',
            title: 'Test List',
            description: 'Test description',
            relevanceScore: 80
          }
        ],
        total: 1,
        page: 1,
        totalPages: 1
      }

      ;(globalSearchService.globalSearch as jest.Mock).mockResolvedValue(mockResults)

      const response = await request(app)
        .get('/api/search/suggestions')
        .query({ q: 'te', limit: 5 })
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        data: [
          {
            id: 'list-1',
            type: 'list',
            title: 'Test List',
            description: 'Test description',
            relevanceScore: 80
          }
        ],
        message: expect.stringContaining('Found 1 suggestions for "te"')
      })
    })

    it('should handle short queries', async () => {
      const response = await request(app)
        .get('/api/search/suggestions')
        .query({ q: 'a' })
        .expect(400)

      expect(response.body).toMatchObject({
        success: false,
        error: 'Validation failed'
      })
    })
  })

  describe('GET /api/search/stats', () => {
    it('should return search statistics', async () => {
      const response = await request(app)
        .get('/api/search/stats')
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        data: {
          totalSearchableItems: expect.any(Number),
          searchableTypes: ['lists', 'items', 'agents'],
          averageResultsPerSearch: expect.any(Number),
          mostSearchedTerms: expect.any(Array),
          searchPerformance: {
            averageResponseTime: expect.any(Number),
            cacheHitRate: expect.any(Number)
          }
        },
        message: 'Search statistics retrieved'
      })
    })
  })
})

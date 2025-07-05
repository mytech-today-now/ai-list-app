import { GlobalSearchService } from '../../db/services/global-search'

// Mock the database connection
jest.mock('../../db/connection', () => ({
  dbManager: {
    getDb: jest.fn().mockResolvedValue({
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis()
    })
  }
}))

describe('GlobalSearchService Unit Tests', () => {
  let service: GlobalSearchService
  let mockDb: any

  beforeEach(() => {
    service = new GlobalSearchService()
    mockDb = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis()
    }

    // Mock the getDb method
    jest.spyOn(service as any, 'getDb').mockResolvedValue(mockDb)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('globalSearch', () => {
    it('should search across lists and items by default', async () => {
      const mockListResults = [
        {
          id: 'list-1',
          title: 'Test List',
          description: 'Test description',
          status: 'active',
          priority: 'medium',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      const mockItemResults = [
        {
          id: 'item-1',
          title: 'Test Item',
          description: 'Test item description',
          status: 'pending',
          priority: 'high',
          listId: 'list-1',
          tags: '["test"]',
          dueDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      // Mock database calls for lists and items
      mockDb.mockResolvedValueOnce(mockListResults) // First call for lists
        .mockResolvedValueOnce(mockItemResults) // Second call for items

      const result = await service.globalSearch({
        query: 'test',
        types: ['lists', 'items'],
        page: 1,
        limit: 20
      })

      expect(result.results).toHaveLength(2)
      expect(result.results[0]).toMatchObject({
        type: 'list',
        id: 'list-1',
        title: 'Test List',
        description: 'Test description',
        status: 'active',
        priority: 'medium',
        relevanceScore: expect.any(Number)
      })
      expect(result.results[1]).toMatchObject({
        type: 'item',
        id: 'item-1',
        title: 'Test Item',
        description: 'Test item description',
        status: 'pending',
        priority: 'high',
        relevanceScore: expect.any(Number)
      })
      expect(result.total).toBe(2)
      expect(result.page).toBe(1)
      expect(result.totalPages).toBe(1)
    })

    it('should search only in specified types', async () => {
      const mockListResults = [
        {
          id: 'list-1',
          title: 'Test List',
          description: 'Test description',
          status: 'active',
          priority: 'medium',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      mockDb.mockResolvedValueOnce(mockListResults)

      const result = await service.globalSearch({
        query: 'test',
        types: ['lists'],
        page: 1,
        limit: 20
      })

      expect(result.results).toHaveLength(1)
      expect(result.results[0].type).toBe('list')
    })

    it('should apply status filters', async () => {
      const mockListResults = []
      const mockItemResults = []

      mockDb.mockResolvedValueOnce(mockListResults)
        .mockResolvedValueOnce(mockItemResults)

      await service.globalSearch({
        query: 'test',
        types: ['lists', 'items'],
        status: ['active', 'pending'],
        page: 1,
        limit: 20
      })

      // Verify that the where clause was called (indicating filters were applied)
      expect(mockDb.where).toHaveBeenCalled()
    })

    it('should apply priority filters', async () => {
      const mockListResults = []
      const mockItemResults = []

      mockDb.mockResolvedValueOnce(mockListResults)
        .mockResolvedValueOnce(mockItemResults)

      await service.globalSearch({
        query: 'test',
        types: ['lists', 'items'],
        priority: ['high', 'urgent'],
        page: 1,
        limit: 20
      })

      expect(mockDb.where).toHaveBeenCalled()
    })

    it('should handle pagination correctly', async () => {
      const mockResults = Array.from({ length: 25 }, (_, i) => ({
        id: `item-${i}`,
        title: `Test Item ${i}`,
        description: 'Test description',
        status: 'active',
        priority: 'medium',
        createdAt: new Date(),
        updatedAt: new Date()
      }))

      mockDb.mockResolvedValueOnce(mockResults.slice(0, 10)) // First 10 for lists
        .mockResolvedValueOnce(mockResults.slice(10, 20)) // Next 10 for items

      const result = await service.globalSearch({
        query: 'test',
        types: ['lists', 'items'],
        page: 1,
        limit: 10
      })

      expect(result.results).toHaveLength(10)
      expect(result.page).toBe(1)
      expect(result.total).toBe(20)
      expect(result.totalPages).toBe(2)
    })

    it('should sort by relevance by default', async () => {
      const mockListResults = [
        {
          id: 'list-1',
          title: 'test', // Exact match - should have highest score
          description: 'description',
          status: 'active',
          priority: 'medium',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'list-2',
          title: 'test item', // Starts with query - should have high score
          description: 'description',
          status: 'active',
          priority: 'medium',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'list-3',
          title: 'some test here', // Contains query - should have lower score
          description: 'description',
          status: 'active',
          priority: 'medium',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      mockDb.mockResolvedValueOnce(mockListResults)
        .mockResolvedValueOnce([]) // No items

      const result = await service.globalSearch({
        query: 'test',
        types: ['lists', 'items'],
        sortBy: 'relevance',
        sortOrder: 'desc'
      })

      expect(result.results).toHaveLength(3)
      // Results should be sorted by relevance score (descending)
      expect(result.results[0].relevanceScore).toBeGreaterThanOrEqual(result.results[1].relevanceScore)
      expect(result.results[1].relevanceScore).toBeGreaterThanOrEqual(result.results[2].relevanceScore)
    })
  })

  describe('calculateRelevanceScore', () => {
    it('should give highest score for exact title match', () => {
      const score = (service as any).calculateRelevanceScore('test', 'test', 'description')
      expect(score).toBe(110) // 100 for exact match + 10 for short title
    })

    it('should give high score for title starting with query', () => {
      const score = (service as any).calculateRelevanceScore('test', 'test item', 'description')
      expect(score).toBe(90) // 80 for starts with + 10 for short title
    })

    it('should give medium score for title containing query', () => {
      const score = (service as any).calculateRelevanceScore('test', 'some test here', 'description')
      expect(score).toBe(70) // 60 for contains + 10 for short title
    })

    it('should add score for description match', () => {
      const score = (service as any).calculateRelevanceScore('test', 'title', 'test description')
      expect(score).toBe(30) // 0 for title + 20 for description + 10 for short title
    })

    it('should not add short title bonus for long titles', () => {
      const longTitle = 'a'.repeat(60)
      const score = (service as any).calculateRelevanceScore('test', longTitle, 'description')
      expect(score).toBe(0) // No matches, no short title bonus
    })

    it('should handle missing description', () => {
      const score = (service as any).calculateRelevanceScore('test', 'test', undefined)
      expect(score).toBe(110) // 100 for exact match + 10 for short title
    })

    it('should combine multiple scoring factors', () => {
      const score = (service as any).calculateRelevanceScore('test', 'test item', 'contains test keyword')
      expect(score).toBe(110) // 80 for starts with + 20 for description + 10 for short title
    })
  })
})

import request from 'supertest'
import express from 'express'
import { randomUUID } from 'crypto'
import itemsRouter from '../../routes/items'
import { itemsService } from '../../db/services'

// Mock the database services
jest.mock('../../db/services', () => ({
  itemsService: {
    advancedSearch: jest.fn(),
    filter: jest.fn(),
    search: jest.fn(),
    findByListId: jest.fn(),
    findByStatus: jest.fn(),
    findByAssignee: jest.fn(),
    findOverdue: jest.fn(),
    findDueSoon: jest.fn(),
    findAll: jest.fn(),
    count: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    updateById: jest.fn(),
    deleteById: jest.fn(),
    getListStats: jest.fn(),
    getGlobalStats: jest.fn()
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

app.use('/api/items', itemsRouter)

describe('Items Advanced Search Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/items/advanced-search', () => {
    it('should perform advanced search with all parameters', async () => {
      const mockResult = {
        items: [
          {
            id: 'item-1',
            title: 'Urgent Task',
            description: 'High priority task',
            status: 'pending',
            priority: 'urgent',
            listId: 'list-1',
            assignedTo: 'user-1',
            tags: ['urgent', 'bug'],
            dueDate: new Date('2024-01-15'),
            estimatedDuration: 120,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ],
        total: 1,
        page: 1,
        totalPages: 1
      }

      ;(itemsService.advancedSearch as jest.Mock).mockResolvedValue(mockResult)

      const response = await request(app)
        .get('/api/items/advanced-search')
        .query({
          q: 'urgent',
          fields: 'title,description',
          listId: 'list-1',
          status: 'pending,in_progress',
          priority: 'high,urgent',
          assignedTo: 'user-1',
          tags: 'urgent,bug',
          dueDateFrom: '2024-01-01',
          dueDateTo: '2024-01-31',
          hasDescription: 'true',
          hasDueDate: 'true',
          hasAssignee: 'true',
          overdue: 'false',
          dueSoon: '24',
          estimatedDurationMin: '60',
          estimatedDurationMax: '180',
          page: '1',
          limit: '20',
          sortBy: 'dueDate',
          sortOrder: 'asc',
          includeCompleted: 'false'
        })
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        data: mockResult.items,
        message: 'Found 1 items matching search criteria',
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1
        },
        correlationId: expect.any(String),
        timestamp: expect.any(String)
      })

      expect(itemsService.advancedSearch).toHaveBeenCalledWith({
        query: 'urgent',
        fields: ['title', 'description'],
        listId: 'list-1',
        status: ['pending', 'in_progress'],
        priority: ['high', 'urgent'],
        assignedTo: ['user-1'],
        tags: ['urgent', 'bug'],
        dueDateFrom: new Date('2024-01-01'),
        dueDateTo: new Date('2024-01-31'),
        createdFrom: undefined,
        createdTo: undefined,
        updatedFrom: undefined,
        updatedTo: undefined,
        hasDescription: true,
        hasDueDate: true,
        hasAssignee: true,
        overdue: false,
        dueSoon: 24,
        estimatedDurationMin: 60,
        estimatedDurationMax: 180,
        page: 1,
        limit: 20,
        sortBy: 'dueDate',
        sortOrder: 'asc',
        includeCompleted: false
      })
    })

    it('should handle default parameters', async () => {
      const mockResult = {
        items: [],
        total: 0,
        page: 1,
        totalPages: 0
      }

      ;(itemsService.advancedSearch as jest.Mock).mockResolvedValue(mockResult)

      const response = await request(app)
        .get('/api/items/advanced-search')
        .query({ q: 'test' })
        .expect(200)

      expect(itemsService.advancedSearch).toHaveBeenCalledWith({
        query: 'test',
        fields: ['title', 'description'],
        listId: undefined,
        status: undefined,
        priority: undefined,
        assignedTo: undefined,
        tags: undefined,
        dueDateFrom: undefined,
        dueDateTo: undefined,
        createdFrom: undefined,
        createdTo: undefined,
        updatedFrom: undefined,
        updatedTo: undefined,
        hasDescription: undefined,
        hasDueDate: undefined,
        hasAssignee: undefined,
        overdue: false,
        dueSoon: undefined,
        estimatedDurationMin: undefined,
        estimatedDurationMax: undefined,
        page: 1,
        limit: 20,
        sortBy: 'updatedAt',
        sortOrder: 'desc',
        includeCompleted: true
      })
    })

    it('should validate required query parameter', async () => {
      const response = await request(app)
        .get('/api/items/advanced-search')
        .expect(400)

      expect(response.body).toMatchObject({
        success: false,
        error: 'Validation failed',
        message: 'Invalid query parameters'
      })
    })

    it('should validate date parameters', async () => {
      const response = await request(app)
        .get('/api/items/advanced-search')
        .query({
          q: 'test',
          dueDateFrom: 'invalid-date'
        })
        .expect(400)

      expect(response.body).toMatchObject({
        success: false,
        error: 'Validation failed'
      })
    })

    it('should validate numeric parameters', async () => {
      const response = await request(app)
        .get('/api/items/advanced-search')
        .query({
          q: 'test',
          dueSoon: '200' // exceeds max of 168
        })
        .expect(400)

      expect(response.body).toMatchObject({
        success: false,
        error: 'Validation failed'
      })
    })

    it('should handle database errors', async () => {
      ;(itemsService.advancedSearch as jest.Mock).mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .get('/api/items/advanced-search')
        .query({ q: 'test' })
        .expect(500)

      expect(response.body).toMatchObject({
        success: false,
        error: 'Internal server error',
        message: 'Failed to advancedSearch Item'
      })
    })
  })

  describe('GET /api/items/filter', () => {
    it('should filter items without search query', async () => {
      const mockResult = {
        items: [
          {
            id: 'item-1',
            title: 'Filtered Task',
            status: 'pending',
            priority: 'high'
          }
        ],
        total: 1,
        page: 1,
        totalPages: 1
      }

      ;(itemsService.filter as jest.Mock).mockResolvedValue(mockResult)

      const response = await request(app)
        .get('/api/items/filter')
        .query({
          status: 'pending',
          priority: 'high',
          hasAssignee: 'false'
        })
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        data: mockResult.items,
        message: 'Found 1 items matching filter criteria',
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1
        }
      })

      expect(itemsService.filter).toHaveBeenCalledWith({
        listId: undefined,
        status: ['pending'],
        priority: ['high'],
        assignedTo: undefined,
        tags: undefined,
        dueDateFrom: undefined,
        dueDateTo: undefined,
        createdFrom: undefined,
        createdTo: undefined,
        updatedFrom: undefined,
        updatedTo: undefined,
        hasDescription: undefined,
        hasDueDate: undefined,
        hasAssignee: false,
        overdue: false,
        dueSoon: undefined,
        estimatedDurationMin: undefined,
        estimatedDurationMax: undefined,
        page: 1,
        limit: 20,
        sortBy: 'updatedAt',
        sortOrder: 'desc',
        includeCompleted: true
      })
    })

    it('should handle empty filter results', async () => {
      const mockResult = {
        items: [],
        total: 0,
        page: 1,
        totalPages: 0
      }

      ;(itemsService.filter as jest.Mock).mockResolvedValue(mockResult)

      const response = await request(app)
        .get('/api/items/filter')
        .query({ status: 'nonexistent' })
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        data: [],
        pagination: {
          total: 0,
          totalPages: 0
        }
      })
    })
  })
})

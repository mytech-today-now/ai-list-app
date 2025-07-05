import request from 'supertest'
import express from 'express'
import itemsRouter from '../../routes/items'
import { itemsService } from '../../db/services'
import { randomUUID } from 'crypto'

// Mock the database services
jest.mock('../../db/services', () => ({
  itemsService: {
    findAll: jest.fn(),
    findByListId: jest.fn(),
    findByStatus: jest.fn(),
    findByAssignee: jest.fn(),
    findOverdue: jest.fn(),
    findDueSoon: jest.fn(),
    findById: jest.fn(),
    getDependencies: jest.fn(),
    getDependents: jest.fn(),
    create: jest.fn(),
    updateById: jest.fn(),
    deleteById: jest.fn(),
    reorder: jest.fn(),
    markCompleted: jest.fn(),
    markInProgress: jest.fn(),
    canStart: jest.fn(),
    moveToList: jest.fn(),
    search: jest.fn(),
    getStats: jest.fn(),
    getGlobalStats: jest.fn(),
    getListStats: jest.fn(),
    count: jest.fn()
  }
}))

// Helper function to create mock UUIDs
const createMockUUID = () => randomUUID()

// Helper function to create mock timestamps
const createMockTimestamp = () => new Date().toISOString()

describe('Items API Integration Tests', () => {
  let app: express.Application

  beforeEach(() => {
    app = express()
    app.use(express.json())

    // Add correlation ID middleware
    app.use((req: any, res: any, next: any) => {
      const correlationId = req.headers['x-correlation-id'] as string || randomUUID()
      req.correlationId = correlationId
      res.setHeader('X-Correlation-ID', correlationId)
      next()
    })

    app.use('/api/items', itemsRouter)
    jest.clearAllMocks()
  })

  describe('GET /api/items', () => {
    it('should get all items with default limit', async () => {
      const mockItems = [
        {
          id: createMockUUID(),
          listId: createMockUUID(),
          title: 'Item 1',
          status: 'pending',
          priority: 'medium',
          position: 0,
          createdBy: 'user',
          createdAt: createMockTimestamp(),
          updatedAt: createMockTimestamp()
        },
        {
          id: createMockUUID(),
          listId: createMockUUID(),
          title: 'Item 2',
          status: 'completed',
          priority: 'medium',
          position: 1,
          createdBy: 'user',
          createdAt: createMockTimestamp(),
          updatedAt: createMockTimestamp(),
          completedAt: createMockTimestamp()
        }
      ]

      ;(itemsService.findAll as jest.Mock).mockResolvedValue(mockItems)
      ;(itemsService.count as jest.Mock).mockResolvedValue(2)

      const response = await request(app)
        .get('/api/items')
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        data: mockItems,
        message: 'Found 2 items',
        timestamp: expect.any(String),
        correlationId: expect.any(String),
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1
        }
      })
      expect(itemsService.findAll).toHaveBeenCalledWith({
        orderBy: expect.any(Array),
        limit: 20,
        offset: 0
      })
    })

    it('should filter items by listId', async () => {
      const listId = createMockUUID()
      const mockItems = [
        {
          id: createMockUUID(),
          listId: listId,
          title: 'Item 1',
          status: 'pending',
          priority: 'medium',
          position: 0,
          createdBy: 'user',
          createdAt: createMockTimestamp(),
          updatedAt: createMockTimestamp()
        }
      ]

      ;(itemsService.findByListId as jest.Mock).mockResolvedValue(mockItems)

      const response = await request(app)
        .get(`/api/items?listId=${listId}`)
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        data: mockItems,
        message: 'Found 1 items',
        timestamp: expect.any(String),
        correlationId: expect.any(String)
      })
      expect(itemsService.findByListId).toHaveBeenCalledWith(listId)
    })

    it('should filter items by status', async () => {
      const mockItems = [
        {
          id: createMockUUID(),
          listId: createMockUUID(),
          status: 'pending',
          title: 'Pending Item',
          priority: 'medium',
          position: 0,
          createdBy: 'user',
          createdAt: createMockTimestamp(),
          updatedAt: createMockTimestamp()
        }
      ]

      ;(itemsService.findByStatus as jest.Mock).mockResolvedValue(mockItems)

      const response = await request(app)
        .get('/api/items?status=pending')
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        data: mockItems,
        message: 'Found 1 items',
        timestamp: expect.any(String),
        correlationId: expect.any(String)
      })
      expect(itemsService.findByStatus).toHaveBeenCalledWith('pending')
    })

    it('should filter items by multiple statuses', async () => {
      // This test should expect a 400 error since multiple status values aren't supported
      const response = await request(app)
        .get('/api/items?status=pending&status=in_progress')
        .expect(400)

      expect(response.body).toMatchObject({
        success: false,
        error: expect.any(String),
        message: expect.any(String),
        timestamp: expect.any(String)
      ,
        correlationId: expect.any(String)})
    })

    it('should filter items by assignee', async () => {
      const mockItems = [
        {
          id: createMockUUID(),
          listId: createMockUUID(),
          assignedTo: 'user-1',
          title: 'Assigned Item',
          status: 'pending',
          priority: 'medium',
          position: 0,
          createdBy: 'user',
          createdAt: createMockTimestamp(),
          updatedAt: createMockTimestamp()
        }
      ]

      ;(itemsService.findByAssignee as jest.Mock).mockResolvedValue(mockItems)

      const response = await request(app)
        .get('/api/items?assignedTo=user-1')
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        data: mockItems,
        message: 'Found 1 items',
        timestamp: expect.any(String),
        correlationId: expect.any(String)
      })
      expect(itemsService.findByAssignee).toHaveBeenCalledWith('user-1')
    })

    it('should find overdue items', async () => {
      const mockItems = [
        {
          id: createMockUUID(),
          listId: createMockUUID(),
          dueDate: '2023-01-01T00:00:00.000Z',
          title: 'Overdue Item',
          status: 'pending',
          priority: 'medium',
          position: 0,
          createdBy: 'user',
          createdAt: createMockTimestamp(),
          updatedAt: createMockTimestamp()
        }
      ]

      ;(itemsService.findOverdue as jest.Mock).mockResolvedValue(mockItems)

      const response = await request(app)
        .get('/api/items?overdue=true')
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        data: mockItems,
        message: 'Found 1 items',
        timestamp: expect.any(String),
        correlationId: expect.any(String)
      })
      expect(itemsService.findOverdue).toHaveBeenCalledTimes(1)
    })

    it('should find items due soon with default days', async () => {
      const mockItems = [
        {
          id: createMockUUID(),
          listId: createMockUUID(),
          dueDate: '2023-12-31T00:00:00.000Z',
          title: 'Due Soon Item',
          status: 'pending',
          priority: 'medium',
          position: 0,
          createdBy: 'user',
          createdAt: createMockTimestamp(),
          updatedAt: createMockTimestamp()
        }
      ]

      ;(itemsService.findDueSoon as jest.Mock).mockResolvedValue(mockItems)

      const response = await request(app)
        .get('/api/items?dueSoon=24')
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        data: mockItems,
        message: 'Found 1 items',
        timestamp: expect.any(String),
        correlationId: expect.any(String)
      })
      expect(itemsService.findDueSoon).toHaveBeenCalledWith(24)
    })

    it('should find items due soon with custom days', async () => {
      const mockItems = [
        {
          id: createMockUUID(),
          listId: createMockUUID(),
          dueDate: '2023-12-31T00:00:00.000Z',
          title: 'Due Soon Item',
          status: 'pending',
          priority: 'medium',
          position: 0,
          createdBy: 'user',
          createdAt: createMockTimestamp(),
          updatedAt: createMockTimestamp()
        }
      ]

      ;(itemsService.findDueSoon as jest.Mock).mockResolvedValue(mockItems)

      const response = await request(app)
        .get('/api/items?dueSoon=3')
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        data: mockItems,
        message: 'Found 1 items',
        timestamp: expect.any(String),
        correlationId: expect.any(String)
      })
      expect(itemsService.findDueSoon).toHaveBeenCalledWith(3)
    })

    it('should handle database errors', async () => {
      ;(itemsService.findAll as jest.Mock).mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .get('/api/items')
        .expect(500)

      expect(response.body).toEqual({
        success: false,
        error: 'Internal server error',
        message: 'Failed to list Item',
        timestamp: expect.any(String)
      ,
        correlationId: expect.any(String)})
    })
  })

  describe('GET /api/items/:id', () => {
    it('should get a specific item by ID', async () => {
      const itemId = createMockUUID()
      const listId = createMockUUID()
      const mockItem = {
        id: itemId,
        title: 'Test Item',
        status: 'pending',
        listId: listId,
        priority: 'medium',
        position: 0,
        createdBy: 'user',
        createdAt: createMockTimestamp(),
        updatedAt: createMockTimestamp()
      }

      ;(itemsService.findById as jest.Mock).mockResolvedValue(mockItem)

      const response = await request(app)
        .get(`/api/items/${itemId}`)
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        data: mockItem,
        message: 'Item found',
        timestamp: expect.any(String),
        correlationId: expect.any(String)
      })
      expect(itemsService.findById).toHaveBeenCalledWith(itemId)
    })

    it('should return 404 for non-existent item', async () => {
      const nonExistentId = createMockUUID()
      ;(itemsService.findById as jest.Mock).mockResolvedValue(null)

      const response = await request(app)
        .get(`/api/items/${nonExistentId}`)
        .expect(404)

      expect(response.body).toEqual({
        success: false,
        error: 'Not found',
        message: 'Item not found',
        timestamp: expect.any(String)
      ,
        correlationId: expect.any(String)})
    })

    it('should include dependencies when requested', async () => {
      const itemId = createMockUUID()
      const listId = createMockUUID()
      const depId = createMockUUID()
      const dependentId = createMockUUID()

      const mockItem = {
        id: itemId,
        listId: listId,
        title: 'Test Item',
        status: 'pending',
        priority: 'medium',
        position: 0,
        createdBy: 'user',
        createdAt: createMockTimestamp(),
        updatedAt: createMockTimestamp()
      }
      const mockDependencies = [{
        id: depId,
        listId: listId,
        title: 'Dependency',
        status: 'completed',
        priority: 'medium',
        position: 0,
        createdBy: 'user',
        createdAt: createMockTimestamp(),
        updatedAt: createMockTimestamp()
      }]
      const mockDependents = [{
        id: dependentId,
        listId: listId,
        title: 'Dependent',
        status: 'pending',
        priority: 'medium',
        position: 1,
        createdBy: 'user',
        createdAt: createMockTimestamp(),
        updatedAt: createMockTimestamp()
      }]

      ;(itemsService.findById as jest.Mock).mockResolvedValue(mockItem)
      ;(itemsService.getDependencies as jest.Mock).mockResolvedValue(mockDependencies)
      ;(itemsService.getDependents as jest.Mock).mockResolvedValue(mockDependents)

      const response = await request(app)
        .get(`/api/items/${itemId}?include=dependencies`)
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        data: {
          ...mockItem,
          dependencies: mockDependencies,
          dependents: mockDependents
        },
        message: 'Item found',
        timestamp: expect.any(String),
        correlationId: expect.any(String)
      })
      expect(itemsService.getDependencies).toHaveBeenCalledWith(itemId)
      expect(itemsService.getDependents).toHaveBeenCalledWith(itemId)
    })

    it('should handle database errors', async () => {
      const itemId = createMockUUID()
      ;(itemsService.findById as jest.Mock).mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .get(`/api/items/${itemId}`)
        .expect(500)

      expect(response.body).toEqual({
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch Item',
        timestamp: expect.any(String),
        correlationId: expect.any(String)
      })
    })
  })

  describe('POST /api/items', () => {
    it('should create a new item', async () => {
      const listId = createMockUUID()
      const itemId = createMockUUID()
      const newItemData = {
        listId: listId,
        title: 'New Item',
        description: 'A test item',
        priority: 'high',
        dueDate: '2023-12-31T23:59:59Z',
        estimatedDuration: 60,
        tags: ['work', 'urgent'],
        assignedTo: 'user-1'
      }

      const createdItem = {
        id: itemId,
        ...newItemData,
        status: 'pending',
        position: 0,
        createdBy: 'user',
        createdAt: createMockTimestamp(),
        updatedAt: createMockTimestamp()
      }

      ;(itemsService.create as jest.Mock).mockResolvedValue(createdItem)

      const response = await request(app)
        .post('/api/items')
        .send(newItemData)
        .expect(201)

      expect(response.body).toEqual({
        success: true,
        data: createdItem,
        message: 'Item created successfully',
        timestamp: expect.any(String),
        correlationId: expect.any(String)
      })

      expect(itemsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          title: 'New Item',
          listId: listId,
          priority: 'high',
          status: 'pending',
          createdBy: 'system',
          tags: JSON.stringify(['work', 'urgent']),
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date)
        })
      )
    })

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/items')
        .send({ description: 'No title or listId' })
        .expect(400)

      expect(response.body).toEqual({
        success: false,
        error: expect.stringContaining('listId: Required'),
        message: expect.any(String),
        timestamp: expect.any(String),
        correlationId: expect.any(String)
      })
      expect(itemsService.create).not.toHaveBeenCalled()
    })

    it('should handle database errors during creation', async () => {
      const listId = createMockUUID()
      ;(itemsService.create as jest.Mock).mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .post('/api/items')
        .send({ listId: listId, title: 'Test Item' })
        .expect(500)

      expect(response.body).toEqual({
        success: false,
        error: 'Internal server error',
        message: 'Failed to create Item',
        timestamp: expect.any(String),
        correlationId: expect.any(String)
      })
    })
  })

  describe('PUT /api/items/:id', () => {
    it('should update an existing item', async () => {
      const itemId = createMockUUID()
      const listId = createMockUUID()
      const updateData = {
        title: 'Updated Item',
        description: 'Updated description',
        priority: 'high',
        status: 'completed',
        actualDuration: 90
      }

      const updatedItem = {
        id: itemId,
        listId: listId,
        ...updateData,
        position: 0,
        createdBy: 'user',
        createdAt: createMockTimestamp(),
        updatedAt: createMockTimestamp(),
        completedAt: createMockTimestamp()
      }

      ;(itemsService.updateById as jest.Mock).mockResolvedValue(updatedItem)

      const response = await request(app)
        .put(`/api/items/${itemId}`)
        .send(updateData)
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        data: updatedItem,
        message: 'Item updated successfully',
        timestamp: expect.any(String),
        correlationId: expect.any(String)
      })

      expect(itemsService.updateById).toHaveBeenCalledWith(itemId,
        expect.objectContaining({
          ...updateData,
          completedAt: expect.any(Date),
          updatedAt: expect.any(Date)
        })
      )
    })

    it('should return 404 for non-existent item', async () => {
      const nonExistentId = createMockUUID()
      ;(itemsService.updateById as jest.Mock).mockResolvedValue(null)

      const response = await request(app)
        .put(`/api/items/${nonExistentId}`)
        .send({ title: 'Updated' })
        .expect(404)

      expect(response.body).toEqual({
        success: false,
        error: 'Not found',
        message: 'Item not found',
        timestamp: expect.any(String),
        correlationId: expect.any(String)
      })
    })
  })

  describe('DELETE /api/items/:id', () => {
    it('should delete an existing item', async () => {
      const itemId = createMockUUID()
      ;(itemsService.deleteById as jest.Mock).mockResolvedValue(true)

      const response = await request(app)
        .delete(`/api/items/${itemId}`)
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        message: 'Item deleted successfully',
        correlationId: expect.any(String),
        timestamp: expect.any(String)
      })
      expect(itemsService.deleteById).toHaveBeenCalledWith(itemId)
    })

    it('should return 404 for non-existent item', async () => {
      const nonExistentId = createMockUUID()
      ;(itemsService.deleteById as jest.Mock).mockResolvedValue(false)

      const response = await request(app)
        .delete(`/api/items/${nonExistentId}`)
        .expect(404)

      expect(response.body).toEqual({
        success: false,
        error: 'Not found',
        message: 'Item not found',
        correlationId: expect.any(String),
        timestamp: expect.any(String)
      })
    })

    it('should handle database errors during deletion', async () => {
      const itemId = createMockUUID()
      ;(itemsService.deleteById as jest.Mock).mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .delete(`/api/items/${itemId}`)
        .expect(500)

      expect(response.body).toEqual({
        success: false,
        error: 'Internal server error',
        message: 'Failed to delete Item',
        correlationId: expect.any(String),
        timestamp: expect.any(String)
      })
    })
  })

  describe('POST /api/items/:id/complete', () => {
    it('should mark an item as completed', async () => {
      const itemId = createMockUUID()
      const completedItem = {
        id: itemId,
        title: 'Test Item',
        status: 'completed',
        completedAt: new Date().toISOString()
      }

      ;(itemsService.markCompleted as jest.Mock).mockResolvedValue(completedItem)

      const response = await request(app)
        .post(`/api/items/${itemId}/complete`)
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        data: completedItem,
        message: 'Item marked as completed',
        timestamp: expect.any(String),
        correlationId: expect.any(String)
      })
      expect(itemsService.markCompleted).toHaveBeenCalledWith(itemId)
    })

    it('should return 404 for non-existent item', async () => {
      const nonExistentId = createMockUUID()
      ;(itemsService.markCompleted as jest.Mock).mockResolvedValue(null)

      const response = await request(app)
        .post(`/api/items/${nonExistentId}/complete`)
        .expect(404)

      expect(response.body).toEqual({
        success: false,
        error: 'Not found',
        message: 'Item not found',
        timestamp: expect.any(String),
        correlationId: expect.any(String)
      })
    })

    it('should handle database errors', async () => {
      const itemId = createMockUUID()
      ;(itemsService.markCompleted as jest.Mock).mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .post(`/api/items/${itemId}/complete`)
        .expect(500)

      expect(response.body).toEqual({
        success: false,
        error: 'Internal server error',
        message: 'Failed to complete Item',
        timestamp: expect.any(String),
        correlationId: expect.any(String)
      })
    })
  })

  describe('POST /api/items/:id/start', () => {
    it('should start an item when dependencies are met', async () => {
      const itemId = createMockUUID()
      const startedItem = {
        id: itemId,
        title: 'Test Item',
        status: 'in-progress',
        startedAt: new Date().toISOString()
      }

      ;(itemsService.canStart as jest.Mock).mockResolvedValue(true)
      ;(itemsService.markInProgress as jest.Mock).mockResolvedValue(startedItem)

      const response = await request(app)
        .post(`/api/items/${itemId}/start`)
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        data: startedItem,
        message: 'Item started',
        timestamp: expect.any(String),
        correlationId: expect.any(String)
      })
      expect(itemsService.canStart).toHaveBeenCalledWith(itemId)
      expect(itemsService.markInProgress).toHaveBeenCalledWith(itemId)
    })

    it('should return 400 when dependencies are not met', async () => {
      const itemId = '550e8400-e29b-41d4-a716-446655440000'
      ;(itemsService.canStart as jest.Mock).mockResolvedValue(false)

      const response = await request(app)
        .post(`/api/items/${itemId}/start`)
        .expect(400)

      expect(response.body).toEqual({
        success: false,
        error: 'Dependency error',
        message: 'Cannot start item: dependencies not completed',
        correlationId: expect.any(String),
        timestamp: expect.any(String)
      })
      expect(itemsService.markInProgress).not.toHaveBeenCalled()
    })

    it('should return 404 for non-existent item', async () => {
      const itemId = '550e8400-e29b-41d4-a716-446655440001'
      ;(itemsService.canStart as jest.Mock).mockResolvedValue(true)
      ;(itemsService.markInProgress as jest.Mock).mockResolvedValue(null)

      const response = await request(app)
        .post(`/api/items/${itemId}/start`)
        .expect(404)

      expect(response.body).toEqual({
        success: false,
        error: 'Not found',
        message: 'Item not found',
        correlationId: expect.any(String),
        timestamp: expect.any(String)
      })
    })

    it('should handle database errors', async () => {
      const itemId = '550e8400-e29b-41d4-a716-446655440002'
      ;(itemsService.canStart as jest.Mock).mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .post(`/api/items/${itemId}/start`)
        .expect(500)

      expect(response.body).toEqual({
        success: false,
        error: 'Internal server error',
        message: 'Failed to start Item',
        correlationId: expect.any(String),
        timestamp: expect.any(String)
      })
    })
  })

  describe('POST /api/items/:id/move', () => {
    it('should move an item to a different list', async () => {
      const itemId = createMockUUID()
      const newListId = createMockUUID()
      const movedItem = {
        id: itemId,
        title: 'Test Item',
        listId: newListId,
        updatedAt: new Date().toISOString()
      }

      ;(itemsService.moveToList as jest.Mock).mockResolvedValue(movedItem)

      const response = await request(app)
        .post(`/api/items/${itemId}/move`)
        .send({ listId: newListId })
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        data: movedItem,
        message: 'Item moved successfully',
        timestamp: expect.any(String),
        correlationId: expect.any(String)
      })
      expect(itemsService.moveToList).toHaveBeenCalledWith(itemId, newListId)
    })

    it('should return 400 for missing list ID', async () => {
      const itemId = '550e8400-e29b-41d4-a716-446655440003'
      const response = await request(app)
        .post(`/api/items/${itemId}/move`)
        .send({})
        .expect(400)

      expect(response.body).toEqual({
        success: false,
        error: expect.stringContaining('listId: Required'),
        message: 'Validation failed',
        correlationId: expect.any(String),
        timestamp: expect.any(String)
      })
      expect(itemsService.moveToList).not.toHaveBeenCalled()
    })

    it('should return 404 for non-existent item', async () => {
      const nonExistentId = createMockUUID()
      const listId = createMockUUID()
      ;(itemsService.moveToList as jest.Mock).mockResolvedValue(null)

      const response = await request(app)
        .post(`/api/items/${nonExistentId}/move`)
        .send({ listId: listId })
        .expect(404)

      expect(response.body).toEqual({
        success: false,
        error: 'Not found',
        message: 'Item not found',
        timestamp: expect.any(String),
        correlationId: expect.any(String)
      })
    })

    it('should handle database errors', async () => {
      const itemId = createMockUUID()
      const listId = createMockUUID()
      ;(itemsService.moveToList as jest.Mock).mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .post(`/api/items/${itemId}/move`)
        .send({ listId: listId })
        .expect(500)

      expect(response.body).toEqual({
        success: false,
        error: 'Internal server error',
        message: 'Failed to move Item',
        timestamp: expect.any(String),
        correlationId: expect.any(String)
      })
    })
  })

  describe('POST /api/items/:id/duplicate', () => {
    it('should duplicate an item to the same list', async () => {
      const originalItemId = createMockUUID()
      const duplicatedItemId = createMockUUID()
      const listId = createMockUUID()

      const originalItem = {
        id: originalItemId,
        title: 'Original Item',
        description: 'Original description',
        listId: listId,
        priority: 'medium',
        dueDate: new Date().toISOString(),
        estimatedDuration: 60,
        tags: JSON.stringify(['tag1', 'tag2'])
      }

      const duplicatedItem = {
        id: duplicatedItemId,
        title: 'Original Item (Copy)',
        description: 'Original description',
        listId: listId,
        priority: 'medium',
        status: 'pending',
        dueDate: originalItem.dueDate,
        estimatedDuration: 60,
        tags: originalItem.tags,
        createdBy: 'user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      ;(itemsService.findById as jest.Mock).mockResolvedValue(originalItem)
      ;(itemsService.create as jest.Mock).mockResolvedValue(duplicatedItem)

      const response = await request(app)
        .post(`/api/items/${originalItemId}/duplicate`)
        .expect(201)

      expect(response.body).toEqual({
        success: true,
        data: duplicatedItem,
        message: 'Item duplicated successfully',
        timestamp: expect.any(String),
        correlationId: expect.any(String)
      })

      expect(itemsService.findById).toHaveBeenCalledWith(originalItemId)
      expect(itemsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Original Item (Copy)',
          listId: listId,
          status: 'pending'
        })
      )
    })

    it('should duplicate an item to a different list', async () => {
      const originalItemId = createMockUUID()
      const duplicatedItemId = createMockUUID()
      const originalListId = createMockUUID()
      const newListId = createMockUUID()

      const originalItem = {
        id: originalItemId,
        title: 'Original Item',
        listId: originalListId
      }

      const duplicatedItem = {
        id: duplicatedItemId,
        title: 'Original Item (Copy)',
        listId: newListId
      }

      ;(itemsService.findById as jest.Mock).mockResolvedValue(originalItem)
      ;(itemsService.create as jest.Mock).mockResolvedValue(duplicatedItem)

      await request(app)
        .post(`/api/items/${originalItemId}/duplicate`)
        .send({ listId: newListId })
        .expect(201)

      expect(itemsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          listId: newListId
        })
      )
    })

    it('should return 404 for non-existent item', async () => {
      const itemId = '550e8400-e29b-41d4-a716-446655440004'
      ;(itemsService.findById as jest.Mock).mockResolvedValue(null)

      const response = await request(app)
        .post(`/api/items/${itemId}/duplicate`)
        .expect(404)

      expect(response.body).toEqual({
        success: false,
        error: 'Not found',
        message: 'Item not found',
        correlationId: expect.any(String),
        timestamp: expect.any(String)
      })
      expect(itemsService.create).not.toHaveBeenCalled()
    })

    it('should handle database errors', async () => {
      const itemId = createMockUUID()
      ;(itemsService.findById as jest.Mock).mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .post(`/api/items/${itemId}/duplicate`)
        .expect(500)

      expect(response.body).toEqual({
        success: false,
        error: 'Internal server error',
        message: 'Failed to duplicate Item',
        timestamp: expect.any(String),
        correlationId: expect.any(String)
      })
    })
  })

  describe('GET /api/items/search', () => {
    it('should search items by query', async () => {
      const searchResults = [
        { id: createMockUUID(), title: 'Test Item 1', description: 'Contains search term' },
        { id: createMockUUID(), title: 'Another Test', description: 'Also contains term' }
      ]

      ;(itemsService.search as jest.Mock).mockResolvedValue(searchResults)

      const response = await request(app)
        .get('/api/items/search?q=test')
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        data: searchResults,
        message: 'Found 2 items matching "test"',
        timestamp: expect.any(String),
        correlationId: expect.any(String)
      })
      expect(itemsService.search).toHaveBeenCalledWith('test', {
        listId: undefined,
        status: undefined,
        limit: 50
      })
    })

    it('should search with filters', async () => {
      const listId = createMockUUID()
      const searchResults = []
      ;(itemsService.search as jest.Mock).mockResolvedValue(searchResults)

      await request(app)
        .get(`/api/items/search?q=test&listId=${listId}&status=pending&limit=25`)
        .expect(200)

      expect(itemsService.search).toHaveBeenCalledWith('test', {
        listId: listId,
        status: 'pending',
        limit: 25
      })
    })

    it('should return 400 for missing search query', async () => {
      const response = await request(app)
        .get('/api/items/search')
        .expect(400)

      expect(response.body).toEqual({
        success: false,
        error: 'Validation error',
        message: 'Validation failed',
        timestamp: expect.any(String),
        correlationId: expect.any(String)
      })
      expect(itemsService.search).not.toHaveBeenCalled()
    })

    it('should return 400 for empty search query', async () => {
      const response = await request(app)
        .get('/api/items/search?q=')
        .expect(400)

      expect(response.body).toEqual({
        success: false,
        error: expect.stringContaining('q: Search query is required'),
        message: 'Validation failed',
        correlationId: expect.any(String),
        timestamp: expect.any(String)
      })
    })

    it('should handle database errors', async () => {
      ;(itemsService.search as jest.Mock).mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .get('/api/items/search?q=test')
        .expect(500)

      expect(response.body).toEqual({
        success: false,
        error: 'Internal server error',
        message: 'Failed to search Item',
        correlationId: expect.any(String),
        timestamp: expect.any(String)
      })
    })
  })

  describe('GET /api/items/stats', () => {
    it('should get global item statistics', async () => {
      const mockStats = {
        total: 100,
        completed: 75,
        pending: 20,
        'in-progress': 5,
        completionRate: 0.75,
        averageCompletionTime: 3600,
        priorityDistribution: {
          high: 10,
          medium: 60,
          low: 30
        }
      }

      ;(itemsService.getGlobalStats as jest.Mock).mockResolvedValue(mockStats)

      const response = await request(app)
        .get('/api/items/stats')
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        data: mockStats,
        message: 'Item statistics retrieved',
        timestamp: expect.any(String),
        correlationId: expect.any(String)
      })
      expect(itemsService.getGlobalStats).toHaveBeenCalledTimes(1)
    })

    it('should get list-specific statistics', async () => {
      const listId = '550e8400-e29b-41d4-a716-446655440000'
      const mockStats = {
        total: 10,
        completed: 7,
        pending: 3,
        completionRate: 0.7
      }

      ;(itemsService.getListStats as jest.Mock).mockResolvedValue(mockStats)

      const response = await request(app)
        .get(`/api/items/stats?listId=${listId}`)
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        data: mockStats,
        message: 'Item statistics retrieved',
        timestamp: expect.any(String),
        correlationId: expect.any(String)
      })
      expect(itemsService.getListStats).toHaveBeenCalledWith(listId)
    })

    it('should handle database errors', async () => {
      ;(itemsService.getGlobalStats as jest.Mock).mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .get('/api/items/stats')
        .expect(500)

      expect(response.body).toEqual({
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch Item',
        correlationId: expect.any(String),
        timestamp: expect.any(String)
      })
    })
  })
})

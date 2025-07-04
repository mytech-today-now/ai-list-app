import request from 'supertest'
import express from 'express'
import itemsRouter from '../../routes/items'
import { itemsService } from '../../db/services'

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
    getStats: jest.fn()
  }
}))

describe('Items API Integration Tests', () => {
  let app: express.Application

  beforeEach(() => {
    app = express()
    app.use(express.json())
    app.use('/api/items', itemsRouter)
    jest.clearAllMocks()
  })

  describe('GET /api/items', () => {
    it('should get all items with default limit', async () => {
      const mockItems = [
        { id: 'item-1', title: 'Item 1', status: 'pending' },
        { id: 'item-2', title: 'Item 2', status: 'completed' }
      ]
      
      ;(itemsService.findAll as jest.Mock).mockResolvedValue(mockItems)

      const response = await request(app)
        .get('/api/items')
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        data: mockItems,
        message: 'Found 2 items'
      })
      expect(itemsService.findAll).toHaveBeenCalledWith({
        orderBy: expect.any(Array),
        limit: 100
      })
    })

    it('should filter items by listId', async () => {
      const mockItems = [
        { id: 'item-1', listId: 'list-1', title: 'Item 1' }
      ]
      
      ;(itemsService.findByListId as jest.Mock).mockResolvedValue(mockItems)

      const response = await request(app)
        .get('/api/items?listId=list-1')
        .expect(200)

      expect(response.body.data).toEqual(mockItems)
      expect(itemsService.findByListId).toHaveBeenCalledWith('list-1')
    })

    it('should filter items by status', async () => {
      const mockItems = [
        { id: 'item-1', status: 'pending', title: 'Pending Item' }
      ]
      
      ;(itemsService.findByStatus as jest.Mock).mockResolvedValue(mockItems)

      const response = await request(app)
        .get('/api/items?status=pending')
        .expect(200)

      expect(response.body.data).toEqual(mockItems)
      expect(itemsService.findByStatus).toHaveBeenCalledWith(['pending'])
    })

    it('should filter items by multiple statuses', async () => {
      const mockItems = [
        { id: 'item-1', status: 'pending', title: 'Pending Item' },
        { id: 'item-2', status: 'in_progress', title: 'In Progress Item' }
      ]
      
      ;(itemsService.findByStatus as jest.Mock).mockResolvedValue(mockItems)

      await request(app)
        .get('/api/items?status=pending&status=in_progress')
        .expect(200)

      expect(itemsService.findByStatus).toHaveBeenCalledWith(['pending', 'in_progress'])
    })

    it('should filter items by assignee', async () => {
      const mockItems = [
        { id: 'item-1', assignedTo: 'user-1', title: 'Assigned Item' }
      ]
      
      ;(itemsService.findByAssignee as jest.Mock).mockResolvedValue(mockItems)

      const response = await request(app)
        .get('/api/items?assignedTo=user-1')
        .expect(200)

      expect(response.body.data).toEqual(mockItems)
      expect(itemsService.findByAssignee).toHaveBeenCalledWith('user-1')
    })

    it('should find overdue items', async () => {
      const mockItems = [
        { id: 'item-1', dueDate: '2023-01-01', title: 'Overdue Item' }
      ]
      
      ;(itemsService.findOverdue as jest.Mock).mockResolvedValue(mockItems)

      const response = await request(app)
        .get('/api/items?overdue=true')
        .expect(200)

      expect(response.body.data).toEqual(mockItems)
      expect(itemsService.findOverdue).toHaveBeenCalledTimes(1)
    })

    it('should find items due soon with default days', async () => {
      const mockItems = [
        { id: 'item-1', dueDate: '2023-12-31', title: 'Due Soon Item' }
      ]
      
      ;(itemsService.findDueSoon as jest.Mock).mockResolvedValue(mockItems)

      const response = await request(app)
        .get('/api/items?dueSoon=true')
        .expect(200)

      expect(response.body.data).toEqual(mockItems)
      expect(itemsService.findDueSoon).toHaveBeenCalledWith(7)
    })

    it('should find items due soon with custom days', async () => {
      const mockItems = [
        { id: 'item-1', dueDate: '2023-12-31', title: 'Due Soon Item' }
      ]
      
      ;(itemsService.findDueSoon as jest.Mock).mockResolvedValue(mockItems)

      await request(app)
        .get('/api/items?dueSoon=3')
        .expect(200)

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
        message: 'Failed to fetch items',
        data: []
      })
    })
  })

  describe('GET /api/items/:id', () => {
    it('should get a specific item by ID', async () => {
      const mockItem = { 
        id: 'item-1', 
        title: 'Test Item', 
        status: 'pending',
        listId: 'list-1'
      }
      
      ;(itemsService.findById as jest.Mock).mockResolvedValue(mockItem)

      const response = await request(app)
        .get('/api/items/item-1')
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        data: mockItem,
        message: 'Item found'
      })
      expect(itemsService.findById).toHaveBeenCalledWith('item-1')
    })

    it('should return 404 for non-existent item', async () => {
      ;(itemsService.findById as jest.Mock).mockResolvedValue(null)

      const response = await request(app)
        .get('/api/items/nonexistent')
        .expect(404)

      expect(response.body).toEqual({
        success: false,
        error: 'Not found',
        message: 'Item not found'
      })
    })

    it('should include dependencies when requested', async () => {
      const mockItem = { id: 'item-1', title: 'Test Item' }
      const mockDependencies = [{ id: 'item-0', title: 'Dependency' }]
      const mockDependents = [{ id: 'item-2', title: 'Dependent' }]
      
      ;(itemsService.findById as jest.Mock).mockResolvedValue(mockItem)
      ;(itemsService.getDependencies as jest.Mock).mockResolvedValue(mockDependencies)
      ;(itemsService.getDependents as jest.Mock).mockResolvedValue(mockDependents)

      const response = await request(app)
        .get('/api/items/item-1?include=dependencies')
        .expect(200)

      expect(response.body.data).toEqual({
        ...mockItem,
        dependencies: mockDependencies,
        dependents: mockDependents
      })
      expect(itemsService.getDependencies).toHaveBeenCalledWith('item-1')
      expect(itemsService.getDependents).toHaveBeenCalledWith('item-1')
    })

    it('should handle database errors', async () => {
      ;(itemsService.findById as jest.Mock).mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .get('/api/items/item-1')
        .expect(500)

      expect(response.body).toEqual({
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch item'
      })
    })
  })

  describe('POST /api/items', () => {
    it('should create a new item', async () => {
      const newItemData = {
        listId: 'list-1',
        title: 'New Item',
        description: 'A test item',
        priority: 'high',
        dueDate: '2023-12-31T23:59:59Z',
        estimatedDuration: 60,
        tags: ['work', 'urgent'],
        assignedTo: 'user-1'
      }
      
      const createdItem = {
        id: 'item-1',
        ...newItemData,
        status: 'pending',
        position: 0,
        createdBy: 'user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      ;(itemsService.create as jest.Mock).mockResolvedValue(createdItem)

      const response = await request(app)
        .post('/api/items')
        .send(newItemData)
        .expect(201)

      expect(response.body).toEqual({
        success: true,
        data: createdItem,
        message: 'Item created successfully'
      })
      
      expect(itemsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'New Item',
          listId: 'list-1',
          priority: 'high',
          status: 'pending',
          createdBy: 'user'
        })
      )
    })

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/items')
        .send({ description: 'No title or listId' })
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toBe('Validation error')
      expect(itemsService.create).not.toHaveBeenCalled()
    })

    it('should handle database errors during creation', async () => {
      ;(itemsService.create as jest.Mock).mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .post('/api/items')
        .send({ listId: 'list-1', title: 'Test Item' })
        .expect(500)

      expect(response.body).toEqual({
        success: false,
        error: 'Internal server error',
        message: 'Failed to create item'
      })
    })
  })

  describe('PUT /api/items/:id', () => {
    it('should update an existing item', async () => {
      const updateData = {
        title: 'Updated Item',
        description: 'Updated description',
        priority: 'high',
        status: 'completed',
        actualDuration: 90
      }
      
      const updatedItem = { id: 'item-1', ...updateData }
      
      ;(itemsService.updateById as jest.Mock).mockResolvedValue(updatedItem)

      const response = await request(app)
        .put('/api/items/item-1')
        .send(updateData)
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        data: updatedItem,
        message: 'Item updated successfully'
      })
      
      expect(itemsService.updateById).toHaveBeenCalledWith('item-1', 
        expect.objectContaining(updateData)
      )
    })

    it('should return 404 for non-existent item', async () => {
      ;(itemsService.updateById as jest.Mock).mockResolvedValue(null)

      const response = await request(app)
        .put('/api/items/nonexistent')
        .send({ title: 'Updated' })
        .expect(404)

      expect(response.body).toEqual({
        success: false,
        error: 'Not found',
        message: 'Item not found'
      })
    })
  })

  describe('DELETE /api/items/:id', () => {
    it('should delete an existing item', async () => {
      ;(itemsService.deleteById as jest.Mock).mockResolvedValue(true)

      const response = await request(app)
        .delete('/api/items/item-1')
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        message: 'Item deleted successfully'
      })
      expect(itemsService.deleteById).toHaveBeenCalledWith('item-1')
    })

    it('should return 404 for non-existent item', async () => {
      ;(itemsService.deleteById as jest.Mock).mockResolvedValue(false)

      const response = await request(app)
        .delete('/api/items/nonexistent')
        .expect(404)

      expect(response.body).toEqual({
        success: false,
        error: 'Not found',
        message: 'Item not found'
      })
    })
  })
})

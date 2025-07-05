import request from 'supertest'
import express from 'express'
import { randomUUID } from 'crypto'
import listsRouter from '../../routes/lists'
import { listsService, itemsService } from '../../db/services'

// Mock the database services
jest.mock('../../db/services', () => ({
  listsService: {
    findWithItemCounts: jest.fn(),
    getTree: jest.fn(),
    findByParent: jest.fn(),
    findById: jest.fn(),
    getHierarchy: jest.fn(),
    getBreadcrumbs: jest.fn(),
    create: jest.fn(),
    updateById: jest.fn(),
    deleteById: jest.fn(),
    reorder: jest.fn(),
    getStats: jest.fn(),
    moveToParent: jest.fn(),
    archive: jest.fn(),
    count: jest.fn()
  },
  itemsService: {
    findByListId: jest.fn()
  }
}))

describe('Lists API Integration Tests', () => {
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

    app.use('/api/lists', listsRouter)
    jest.clearAllMocks()
  })

  describe('GET /api/lists', () => {
    it('should get all lists with item counts', async () => {
      const mockLists = [
        { id: 'list-1', title: 'List 1', itemCount: 5 },
        { id: 'list-2', title: 'List 2', itemCount: 3 }
      ]

      ;(listsService.findWithItemCounts as jest.Mock).mockResolvedValue(mockLists)
      ;(listsService.count as jest.Mock).mockResolvedValue(2)

      const response = await request(app)
        .get('/api/lists')
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        data: mockLists,
        message: 'Found 2 lists',
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1
        },
        correlationId: expect.any(String)
      })
      expect(response.body.timestamp).toBeDefined()
      expect(listsService.findWithItemCounts).toHaveBeenCalledTimes(1)
    })

    it('should get tree structure when tree=true', async () => {
      const mockTree = [
        { id: 'list-1', title: 'Parent List', children: [
          { id: 'list-2', title: 'Child List', children: [] }
        ]}
      ]

      ;(listsService.getTree as jest.Mock).mockResolvedValue(mockTree)

      const response = await request(app)
        .get('/api/lists?tree=true')
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        data: mockTree,
        message: 'Found 1 lists'
      })
      expect(response.body.timestamp).toBeDefined()
      expect(listsService.getTree).toHaveBeenCalledTimes(1)
    })

    it('should get lists by parent when parent query provided', async () => {
      const mockLists = [
        { id: 'list-2', title: 'Child List', parentListId: 'list-1' }
      ]

      ;(listsService.findByParent as jest.Mock).mockResolvedValue(mockLists)

      const response = await request(app)
        .get('/api/lists?parent=list-1')
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        data: mockLists,
        message: 'Found 1 lists',
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1
        }
      })
      expect(response.body.timestamp).toBeDefined()
      expect(listsService.findByParent).toHaveBeenCalledWith('list-1')
    })

    it('should handle null parent query', async () => {
      const mockLists = [
        { id: 'list-1', title: 'Root List', parentListId: null }
      ]
      
      ;(listsService.findByParent as jest.Mock).mockResolvedValue(mockLists)

      await request(app)
        .get('/api/lists?parent=null')
        .expect(200)

      expect(listsService.findByParent).toHaveBeenCalledWith(null)
    })

    it('should handle database errors', async () => {
      ;(listsService.findWithItemCounts as jest.Mock).mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .get('/api/lists')
        .expect(500)

      expect(response.body).toMatchObject({
        success: false,
        error: 'Internal server error',
        message: 'Failed to list List',
        correlationId: expect.any(String)
      })
      expect(response.body.timestamp).toBeDefined()
    })
  })

  describe('GET /api/lists/:id', () => {
    const validUuid = '550e8400-e29b-41d4-a716-446655440000'

    it('should get a specific list by ID', async () => {
      const mockList = { id: validUuid, title: 'Test List' }

      ;(listsService.findById as jest.Mock).mockResolvedValue(mockList)

      const response = await request(app)
        .get(`/api/lists/${validUuid}`)
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        data: mockList,
        message: 'List found'
      })
      expect(response.body.timestamp).toBeDefined()
      expect(listsService.findById).toHaveBeenCalledWith(validUuid)
    })

    it('should return 404 for non-existent list', async () => {
      const nonExistentUuid = '550e8400-e29b-41d4-a716-446655440001'
      ;(listsService.findById as jest.Mock).mockResolvedValue(null)

      const response = await request(app)
        .get(`/api/lists/${nonExistentUuid}`)
        .expect(404)

      expect(response.body).toMatchObject({
        success: false,
        error: 'Not found',
        message: 'List not found',
        correlationId: expect.any(String)
      })
      expect(response.body.timestamp).toBeDefined()
    })

    it('should include children when requested', async () => {
      const mockList = { id: validUuid, title: 'Parent List' }
      const mockHierarchy = {
        ...mockList,
        children: [{ id: '550e8400-e29b-41d4-a716-446655440002', title: 'Child List' }]
      }

      ;(listsService.findById as jest.Mock).mockResolvedValue(mockList)
      ;(listsService.getHierarchy as jest.Mock).mockResolvedValue(mockHierarchy)

      const response = await request(app)
        .get(`/api/lists/${validUuid}?include=children`)
        .expect(200)

      expect(response.body.data).toEqual(mockHierarchy)
      expect(response.body.timestamp).toBeDefined()
      expect(listsService.getHierarchy).toHaveBeenCalledWith(validUuid)
    })

    it('should include items when requested', async () => {
      const mockList = { id: validUuid, title: 'Test List' }
      const mockItems = [{ id: '550e8400-e29b-41d4-a716-446655440003', title: 'Test Item' }]

      ;(listsService.findById as jest.Mock).mockResolvedValue(mockList)
      ;(itemsService.findByListId as jest.Mock).mockResolvedValue(mockItems)

      const response = await request(app)
        .get(`/api/lists/${validUuid}?include=items`)
        .expect(200)

      expect(response.body.data).toEqual({ ...mockList, items: mockItems })
      expect(response.body.timestamp).toBeDefined()
      expect(itemsService.findByListId).toHaveBeenCalledWith(validUuid)
    })

    it('should include breadcrumbs when requested', async () => {
      const mockList = { id: validUuid, title: 'Test List' }
      const mockBreadcrumbs = [
        { id: '550e8400-e29b-41d4-a716-446655440004', title: 'Root' },
        { id: validUuid, title: 'Test List' }
      ]

      ;(listsService.findById as jest.Mock).mockResolvedValue(mockList)
      ;(listsService.getBreadcrumbs as jest.Mock).mockResolvedValue(mockBreadcrumbs)

      const response = await request(app)
        .get(`/api/lists/${validUuid}?include=breadcrumbs`)
        .expect(200)

      expect(response.body.data).toEqual({ ...mockList, breadcrumbs: mockBreadcrumbs })
      expect(response.body.timestamp).toBeDefined()
      expect(listsService.getBreadcrumbs).toHaveBeenCalledWith(validUuid)
    })
  })

  describe('POST /api/lists', () => {
    it('should create a new list', async () => {
      const newListData = {
        title: 'New List',
        description: 'A test list',
        priority: 'high'
      }
      
      const createdList = {
        id: 'list-1',
        ...newListData,
        status: 'active',
        createdBy: 'user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      ;(listsService.create as jest.Mock).mockResolvedValue(createdList)

      const response = await request(app)
        .post('/api/lists')
        .send(newListData)
        .expect(201)

      expect(response.body).toMatchObject({
        success: true,
        data: createdList,
        message: 'List created successfully'
      })
      expect(response.body.timestamp).toBeDefined()
      
      expect(listsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'New List',
          description: 'A test list',
          priority: 'high',
          status: 'active',
          createdBy: 'system'
        })
      )
    })

    it('should create list with default priority', async () => {
      const newListData = { title: 'New List' }
      const createdList = { id: 'list-1', ...newListData, priority: 'medium' }
      
      ;(listsService.create as jest.Mock).mockResolvedValue(createdList)

      await request(app)
        .post('/api/lists')
        .send(newListData)
        .expect(201)

      expect(listsService.create).toHaveBeenCalledWith(
        expect.objectContaining({ priority: 'medium' })
      )
    })

    it('should return 400 for missing title', async () => {
      const response = await request(app)
        .post('/api/lists')
        .send({ description: 'No title' })
        .expect(400)

      expect(response.body).toMatchObject({
        success: false,
        error: 'title: Required',
        message: 'Validation failed',
        correlationId: expect.any(String)
      })
      expect(response.body.timestamp).toBeDefined()
      expect(listsService.create).not.toHaveBeenCalled()
    })

    it('should handle database errors during creation', async () => {
      ;(listsService.create as jest.Mock).mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .post('/api/lists')
        .send({ title: 'Test List' })
        .expect(500)

      expect(response.body).toMatchObject({
        success: false,
        error: 'Internal server error',
        message: 'Failed to create List',
        correlationId: expect.any(String)
      })
      expect(response.body.timestamp).toBeDefined()
    })
  })

  describe('PUT /api/lists/:id', () => {
    const validUuid = '550e8400-e29b-41d4-a716-446655440000'

    it('should update an existing list', async () => {
      const updateData = {
        title: 'Updated List',
        description: 'Updated description',
        priority: 'high',
        status: 'completed'
      }

      const updatedList = { id: validUuid, ...updateData }

      ;(listsService.updateById as jest.Mock).mockResolvedValue(updatedList)

      const response = await request(app)
        .put(`/api/lists/${validUuid}`)
        .send(updateData)
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        data: updatedList,
        message: 'List updated successfully'
      })
      expect(response.body.timestamp).toBeDefined()

      expect(listsService.updateById).toHaveBeenCalledWith(validUuid,
        expect.objectContaining(updateData)
      )
    })

    it('should return 404 for non-existent list', async () => {
      const nonExistentUuid = '550e8400-e29b-41d4-a716-446655440001'
      ;(listsService.updateById as jest.Mock).mockResolvedValue(null)

      const response = await request(app)
        .put(`/api/lists/${nonExistentUuid}`)
        .send({ title: 'Updated' })
        .expect(404)

      expect(response.body).toMatchObject({
        success: false,
        error: 'Not found',
        message: 'List not found',
        correlationId: expect.any(String)
      })
      expect(response.body.timestamp).toBeDefined()
    })

    it('should handle partial updates', async () => {
      const updateData = { title: 'Only Title Updated' }
      const updatedList = { id: validUuid, ...updateData }

      ;(listsService.updateById as jest.Mock).mockResolvedValue(updatedList)

      await request(app)
        .put(`/api/lists/${validUuid}`)
        .send(updateData)
        .expect(200)

      expect(listsService.updateById).toHaveBeenCalledWith(validUuid,
        expect.objectContaining({
          title: 'Only Title Updated',
          updatedAt: expect.any(Date)
        })
      )
    })
  })

  describe('DELETE /api/lists/:id', () => {
    const validUuid = '550e8400-e29b-41d4-a716-446655440000'

    it('should delete an existing list', async () => {
      ;(listsService.deleteById as jest.Mock).mockResolvedValue(true)

      const response = await request(app)
        .delete(`/api/lists/${validUuid}`)
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        message: 'List deleted successfully'
      })
      expect(response.body.timestamp).toBeDefined()
      expect(listsService.deleteById).toHaveBeenCalledWith(validUuid)
    })

    it('should return 404 for non-existent list', async () => {
      const nonExistentUuid = '550e8400-e29b-41d4-a716-446655440001'
      ;(listsService.deleteById as jest.Mock).mockResolvedValue(false)

      const response = await request(app)
        .delete(`/api/lists/${nonExistentUuid}`)
        .expect(404)

      expect(response.body).toMatchObject({
        success: false,
        error: 'Not found',
        message: 'List not found',
        correlationId: expect.any(String)
      })
      expect(response.body.timestamp).toBeDefined()
    })

    it('should handle database errors during deletion', async () => {
      ;(listsService.deleteById as jest.Mock).mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .delete(`/api/lists/${validUuid}`)
        .expect(500)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toBe('Internal server error')
      expect(response.body.timestamp).toBeDefined()
    })
  })

  describe('POST /api/lists/:id/move', () => {
    const validUuid = '550e8400-e29b-41d4-a716-446655440000'
    const parentUuid = '550e8400-e29b-41d4-a716-446655440005'

    it('should move a list to a new parent', async () => {
      const movedList = {
        id: validUuid,
        title: 'Test List',
        parentListId: parentUuid,
        updatedAt: new Date().toISOString()
      }

      ;(listsService.moveToParent as jest.Mock).mockResolvedValue(movedList)

      const response = await request(app)
        .post(`/api/lists/${validUuid}/move`)
        .send({ parentId: parentUuid })
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        data: movedList,
        message: 'List moved successfully'
      })
      expect(response.body.timestamp).toBeDefined()
      expect(listsService.moveToParent).toHaveBeenCalledWith(validUuid, parentUuid)
    })

    it('should move list to root when parentId is null', async () => {
      const movedList = {
        id: validUuid,
        parentListId: null
      }

      ;(listsService.moveToParent as jest.Mock).mockResolvedValue(movedList)

      await request(app)
        .post(`/api/lists/${validUuid}/move`)
        .send({ parentId: null })
        .expect(200)

      expect(listsService.moveToParent).toHaveBeenCalledWith(validUuid, null)
    })

    it('should move list to root when parentId is not provided', async () => {
      const movedList = {
        id: validUuid,
        parentListId: null
      }

      ;(listsService.moveToParent as jest.Mock).mockResolvedValue(movedList)

      await request(app)
        .post(`/api/lists/${validUuid}/move`)
        .send({})
        .expect(200)

      expect(listsService.moveToParent).toHaveBeenCalledWith(validUuid, undefined)
    })

    it('should return 404 for non-existent list', async () => {
      const nonExistentUuid = '550e8400-e29b-41d4-a716-446655440001'
      const parentUuid = '550e8400-e29b-41d4-a716-446655440006'
      ;(listsService.moveToParent as jest.Mock).mockResolvedValue(null)

      const response = await request(app)
        .post(`/api/lists/${nonExistentUuid}/move`)
        .send({ parentId: parentUuid })
        .expect(404)

      expect(response.body).toMatchObject({
        success: false,
        error: 'Not found',
        message: 'List not found',
        correlationId: expect.any(String)
      })
      expect(response.body.timestamp).toBeDefined()
    })

    it('should handle database errors', async () => {
      const parentUuid = '550e8400-e29b-41d4-a716-446655440006'
      ;(listsService.moveToParent as jest.Mock).mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .post(`/api/lists/${validUuid}/move`)
        .send({ parentId: parentUuid })
        .expect(500)

      expect(response.body).toMatchObject({
        success: false,
        error: 'Internal server error',
        correlationId: expect.any(String)
      })
      expect(response.body.timestamp).toBeDefined()
    })
  })

  describe('POST /api/lists/:id/reorder', () => {
    const validUuid = '550e8400-e29b-41d4-a716-446655440000'

    it('should reorder a list to a new position', async () => {
      ;(listsService.reorder as jest.Mock).mockResolvedValue(undefined)

      const response = await request(app)
        .post(`/api/lists/${validUuid}/reorder`)
        .send({ position: 2 })
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        message: 'List reordered successfully'
      })
      expect(response.body.timestamp).toBeDefined()
      expect(listsService.reorder).toHaveBeenCalledWith(validUuid, 2)
    })

    it('should return 400 for missing position', async () => {
      const response = await request(app)
        .post(`/api/lists/${validUuid}/reorder`)
        .send({})
        .expect(400)

      expect(response.body).toMatchObject({
        success: false,
        error: 'position: Required',
        message: 'Validation failed',
        correlationId: expect.any(String)
      })
      expect(response.body.timestamp).toBeDefined()
      expect(listsService.reorder).not.toHaveBeenCalled()
    })

    it('should return 400 for invalid position type', async () => {
      const response = await request(app)
        .post(`/api/lists/${validUuid}/reorder`)
        .send({ position: 'invalid' })
        .expect(400)

      expect(response.body).toMatchObject({
        success: false,
        error: 'position: Expected number, received string',
        message: 'Validation failed',
        correlationId: expect.any(String)
      })
      expect(response.body.timestamp).toBeDefined()
      expect(listsService.reorder).not.toHaveBeenCalled()
    })

    it('should handle database errors', async () => {
      ;(listsService.reorder as jest.Mock).mockRejectedValue(new Error('Reorder failed'))

      const response = await request(app)
        .post(`/api/lists/${validUuid}/reorder`)
        .send({ position: 1 })
        .expect(500)

      expect(response.body).toMatchObject({
        success: false,
        error: 'Internal server error',
        correlationId: expect.any(String)
      })
      expect(response.body.timestamp).toBeDefined()
    })
  })

  describe('POST /api/lists/:id/archive', () => {
    const validUuid = '550e8400-e29b-41d4-a716-446655440000'

    it('should archive a list', async () => {
      ;(listsService.archive as jest.Mock).mockResolvedValue(undefined)

      const response = await request(app)
        .post(`/api/lists/${validUuid}/archive`)
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        message: 'List archived successfully'
      })
      expect(response.body.timestamp).toBeDefined()
      expect(listsService.archive).toHaveBeenCalledWith(validUuid)
    })

    it('should handle database errors', async () => {
      ;(listsService.archive as jest.Mock).mockRejectedValue(new Error('Archive failed'))

      const response = await request(app)
        .post(`/api/lists/${validUuid}/archive`)
        .expect(500)

      expect(response.body).toMatchObject({
        success: false,
        error: 'Internal server error',
        correlationId: expect.any(String)
      })
      expect(response.body.timestamp).toBeDefined()
    })
  })

  describe.skip('POST /api/lists/:id/restore', () => {
    // Note: Restore route is not implemented in the router
    it('should restore an archived list', async () => {
      // Test skipped - route not implemented
    })

    it('should return 404 for non-existent list', async () => {
      // Test skipped - route not implemented
    })

    it('should handle database errors', async () => {
      // Test skipped - route not implemented
    })
  })

  describe('POST /api/lists/:id/complete', () => {
    const validUuid = '550e8400-e29b-41d4-a716-446655440000'

    it('should mark a list as completed', async () => {
      const completedList = {
        id: validUuid,
        title: 'Test List',
        status: 'completed',
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      ;(listsService.updateById as jest.Mock).mockResolvedValue(completedList)

      const response = await request(app)
        .post(`/api/lists/${validUuid}/complete`)
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        data: completedList,
        message: 'List marked as completed'
      })
      expect(response.body.timestamp).toBeDefined()
      expect(listsService.updateById).toHaveBeenCalledWith(validUuid, {
        status: 'completed',
        completedAt: expect.any(Date),
        updatedAt: expect.any(Date)
      })
    })

    it('should return 404 for non-existent list', async () => {
      const nonExistentUuid = '550e8400-e29b-41d4-a716-446655440001'
      ;(listsService.updateById as jest.Mock).mockResolvedValue(null)

      const response = await request(app)
        .post(`/api/lists/${nonExistentUuid}/complete`)
        .expect(404)

      expect(response.body).toMatchObject({
        success: false,
        error: 'Not found',
        message: 'List not found',
        correlationId: expect.any(String)
      })
      expect(response.body.timestamp).toBeDefined()
    })

    it('should handle database errors', async () => {
      ;(listsService.updateById as jest.Mock).mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .post(`/api/lists/${validUuid}/complete`)
        .expect(500)

      expect(response.body).toMatchObject({
        success: false,
        error: 'Internal server error',
        correlationId: expect.any(String)
      })
      expect(response.body.timestamp).toBeDefined()
    })
  })

  describe('GET /api/lists/:id/stats', () => {
    const validUuid = '550e8400-e29b-41d4-a716-446655440000'

    it('should get statistics for a list', async () => {
      const mockStats = {
        totalItems: 10,
        completedItems: 7,
        pendingItems: 3,
        completionRate: 0.7,
        averageCompletionTime: 3600,
        totalTimeSpent: 25200,
        priorityDistribution: {
          high: 2,
          medium: 5,
          low: 3
        },
        statusDistribution: {
          pending: 3,
          'in-progress': 0,
          completed: 7
        }
      }

      ;(listsService.getStats as jest.Mock).mockResolvedValue(mockStats)

      const response = await request(app)
        .get(`/api/lists/${validUuid}/stats`)
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        data: mockStats,
        message: 'List statistics retrieved'
      })
      expect(response.body.timestamp).toBeDefined()
      expect(listsService.getStats).toHaveBeenCalledWith(validUuid)
    })

    it('should return 404 for non-existent list', async () => {
      const nonExistentUuid = '550e8400-e29b-41d4-a716-446655440001'
      ;(listsService.getStats as jest.Mock).mockResolvedValue(null)

      const response = await request(app)
        .get(`/api/lists/${nonExistentUuid}/stats`)
        .expect(404)

      expect(response.body).toMatchObject({
        success: false,
        error: 'Not found',
        message: 'List not found',
        correlationId: expect.any(String)
      })
      expect(response.body.timestamp).toBeDefined()
    })

    it('should handle database errors', async () => {
      ;(listsService.getStats as jest.Mock).mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .get(`/api/lists/${validUuid}/stats`)
        .expect(500)

      expect(response.body).toMatchObject({
        success: false,
        error: 'Internal server error',
        correlationId: expect.any(String)
      })
      expect(response.body.timestamp).toBeDefined()
    })
  })
})

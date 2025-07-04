import request from 'supertest'
import express from 'express'
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
    getStats: jest.fn()
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

      const response = await request(app)
        .get('/api/lists')
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        data: mockLists,
        message: 'Found 2 lists'
      })
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

      expect(response.body).toEqual({
        success: true,
        data: mockTree,
        message: 'Found 1 root lists'
      })
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

      expect(response.body).toEqual({
        success: true,
        data: mockLists,
        message: 'Found 1 lists'
      })
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

      expect(response.body).toEqual({
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch lists'
      })
    })
  })

  describe('GET /api/lists/:id', () => {
    it('should get a specific list by ID', async () => {
      const mockList = { id: 'list-1', title: 'Test List' }
      
      ;(listsService.findById as jest.Mock).mockResolvedValue(mockList)

      const response = await request(app)
        .get('/api/lists/list-1')
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        data: mockList,
        message: 'List found'
      })
      expect(listsService.findById).toHaveBeenCalledWith('list-1')
    })

    it('should return 404 for non-existent list', async () => {
      ;(listsService.findById as jest.Mock).mockResolvedValue(null)

      const response = await request(app)
        .get('/api/lists/nonexistent')
        .expect(404)

      expect(response.body).toEqual({
        success: false,
        error: 'Not found',
        message: 'List not found'
      })
    })

    it('should include children when requested', async () => {
      const mockList = { id: 'list-1', title: 'Parent List' }
      const mockHierarchy = { 
        ...mockList, 
        children: [{ id: 'list-2', title: 'Child List' }] 
      }
      
      ;(listsService.findById as jest.Mock).mockResolvedValue(mockList)
      ;(listsService.getHierarchy as jest.Mock).mockResolvedValue(mockHierarchy)

      const response = await request(app)
        .get('/api/lists/list-1?include=children')
        .expect(200)

      expect(response.body.data).toEqual(mockHierarchy)
      expect(listsService.getHierarchy).toHaveBeenCalledWith('list-1')
    })

    it('should include items when requested', async () => {
      const mockList = { id: 'list-1', title: 'Test List' }
      const mockItems = [{ id: 'item-1', title: 'Test Item' }]
      
      ;(listsService.findById as jest.Mock).mockResolvedValue(mockList)
      ;(itemsService.findByListId as jest.Mock).mockResolvedValue(mockItems)

      const response = await request(app)
        .get('/api/lists/list-1?include=items')
        .expect(200)

      expect(response.body.data).toEqual({ ...mockList, items: mockItems })
      expect(itemsService.findByListId).toHaveBeenCalledWith('list-1')
    })

    it('should include breadcrumbs when requested', async () => {
      const mockList = { id: 'list-1', title: 'Test List' }
      const mockBreadcrumbs = [
        { id: 'root', title: 'Root' },
        { id: 'list-1', title: 'Test List' }
      ]
      
      ;(listsService.findById as jest.Mock).mockResolvedValue(mockList)
      ;(listsService.getBreadcrumbs as jest.Mock).mockResolvedValue(mockBreadcrumbs)

      const response = await request(app)
        .get('/api/lists/list-1?include=breadcrumbs')
        .expect(200)

      expect(response.body.data).toEqual({ ...mockList, breadcrumbs: mockBreadcrumbs })
      expect(listsService.getBreadcrumbs).toHaveBeenCalledWith('list-1')
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

      expect(response.body).toEqual({
        success: true,
        data: createdList,
        message: 'List created successfully'
      })
      
      expect(listsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'New List',
          description: 'A test list',
          priority: 'high',
          status: 'active',
          createdBy: 'user'
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

      expect(response.body).toEqual({
        success: false,
        error: 'Validation error',
        message: 'Title is required'
      })
      expect(listsService.create).not.toHaveBeenCalled()
    })

    it('should handle database errors during creation', async () => {
      ;(listsService.create as jest.Mock).mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .post('/api/lists')
        .send({ title: 'Test List' })
        .expect(500)

      expect(response.body).toEqual({
        success: false,
        error: 'Internal server error',
        message: 'Failed to create list'
      })
    })
  })

  describe('PUT /api/lists/:id', () => {
    it('should update an existing list', async () => {
      const updateData = {
        title: 'Updated List',
        description: 'Updated description',
        priority: 'high',
        status: 'completed'
      }
      
      const updatedList = { id: 'list-1', ...updateData }
      
      ;(listsService.updateById as jest.Mock).mockResolvedValue(updatedList)

      const response = await request(app)
        .put('/api/lists/list-1')
        .send(updateData)
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        data: updatedList,
        message: 'List updated successfully'
      })
      
      expect(listsService.updateById).toHaveBeenCalledWith('list-1', 
        expect.objectContaining(updateData)
      )
    })

    it('should return 404 for non-existent list', async () => {
      ;(listsService.updateById as jest.Mock).mockResolvedValue(null)

      const response = await request(app)
        .put('/api/lists/nonexistent')
        .send({ title: 'Updated' })
        .expect(404)

      expect(response.body).toEqual({
        success: false,
        error: 'Not found',
        message: 'List not found'
      })
    })

    it('should handle partial updates', async () => {
      const updateData = { title: 'Only Title Updated' }
      const updatedList = { id: 'list-1', ...updateData }
      
      ;(listsService.updateById as jest.Mock).mockResolvedValue(updatedList)

      await request(app)
        .put('/api/lists/list-1')
        .send(updateData)
        .expect(200)

      expect(listsService.updateById).toHaveBeenCalledWith('list-1', 
        expect.objectContaining({
          title: 'Only Title Updated',
          updatedAt: expect.any(Date)
        })
      )
    })
  })

  describe('DELETE /api/lists/:id', () => {
    it('should delete an existing list', async () => {
      ;(listsService.deleteById as jest.Mock).mockResolvedValue(true)

      const response = await request(app)
        .delete('/api/lists/list-1')
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        message: 'List deleted successfully'
      })
      expect(listsService.deleteById).toHaveBeenCalledWith('list-1')
    })

    it('should return 404 for non-existent list', async () => {
      ;(listsService.deleteById as jest.Mock).mockResolvedValue(false)

      const response = await request(app)
        .delete('/api/lists/nonexistent')
        .expect(404)

      expect(response.body).toEqual({
        success: false,
        error: 'Not found',
        message: 'List not found'
      })
    })

    it('should handle database errors during deletion', async () => {
      ;(listsService.deleteById as jest.Mock).mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .delete('/api/lists/list-1')
        .expect(500)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toBe('Internal server error')
    })
  })
})

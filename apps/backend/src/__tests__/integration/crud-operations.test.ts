import request from 'supertest'
import express from 'express'
import { randomUUID } from 'crypto'
import { listsController } from '../../controllers/lists'
import { itemsController } from '../../controllers/items'
import { validateBody, validateParams, validateQuery, rateLimitValidation } from '../../middleware/validation'
import { errorHandler, notFoundHandler, asyncHandler } from '../../middleware/errorHandler'
import { listSchemas, itemSchemas, actionSchemas } from '../../validation/schemas'
import { listsService, itemsService } from '../../db/services'

// Helper function to generate UUIDs consistently
const generateUUID = () => {
  // Generate a valid UUID v4 format for tests
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

/**
 * SemanticType: CRUDOperationsTest
 * Description: Comprehensive integration tests for CRUD operations with proper HTTP status codes
 * ExtensibleByAI: true
 * AIUseCases:
 *   - Add custom test scenarios
 *   - Extend validation testing
 *   - Add performance testing
 *   - Integrate with MCP testing
 */

// Mock the database services
jest.mock('../../db/services', () => ({
  listsService: {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    updateById: jest.fn(),
    deleteById: jest.fn(),
    count: jest.fn(),
    findWithItemCounts: jest.fn(),
    getTree: jest.fn(),
    findByParent: jest.fn(),
    getHierarchy: jest.fn(),
    getBreadcrumbs: jest.fn(),
    moveToParent: jest.fn(),
    reorder: jest.fn(),
    archive: jest.fn(),
    getStats: jest.fn()
  },
  itemsService: {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    updateById: jest.fn(),
    deleteById: jest.fn(),
    count: jest.fn(),
    findByListId: jest.fn(),
    findByStatus: jest.fn(),
    findByAssignee: jest.fn(),
    findOverdue: jest.fn(),
    findDueSoon: jest.fn(),
    getDependencies: jest.fn(),
    getDependents: jest.fn(),
    markCompleted: jest.fn(),
    markInProgress: jest.fn(),
    canStart: jest.fn(),
    moveToList: jest.fn()
  }
}))

// Create test app with enhanced CRUD routes
const createTestApp = () => {
  const app = express()
  app.use(express.json())

  // Add correlation ID middleware
  app.use((req, res, next) => {
    (req as any).correlationId = 'test-correlation-id'
    next()
  })

  // Lists routes
  const listsRouter = express.Router()
  listsRouter.use(rateLimitValidation)
  listsRouter.get('/', validateQuery(listSchemas.query), asyncHandler(listsController.list.bind(listsController)))
  listsRouter.get('/:id', validateParams(listSchemas.params), validateQuery(listSchemas.query), asyncHandler(listsController.getById.bind(listsController)))
  listsRouter.post('/', validateBody(listSchemas.create), asyncHandler(listsController.create.bind(listsController)))
  listsRouter.put('/:id', validateParams(listSchemas.params), validateBody(listSchemas.update), asyncHandler(listsController.update.bind(listsController)))
  listsRouter.patch('/:id', validateParams(listSchemas.params), validateBody(listSchemas.update.partial()), asyncHandler(listsController.patch.bind(listsController)))
  listsRouter.delete('/:id', validateParams(listSchemas.params), asyncHandler(listsController.delete.bind(listsController)))
  listsRouter.head('/:id', validateParams(listSchemas.params), asyncHandler(listsController.head.bind(listsController)))
  listsRouter.post('/:id/move', validateParams(listSchemas.params), validateBody(actionSchemas.moveList), asyncHandler(listsController.move.bind(listsController)))
  listsRouter.post('/:id/complete', validateParams(listSchemas.params), asyncHandler(listsController.complete.bind(listsController)))

  // Items routes
  const itemsRouter = express.Router()
  itemsRouter.use(rateLimitValidation)
  itemsRouter.get('/', validateQuery(itemSchemas.query), asyncHandler(itemsController.list.bind(itemsController)))
  itemsRouter.get('/:id', validateParams(itemSchemas.params), validateQuery(itemSchemas.query), asyncHandler(itemsController.getById.bind(itemsController)))
  itemsRouter.post('/', validateBody(itemSchemas.create), asyncHandler(itemsController.create.bind(itemsController)))
  itemsRouter.put('/:id', validateParams(itemSchemas.params), validateBody(itemSchemas.update), asyncHandler(itemsController.update.bind(itemsController)))
  itemsRouter.patch('/:id', validateParams(itemSchemas.params), validateBody(itemSchemas.update.partial()), asyncHandler(itemsController.patch.bind(itemsController)))
  itemsRouter.delete('/:id', validateParams(itemSchemas.params), asyncHandler(itemsController.delete.bind(itemsController)))
  itemsRouter.post('/:id/complete', validateParams(itemSchemas.params), asyncHandler(itemsController.complete.bind(itemsController)))
  itemsRouter.post('/:id/start', validateParams(itemSchemas.params), asyncHandler(itemsController.start.bind(itemsController)))
  itemsRouter.post('/:id/move', validateParams(itemSchemas.params), validateBody(actionSchemas.moveItem), asyncHandler(itemsController.move.bind(itemsController)))

  app.use('/api/lists', listsRouter)
  app.use('/api/items', itemsRouter)

  // Error handling
  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}

describe('Enhanced CRUD Operations', () => {
  let app: express.Application

  beforeEach(() => {
    app = createTestApp()
    jest.clearAllMocks()
  })

  describe('Lists CRUD Operations', () => {
    describe('GET /api/lists', () => {
      it('should return 200 with lists data', async () => {
        const mockLists = [
          { id: generateUUID(), title: 'Test List 1', status: 'active' },
          { id: generateUUID(), title: 'Test List 2', status: 'active' }
        ];
        (listsService.findWithItemCounts as jest.Mock).mockResolvedValue(mockLists);
        (listsService.count as jest.Mock).mockResolvedValue(2)

        const response = await request(app)
          .get('/api/lists')
          .expect(200)

        expect(response.body).toMatchObject({
          success: true,
          data: mockLists,
          message: 'Found 2 lists',
          timestamp: expect.any(String),
          correlationId: expect.any(String),
          pagination: {
            page: 1,
            limit: 20,
            total: 2,
            totalPages: 1
          }
        })
      })

      it('should return 400 for invalid query parameters', async () => {
        const response = await request(app)
          .get('/api/lists?page=invalid')
          .expect(400)

        expect(response.body).toMatchObject({
          success: false,
          message: 'Validation failed',
          error: expect.stringContaining('page'),
          correlationId: expect.any(String),
          timestamp: expect.any(String)
        })
      })
    })

    describe('GET /api/lists/:id', () => {
      it('should return 200 with list data when found', async () => {
        const listId = generateUUID()
        const mockList = { id: listId, title: 'Test List', status: 'active' };
        (listsService.findById as jest.Mock).mockResolvedValue(mockList)

        const response = await request(app)
          .get(`/api/lists/${listId}`)
          .expect(200)

        expect(response.body).toMatchObject({
          success: true,
          data: mockList,
          message: 'List found',
          correlationId: expect.any(String),
          timestamp: expect.any(String)
        })
      })

      it('should return 404 when list not found', async () => {
        const listId = '12345678-1234-4123-8123-123456789012'
        ;(listsService.findById as jest.Mock).mockResolvedValue(null)

        const response = await request(app)
          .get(`/api/lists/${listId}`)
          .expect(404)

        expect(response.body).toMatchObject({
          success: false,
          message: 'List not found',
          error: 'Not found',
          correlationId: expect.any(String),
          timestamp: expect.any(String)
        })
      })

      it('should return 400 for invalid UUID', async () => {
        const response = await request(app)
          .get('/api/lists/invalid-uuid')
          .expect(400)

        expect(response.body).toMatchObject({
          success: false,
          message: 'Validation failed',
          error: expect.stringContaining('Invalid UUID format'),
          correlationId: expect.any(String)
        })
      })
    })

    describe('POST /api/lists', () => {
      it('should return 201 when list created successfully', async () => {
        const listId = generateUUID()
        const newList = {
          id: listId,
          title: 'New List',
          description: 'Test description',
          status: 'active'
        };
        (listsService.create as jest.Mock).mockResolvedValue(newList)

        const response = await request(app)
          .post('/api/lists')
          .send({
            title: 'New List',
            description: 'Test description',
            priority: 'medium'
          })
          .expect(201)

        expect(response.body).toMatchObject({
          success: true,
          data: newList,
          message: 'List created successfully',
          correlationId: expect.any(String),
          timestamp: expect.any(String)
        })
      })

      it('should return 400 for missing required fields', async () => {
        const response = await request(app)
          .post('/api/lists')
          .send({
            description: 'Missing title'
          })
          .expect(400)

        expect(response.body).toMatchObject({
          success: false,
          message: 'Validation failed',
          error: expect.stringContaining('title: Required'),
          correlationId: expect.any(String)
        })
      })

      it('should return 400 for invalid data types', async () => {
        const response = await request(app)
          .post('/api/lists')
          .send({
            title: 123, // Should be string
            priority: 'invalid' // Should be enum value
          })
          .expect(400)

        expect(response.body).toMatchObject({
          success: false,
          message: 'Validation failed'
        })
      })
    })

    describe('PUT /api/lists/:id', () => {
      it('should return 200 when list updated successfully', async () => {
        const listId = generateUUID()
        const updatedList = {
          id: listId,
          title: 'Updated List',
          status: 'active'
        };
        (listsService.updateById as jest.Mock).mockResolvedValue(updatedList)

        const response = await request(app)
          .put(`/api/lists/${listId}`)
          .send({
            title: 'Updated List',
            priority: 'high'
          })
          .expect(200)

        expect(response.body).toMatchObject({
          success: true,
          data: updatedList,
          message: 'List updated successfully',
          correlationId: expect.any(String),
          timestamp: expect.any(String)
        })
      })

      it('should return 404 when list not found for update', async () => {
        (listsService.updateById as jest.Mock).mockResolvedValue(null)

        const response = await request(app)
          .put('/api/lists/550e8400-e29b-41d4-a716-446655440000')
          .send({
            title: 'Updated List'
          })
          .expect(404)

        expect(response.body).toMatchObject({
          success: false,
          message: 'List not found'
        })
      })
    })

    describe('PATCH /api/lists/:id', () => {
      it('should return 200 for partial update', async () => {
        const listId = generateUUID()
        const existingList = { id: listId, title: 'Existing List', status: 'active' };
        const updatedList = { ...existingList, priority: 'high' };
        (listsService.findById as jest.Mock).mockResolvedValue(existingList);
        (listsService.updateById as jest.Mock).mockResolvedValue(updatedList)

        const response = await request(app)
          .patch(`/api/lists/${listId}`)
          .send({
            priority: 'high'
          })
          .expect(200)

        expect(response.body).toMatchObject({
          success: true,
          data: updatedList,
          message: 'List updated successfully',
          correlationId: expect.any(String),
          timestamp: expect.any(String)
        })
      })
    })

    describe('DELETE /api/lists/:id', () => {
      it('should return 200 when list deleted successfully', async () => {
        (listsService.deleteById as jest.Mock).mockResolvedValue(true)

        const response = await request(app)
          .delete('/api/lists/550e8400-e29b-41d4-a716-446655440000')
          .expect(200)

        expect(response.body).toMatchObject({
          success: true,
          message: 'List deleted successfully'
        })
      })

      it('should return 404 when list not found for deletion', async () => {
        (listsService.deleteById as jest.Mock).mockResolvedValue(false)

        const response = await request(app)
          .delete('/api/lists/550e8400-e29b-41d4-a716-446655440000')
          .expect(404)

        expect(response.body).toMatchObject({
          success: false,
          message: 'List not found'
        })
      })
    })

    describe('HEAD /api/lists/:id', () => {
      it('should return 200 when list exists', async () => {
        const listId = '12345678-1234-4123-8123-123456789013'
        ;(listsService.findById as jest.Mock).mockResolvedValue({ id: listId, title: 'Test' })

        await request(app)
          .head(`/api/lists/${listId}`)
          .expect(200)
      })

      it('should return 404 when list does not exist', async () => {
        (listsService.findById as jest.Mock).mockResolvedValue(null)

        await request(app)
          .head('/api/lists/550e8400-e29b-41d4-a716-446655440000')
          .expect(404)
      })
    })
  })

  describe('Items CRUD Operations', () => {
    describe('GET /api/items', () => {
      it('should return 200 with items data', async () => {
        const listId = generateUUID()
        const mockItems = [
          { id: generateUUID(), title: 'Test Item 1', status: 'pending', listId: listId },
          { id: generateUUID(), title: 'Test Item 2', status: 'completed', listId: listId }
        ];
        (itemsService.findAll as jest.Mock).mockResolvedValue(mockItems);
        (itemsService.count as jest.Mock).mockResolvedValue(2)

        const response = await request(app)
          .get('/api/items')
          .expect(200)

        expect(response.body).toMatchObject({
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
      })

      it('should filter items by listId', async () => {
        const listId = generateUUID()
        const mockItems = [{ id: generateUUID(), title: 'Test Item', listId: listId }];
        (itemsService.findByListId as jest.Mock).mockResolvedValue(mockItems)

        const response = await request(app)
          .get(`/api/items?listId=${listId}`)
          .expect(200)

        expect(response.body.data).toEqual(mockItems)
        expect(itemsService.findByListId).toHaveBeenCalledWith(listId)
      })

      it('should filter items by status', async () => {
        const mockItems = [{ id: generateUUID(), title: 'Test Item', status: 'completed' }];
        (itemsService.findByStatus as jest.Mock).mockResolvedValue(mockItems)

        const response = await request(app)
          .get('/api/items?status=completed')
          .expect(200)

        expect(response.body.data).toEqual(mockItems)
        expect(itemsService.findByStatus).toHaveBeenCalledWith('completed')
      })
    })

    describe('GET /api/items/:id', () => {
      it('should return 200 with item data when found', async () => {
        const itemId = generateUUID()
        const mockItem = { id: itemId, title: 'Test Item', status: 'pending' };
        (itemsService.findById as jest.Mock).mockResolvedValue(mockItem)

        const response = await request(app)
          .get(`/api/items/${itemId}`)
          .expect(200)

        expect(response.body).toMatchObject({
          success: true,
          data: mockItem,
          message: 'Item found',
          correlationId: expect.any(String),
          timestamp: expect.any(String)
        })
      })

      it('should return 404 when item not found', async () => {
        const itemId = '12345678-1234-4123-8123-123456789014'
        ;(itemsService.findById as jest.Mock).mockResolvedValue(null)

        const response = await request(app)
          .get(`/api/items/${itemId}`)
          .expect(404)

        expect(response.body).toMatchObject({
          success: false,
          message: 'Item not found',
          correlationId: expect.any(String),
          timestamp: expect.any(String)
        })
      })

      it('should include dependencies when requested', async () => {
        const itemId = generateUUID()
        const mockItem = { id: itemId, title: 'Test Item' }
        const mockDependencies = [{ id: generateUUID(), title: 'Dependency' }]
        const mockDependents = [{ id: generateUUID(), title: 'Dependent' }];
        (itemsService.findById as jest.Mock).mockResolvedValue(mockItem);
        (itemsService.getDependencies as jest.Mock).mockResolvedValue(mockDependencies);
        (itemsService.getDependents as jest.Mock).mockResolvedValue(mockDependents)

        const response = await request(app)
          .get(`/api/items/${itemId}?include=dependencies`)
          .expect(200)

        expect(response.body.data).toMatchObject({
          ...mockItem,
          dependencies: mockDependencies,
          dependents: mockDependents
        })
      })
    })

    describe('POST /api/items', () => {
      it('should return 201 when item created successfully', async () => {
        const itemId = generateUUID()
        const listId = generateUUID()
        const newItem = {
          id: itemId,
          title: 'New Item',
          listId: listId,
          status: 'pending'
        };
        (itemsService.create as jest.Mock).mockResolvedValue(newItem)

        const response = await request(app)
          .post('/api/items')
          .send({
            listId: listId,
            title: 'New Item',
            description: 'Test description',
            priority: 'medium'
          })
          .expect(201)

        expect(response.body).toMatchObject({
          success: true,
          data: newItem,
          message: 'Item created successfully',
          correlationId: expect.any(String),
          timestamp: expect.any(String)
        })
      })

      it('should return 400 for missing required fields', async () => {
        const response = await request(app)
          .post('/api/items')
          .send({
            title: 'Missing listId'
          })
          .expect(400)

        expect(response.body).toMatchObject({
          success: false,
          message: 'Validation failed'
        })
      })
    })

    describe('PUT /api/items/:id', () => {
      it('should return 200 when item updated successfully', async () => {
        const itemId = generateUUID()
        const updatedItem = {
          id: itemId,
          title: 'Updated Item',
          status: 'in_progress'
        };
        (itemsService.updateById as jest.Mock).mockResolvedValue(updatedItem)

        const response = await request(app)
          .put(`/api/items/${itemId}`)
          .send({
            title: 'Updated Item',
            status: 'in_progress'
          })
          .expect(200)

        expect(response.body).toMatchObject({
          success: true,
          data: updatedItem,
          message: 'Item updated successfully',
          correlationId: expect.any(String),
          timestamp: expect.any(String)
        })
      })
    })

    describe('DELETE /api/items/:id', () => {
      it('should return 200 when item deleted successfully', async () => {
        (itemsService.deleteById as jest.Mock).mockResolvedValue(true)

        const response = await request(app)
          .delete('/api/items/550e8400-e29b-41d4-a716-446655440000')
          .expect(200)

        expect(response.body).toMatchObject({
          success: true,
          message: 'Item deleted successfully'
        })
      })
    })

    describe('POST /api/items/:id/complete', () => {
      it('should return 200 when item completed successfully', async () => {
        const itemId = generateUUID()
        const completedItem = {
          id: itemId,
          title: 'Test Item',
          status: 'completed',
          completedAt: new Date().toISOString()
        };
        (itemsService.markCompleted as jest.Mock).mockResolvedValue(completedItem)

        const response = await request(app)
          .post(`/api/items/${itemId}/complete`)
          .expect(200)

        expect(response.body).toMatchObject({
          success: true,
          data: completedItem,
          message: 'Item marked as completed',
          correlationId: expect.any(String),
          timestamp: expect.any(String)
        })
      })
    })

    describe('POST /api/items/:id/start', () => {
      it('should return 200 when item started successfully', async () => {
        const itemId = generateUUID()
        const startedItem = {
          id: itemId,
          title: 'Test Item',
          status: 'in_progress'
        };
        (itemsService.canStart as jest.Mock).mockResolvedValue(true);
        (itemsService.markInProgress as jest.Mock).mockResolvedValue(startedItem)

        const response = await request(app)
          .post(`/api/items/${itemId}/start`)
          .expect(200)

        expect(response.body).toMatchObject({
          success: true,
          data: startedItem,
          message: 'Item started',
          correlationId: expect.any(String),
          timestamp: expect.any(String)
        })
      })

      it('should return 400 when dependencies not completed', async () => {
        const itemId = '12345678-1234-4123-8123-123456789015'
        ;(itemsService.canStart as jest.Mock).mockResolvedValue(false)

        const response = await request(app)
          .post(`/api/items/${itemId}/start`)
          .expect(400)

        expect(response.body).toMatchObject({
          success: false,
          message: 'Cannot start item: dependencies not completed',
          error: 'Dependency error',
          correlationId: expect.any(String),
          timestamp: expect.any(String)
        })
      })
    })

    describe('POST /api/items/:id/move', () => {
      it('should return 200 when item moved successfully', async () => {
        const itemId = generateUUID()
        const newListId = generateUUID()
        const movedItem = {
          id: itemId,
          title: 'Test Item',
          listId: newListId
        };
        (itemsService.moveToList as jest.Mock).mockResolvedValue(movedItem)

        const response = await request(app)
          .post(`/api/items/${itemId}/move`)
          .send({
            listId: newListId
          })
          .expect(200)

        expect(response.body).toMatchObject({
          success: true,
          data: movedItem,
          message: 'Item moved successfully',
          correlationId: expect.any(String),
          timestamp: expect.any(String)
        })
      })

      it('should return 400 for missing listId', async () => {
        const itemId = generateUUID()
        const response = await request(app)
          .post(`/api/items/${itemId}/move`)
          .send({})
          .expect(400)

        expect(response.body).toMatchObject({
          success: false,
          message: 'Validation failed',
          correlationId: expect.any(String),
          timestamp: expect.any(String)
        })
      })
    })
  })

  describe('Error Handling', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .expect(404)

      expect(response.body).toMatchObject({
        success: false,
        message: 'The requested resource was not found',
        error: 'NOT_FOUND',
        correlationId: expect.any(String)
      })
    })

    it('should return 500 for server errors', async () => {
      (listsService.findWithItemCounts as jest.Mock).mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .get('/api/lists')
        .expect(500)

      expect(response.body).toMatchObject({
        success: false,
        message: 'Failed to list List',
        error: 'Internal server error',
        correlationId: expect.any(String)
      })
    })

    it('should include correlation ID in all responses', async () => {
      (listsService.findById as jest.Mock).mockResolvedValue(null)

      const response = await request(app)
        .get('/api/lists/550e8400-e29b-41d4-a716-446655440000')
        .expect(404)

      expect(response.body.correlationId).toBe('test-correlation-id')
    })
  })
})

import request from 'supertest'
import express from 'express'
import { listsController } from '../../controllers/lists'
import { itemsController } from '../../controllers/items'
import { validateBody, validateParams, validateQuery, rateLimitValidation } from '../../middleware/validation'
import { errorHandler, notFoundHandler, asyncHandler } from '../../middleware/errorHandler'
import { listSchemas, itemSchemas, actionSchemas } from '../../validation/schemas'
import { listsService, itemsService } from '../../db/services'

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
          { id: '1', title: 'Test List 1', status: 'active' },
          { id: '2', title: 'Test List 2', status: 'active' }
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
          correlationId: 'test-correlation-id',
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
          correlationId: 'test-correlation-id',
          timestamp: expect.any(String)
        })
      })
    })

    describe('GET /api/lists/:id', () => {
      it('should return 200 with list data when found', async () => {
        const mockList = { id: '1', title: 'Test List', status: 'active' };
        (listsService.findById as jest.Mock).mockResolvedValue(mockList)

        const response = await request(app)
          .get('/api/lists/550e8400-e29b-41d4-a716-446655440000')
          .expect(200)

        expect(response.body).toMatchObject({
          success: true,
          data: mockList,
          message: 'List found',
          correlationId: 'test-correlation-id'
        })
      })

      it('should return 404 when list not found', async () => {
        (listsService.findById as jest.Mock).mockResolvedValue(null)

        const response = await request(app)
          .get('/api/lists/550e8400-e29b-41d4-a716-446655440000')
          .expect(404)

        expect(response.body).toMatchObject({
          success: false,
          message: 'List not found',
          error: 'The requested resource was not found',
          correlationId: 'test-correlation-id'
        })
      })

      it('should return 400 for invalid UUID', async () => {
        const response = await request(app)
          .get('/api/lists/invalid-uuid')
          .expect(400)

        expect(response.body).toMatchObject({
          success: false,
          message: 'Validation failed',
          error: expect.stringContaining('Invalid UUID format')
        })
      })
    })

    describe('POST /api/lists', () => {
      it('should return 201 when list created successfully', async () => {
        const newList = {
          id: '550e8400-e29b-41d4-a716-446655440000',
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
          correlationId: 'test-correlation-id'
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
          error: expect.stringContaining('Title is required')
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
        const updatedList = {
          id: '550e8400-e29b-41d4-a716-446655440000',
          title: 'Updated List',
          status: 'active'
        };
        (listsService.updateById as jest.Mock).mockResolvedValue(updatedList)

        const response = await request(app)
          .put('/api/lists/550e8400-e29b-41d4-a716-446655440000')
          .send({
            title: 'Updated List',
            priority: 'high'
          })
          .expect(200)

        expect(response.body).toMatchObject({
          success: true,
          data: updatedList,
          message: 'List updated successfully'
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
        const existingList = { id: '1', title: 'Existing List', status: 'active' };
        const updatedList = { ...existingList, priority: 'high' };
        (listsService.findById as jest.Mock).mockResolvedValue(existingList);
        (listsService.updateById as jest.Mock).mockResolvedValue(updatedList)

        const response = await request(app)
          .patch('/api/lists/550e8400-e29b-41d4-a716-446655440000')
          .send({
            priority: 'high'
          })
          .expect(200)

        expect(response.body).toMatchObject({
          success: true,
          data: updatedList,
          message: 'List updated successfully'
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
        (listsService.findById as jest.Mock).mockResolvedValue({ id: '1', title: 'Test' })

        await request(app)
          .head('/api/lists/550e8400-e29b-41d4-a716-446655440000')
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
        const mockItems = [
          { id: '1', title: 'Test Item 1', status: 'pending', listId: 'list-1' },
          { id: '2', title: 'Test Item 2', status: 'completed', listId: 'list-1' }
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
          pagination: {
            page: 1,
            limit: 20,
            total: 2,
            totalPages: 1
          }
        })
      })

      it('should filter items by listId', async () => {
        const mockItems = [{ id: '1', title: 'Test Item', listId: 'list-1' }];
        (itemsService.findByListId as jest.Mock).mockResolvedValue(mockItems)

        const response = await request(app)
          .get('/api/items?listId=550e8400-e29b-41d4-a716-446655440000')
          .expect(200)

        expect(response.body.data).toEqual(mockItems)
        expect(itemsService.findByListId).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000')
      })

      it('should filter items by status', async () => {
        const mockItems = [{ id: '1', title: 'Test Item', status: 'completed' }];
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
        const mockItem = { id: '1', title: 'Test Item', status: 'pending' };
        (itemsService.findById as jest.Mock).mockResolvedValue(mockItem)

        const response = await request(app)
          .get('/api/items/550e8400-e29b-41d4-a716-446655440000')
          .expect(200)

        expect(response.body).toMatchObject({
          success: true,
          data: mockItem,
          message: 'Item found'
        })
      })

      it('should return 404 when item not found', async () => {
        (itemsService.findById as jest.Mock).mockResolvedValue(null)

        const response = await request(app)
          .get('/api/items/550e8400-e29b-41d4-a716-446655440000')
          .expect(404)

        expect(response.body).toMatchObject({
          success: false,
          message: 'Item not found'
        })
      })

      it('should include dependencies when requested', async () => {
        const mockItem = { id: '1', title: 'Test Item' }
        const mockDependencies = [{ id: '2', title: 'Dependency' }]
        const mockDependents = [{ id: '3', title: 'Dependent' }];
        (itemsService.findById as jest.Mock).mockResolvedValue(mockItem);
        (itemsService.getDependencies as jest.Mock).mockResolvedValue(mockDependencies);
        (itemsService.getDependents as jest.Mock).mockResolvedValue(mockDependents)

        const response = await request(app)
          .get('/api/items/550e8400-e29b-41d4-a716-446655440000?include=dependencies')
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
        const newItem = {
          id: '550e8400-e29b-41d4-a716-446655440000',
          title: 'New Item',
          listId: 'list-1',
          status: 'pending'
        };
        (itemsService.create as jest.Mock).mockResolvedValue(newItem)

        const response = await request(app)
          .post('/api/items')
          .send({
            listId: '550e8400-e29b-41d4-a716-446655440000',
            title: 'New Item',
            description: 'Test description',
            priority: 'medium'
          })
          .expect(201)

        expect(response.body).toMatchObject({
          success: true,
          data: newItem,
          message: 'Item created successfully'
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
        const updatedItem = {
          id: '550e8400-e29b-41d4-a716-446655440000',
          title: 'Updated Item',
          status: 'in_progress'
        };
        (itemsService.updateById as jest.Mock).mockResolvedValue(updatedItem)

        const response = await request(app)
          .put('/api/items/550e8400-e29b-41d4-a716-446655440000')
          .send({
            title: 'Updated Item',
            status: 'in_progress'
          })
          .expect(200)

        expect(response.body).toMatchObject({
          success: true,
          data: updatedItem,
          message: 'Item updated successfully'
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
        const completedItem = {
          id: '550e8400-e29b-41d4-a716-446655440000',
          title: 'Test Item',
          status: 'completed',
          completedAt: new Date()
        };
        (itemsService.markCompleted as jest.Mock).mockResolvedValue(completedItem)

        const response = await request(app)
          .post('/api/items/550e8400-e29b-41d4-a716-446655440000/complete')
          .expect(200)

        expect(response.body).toMatchObject({
          success: true,
          data: completedItem,
          message: 'Item marked as completed'
        })
      })
    })

    describe('POST /api/items/:id/start', () => {
      it('should return 200 when item started successfully', async () => {
        const startedItem = {
          id: '550e8400-e29b-41d4-a716-446655440000',
          title: 'Test Item',
          status: 'in_progress'
        };
        (itemsService.canStart as jest.Mock).mockResolvedValue(true);
        (itemsService.markInProgress as jest.Mock).mockResolvedValue(startedItem)

        const response = await request(app)
          .post('/api/items/550e8400-e29b-41d4-a716-446655440000/start')
          .expect(200)

        expect(response.body).toMatchObject({
          success: true,
          data: startedItem,
          message: 'Item started'
        })
      })

      it('should return 400 when dependencies not completed', async () => {
        (itemsService.canStart as jest.Mock).mockResolvedValue(false)

        const response = await request(app)
          .post('/api/items/550e8400-e29b-41d4-a716-446655440000/start')
          .expect(400)

        expect(response.body).toMatchObject({
          success: false,
          message: 'Validation failed',
          error: 'Cannot start item: dependencies not completed'
        })
      })
    })

    describe('POST /api/items/:id/move', () => {
      it('should return 200 when item moved successfully', async () => {
        const movedItem = {
          id: '550e8400-e29b-41d4-a716-446655440000',
          title: 'Test Item',
          listId: 'new-list-id'
        };
        (itemsService.moveToList as jest.Mock).mockResolvedValue(movedItem)

        const response = await request(app)
          .post('/api/items/550e8400-e29b-41d4-a716-446655440000/move')
          .send({
            listId: '550e8400-e29b-41d4-a716-446655440001'
          })
          .expect(200)

        expect(response.body).toMatchObject({
          success: true,
          data: movedItem,
          message: 'Item moved successfully'
        })
      })

      it('should return 400 for missing listId', async () => {
        const response = await request(app)
          .post('/api/items/550e8400-e29b-41d4-a716-446655440000/move')
          .send({})
          .expect(400)

        expect(response.body).toMatchObject({
          success: false,
          message: 'Validation failed'
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
        error: 'NOT_FOUND'
      })
    })

    it('should return 500 for server errors', async () => {
      (listsService.findAll as jest.Mock).mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .get('/api/lists')
        .expect(500)

      expect(response.body).toMatchObject({
        success: false,
        message: 'Failed to list List',
        error: 'Internal server error'
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

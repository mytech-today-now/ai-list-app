import request from 'supertest'
import express from 'express'
import { randomUUID } from 'crypto'
import bulkRouter from '../../routes/bulk'
import { itemsService, listsService } from '../../db/services'
import { errorHandler, notFoundHandler } from '../../middleware/errorHandler'

// Mock the database services
jest.mock('../../db/services', () => ({
  itemsService: {
    bulkCreate: jest.fn(),
    bulkUpdate: jest.fn(),
    bulkDelete: jest.fn(),
    bulkUpdateStatus: jest.fn(),
    bulkMoveToList: jest.fn()
  },
  listsService: {
    bulkCreate: jest.fn(),
    bulkUpdate: jest.fn(),
    bulkDelete: jest.fn(),
    bulkUpdateStatus: jest.fn()
  }
}))

// Create test app
const createTestApp = () => {
  const app = express()
  app.use(express.json())
  app.use('/api/bulk', bulkRouter)
  app.use(notFoundHandler)
  app.use(errorHandler)
  return app
}

describe('Bulk Operations Integration Tests', () => {
  let app: express.Application
  const mockCorrelationId = randomUUID()
  const mockUserId = 'test-user-123'
  const mockAgentId = 'test-agent-456'

  beforeEach(() => {
    app = createTestApp()
    jest.clearAllMocks()
  })

  const defaultHeaders = {
    'Content-Type': 'application/json',
    'X-Correlation-ID': mockCorrelationId,
    'X-User-ID': mockUserId,
    'X-Agent-ID': mockAgentId
  }

  describe('Bulk Item Operations', () => {
    describe('POST /api/bulk/items/create', () => {
      it('should successfully create multiple items', async () => {
        const mockResult = {
          success: true,
          results: [
            { id: 'item-1', title: 'Item 1', listId: 'list-1' },
            { id: 'item-2', title: 'Item 2', listId: 'list-1' }
          ],
          errors: [],
          summary: { total: 2, successful: 2, failed: 0 }
        }

        ;(itemsService.bulkCreate as jest.Mock).mockResolvedValue(mockResult)

        const requestBody = {
          items: [
            { title: 'Item 1', listId: 'list-1' },
            { title: 'Item 2', listId: 'list-1' }
          ],
          options: { continueOnError: false }
        }

        const response = await request(app)
          .post('/api/bulk/items/create')
          .set(defaultHeaders)
          .send(requestBody)

        expect(response.status).toBe(201)
        expect(response.body.success).toBe(true)
        expect(response.body.data.results).toHaveLength(2)
        expect(response.body.data.summary.successful).toBe(2)
        expect(response.body.correlationId).toBe(mockCorrelationId)
        expect(itemsService.bulkCreate).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              title: 'Item 1',
              listId: 'list-1',
              id: expect.any(String),
              createdBy: mockUserId
            })
          ]),
          expect.objectContaining({ continueOnError: false })
        )
      })

      it('should handle partial success with 207 status', async () => {
        const mockResult = {
          success: false,
          results: [{ id: 'item-1', title: 'Item 1', listId: 'list-1' }],
          errors: [{ index: 1, error: 'Validation failed', details: {} }],
          summary: { total: 2, successful: 1, failed: 1 }
        }

        ;(itemsService.bulkCreate as jest.Mock).mockResolvedValue(mockResult)

        const requestBody = {
          items: [
            { title: 'Item 1', listId: 'list-1' },
            { title: '', listId: 'list-1' } // Invalid item
          ],
          options: { continueOnError: true }
        }

        const response = await request(app)
          .post('/api/bulk/items/create')
          .set(defaultHeaders)
          .send(requestBody)

        expect(response.status).toBe(207)
        expect(response.body.success).toBe(false)
        expect(response.body.data.summary.successful).toBe(1)
        expect(response.body.data.summary.failed).toBe(1)
        expect(response.body.data.errors).toHaveLength(1)
      })

      it('should validate request body', async () => {
        const response = await request(app)
          .post('/api/bulk/items/create')
          .set(defaultHeaders)
          .send({ items: [] }) // Empty array should fail validation

        expect(response.status).toBe(400)
        expect(response.body.success).toBe(false)
        expect(response.body.error).toBe('Validation error')
      })

      it('should enforce maximum item limit', async () => {
        const items = Array.from({ length: 101 }, (_, i) => ({
          title: `Item ${i}`,
          listId: 'list-1'
        }))

        const response = await request(app)
          .post('/api/bulk/items/create')
          .set(defaultHeaders)
          .send({ items })

        expect(response.status).toBe(400)
        expect(response.body.success).toBe(false)
        expect(response.body.error).toBe('Validation error')
      })
    })

    describe('PUT /api/bulk/items/update', () => {
      it('should successfully update multiple items', async () => {
        const mockResult = {
          success: true,
          results: [
            { id: 'item-1', title: 'Updated Item 1' },
            { id: 'item-2', title: 'Updated Item 2' }
          ],
          errors: [],
          summary: { total: 2, successful: 2, failed: 0 }
        }

        ;(itemsService.bulkUpdate as jest.Mock).mockResolvedValue(mockResult)

        const requestBody = {
          updates: [
            { id: 'item-1', data: { title: 'Updated Item 1' } },
            { id: 'item-2', data: { title: 'Updated Item 2' } }
          ]
        }

        const response = await request(app)
          .put('/api/bulk/items/update')
          .set(defaultHeaders)
          .send(requestBody)

        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
        expect(response.body.data.results).toHaveLength(2)
        expect(itemsService.bulkUpdate).toHaveBeenCalled()
      })

      it('should handle item not found errors', async () => {
        const mockResult = {
          success: false,
          results: [{ id: 'item-1', title: 'Updated Item 1' }],
          errors: [{ index: 1, id: 'item-2', error: 'Record not found' }],
          summary: { total: 2, successful: 1, failed: 1 }
        }

        ;(itemsService.bulkUpdate as jest.Mock).mockResolvedValue(mockResult)

        const requestBody = {
          updates: [
            { id: 'item-1', data: { title: 'Updated Item 1' } },
            { id: 'item-2', data: { title: 'Updated Item 2' } }
          ],
          options: { continueOnError: true }
        }

        const response = await request(app)
          .put('/api/bulk/items/update')
          .set(defaultHeaders)
          .send(requestBody)

        expect(response.status).toBe(207)
        expect(response.body.data.errors).toHaveLength(1)
        expect(response.body.data.errors[0].error).toBe('Record not found')
      })
    })

    describe('PATCH /api/bulk/items/status', () => {
      it('should successfully update item status', async () => {
        const mockResult = {
          success: true,
          results: [
            { id: 'item-1', status: 'completed' },
            { id: 'item-2', status: 'completed' }
          ],
          errors: [],
          summary: { total: 2, successful: 2, failed: 0 }
        }

        ;(itemsService.bulkUpdateStatus as jest.Mock).mockResolvedValue(mockResult)

        const requestBody = {
          ids: ['item-1', 'item-2'],
          status: 'completed',
          options: { updateTimestamps: true }
        }

        const response = await request(app)
          .patch('/api/bulk/items/status')
          .set(defaultHeaders)
          .send(requestBody)

        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
        expect(itemsService.bulkUpdateStatus).toHaveBeenCalledWith(
          ['item-1', 'item-2'],
          'completed',
          expect.objectContaining({
            validateDependencies: true,
            updateTimestamps: true
          })
        )
      })

      it('should handle dependency validation errors', async () => {
        const mockResult = {
          success: false,
          results: [],
          errors: [
            { index: 0, id: 'item-1', error: 'Cannot complete item due to incomplete dependencies' }
          ],
          summary: { total: 1, successful: 0, failed: 1 }
        }

        ;(itemsService.bulkUpdateStatus as jest.Mock).mockResolvedValue(mockResult)

        const requestBody = {
          ids: ['item-1'],
          status: 'completed'
        }

        const response = await request(app)
          .patch('/api/bulk/items/status')
          .set(defaultHeaders)
          .send(requestBody)

        expect(response.status).toBe(400)
        expect(response.body.data.errors[0].error).toContain('dependencies')
      })
    })

    describe('PATCH /api/bulk/items/move', () => {
      it('should successfully move items to different list', async () => {
        const mockResult = {
          success: true,
          results: [
            { id: 'item-1', listId: 'list-2' },
            { id: 'item-2', listId: 'list-2' }
          ],
          errors: [],
          summary: { total: 2, successful: 2, failed: 0 }
        }

        ;(itemsService.bulkMoveToList as jest.Mock).mockResolvedValue(mockResult)

        const requestBody = {
          ids: ['item-1', 'item-2'],
          targetListId: 'list-2',
          options: { preservePosition: false }
        }

        const response = await request(app)
          .patch('/api/bulk/items/move')
          .set(defaultHeaders)
          .send(requestBody)

        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
        expect(itemsService.bulkMoveToList).toHaveBeenCalledWith(
          ['item-1', 'item-2'],
          'list-2',
          expect.objectContaining({ preservePosition: false })
        )
      })
    })

    describe('DELETE /api/bulk/items/delete', () => {
      it('should successfully delete multiple items', async () => {
        const mockResult = {
          success: true,
          results: [{ id: 'item-1' }, { id: 'item-2' }],
          errors: [],
          summary: { total: 2, successful: 2, failed: 0 }
        }

        ;(itemsService.bulkDelete as jest.Mock).mockResolvedValue(mockResult)

        const requestBody = {
          ids: ['item-1', 'item-2'],
          options: { force: false }
        }

        const response = await request(app)
          .delete('/api/bulk/items/delete')
          .set(defaultHeaders)
          .send(requestBody)

        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
        expect(itemsService.bulkDelete).toHaveBeenCalledWith(
          ['item-1', 'item-2'],
          expect.objectContaining({ batchSize: 50 })
        )
      })
    })
  })

  describe('Bulk List Operations', () => {
    describe('POST /api/bulk/lists/create', () => {
      it('should successfully create multiple lists', async () => {
        const mockResult = {
          success: true,
          results: [
            { id: 'list-1', title: 'List 1' },
            { id: 'list-2', title: 'List 2' }
          ],
          errors: [],
          summary: { total: 2, successful: 2, failed: 0 }
        }

        ;(listsService.bulkCreate as jest.Mock).mockResolvedValue(mockResult)

        const requestBody = {
          lists: [
            { title: 'List 1', description: 'First list' },
            { title: 'List 2', description: 'Second list' }
          ],
          options: { validateHierarchy: true }
        }

        const response = await request(app)
          .post('/api/bulk/lists/create')
          .set(defaultHeaders)
          .send(requestBody)

        expect(response.status).toBe(201)
        expect(response.body.success).toBe(true)
        expect(response.body.data.results).toHaveLength(2)
        expect(listsService.bulkCreate).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              title: 'List 1',
              id: expect.any(String),
              createdBy: mockUserId
            })
          ]),
          expect.objectContaining({ batchSize: 25 })
        )
      })

      it('should enforce maximum list limit', async () => {
        const lists = Array.from({ length: 51 }, (_, i) => ({
          title: `List ${i}`
        }))

        const response = await request(app)
          .post('/api/bulk/lists/create')
          .set(defaultHeaders)
          .send({ lists })

        expect(response.status).toBe(400)
        expect(response.body.success).toBe(false)
        expect(response.body.error).toBe('Validation error')
      })
    })

    describe('PUT /api/bulk/lists/update', () => {
      it('should successfully update multiple lists', async () => {
        const mockResult = {
          success: true,
          results: [
            { id: 'list-1', title: 'Updated List 1' },
            { id: 'list-2', title: 'Updated List 2' }
          ],
          errors: [],
          summary: { total: 2, successful: 2, failed: 0 }
        }

        ;(listsService.bulkUpdate as jest.Mock).mockResolvedValue(mockResult)

        const requestBody = {
          updates: [
            { id: 'list-1', data: { title: 'Updated List 1' } },
            { id: 'list-2', data: { title: 'Updated List 2' } }
          ],
          options: { validateHierarchy: true }
        }

        const response = await request(app)
          .put('/api/bulk/lists/update')
          .set(defaultHeaders)
          .send(requestBody)

        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
        expect(listsService.bulkUpdate).toHaveBeenCalled()
      })
    })

    describe('PATCH /api/bulk/lists/status', () => {
      it('should successfully update list status', async () => {
        const mockResult = {
          success: true,
          results: [
            { id: 'list-1', status: 'archived' },
            { id: 'list-2', status: 'archived' }
          ],
          errors: [],
          summary: { total: 2, successful: 2, failed: 0 }
        }

        ;(listsService.bulkUpdateStatus as jest.Mock).mockResolvedValue(mockResult)

        const requestBody = {
          ids: ['list-1', 'list-2'],
          status: 'archived',
          options: { cascadeToItems: true }
        }

        const response = await request(app)
          .patch('/api/bulk/lists/status')
          .set(defaultHeaders)
          .send(requestBody)

        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
        expect(listsService.bulkUpdateStatus).toHaveBeenCalledWith(
          ['list-1', 'list-2'],
          'archived',
          expect.objectContaining({
            validateHierarchy: true,
            cascadeToItems: true
          })
        )
      })

      it('should handle hierarchy validation errors', async () => {
        const mockResult = {
          success: false,
          results: [],
          errors: [
            { index: 0, id: 'list-1', error: 'Cannot archived list with active children' }
          ],
          summary: { total: 1, successful: 0, failed: 1 }
        }

        ;(listsService.bulkUpdateStatus as jest.Mock).mockResolvedValue(mockResult)

        const requestBody = {
          ids: ['list-1'],
          status: 'archived'
        }

        const response = await request(app)
          .patch('/api/bulk/lists/status')
          .set(defaultHeaders)
          .send(requestBody)

        expect(response.status).toBe(400)
        expect(response.body.data.errors[0].error).toContain('children')
      })
    })

    describe('DELETE /api/bulk/lists/delete', () => {
      it('should successfully delete multiple lists', async () => {
        const mockResult = {
          success: true,
          results: [{ id: 'list-1' }, { id: 'list-2' }],
          errors: [],
          summary: { total: 2, successful: 2, failed: 0 }
        }

        ;(listsService.bulkDelete as jest.Mock).mockResolvedValue(mockResult)

        const requestBody = {
          ids: ['list-1', 'list-2'],
          options: { force: false, deleteItems: false }
        }

        const response = await request(app)
          .delete('/api/bulk/lists/delete')
          .set(defaultHeaders)
          .send(requestBody)

        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
        expect(listsService.bulkDelete).toHaveBeenCalledWith(
          ['list-1', 'list-2'],
          expect.objectContaining({ batchSize: 25 })
        )
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle server errors gracefully', async () => {
      ;(itemsService.bulkCreate as jest.Mock).mockRejectedValue(new Error('Database connection failed'))

      const requestBody = {
        items: [{ title: 'Test Item', listId: 'list-1' }]
      }

      const response = await request(app)
        .post('/api/bulk/items/create')
        .set(defaultHeaders)
        .send(requestBody)

      expect(response.status).toBe(500)
      expect(response.body.success).toBe(false)
      expect(response.body.error).toBe('Server error')
      expect(response.body.correlationId).toBe(mockCorrelationId)
    })

    it('should include correlation ID in all responses', async () => {
      const mockResult = {
        success: true,
        results: [],
        errors: [],
        summary: { total: 0, successful: 0, failed: 0 }
      }

      ;(itemsService.bulkCreate as jest.Mock).mockResolvedValue(mockResult)

      const response = await request(app)
        .post('/api/bulk/items/create')
        .set(defaultHeaders)
        .send({ items: [] })

      expect(response.status).toBe(400) // Validation error for empty array
      expect(response.body.correlationId).toBeDefined()
    })
  })
})

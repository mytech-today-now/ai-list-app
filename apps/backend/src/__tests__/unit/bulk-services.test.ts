import { BaseService, BulkOperationResult } from '../../db/services/base'
import { ItemsService } from '../../db/services/items'
import { ListsService } from '../../db/services/lists'

// Mock the database connection
jest.mock('../../db/connection', () => ({
  getDb: jest.fn(() => ({
    insert: jest.fn().mockReturnValue({
      values: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([])
      })
    }),
    update: jest.fn().mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([])
        })
      })
    }),
    delete: jest.fn().mockReturnValue({
      where: jest.fn().mockResolvedValue({ changes: 1 })
    }),
    select: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([])
      })
    }),
    transaction: jest.fn((callback) => callback({
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([])
        })
      }),
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([])
          })
        })
      }),
      delete: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue({ changes: 1 })
      })
    }))
  }))
}))

describe('Bulk Services Unit Tests', () => {
  describe('BaseService Bulk Operations', () => {
    let service: BaseService<any, any, any>

    beforeEach(() => {
      // Create a concrete implementation for testing
      class TestService extends BaseService<any, any, any> {
        protected table = {} as any
        protected primaryKey = 'id' as const
      }
      service = new TestService()
    })

    describe('bulkCreate', () => {
      it('should handle empty data array', async () => {
        const result = await service.bulkCreate([])

        expect(result.success).toBe(true)
        expect(result.results).toHaveLength(0)
        expect(result.summary.total).toBe(0)
      })

      it('should process data in batches', async () => {
        const mockData = Array.from({ length: 75 }, (_, i) => ({ name: `Item ${i}` }))
        
        // Mock createMany to return the input data with IDs
        jest.spyOn(service, 'createMany').mockImplementation(async (data) => 
          data.map((item, index) => ({ ...item, id: `id-${index}` }))
        )

        const result = await service.bulkCreate(mockData, { batchSize: 50 })

        expect(result.success).toBe(true)
        expect(result.results).toHaveLength(75)
        expect(result.summary.total).toBe(75)
        expect(result.summary.successful).toBe(75)
        expect(result.summary.failed).toBe(0)
        expect(service.createMany).toHaveBeenCalledTimes(2) // 50 + 25
      })

      it('should handle errors with continueOnError=true', async () => {
        const mockData = [
          { name: 'Valid Item 1' },
          { name: 'Invalid Item' },
          { name: 'Valid Item 2' }
        ]

        jest.spyOn(service, 'create')
          .mockResolvedValueOnce({ id: '1', name: 'Valid Item 1' })
          .mockRejectedValueOnce(new Error('Validation failed'))
          .mockResolvedValueOnce({ id: '3', name: 'Valid Item 2' })

        const result = await service.bulkCreate(mockData, { continueOnError: true })

        expect(result.success).toBe(false)
        expect(result.results).toHaveLength(2)
        expect(result.errors).toHaveLength(1)
        expect(result.summary.successful).toBe(2)
        expect(result.summary.failed).toBe(1)
        expect(result.errors[0].index).toBe(1)
        expect(result.errors[0].error).toBe('Validation failed')
      })

      it('should stop on first error with continueOnError=false', async () => {
        const mockData = [
          { name: 'Valid Item 1' },
          { name: 'Invalid Item' },
          { name: 'Valid Item 2' }
        ]

        jest.spyOn(service, 'createMany').mockRejectedValue(new Error('Batch failed'))

        const result = await service.bulkCreate(mockData, { continueOnError: false })

        expect(result.success).toBe(false)
        expect(result.results).toHaveLength(0)
        expect(result.errors).toHaveLength(3) // All items in batch marked as failed
        expect(result.summary.successful).toBe(0)
        expect(result.summary.failed).toBe(3)
      })
    })

    describe('bulkUpdate', () => {
      it('should handle empty updates array', async () => {
        const result = await service.bulkUpdate([])

        expect(result.success).toBe(true)
        expect(result.results).toHaveLength(0)
        expect(result.summary.total).toBe(0)
      })

      it('should process updates in batches', async () => {
        const mockUpdates = Array.from({ length: 75 }, (_, i) => ({
          id: `id-${i}`,
          data: { name: `Updated Item ${i}` }
        }))

        jest.spyOn(service, 'updateById').mockImplementation(async (id, data) => 
          ({ id, ...data } as any)
        )

        const result = await service.bulkUpdate(mockUpdates, { batchSize: 50 })

        expect(result.success).toBe(true)
        expect(result.results).toHaveLength(75)
        expect(result.summary.total).toBe(75)
        expect(result.summary.successful).toBe(75)
        expect(result.summary.failed).toBe(0)
      })

      it('should handle record not found errors', async () => {
        const mockUpdates = [
          { id: 'existing-1', data: { name: 'Updated 1' } },
          { id: 'non-existent', data: { name: 'Updated 2' } }
        ]

        jest.spyOn(service, 'updateById')
          .mockResolvedValueOnce({ id: 'existing-1', name: 'Updated 1' })
          .mockResolvedValueOnce(null) // Record not found

        const result = await service.bulkUpdate(mockUpdates, { continueOnError: true })

        expect(result.success).toBe(false)
        expect(result.results).toHaveLength(1)
        expect(result.errors).toHaveLength(1)
        expect(result.errors[0].error).toBe('Record not found')
        expect(result.errors[0].id).toBe('non-existent')
      })
    })

    describe('bulkDelete', () => {
      it('should handle empty IDs array', async () => {
        const result = await service.bulkDelete([])

        expect(result.success).toBe(true)
        expect(result.results).toHaveLength(0)
        expect(result.summary.total).toBe(0)
      })

      it('should process deletes in batches', async () => {
        const mockIds = Array.from({ length: 75 }, (_, i) => `id-${i}`)

        jest.spyOn(service, 'deleteById').mockResolvedValue(true)

        const result = await service.bulkDelete(mockIds, { batchSize: 50 })

        expect(result.success).toBe(true)
        expect(result.results).toHaveLength(75)
        expect(result.summary.total).toBe(75)
        expect(result.summary.successful).toBe(75)
        expect(result.summary.failed).toBe(0)
      })

      it('should handle delete failures', async () => {
        const mockIds = ['existing-1', 'non-existent', 'existing-2']

        jest.spyOn(service, 'deleteById')
          .mockResolvedValueOnce(true)
          .mockResolvedValueOnce(false) // Record not found
          .mockResolvedValueOnce(true)

        const result = await service.bulkDelete(mockIds, { continueOnError: true })

        expect(result.success).toBe(false)
        expect(result.results).toHaveLength(2)
        expect(result.errors).toHaveLength(1)
        expect(result.errors[0].error).toBe('Record not found')
        expect(result.errors[0].id).toBe('non-existent')
      })
    })
  })

  describe('ItemsService Bulk Operations', () => {
    let itemsService: ItemsService

    beforeEach(() => {
      itemsService = new ItemsService()
    })

    describe('bulkUpdateStatus', () => {
      it('should validate dependencies for completed status', async () => {
        const mockIds = ['item-1', 'item-2']

        jest.spyOn(itemsService, 'canStart')
          .mockResolvedValueOnce(true)
          .mockResolvedValueOnce(false)

        jest.spyOn(itemsService, 'getDependencies')
          .mockResolvedValue(['dep-1', 'dep-2'])

        const result = await itemsService.bulkUpdateStatus(
          mockIds, 
          'completed',
          { validateDependencies: true, continueOnError: true }
        )

        expect(result.success).toBe(false)
        expect(result.errors).toHaveLength(1)
        expect(result.errors[0].error).toContain('dependencies')
      })

      it('should skip dependency validation when disabled', async () => {
        const mockIds = ['item-1']

        jest.spyOn(itemsService, 'transaction').mockImplementation(async (callback) => {
          return callback({
            update: jest.fn().mockReturnValue({
              set: jest.fn().mockReturnValue({
                where: jest.fn().mockReturnValue({
                  returning: jest.fn().mockResolvedValue([{ id: 'item-1', status: 'completed' }])
                })
              })
            })
          })
        })

        const result = await itemsService.bulkUpdateStatus(
          mockIds,
          'completed',
          { validateDependencies: false }
        )

        expect(result.success).toBe(true)
        expect(result.results).toHaveLength(1)
      })
    })

    describe('bulkMoveToList', () => {
      it('should update list ID and position', async () => {
        const mockIds = ['item-1', 'item-2']
        const targetListId = 'new-list'

        jest.spyOn(itemsService, 'findById')
          .mockResolvedValueOnce({ id: 'item-1', listId: 'old-list', position: 0 } as any)
          .mockResolvedValueOnce({ id: 'item-2', listId: 'old-list', position: 1 } as any)

        jest.spyOn(itemsService, 'transaction').mockImplementation(async (callback) => {
          return callback({
            select: jest.fn().mockReturnValue({
              from: jest.fn().mockReturnValue({
                where: jest.fn().mockResolvedValue([{ maxPosition: 5 }])
              })
            }),
            update: jest.fn().mockReturnValue({
              set: jest.fn().mockReturnValue({
                where: jest.fn().mockReturnValue({
                  returning: jest.fn().mockResolvedValue([
                    { id: 'item-1', listId: targetListId, position: 6 },
                    { id: 'item-2', listId: targetListId, position: 7 }
                  ])
                })
              })
            })
          })
        })

        const result = await itemsService.bulkMoveToList(
          mockIds,
          targetListId,
          { preservePosition: false }
        )

        expect(result.success).toBe(true)
        expect(result.results).toHaveLength(2)
      })
    })
  })

  describe('ListsService Bulk Operations', () => {
    let listsService: ListsService

    beforeEach(() => {
      listsService = new ListsService()
    })

    describe('bulkUpdateStatus', () => {
      it('should validate hierarchy constraints', async () => {
        const mockIds = ['list-1']

        jest.spyOn(listsService, 'findByParent')
          .mockResolvedValue([{ id: 'child-1' }, { id: 'child-2' }] as any)

        const result = await listsService.bulkUpdateStatus(
          mockIds,
          'deleted',
          { validateHierarchy: true }
        )

        expect(result.success).toBe(false)
        expect(result.errors).toHaveLength(1)
        expect(result.errors[0].error).toContain('children')
      })

      it('should cascade status to items when requested', async () => {
        const mockIds = ['list-1']

        jest.spyOn(listsService, 'findByParent').mockResolvedValue([])
        jest.spyOn(listsService, 'transaction').mockImplementation(async (callback) => {
          return callback({
            update: jest.fn().mockReturnValue({
              set: jest.fn().mockReturnValue({
                where: jest.fn().mockReturnValue({
                  returning: jest.fn().mockResolvedValue([{ id: 'list-1', status: 'completed' }])
                })
              })
            })
          })
        })

        const result = await listsService.bulkUpdateStatus(
          mockIds,
          'completed',
          { cascadeToItems: true }
        )

        expect(result.success).toBe(true)
        expect(result.results).toHaveLength(1)
      })
    })
  })
})

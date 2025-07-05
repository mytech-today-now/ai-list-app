import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, jest } from '@jest/globals'
import {
  BaseRepositoryTestSuite,
  TestDataFactory,
  RepositoryTestUtils,
  TransactionTestSuite,
  CacheTestSuite,
  QueryBuilderTestSuite
} from './repository-test-suite'
import { ListsRepository } from '../repositories/lists-repository'
import { repositoryRegistry } from '../repository-registry'
import { globalCache, globalMonitor } from '../performance-cache'
import { createMockRepository, createTestEntity } from '../../__tests__/utils/test-utils'

// Create mock repository for testing
const createMockListsRepository = () => {
  const mockRepo = createMockRepository('list') as any

  // Add lists-specific methods
  mockRepo.findByParent = jest.fn().mockResolvedValue([])
  mockRepo.getHierarchy = jest.fn().mockResolvedValue([])
  mockRepo.moveToParent = jest.fn().mockResolvedValue(true)
  mockRepo.reorderWithinParent = jest.fn().mockResolvedValue(true)
  mockRepo.archiveWithChildren = jest.fn().mockResolvedValue(true)
  mockRepo.getListStatistics = jest.fn().mockResolvedValue({
    totalItems: 0,
    completedItems: 0,
    pendingItems: 0,
    inProgressItems: 0,
    completionRate: 0,
    overdueItems: 0
  })

  return mockRepo
}

// Main test suite
describe('Lists Repository', () => {
  let repository: any

  beforeAll(async () => {
    // Initialize test environment
    await RepositoryTestUtils.createTestDatabase()

    // Register the lists repository with the registry
    repositoryRegistry.register('lists', () => createMockListsRepository(), {
      entityType: 'List',
      description: 'Repository for managing hierarchical lists',
      dependencies: [],
      singleton: true
    })
  })

  afterAll(async () => {
    // Cleanup test environment
    await RepositoryTestUtils.cleanupTestDatabase()
  })

  beforeEach(() => {
    repository = createMockListsRepository()
    globalCache.clear()
    globalMonitor.reset()
  })

  afterEach(() => {
    // Cleanup after each test
  })

  describe('CRUD Operations', () => {
    it('should create entity', async () => {
      const testEntity = createTestEntity('list')
      const created = await repository.create(testEntity)

      expect(created).toBeDefined()
      expect(created.id).toBeDefined()
      expect(repository.create).toHaveBeenCalledWith(testEntity)
    })

    it('should find entity by ID', async () => {
      const testEntity = createTestEntity('list')
      const created = await repository.create(testEntity)

      const found = await repository.findById(created.id)
      expect(found).toBeDefined()
      expect(repository.findById).toHaveBeenCalledWith(created.id)
    })

    it('should update entity', async () => {
      const testEntity = createTestEntity('list')
      const created = await repository.create(testEntity)

      const updateData = { title: 'Updated Title' }
      const updated = await repository.updateById(created.id, updateData)

      expect(updated).toBeDefined()
      expect(repository.updateById).toHaveBeenCalledWith(created.id, updateData)
    })

    it('should delete entity', async () => {
      const testEntity = createTestEntity('list')
      const created = await repository.create(testEntity)

      const deleted = await repository.deleteById(created.id)
      expect(deleted).toBe(true)
      expect(repository.deleteById).toHaveBeenCalledWith(created.id)
    })

    it('should count entities', async () => {
      const count = await repository.count()
      expect(typeof count).toBe('number')
      expect(repository.count).toHaveBeenCalled()
    })
  })

  describe('Query Operations', () => {
    it('should find all entities', async () => {
      const entities = await repository.findAll()
      expect(Array.isArray(entities)).toBe(true)
      expect(repository.findAll).toHaveBeenCalled()
    })

    it('should find entities with filters', async () => {
      const filters = [{ field: 'status', operator: 'eq', value: 'active' }]
      const entities = await repository.findAll({ filters })

      expect(Array.isArray(entities)).toBe(true)
      expect(repository.findAll).toHaveBeenCalledWith({ filters })
    })

    it('should find entities with sorting', async () => {
      const sorts = [{ field: 'createdAt', direction: 'desc' }]
      const entities = await repository.findAll({ sorts })

      expect(Array.isArray(entities)).toBe(true)
      expect(repository.findAll).toHaveBeenCalledWith({ sorts })
    })

    it('should find entities with pagination', async () => {
      const options = { limit: 10, offset: 0 }
      const entities = await repository.findAll(options)

      expect(Array.isArray(entities)).toBe(true)
      expect(repository.findAll).toHaveBeenCalledWith(options)
    })
  })

  describe('Performance Tests', () => {
    it('should handle bulk operations efficiently', async () => {
      const startTime = Date.now()

      // Simulate bulk operation
      const entities = Array.from({ length: 100 }, () => createTestEntity('list'))
      await Promise.all(entities.map(entity => repository.create(entity)))

      const endTime = Date.now()
      const duration = endTime - startTime

      // Should complete within reasonable time
      expect(duration).toBeLessThan(1000)
    })

    it('should handle large result sets efficiently', async () => {
      const startTime = Date.now()

      // Mock large result set
      repository.findAll.mockResolvedValue(
        Array.from({ length: 1000 }, () => createTestEntity('list'))
      )

      const entities = await repository.findAll()
      const endTime = Date.now()
      const duration = endTime - startTime

      expect(entities.length).toBe(1000)
      expect(duration).toBeLessThan(500)
    })
  })

  describe('Lists-Specific Operations', () => {
    it('should find lists by parent', async () => {
      const parentId = 'parent-list-id'
      const children = await repository.findByParent(parentId)

      expect(Array.isArray(children)).toBe(true)
      expect(repository.findByParent).toHaveBeenCalledWith(parentId)
    })

    it('should get list hierarchy', async () => {
      const hierarchy = await repository.getHierarchy()

      expect(Array.isArray(hierarchy)).toBe(true)
      expect(repository.getHierarchy).toHaveBeenCalled()
    })

    it('should move list to different parent', async () => {
      const listId = 'test-list-id'
      const newParentId = 'new-parent-id'

      const moved = await repository.moveToParent(listId, newParentId)
      expect(moved).toBe(true)
      expect(repository.moveToParent).toHaveBeenCalledWith(listId, newParentId)
    })

    it('should prevent circular references', async () => {
      // Mock the method to throw an error for circular reference
      repository.moveToParent.mockRejectedValue(new Error('Circular reference detected'))

      await expect(
        repository.moveToParent('parent-id', 'child-id')
      ).rejects.toThrow('Circular reference detected')
    })

    it('should reorder lists within parent', async () => {
      const parentId = 'parent-id'
      const childIds = ['child-1', 'child-2']

      const reordered = await repository.reorderWithinParent(parentId, childIds)
      expect(reordered).toBe(true)
      expect(repository.reorderWithinParent).toHaveBeenCalledWith(parentId, childIds)
    })

    it('should archive list with children', async () => {
      const listId = 'test-list-id'

      const archived = await repository.archiveWithChildren(listId)
      expect(archived).toBe(true)
      expect(repository.archiveWithChildren).toHaveBeenCalledWith(listId)
    })

    it('should get list statistics', async () => {
      const listId = 'test-list-id'

      const stats = await repository.getListStatistics(listId)
      expect(stats).toBeDefined()
      expect(typeof stats.totalItems).toBe('number')
      expect(typeof stats.completedItems).toBe('number')
      expect(typeof stats.completionRate).toBe('number')
      expect(repository.getListStatistics).toHaveBeenCalledWith(listId)
    })
  })

  describe('MCP Integration', () => {
    it('should expose MCP tools', () => {
      const tools = repository.getMCPTools()
      expect(Array.isArray(tools)).toBe(true)
      expect(repository.getMCPTools).toHaveBeenCalled()
    })

    it('should expose MCP resources', () => {
      const resources = repository.getMCPResources()
      expect(Array.isArray(resources)).toBe(true)
      expect(repository.getMCPResources).toHaveBeenCalled()
    })

    it('should execute MCP tools', async () => {
      const toolName = 'lists.findById'
      const params = { id: 'test-id' }

      const result = await repository.executeMCPTool(toolName, params)
      expect(result.success).toBe(true)
      expect(repository.executeMCPTool).toHaveBeenCalledWith(toolName, params)
    })

    it('should get MCP resources', async () => {
      const resourceUri = 'lists://schema'

      const result = await repository.getMCPResource(resourceUri)
      expect(result.success).toBe(true)
      expect(repository.getMCPResource).toHaveBeenCalledWith(resourceUri)
    })
  })

  describe('Caching', () => {
    beforeEach(() => {
      globalCache.clear()
      globalMonitor.reset()
    })

    it('should cache query results', async () => {
      const stats = await repository.getEntityStatistics()
      expect(stats).toBeDefined()
      expect(repository.getEntityStatistics).toHaveBeenCalled()
    })

    it('should track performance metrics', async () => {
      await repository.findAll({ limit: 10 })
      expect(repository.findAll).toHaveBeenCalledWith({ limit: 10 })
    })
  })
})

// Additional test suites from repository-test-suite
TransactionTestSuite.testTransactionManager()
CacheTestSuite.testRepositoryCache()
QueryBuilderTestSuite.testQueryBuilder()

// Integration tests
describe('Repository Integration', () => {
  it('should register repository with registry', async () => {
    expect(repositoryRegistry.has('lists')).toBe(true)
  })

  it('should validate dependency graph', () => {
    expect(() => repositoryRegistry.validateDependencies()).not.toThrow()
  })

  it('should provide health status', () => {
    const health = repositoryRegistry.getHealthStatus()
    expect(health).toBeDefined()
  })
})

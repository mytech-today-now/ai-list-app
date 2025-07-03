import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals'
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

/**
 * Lists Repository Test Suite
 */
class ListsRepositoryTestSuite extends BaseRepositoryTestSuite<ListsRepository> {
  createRepository(): ListsRepository {
    return new ListsRepository()
  }

  createTestEntity(overrides: any = {}): any {
    return TestDataFactory.createTestList(overrides)
  }

  /**
   * Test lists-specific functionality
   */
  testListsSpecificOperations() {
    describe('Lists-Specific Operations', () => {
      it('should find lists by parent', async () => {
        // Create parent list
        const parentList = await this.repository.create(this.createTestEntity())
        
        // Create child lists
        const childList1 = await this.repository.create(
          this.createTestEntity({ parentListId: parentList.id })
        )
        const childList2 = await this.repository.create(
          this.createTestEntity({ parentListId: parentList.id })
        )
        
        const children = await this.repository.findByParent(parentList.id)
        expect(children.length).toBeGreaterThanOrEqual(2)
        expect(children.every(child => child.parentListId === parentList.id)).toBe(true)
      })

      it('should get list hierarchy', async () => {
        // Create hierarchical structure
        const rootList = await this.repository.create(this.createTestEntity())
        const childList = await this.repository.create(
          this.createTestEntity({ parentListId: rootList.id })
        )
        const grandchildList = await this.repository.create(
          this.createTestEntity({ parentListId: childList.id })
        )
        
        const hierarchy = await this.repository.getHierarchy()
        expect(Array.isArray(hierarchy)).toBe(true)
        
        // Find our test hierarchy
        const testRoot = hierarchy.find(list => list.id === rootList.id)
        expect(testRoot).toBeDefined()
        expect(testRoot?.children).toBeDefined()
      })

      it('should move list to different parent', async () => {
        const list1 = await this.repository.create(this.createTestEntity())
        const list2 = await this.repository.create(this.createTestEntity())
        const childList = await this.repository.create(
          this.createTestEntity({ parentListId: list1.id })
        )
        
        // Move child from list1 to list2
        const movedList = await this.repository.moveToParent(childList.id, list2.id)
        expect(movedList.parentListId).toBe(list2.id)
        
        // Verify it's no longer under list1
        const list1Children = await this.repository.findByParent(list1.id)
        expect(list1Children.find(child => child.id === childList.id)).toBeUndefined()
        
        // Verify it's now under list2
        const list2Children = await this.repository.findByParent(list2.id)
        expect(list2Children.find(child => child.id === childList.id)).toBeDefined()
      })

      it('should prevent circular references', async () => {
        const parentList = await this.repository.create(this.createTestEntity())
        const childList = await this.repository.create(
          this.createTestEntity({ parentListId: parentList.id })
        )
        
        // Try to make parent a child of its own child (should fail)
        await expect(
          this.repository.moveToParent(parentList.id, childList.id)
        ).rejects.toThrow('circular reference')
      })

      it('should reorder lists within parent', async () => {
        const parentList = await this.repository.create(this.createTestEntity())
        
        // Create multiple child lists
        const child1 = await this.repository.create(
          this.createTestEntity({ parentListId: parentList.id, position: 0 })
        )
        const child2 = await this.repository.create(
          this.createTestEntity({ parentListId: parentList.id, position: 1 })
        )
        const child3 = await this.repository.create(
          this.createTestEntity({ parentListId: parentList.id, position: 2 })
        )
        
        // Reorder: child3, child1, child2
        const reorderedIds = [child3.id, child1.id, child2.id]
        const reordered = await this.repository.reorderWithinParent(parentList.id, reorderedIds)
        
        expect(reordered.length).toBe(3)
        expect(reordered[0].id).toBe(child3.id)
        expect(reordered[0].position).toBe(0)
        expect(reordered[1].id).toBe(child1.id)
        expect(reordered[1].position).toBe(1)
        expect(reordered[2].id).toBe(child2.id)
        expect(reordered[2].position).toBe(2)
      })

      it('should archive list with children', async () => {
        const parentList = await this.repository.create(this.createTestEntity())
        const childList = await this.repository.create(
          this.createTestEntity({ parentListId: parentList.id })
        )
        
        await this.repository.archiveWithChildren(parentList.id)
        
        // Both parent and child should be archived
        const archivedParent = await this.repository.findById(parentList.id)
        const archivedChild = await this.repository.findById(childList.id)
        
        expect(archivedParent?.status).toBe('archived')
        expect(archivedChild?.status).toBe('archived')
      })

      it('should get list statistics', async () => {
        const testList = await this.repository.create(this.createTestEntity())
        const stats = await this.repository.getListStatistics(testList.id)
        
        expect(stats).toBeDefined()
        expect(typeof stats.totalItems).toBe('number')
        expect(typeof stats.completedItems).toBe('number')
        expect(typeof stats.completionRate).toBe('number')
      })
    })
  }

  /**
   * Test MCP integration
   */
  testMCPIntegration() {
    describe('MCP Integration', () => {
      it('should expose MCP tools', () => {
        const tools = this.repository.getMCPTools()
        expect(Array.isArray(tools)).toBe(true)
        expect(tools.length).toBeGreaterThan(0)
        
        // Check for standard CRUD tools
        const toolNames = tools.map(tool => tool.name)
        expect(toolNames).toContain('lists.find')
        expect(toolNames).toContain('lists.create')
        expect(toolNames).toContain('lists.update')
        expect(toolNames).toContain('lists.delete')
        
        // Check for custom tools
        expect(toolNames).toContain('lists.getHierarchy')
        expect(toolNames).toContain('lists.moveToParent')
      })

      it('should expose MCP resources', () => {
        const resources = this.repository.getMCPResources()
        expect(Array.isArray(resources)).toBe(true)
        expect(resources.length).toBeGreaterThan(0)
        
        const resourceUris = resources.map(resource => resource.uri)
        expect(resourceUris).toContain('lists://schema')
        expect(resourceUris).toContain('lists://stats')
        expect(resourceUris).toContain('lists://hierarchy')
      })

      it('should execute MCP tools', async () => {
        const testList = await this.repository.create(this.createTestEntity())
        
        // Test find tool
        const findResult = await this.repository.executeMCPTool('lists.findById', {
          id: testList.id
        })
        
        expect(findResult.success).toBe(true)
        expect(findResult.data).toBeDefined()
        expect(findResult.data.id).toBe(testList.id)
      })

      it('should get MCP resources', async () => {
        const schemaResult = await this.repository.getMCPResource('lists://schema')
        expect(schemaResult.success).toBe(true)
        expect(schemaResult.data).toBeDefined()
        expect(schemaResult.data.type).toBe('object')
        
        const statsResult = await this.repository.getMCPResource('lists://stats')
        expect(statsResult.success).toBe(true)
        expect(statsResult.data).toBeDefined()
        expect(typeof statsResult.data.total).toBe('number')
      })
    })
  }

  /**
   * Test caching functionality
   */
  testCaching() {
    describe('Caching', () => {
      beforeEach(() => {
        globalCache.clear()
        globalMonitor.reset()
      })

      it('should cache query results', async () => {
        const testList = await this.repository.create(this.createTestEntity())
        
        // First call should be a cache miss
        const stats1 = await this.repository.getEntityStatistics()
        const cacheStats1 = globalCache.getStats()
        
        // Second call should be a cache hit
        const stats2 = await this.repository.getEntityStatistics()
        const cacheStats2 = globalCache.getStats()
        
        expect(stats1).toEqual(stats2)
        expect(cacheStats2.hits).toBeGreaterThan(cacheStats1.hits)
      })

      it('should track performance metrics', async () => {
        const initialMetrics = globalMonitor.getMetrics()
        
        await this.repository.findAll({ limit: 10 })
        
        const finalMetrics = globalMonitor.getMetrics()
        expect(finalMetrics.queryCount).toBeGreaterThan(initialMetrics.queryCount)
      })
    })
  }

  /**
   * Run all tests including custom ones
   */
  runAllTests() {
    this.runStandardTests()
    this.testListsSpecificOperations()
    this.testMCPIntegration()
    this.testCaching()
  }
}

// Main test suite
describe('Lists Repository', () => {
  let testSuite: ListsRepositoryTestSuite

  beforeAll(async () => {
    // Initialize test environment
    await RepositoryTestUtils.createTestDatabase()
  })

  afterAll(async () => {
    // Cleanup test environment
    await RepositoryTestUtils.cleanupTestDatabase()
  })

  beforeEach(() => {
    testSuite = new ListsRepositoryTestSuite()
    testSuite.beforeEach()
  })

  afterEach(() => {
    testSuite.afterEach()
  })

  // Run the test suite
  const suite = new ListsRepositoryTestSuite()
  suite.runAllTests()
})

// Additional test suites
TransactionTestSuite.testTransactionManager()
CacheTestSuite.testRepositoryCache()
QueryBuilderTestSuite.testQueryBuilder()

// Integration tests
describe('Repository Integration', () => {
  it('should register repository with registry', async () => {
    expect(repositoryRegistry.has('lists')).toBe(true)
    
    const listsRepo = await repositoryRegistry.get('lists')
    expect(listsRepo).toBeInstanceOf(ListsRepository)
  })

  it('should validate dependency graph', () => {
    expect(() => repositoryRegistry.validateDependencies()).not.toThrow()
  })

  it('should provide health status', () => {
    const health = repositoryRegistry.getHealthStatus()
    expect(health).toBeDefined()
    expect(health.lists).toBeDefined()
  })
})

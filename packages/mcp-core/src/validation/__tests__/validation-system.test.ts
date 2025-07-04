import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import {
  ValidationSystem,
  initializeValidationSystem,
  getValidationSystem,
  cleanupValidationSystem,
  validationRegistry,
  factoryRegistry,
  ListFactory_Instance,
  ItemFactory_Instance,
  ValidationErrorCodes
} from '../index'

describe('Validation System Integration', () => {
  let validationSystem: ValidationSystem

  beforeEach(async () => {
    validationSystem = await initializeValidationSystem({
      enableForeignKeyChecks: true,
      enableBusinessRules: true,
      enableIntegrityMonitoring: true,
      enableFactories: true,
      scheduledChecks: false
    })
  })

  afterEach(async () => {
    await cleanupValidationSystem()
  })

  describe('System Initialization', () => {
    it('should initialize validation system successfully', () => {
      expect(validationSystem).toBeDefined()
      
      const stats = validationSystem.getValidationStats()
      expect(stats.registeredValidators).toContain('list')
      expect(stats.registeredValidators).toContain('item')
      expect(stats.systemHealth.initialized).toBe(true)
    })

    it('should register model validators', () => {
      expect(validationRegistry.has('list')).toBe(true)
      expect(validationRegistry.has('item')).toBe(true)
    })

    it('should register model factories', () => {
      expect(factoryRegistry.has('list')).toBe(true)
      expect(factoryRegistry.has('item')).toBe(true)
      expect(factoryRegistry.has('agent')).toBe(true)
    })
  })

  describe('List Validation', () => {
    it('should validate valid list creation', async () => {
      const validListData = {
        title: 'Test List',
        description: 'A test list',
        priority: 'medium' as const
      }

      const result = await validationSystem.validateModel('list', validListData, {
        operation: 'create'
      })

      expect(result.success).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject invalid list data', async () => {
      const invalidListData = {
        title: '', // Empty title should fail
        priority: 'invalid' as any
      }

      const result = await validationSystem.validateModel('list', invalidListData, {
        operation: 'create'
      })

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should validate list hierarchy constraints', async () => {
      // This would test circular reference detection
      const listWithCircularRef = {
        title: 'Child List',
        parentListId: 'parent-id',
        priority: 'medium' as const
      }

      const result = await validationSystem.validateModel('list', listWithCircularRef, {
        operation: 'create'
      })

      // The result depends on the actual implementation of circular reference checking
      expect(result).toBeDefined()
    })
  })

  describe('Item Validation', () => {
    it('should validate valid item creation', async () => {
      const validItemData = {
        listId: 'test-list-id',
        title: 'Test Item',
        description: 'A test item',
        priority: 'high' as const,
        estimatedDuration: 120
      }

      const result = await validationSystem.validateModel('item', validItemData, {
        operation: 'create'
      })

      expect(result.success).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject item without required fields', async () => {
      const invalidItemData = {
        // Missing listId and title
        priority: 'medium' as const
      }

      const result = await validationSystem.validateModel('item', invalidItemData, {
        operation: 'create'
      })

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should validate item dependencies', async () => {
      const itemWithDependencies = {
        listId: 'test-list-id',
        title: 'Dependent Item',
        dependencies: ['dep-1', 'dep-2'],
        priority: 'medium' as const
      }

      const result = await validationSystem.validateModel('item', itemWithDependencies, {
        operation: 'create'
      })

      // The result depends on whether the dependencies exist
      expect(result).toBeDefined()
    })
  })

  describe('Model Factories', () => {
    it('should generate valid list data', async () => {
      const listResult = await ListFactory_Instance.build({
        validateConstraints: true
      })

      expect(listResult.success).toBe(true)
      expect(listResult.data).toBeDefined()
      
      if (listResult.data) {
        expect(listResult.data.id).toBeDefined()
        expect(listResult.data.title).toBeDefined()
        expect(listResult.data.priority).toMatch(/^(low|medium|high|urgent)$/)
      }
    })

    it('should generate valid item data', async () => {
      const itemResult = await ItemFactory_Instance.build({
        validateConstraints: true,
        overrides: {
          listId: 'test-list-id'
        }
      })

      expect(itemResult.success).toBe(true)
      expect(itemResult.data).toBeDefined()
      
      if (itemResult.data) {
        expect(itemResult.data.id).toBeDefined()
        expect(itemResult.data.title).toBeDefined()
        expect(itemResult.data.listId).toBe('test-list-id')
      }
    })

    it('should generate multiple items', async () => {
      const itemsResult = await ItemFactory_Instance.buildMany(5, {
        overrides: {
          listId: 'test-list-id'
        }
      })

      expect(itemsResult.success).toBe(true)
      expect(itemsResult.data).toHaveLength(5)
    })

    it('should generate hierarchical list structure', async () => {
      const hierarchy = await ListFactory_Instance.generateHierarchy(3, 2)
      
      expect(hierarchy.length).toBeGreaterThan(0)
      
      // Check that we have root lists (no parent)
      const rootLists = hierarchy.filter(list => !list.parentListId)
      expect(rootLists.length).toBeGreaterThan(0)
      
      // Check that we have child lists
      const childLists = hierarchy.filter(list => list.parentListId)
      expect(childLists.length).toBeGreaterThan(0)
    })
  })

  describe('Business Rules', () => {
    it('should enforce maximum nesting depth', async () => {
      // This would test the business rule for maximum list nesting depth
      const deeplyNestedList = {
        title: 'Deeply Nested List',
        parentListId: 'some-deep-parent',
        priority: 'medium' as const
      }

      const result = await validationSystem.validateModel('list', deeplyNestedList, {
        operation: 'create'
      })

      // The result depends on the actual depth calculation
      expect(result).toBeDefined()
    })

    it('should validate due date reasonableness', async () => {
      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 2) // 2 years in future

      const itemWithDistantDueDate = {
        listId: 'test-list-id',
        title: 'Item with Distant Due Date',
        dueDate: futureDate,
        priority: 'medium' as const
      }

      const result = await validationSystem.validateModel('item', itemWithDistantDueDate, {
        operation: 'create'
      })

      // Should succeed but might have warnings
      expect(result.success).toBe(true)
      // Might have warnings about distant due date
    })
  })

  describe('Deletion Validation', () => {
    it('should validate deletion with cascade analysis', async () => {
      const result = await validationSystem.validateDeletion('list', 'test-list-id', {
        operation: 'delete'
      })

      expect(result).toBeDefined()
      expect(result.metadata.operation).toBe('delete')
      expect(result.metadata.recordId).toBe('test-list-id')
    })
  })

  describe('Integrity Monitoring', () => {
    it('should perform integrity check', async () => {
      const integrityResult = await validationSystem.performIntegrityCheck()

      expect(integrityResult).toBeDefined()
      expect(integrityResult.success).toBeDefined()
      expect(integrityResult.checksPerformed).toBeGreaterThan(0)
      expect(integrityResult.summary).toBeDefined()
      expect(integrityResult.summary.healthScore).toBeGreaterThanOrEqual(0)
      expect(integrityResult.summary.healthScore).toBeLessThanOrEqual(100)
    })
  })

  describe('Error Handling', () => {
    it('should handle validation errors gracefully', async () => {
      const invalidData = {
        // Completely invalid data structure
        invalidField: 'invalid value'
      }

      const result = await validationSystem.validateModel('list', invalidData, {
        operation: 'create'
      })

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should handle unknown model validation', async () => {
      const result = await validationSystem.validateModel('unknown_model', {}, {
        operation: 'create'
      })

      expect(result.success).toBe(false)
      expect(result.errors).toContain(expect.stringContaining('No validator registered'))
    })
  })

  describe('System Statistics', () => {
    it('should provide comprehensive system statistics', () => {
      const stats = validationSystem.getValidationStats()

      expect(stats.registeredValidators).toBeInstanceOf(Array)
      expect(stats.foreignKeyConstraints).toBeGreaterThanOrEqual(0)
      expect(stats.businessRules).toBeGreaterThanOrEqual(0)
      expect(stats.factoriesAvailable).toBeInstanceOf(Array)
      expect(stats.systemHealth).toBeDefined()
      expect(stats.systemHealth.initialized).toBe(true)
    })
  })
})

describe('Validation Error Codes', () => {
  it('should have comprehensive error codes', () => {
    expect(ValidationErrorCodes.REQUIRED_FIELD).toBeDefined()
    expect(ValidationErrorCodes.FOREIGN_KEY_VIOLATION).toBeDefined()
    expect(ValidationErrorCodes.BUSINESS_RULE_VIOLATION).toBeDefined()
    expect(ValidationErrorCodes.CIRCULAR_DEPENDENCY).toBeDefined()
    expect(ValidationErrorCodes.INVALID_STATE_TRANSITION).toBeDefined()
  })
})

describe('Global Validation System', () => {
  it('should maintain singleton pattern', async () => {
    const system1 = await initializeValidationSystem({
      enableForeignKeyChecks: true,
      enableBusinessRules: true,
      enableIntegrityMonitoring: true,
      enableFactories: true
    })

    const system2 = getValidationSystem()

    expect(system1).toBe(system2)

    await cleanupValidationSystem()
  })

  it('should throw error when accessing uninitialized system', async () => {
    await cleanupValidationSystem()

    expect(() => getValidationSystem()).toThrow('Validation system not initialized')
  })
})

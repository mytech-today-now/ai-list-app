import { itemSchemas, listSchemas, globalSearchSchema } from '../../validation/schemas'

describe('Search Validation Schemas Unit Tests', () => {
  describe('itemSchemas.advancedSearchQuery', () => {
    it('should validate valid advanced search query', () => {
      const validQuery = {
        q: 'test query',
        fields: ['title', 'description'],
        listId: '123e4567-e89b-12d3-a456-426614174000',
        status: ['pending', 'in_progress'],
        priority: ['high', 'urgent'],
        assignedTo: ['user1', 'user2'],
        tags: ['bug', 'feature'],
        dueDateFrom: '2024-01-01',
        dueDateTo: '2024-01-31',
        hasDescription: 'true',
        hasDueDate: 'false',
        hasAssignee: 'true',
        overdue: 'false',
        dueSoon: '24',
        estimatedDurationMin: '60',
        estimatedDurationMax: '180',
        page: '1',
        limit: '20',
        sortBy: 'dueDate',
        sortOrder: 'asc',
        includeCompleted: 'false'
      }

      const result = itemSchemas.advancedSearchQuery.safeParse(validQuery)
      expect(result.success).toBe(true)
      
      if (result.success) {
        expect(result.data.q).toBe('test query')
        expect(result.data.fields).toEqual(['title', 'description'])
        expect(result.data.status).toEqual(['pending', 'in_progress'])
        expect(result.data.priority).toEqual(['high', 'urgent'])
        expect(result.data.dueSoon).toBe(24)
        expect(result.data.page).toBe(1)
        expect(result.data.limit).toBe(20)
      }
    })

    it('should apply default values', () => {
      const minimalQuery = { q: 'test' }
      
      const result = itemSchemas.advancedSearchQuery.safeParse(minimalQuery)
      expect(result.success).toBe(true)
      
      if (result.success) {
        expect(result.data.fields).toEqual(['title', 'description'])
        expect(result.data.page).toBe(1)
        expect(result.data.limit).toBe(20)
        expect(result.data.sortBy).toBe('updatedAt')
        expect(result.data.sortOrder).toBe('desc')
        expect(result.data.includeCompleted).toBe('true')
      }
    })

    it('should reject invalid query', () => {
      const invalidQuery = { q: '' } // Empty query
      
      const result = itemSchemas.advancedSearchQuery.safeParse(invalidQuery)
      expect(result.success).toBe(false)
    })

    it('should reject invalid UUID', () => {
      const invalidQuery = {
        q: 'test',
        listId: 'invalid-uuid'
      }
      
      const result = itemSchemas.advancedSearchQuery.safeParse(invalidQuery)
      expect(result.success).toBe(false)
    })

    it('should reject invalid enum values', () => {
      const invalidQuery = {
        q: 'test',
        status: ['invalid_status']
      }
      
      const result = itemSchemas.advancedSearchQuery.safeParse(invalidQuery)
      expect(result.success).toBe(false)
    })

    it('should reject invalid dueSoon value', () => {
      const invalidQuery = {
        q: 'test',
        dueSoon: '200' // Exceeds max of 168
      }
      
      const result = itemSchemas.advancedSearchQuery.safeParse(invalidQuery)
      expect(result.success).toBe(false)
    })

    it('should reject invalid limit value', () => {
      const invalidQuery = {
        q: 'test',
        limit: '150' // Exceeds max of 100
      }
      
      const result = itemSchemas.advancedSearchQuery.safeParse(invalidQuery)
      expect(result.success).toBe(false)
    })
  })

  describe('itemSchemas.filterQuery', () => {
    it('should validate filter query without search term', () => {
      const validFilter = {
        status: ['pending'],
        priority: ['high'],
        hasAssignee: 'false',
        page: '2',
        limit: '10'
      }

      const result = itemSchemas.filterQuery.safeParse(validFilter)
      expect(result.success).toBe(true)
      
      if (result.success) {
        expect(result.data.status).toEqual(['pending'])
        expect(result.data.priority).toEqual(['high'])
        expect(result.data.page).toBe(2)
        expect(result.data.limit).toBe(10)
      }
    })

    it('should work with empty filter', () => {
      const emptyFilter = {}

      const result = itemSchemas.filterQuery.safeParse(emptyFilter)
      expect(result.success).toBe(true)
      
      if (result.success) {
        expect(result.data.page).toBe(1)
        expect(result.data.limit).toBe(20)
        expect(result.data.sortBy).toBe('updatedAt')
        expect(result.data.sortOrder).toBe('desc')
      }
    })
  })

  describe('listSchemas.advancedSearchQuery', () => {
    it('should validate valid list search query', () => {
      const validQuery = {
        q: 'project',
        fields: ['title', 'description'],
        status: ['active', 'completed'],
        priority: ['high'],
        hasItems: 'true',
        itemCountMin: '5',
        itemCountMax: '50',
        completionRateMin: '25',
        completionRateMax: '75',
        sortBy: 'completionRate',
        sortOrder: 'desc'
      }

      const result = listSchemas.advancedSearchQuery.safeParse(validQuery)
      expect(result.success).toBe(true)
      
      if (result.success) {
        expect(result.data.q).toBe('project')
        expect(result.data.status).toEqual(['active', 'completed'])
        expect(result.data.itemCountMin).toBe(5)
        expect(result.data.itemCountMax).toBe(50)
        expect(result.data.completionRateMin).toBe(25)
        expect(result.data.completionRateMax).toBe(75)
      }
    })

    it('should reject invalid completion rate', () => {
      const invalidQuery = {
        q: 'test',
        completionRateMin: '150' // Exceeds max of 100
      }
      
      const result = listSchemas.advancedSearchQuery.safeParse(invalidQuery)
      expect(result.success).toBe(false)
    })

    it('should validate boolean string values', () => {
      const validQuery = {
        q: 'test',
        hasParent: 'true',
        hasChildren: 'false',
        hasItems: 'true',
        includeArchived: 'false'
      }

      const result = listSchemas.advancedSearchQuery.safeParse(validQuery)
      expect(result.success).toBe(true)
    })
  })

  describe('globalSearchSchema', () => {
    it('should validate valid global search query', () => {
      const validQuery = {
        q: 'urgent task',
        types: ['lists', 'items'],
        fields: ['title', 'description'],
        status: ['active', 'pending'],
        priority: ['high', 'urgent'],
        page: '1',
        limit: '15',
        sortBy: 'relevance',
        sortOrder: 'desc',
        includeArchived: 'false'
      }

      const result = globalSearchSchema.safeParse(validQuery)
      expect(result.success).toBe(true)
      
      if (result.success) {
        expect(result.data.q).toBe('urgent task')
        expect(result.data.types).toEqual(['lists', 'items'])
        expect(result.data.fields).toEqual(['title', 'description'])
        expect(result.data.page).toBe(1)
        expect(result.data.limit).toBe(15)
      }
    })

    it('should apply default values for global search', () => {
      const minimalQuery = { q: 'test' }
      
      const result = globalSearchSchema.safeParse(minimalQuery)
      expect(result.success).toBe(true)
      
      if (result.success) {
        expect(result.data.types).toEqual(['lists', 'items'])
        expect(result.data.fields).toEqual(['title', 'description', 'name'])
        expect(result.data.page).toBe(1)
        expect(result.data.limit).toBe(20)
        expect(result.data.sortBy).toBe('relevance')
        expect(result.data.sortOrder).toBe('desc')
        expect(result.data.includeArchived).toBe('false')
      }
    })

    it('should reject invalid search types', () => {
      const invalidQuery = {
        q: 'test',
        types: ['invalid_type']
      }
      
      const result = globalSearchSchema.safeParse(invalidQuery)
      expect(result.success).toBe(false)
    })

    it('should reject invalid search fields', () => {
      const invalidQuery = {
        q: 'test',
        fields: ['invalid_field']
      }
      
      const result = globalSearchSchema.safeParse(invalidQuery)
      expect(result.success).toBe(false)
    })

    it('should reject empty query', () => {
      const invalidQuery = { q: '' }
      
      const result = globalSearchSchema.safeParse(invalidQuery)
      expect(result.success).toBe(false)
    })
  })
})

import { describe, it, expect, vi } from 'vitest'
import {
  isAPIResponse,
  isTodoItem,
  isTodoList,
  isPriority,
  isItemStatus,
  isTodoItemArray,
  validateTodoItemsResponse,
  validateTodoListResponse,
  ensureArray,
  ensureObject
} from '../../utils/type-guards'
import { TodoItem, TodoList } from '@ai-todo/shared-types'

// Mock console.warn to avoid noise in tests
const mockConsoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})

describe('Type Guards', () => {
  afterEach(() => {
    mockConsoleWarn.mockClear()
  })

  describe('isAPIResponse', () => {
    it('should return true for valid API response', () => {
      expect(isAPIResponse({ success: true, data: [] })).toBe(true)
      expect(isAPIResponse({ success: false, error: 'Error' })).toBe(true)
    })

    it('should return false for invalid API response', () => {
      expect(isAPIResponse(null)).toBe(false)
      expect(isAPIResponse(undefined)).toBe(false)
      expect(isAPIResponse({})).toBe(false)
      expect(isAPIResponse({ success: 'true' })).toBe(false)
    })
  })

  describe('isPriority', () => {
    it('should return true for valid priorities', () => {
      expect(isPriority('low')).toBe(true)
      expect(isPriority('medium')).toBe(true)
      expect(isPriority('high')).toBe(true)
      expect(isPriority('urgent')).toBe(true)
    })

    it('should return false for invalid priorities', () => {
      expect(isPriority('invalid')).toBe(false)
      expect(isPriority(null)).toBe(false)
      expect(isPriority(123)).toBe(false)
    })
  })

  describe('isItemStatus', () => {
    it('should return true for valid statuses', () => {
      expect(isItemStatus('pending')).toBe(true)
      expect(isItemStatus('in_progress')).toBe(true)
      expect(isItemStatus('completed')).toBe(true)
      expect(isItemStatus('blocked')).toBe(true)
      expect(isItemStatus('cancelled')).toBe(true)
    })

    it('should return false for invalid statuses', () => {
      expect(isItemStatus('invalid')).toBe(false)
      expect(isItemStatus(null)).toBe(false)
      expect(isItemStatus(123)).toBe(false)
    })
  })

  describe('isTodoItem', () => {
    const validItem: TodoItem = {
      id: 'item-1',
      listId: 'list-1',
      title: 'Test Item',
      priority: 'medium',
      status: 'pending'
    }

    it('should return true for valid TodoItem', () => {
      expect(isTodoItem(validItem)).toBe(true)
    })

    it('should return false for invalid TodoItem', () => {
      expect(isTodoItem(null)).toBe(false)
      expect(isTodoItem({})).toBe(false)
      expect(isTodoItem({ ...validItem, id: null })).toBe(false)
      expect(isTodoItem({ ...validItem, priority: 'invalid' })).toBe(false)
      expect(isTodoItem({ ...validItem, status: 'invalid' })).toBe(false)
    })
  })

  describe('isTodoList', () => {
    const validList: TodoList = {
      id: 'list-1',
      title: 'Test List'
    }

    it('should return true for valid TodoList', () => {
      expect(isTodoList(validList)).toBe(true)
    })

    it('should return false for invalid TodoList', () => {
      expect(isTodoList(null)).toBe(false)
      expect(isTodoList({})).toBe(false)
      expect(isTodoList({ ...validList, id: null })).toBe(false)
      expect(isTodoList({ ...validList, title: null })).toBe(false)
    })
  })

  describe('validateTodoItemsResponse', () => {
    const validItems: TodoItem[] = [
      { id: 'item-1', listId: 'list-1', title: 'Item 1', priority: 'medium', status: 'pending' },
      { id: 'item-2', listId: 'list-1', title: 'Item 2', priority: 'high', status: 'completed' }
    ]

    it('should return valid items for successful response', () => {
      const response = { success: true, data: validItems }
      expect(validateTodoItemsResponse(response)).toEqual(validItems)
    })

    it('should return empty array for non-array data', () => {
      const response = { success: true, data: 'not an array' }
      const result = validateTodoItemsResponse(response)
      expect(result).toEqual([])
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        'API returned non-array data for TodoItems, using empty array as fallback',
        'not an array'
      )
    })

    it('should filter out invalid items', () => {
      const mixedData = [
        validItems[0],
        { invalid: 'item' },
        validItems[1]
      ]
      const response = { success: true, data: mixedData }
      const result = validateTodoItemsResponse(response)
      expect(result).toEqual([validItems[0], validItems[1]])
      expect(mockConsoleWarn).toHaveBeenCalledWith('Invalid TodoItem at index 1:', { invalid: 'item' })
    })

    it('should throw error for unsuccessful response', () => {
      const response = { success: false, message: 'API Error' }
      expect(() => validateTodoItemsResponse(response)).toThrow('API Error')
    })

    it('should throw error for invalid response structure', () => {
      expect(() => validateTodoItemsResponse('not an object')).toThrow('Invalid API response structure')
    })
  })

  describe('validateTodoListResponse', () => {
    const validList: TodoList = { id: 'list-1', title: 'Test List' }

    it('should return valid list for successful response', () => {
      const response = { success: true, data: validList }
      expect(validateTodoListResponse(response)).toEqual(validList)
    })

    it('should throw error for unsuccessful response', () => {
      const response = { success: false, error: 'Not found' }
      expect(() => validateTodoListResponse(response)).toThrow('Not found')
    })

    it('should throw error for missing data', () => {
      const response = { success: true }
      expect(() => validateTodoListResponse(response)).toThrow('No list data returned from API')
    })

    it('should throw error for invalid list structure', () => {
      const response = { success: true, data: { invalid: 'list' } }
      expect(() => validateTodoListResponse(response)).toThrow('Invalid TodoList data structure')
    })
  })

  describe('ensureArray', () => {
    it('should return array as-is when valid', () => {
      const arr = [1, 2, 3]
      expect(ensureArray(arr)).toEqual(arr)
    })

    it('should return empty array for non-array input', () => {
      expect(ensureArray('not an array')).toEqual([])
      expect(ensureArray(null)).toEqual([])
      expect(ensureArray(undefined)).toEqual([])
      expect(mockConsoleWarn).toHaveBeenCalledWith('Expected array but received:', 'string', 'not an array')
    })

    it('should filter array with validator', () => {
      const arr = [1, 'string', 2, 'another']
      const isNumber = (x: unknown): x is number => typeof x === 'number'
      expect(ensureArray(arr, isNumber)).toEqual([1, 2])
    })
  })

  describe('ensureObject', () => {
    const isValidObject = (obj: unknown): obj is { id: string } => 
      typeof obj === 'object' && obj !== null && 'id' in obj && typeof (obj as any).id === 'string'

    it('should return object when valid', () => {
      const obj = { id: 'test' }
      expect(ensureObject(obj, isValidObject)).toEqual(obj)
    })

    it('should return null for non-object input', () => {
      expect(ensureObject('not an object', isValidObject)).toBeNull()
      expect(ensureObject(null, isValidObject)).toBeNull()
      expect(mockConsoleWarn).toHaveBeenCalledWith('Expected object but received:', 'string', 'not an object')
    })

    it('should return null for object that fails validation', () => {
      const obj = { name: 'test' }
      expect(ensureObject(obj, isValidObject)).toBeNull()
      expect(mockConsoleWarn).toHaveBeenCalledWith('Object failed validation:', obj)
    })
  })
})

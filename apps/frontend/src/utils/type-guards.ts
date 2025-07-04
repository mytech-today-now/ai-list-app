/**
 * Type Guards and Runtime Validation Utilities
 * SemanticType: TypeValidationUtilities
 * ExtensibleByAI: true
 * AIUseCases: ["Runtime type checking", "API response validation", "Error prevention"]
 */

import { TodoItem, TodoList, Priority, ItemStatus } from '@ai-todo/shared-types'

/**
 * Standard API response structure
 */
export interface APIResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

/**
 * Type guard for API response structure
 */
export function isAPIResponse(value: unknown): value is APIResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    typeof (value as any).success === 'boolean'
  )
}

/**
 * Type guard for TodoItem
 */
export function isTodoItem(value: unknown): value is TodoItem {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const item = value as any
  return (
    typeof item.id === 'string' &&
    typeof item.listId === 'string' &&
    typeof item.title === 'string' &&
    (item.description === undefined || typeof item.description === 'string') &&
    isPriority(item.priority) &&
    isItemStatus(item.status) &&
    (item.dueDate === undefined || item.dueDate === null || typeof item.dueDate === 'string') &&
    (item.estimatedDuration === undefined || item.estimatedDuration === null || typeof item.estimatedDuration === 'number') &&
    (item.actualDuration === undefined || item.actualDuration === null || typeof item.actualDuration === 'number') &&
    (item.tags === undefined || item.tags === null || typeof item.tags === 'string') &&
    (item.assignedTo === undefined || item.assignedTo === null || typeof item.assignedTo === 'string') &&
    (item.createdBy === undefined || typeof item.createdBy === 'string') &&
    (item.createdAt === undefined || typeof item.createdAt === 'string') &&
    (item.updatedAt === undefined || typeof item.updatedAt === 'string') &&
    (item.completedAt === undefined || item.completedAt === null || typeof item.completedAt === 'string')
  )
}

/**
 * Type guard for TodoList
 */
export function isTodoList(value: unknown): value is TodoList {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const list = value as any
  return (
    typeof list.id === 'string' &&
    typeof list.title === 'string' &&
    (list.description === undefined || typeof list.description === 'string') &&
    (list.parentListId === undefined || list.parentListId === null || typeof list.parentListId === 'string') &&
    (list.createdBy === undefined || typeof list.createdBy === 'string') &&
    (list.createdAt === undefined || typeof list.createdAt === 'string') &&
    (list.updatedAt === undefined || typeof list.updatedAt === 'string')
  )
}

/**
 * Type guard for Priority
 */
export function isPriority(value: unknown): value is Priority {
  return typeof value === 'string' && ['low', 'medium', 'high', 'urgent'].includes(value)
}

/**
 * Type guard for ItemStatus
 */
export function isItemStatus(value: unknown): value is ItemStatus {
  return typeof value === 'string' && ['pending', 'in_progress', 'completed', 'blocked', 'cancelled'].includes(value)
}

/**
 * Type guard for array of TodoItems
 */
export function isTodoItemArray(value: unknown): value is TodoItem[] {
  return Array.isArray(value) && value.every(isTodoItem)
}

/**
 * Validates and sanitizes API response for TodoItems
 */
export function validateTodoItemsResponse(response: unknown): TodoItem[] {
  if (!isAPIResponse(response)) {
    throw new Error('Invalid API response structure')
  }

  if (!response.success) {
    throw new Error(response.message || response.error || 'API request failed')
  }

  if (!Array.isArray(response.data)) {
    console.warn('API returned non-array data for TodoItems, using empty array as fallback', response.data)
    return []
  }

  // Filter out invalid items and log warnings
  const validItems: TodoItem[] = []
  const invalidItems: unknown[] = []

  response.data.forEach((item, index) => {
    if (isTodoItem(item)) {
      validItems.push(item)
    } else {
      invalidItems.push(item)
      console.warn(`Invalid TodoItem at index ${index}:`, item)
    }
  })

  if (invalidItems.length > 0) {
    console.warn(`Filtered out ${invalidItems.length} invalid TodoItems from API response`)
  }

  return validItems
}

/**
 * Validates and sanitizes API response for TodoList
 */
export function validateTodoListResponse(response: unknown): TodoList {
  if (!isAPIResponse(response)) {
    throw new Error('Invalid API response structure')
  }

  if (!response.success) {
    throw new Error(response.message || response.error || 'API request failed')
  }

  if (!response.data) {
    throw new Error('No list data returned from API')
  }

  if (!isTodoList(response.data)) {
    throw new Error('Invalid TodoList data structure')
  }

  return response.data
}

/**
 * Safe array access with fallback
 */
export function ensureArray<T>(value: unknown, validator?: (item: unknown) => item is T): T[] {
  if (!Array.isArray(value)) {
    console.warn('Expected array but received:', typeof value, value)
    return []
  }

  if (!validator) {
    return value as T[]
  }

  return value.filter(validator)
}

/**
 * Safe object access with type validation
 */
export function ensureObject<T>(value: unknown, validator: (obj: unknown) => obj is T): T | null {
  if (typeof value !== 'object' || value === null) {
    console.warn('Expected object but received:', typeof value, value)
    return null
  }

  if (!validator(value)) {
    console.warn('Object failed validation:', value)
    return null
  }

  return value
}

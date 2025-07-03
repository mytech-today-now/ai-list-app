import React, { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { TodoList, TodoItem, Priority, ItemStatus } from '@ai-todo/shared-types'

interface TaskListProps {
  listId: string
  onItemClick?: (item: TodoItem) => void
  onItemUpdate?: (item: TodoItem) => void
}

interface TaskItemProps {
  item: TodoItem
  onStatusChange: (itemId: string, status: ItemStatus) => void
  onPriorityChange: (itemId: string, priority: Priority) => void
  onClick?: () => void
}

const TaskItem: React.FC<TaskItemProps> = ({ 
  item, 
  onStatusChange, 
  onPriorityChange, 
  onClick 
}) => {
  const [isEditing, setIsEditing] = useState(false)

  const handleStatusChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onStatusChange(item.id, e.target.value as ItemStatus)
  }, [item.id, onStatusChange])

  const handlePriorityChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onPriorityChange(item.id, e.target.value as Priority)
  }, [item.id, onPriorityChange])

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-100'
      case 'high': return 'text-orange-600 bg-orange-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'low': return 'text-green-600 bg-green-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusColor = (status: ItemStatus) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100'
      case 'in_progress': return 'text-blue-600 bg-blue-100'
      case 'blocked': return 'text-red-600 bg-red-100'
      case 'cancelled': return 'text-gray-600 bg-gray-100'
      default: return 'text-yellow-600 bg-yellow-100'
    }
  }

  return (
    <div 
      className={`p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer ${
        item.status === 'completed' ? 'opacity-75' : ''
      }`}
      onClick={onClick}
      role="listitem"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick?.()
        }
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className={`font-medium ${item.status === 'completed' ? 'line-through' : ''}`}>
            {item.title}
          </h3>
          {item.description && (
            <p className="text-sm text-gray-600 mt-1">{item.description}</p>
          )}
          {item.dueDate && (
            <p className="text-xs text-gray-500 mt-2">
              Due: {new Date(item.dueDate).toLocaleDateString()}
            </p>
          )}
        </div>
        
        <div className="flex items-center space-x-2 ml-4">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(item.priority)}`}>
            {item.priority}
          </span>
          
          <select
            value={item.status}
            onChange={handleStatusChange}
            onClick={(e) => e.stopPropagation()}
            className={`text-xs px-2 py-1 rounded border ${getStatusColor(item.status)}`}
            aria-label={`Change status for ${item.title}`}
          >
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="blocked">Blocked</option>
            <option value="cancelled">Cancelled</option>
          </select>
          
          <select
            value={item.priority}
            onChange={handlePriorityChange}
            onClick={(e) => e.stopPropagation()}
            className="text-xs px-2 py-1 rounded border"
            aria-label={`Change priority for ${item.title}`}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>
      
      {item.tags && item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {item.tags.map((tag, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

const TaskList: React.FC<TaskListProps> = ({ listId, onItemClick, onItemUpdate }) => {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<ItemStatus | 'all'>('all')
  const [sortBy, setSortBy] = useState<'priority' | 'dueDate' | 'status'>('priority')

  // Fetch list data
  const { data: list, isLoading: listLoading, error: listError } = useQuery({
    queryKey: ['list', listId],
    queryFn: async (): Promise<TodoList> => {
      const response = await fetch(`/api/lists/${listId}`)
      if (!response.ok) throw new Error('Failed to fetch list')
      const result = await response.json()
      return result.data
    }
  })

  // Fetch items
  const { data: items = [], isLoading: itemsLoading, error: itemsError } = useQuery({
    queryKey: ['items', listId],
    queryFn: async (): Promise<TodoItem[]> => {
      const response = await fetch(`/api/items?listId=${listId}`)
      if (!response.ok) throw new Error('Failed to fetch items')
      const result = await response.json()
      return result.data
    }
  })

  // Update item mutation
  const updateItemMutation = useMutation({
    mutationFn: async ({ itemId, updates }: { itemId: string; updates: Partial<TodoItem> }) => {
      const response = await fetch(`/api/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      if (!response.ok) throw new Error('Failed to update item')
      return response.json()
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['items', listId] })
      onItemUpdate?.(data.data)
    }
  })

  const handleStatusChange = useCallback((itemId: string, status: ItemStatus) => {
    updateItemMutation.mutate({ itemId, updates: { status } })
  }, [updateItemMutation])

  const handlePriorityChange = useCallback((itemId: string, priority: Priority) => {
    updateItemMutation.mutate({ itemId, updates: { priority } })
  }, [updateItemMutation])

  const handleItemClick = useCallback((item: TodoItem) => {
    onItemClick?.(item)
  }, [onItemClick])

  // Filter and sort items
  const filteredAndSortedItems = React.useMemo(() => {
    let filtered = items
    
    if (filter !== 'all') {
      filtered = items.filter(item => item.status === filter)
    }
    
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
          return priorityOrder[b.priority] - priorityOrder[a.priority]
        case 'dueDate':
          if (!a.dueDate && !b.dueDate) return 0
          if (!a.dueDate) return 1
          if (!b.dueDate) return -1
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        case 'status':
          return a.status.localeCompare(b.status)
        default:
          return 0
      }
    })
  }, [items, filter, sortBy])

  if (listLoading || itemsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2">Loading...</span>
      </div>
    )
  }

  if (listError || itemsError) {
    return (
      <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
        <h3 className="font-medium">Error loading task list</h3>
        <p className="text-sm mt-1">
          {(listError as Error)?.message || (itemsError as Error)?.message || 'Unknown error'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{list?.title}</h2>
          {list?.description && (
            <p className="text-gray-600 mt-1">{list.description}</p>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Filter */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as ItemStatus | 'all')}
            className="px-3 py-2 border rounded-md text-sm"
            aria-label="Filter items by status"
          >
            <option value="all">All Items</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="blocked">Blocked</option>
            <option value="cancelled">Cancelled</option>
          </select>
          
          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'priority' | 'dueDate' | 'status')}
            className="px-3 py-2 border rounded-md text-sm"
            aria-label="Sort items by"
          >
            <option value="priority">Sort by Priority</option>
            <option value="dueDate">Sort by Due Date</option>
            <option value="status">Sort by Status</option>
          </select>
        </div>
      </div>

      {/* Items */}
      {filteredAndSortedItems.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No items found</p>
          {filter !== 'all' && (
            <button
              onClick={() => setFilter('all')}
              className="mt-2 text-blue-500 hover:text-blue-700 underline"
            >
              Show all items
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3" role="list" aria-label="Task items">
          {filteredAndSortedItems.map((item) => (
            <TaskItem
              key={item.id}
              item={item}
              onStatusChange={handleStatusChange}
              onPriorityChange={handlePriorityChange}
              onClick={() => handleItemClick(item)}
            />
          ))}
        </div>
      )}
      
      {/* Stats */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-900">{items.length}</div>
            <div className="text-sm text-gray-600">Total Items</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {items.filter(item => item.status === 'completed').length}
            </div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">
              {items.filter(item => item.status === 'in_progress').length}
            </div>
            <div className="text-sm text-gray-600">In Progress</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-600">
              {items.filter(item => item.status === 'pending').length}
            </div>
            <div className="text-sm text-gray-600">Pending</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TaskList

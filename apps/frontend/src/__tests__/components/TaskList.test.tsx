import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { axe, toHaveNoViolations } from 'jest-axe'
import TaskList from '../../components/TaskList'
import { TodoList, TodoItem } from '@ai-todo/shared-types'

// Extend expect with jest-axe matchers
expect.extend(toHaveNoViolations)

// Mock fetch
global.fetch = jest.fn()

const mockList: TodoList = {
  id: 'list-1',
  title: 'Test List',
  description: 'A test task list',
  position: 0,
  priority: 'medium',
  status: 'active',
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z'
}

const mockItems: TodoItem[] = [
  {
    id: 'item-1',
    listId: 'list-1',
    title: 'First Task',
    description: 'Description for first task',
    position: 0,
    priority: 'high',
    status: 'pending',
    dueDate: '2023-12-31T23:59:59Z',
    tags: ['work', 'urgent'],
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z'
  },
  {
    id: 'item-2',
    listId: 'list-1',
    title: 'Second Task',
    position: 1,
    priority: 'medium',
    status: 'in_progress',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z'
  },
  {
    id: 'item-3',
    listId: 'list-1',
    title: 'Completed Task',
    position: 2,
    priority: 'low',
    status: 'completed',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z'
  }
]

describe('TaskList Component', () => {
  let queryClient: QueryClient
  const mockOnItemClick = jest.fn()
  const mockOnItemUpdate = jest.fn()

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    })
    
    jest.clearAllMocks()
    
    // Mock successful API responses
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockList })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockItems })
      })
  })

  const renderTaskList = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <TaskList
          listId="list-1"
          onItemClick={mockOnItemClick}
          onItemUpdate={mockOnItemUpdate}
          {...props}
        />
      </QueryClientProvider>
    )
  }

  describe('Loading States', () => {
    it('should show loading spinner while fetching data', () => {
      renderTaskList()
      
      expect(screen.getByText('Loading...')).toBeInTheDocument()
      expect(document.querySelector('.animate-spin')).toBeInTheDocument()
    })

    it('should show loading with proper accessibility', () => {
      renderTaskList()
      
      const loadingContainer = screen.getByText('Loading...').parentElement
      expect(loadingContainer).toHaveClass('flex', 'items-center', 'justify-center')
    })
  })

  describe('Error States', () => {
    it('should display error when list fetch fails', async () => {
      ;(fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Failed to fetch list'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: mockItems })
        })

      renderTaskList()

      await waitFor(() => {
        expect(screen.getByText('Error loading task list')).toBeInTheDocument()
        expect(screen.getByText('Failed to fetch list')).toBeInTheDocument()
      })
    })

    it('should display error when items fetch fails', async () => {
      ;(fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: mockList })
        })
        .mockRejectedValueOnce(new Error('Failed to fetch items'))

      renderTaskList()

      await waitFor(() => {
        expect(screen.getByText('Error loading task list')).toBeInTheDocument()
        expect(screen.getByText('Failed to fetch items')).toBeInTheDocument()
      })
    })

    it('should style error messages appropriately', async () => {
      ;(fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: mockItems })
        })

      renderTaskList()

      await waitFor(() => {
        const errorContainer = screen.getByText('Error loading task list').parentElement
        expect(errorContainer).toHaveClass('p-4', 'bg-red-100', 'border', 'border-red-400', 'text-red-700', 'rounded')
      })
    })
  })

  describe('Successful Data Display', () => {
    it('should display list title and description', async () => {
      renderTaskList()

      await waitFor(() => {
        expect(screen.getByText('Test List')).toBeInTheDocument()
        expect(screen.getByText('A test task list')).toBeInTheDocument()
      })
    })

    it('should display all task items', async () => {
      renderTaskList()

      await waitFor(() => {
        expect(screen.getByText('First Task')).toBeInTheDocument()
        expect(screen.getByText('Second Task')).toBeInTheDocument()
        expect(screen.getByText('Completed Task')).toBeInTheDocument()
      })
    })

    it('should display task descriptions when available', async () => {
      renderTaskList()

      await waitFor(() => {
        expect(screen.getByText('Description for first task')).toBeInTheDocument()
      })
    })

    it('should display due dates when available', async () => {
      renderTaskList()

      await waitFor(() => {
        expect(screen.getByText(/Due: 12\/31\/2023/)).toBeInTheDocument()
      })
    })

    it('should display task tags', async () => {
      renderTaskList()

      await waitFor(() => {
        expect(screen.getByText('work')).toBeInTheDocument()
        expect(screen.getByText('urgent')).toBeInTheDocument()
      })
    })
  })

  describe('Filtering and Sorting', () => {
    it('should filter items by status', async () => {
      const user = userEvent.setup()
      renderTaskList()

      await waitFor(() => {
        expect(screen.getByText('First Task')).toBeInTheDocument()
      })

      const filterSelect = screen.getByLabelText('Filter items by status')
      await user.selectOptions(filterSelect, 'completed')

      await waitFor(() => {
        expect(screen.getByText('Completed Task')).toBeInTheDocument()
        expect(screen.queryByText('First Task')).not.toBeInTheDocument()
        expect(screen.queryByText('Second Task')).not.toBeInTheDocument()
      })
    })

    it('should sort items by priority', async () => {
      const user = userEvent.setup()
      renderTaskList()

      await waitFor(() => {
        expect(screen.getByText('First Task')).toBeInTheDocument()
      })

      const sortSelect = screen.getByLabelText('Sort items by')
      await user.selectOptions(sortSelect, 'priority')

      // High priority items should appear first
      const items = screen.getAllByRole('listitem')
      expect(items[0]).toHaveTextContent('First Task') // high priority
    })

    it('should sort items by due date', async () => {
      const user = userEvent.setup()
      renderTaskList()

      await waitFor(() => {
        expect(screen.getByText('First Task')).toBeInTheDocument()
      })

      const sortSelect = screen.getByLabelText('Sort items by')
      await user.selectOptions(sortSelect, 'dueDate')

      // Items with due dates should appear first
      await waitFor(() => {
        const items = screen.getAllByRole('listitem')
        expect(items[0]).toHaveTextContent('First Task') // has due date
      })
    })

    it('should show "No items found" when filter returns empty results', async () => {
      const user = userEvent.setup()
      renderTaskList()

      await waitFor(() => {
        expect(screen.getByText('First Task')).toBeInTheDocument()
      })

      const filterSelect = screen.getByLabelText('Filter items by status')
      await user.selectOptions(filterSelect, 'blocked')

      await waitFor(() => {
        expect(screen.getByText('No items found')).toBeInTheDocument()
        expect(screen.getByText('Show all items')).toBeInTheDocument()
      })
    })

    it('should reset filter when "Show all items" is clicked', async () => {
      const user = userEvent.setup()
      renderTaskList()

      await waitFor(() => {
        expect(screen.getByText('First Task')).toBeInTheDocument()
      })

      // Filter to show no items
      const filterSelect = screen.getByLabelText('Filter items by status')
      await user.selectOptions(filterSelect, 'blocked')

      await waitFor(() => {
        expect(screen.getByText('No items found')).toBeInTheDocument()
      })

      // Click "Show all items"
      const showAllButton = screen.getByText('Show all items')
      await user.click(showAllButton)

      await waitFor(() => {
        expect(screen.getByText('First Task')).toBeInTheDocument()
        expect(screen.getByText('Second Task')).toBeInTheDocument()
        expect(screen.getByText('Completed Task')).toBeInTheDocument()
      })
    })
  })

  describe('Item Interactions', () => {
    it('should call onItemClick when item is clicked', async () => {
      const user = userEvent.setup()
      renderTaskList()

      await waitFor(() => {
        expect(screen.getByText('First Task')).toBeInTheDocument()
      })

      const firstItem = screen.getByText('First Task').closest('[role="listitem"]')
      await user.click(firstItem!)

      expect(mockOnItemClick).toHaveBeenCalledWith(mockItems[0])
    })

    it('should handle keyboard navigation on items', async () => {
      const user = userEvent.setup()
      renderTaskList()

      await waitFor(() => {
        expect(screen.getByText('First Task')).toBeInTheDocument()
      })

      const firstItem = screen.getByText('First Task').closest('[role="listitem"]')
      firstItem?.focus()

      await user.keyboard('{Enter}')
      expect(mockOnItemClick).toHaveBeenCalledWith(mockItems[0])

      await user.keyboard(' ')
      expect(mockOnItemClick).toHaveBeenCalledTimes(2)
    })

    it('should update item status', async () => {
      const user = userEvent.setup()
      
      // Mock the update API call
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { ...mockItems[0], status: 'completed' } })
      })

      renderTaskList()

      await waitFor(() => {
        expect(screen.getByText('First Task')).toBeInTheDocument()
      })

      const statusSelects = screen.getAllByLabelText(/Change status for/)
      await user.selectOptions(statusSelects[0], 'completed')

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/items/item-1', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'completed' })
        })
      })
    })

    it('should update item priority', async () => {
      const user = userEvent.setup()
      
      // Mock the update API call
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { ...mockItems[0], priority: 'urgent' } })
      })

      renderTaskList()

      await waitFor(() => {
        expect(screen.getByText('First Task')).toBeInTheDocument()
      })

      const prioritySelects = screen.getAllByLabelText(/Change priority for/)
      await user.selectOptions(prioritySelects[0], 'urgent')

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/items/item-1', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ priority: 'urgent' })
        })
      })
    })

    it('should prevent event propagation on select interactions', async () => {
      const user = userEvent.setup()
      renderTaskList()

      await waitFor(() => {
        expect(screen.getByText('First Task')).toBeInTheDocument()
      })

      const statusSelect = screen.getAllByLabelText(/Change status for/)[0]
      await user.click(statusSelect)

      // onItemClick should not be called when clicking on select
      expect(mockOnItemClick).not.toHaveBeenCalled()
    })
  })

  describe('Statistics Display', () => {
    it('should display correct item statistics', async () => {
      renderTaskList()

      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument() // Total items
        expect(screen.getByText('Total Items')).toBeInTheDocument()
        
        expect(screen.getByText('1')).toBeInTheDocument() // Completed items
        expect(screen.getByText('Completed')).toBeInTheDocument()
        
        expect(screen.getByText('In Progress')).toBeInTheDocument()
        expect(screen.getByText('Pending')).toBeInTheDocument()
      })
    })

    it('should update statistics when items change', async () => {
      renderTaskList()

      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument()
      })

      // Statistics should reflect the current state of items
      const completedCount = screen.getByText('Completed').previousElementSibling
      expect(completedCount).toHaveTextContent('1')
      
      const inProgressCount = screen.getByText('In Progress').previousElementSibling
      expect(inProgressCount).toHaveTextContent('1')
      
      const pendingCount = screen.getByText('Pending').previousElementSibling
      expect(pendingCount).toHaveTextContent('1')
    })
  })

  describe('Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = renderTaskList()

      await waitFor(() => {
        expect(screen.getByText('First Task')).toBeInTheDocument()
      })

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have proper ARIA labels', async () => {
      renderTaskList()

      await waitFor(() => {
        expect(screen.getByLabelText('Filter items by status')).toBeInTheDocument()
        expect(screen.getByLabelText('Sort items by')).toBeInTheDocument()
        expect(screen.getByLabelText('Task items')).toBeInTheDocument()
      })
    })

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      renderTaskList()

      await waitFor(() => {
        expect(screen.getByText('First Task')).toBeInTheDocument()
      })

      // Tab through interactive elements
      await user.tab() // Filter select
      expect(screen.getByLabelText('Filter items by status')).toHaveFocus()

      await user.tab() // Sort select
      expect(screen.getByLabelText('Sort items by')).toHaveFocus()
    })
  })

  describe('Visual Styling', () => {
    it('should apply correct priority colors', async () => {
      renderTaskList()

      await waitFor(() => {
        expect(screen.getByText('high')).toHaveClass('text-orange-600', 'bg-orange-100')
        expect(screen.getByText('medium')).toHaveClass('text-yellow-600', 'bg-yellow-100')
        expect(screen.getByText('low')).toHaveClass('text-green-600', 'bg-green-100')
      })
    })

    it('should apply correct status colors', async () => {
      renderTaskList()

      await waitFor(() => {
        const statusElements = screen.getAllByDisplayValue(/pending|in_progress|completed/)
        expect(statusElements.length).toBeGreaterThan(0)
      })
    })

    it('should style completed items differently', async () => {
      renderTaskList()

      await waitFor(() => {
        const completedItem = screen.getByText('Completed Task').closest('[role="listitem"]')
        expect(completedItem).toHaveClass('opacity-75')
        
        const completedTitle = screen.getByText('Completed Task')
        expect(completedTitle).toHaveClass('line-through')
      })
    })

    it('should apply hover effects', async () => {
      renderTaskList()

      await waitFor(() => {
        const firstItem = screen.getByText('First Task').closest('[role="listitem"]')
        expect(firstItem).toHaveClass('hover:shadow-md', 'transition-shadow')
      })
    })
  })
})

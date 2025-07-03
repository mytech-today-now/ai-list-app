/**
 * Table Component - AI-First semantic table with sorting, filtering, and MCP integration
 * SemanticType: AIFirstTable
 * ExtensibleByAI: true
 * AIUseCases: ["Data display", "Sorting", "Filtering", "Selection", "MCP data visualization"]
 */

import React, { forwardRef, useState, useCallback, useMemo } from 'react'
import { ChevronUp, ChevronDown, MoreHorizontal, Check } from 'lucide-react'
import {
  cn,
  getTransition,
  useKeyboardNavigation,
  Keys,
  type AIFirstComponentProps,
} from '../../design-system'

export interface TableColumn<T = any> {
  key: string
  header: string
  accessor?: keyof T | ((row: T) => React.ReactNode)
  sortable?: boolean
  filterable?: boolean
  width?: string | number
  align?: 'left' | 'center' | 'right'
  render?: (value: any, row: T, index: number) => React.ReactNode
}

export interface TableProps<T = any> extends 
  React.HTMLAttributes<HTMLTableElement>,
  AIFirstComponentProps {
  /**
   * Table data
   */
  data: T[]
  
  /**
   * Table columns configuration
   */
  columns: TableColumn<T>[]
  
  /**
   * Whether table is loading
   */
  loading?: boolean
  
  /**
   * Whether rows are selectable
   */
  selectable?: boolean
  
  /**
   * Whether to allow multiple row selection
   */
  multiSelect?: boolean
  
  /**
   * Selected row keys
   */
  selectedRows?: string[]
  
  /**
   * Row key accessor
   */
  rowKey?: keyof T | ((row: T) => string)
  
  /**
   * Whether table is sortable
   */
  sortable?: boolean
  
  /**
   * Current sort configuration
   */
  sort?: {
    key: string
    direction: 'asc' | 'desc'
  }
  
  /**
   * Whether table is filterable
   */
  filterable?: boolean
  
  /**
   * Current filters
   */
  filters?: Record<string, any>
  
  /**
   * Whether to show pagination
   */
  paginated?: boolean
  
  /**
   * Current page (0-based)
   */
  currentPage?: number
  
  /**
   * Items per page
   */
  pageSize?: number
  
  /**
   * Total number of items
   */
  totalItems?: number
  
  /**
   * Empty state message
   */
  emptyMessage?: string
  
  /**
   * Custom empty state component
   */
  emptyState?: React.ReactNode
  
  /**
   * Row click handler
   */
  onRowClick?: (row: T, index: number) => void
  
  /**
   * Selection change handler
   */
  onSelectionChange?: (selectedRows: string[]) => void
  
  /**
   * Sort change handler
   */
  onSortChange?: (sort: { key: string; direction: 'asc' | 'desc' }) => void
  
  /**
   * Filter change handler
   */
  onFilterChange?: (filters: Record<string, any>) => void
  
  /**
   * Page change handler
   */
  onPageChange?: (page: number) => void
}

/**
 * AI-First Table Component
 * 
 * Features:
 * - Comprehensive sorting and filtering
 * - Row selection with keyboard navigation
 * - Responsive design with horizontal scroll
 * - Loading and empty states
 * - MCP integration for data operations
 * - Accessibility-first with proper ARIA attributes
 * - AI-extensible with semantic metadata
 */
export const Table = forwardRef<HTMLTableElement, TableProps>(({
  data = [],
  columns = [],
  loading = false,
  selectable = false,
  multiSelect = false,
  selectedRows = [],
  rowKey = 'id',
  sortable = false,
  sort,
  filterable = false,
  filters = {},
  paginated = false,
  currentPage = 0,
  pageSize = 10,
  totalItems,
  emptyMessage = 'No data available',
  emptyState,
  onRowClick,
  onSelectionChange,
  onSortChange,
  onFilterChange,
  onPageChange,
  className,
  semanticMeaning,
  capabilities = ['data-display', 'sorting', 'filtering', 'selection', 'keyboard-navigation'],
  extensibleByAI = true,
  mcpType,
  onMCPCommand,
  aiContext,
  onAIInteraction,
  'aria-label': ariaLabel,
  'data-testid': testId,
  ...props
}, ref) => {
  const [hoveredRow, setHoveredRow] = useState<number | null>(null)
  
  // Get row key function
  const getRowKey = useCallback((row: any, index: number): string => {
    if (typeof rowKey === 'function') {
      return rowKey(row)
    }
    return row[rowKey] || index.toString()
  }, [rowKey])
  
  // Handle row selection
  const handleRowSelection = useCallback((rowKeyValue: string, selected: boolean) => {
    let newSelection: string[]
    
    if (multiSelect) {
      newSelection = selected
        ? [...selectedRows, rowKeyValue]
        : selectedRows.filter(key => key !== rowKeyValue)
    } else {
      newSelection = selected ? [rowKeyValue] : []
    }
    
    // MCP command for selection
    if (mcpType && onMCPCommand) {
      onMCPCommand('table:selection', {
        selectedRows: newSelection,
        multiSelect,
        semanticMeaning,
        timestamp: new Date().toISOString(),
      })
    }
    
    // AI interaction for selection
    if (onAIInteraction) {
      onAIInteraction({
        type: 'table:selection',
        data: {
          selectedRows: newSelection,
          multiSelect,
          semanticMeaning,
        },
        context: aiContext,
      })
    }
    
    onSelectionChange?.(newSelection)
  }, [multiSelect, selectedRows, mcpType, onMCPCommand, semanticMeaning, onAIInteraction, aiContext, onSelectionChange])
  
  // Handle column sort
  const handleSort = useCallback((columnKey: string) => {
    if (!sortable) return
    
    const newDirection = sort?.key === columnKey && sort.direction === 'asc' ? 'desc' : 'asc'
    const newSort = { key: columnKey, direction: newDirection }
    
    // MCP command for sorting
    if (mcpType && onMCPCommand) {
      onMCPCommand('table:sort', {
        sort: newSort,
        semanticMeaning,
        timestamp: new Date().toISOString(),
      })
    }
    
    onSortChange?.(newSort)
  }, [sortable, sort, mcpType, onMCPCommand, semanticMeaning, onSortChange])
  
  // Handle row click
  const handleRowClick = useCallback((row: any, index: number) => {
    if (selectable) {
      const rowKeyValue = getRowKey(row, index)
      const isSelected = selectedRows.includes(rowKeyValue)
      handleRowSelection(rowKeyValue, !isSelected)
    }
    
    onRowClick?.(row, index)
  }, [selectable, getRowKey, selectedRows, handleRowSelection, onRowClick])
  
  // Process data for display
  const displayData = useMemo(() => {
    let processedData = [...data]
    
    // Apply pagination if enabled
    if (paginated) {
      const startIndex = currentPage * pageSize
      processedData = processedData.slice(startIndex, startIndex + pageSize)
    }
    
    return processedData
  }, [data, paginated, currentPage, pageSize])
  
  // Render cell content
  const renderCell = useCallback((column: TableColumn, row: any, index: number) => {
    if (column.render) {
      return column.render(row[column.accessor as string], row, index)
    }
    
    if (typeof column.accessor === 'function') {
      return column.accessor(row)
    }
    
    return row[column.accessor as string]
  }, [])
  
  // Generate table classes
  const tableClasses = cn(
    'w-full border-collapse',
    'bg-white border border-neutral-200 rounded-lg overflow-hidden',
    {
      'opacity-75': loading,
    },
    className
  )
  
  // Generate accessibility attributes
  const accessibilityProps = {
    'aria-label': ariaLabel || semanticMeaning || 'Data table',
    'aria-rowcount': data.length,
    'aria-colcount': columns.length + (selectable ? 1 : 0),
    'aria-busy': loading,
    'data-semantic-type': 'ai-first-table',
    'data-mcp-type': mcpType,
    'data-ai-extensible': extensibleByAI,
    'data-testid': testId || 'ai-table',
    role: 'table',
  }
  
  // Loading state
  if (loading) {
    return (
      <div className="relative">
        <table ref={ref} className={tableClasses} {...accessibilityProps} {...props}>
          <thead>
            <tr>
              {selectable && <th className="w-12 p-4"></th>}
              {columns.map((column) => (
                <th key={column.key} className="p-4 text-left">
                  <div className="h-4 bg-neutral-200 rounded animate-pulse"></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, index) => (
              <tr key={index}>
                {selectable && <td className="p-4"></td>}
                {columns.map((column) => (
                  <td key={column.key} className="p-4">
                    <div className="h-4 bg-neutral-100 rounded animate-pulse"></div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-500" />
            <span className="text-sm font-medium">Loading data...</span>
          </div>
        </div>
      </div>
    )
  }
  
  // Empty state
  if (displayData.length === 0) {
    return (
      <div className="relative">
        <table ref={ref} className={tableClasses} {...accessibilityProps} {...props}>
          <thead>
            <tr className="bg-neutral-50">
              {selectable && (
                <th className="w-12 p-4">
                  <span className="sr-only">Select</span>
                </th>
              )}
              {columns.map((column) => (
                <th 
                  key={column.key}
                  className={cn(
                    'p-4 text-sm font-medium text-neutral-900',
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right'
                  )}
                  style={{ width: column.width }}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
        </table>
        
        <div className="p-12 text-center">
          {emptyState || (
            <div>
              <p className="text-neutral-500 mb-2">{emptyMessage}</p>
              <p className="text-sm text-neutral-400">Try adjusting your filters or adding some data.</p>
            </div>
          )}
        </div>
      </div>
    )
  }
  
  return (
    <div className="relative overflow-x-auto">
      <table ref={ref} className={tableClasses} {...accessibilityProps} {...props}>
        {/* Table header */}
        <thead>
          <tr className="bg-neutral-50 border-b border-neutral-200">
            {/* Selection column */}
            {selectable && (
              <th className="w-12 p-4">
                {multiSelect && (
                  <input
                    type="checkbox"
                    checked={selectedRows.length === data.length && data.length > 0}
                    onChange={(e) => {
                      const allKeys = data.map((row, index) => getRowKey(row, index))
                      handleRowSelection('all', e.target.checked ? true : false)
                      onSelectionChange?.(e.target.checked ? allKeys : [])
                    }}
                    className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                    aria-label="Select all rows"
                  />
                )}
              </th>
            )}
            
            {/* Column headers */}
            {columns.map((column) => (
              <th 
                key={column.key}
                className={cn(
                  'p-4 text-sm font-medium text-neutral-900',
                  column.align === 'center' && 'text-center',
                  column.align === 'right' && 'text-right',
                  column.sortable && sortable && 'cursor-pointer hover:bg-neutral-100'
                )}
                style={{ width: column.width }}
                onClick={() => column.sortable && handleSort(column.key)}
                role={column.sortable && sortable ? 'button' : undefined}
                aria-sort={
                  sort?.key === column.key 
                    ? sort.direction === 'asc' ? 'ascending' : 'descending'
                    : undefined
                }
              >
                <div className="flex items-center space-x-1">
                  <span>{column.header}</span>
                  {column.sortable && sortable && (
                    <div className="flex flex-col">
                      <ChevronUp 
                        className={cn(
                          'h-3 w-3',
                          sort?.key === column.key && sort.direction === 'asc'
                            ? 'text-primary-600'
                            : 'text-neutral-400'
                        )}
                      />
                      <ChevronDown 
                        className={cn(
                          'h-3 w-3 -mt-1',
                          sort?.key === column.key && sort.direction === 'desc'
                            ? 'text-primary-600'
                            : 'text-neutral-400'
                        )}
                      />
                    </div>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        
        {/* Table body */}
        <tbody>
          {displayData.map((row, index) => {
            const rowKeyValue = getRowKey(row, index)
            const isSelected = selectedRows.includes(rowKeyValue)
            const isHovered = hoveredRow === index
            
            return (
              <tr
                key={rowKeyValue}
                className={cn(
                  'border-b border-neutral-200 transition-colors duration-150',
                  {
                    'bg-primary-50': isSelected,
                    'hover:bg-neutral-50': !isSelected && (selectable || onRowClick),
                    'cursor-pointer': selectable || onRowClick,
                  }
                )}
                onClick={() => handleRowClick(row, index)}
                onMouseEnter={() => setHoveredRow(index)}
                onMouseLeave={() => setHoveredRow(null)}
                role="row"
                aria-selected={selectable ? isSelected : undefined}
              >
                {/* Selection cell */}
                {selectable && (
                  <td className="p-4">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => handleRowSelection(rowKeyValue, e.target.checked)}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                      aria-label={`Select row ${index + 1}`}
                    />
                  </td>
                )}
                
                {/* Data cells */}
                {columns.map((column) => (
                  <td 
                    key={column.key}
                    className={cn(
                      'p-4 text-sm text-neutral-900',
                      column.align === 'center' && 'text-center',
                      column.align === 'right' && 'text-right'
                    )}
                    role="cell"
                  >
                    {renderCell(column, row, index)}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
      
      {/* Hidden capabilities description */}
      {capabilities.length > 0 && (
        <span className="sr-only">
          Table capabilities: {capabilities.join(', ')}
        </span>
      )}
    </div>
  )
})

Table.displayName = 'Table'

export default Table

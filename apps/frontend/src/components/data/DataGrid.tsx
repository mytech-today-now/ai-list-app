/**
 * DataGrid Component - AI-First enhanced data grid with advanced features
 * SemanticType: AIFirstDataGrid
 * ExtensibleByAI: true
 * AIUseCases: ["Advanced data display", "Data manipulation", "Analytics", "MCP data operations"]
 */

import React, { forwardRef, useState, useCallback, useMemo } from 'react'
import { Search, Filter, Download, RefreshCw, Settings } from 'lucide-react'
import {
  cn,
  type AIFirstComponentProps,
} from '../../design-system'
import { Table, type TableColumn, type TableProps } from './Table'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

export interface DataGridColumn<T = any> extends TableColumn<T> {
  /**
   * Whether column is searchable
   */
  searchable?: boolean
  
  /**
   * Custom filter component
   */
  filterComponent?: React.ReactNode
  
  /**
   * Column aggregation function
   */
  aggregate?: 'sum' | 'avg' | 'count' | 'min' | 'max' | ((values: any[]) => any)
  
  /**
   * Whether column is exportable
   */
  exportable?: boolean
  
  /**
   * Column group
   */
  group?: string
}

export interface DataGridProps<T = any> extends 
  Omit<TableProps<T>, 'columns'>,
  AIFirstComponentProps {
  /**
   * Enhanced columns configuration
   */
  columns: DataGridColumn<T>[]
  
  /**
   * Whether to show search bar
   */
  searchable?: boolean
  
  /**
   * Search placeholder text
   */
  searchPlaceholder?: string
  
  /**
   * Whether to show filters
   */
  filterable?: boolean
  
  /**
   * Whether to show export button
   */
  exportable?: boolean
  
  /**
   * Whether to show refresh button
   */
  refreshable?: boolean
  
  /**
   * Whether to show column settings
   */
  configurable?: boolean
  
  /**
   * Whether to show toolbar
   */
  showToolbar?: boolean
  
  /**
   * Custom toolbar actions
   */
  toolbarActions?: React.ReactNode
  
  /**
   * Search value
   */
  searchValue?: string
  
  /**
   * Active filters
   */
  activeFilters?: Record<string, any>
  
  /**
   * Visible columns
   */
  visibleColumns?: string[]
  
  /**
   * Search handler
   */
  onSearch?: (value: string) => void
  
  /**
   * Filter handler
   */
  onFilter?: (filters: Record<string, any>) => void
  
  /**
   * Export handler
   */
  onExport?: (format: 'csv' | 'xlsx' | 'json') => void
  
  /**
   * Refresh handler
   */
  onRefresh?: () => void
  
  /**
   * Column configuration change handler
   */
  onColumnConfigChange?: (visibleColumns: string[]) => void
}

/**
 * AI-First DataGrid Component
 * 
 * Features:
 * - Enhanced table with search, filter, and export capabilities
 * - Column configuration and visibility controls
 * - Data aggregation and analytics
 * - Toolbar with customizable actions
 * - MCP integration for data operations
 * - Accessibility-first with comprehensive ARIA support
 */
export const DataGrid = forwardRef<HTMLTableElement, DataGridProps>(({
  columns = [],
  searchable = true,
  searchPlaceholder = 'Search data...',
  filterable = true,
  exportable = true,
  refreshable = true,
  configurable = true,
  showToolbar = true,
  toolbarActions,
  searchValue = '',
  activeFilters = {},
  visibleColumns,
  onSearch,
  onFilter,
  onExport,
  onRefresh,
  onColumnConfigChange,
  className,
  semanticMeaning,
  capabilities = ['data-grid', 'search', 'filter', 'export', 'configuration'],
  extensibleByAI = true,
  mcpType,
  onMCPCommand,
  aiContext,
  onAIInteraction,
  'data-testid': testId,
  ...tableProps
}, ref) => {
  const [localSearchValue, setLocalSearchValue] = useState(searchValue)
  const [showFilters, setShowFilters] = useState(false)
  const [showColumnConfig, setShowColumnConfig] = useState(false)
  
  // Filter visible columns
  const displayColumns = useMemo(() => {
    if (!visibleColumns) return columns
    return columns.filter(col => visibleColumns.includes(col.key))
  }, [columns, visibleColumns])
  
  // Handle search
  const handleSearch = useCallback((value: string) => {
    setLocalSearchValue(value)
    
    // MCP command for search
    if (mcpType && onMCPCommand) {
      onMCPCommand('datagrid:search', {
        searchValue: value,
        semanticMeaning,
        timestamp: new Date().toISOString(),
      })
    }
    
    // AI interaction for search
    if (onAIInteraction) {
      onAIInteraction({
        type: 'datagrid:search',
        data: {
          searchValue: value,
          semanticMeaning,
        },
        context: aiContext,
      })
    }
    
    onSearch?.(value)
  }, [mcpType, onMCPCommand, semanticMeaning, onAIInteraction, aiContext, onSearch])
  
  // Handle export
  const handleExport = useCallback((format: 'csv' | 'xlsx' | 'json') => {
    // MCP command for export
    if (mcpType && onMCPCommand) {
      onMCPCommand('datagrid:export', {
        format,
        columns: displayColumns.map(col => col.key),
        semanticMeaning,
        timestamp: new Date().toISOString(),
      })
    }
    
    onExport?.(format)
  }, [mcpType, onMCPCommand, displayColumns, semanticMeaning, onExport])
  
  // Handle refresh
  const handleRefresh = useCallback(() => {
    // MCP command for refresh
    if (mcpType && onMCPCommand) {
      onMCPCommand('datagrid:refresh', {
        semanticMeaning,
        timestamp: new Date().toISOString(),
      })
    }
    
    onRefresh?.()
  }, [mcpType, onMCPCommand, semanticMeaning, onRefresh])
  
  // Generate grid classes
  const gridClasses = cn(
    'w-full space-y-4',
    className
  )
  
  // Generate accessibility attributes
  const accessibilityProps = {
    'data-semantic-type': 'ai-first-datagrid',
    'data-mcp-type': mcpType,
    'data-ai-extensible': extensibleByAI,
    'data-testid': testId || 'ai-datagrid',
  }
  
  return (
    <div className={gridClasses} {...accessibilityProps}>
      {/* Toolbar */}
      {showToolbar && (
        <div className="flex items-center justify-between p-4 bg-white border border-neutral-200 rounded-lg">
          <div className="flex items-center space-x-4">
            {/* Search */}
            {searchable && (
              <div className="relative">
                <Input
                  placeholder={searchPlaceholder}
                  value={localSearchValue}
                  onChange={(e) => handleSearch(e.target.value)}
                  leftIcon={<Search className="h-4 w-4" />}
                  className="w-64"
                  aria-label="Search data grid"
                />
              </div>
            )}
            
            {/* Filters toggle */}
            {filterable && (
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Filter className="h-4 w-4" />}
                onClick={() => setShowFilters(!showFilters)}
                aria-label="Toggle filters"
                aria-expanded={showFilters}
              >
                Filters
              </Button>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Custom toolbar actions */}
            {toolbarActions}
            
            {/* Refresh */}
            {refreshable && (
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<RefreshCw className="h-4 w-4" />}
                onClick={handleRefresh}
                aria-label="Refresh data"
              >
                Refresh
              </Button>
            )}
            
            {/* Export */}
            {exportable && (
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Download className="h-4 w-4" />}
                onClick={() => handleExport('csv')}
                aria-label="Export data"
              >
                Export
              </Button>
            )}
            
            {/* Column configuration */}
            {configurable && (
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Settings className="h-4 w-4" />}
                onClick={() => setShowColumnConfig(!showColumnConfig)}
                aria-label="Configure columns"
                aria-expanded={showColumnConfig}
              >
                Columns
              </Button>
            )}
          </div>
        </div>
      )}
      
      {/* Filters panel */}
      {showFilters && filterable && (
        <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg">
          <h3 className="text-sm font-medium text-neutral-900 mb-3">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {columns
              .filter(col => col.filterable)
              .map(column => (
                <div key={column.key}>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    {column.header}
                  </label>
                  {column.filterComponent || (
                    <Input
                      placeholder={`Filter by ${column.header.toLowerCase()}`}
                      size="sm"
                      onChange={(e) => {
                        const newFilters = {
                          ...activeFilters,
                          [column.key]: e.target.value
                        }
                        onFilter?.(newFilters)
                      }}
                    />
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
      
      {/* Column configuration panel */}
      {showColumnConfig && configurable && (
        <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg">
          <h3 className="text-sm font-medium text-neutral-900 mb-3">Column Visibility</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {columns.map(column => (
              <label key={column.key} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={!visibleColumns || visibleColumns.includes(column.key)}
                  onChange={(e) => {
                    const currentVisible = visibleColumns || columns.map(col => col.key)
                    const newVisible = e.target.checked
                      ? [...currentVisible, column.key]
                      : currentVisible.filter(key => key !== column.key)
                    onColumnConfigChange?.(newVisible)
                  }}
                  className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-neutral-700">{column.header}</span>
              </label>
            ))}
          </div>
        </div>
      )}
      
      {/* Data table */}
      <Table
        ref={ref}
        columns={displayColumns}
        semanticMeaning={semanticMeaning || 'Enhanced data grid'}
        capabilities={capabilities}
        extensibleByAI={extensibleByAI}
        mcpType={mcpType}
        onMCPCommand={onMCPCommand}
        aiContext={aiContext}
        onAIInteraction={onAIInteraction}
        {...tableProps}
      />
      
      {/* Hidden capabilities description */}
      {capabilities.length > 0 && (
        <span className="sr-only">
          Data grid capabilities: {capabilities.join(', ')}
        </span>
      )}
    </div>
  )
})

DataGrid.displayName = 'DataGrid'

// DataGrid variants for common use cases
export const SearchableDataGrid = forwardRef<HTMLTableElement, Omit<DataGridProps, 'searchable'>>((props, ref) => (
  <DataGrid ref={ref} searchable={true} {...props} />
))

export const FilterableDataGrid = forwardRef<HTMLTableElement, Omit<DataGridProps, 'filterable'>>((props, ref) => (
  <DataGrid ref={ref} filterable={true} {...props} />
))

export const ExportableDataGrid = forwardRef<HTMLTableElement, Omit<DataGridProps, 'exportable'>>((props, ref) => (
  <DataGrid ref={ref} exportable={true} {...props} />
))

export const FullFeaturedDataGrid = forwardRef<HTMLTableElement, DataGridProps>((props, ref) => (
  <DataGrid 
    ref={ref} 
    searchable={true}
    filterable={true}
    exportable={true}
    refreshable={true}
    configurable={true}
    {...props} 
  />
))

SearchableDataGrid.displayName = 'SearchableDataGrid'
FilterableDataGrid.displayName = 'FilterableDataGrid'
ExportableDataGrid.displayName = 'ExportableDataGrid'
FullFeaturedDataGrid.displayName = 'FullFeaturedDataGrid'

export default DataGrid

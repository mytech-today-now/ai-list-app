/**
 * List Component - AI-First semantic list with virtualization and MCP integration
 * SemanticType: AIFirstList
 * ExtensibleByAI: true
 * AIUseCases: ["Data display", "Item selection", "Virtualization", "MCP data visualization"]
 */

import React, { forwardRef, useState, useCallback } from 'react'
import { Check, MoreVertical } from 'lucide-react'
import {
  cn,
  getTransition,
  useKeyboardNavigation,
  Keys,
  type AIFirstComponentProps,
} from '../../design-system'

export interface ListItem {
  id: string | number
  title: string
  description?: string
  subtitle?: string
  avatar?: React.ReactNode
  icon?: React.ReactNode
  badge?: React.ReactNode
  actions?: React.ReactNode
  metadata?: Record<string, any>
  disabled?: boolean
}

export interface ListProps extends 
  React.HTMLAttributes<HTMLDivElement>,
  AIFirstComponentProps {
  /**
   * List items
   */
  items: ListItem[]
  
  /**
   * Whether list is loading
   */
  loading?: boolean
  
  /**
   * Whether items are selectable
   */
  selectable?: boolean
  
  /**
   * Whether to allow multiple item selection
   */
  multiSelect?: boolean
  
  /**
   * Selected item IDs
   */
  selectedItems?: (string | number)[]
  
  /**
   * List variant
   */
  variant?: 'default' | 'compact' | 'comfortable' | 'spacious'
  
  /**
   * Whether to show dividers between items
   */
  showDividers?: boolean
  
  /**
   * Whether to show item actions
   */
  showActions?: boolean
  
  /**
   * Whether list is virtualized (for large datasets)
   */
  virtualized?: boolean
  
  /**
   * Item height for virtualization
   */
  itemHeight?: number
  
  /**
   * Container height for virtualization
   */
  containerHeight?: number
  
  /**
   * Empty state message
   */
  emptyMessage?: string
  
  /**
   * Custom empty state component
   */
  emptyState?: React.ReactNode
  
  /**
   * Custom item renderer
   */
  renderItem?: (item: ListItem, index: number, isSelected: boolean) => React.ReactNode
  
  /**
   * Item click handler
   */
  onItemClick?: (item: ListItem, index: number) => void
  
  /**
   * Selection change handler
   */
  onSelectionChange?: (selectedItems: (string | number)[]) => void
  
  /**
   * Item action handler
   */
  onItemAction?: (action: string, item: ListItem, index: number) => void
}

/**
 * AI-First List Component
 * 
 * Features:
 * - Multiple display variants (compact, comfortable, spacious)
 * - Item selection with keyboard navigation
 * - Virtualization support for large datasets
 * - Custom item rendering
 * - Loading and empty states
 * - MCP integration for data operations
 * - Accessibility-first with proper ARIA attributes
 */
export const List = forwardRef<HTMLDivElement, ListProps>(({
  items = [],
  loading = false,
  selectable = false,
  multiSelect = false,
  selectedItems = [],
  variant = 'default',
  showDividers = true,
  showActions = false,
  virtualized = false,
  itemHeight = 64,
  containerHeight = 400,
  emptyMessage = 'No items available',
  emptyState,
  renderItem,
  onItemClick,
  onSelectionChange,
  onItemAction,
  className,
  semanticMeaning,
  capabilities = ['data-display', 'selection', 'keyboard-navigation', 'virtualization'],
  extensibleByAI = true,
  mcpType,
  onMCPCommand,
  aiContext,
  onAIInteraction,
  'aria-label': ariaLabel,
  'data-testid': testId,
  ...props
}, ref) => {
  const [hoveredItem, setHoveredItem] = useState<string | number | null>(null)
  
  // Handle item selection
  const handleItemSelection = useCallback((itemId: string | number, selected: boolean) => {
    let newSelection: (string | number)[]
    
    if (multiSelect) {
      newSelection = selected
        ? [...selectedItems, itemId]
        : selectedItems.filter(id => id !== itemId)
    } else {
      newSelection = selected ? [itemId] : []
    }
    
    // MCP command for selection
    if (mcpType && onMCPCommand) {
      onMCPCommand('list:selection', {
        selectedItems: newSelection,
        multiSelect,
        semanticMeaning,
        timestamp: new Date().toISOString(),
      })
    }
    
    // AI interaction for selection
    if (onAIInteraction) {
      onAIInteraction({
        type: 'list:selection',
        data: {
          selectedItems: newSelection,
          multiSelect,
          semanticMeaning,
        },
        context: aiContext,
      })
    }
    
    onSelectionChange?.(newSelection)
  }, [multiSelect, selectedItems, mcpType, onMCPCommand, semanticMeaning, onAIInteraction, aiContext, onSelectionChange])
  
  // Handle item click
  const handleItemClick = useCallback((item: ListItem, index: number) => {
    if (item.disabled) return
    
    if (selectable) {
      const isSelected = selectedItems.includes(item.id)
      handleItemSelection(item.id, !isSelected)
    }
    
    onItemClick?.(item, index)
  }, [selectable, selectedItems, handleItemSelection, onItemClick])
  
  // Get variant classes
  const getVariantClasses = () => {
    switch (variant) {
      case 'compact':
        return 'py-2 px-3'
      case 'comfortable':
        return 'py-3 px-4'
      case 'spacious':
        return 'py-4 px-6'
      default:
        return 'py-3 px-4'
    }
  }
  
  // Render default list item
  const renderDefaultItem = useCallback((item: ListItem, index: number, isSelected: boolean) => {
    const isHovered = hoveredItem === item.id
    
    return (
      <div
        key={item.id}
        className={cn(
          'flex items-center space-x-3 transition-colors duration-150',
          getVariantClasses(),
          {
            'bg-primary-50 border-primary-200': isSelected,
            'hover:bg-neutral-50': !isSelected && !item.disabled,
            'cursor-pointer': !item.disabled && (selectable || onItemClick),
            'opacity-50 cursor-not-allowed': item.disabled,
            'border-b border-neutral-200': showDividers && index < items.length - 1,
          }
        )}
        onClick={() => handleItemClick(item, index)}
        onMouseEnter={() => setHoveredItem(item.id)}
        onMouseLeave={() => setHoveredItem(null)}
        role="listitem"
        aria-selected={selectable ? isSelected : undefined}
        aria-disabled={item.disabled}
      >
        {/* Selection checkbox */}
        {selectable && (
          <div className="flex-shrink-0">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => handleItemSelection(item.id, e.target.checked)}
              onClick={(e) => e.stopPropagation()}
              disabled={item.disabled}
              className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              aria-label={`Select ${item.title}`}
            />
          </div>
        )}
        
        {/* Avatar or icon */}
        {(item.avatar || item.icon) && (
          <div className="flex-shrink-0">
            {item.avatar || item.icon}
          </div>
        )}
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <h3 className={cn(
                'font-medium truncate',
                item.disabled ? 'text-neutral-400' : 'text-neutral-900'
              )}>
                {item.title}
              </h3>
              
              {item.subtitle && (
                <p className={cn(
                  'text-sm truncate',
                  item.disabled ? 'text-neutral-300' : 'text-neutral-600'
                )}>
                  {item.subtitle}
                </p>
              )}
              
              {item.description && (
                <p className={cn(
                  'text-sm mt-1',
                  item.disabled ? 'text-neutral-300' : 'text-neutral-500'
                )}>
                  {item.description}
                </p>
              )}
            </div>
            
            {/* Badge */}
            {item.badge && (
              <div className="flex-shrink-0 ml-2">
                {item.badge}
              </div>
            )}
          </div>
        </div>
        
        {/* Actions */}
        {(showActions || item.actions) && (
          <div className="flex-shrink-0">
            {item.actions || (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onItemAction?.('menu', item, index)
                }}
                className="p-1 rounded-md text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100"
                aria-label={`Actions for ${item.title}`}
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>
    )
  }, [
    hoveredItem,
    getVariantClasses,
    showDividers,
    items.length,
    handleItemClick,
    selectable,
    handleItemSelection,
    showActions,
    onItemAction
  ])
  
  // Generate list classes
  const listClasses = cn(
    'bg-white border border-neutral-200 rounded-lg overflow-hidden',
    {
      'opacity-75': loading,
    },
    className
  )
  
  // Generate accessibility attributes
  const accessibilityProps = {
    'aria-label': ariaLabel || semanticMeaning || 'List',
    'aria-busy': loading,
    'aria-multiselectable': selectable && multiSelect,
    'data-semantic-type': 'ai-first-list',
    'data-mcp-type': mcpType,
    'data-ai-extensible': extensibleByAI,
    'data-testid': testId || 'ai-list',
    role: 'list',
  }
  
  // Loading state
  if (loading) {
    return (
      <div ref={ref} className={listClasses} {...accessibilityProps} {...props}>
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className={cn('flex items-center space-x-3', getVariantClasses())}>
            <div className="flex-shrink-0">
              <div className="h-10 w-10 bg-neutral-200 rounded-full animate-pulse"></div>
            </div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-neutral-200 rounded animate-pulse"></div>
              <div className="h-3 bg-neutral-100 rounded animate-pulse w-3/4"></div>
            </div>
          </div>
        ))}
        
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-500" />
            <span className="text-sm font-medium">Loading items...</span>
          </div>
        </div>
      </div>
    )
  }
  
  // Empty state
  if (items.length === 0) {
    return (
      <div ref={ref} className={listClasses} {...accessibilityProps} {...props}>
        <div className="p-12 text-center">
          {emptyState || (
            <div>
              <p className="text-neutral-500 mb-2">{emptyMessage}</p>
              <p className="text-sm text-neutral-400">Try adding some items or adjusting your filters.</p>
            </div>
          )}
        </div>
      </div>
    )
  }
  
  // Virtualized list (simplified implementation)
  if (virtualized) {
    return (
      <div 
        ref={ref} 
        className={listClasses} 
        style={{ height: containerHeight }}
        {...accessibilityProps} 
        {...props}
      >
        <div className="overflow-y-auto h-full">
          {items.map((item, index) => {
            const isSelected = selectedItems.includes(item.id)
            return renderItem 
              ? renderItem(item, index, isSelected)
              : renderDefaultItem(item, index, isSelected)
          })}
        </div>
      </div>
    )
  }
  
  // Regular list
  return (
    <div ref={ref} className={listClasses} {...accessibilityProps} {...props}>
      {items.map((item, index) => {
        const isSelected = selectedItems.includes(item.id)
        return renderItem 
          ? renderItem(item, index, isSelected)
          : renderDefaultItem(item, index, isSelected)
      })}
      
      {/* Hidden capabilities description */}
      {capabilities.length > 0 && (
        <span className="sr-only">
          List capabilities: {capabilities.join(', ')}
        </span>
      )}
    </div>
  )
})

List.displayName = 'List'

// List variants for common use cases
export const CompactList = forwardRef<HTMLDivElement, Omit<ListProps, 'variant'>>((props, ref) => (
  <List ref={ref} variant="compact" {...props} />
))

export const ComfortableList = forwardRef<HTMLDivElement, Omit<ListProps, 'variant'>>((props, ref) => (
  <List ref={ref} variant="comfortable" {...props} />
))

export const SpaciousList = forwardRef<HTMLDivElement, Omit<ListProps, 'variant'>>((props, ref) => (
  <List ref={ref} variant="spacious" {...props} />
))

export const SelectableList = forwardRef<HTMLDivElement, Omit<ListProps, 'selectable'>>((props, ref) => (
  <List ref={ref} selectable={true} {...props} />
))

CompactList.displayName = 'CompactList'
ComfortableList.displayName = 'ComfortableList'
SpaciousList.displayName = 'SpaciousList'
SelectableList.displayName = 'SelectableList'

export default List

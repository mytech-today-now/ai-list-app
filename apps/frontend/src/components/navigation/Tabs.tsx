/**
 * Tabs Component - AI-First semantic tabs with keyboard navigation and MCP integration
 * SemanticType: AIFirstTabs
 * ExtensibleByAI: true
 * AIUseCases: ["Content organization", "View switching", "MCP tool interfaces", "Multi-panel layouts"]
 */

import React, { forwardRef, useState, useCallback, useRef, useEffect } from 'react'
import { X } from 'lucide-react'
import {
  cn,
  getTransition,
  useKeyboardNavigation,
  Keys,
  type SemanticVariant,
  type ComponentSize,
  type AIFirstComponentProps,
} from '../../design-system'

export interface TabItem {
  id: string
  label: string
  content?: React.ReactNode
  icon?: React.ReactNode
  badge?: React.ReactNode
  disabled?: boolean
  closable?: boolean
  metadata?: Record<string, any>
}

export interface TabsProps extends 
  React.HTMLAttributes<HTMLDivElement>,
  AIFirstComponentProps {
  /**
   * Tab items
   */
  items: TabItem[]
  
  /**
   * Active tab ID
   */
  activeTab?: string
  
  /**
   * Default active tab ID
   */
  defaultActiveTab?: string
  
  /**
   * Tabs variant
   */
  variant?: 'default' | 'pills' | 'underline' | 'cards'
  
  /**
   * Tabs size
   */
  size?: ComponentSize
  
  /**
   * Color variant
   */
  color?: SemanticVariant
  
  /**
   * Tabs orientation
   */
  orientation?: 'horizontal' | 'vertical'
  
  /**
   * Whether tabs are scrollable
   */
  scrollable?: boolean
  
  /**
   * Whether to show tab content
   */
  showContent?: boolean
  
  /**
   * Whether tabs can be reordered
   */
  reorderable?: boolean
  
  /**
   * Tab change handler
   */
  onTabChange?: (tabId: string) => void
  
  /**
   * Tab close handler
   */
  onTabClose?: (tabId: string) => void
  
  /**
   * Tab reorder handler
   */
  onTabReorder?: (fromIndex: number, toIndex: number) => void
}

/**
 * AI-First Tabs Component
 * 
 * Features:
 * - Multiple tab variants (default, pills, underline, cards)
 * - Keyboard navigation (Arrow keys, Home, End)
 * - Closable tabs with close handlers
 * - Scrollable tabs for overflow handling
 * - Vertical and horizontal orientations
 * - MCP integration for AI-driven tab management
 * - Accessibility-first with proper ARIA attributes
 */
export const Tabs = forwardRef<HTMLDivElement, TabsProps>(({
  items = [],
  activeTab,
  defaultActiveTab,
  variant = 'default',
  size = 'md',
  color = 'primary',
  orientation = 'horizontal',
  scrollable = false,
  showContent = true,
  reorderable = false,
  onTabChange,
  onTabClose,
  onTabReorder,
  className,
  semanticMeaning,
  capabilities = ['navigation', 'keyboard-navigation', 'content-switching', 'accessibility'],
  extensibleByAI = true,
  mcpType,
  onMCPCommand,
  aiContext,
  onAIInteraction,
  'aria-label': ariaLabel,
  'data-testid': testId,
  ...props
}, ref) => {
  const [internalActiveTab, setInternalActiveTab] = useState(
    activeTab || defaultActiveTab || (items.length > 0 ? items[0].id : '')
  )
  const [focusedIndex, setFocusedIndex] = useState(0)
  const tabListRef = useRef<HTMLDivElement>(null)
  
  const currentActiveTab = activeTab || internalActiveTab
  const enabledItems = items.filter(item => !item.disabled)
  
  // Handle tab change
  const handleTabChange = useCallback((tabId: string) => {
    if (!activeTab) {
      setInternalActiveTab(tabId)
    }
    
    // MCP command for tab change
    if (mcpType && onMCPCommand) {
      onMCPCommand('tabs:change', {
        tabId,
        previousTab: currentActiveTab,
        semanticMeaning,
        timestamp: new Date().toISOString(),
      })
    }
    
    // AI interaction for tab change
    if (onAIInteraction) {
      onAIInteraction({
        type: 'tabs:change',
        data: {
          tabId,
          previousTab: currentActiveTab,
          semanticMeaning,
        },
        context: aiContext,
      })
    }
    
    onTabChange?.(tabId)
  }, [activeTab, currentActiveTab, mcpType, onMCPCommand, semanticMeaning, onAIInteraction, aiContext, onTabChange])
  
  // Handle tab close
  const handleTabClose = useCallback((tabId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    
    // MCP command for tab close
    if (mcpType && onMCPCommand) {
      onMCPCommand('tabs:close', {
        tabId,
        semanticMeaning,
        timestamp: new Date().toISOString(),
      })
    }
    
    onTabClose?.(tabId)
  }, [mcpType, onMCPCommand, semanticMeaning, onTabClose])
  
  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    const isVertical = orientation === 'vertical'
    const nextKey = isVertical ? Keys.ARROW_DOWN : Keys.ARROW_RIGHT
    const prevKey = isVertical ? Keys.ARROW_UP : Keys.ARROW_LEFT
    
    switch (event.key) {
      case nextKey:
        event.preventDefault()
        setFocusedIndex(prev => 
          prev < enabledItems.length - 1 ? prev + 1 : 0
        )
        break
        
      case prevKey:
        event.preventDefault()
        setFocusedIndex(prev => 
          prev > 0 ? prev - 1 : enabledItems.length - 1
        )
        break
        
      case Keys.HOME:
        event.preventDefault()
        setFocusedIndex(0)
        break
        
      case Keys.END:
        event.preventDefault()
        setFocusedIndex(enabledItems.length - 1)
        break
        
      case Keys.ENTER:
      case Keys.SPACE:
        event.preventDefault()
        if (focusedIndex >= 0 && focusedIndex < enabledItems.length) {
          handleTabChange(enabledItems[focusedIndex].id)
        }
        break
    }
  }, [orientation, enabledItems, focusedIndex, handleTabChange])
  
  // Get size classes
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'text-sm px-3 py-1.5'
      case 'md':
        return 'text-sm px-4 py-2'
      case 'lg':
        return 'text-base px-6 py-3'
      default:
        return 'text-sm px-4 py-2'
    }
  }
  
  // Get variant classes
  const getVariantClasses = (isActive: boolean) => {
    const baseClasses = 'transition-all duration-200 ease-in-out'
    
    switch (variant) {
      case 'pills':
        return cn(
          baseClasses,
          'rounded-full',
          {
            [`bg-${color}-100 text-${color}-700 border border-${color}-200`]: isActive,
            'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100': !isActive,
          }
        )
        
      case 'underline':
        return cn(
          baseClasses,
          'border-b-2 border-transparent',
          {
            [`border-${color}-500 text-${color}-600`]: isActive,
            'text-neutral-600 hover:text-neutral-900 hover:border-neutral-300': !isActive,
          }
        )
        
      case 'cards':
        return cn(
          baseClasses,
          'border border-neutral-200 rounded-t-lg',
          {
            'bg-white border-b-white text-neutral-900': isActive,
            'bg-neutral-50 text-neutral-600 hover:bg-neutral-100': !isActive,
          }
        )
        
      default:
        return cn(
          baseClasses,
          'rounded-md',
          {
            [`bg-${color}-100 text-${color}-700`]: isActive,
            'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100': !isActive,
          }
        )
    }
  }
  
  // Get orientation classes
  const getOrientationClasses = () => {
    return orientation === 'vertical' 
      ? 'flex-col space-y-1' 
      : 'flex-row space-x-1'
  }
  
  // Render tab button
  const renderTabButton = (item: TabItem, index: number) => {
    const isActive = item.id === currentActiveTab
    const isFocused = focusedIndex === enabledItems.indexOf(item)
    
    return (
      <button
        key={item.id}
        type="button"
        role="tab"
        aria-selected={isActive}
        aria-controls={`tabpanel-${item.id}`}
        aria-disabled={item.disabled}
        tabIndex={isFocused ? 0 : -1}
        className={cn(
          'relative flex items-center justify-center font-medium focus:outline-none focus:ring-2 focus:ring-offset-2',
          `focus:ring-${color}-500`,
          getSizeClasses(),
          getVariantClasses(isActive),
          {
            'opacity-50 cursor-not-allowed': item.disabled,
            'cursor-pointer': !item.disabled,
          }
        )}
        onClick={() => !item.disabled && handleTabChange(item.id)}
        disabled={item.disabled}
      >
        {/* Icon */}
        {item.icon && (
          <span className="mr-2 h-4 w-4 flex-shrink-0">
            {item.icon}
          </span>
        )}
        
        {/* Label */}
        <span className="truncate">{item.label}</span>
        
        {/* Badge */}
        {item.badge && (
          <span className="ml-2 flex-shrink-0">
            {item.badge}
          </span>
        )}
        
        {/* Close button */}
        {item.closable && (
          <button
            type="button"
            onClick={(e) => handleTabClose(item.id, e)}
            className={cn(
              'ml-2 p-0.5 rounded-full hover:bg-black hover:bg-opacity-10',
              'focus:outline-none focus:ring-1 focus:ring-offset-1',
              `focus:ring-${color}-500`
            )}
            aria-label={`Close ${item.label} tab`}
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </button>
    )
  }
  
  // Get active tab content
  const getActiveTabContent = () => {
    const activeItem = items.find(item => item.id === currentActiveTab)
    return activeItem?.content
  }
  
  // Generate tabs classes
  const tabsClasses = cn(
    'w-full',
    {
      'flex': orientation === 'vertical',
      'space-x-4': orientation === 'vertical',
    },
    className
  )
  
  // Generate tab list classes
  const tabListClasses = cn(
    'flex',
    getOrientationClasses(),
    {
      'overflow-x-auto': scrollable && orientation === 'horizontal',
      'overflow-y-auto': scrollable && orientation === 'vertical',
      'flex-shrink-0': orientation === 'vertical',
    }
  )
  
  // Generate accessibility attributes
  const accessibilityProps = {
    'aria-label': ariaLabel || semanticMeaning || 'Tabs',
    'aria-orientation': orientation,
    'data-semantic-type': 'ai-first-tabs',
    'data-mcp-type': mcpType,
    'data-ai-extensible': extensibleByAI,
    'data-testid': testId || 'ai-tabs',
  }
  
  return (
    <div ref={ref} className={tabsClasses} {...props}>
      {/* Tab list */}
      <div
        ref={tabListRef}
        role="tablist"
        className={tabListClasses}
        onKeyDown={handleKeyDown}
        {...accessibilityProps}
      >
        {items.map((item, index) => renderTabButton(item, index))}
      </div>
      
      {/* Tab content */}
      {showContent && (
        <div
          role="tabpanel"
          id={`tabpanel-${currentActiveTab}`}
          aria-labelledby={`tab-${currentActiveTab}`}
          className={cn(
            'mt-4 focus:outline-none',
            {
              'flex-1': orientation === 'vertical',
            }
          )}
          tabIndex={0}
        >
          {getActiveTabContent()}
        </div>
      )}
      
      {/* Hidden capabilities description */}
      {capabilities.length > 0 && (
        <span className="sr-only">
          Tabs capabilities: {capabilities.join(', ')}
        </span>
      )}
    </div>
  )
})

Tabs.displayName = 'Tabs'

// Tabs variants for common use cases
export const PillTabs = forwardRef<HTMLDivElement, Omit<TabsProps, 'variant'>>((props, ref) => (
  <Tabs ref={ref} variant="pills" {...props} />
))

export const UnderlineTabs = forwardRef<HTMLDivElement, Omit<TabsProps, 'variant'>>((props, ref) => (
  <Tabs ref={ref} variant="underline" {...props} />
))

export const CardTabs = forwardRef<HTMLDivElement, Omit<TabsProps, 'variant'>>((props, ref) => (
  <Tabs ref={ref} variant="cards" {...props} />
))

export const VerticalTabs = forwardRef<HTMLDivElement, Omit<TabsProps, 'orientation'>>((props, ref) => (
  <Tabs ref={ref} orientation="vertical" {...props} />
))

// MCP-specific tabs variants
export const MCPToolTabs = forwardRef<HTMLDivElement, Omit<TabsProps, 'mcpType'>>((props, ref) => (
  <Tabs 
    ref={ref} 
    mcpType="resource"
    semanticMeaning="MCP Tool Interface"
    capabilities={['navigation', 'mcp-tools', 'keyboard-navigation']}
    {...props} 
  />
))

PillTabs.displayName = 'PillTabs'
UnderlineTabs.displayName = 'UnderlineTabs'
CardTabs.displayName = 'CardTabs'
VerticalTabs.displayName = 'VerticalTabs'
MCPToolTabs.displayName = 'MCPToolTabs'

export default Tabs

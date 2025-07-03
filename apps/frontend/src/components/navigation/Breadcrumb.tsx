/**
 * Breadcrumb Component - AI-First semantic breadcrumb navigation with MCP integration
 * SemanticType: AIFirstBreadcrumb
 * ExtensibleByAI: true
 * AIUseCases: ["Navigation hierarchy", "Location indication", "MCP context paths", "User orientation"]
 */

import React, { forwardRef } from 'react'
import { ChevronRight, Home, MoreHorizontal } from 'lucide-react'
import {
  cn,
  getTransition,
  type AIFirstComponentProps,
} from '../../design-system'

export interface BreadcrumbItem {
  id: string
  label: string
  href?: string
  icon?: React.ReactNode
  current?: boolean
  disabled?: boolean
  metadata?: Record<string, any>
}

export interface BreadcrumbProps extends 
  React.HTMLAttributes<HTMLNavElement>,
  AIFirstComponentProps {
  /**
   * Breadcrumb items
   */
  items: BreadcrumbItem[]
  
  /**
   * Separator element
   */
  separator?: React.ReactNode
  
  /**
   * Maximum visible items before collapsing
   */
  maxItems?: number
  
  /**
   * Whether to show home icon for first item
   */
  showHomeIcon?: boolean
  
  /**
   * Whether items are clickable
   */
  interactive?: boolean
  
  /**
   * Custom item renderer
   */
  renderItem?: (item: BreadcrumbItem, index: number, isLast: boolean) => React.ReactNode
  
  /**
   * Item click handler
   */
  onItemClick?: (item: BreadcrumbItem, index: number) => void
  
  /**
   * Collapsed items click handler
   */
  onCollapsedClick?: () => void
}

/**
 * AI-First Breadcrumb Component
 * 
 * Features:
 * - Semantic navigation structure with proper ARIA attributes
 * - Collapsible breadcrumbs for long paths
 * - Interactive and non-interactive modes
 * - Custom separators and item rendering
 * - MCP integration for AI-driven navigation
 * - Accessibility-first with screen reader support
 */
export const Breadcrumb = forwardRef<HTMLElement, BreadcrumbProps>(({
  items = [],
  separator,
  maxItems = 5,
  showHomeIcon = true,
  interactive = true,
  renderItem,
  onItemClick,
  onCollapsedClick,
  className,
  semanticMeaning,
  capabilities = ['navigation', 'hierarchy', 'accessibility', 'keyboard-navigation'],
  extensibleByAI = true,
  mcpType,
  onMCPCommand,
  aiContext,
  onAIInteraction,
  'aria-label': ariaLabel,
  'data-testid': testId,
  ...props
}, ref) => {
  // Handle item click
  const handleItemClick = (item: BreadcrumbItem, index: number, event: React.MouseEvent) => {
    if (item.disabled || item.current) {
      event.preventDefault()
      return
    }
    
    // MCP command for breadcrumb navigation
    if (mcpType && onMCPCommand) {
      onMCPCommand('breadcrumb:navigate', {
        itemId: item.id,
        label: item.label,
        href: item.href,
        index,
        semanticMeaning,
        timestamp: new Date().toISOString(),
      })
    }
    
    // AI interaction for breadcrumb navigation
    if (onAIInteraction) {
      onAIInteraction({
        type: 'breadcrumb:navigate',
        data: {
          item,
          index,
          semanticMeaning,
        },
        context: aiContext,
      })
    }
    
    onItemClick?.(item, index)
  }
  
  // Get default separator
  const getDefaultSeparator = () => {
    return separator || <ChevronRight className="h-4 w-4 text-neutral-400" />
  }
  
  // Process items for display (handle collapsing)
  const getDisplayItems = () => {
    if (items.length <= maxItems) {
      return items
    }
    
    // Show first item, collapsed indicator, and last few items
    const firstItem = items[0]
    const lastItems = items.slice(-(maxItems - 2))
    
    return [
      firstItem,
      {
        id: 'collapsed',
        label: '...',
        disabled: true,
        metadata: { collapsed: true, hiddenItems: items.slice(1, -(maxItems - 2)) },
      },
      ...lastItems,
    ]
  }
  
  // Render default breadcrumb item
  const renderDefaultItem = (item: BreadcrumbItem, index: number, isLast: boolean) => {
    const isCollapsed = item.metadata?.collapsed
    const isHome = index === 0 && showHomeIcon
    
    const itemContent = (
      <span className="flex items-center space-x-1">
        {isHome && (
          <Home className="h-4 w-4" />
        )}
        {item.icon && !isHome && (
          <span className="h-4 w-4">{item.icon}</span>
        )}
        <span>{item.label}</span>
      </span>
    )
    
    if (isCollapsed) {
      return (
        <button
          type="button"
          onClick={onCollapsedClick}
          className={cn(
            'flex items-center px-2 py-1 rounded-md text-sm font-medium transition-colors duration-150',
            'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2'
          )}
          aria-label="Show hidden breadcrumb items"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      )
    }
    
    if (!interactive || item.disabled || item.current) {
      return (
        <span
          className={cn(
            'text-sm font-medium',
            {
              'text-neutral-900': item.current,
              'text-neutral-500': !item.current && item.disabled,
              'text-neutral-600': !item.current && !item.disabled,
            }
          )}
          aria-current={item.current ? 'page' : undefined}
        >
          {itemContent}
        </span>
      )
    }
    
    if (item.href) {
      return (
        <a
          href={item.href}
          onClick={(e) => handleItemClick(item, index, e)}
          className={cn(
            'text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-md'
          )}
        >
          {itemContent}
        </a>
      )
    }
    
    return (
      <button
        type="button"
        onClick={(e) => handleItemClick(item, index, e)}
        className={cn(
          'text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors duration-150',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-md'
        )}
      >
        {itemContent}
      </button>
    )
  }
  
  const displayItems = getDisplayItems()
  
  // Generate breadcrumb classes
  const breadcrumbClasses = cn(
    'flex items-center space-x-2 text-sm',
    className
  )
  
  // Generate accessibility attributes
  const accessibilityProps = {
    'aria-label': ariaLabel || semanticMeaning || 'Breadcrumb navigation',
    'data-semantic-type': 'ai-first-breadcrumb',
    'data-mcp-type': mcpType,
    'data-ai-extensible': extensibleByAI,
    'data-testid': testId || 'ai-breadcrumb',
  }
  
  if (items.length === 0) {
    return null
  }
  
  return (
    <nav
      ref={ref}
      className={breadcrumbClasses}
      {...accessibilityProps}
      {...props}
    >
      <ol className="flex items-center space-x-2" role="list">
        {displayItems.map((item, index) => {
          const isLast = index === displayItems.length - 1
          
          return (
            <li key={item.id} className="flex items-center space-x-2">
              {/* Breadcrumb item */}
              {renderItem ? renderItem(item, index, isLast) : renderDefaultItem(item, index, isLast)}
              
              {/* Separator */}
              {!isLast && (
                <span className="flex-shrink-0" aria-hidden="true">
                  {getDefaultSeparator()}
                </span>
              )}
            </li>
          )
        })}
      </ol>
      
      {/* Hidden capabilities description */}
      {capabilities.length > 0 && (
        <span className="sr-only">
          Breadcrumb capabilities: {capabilities.join(', ')}
        </span>
      )}
    </nav>
  )
})

Breadcrumb.displayName = 'Breadcrumb'

// Breadcrumb variants for common use cases
export const SimpleBreadcrumb = forwardRef<HTMLElement, Omit<BreadcrumbProps, 'interactive'>>((props, ref) => (
  <Breadcrumb 
    ref={ref} 
    interactive={false}
    semanticMeaning="Simple breadcrumb navigation"
    {...props} 
  />
))

export const InteractiveBreadcrumb = forwardRef<HTMLElement, Omit<BreadcrumbProps, 'interactive'>>((props, ref) => (
  <Breadcrumb 
    ref={ref} 
    interactive={true}
    semanticMeaning="Interactive breadcrumb navigation"
    {...props} 
  />
))

// MCP-specific breadcrumb variants
export const MCPPathBreadcrumb = forwardRef<HTMLElement, Omit<BreadcrumbProps, 'mcpType'>>((props, ref) => (
  <Breadcrumb 
    ref={ref} 
    mcpType="resource"
    semanticMeaning="MCP Resource Path"
    capabilities={['navigation', 'mcp-path', 'hierarchy']}
    {...props} 
  />
))

SimpleBreadcrumb.displayName = 'SimpleBreadcrumb'
InteractiveBreadcrumb.displayName = 'InteractiveBreadcrumb'
MCPPathBreadcrumb.displayName = 'MCPPathBreadcrumb'

export default Breadcrumb

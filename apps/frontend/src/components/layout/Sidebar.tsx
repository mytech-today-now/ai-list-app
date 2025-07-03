/**
 * Sidebar Component - AI-First semantic sidebar with responsive behavior
 * SemanticType: AIFirstSidebar
 * ExtensibleByAI: true
 * AIUseCases: ["Navigation", "Content organization", "Responsive layout", "MCP tool access"]
 */

import React, { forwardRef, useEffect } from 'react'
import { X, Menu } from 'lucide-react'
import {
  cn,
  getTransition,
  useFocusTrap,
  Keys,
  type AIFirstComponentProps,
} from '../../design-system'

export interface SidebarProps extends 
  React.HTMLAttributes<HTMLDivElement>,
  AIFirstComponentProps {
  /**
   * Whether sidebar is open
   */
  open: boolean
  
  /**
   * Callback when sidebar should close
   */
  onClose?: () => void
  
  /**
   * Sidebar position
   */
  position?: 'left' | 'right'
  
  /**
   * Sidebar width
   */
  width?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  
  /**
   * Sidebar behavior on different screen sizes
   */
  behavior?: 'overlay' | 'push' | 'persistent'
  
  /**
   * Whether to show close button
   */
  showCloseButton?: boolean
  
  /**
   * Whether clicking overlay closes sidebar
   */
  closeOnOverlayClick?: boolean
  
  /**
   * Whether pressing escape closes sidebar
   */
  closeOnEscape?: boolean
  
  /**
   * Sidebar header content
   */
  header?: React.ReactNode
  
  /**
   * Sidebar footer content
   */
  footer?: React.ReactNode
  
  /**
   * Sidebar children content
   */
  children?: React.ReactNode
  
  /**
   * Custom overlay className
   */
  overlayClassName?: string
  
  /**
   * Custom content className
   */
  contentClassName?: string
}

/**
 * AI-First Sidebar Component
 * 
 * Features:
 * - Responsive behavior with overlay/push/persistent modes
 * - Focus trap for accessibility
 * - Keyboard navigation (Escape to close)
 * - Configurable positioning and width
 * - MCP tool integration for AI interactions
 * - Semantic navigation structure
 * - Screen reader support
 */
export const Sidebar = forwardRef<HTMLDivElement, SidebarProps>(({
  open,
  onClose,
  position = 'left',
  width = 'md',
  behavior = 'overlay',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  header,
  footer,
  children,
  className,
  overlayClassName,
  contentClassName,
  semanticMeaning,
  capabilities = ['navigation', 'focus-trap', 'keyboard-navigation', 'responsive'],
  extensibleByAI = true,
  mcpType,
  onMCPCommand,
  aiContext,
  onAIInteraction,
  'aria-label': ariaLabel,
  'data-testid': testId,
  ...props
}, ref) => {
  // Focus management for overlay behavior
  const { containerRef } = useFocusTrap(open && behavior === 'overlay')
  
  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (open && closeOnEscape && event.key === Keys.ESCAPE) {
        event.preventDefault()
        onClose?.()
      }
    }
    
    if (open) {
      document.addEventListener('keydown', handleEscape)
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open, closeOnEscape, onClose])
  
  // Handle body scroll for overlay behavior
  useEffect(() => {
    if (behavior === 'overlay' && open) {
      document.body.style.overflow = 'hidden'
      
      // MCP command for sidebar open
      if (mcpType && onMCPCommand) {
        onMCPCommand('sidebar:open', {
          position,
          width,
          behavior,
          timestamp: new Date().toISOString(),
        })
      }
      
      // AI interaction for sidebar open
      if (onAIInteraction) {
        onAIInteraction({
          type: 'sidebar:open',
          data: {
            position,
            width,
            behavior,
            semanticMeaning,
          },
          context: aiContext,
        })
      }
    } else {
      document.body.style.overflow = ''
    }
    
    return () => {
      document.body.style.overflow = ''
    }
  }, [behavior, open, mcpType, onMCPCommand, position, width, onAIInteraction, semanticMeaning, aiContext])
  
  // Handle overlay click
  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnOverlayClick && event.target === event.currentTarget) {
      onClose?.()
    }
  }
  
  // Get width classes
  const getWidthClasses = () => {
    switch (width) {
      case 'sm':
        return 'w-64'
      case 'md':
        return 'w-80'
      case 'lg':
        return 'w-96'
      case 'xl':
        return 'w-[28rem]'
      case 'full':
        return 'w-full'
      default:
        return 'w-80'
    }
  }
  
  // Get position classes
  const getPositionClasses = () => {
    const baseClasses = 'fixed top-0 h-full z-40'
    
    if (position === 'right') {
      return `${baseClasses} right-0`
    }
    
    return `${baseClasses} left-0`
  }
  
  // Get transform classes based on open state and position
  const getTransformClasses = () => {
    if (behavior === 'persistent') {
      return '' // No transform for persistent sidebar
    }
    
    if (position === 'right') {
      return open ? 'translate-x-0' : 'translate-x-full'
    }
    
    return open ? 'translate-x-0' : '-translate-x-full'
  }
  
  // Generate sidebar classes
  const sidebarClasses = cn(
    getPositionClasses(),
    getWidthClasses(),
    'bg-white border-r border-neutral-200 shadow-lg',
    'transform transition-transform duration-300 ease-in-out',
    getTransformClasses(),
    {
      'z-50': behavior === 'overlay',
    },
    contentClassName
  )
  
  // Generate overlay classes
  const overlayClasses = cn(
    'fixed inset-0 z-30 bg-black bg-opacity-50 backdrop-blur-sm',
    'transition-opacity duration-300 ease-in-out',
    {
      'opacity-100': open,
      'opacity-0 pointer-events-none': !open,
    },
    overlayClassName
  )
  
  // Generate accessibility attributes
  const accessibilityProps = {
    'aria-label': ariaLabel || semanticMeaning || 'Sidebar navigation',
    'aria-hidden': !open,
    'data-semantic-type': 'ai-first-sidebar',
    'data-mcp-type': mcpType,
    'data-ai-extensible': extensibleByAI,
    'data-testid': testId || 'ai-sidebar',
    role: 'navigation',
  }
  
  // Don't render overlay for persistent behavior
  const shouldShowOverlay = behavior === 'overlay' && open
  
  return (
    <>
      {/* Overlay */}
      {shouldShowOverlay && (
        <div 
          className={overlayClasses}
          onClick={handleOverlayClick}
          aria-hidden="true"
        />
      )}
      
      {/* Sidebar */}
      <div
        ref={(node) => {
          if (ref) {
            if (typeof ref === 'function') {
              ref(node)
            } else {
              ref.current = node
            }
          }
          if (containerRef && behavior === 'overlay') {
            containerRef.current = node
          }
        }}
        className={cn(sidebarClasses, className)}
        {...accessibilityProps}
        {...props}
      >
        {/* Sidebar header */}
        {(header || showCloseButton) && (
          <div className="flex items-center justify-between p-4 border-b border-neutral-200">
            <div className="flex-1">
              {header}
            </div>
            
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className={cn(
                  'ml-4 p-2 rounded-md text-neutral-400 hover:text-neutral-600',
                  'hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500',
                  'transition-colors duration-200'
                )}
                aria-label="Close sidebar"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}
        
        {/* Sidebar content */}
        {children && (
          <div className="flex-1 overflow-y-auto p-4">
            {children}
          </div>
        )}
        
        {/* Sidebar footer */}
        {footer && (
          <div className="p-4 border-t border-neutral-200">
            {footer}
          </div>
        )}
        
        {/* Hidden capabilities description */}
        {capabilities.length > 0 && (
          <span className="sr-only">
            Sidebar capabilities: {capabilities.join(', ')}
          </span>
        )}
      </div>
    </>
  )
})

Sidebar.displayName = 'Sidebar'

// Sidebar variants for common use cases
export const NavigationSidebar = forwardRef<HTMLDivElement, Omit<SidebarProps, 'semanticMeaning'>>((props, ref) => (
  <Sidebar 
    ref={ref} 
    semanticMeaning="Main navigation sidebar"
    capabilities={['navigation', 'menu-items', 'keyboard-navigation']}
    {...props} 
  />
))

export const ToolsSidebar = forwardRef<HTMLDivElement, Omit<SidebarProps, 'semanticMeaning' | 'mcpType'>>((props, ref) => (
  <Sidebar 
    ref={ref} 
    mcpType="resource"
    semanticMeaning="Tools and utilities sidebar"
    capabilities={['tools', 'mcp-resources', 'utilities']}
    {...props} 
  />
))

export const FilterSidebar = forwardRef<HTMLDivElement, Omit<SidebarProps, 'semanticMeaning'>>((props, ref) => (
  <Sidebar 
    ref={ref} 
    semanticMeaning="Filters and options sidebar"
    capabilities={['filters', 'options', 'form-controls']}
    {...props} 
  />
))

// Sidebar trigger button component
export interface SidebarTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Callback when trigger is clicked
   */
  onTrigger?: () => void
  
  /**
   * Whether sidebar is open (for aria-expanded)
   */
  sidebarOpen?: boolean
  
  /**
   * Custom icon
   */
  icon?: React.ReactNode
}

export const SidebarTrigger = forwardRef<HTMLButtonElement, SidebarTriggerProps>(({
  onTrigger,
  sidebarOpen = false,
  icon,
  className,
  children,
  onClick,
  'aria-label': ariaLabel,
  ...props
}, ref) => {
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    onTrigger?.()
    onClick?.(event)
  }
  
  return (
    <button
      ref={ref}
      type="button"
      onClick={handleClick}
      className={cn(
        'p-2 rounded-md text-neutral-600 hover:text-neutral-900',
        'hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500',
        'transition-colors duration-200',
        className
      )}
      aria-label={ariaLabel || 'Toggle sidebar'}
      aria-expanded={sidebarOpen}
      data-testid="sidebar-trigger"
      {...props}
    >
      {icon || <Menu className="h-5 w-5" />}
      {children}
    </button>
  )
})

SidebarTrigger.displayName = 'SidebarTrigger'

NavigationSidebar.displayName = 'NavigationSidebar'
ToolsSidebar.displayName = 'ToolsSidebar'
FilterSidebar.displayName = 'FilterSidebar'

export default Sidebar

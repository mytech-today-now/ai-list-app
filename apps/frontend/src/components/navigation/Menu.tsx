/**
 * Menu Component - AI-First semantic menu with keyboard navigation and MCP integration
 * SemanticType: AIFirstMenu
 * ExtensibleByAI: true
 * AIUseCases: ["Navigation", "Context menus", "Dropdown actions", "MCP command menus"]
 */

import React, { forwardRef, useState, useCallback, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronRight, Check, Circle } from 'lucide-react'
import {
  cn,
  getTransition,
  useFocusTrap,
  useKeyboardNavigation,
  Keys,
  type AIFirstComponentProps,
} from '../../design-system'

export interface MenuItem {
  id: string
  label: string
  description?: string
  icon?: React.ReactNode
  shortcut?: string
  disabled?: boolean
  separator?: boolean
  checked?: boolean
  type?: 'item' | 'checkbox' | 'radio' | 'separator' | 'submenu'
  submenu?: MenuItem[]
  onClick?: () => void
}

export interface MenuProps extends 
  React.HTMLAttributes<HTMLDivElement>,
  AIFirstComponentProps {
  /**
   * Menu items
   */
  items: MenuItem[]
  
  /**
   * Whether menu is open
   */
  open?: boolean
  
  /**
   * Menu trigger element
   */
  trigger?: React.ReactNode
  
  /**
   * Menu placement
   */
  placement?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end' | 'right-start' | 'left-start'
  
  /**
   * Whether to close on item click
   */
  closeOnClick?: boolean
  
  /**
   * Whether to close on outside click
   */
  closeOnOutsideClick?: boolean
  
  /**
   * Menu width
   */
  width?: 'auto' | 'trigger' | number
  
  /**
   * Maximum height
   */
  maxHeight?: number
  
  /**
   * Menu close handler
   */
  onClose?: () => void
  
  /**
   * Menu open handler
   */
  onOpen?: () => void
  
  /**
   * Item click handler
   */
  onItemClick?: (item: MenuItem) => void
  
  /**
   * Portal container
   */
  container?: HTMLElement
}

/**
 * AI-First Menu Component
 * 
 * Features:
 * - Comprehensive keyboard navigation (Arrow keys, Enter, Escape)
 * - Submenu support with hover and keyboard navigation
 * - Multiple item types (item, checkbox, radio, separator)
 * - Focus management and trapping
 * - MCP integration for AI-driven menus
 * - Accessibility-first with proper ARIA attributes
 */
export const Menu = forwardRef<HTMLDivElement, MenuProps>(({
  items = [],
  open = false,
  trigger,
  placement = 'bottom-start',
  closeOnClick = true,
  closeOnOutsideClick = true,
  width = 'auto',
  maxHeight = 400,
  onClose,
  onOpen,
  onItemClick,
  container,
  className,
  semanticMeaning,
  capabilities = ['navigation', 'keyboard-navigation', 'focus-management', 'accessibility'],
  extensibleByAI = true,
  mcpType,
  onMCPCommand,
  aiContext,
  onAIInteraction,
  'aria-label': ariaLabel,
  'data-testid': testId,
  ...props
}, ref) => {
  const [isOpen, setIsOpen] = useState(open)
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const triggerRef = useRef<HTMLElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const { containerRef } = useFocusTrap(isOpen)
  
  // Filter out separators for keyboard navigation
  const navigableItems = items.filter(item => item.type !== 'separator' && !item.disabled)
  
  // Handle menu open/close
  useEffect(() => {
    if (open !== isOpen) {
      setIsOpen(open)
      if (open) {
        onOpen?.()
        setFocusedIndex(0)
      } else {
        onClose?.()
        setActiveSubmenu(null)
        setFocusedIndex(-1)
      }
    }
  }, [open, isOpen, onOpen, onClose])
  
  // Handle outside click
  useEffect(() => {
    if (!isOpen || !closeOnOutsideClick) return
    
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        menuRef.current && !menuRef.current.contains(target) &&
        triggerRef.current && !triggerRef.current.contains(target)
      ) {
        handleClose()
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, closeOnOutsideClick])
  
  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!isOpen) return
    
    switch (event.key) {
      case Keys.ESCAPE:
        event.preventDefault()
        handleClose()
        break
        
      case Keys.ARROW_DOWN:
        event.preventDefault()
        setFocusedIndex(prev => 
          prev < navigableItems.length - 1 ? prev + 1 : 0
        )
        break
        
      case Keys.ARROW_UP:
        event.preventDefault()
        setFocusedIndex(prev => 
          prev > 0 ? prev - 1 : navigableItems.length - 1
        )
        break
        
      case Keys.ARROW_RIGHT:
        event.preventDefault()
        if (focusedIndex >= 0) {
          const item = navigableItems[focusedIndex]
          if (item.type === 'submenu' && item.submenu) {
            setActiveSubmenu(item.id)
          }
        }
        break
        
      case Keys.ARROW_LEFT:
        event.preventDefault()
        setActiveSubmenu(null)
        break
        
      case Keys.ENTER:
      case Keys.SPACE:
        event.preventDefault()
        if (focusedIndex >= 0) {
          handleItemClick(navigableItems[focusedIndex])
        }
        break
    }
  }, [isOpen, focusedIndex, navigableItems])
  
  // Handle menu close
  const handleClose = useCallback(() => {
    setIsOpen(false)
    onClose?.()
  }, [onClose])
  
  // Handle item click
  const handleItemClick = useCallback((item: MenuItem) => {
    if (item.disabled) return
    
    // MCP command for menu item click
    if (mcpType && onMCPCommand) {
      onMCPCommand('menu:item-click', {
        itemId: item.id,
        label: item.label,
        type: item.type,
        semanticMeaning,
        timestamp: new Date().toISOString(),
      })
    }
    
    // AI interaction for menu item click
    if (onAIInteraction) {
      onAIInteraction({
        type: 'menu:item-click',
        data: {
          item,
          semanticMeaning,
        },
        context: aiContext,
      })
    }
    
    item.onClick?.()
    onItemClick?.(item)
    
    if (closeOnClick && item.type !== 'submenu') {
      handleClose()
    }
  }, [mcpType, onMCPCommand, semanticMeaning, onAIInteraction, aiContext, onItemClick, closeOnClick, handleClose])
  
  // Render menu item
  const renderMenuItem = (item: MenuItem, index: number, isSubmenu = false) => {
    if (item.type === 'separator') {
      return (
        <div
          key={item.id}
          className="my-1 border-t border-neutral-200"
          role="separator"
        />
      )
    }
    
    const isFocused = !isSubmenu && focusedIndex === navigableItems.indexOf(item)
    const hasSubmenu = item.type === 'submenu' && item.submenu && item.submenu.length > 0
    
    return (
      <div
        key={item.id}
        className={cn(
          'flex items-center px-3 py-2 text-sm cursor-pointer transition-colors duration-150',
          'hover:bg-neutral-100 focus:bg-neutral-100 focus:outline-none',
          {
            'bg-neutral-100': isFocused,
            'opacity-50 cursor-not-allowed': item.disabled,
            'text-neutral-900': !item.disabled,
            'text-neutral-400': item.disabled,
          }
        )}
        role="menuitem"
        tabIndex={isFocused ? 0 : -1}
        aria-disabled={item.disabled}
        aria-checked={item.type === 'checkbox' || item.type === 'radio' ? item.checked : undefined}
        onClick={() => handleItemClick(item)}
        onMouseEnter={() => {
          if (!isSubmenu) {
            setFocusedIndex(navigableItems.indexOf(item))
          }
          if (hasSubmenu) {
            setActiveSubmenu(item.id)
          }
        }}
      >
        {/* Icon or checkbox/radio indicator */}
        <div className="flex-shrink-0 w-5 h-5 mr-3 flex items-center justify-center">
          {item.type === 'checkbox' && (
            <Check className={cn('h-4 w-4', item.checked ? 'text-primary-600' : 'text-transparent')} />
          )}
          {item.type === 'radio' && (
            <Circle className={cn('h-3 w-3', item.checked ? 'fill-current text-primary-600' : 'text-transparent')} />
          )}
          {item.icon && item.type === 'item' && (
            <span className="text-neutral-500">{item.icon}</span>
          )}
        </div>
        
        {/* Label and description */}
        <div className="flex-1 min-w-0">
          <div className="font-medium">{item.label}</div>
          {item.description && (
            <div className="text-xs text-neutral-500 mt-0.5">{item.description}</div>
          )}
        </div>
        
        {/* Shortcut */}
        {item.shortcut && (
          <div className="flex-shrink-0 ml-3 text-xs text-neutral-400">
            {item.shortcut}
          </div>
        )}
        
        {/* Submenu indicator */}
        {hasSubmenu && (
          <ChevronRight className="flex-shrink-0 ml-2 h-4 w-4 text-neutral-400" />
        )}
      </div>
    )
  }
  
  // Get menu position styles
  const getMenuPosition = () => {
    // This is a simplified positioning - in a real implementation,
    // you'd want to calculate actual positions based on trigger element
    switch (placement) {
      case 'bottom-start':
        return 'top-full left-0'
      case 'bottom-end':
        return 'top-full right-0'
      case 'top-start':
        return 'bottom-full left-0'
      case 'top-end':
        return 'bottom-full right-0'
      case 'right-start':
        return 'left-full top-0'
      case 'left-start':
        return 'right-full top-0'
      default:
        return 'top-full left-0'
    }
  }
  
  // Generate menu classes
  const menuClasses = cn(
    'absolute z-50 min-w-48 bg-white border border-neutral-200 rounded-lg shadow-lg',
    'py-1 overflow-hidden',
    getMenuPosition(),
    {
      'w-auto': width === 'auto',
      'w-full': width === 'trigger',
    },
    className
  )
  
  // Generate accessibility attributes
  const accessibilityProps = {
    'aria-label': ariaLabel || semanticMeaning || 'Menu',
    'aria-orientation': 'vertical' as const,
    'data-semantic-type': 'ai-first-menu',
    'data-mcp-type': mcpType,
    'data-ai-extensible': extensibleByAI,
    'data-testid': testId || 'ai-menu',
    role: 'menu',
  }
  
  const menuContent = isOpen ? (
    <div
      ref={(node) => {
        if (ref) {
          if (typeof ref === 'function') {
            ref(node)
          } else {
            ref.current = node
          }
        }
        menuRef.current = node
        if (containerRef) {
          containerRef.current = node
        }
      }}
      className={menuClasses}
      style={{
        width: typeof width === 'number' ? width : undefined,
        maxHeight,
        overflowY: 'auto',
      }}
      onKeyDown={handleKeyDown}
      {...accessibilityProps}
      {...props}
    >
      {items.map((item, index) => renderMenuItem(item, index))}
      
      {/* Hidden capabilities description */}
      {capabilities.length > 0 && (
        <span className="sr-only">
          Menu capabilities: {capabilities.join(', ')}
        </span>
      )}
    </div>
  ) : null
  
  // Render trigger with menu
  if (trigger) {
    return (
      <div className="relative inline-block">
        <div
          ref={triggerRef as any}
          onClick={() => setIsOpen(!isOpen)}
          aria-haspopup="menu"
          aria-expanded={isOpen}
        >
          {trigger}
        </div>
        
        {menuContent && createPortal(menuContent, container || document.body)}
      </div>
    )
  }
  
  // Render menu only
  return menuContent
})

Menu.displayName = 'Menu'

// Menu variants for common use cases
export const ContextMenu = forwardRef<HTMLDivElement, Omit<MenuProps, 'trigger'>>((props, ref) => (
  <Menu 
    ref={ref} 
    semanticMeaning="Context menu"
    capabilities={['context-menu', 'keyboard-navigation', 'accessibility']}
    {...props} 
  />
))

export const DropdownMenu = forwardRef<HTMLDivElement, MenuProps>((props, ref) => (
  <Menu 
    ref={ref} 
    semanticMeaning="Dropdown menu"
    capabilities={['dropdown', 'keyboard-navigation', 'accessibility']}
    {...props} 
  />
))

// MCP-specific menu variants
export const MCPCommandMenu = forwardRef<HTMLDivElement, Omit<MenuProps, 'mcpType'>>((props, ref) => (
  <Menu 
    ref={ref} 
    mcpType="command"
    semanticMeaning="MCP Command Menu"
    capabilities={['mcp-commands', 'keyboard-navigation', 'accessibility']}
    {...props} 
  />
))

ContextMenu.displayName = 'ContextMenu'
DropdownMenu.displayName = 'DropdownMenu'
MCPCommandMenu.displayName = 'MCPCommandMenu'

export default Menu

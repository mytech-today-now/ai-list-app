/**
 * AI Context Menu Component - AI-First intelligent context menu with MCP integration
 * SemanticType: AIFirstContextMenu
 * ExtensibleByAI: true
 * AIUseCases: ["Context-aware actions", "AI suggestions", "Smart shortcuts", "MCP tool access"]
 */

import React, { forwardRef, useState, useCallback, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Sparkles, Zap, Edit, Copy, Share, MoreHorizontal } from 'lucide-react'
import {
  cn,
  getTransition,
  useFocusTrap,
  useKeyboardNavigation,
  Keys,
  type AIFirstComponentProps,
} from '../../design-system'

export interface AIContextAction {
  id: string
  label: string
  description?: string
  icon?: React.ReactNode
  shortcut?: string
  type: 'ai-action' | 'standard' | 'separator' | 'submenu'
  aiPrompt?: string
  mcpCommand?: string
  confidence?: number
  category?: 'ai' | 'edit' | 'share' | 'analyze' | 'transform'
  disabled?: boolean
  dangerous?: boolean
  submenu?: AIContextAction[]
  action?: (context: any) => void | Promise<void>
}

export interface AIContextMenuProps extends 
  React.HTMLAttributes<HTMLDivElement>,
  AIFirstComponentProps {
  /**
   * Whether context menu is open
   */
  open?: boolean
  
  /**
   * Context menu position
   */
  position?: { x: number; y: number }
  
  /**
   * Available actions
   */
  actions: AIContextAction[]
  
  /**
   * Current selection/context
   */
  context?: any
  
  /**
   * Whether to show AI-powered suggestions
   */
  showAISuggestions?: boolean
  
  /**
   * Whether to group actions by category
   */
  groupByCategory?: boolean
  
  /**
   * Maximum number of AI suggestions
   */
  maxAISuggestions?: number
  
  /**
   * Custom action renderer
   */
  renderAction?: (action: AIContextAction, index: number, isSelected: boolean) => React.ReactNode
  
  /**
   * Context menu close handler
   */
  onClose?: () => void
  
  /**
   * Action execution handler
   */
  onActionExecute?: (action: AIContextAction, context: any) => void
  
  /**
   * AI suggestion request handler
   */
  onRequestAISuggestions?: (context: any) => Promise<AIContextAction[]>
  
  /**
   * Portal container
   */
  container?: HTMLElement
}

/**
 * AI-First Context Menu Component
 * 
 * Features:
 * - Context-aware AI action suggestions
 * - Dynamic action generation based on selection
 * - Keyboard navigation and shortcuts
 * - Action categorization and grouping
 * - MCP command integration
 * - Confidence-based action ranking
 */
export const AIContextMenu = forwardRef<HTMLDivElement, AIContextMenuProps>(({
  open = false,
  position = { x: 0, y: 0 },
  actions = [],
  context,
  showAISuggestions = true,
  groupByCategory = true,
  maxAISuggestions = 3,
  renderAction,
  onClose,
  onActionExecute,
  onRequestAISuggestions,
  container,
  className,
  semanticMeaning,
  capabilities = ['context-menu', 'ai-suggestions', 'keyboard-navigation', 'mcp-integration'],
  extensibleByAI = true,
  mcpType = 'command',
  onMCPCommand,
  aiContext,
  onAIInteraction,
  'aria-label': ariaLabel,
  'data-testid': testId,
  ...props
}, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [aiSuggestions, setAISuggestions] = useState<AIContextAction[]>([])
  const [loadingAI, setLoadingAI] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const { containerRef } = useFocusTrap(open)
  
  // Combine actions with AI suggestions
  const allActions = React.useMemo(() => {
    const combined = [...actions]
    
    if (showAISuggestions && aiSuggestions.length > 0) {
      // Add separator before AI suggestions
      if (combined.length > 0) {
        combined.push({
          id: 'ai-separator',
          label: '',
          type: 'separator',
        })
      }
      
      // Add AI suggestions
      combined.push(...aiSuggestions.slice(0, maxAISuggestions))
    }
    
    return combined
  }, [actions, aiSuggestions, showAISuggestions, maxAISuggestions])
  
  // Group actions by category
  const groupedActions = React.useMemo(() => {
    if (!groupByCategory) return { '': allActions }
    
    return allActions.reduce((groups, action) => {
      if (action.type === 'separator') {
        // Add separators to all groups
        Object.keys(groups).forEach(key => {
          groups[key].push(action)
        })
        return groups
      }
      
      const category = action.category || 'general'
      if (!groups[category]) groups[category] = []
      groups[category].push(action)
      return groups
    }, {} as Record<string, AIContextAction[]>)
  }, [allActions, groupByCategory])
  
  // Filter out separators for keyboard navigation
  const navigableActions = allActions.filter(action => 
    action.type !== 'separator' && !action.disabled
  )
  
  // Request AI suggestions when context changes
  useEffect(() => {
    if (open && showAISuggestions && onRequestAISuggestions && context) {
      setLoadingAI(true)
      onRequestAISuggestions(context)
        .then(suggestions => {
          setAISuggestions(suggestions)
        })
        .catch(error => {
          console.error('Failed to get AI suggestions:', error)
          setAISuggestions([])
        })
        .finally(() => {
          setLoadingAI(false)
        })
    }
  }, [open, showAISuggestions, onRequestAISuggestions, context])
  
  // Handle action execution
  const handleActionExecute = useCallback(async (action: AIContextAction) => {
    if (action.disabled) return
    
    // MCP command execution
    if (action.mcpCommand && onMCPCommand) {
      await onMCPCommand('context-menu:execute', {
        actionId: action.id,
        mcpCommand: action.mcpCommand,
        aiPrompt: action.aiPrompt,
        context,
        semanticMeaning,
        timestamp: new Date().toISOString(),
      })
    }
    
    // AI interaction
    if (onAIInteraction) {
      onAIInteraction({
        type: 'context-menu:execute',
        data: {
          action,
          context,
          semanticMeaning,
        },
        context: aiContext,
      })
    }
    
    // Execute action
    if (action.action) {
      await action.action(context)
    }
    
    onActionExecute?.(action, context)
    onClose?.()
  }, [onMCPCommand, context, semanticMeaning, onAIInteraction, aiContext, onActionExecute, onClose])
  
  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    switch (event.key) {
      case Keys.ESCAPE:
        event.preventDefault()
        onClose?.()
        break
        
      case Keys.ARROW_DOWN:
        event.preventDefault()
        setSelectedIndex(prev => 
          prev < navigableActions.length - 1 ? prev + 1 : 0
        )
        break
        
      case Keys.ARROW_UP:
        event.preventDefault()
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : navigableActions.length - 1
        )
        break
        
      case Keys.ENTER:
        event.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < navigableActions.length) {
          handleActionExecute(navigableActions[selectedIndex])
        }
        break
    }
  }, [navigableActions, selectedIndex, handleActionExecute, onClose])
  
  // Handle outside click
  useEffect(() => {
    if (!open) return
    
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose?.()
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open, onClose])
  
  // Get action icon
  const getActionIcon = (action: AIContextAction) => {
    if (action.icon) return action.icon
    
    switch (action.type) {
      case 'ai-action':
        return <Sparkles className="h-4 w-4" />
      default:
        switch (action.category) {
          case 'ai':
            return <Zap className="h-4 w-4" />
          case 'edit':
            return <Edit className="h-4 w-4" />
          case 'share':
            return <Share className="h-4 w-4" />
          default:
            return <MoreHorizontal className="h-4 w-4" />
        }
    }
  }
  
  // Get action color
  const getActionColor = (action: AIContextAction) => {
    if (action.dangerous) return 'text-red-500'
    if (action.type === 'ai-action') return 'text-purple-500'
    
    switch (action.category) {
      case 'ai':
        return 'text-purple-500'
      case 'edit':
        return 'text-blue-500'
      case 'share':
        return 'text-green-500'
      case 'analyze':
        return 'text-orange-500'
      case 'transform':
        return 'text-indigo-500'
      default:
        return 'text-neutral-500'
    }
  }
  
  // Render action item
  const renderActionItem = (action: AIContextAction, index: number, globalIndex: number) => {
    if (action.type === 'separator') {
      return (
        <div
          key={action.id}
          className="my-1 border-t border-neutral-200"
          role="separator"
        />
      )
    }
    
    const isSelected = globalIndex === selectedIndex
    
    if (renderAction) {
      return renderAction(action, globalIndex, isSelected)
    }
    
    return (
      <div
        key={action.id}
        className={cn(
          'flex items-center px-3 py-2 text-sm cursor-pointer transition-colors duration-150',
          'hover:bg-neutral-100 focus:bg-neutral-100 focus:outline-none',
          {
            'bg-primary-50': isSelected,
            'opacity-50 cursor-not-allowed': action.disabled,
          }
        )}
        onClick={() => !action.disabled && handleActionExecute(action)}
        role="menuitem"
        aria-disabled={action.disabled}
        tabIndex={isSelected ? 0 : -1}
      >
        {/* Icon */}
        <div className={cn('flex-shrink-0 w-5 h-5 mr-3 flex items-center justify-center', getActionColor(action))}>
          {getActionIcon(action)}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="font-medium text-neutral-900 truncate">
              {action.label}
            </span>
            
            {/* Confidence indicator for AI actions */}
            {action.type === 'ai-action' && action.confidence && (
              <div className="ml-2 flex items-center space-x-1">
                <div className="w-8 h-1 bg-neutral-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-purple-500 transition-all duration-300"
                    style={{ width: `${action.confidence * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
          
          {action.description && (
            <p className="text-xs text-neutral-500 mt-0.5 truncate">
              {action.description}
            </p>
          )}
        </div>
        
        {/* Shortcut */}
        {action.shortcut && (
          <div className="flex-shrink-0 ml-3">
            <kbd className="px-1.5 py-0.5 text-xs font-mono bg-neutral-100 border border-neutral-200 rounded">
              {action.shortcut}
            </kbd>
          </div>
        )}
      </div>
    )
  }
  
  // Calculate menu position
  const getMenuStyle = () => {
    return {
      left: position.x,
      top: position.y,
      transform: 'translate(0, 0)', // Adjust based on viewport bounds in real implementation
    }
  }
  
  // Generate menu classes
  const menuClasses = cn(
    'fixed z-50 min-w-48 bg-white border border-neutral-200 rounded-lg shadow-lg',
    'py-1 overflow-hidden',
    className
  )
  
  // Generate accessibility attributes
  const accessibilityProps = {
    'aria-label': ariaLabel || semanticMeaning || 'Context menu',
    'aria-orientation': 'vertical' as const,
    'data-semantic-type': 'ai-first-context-menu',
    'data-mcp-type': mcpType,
    'data-ai-extensible': extensibleByAI,
    'data-testid': testId || 'ai-context-menu',
    role: 'menu',
  }
  
  if (!open) return null
  
  const menuContent = (
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
      style={getMenuStyle()}
      onKeyDown={handleKeyDown}
      {...accessibilityProps}
      {...props}
    >
      {/* Loading AI suggestions */}
      {loadingAI && (
        <div className="px-3 py-2 text-sm text-neutral-500">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-500" />
            <span>Getting AI suggestions...</span>
          </div>
        </div>
      )}
      
      {/* Actions */}
      {groupByCategory ? (
        Object.entries(groupedActions).map(([category, categoryActions]) => (
          <div key={category}>
            {category && category !== 'general' && (
              <div className="px-3 py-1 text-xs font-medium text-neutral-500 bg-neutral-50">
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </div>
            )}
            
            {categoryActions.map((action, index) => {
              // Calculate global index
              let globalIndex = 0
              for (const [cat, actions] of Object.entries(groupedActions)) {
                if (cat === category) break
                globalIndex += actions.filter(a => a.type !== 'separator' && !a.disabled).length
              }
              globalIndex += categoryActions.slice(0, index).filter(a => a.type !== 'separator' && !a.disabled).length
              
              return renderActionItem(action, index, globalIndex)
            })}
          </div>
        ))
      ) : (
        allActions.map((action, index) => {
          const globalIndex = navigableActions.indexOf(action)
          return renderActionItem(action, index, globalIndex)
        })
      )}
      
      {/* Empty state */}
      {allActions.length === 0 && !loadingAI && (
        <div className="px-3 py-2 text-sm text-neutral-500">
          No actions available
        </div>
      )}
      
      {/* Hidden capabilities description */}
      {capabilities.length > 0 && (
        <span className="sr-only">
          Context menu capabilities: {capabilities.join(', ')}
        </span>
      )}
    </div>
  )
  
  return createPortal(menuContent, container || document.body)
})

AIContextMenu.displayName = 'AIContextMenu'

export default AIContextMenu

/**
 * Command Palette Component - AI-First command interface with MCP integration
 * SemanticType: AIFirstCommandPalette
 * ExtensibleByAI: true
 * AIUseCases: ["Command execution", "AI interaction", "Quick actions", "MCP tool access"]
 */

import React, { forwardRef, useState, useCallback, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Search, Command, ArrowRight, Zap, Clock, Star } from 'lucide-react'
import {
  cn,
  getTransition,
  useFocusTrap,
  useKeyboardNavigation,
  Keys,
  type AIFirstComponentProps,
} from '../../design-system'

export interface CommandItem {
  id: string
  label: string
  description?: string
  icon?: React.ReactNode
  shortcut?: string
  category?: string
  priority?: 'low' | 'medium' | 'high'
  recent?: boolean
  favorite?: boolean
  mcpCommand?: string
  aiPrompt?: string
  action?: () => void | Promise<void>
  metadata?: Record<string, any>
}

export interface CommandPaletteProps extends 
  React.HTMLAttributes<HTMLDivElement>,
  AIFirstComponentProps {
  /**
   * Whether command palette is open
   */
  open?: boolean
  
  /**
   * Available commands
   */
  commands: CommandItem[]
  
  /**
   * Placeholder text for search input
   */
  placeholder?: string
  
  /**
   * Whether to show categories
   */
  showCategories?: boolean
  
  /**
   * Whether to show recent commands
   */
  showRecent?: boolean
  
  /**
   * Whether to show favorites
   */
  showFavorites?: boolean
  
  /**
   * Maximum number of results to show
   */
  maxResults?: number
  
  /**
   * Custom command renderer
   */
  renderCommand?: (command: CommandItem, index: number, isSelected: boolean) => React.ReactNode
  
  /**
   * Command palette close handler
   */
  onClose?: () => void
  
  /**
   * Command execution handler
   */
  onCommandExecute?: (command: CommandItem) => void
  
  /**
   * Search change handler
   */
  onSearchChange?: (query: string) => void
  
  /**
   * Portal container
   */
  container?: HTMLElement
}

/**
 * AI-First Command Palette Component
 * 
 * Features:
 * - Fuzzy search with command filtering
 * - Keyboard navigation (Arrow keys, Enter, Escape)
 * - Command categories and prioritization
 * - Recent and favorite commands
 * - MCP command integration
 * - AI prompt execution
 * - Focus management and trapping
 */
export const CommandPalette = forwardRef<HTMLDivElement, CommandPaletteProps>(({
  open = false,
  commands = [],
  placeholder = 'Type a command or search...',
  showCategories = true,
  showRecent = true,
  showFavorites = true,
  maxResults = 10,
  renderCommand,
  onClose,
  onCommandExecute,
  onSearchChange,
  container,
  className,
  semanticMeaning,
  capabilities = ['command-execution', 'search', 'keyboard-navigation', 'mcp-integration'],
  extensibleByAI = true,
  mcpType = 'command',
  onMCPCommand,
  aiContext,
  onAIInteraction,
  'aria-label': ariaLabel,
  'data-testid': testId,
  ...props
}, ref) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isExecuting, setIsExecuting] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const { containerRef } = useFocusTrap(open)
  
  // Filter and sort commands based on search query
  const filteredCommands = React.useMemo(() => {
    let filtered = commands
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = commands.filter(command => 
        command.label.toLowerCase().includes(query) ||
        command.description?.toLowerCase().includes(query) ||
        command.category?.toLowerCase().includes(query)
      )
      
      // Sort by relevance (exact matches first, then partial matches)
      filtered.sort((a, b) => {
        const aExact = a.label.toLowerCase().startsWith(query) ? 1 : 0
        const bExact = b.label.toLowerCase().startsWith(query) ? 1 : 0
        if (aExact !== bExact) return bExact - aExact
        
        // Then by priority
        const priorityOrder = { high: 3, medium: 2, low: 1 }
        const aPriority = priorityOrder[a.priority || 'medium']
        const bPriority = priorityOrder[b.priority || 'medium']
        return bPriority - aPriority
      })
    } else {
      // Show recent and favorites first when no search query
      filtered = [...commands].sort((a, b) => {
        if (a.recent && !b.recent) return -1
        if (!a.recent && b.recent) return 1
        if (a.favorite && !b.favorite) return -1
        if (!a.favorite && b.favorite) return 1
        return 0
      })
    }
    
    return filtered.slice(0, maxResults)
  }, [commands, searchQuery, maxResults])
  
  // Group commands by category
  const groupedCommands = React.useMemo(() => {
    if (!showCategories) return { '': filteredCommands }
    
    return filteredCommands.reduce((groups, command) => {
      const category = command.category || 'General'
      if (!groups[category]) groups[category] = []
      groups[category].push(command)
      return groups
    }, {} as Record<string, CommandItem[]>)
  }, [filteredCommands, showCategories])
  
  // Handle search input change
  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const query = event.target.value
    setSearchQuery(query)
    setSelectedIndex(0)
    onSearchChange?.(query)
  }, [onSearchChange])
  
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
          prev < filteredCommands.length - 1 ? prev + 1 : 0
        )
        break
        
      case Keys.ARROW_UP:
        event.preventDefault()
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredCommands.length - 1
        )
        break
        
      case Keys.ENTER:
        event.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < filteredCommands.length) {
          handleCommandExecute(filteredCommands[selectedIndex])
        }
        break
    }
  }, [filteredCommands, selectedIndex, onClose])
  
  // Handle command execution
  const handleCommandExecute = useCallback(async (command: CommandItem) => {
    if (isExecuting) return
    
    setIsExecuting(true)
    
    try {
      // MCP command execution
      if (command.mcpCommand && onMCPCommand) {
        await onMCPCommand('command-palette:execute', {
          commandId: command.id,
          mcpCommand: command.mcpCommand,
          aiPrompt: command.aiPrompt,
          semanticMeaning,
          timestamp: new Date().toISOString(),
        })
      }
      
      // AI interaction
      if (onAIInteraction) {
        onAIInteraction({
          type: 'command-palette:execute',
          data: {
            command,
            searchQuery,
            semanticMeaning,
          },
          context: aiContext,
        })
      }
      
      // Execute command action
      if (command.action) {
        await command.action()
      }
      
      onCommandExecute?.(command)
      onClose?.()
    } catch (error) {
      console.error('Command execution failed:', error)
    } finally {
      setIsExecuting(false)
    }
  }, [isExecuting, onMCPCommand, semanticMeaning, onAIInteraction, searchQuery, aiContext, onCommandExecute, onClose])
  
  // Focus search input when opened
  useEffect(() => {
    if (open && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [open])
  
  // Reset state when closed
  useEffect(() => {
    if (!open) {
      setSearchQuery('')
      setSelectedIndex(0)
      setIsExecuting(false)
    }
  }, [open])
  
  // Render command item
  const renderCommandItem = (command: CommandItem, index: number, globalIndex: number) => {
    const isSelected = globalIndex === selectedIndex
    
    if (renderCommand) {
      return renderCommand(command, globalIndex, isSelected)
    }
    
    return (
      <div
        key={command.id}
        className={cn(
          'flex items-center px-4 py-3 cursor-pointer transition-colors duration-150',
          'hover:bg-neutral-100 focus:bg-neutral-100 focus:outline-none',
          {
            'bg-primary-50 border-l-2 border-primary-500': isSelected,
          }
        )}
        onClick={() => handleCommandExecute(command)}
        role="option"
        aria-selected={isSelected}
      >
        {/* Icon */}
        <div className="flex-shrink-0 w-8 h-8 mr-3 flex items-center justify-center">
          {command.icon || <Command className="h-4 w-4 text-neutral-400" />}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <span className="font-medium text-neutral-900 truncate">
              {command.label}
            </span>
            
            {/* Badges */}
            {command.recent && (
              <Clock className="h-3 w-3 text-neutral-400" />
            )}
            {command.favorite && (
              <Star className="h-3 w-3 text-yellow-500" />
            )}
            {command.priority === 'high' && (
              <Zap className="h-3 w-3 text-orange-500" />
            )}
          </div>
          
          {command.description && (
            <p className="text-sm text-neutral-500 truncate mt-0.5">
              {command.description}
            </p>
          )}
        </div>
        
        {/* Shortcut */}
        {command.shortcut && (
          <div className="flex-shrink-0 ml-3">
            <kbd className="px-2 py-1 text-xs font-mono bg-neutral-100 border border-neutral-200 rounded">
              {command.shortcut}
            </kbd>
          </div>
        )}
        
        {/* Arrow */}
        <ArrowRight className="flex-shrink-0 ml-2 h-4 w-4 text-neutral-400" />
      </div>
    )
  }
  
  // Generate command palette classes
  const paletteClasses = cn(
    'fixed inset-0 z-50 flex items-start justify-center pt-20',
    'bg-black bg-opacity-50 backdrop-blur-sm',
    className
  )
  
  // Generate accessibility attributes
  const accessibilityProps = {
    'aria-label': ariaLabel || semanticMeaning || 'Command palette',
    'data-semantic-type': 'ai-first-command-palette',
    'data-mcp-type': mcpType,
    'data-ai-extensible': extensibleByAI,
    'data-testid': testId || 'ai-command-palette',
    role: 'dialog',
    'aria-modal': true,
  }
  
  if (!open) return null
  
  const paletteContent = (
    <div className={paletteClasses} onClick={onClose}>
      <div
        ref={(node) => {
          if (ref) {
            if (typeof ref === 'function') {
              ref(node)
            } else {
              ref.current = node
            }
          }
          if (containerRef) {
            containerRef.current = node
          }
        }}
        className="w-full max-w-2xl mx-4 bg-white rounded-lg shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        {...accessibilityProps}
        {...props}
      >
        {/* Search input */}
        <div className="flex items-center px-4 py-3 border-b border-neutral-200">
          <Search className="h-5 w-5 text-neutral-400 mr-3" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder={placeholder}
            className="flex-1 bg-transparent border-none outline-none text-neutral-900 placeholder-neutral-500"
            aria-label="Search commands"
            role="combobox"
            aria-expanded={true}
            aria-autocomplete="list"
            aria-controls="command-list"
          />
        </div>
        
        {/* Commands list */}
        <div
          id="command-list"
          className="max-h-96 overflow-y-auto"
          role="listbox"
          aria-label="Available commands"
        >
          {filteredCommands.length === 0 ? (
            <div className="px-4 py-8 text-center text-neutral-500">
              {searchQuery ? 'No commands found' : 'No commands available'}
            </div>
          ) : (
            Object.entries(groupedCommands).map(([category, categoryCommands]) => {
              let globalIndex = 0
              
              // Calculate global index for this category
              for (const [cat, cmds] of Object.entries(groupedCommands)) {
                if (cat === category) break
                globalIndex += cmds.length
              }
              
              return (
                <div key={category}>
                  {showCategories && category && (
                    <div className="px-4 py-2 text-xs font-medium text-neutral-500 bg-neutral-50 border-b border-neutral-100">
                      {category}
                    </div>
                  )}
                  
                  {categoryCommands.map((command, index) => 
                    renderCommandItem(command, index, globalIndex + index)
                  )}
                </div>
              )
            })
          )}
        </div>
        
        {/* Footer */}
        <div className="px-4 py-2 bg-neutral-50 border-t border-neutral-200 text-xs text-neutral-500">
          <div className="flex items-center justify-between">
            <span>
              {filteredCommands.length} command{filteredCommands.length !== 1 ? 's' : ''}
            </span>
            <div className="flex items-center space-x-4">
              <span>↑↓ Navigate</span>
              <span>↵ Execute</span>
              <span>Esc Close</span>
            </div>
          </div>
        </div>
        
        {/* Hidden capabilities description */}
        {capabilities.length > 0 && (
          <span className="sr-only">
            Command palette capabilities: {capabilities.join(', ')}
          </span>
        )}
      </div>
    </div>
  )
  
  return createPortal(paletteContent, container || document.body)
})

CommandPalette.displayName = 'CommandPalette'

export default CommandPalette

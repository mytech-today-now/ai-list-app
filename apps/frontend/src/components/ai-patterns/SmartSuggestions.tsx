/**
 * Smart Suggestions Component - AI-First intelligent suggestions with MCP integration
 * SemanticType: AIFirstSmartSuggestions
 * ExtensibleByAI: true
 * AIUseCases: ["AI suggestions", "Auto-completion", "Smart recommendations", "MCP-driven insights"]
 */

import React, { forwardRef, useState, useCallback, useRef, useEffect } from 'react'
import { Lightbulb, Zap, TrendingUp, Clock, Star, ChevronRight } from 'lucide-react'
import {
  cn,
  getTransition,
  useKeyboardNavigation,
  Keys,
  type SemanticVariant,
  type AIFirstComponentProps,
} from '../../design-system'

export interface Suggestion {
  id: string
  title: string
  description?: string
  content?: string
  type: 'completion' | 'recommendation' | 'insight' | 'action' | 'template'
  confidence?: number
  category?: string
  icon?: React.ReactNode
  preview?: React.ReactNode
  metadata?: Record<string, any>
  action?: () => void | Promise<void>
}

export interface SmartSuggestionsProps extends 
  React.HTMLAttributes<HTMLDivElement>,
  AIFirstComponentProps {
  /**
   * Available suggestions
   */
  suggestions: Suggestion[]
  
  /**
   * Whether suggestions are loading
   */
  loading?: boolean
  
  /**
   * Current input context for suggestions
   */
  context?: string
  
  /**
   * Suggestion variant
   */
  variant?: 'inline' | 'popup' | 'sidebar'
  
  /**
   * Color variant
   */
  color?: SemanticVariant
  
  /**
   * Whether to show confidence scores
   */
  showConfidence?: boolean
  
  /**
   * Whether to show categories
   */
  showCategories?: boolean
  
  /**
   * Whether to show previews
   */
  showPreviews?: boolean
  
  /**
   * Maximum number of suggestions to show
   */
  maxSuggestions?: number
  
  /**
   * Whether suggestions are dismissible
   */
  dismissible?: boolean
  
  /**
   * Custom suggestion renderer
   */
  renderSuggestion?: (suggestion: Suggestion, index: number, isSelected: boolean) => React.ReactNode
  
  /**
   * Suggestion selection handler
   */
  onSuggestionSelect?: (suggestion: Suggestion) => void
  
  /**
   * Suggestion dismiss handler
   */
  onSuggestionDismiss?: (suggestion: Suggestion) => void
  
  /**
   * Context change handler
   */
  onContextChange?: (context: string) => void
}

/**
 * AI-First Smart Suggestions Component
 * 
 * Features:
 * - Multiple suggestion types (completion, recommendation, insight, action, template)
 * - Confidence scoring and categorization
 * - Keyboard navigation and selection
 * - Preview functionality for suggestions
 * - MCP integration for AI-driven suggestions
 * - Adaptive display based on context
 */
export const SmartSuggestions = forwardRef<HTMLDivElement, SmartSuggestionsProps>(({
  suggestions = [],
  loading = false,
  context = '',
  variant = 'popup',
  color = 'primary',
  showConfidence = true,
  showCategories = false,
  showPreviews = false,
  maxSuggestions = 5,
  dismissible = true,
  renderSuggestion,
  onSuggestionSelect,
  onSuggestionDismiss,
  onContextChange,
  className,
  semanticMeaning,
  capabilities = ['ai-suggestions', 'auto-completion', 'keyboard-navigation', 'mcp-integration'],
  extensibleByAI = true,
  mcpType = 'resource',
  onMCPCommand,
  aiContext,
  onAIInteraction,
  'aria-label': ariaLabel,
  'data-testid': testId,
  ...props
}, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set())
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Filter and sort suggestions
  const displaySuggestions = React.useMemo(() => {
    let filtered = suggestions.filter(s => !dismissedSuggestions.has(s.id))
    
    // Sort by confidence and type priority
    filtered.sort((a, b) => {
      const typeOrder = { action: 5, completion: 4, recommendation: 3, insight: 2, template: 1 }
      const aTypeScore = typeOrder[a.type] || 0
      const bTypeScore = typeOrder[b.type] || 0
      
      if (aTypeScore !== bTypeScore) return bTypeScore - aTypeScore
      
      const aConfidence = a.confidence || 0
      const bConfidence = b.confidence || 0
      return bConfidence - aConfidence
    })
    
    return filtered.slice(0, maxSuggestions)
  }, [suggestions, dismissedSuggestions, maxSuggestions])
  
  // Handle suggestion selection
  const handleSuggestionSelect = useCallback(async (suggestion: Suggestion) => {
    // MCP command for suggestion selection
    if (mcpType && onMCPCommand) {
      await onMCPCommand('suggestions:select', {
        suggestionId: suggestion.id,
        type: suggestion.type,
        confidence: suggestion.confidence,
        context,
        semanticMeaning,
        timestamp: new Date().toISOString(),
      })
    }
    
    // AI interaction for suggestion selection
    if (onAIInteraction) {
      onAIInteraction({
        type: 'suggestions:select',
        data: {
          suggestion,
          context,
          semanticMeaning,
        },
        context: aiContext,
      })
    }
    
    // Execute suggestion action
    if (suggestion.action) {
      await suggestion.action()
    }
    
    onSuggestionSelect?.(suggestion)
  }, [mcpType, onMCPCommand, context, semanticMeaning, onAIInteraction, aiContext, onSuggestionSelect])
  
  // Handle suggestion dismiss
  const handleSuggestionDismiss = useCallback((suggestion: Suggestion) => {
    setDismissedSuggestions(prev => new Set([...prev, suggestion.id]))
    onSuggestionDismiss?.(suggestion)
  }, [onSuggestionDismiss])
  
  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    switch (event.key) {
      case Keys.ARROW_DOWN:
        event.preventDefault()
        setSelectedIndex(prev => 
          prev < displaySuggestions.length - 1 ? prev + 1 : 0
        )
        break
        
      case Keys.ARROW_UP:
        event.preventDefault()
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : displaySuggestions.length - 1
        )
        break
        
      case Keys.ENTER:
        event.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < displaySuggestions.length) {
          handleSuggestionSelect(displaySuggestions[selectedIndex])
        }
        break
        
      case Keys.ESCAPE:
        event.preventDefault()
        setSelectedIndex(-1)
        break
    }
  }, [displaySuggestions, selectedIndex, handleSuggestionSelect])
  
  // Get suggestion type icon
  const getSuggestionIcon = (suggestion: Suggestion) => {
    if (suggestion.icon) return suggestion.icon
    
    switch (suggestion.type) {
      case 'completion':
        return <Zap className="h-4 w-4" />
      case 'recommendation':
        return <Lightbulb className="h-4 w-4" />
      case 'insight':
        return <TrendingUp className="h-4 w-4" />
      case 'action':
        return <ChevronRight className="h-4 w-4" />
      case 'template':
        return <Star className="h-4 w-4" />
      default:
        return <Lightbulb className="h-4 w-4" />
    }
  }
  
  // Get suggestion type color
  const getSuggestionColor = (suggestion: Suggestion) => {
    switch (suggestion.type) {
      case 'completion':
        return 'text-blue-500'
      case 'recommendation':
        return 'text-green-500'
      case 'insight':
        return 'text-purple-500'
      case 'action':
        return 'text-orange-500'
      case 'template':
        return 'text-yellow-500'
      default:
        return 'text-neutral-500'
    }
  }
  
  // Get confidence indicator
  const getConfidenceIndicator = (confidence?: number) => {
    if (!confidence || !showConfidence) return null
    
    const percentage = Math.round(confidence * 100)
    const color = confidence >= 0.8 ? 'bg-green-500' : confidence >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
    
    return (
      <div className="flex items-center space-x-1">
        <div className="w-12 h-1 bg-neutral-200 rounded-full overflow-hidden">
          <div 
            className={cn('h-full transition-all duration-300', color)}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-xs text-neutral-500">{percentage}%</span>
      </div>
    )
  }
  
  // Render suggestion item
  const renderSuggestionItem = (suggestion: Suggestion, index: number) => {
    const isSelected = index === selectedIndex
    
    if (renderSuggestion) {
      return renderSuggestion(suggestion, index, isSelected)
    }
    
    return (
      <div
        key={suggestion.id}
        className={cn(
          'p-3 cursor-pointer transition-all duration-150',
          'hover:bg-neutral-50 focus:bg-neutral-50 focus:outline-none',
          'border-l-2 border-transparent',
          {
            [`border-${color}-500 bg-${color}-50`]: isSelected,
          }
        )}
        onClick={() => handleSuggestionSelect(suggestion)}
        role="option"
        aria-selected={isSelected}
        tabIndex={isSelected ? 0 : -1}
      >
        <div className="flex items-start space-x-3">
          {/* Icon */}
          <div className={cn('flex-shrink-0 mt-0.5', getSuggestionColor(suggestion))}>
            {getSuggestionIcon(suggestion)}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-neutral-900 truncate">
                {suggestion.title}
              </h4>
              
              {/* Confidence indicator */}
              {getConfidenceIndicator(suggestion.confidence)}
            </div>
            
            {suggestion.description && (
              <p className="text-sm text-neutral-600 mt-1">
                {suggestion.description}
              </p>
            )}
            
            {/* Category */}
            {showCategories && suggestion.category && (
              <span className="inline-block px-2 py-1 mt-2 text-xs bg-neutral-100 text-neutral-600 rounded">
                {suggestion.category}
              </span>
            )}
            
            {/* Preview */}
            {showPreviews && suggestion.preview && (
              <div className="mt-2 p-2 bg-neutral-50 rounded text-sm">
                {suggestion.preview}
              </div>
            )}
          </div>
          
          {/* Dismiss button */}
          {dismissible && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleSuggestionDismiss(suggestion)
              }}
              className="flex-shrink-0 p-1 text-neutral-400 hover:text-neutral-600 rounded"
              aria-label={`Dismiss ${suggestion.title}`}
            >
              ×
            </button>
          )}
        </div>
      </div>
    )
  }
  
  // Get variant classes
  const getVariantClasses = () => {
    switch (variant) {
      case 'inline':
        return 'w-full'
      case 'sidebar':
        return 'w-80 h-full overflow-y-auto'
      case 'popup':
      default:
        return 'w-96 max-h-80 overflow-y-auto'
    }
  }
  
  // Generate suggestions classes
  const suggestionsClasses = cn(
    'bg-white border border-neutral-200 rounded-lg shadow-lg',
    getVariantClasses(),
    className
  )
  
  // Generate accessibility attributes
  const accessibilityProps = {
    'aria-label': ariaLabel || semanticMeaning || 'Smart suggestions',
    'aria-live': 'polite' as const,
    'data-semantic-type': 'ai-first-smart-suggestions',
    'data-mcp-type': mcpType,
    'data-ai-extensible': extensibleByAI,
    'data-testid': testId || 'ai-smart-suggestions',
    role: 'listbox',
  }
  
  if (loading) {
    return (
      <div ref={ref} className={suggestionsClasses} {...accessibilityProps} {...props}>
        <div className="p-4">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500" />
            <span className="text-sm text-neutral-600">Generating suggestions...</span>
          </div>
        </div>
      </div>
    )
  }
  
  if (displaySuggestions.length === 0) {
    return null
  }
  
  return (
    <div
      ref={ref}
      className={suggestionsClasses}
      onKeyDown={handleKeyDown}
      {...accessibilityProps}
      {...props}
    >
      {/* Header */}
      <div className="px-4 py-2 border-b border-neutral-200 bg-neutral-50">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-neutral-900">
            Smart Suggestions
          </h3>
          <span className="text-xs text-neutral-500">
            {displaySuggestions.length} suggestion{displaySuggestions.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
      
      {/* Suggestions list */}
      <div className="divide-y divide-neutral-100">
        {displaySuggestions.map((suggestion, index) => 
          renderSuggestionItem(suggestion, index)
        )}
      </div>
      
      {/* Footer */}
      <div className="px-4 py-2 border-t border-neutral-200 bg-neutral-50">
        <div className="flex items-center justify-between text-xs text-neutral-500">
          <span>↑↓ Navigate • ↵ Select • Esc Close</span>
          <Clock className="h-3 w-3" />
        </div>
      </div>
      
      {/* Hidden capabilities description */}
      {capabilities.length > 0 && (
        <span className="sr-only">
          Smart suggestions capabilities: {capabilities.join(', ')}
        </span>
      )}
    </div>
  )
})

SmartSuggestions.displayName = 'SmartSuggestions'

export default SmartSuggestions

/**
 * Textarea Component - AI-First semantic textarea with validation and MCP integration
 * SemanticType: AIFirstTextarea
 * ExtensibleByAI: true
 * AIUseCases: ["Multi-line text input", "Content creation", "AI prompt input", "Form descriptions"]
 */

import React, { forwardRef, useState, useCallback, useRef, useEffect } from 'react'
import { AlertCircle, CheckCircle, Info } from 'lucide-react'
import {
  cn,
  getFocusRing,
  type SemanticVariant,
  type ComponentSize,
  type AIFirstComponentProps,
} from '../../design-system'

export interface TextareaProps extends 
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  AIFirstComponentProps {
  /**
   * Textarea size
   */
  size?: ComponentSize
  
  /**
   * Visual variant for styling
   */
  variant?: SemanticVariant
  
  /**
   * Textarea state for validation styling
   */
  state?: 'default' | 'success' | 'warning' | 'error'
  
  /**
   * Label text
   */
  label?: string
  
  /**
   * Helper text below textarea
   */
  helperText?: string
  
  /**
   * Error message
   */
  error?: string
  
  /**
   * Success message
   */
  success?: string
  
  /**
   * Whether textarea should take full width
   */
  fullWidth?: boolean
  
  /**
   * Whether to auto-resize based on content
   */
  autoResize?: boolean
  
  /**
   * Minimum number of rows
   */
  minRows?: number
  
  /**
   * Maximum number of rows (for auto-resize)
   */
  maxRows?: number
  
  /**
   * Whether to show character count
   */
  showCharacterCount?: boolean
  
  /**
   * Maximum character limit
   */
  maxLength?: number
  
  /**
   * AI suggestions for the textarea
   */
  aiSuggestions?: string[]
  
  /**
   * Callback when AI suggestion is selected
   */
  onSuggestionSelect?: (suggestion: string) => void
  
  /**
   * Whether textarea supports MCP prompts
   */
  mcpPromptEnabled?: boolean
  
  /**
   * MCP prompt validation function
   */
  mcpPromptValidator?: (value: string) => boolean
}

/**
 * AI-First Textarea Component
 * 
 * Features:
 * - Auto-resize functionality
 * - Character count with limit validation
 * - AI suggestions with keyboard navigation
 * - MCP prompt integration and validation
 * - Comprehensive validation states
 * - Screen reader announcements
 * - Semantic labeling and descriptions
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({
  size = 'md',
  variant = 'neutral',
  state = 'default',
  label,
  helperText,
  error,
  success,
  fullWidth = false,
  autoResize = false,
  minRows = 3,
  maxRows = 10,
  showCharacterCount = false,
  maxLength,
  aiSuggestions = [],
  onSuggestionSelect,
  mcpPromptEnabled = false,
  mcpPromptValidator,
  className,
  disabled = false,
  rows = 3,
  mcpType,
  onMCPCommand,
  aiContext,
  onAIInteraction,
  semanticMeaning,
  capabilities = ['text-input', 'multi-line', 'auto-resize', 'validation', 'ai-suggestions'],
  extensibleByAI = true,
  onChange,
  onFocus,
  onBlur,
  'aria-label': ariaLabel,
  'data-testid': testId,
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [characterCount, setCharacterCount] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  // Determine current state based on props
  const currentState = error ? 'error' : success ? 'success' : state
  
  // Generate unique IDs for accessibility
  const textareaId = props.id || `textarea-${Math.random().toString(36).substr(2, 9)}`
  const helperTextId = `${textareaId}-helper`
  const errorId = `${textareaId}-error`
  const successId = `${textareaId}-success`
  const characterCountId = `${textareaId}-count`
  const suggestionsId = `${textareaId}-suggestions`
  
  // Auto-resize functionality
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea || !autoResize) return
    
    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto'
    
    // Calculate new height based on content
    const lineHeight = parseInt(getComputedStyle(textarea).lineHeight)
    const minHeight = lineHeight * minRows
    const maxHeight = lineHeight * maxRows
    const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight)
    
    textarea.style.height = `${newHeight}px`
  }, [autoResize, minRows, maxRows])
  
  // Handle textarea change with MCP and AI integration
  const handleChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.target.value
    setCharacterCount(value.length)
    
    // Auto-resize if enabled
    if (autoResize) {
      adjustHeight()
    }
    
    // MCP prompt validation
    if (mcpPromptEnabled && mcpPromptValidator) {
      const isValidMCPPrompt = mcpPromptValidator(value)
      if (isValidMCPPrompt && onMCPCommand) {
        onMCPCommand('textarea:validate', {
          value,
          valid: isValidMCPPrompt,
          characterCount: value.length,
          timestamp: new Date().toISOString(),
        })
      }
    }
    
    // AI interaction
    if (onAIInteraction) {
      onAIInteraction({
        type: 'textarea:change',
        data: {
          value,
          characterCount: value.length,
          mcpPromptEnabled,
          aiSuggestions: aiSuggestions.length > 0,
        },
        context: aiContext,
      })
    }
    
    onChange?.(event)
  }, [autoResize, adjustHeight, mcpPromptEnabled, mcpPromptValidator, onMCPCommand, onAIInteraction, aiContext, aiSuggestions.length, onChange])
  
  // Handle focus
  const handleFocus = useCallback((event: React.FocusEvent<HTMLTextAreaElement>) => {
    setIsFocused(true)
    if (aiSuggestions.length > 0) {
      setShowSuggestions(true)
    }
    onFocus?.(event)
  }, [aiSuggestions.length, onFocus])
  
  // Handle blur
  const handleBlur = useCallback((event: React.FocusEvent<HTMLTextAreaElement>) => {
    setIsFocused(false)
    // Delay hiding suggestions to allow for selection
    setTimeout(() => setShowSuggestions(false), 200)
    onBlur?.(event)
  }, [onBlur])
  
  // Handle suggestion selection
  const handleSuggestionSelect = useCallback((suggestion: string) => {
    onSuggestionSelect?.(suggestion)
    setShowSuggestions(false)
  }, [onSuggestionSelect])
  
  // Initialize character count and height
  useEffect(() => {
    if (props.defaultValue || props.value) {
      const initialValue = (props.value || props.defaultValue || '').toString()
      setCharacterCount(initialValue.length)
    }
    
    if (autoResize) {
      adjustHeight()
    }
  }, [props.defaultValue, props.value, autoResize, adjustHeight])
  
  // Get state-specific styling
  const getStateClasses = () => {
    switch (currentState) {
      case 'success':
        return 'border-success-500 focus:border-success-600 focus:ring-success-500'
      case 'warning':
        return 'border-warning-500 focus:border-warning-600 focus:ring-warning-500'
      case 'error':
        return 'border-error-500 focus:border-error-600 focus:ring-error-500'
      default:
        return 'border-neutral-300 focus:border-primary-500 focus:ring-primary-500'
    }
  }
  
  // Get state icon
  const getStateIcon = () => {
    switch (currentState) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-success-500" />
      case 'warning':
        return <Info className="h-4 w-4 text-warning-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-error-500" />
      default:
        return null
    }
  }
  
  // Get size classes
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'text-sm p-2'
      case 'md':
        return 'text-base p-3'
      case 'lg':
        return 'text-lg p-4'
      default:
        return 'text-base p-3'
    }
  }
  
  // Container classes
  const containerClasses = cn(
    'relative',
    fullWidth ? 'w-full' : 'w-auto'
  )
  
  // Textarea wrapper classes
  const wrapperClasses = cn(
    'relative',
    'border rounded-md bg-white',
    'transition-all duration-200 ease-in-out',
    getStateClasses(),
    {
      'opacity-50 cursor-not-allowed': disabled,
      'ring-2 ring-offset-2': isFocused,
    }
  )
  
  // Textarea classes
  const textareaClasses = cn(
    'w-full bg-transparent border-none outline-none resize-none',
    'placeholder-neutral-400',
    getSizeClasses(),
    {
      'resize-y': !autoResize,
      'overflow-hidden': autoResize,
    },
    className
  )
  
  // Character count classes
  const getCharacterCountClasses = () => {
    if (!maxLength) return 'text-neutral-500'
    
    const percentage = (characterCount / maxLength) * 100
    if (percentage >= 100) return 'text-error-600'
    if (percentage >= 90) return 'text-warning-600'
    return 'text-neutral-500'
  }
  
  // Generate accessibility attributes
  const accessibilityProps = {
    'aria-label': ariaLabel || label || semanticMeaning,
    'aria-describedby': [
      helperText && helperTextId,
      error && errorId,
      success && successId,
      showCharacterCount && characterCountId,
    ].filter(Boolean).join(' ') || undefined,
    'aria-invalid': currentState === 'error',
    'aria-required': props.required,
    'data-semantic-type': 'ai-first-textarea',
    'data-mcp-type': mcpType,
    'data-mcp-prompt-enabled': mcpPromptEnabled,
    'data-ai-extensible': extensibleByAI,
    'data-testid': testId || 'ai-textarea',
  }
  
  return (
    <div className={containerClasses}>
      {/* Label */}
      {label && (
        <label 
          htmlFor={textareaId}
          className={cn(
            'block text-sm font-medium mb-1',
            currentState === 'error' ? 'text-error-700' : 'text-neutral-700',
            disabled && 'opacity-50'
          )}
        >
          {label}
          {props.required && (
            <span className="text-error-500 ml-1" aria-label="required">*</span>
          )}
        </label>
      )}
      
      {/* Textarea wrapper */}
      <div className={wrapperClasses}>
        {/* Textarea */}
        <textarea
          ref={(node) => {
            if (ref) {
              if (typeof ref === 'function') {
                ref(node)
              } else {
                ref.current = node
              }
            }
            textareaRef.current = node
          }}
          id={textareaId}
          className={textareaClasses}
          disabled={disabled}
          rows={autoResize ? minRows : rows}
          maxLength={maxLength}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...accessibilityProps}
          {...props}
        />
        
        {/* State icon */}
        {getStateIcon() && (
          <div className="absolute top-3 right-3">
            {getStateIcon()}
          </div>
        )}
      </div>
      
      {/* Character count */}
      {showCharacterCount && (
        <div 
          id={characterCountId}
          className={cn(
            'mt-1 text-xs text-right',
            getCharacterCountClasses()
          )}
        >
          {characterCount}{maxLength && ` / ${maxLength}`}
        </div>
      )}
      
      {/* AI Suggestions */}
      {showSuggestions && aiSuggestions.length > 0 && (
        <div 
          id={suggestionsId}
          className="absolute z-10 w-full mt-1 bg-white border border-neutral-200 rounded-md shadow-lg max-h-60 overflow-auto"
          role="listbox"
          aria-label="AI suggestions"
        >
          {aiSuggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              className="w-full px-3 py-2 text-left hover:bg-neutral-50 focus:bg-neutral-50 focus:outline-none"
              onClick={() => handleSuggestionSelect(suggestion)}
              role="option"
              aria-selected={false}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
      
      {/* Helper text */}
      {helperText && !error && !success && (
        <p 
          id={helperTextId}
          className={cn(
            'mt-1 text-sm text-neutral-600',
            disabled && 'opacity-50'
          )}
        >
          {helperText}
        </p>
      )}
      
      {/* Error message */}
      {error && (
        <p 
          id={errorId}
          className="mt-1 text-sm text-error-600"
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      )}
      
      {/* Success message */}
      {success && (
        <p 
          id={successId}
          className="mt-1 text-sm text-success-600"
          role="status"
          aria-live="polite"
        >
          {success}
        </p>
      )}
      
      {/* Hidden capabilities description */}
      {capabilities.length > 0 && (
        <span className="sr-only">
          Textarea capabilities: {capabilities.join(', ')}
        </span>
      )}
    </div>
  )
})

Textarea.displayName = 'Textarea'

export default Textarea

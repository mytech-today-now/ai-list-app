/**
 * Input Component - AI-First semantic input with validation and MCP integration
 * SemanticType: AIFirstInput
 * ExtensibleByAI: true
 * AIUseCases: ["Data entry", "Form fields", "Search", "MCP prompt input", "AI suggestions"]
 */

import React, { forwardRef, useState, useCallback } from 'react'
import { Eye, EyeOff, AlertCircle, CheckCircle, Info } from 'lucide-react'
import {
  cn,
  getSizeClasses,
  getFocusRing,
  getTransition,
  type SemanticVariant,
  type ComponentSize,
  type AIFirstComponentProps,
} from '../../design-system'

export interface InputProps extends 
  Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
  AIFirstComponentProps {
  /**
   * Input size
   */
  size?: ComponentSize
  
  /**
   * Visual variant for styling
   */
  variant?: SemanticVariant
  
  /**
   * Input state for validation styling
   */
  state?: 'default' | 'success' | 'warning' | 'error'
  
  /**
   * Label text
   */
  label?: string
  
  /**
   * Helper text below input
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
   * Icon to display before input
   */
  leftIcon?: React.ReactNode
  
  /**
   * Icon to display after input
   */
  rightIcon?: React.ReactNode
  
  /**
   * Whether input should take full width
   */
  fullWidth?: boolean
  
  /**
   * Whether to show password toggle for password inputs
   */
  showPasswordToggle?: boolean
  
  /**
   * AI suggestions for the input
   */
  aiSuggestions?: string[]
  
  /**
   * Callback when AI suggestion is selected
   */
  onSuggestionSelect?: (suggestion: string) => void
  
  /**
   * Whether input supports MCP prompts
   */
  mcpPromptEnabled?: boolean
  
  /**
   * MCP prompt validation function
   */
  mcpPromptValidator?: (value: string) => boolean
}

/**
 * AI-First Input Component
 * 
 * Features:
 * - Semantic variants with proper validation states
 * - Full accessibility support with ARIA attributes
 * - MCP prompt integration and validation
 * - AI suggestions with keyboard navigation
 * - Password visibility toggle
 * - Comprehensive validation states
 * - Screen reader announcements
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(({
  size = 'md',
  variant = 'neutral',
  state = 'default',
  label,
  helperText,
  error,
  success,
  leftIcon,
  rightIcon,
  fullWidth = false,
  showPasswordToggle = false,
  aiSuggestions = [],
  onSuggestionSelect,
  mcpPromptEnabled = false,
  mcpPromptValidator,
  className,
  disabled = false,
  type = 'text',
  mcpType,
  onMCPCommand,
  aiContext,
  onAIInteraction,
  semanticMeaning,
  capabilities = ['input', 'focus', 'keyboard-navigation', 'validation'],
  extensibleByAI = true,
  onChange,
  onFocus,
  onBlur,
  'aria-label': ariaLabel,
  'data-testid': testId,
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  
  // Determine actual input type
  const inputType = type === 'password' && showPassword ? 'text' : type
  
  // Determine current state based on props
  const currentState = error ? 'error' : success ? 'success' : state
  
  // Generate unique IDs for accessibility
  const inputId = props.id || `input-${Math.random().toString(36).substr(2, 9)}`
  const helperTextId = `${inputId}-helper`
  const errorId = `${inputId}-error`
  const successId = `${inputId}-success`
  const suggestionsId = `${inputId}-suggestions`
  
  // Handle input change with MCP and AI integration
  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    
    // MCP prompt validation
    if (mcpPromptEnabled && mcpPromptValidator) {
      const isValidMCPPrompt = mcpPromptValidator(value)
      if (isValidMCPPrompt && onMCPCommand) {
        onMCPCommand('prompt:validate', {
          value,
          valid: isValidMCPPrompt,
          timestamp: new Date().toISOString(),
        })
      }
    }
    
    // AI interaction
    if (onAIInteraction) {
      onAIInteraction({
        type: 'input:change',
        data: {
          value,
          mcpPromptEnabled,
          aiSuggestions: aiSuggestions.length > 0,
        },
        context: aiContext,
      })
    }
    
    onChange?.(event)
  }, [mcpPromptEnabled, mcpPromptValidator, onMCPCommand, onAIInteraction, aiContext, aiSuggestions.length, onChange])
  
  // Handle focus
  const handleFocus = useCallback((event: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true)
    if (aiSuggestions.length > 0) {
      setShowSuggestions(true)
    }
    onFocus?.(event)
  }, [aiSuggestions.length, onFocus])
  
  // Handle blur
  const handleBlur = useCallback((event: React.FocusEvent<HTMLInputElement>) => {
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
  
  // Toggle password visibility
  const togglePasswordVisibility = useCallback(() => {
    setShowPassword(prev => !prev)
  }, [])
  
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
  
  // Input container classes
  const containerClasses = cn(
    'relative',
    fullWidth ? 'w-full' : 'w-auto'
  )
  
  // Input wrapper classes
  const wrapperClasses = cn(
    'relative flex items-center',
    'border rounded-md bg-white',
    'transition-all duration-200 ease-in-out',
    getSizeClasses(size, 'input'),
    getStateClasses(),
    {
      'opacity-50 cursor-not-allowed': disabled,
      'ring-2 ring-offset-2': isFocused,
    }
  )
  
  // Input field classes
  const inputClasses = cn(
    'flex-1 bg-transparent border-none outline-none',
    'placeholder-neutral-400',
    {
      'pl-3': !leftIcon,
      'pl-10': leftIcon,
      'pr-3': !rightIcon && !showPasswordToggle && !getStateIcon(),
      'pr-10': rightIcon || showPasswordToggle || getStateIcon(),
    },
    className
  )
  
  // Generate accessibility attributes
  const accessibilityProps = {
    'aria-label': ariaLabel || label || semanticMeaning,
    'aria-describedby': [
      helperText && helperTextId,
      error && errorId,
      success && successId,
    ].filter(Boolean).join(' ') || undefined,
    'aria-invalid': currentState === 'error',
    'aria-required': props.required,
    'data-semantic-type': 'ai-first-input',
    'data-mcp-type': mcpType,
    'data-mcp-prompt-enabled': mcpPromptEnabled,
    'data-ai-extensible': extensibleByAI,
    'data-testid': testId || 'ai-input',
  }
  
  return (
    <div className={containerClasses}>
      {/* Label */}
      {label && (
        <label 
          htmlFor={inputId}
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
      
      {/* Input wrapper */}
      <div className={wrapperClasses}>
        {/* Left icon */}
        {leftIcon && (
          <div className="absolute left-3 flex items-center pointer-events-none">
            <span className="h-4 w-4 text-neutral-400" aria-hidden="true">
              {leftIcon}
            </span>
          </div>
        )}
        
        {/* Input field */}
        <input
          ref={ref}
          id={inputId}
          type={inputType}
          className={inputClasses}
          disabled={disabled}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...accessibilityProps}
          {...props}
        />
        
        {/* Right icons */}
        <div className="absolute right-3 flex items-center space-x-1">
          {/* State icon */}
          {getStateIcon()}
          
          {/* Password toggle */}
          {type === 'password' && showPasswordToggle && (
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="p-1 text-neutral-400 hover:text-neutral-600 focus:outline-none focus:text-neutral-600"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          )}
          
          {/* Custom right icon */}
          {rightIcon && (
            <span className="h-4 w-4 text-neutral-400" aria-hidden="true">
              {rightIcon}
            </span>
          )}
        </div>
      </div>
      
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
          Input capabilities: {capabilities.join(', ')}
        </span>
      )}
    </div>
  )
})

Input.displayName = 'Input'

export default Input

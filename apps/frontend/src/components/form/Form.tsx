/**
 * Form Component - AI-First semantic form with validation and MCP integration
 * SemanticType: AIFirstForm
 * ExtensibleByAI: true
 * AIUseCases: ["Data collection", "User input", "Validation", "MCP command submission", "AI-assisted forms"]
 */

import React, { forwardRef, useCallback } from 'react'
import {
  cn,
  useScreenReaderAnnouncement,
  type AIFirstComponentProps,
} from '../../design-system'

export interface FormProps extends 
  React.FormHTMLAttributes<HTMLFormElement>,
  AIFirstComponentProps {
  /**
   * Form validation state
   */
  isValid?: boolean
  
  /**
   * Whether form is submitting
   */
  isSubmitting?: boolean
  
  /**
   * Form errors object
   */
  errors?: Record<string, string>
  
  /**
   * Form values object
   */
  values?: Record<string, unknown>
  
  /**
   * Validation schema or function
   */
  validate?: (values: Record<string, unknown>) => Record<string, string> | Promise<Record<string, string>>
  
  /**
   * Submit handler with validation
   */
  onSubmit?: (values: Record<string, unknown>, event: React.FormEvent<HTMLFormElement>) => void | Promise<void>
  
  /**
   * Change handler for form values
   */
  onChange?: (values: Record<string, unknown>) => void
  
  /**
   * Reset handler
   */
  onReset?: () => void
  
  /**
   * Whether to validate on change
   */
  validateOnChange?: boolean
  
  /**
   * Whether to validate on blur
   */
  validateOnBlur?: boolean
  
  /**
   * Whether to show validation summary
   */
  showValidationSummary?: boolean
  
  /**
   * Custom validation summary component
   */
  validationSummary?: React.ReactNode
  
  /**
   * Form children
   */
  children?: React.ReactNode
}

/**
 * AI-First Form Component
 * 
 * Features:
 * - Comprehensive validation with real-time feedback
 * - MCP command integration for AI-assisted forms
 * - Accessibility-first with proper ARIA attributes
 * - Screen reader announcements for validation states
 * - Semantic form structure with fieldsets and legends
 * - AI-extensible with form context and metadata
 * - Error handling and recovery patterns
 */
export const Form = forwardRef<HTMLFormElement, FormProps>(({
  isValid = true,
  isSubmitting = false,
  errors = {},
  values = {},
  validate,
  onSubmit,
  onChange,
  onReset,
  validateOnChange = false,
  validateOnBlur = true,
  showValidationSummary = true,
  validationSummary,
  className,
  children,
  semanticMeaning,
  capabilities = ['form-submission', 'validation', 'accessibility', 'mcp-integration'],
  extensibleByAI = true,
  mcpType,
  onMCPCommand,
  aiContext,
  onAIInteraction,
  'aria-label': ariaLabel,
  'data-testid': testId,
  ...props
}, ref) => {
  const announce = useScreenReaderAnnouncement()
  
  // Handle form submission with validation
  const handleSubmit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    
    if (isSubmitting) return
    
    // Validate form if validation function is provided
    let validationErrors: Record<string, string> = {}
    if (validate) {
      try {
        validationErrors = await validate(values)
      } catch (error) {
        console.error('Form validation error:', error)
        announce('Form validation failed. Please check your inputs.', 'assertive')
        return
      }
    }
    
    // Check if form has errors
    const hasErrors = Object.keys(validationErrors).length > 0 || Object.keys(errors).length > 0
    
    if (hasErrors) {
      announce(`Form has ${Object.keys(validationErrors).length || Object.keys(errors).length} validation errors. Please correct them and try again.`, 'assertive')
      return
    }
    
    // MCP command for form submission
    if (mcpType && onMCPCommand) {
      onMCPCommand('form:submit', {
        values,
        isValid: !hasErrors,
        semanticMeaning,
        timestamp: new Date().toISOString(),
      })
    }
    
    // AI interaction for form submission
    if (onAIInteraction) {
      onAIInteraction({
        type: 'form:submit',
        data: {
          values,
          isValid: !hasErrors,
          semanticMeaning,
          context: aiContext,
        },
        context: {
          capabilities,
          extensibleByAI,
        },
      })
    }
    
    // Call submit handler
    if (onSubmit) {
      try {
        await onSubmit(values, event)
        announce('Form submitted successfully.', 'polite')
      } catch (error) {
        console.error('Form submission error:', error)
        announce('Form submission failed. Please try again.', 'assertive')
      }
    }
  }, [isSubmitting, validate, values, errors, announce, mcpType, onMCPCommand, semanticMeaning, onAIInteraction, aiContext, capabilities, extensibleByAI, onSubmit])
  
  // Handle form reset
  const handleReset = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    if (onReset) {
      onReset()
      announce('Form has been reset.', 'polite')
    }
    
    // MCP command for form reset
    if (mcpType && onMCPCommand) {
      onMCPCommand('form:reset', {
        semanticMeaning,
        timestamp: new Date().toISOString(),
      })
    }
  }, [onReset, announce, mcpType, onMCPCommand, semanticMeaning])
  
  // Get validation summary
  const getValidationSummary = () => {
    const allErrors = { ...errors }
    const errorCount = Object.keys(allErrors).length
    
    if (errorCount === 0) return null
    
    if (validationSummary) {
      return validationSummary
    }
    
    return (
      <div 
        className="mb-6 p-4 bg-error-50 border border-error-200 rounded-md"
        role="alert"
        aria-live="assertive"
      >
        <h3 className="text-sm font-medium text-error-800 mb-2">
          Please correct the following {errorCount === 1 ? 'error' : 'errors'}:
        </h3>
        <ul className="text-sm text-error-700 space-y-1">
          {Object.entries(allErrors).map(([field, error]) => (
            <li key={field}>
              <a 
                href={`#${field}`}
                className="underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-error-500 focus:ring-offset-2 rounded"
              >
                {error}
              </a>
            </li>
          ))}
        </ul>
      </div>
    )
  }
  
  // Generate form classes
  const formClasses = cn(
    'space-y-6',
    {
      'opacity-75 pointer-events-none': isSubmitting,
    },
    className
  )
  
  // Generate accessibility attributes
  const accessibilityProps = {
    'aria-label': ariaLabel || semanticMeaning,
    'aria-invalid': !isValid,
    'aria-busy': isSubmitting,
    'aria-describedby': showValidationSummary && Object.keys(errors).length > 0 ? 'form-validation-summary' : undefined,
    'data-semantic-type': 'ai-first-form',
    'data-mcp-type': mcpType,
    'data-ai-extensible': extensibleByAI,
    'data-testid': testId || 'ai-form',
    noValidate: true, // We handle validation ourselves
  }
  
  return (
    <form
      ref={ref}
      className={formClasses}
      onSubmit={handleSubmit}
      onReset={handleReset}
      {...accessibilityProps}
      {...props}
    >
      {/* Validation summary */}
      {showValidationSummary && (
        <div id="form-validation-summary">
          {getValidationSummary()}
        </div>
      )}
      
      {/* Form content */}
      {children}
      
      {/* Loading indicator for submitting state */}
      {isSubmitting && (
        <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg flex items-center space-x-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-500" />
            <span className="text-sm font-medium">Submitting form...</span>
          </div>
        </div>
      )}
      
      {/* Hidden capabilities description */}
      {capabilities.length > 0 && (
        <span className="sr-only">
          Form capabilities: {capabilities.join(', ')}
        </span>
      )}
    </form>
  )
})

Form.displayName = 'Form'

// Form section components
export interface FormSectionProps extends React.HTMLAttributes<HTMLFieldSetElement> {
  /**
   * Section title
   */
  title?: string
  
  /**
   * Section description
   */
  description?: string
  
  /**
   * Whether section is required
   */
  required?: boolean
  
  /**
   * Section children
   */
  children?: React.ReactNode
}

export const FormSection = forwardRef<HTMLFieldSetElement, FormSectionProps>(({
  title,
  description,
  required = false,
  className,
  children,
  ...props
}, ref) => (
  <fieldset
    ref={ref}
    className={cn('space-y-4', className)}
    {...props}
  >
    {title && (
      <legend className="text-lg font-medium text-neutral-900 mb-4">
        {title}
        {required && (
          <span className="text-error-500 ml-1" aria-label="required">*</span>
        )}
      </legend>
    )}
    
    {description && (
      <p className="text-sm text-neutral-600 mb-4">
        {description}
      </p>
    )}
    
    {children}
  </fieldset>
))

FormSection.displayName = 'FormSection'

// Form field wrapper component
export interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Field label
   */
  label?: string
  
  /**
   * Field description/help text
   */
  description?: string
  
  /**
   * Field error message
   */
  error?: string
  
  /**
   * Whether field is required
   */
  required?: boolean
  
  /**
   * Field children (input, select, etc.)
   */
  children?: React.ReactNode
}

export const FormField = forwardRef<HTMLDivElement, FormFieldProps>(({
  label,
  description,
  error,
  required = false,
  className,
  children,
  ...props
}, ref) => {
  const fieldId = `field-${Math.random().toString(36).substr(2, 9)}`
  const descriptionId = description ? `${fieldId}-description` : undefined
  const errorId = error ? `${fieldId}-error` : undefined
  
  return (
    <div
      ref={ref}
      className={cn('space-y-2', className)}
      {...props}
    >
      {label && (
        <label 
          htmlFor={fieldId}
          className={cn(
            'block text-sm font-medium',
            error ? 'text-error-700' : 'text-neutral-700'
          )}
        >
          {label}
          {required && (
            <span className="text-error-500 ml-1" aria-label="required">*</span>
          )}
        </label>
      )}
      
      {description && (
        <p 
          id={descriptionId}
          className="text-sm text-neutral-600"
        >
          {description}
        </p>
      )}
      
      <div>
        {React.Children.map(children, child => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child, {
              id: fieldId,
              'aria-describedby': [descriptionId, errorId].filter(Boolean).join(' ') || undefined,
              'aria-invalid': !!error,
              'aria-required': required,
              ...child.props,
            })
          }
          return child
        })}
      </div>
      
      {error && (
        <p 
          id={errorId}
          className="text-sm text-error-600"
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      )}
    </div>
  )
})

FormField.displayName = 'FormField'

export default Form

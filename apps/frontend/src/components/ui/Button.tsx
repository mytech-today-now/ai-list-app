/**
 * Button Component - AI-First semantic button with MCP integration
 * SemanticType: AIFirstButton
 * ExtensibleByAI: true
 * AIUseCases: ["User actions", "Command triggers", "MCP tool execution", "Form submission"]
 */

import React, { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import {
  cn,
  getVariantClasses,
  getSizeClasses,
  getFocusRing,
  getTransition,
  getDisabledClasses,
  getLoadingClasses,
  type SemanticVariant,
  type ComponentSize,
  type AIFirstComponentProps,
} from '../../design-system'

export interface ButtonProps extends 
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'size'>,
  AIFirstComponentProps {
  /**
   * Visual style variant
   */
  variant?: SemanticVariant
  
  /**
   * Button size
   */
  size?: ComponentSize
  
  /**
   * Button style type
   */
  styleType?: 'filled' | 'outlined' | 'ghost' | 'link'
  
  /**
   * Whether button is in loading state
   */
  loading?: boolean
  
  /**
   * Icon to display before text
   */
  leftIcon?: React.ReactNode
  
  /**
   * Icon to display after text
   */
  rightIcon?: React.ReactNode
  
  /**
   * Whether button should take full width
   */
  fullWidth?: boolean
  
  /**
   * Button children content
   */
  children?: React.ReactNode
}

/**
 * AI-First Button Component
 * 
 * Features:
 * - Semantic variants with proper color contrast
 * - Full accessibility support with ARIA attributes
 * - MCP command integration
 * - Loading states with proper announcements
 * - Keyboard navigation support
 * - AI-extensible with semantic metadata
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  styleType = 'filled',
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className,
  children,
  mcpType,
  onMCPCommand,
  aiContext,
  onAIInteraction,
  semanticMeaning,
  capabilities = ['click', 'focus', 'keyboard-navigation'],
  extensibleByAI = true,
  onClick,
  onKeyDown,
  'aria-label': ariaLabel,
  'data-testid': testId,
  ...props
}, ref) => {
  // Handle click with MCP integration
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (loading || disabled) return
    
    // Trigger MCP command if configured
    if (mcpType === 'command' && onMCPCommand) {
      onMCPCommand('button:click', {
        variant,
        size,
        semanticMeaning,
        timestamp: new Date().toISOString(),
      })
    }
    
    // Trigger AI interaction if configured
    if (onAIInteraction) {
      onAIInteraction({
        type: 'button:click',
        data: {
          variant,
          size,
          semanticMeaning,
          context: aiContext,
        },
        context: {
          capabilities,
          extensibleByAI,
        },
      })
    }
    
    onClick?.(event)
  }
  
  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleClick(event as any)
    }
    
    onKeyDown?.(event)
  }
  
  // Generate semantic classes
  const buttonClasses = cn(
    // Base button styles
    'inline-flex items-center justify-center font-medium rounded-md',
    'border transition-all duration-200 ease-in-out',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    
    // Size classes
    getSizeClasses(size, 'button'),
    
    // Variant classes
    getVariantClasses(variant, styleType),
    
    // State classes
    {
      'w-full': fullWidth,
      'cursor-not-allowed opacity-50': disabled && !loading,
      'cursor-wait': loading,
      'relative overflow-hidden': loading,
    },
    
    // Focus ring
    getFocusRing(variant),
    
    // Custom classes
    className
  )
  
  // Generate accessibility attributes
  const accessibilityProps = {
    'aria-label': ariaLabel || semanticMeaning,
    'aria-disabled': disabled || loading,
    'aria-busy': loading,
    'aria-describedby': capabilities.length > 0 ? `button-capabilities-${capabilities.join('-')}` : undefined,
    'data-semantic-type': 'ai-first-button',
    'data-mcp-type': mcpType,
    'data-ai-extensible': extensibleByAI,
    'data-testid': testId || 'ai-button',
  }
  
  // Loading spinner component
  const LoadingSpinner = () => (
    <Loader2 
      className={cn(
        'animate-spin',
        size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4',
        children ? 'mr-2' : ''
      )}
      aria-hidden="true"
    />
  )
  
  return (
    <button
      ref={ref}
      type="button"
      className={buttonClasses}
      disabled={disabled || loading}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      {...accessibilityProps}
      {...props}
    >
      {/* Loading state */}
      {loading && <LoadingSpinner />}
      
      {/* Left icon */}
      {!loading && leftIcon && (
        <span 
          className={cn(
            'flex items-center',
            children ? 'mr-2' : '',
            size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'
          )}
          aria-hidden="true"
        >
          {leftIcon}
        </span>
      )}
      
      {/* Button content */}
      {children && (
        <span className={loading ? 'opacity-70' : ''}>
          {children}
        </span>
      )}
      
      {/* Right icon */}
      {!loading && rightIcon && (
        <span 
          className={cn(
            'flex items-center',
            children ? 'ml-2' : '',
            size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'
          )}
          aria-hidden="true"
        >
          {rightIcon}
        </span>
      )}
      
      {/* Screen reader loading announcement */}
      {loading && (
        <span className="sr-only">
          Loading, please wait...
        </span>
      )}
      
      {/* Hidden capabilities description for screen readers */}
      {capabilities.length > 0 && (
        <span 
          id={`button-capabilities-${capabilities.join('-')}`}
          className="sr-only"
        >
          Available actions: {capabilities.join(', ')}
        </span>
      )}
    </button>
  )
})

Button.displayName = 'Button'

// Button variants for common use cases
export const PrimaryButton = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>((props, ref) => (
  <Button ref={ref} variant="primary" {...props} />
))

export const SecondaryButton = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>((props, ref) => (
  <Button ref={ref} variant="secondary" {...props} />
))

export const SuccessButton = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>((props, ref) => (
  <Button ref={ref} variant="success" {...props} />
))

export const WarningButton = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>((props, ref) => (
  <Button ref={ref} variant="warning" {...props} />
))

export const ErrorButton = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>((props, ref) => (
  <Button ref={ref} variant="error" {...props} />
))

export const InfoButton = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>((props, ref) => (
  <Button ref={ref} variant="info" {...props} />
))

// MCP-specific button variants
export const MCPCommandButton = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'mcpType'>>((props, ref) => (
  <Button 
    ref={ref} 
    mcpType="command" 
    semanticMeaning="Execute MCP Command"
    capabilities={['mcp-command', 'click', 'keyboard-navigation']}
    {...props} 
  />
))

PrimaryButton.displayName = 'PrimaryButton'
SecondaryButton.displayName = 'SecondaryButton'
SuccessButton.displayName = 'SuccessButton'
WarningButton.displayName = 'WarningButton'
ErrorButton.displayName = 'ErrorButton'
InfoButton.displayName = 'InfoButton'
MCPCommandButton.displayName = 'MCPCommandButton'

export default Button

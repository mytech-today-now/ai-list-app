/**
 * Alert Component - AI-First semantic alert with MCP integration
 * SemanticType: AIFirstAlert
 * ExtensibleByAI: true
 * AIUseCases: ["Important messages", "Status updates", "MCP command feedback", "System alerts"]
 */

import React, { forwardRef } from 'react'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import {
  cn,
  getTransition,
  type SemanticVariant,
  type ComponentSize,
  type AIFirstComponentProps,
} from '../../design-system'

export interface AlertProps extends 
  React.HTMLAttributes<HTMLDivElement>,
  AIFirstComponentProps {
  /**
   * Alert title
   */
  title?: string
  
  /**
   * Alert message/description
   */
  message?: string
  
  /**
   * Alert variant
   */
  variant?: SemanticVariant
  
  /**
   * Alert size
   */
  size?: ComponentSize
  
  /**
   * Whether alert is dismissible
   */
  dismissible?: boolean
  
  /**
   * Whether to show icon
   */
  showIcon?: boolean
  
  /**
   * Custom icon
   */
  icon?: React.ReactNode
  
  /**
   * Alert actions
   */
  actions?: React.ReactNode
  
  /**
   * Alert children content
   */
  children?: React.ReactNode
  
  /**
   * Dismiss handler
   */
  onDismiss?: () => void
  
  /**
   * Action handler
   */
  onAction?: (action: string) => void
}

/**
 * AI-First Alert Component
 * 
 * Features:
 * - Semantic variants with appropriate icons and colors
 * - Dismissible alerts with close functionality
 * - Custom actions and content support
 * - MCP integration for AI-driven alerts
 * - Accessibility-first with proper ARIA attributes
 * - Screen reader announcements
 */
export const Alert = forwardRef<HTMLDivElement, AlertProps>(({
  title,
  message,
  variant = 'info',
  size = 'md',
  dismissible = false,
  showIcon = true,
  icon,
  actions,
  children,
  onDismiss,
  onAction,
  className,
  semanticMeaning,
  capabilities = ['alert', 'dismissible', 'actions', 'accessibility'],
  extensibleByAI = true,
  mcpType,
  onMCPCommand,
  aiContext,
  onAIInteraction,
  'aria-label': ariaLabel,
  'data-testid': testId,
  ...props
}, ref) => {
  // Handle dismiss
  const handleDismiss = () => {
    // MCP command for alert dismiss
    if (mcpType && onMCPCommand) {
      onMCPCommand('alert:dismiss', {
        title,
        variant,
        semanticMeaning,
        timestamp: new Date().toISOString(),
      })
    }
    
    // AI interaction for alert dismiss
    if (onAIInteraction) {
      onAIInteraction({
        type: 'alert:dismiss',
        data: {
          title,
          variant,
          semanticMeaning,
        },
        context: aiContext,
      })
    }
    
    onDismiss?.()
  }
  
  // Handle action
  const handleAction = (action: string) => {
    // MCP command for alert action
    if (mcpType && onMCPCommand) {
      onMCPCommand('alert:action', {
        action,
        title,
        variant,
        semanticMeaning,
        timestamp: new Date().toISOString(),
      })
    }
    
    onAction?.(action)
  }
  
  // Get variant icon
  const getVariantIcon = () => {
    if (icon) return icon
    if (!showIcon) return null
    
    switch (variant) {
      case 'success':
        return <CheckCircle className="h-5 w-5" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5" />
      case 'error':
        return <AlertCircle className="h-5 w-5" />
      case 'info':
      default:
        return <Info className="h-5 w-5" />
    }
  }
  
  // Get variant classes
  const getVariantClasses = () => {
    switch (variant) {
      case 'success':
        return 'bg-success-50 border-success-200 text-success-800'
      case 'warning':
        return 'bg-warning-50 border-warning-200 text-warning-800'
      case 'error':
        return 'bg-error-50 border-error-200 text-error-800'
      case 'info':
        return 'bg-info-50 border-info-200 text-info-800'
      case 'primary':
        return 'bg-primary-50 border-primary-200 text-primary-800'
      default:
        return 'bg-neutral-50 border-neutral-200 text-neutral-800'
    }
  }
  
  // Get size classes
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'p-3'
      case 'md':
        return 'p-4'
      case 'lg':
        return 'p-6'
      default:
        return 'p-4'
    }
  }
  
  // Get icon color
  const getIconColor = () => {
    switch (variant) {
      case 'success':
        return 'text-success-500'
      case 'warning':
        return 'text-warning-500'
      case 'error':
        return 'text-error-500'
      case 'info':
        return 'text-info-500'
      case 'primary':
        return 'text-primary-500'
      default:
        return 'text-neutral-500'
    }
  }
  
  // Generate alert classes
  const alertClasses = cn(
    'border rounded-lg',
    getTransition('all'),
    getVariantClasses(),
    getSizeClasses(),
    className
  )
  
  // Generate accessibility attributes
  const accessibilityProps = {
    'aria-label': ariaLabel || title || semanticMeaning,
    'aria-live': variant === 'error' ? 'assertive' as const : 'polite' as const,
    'aria-atomic': true,
    'data-semantic-type': 'ai-first-alert',
    'data-mcp-type': mcpType,
    'data-ai-extensible': extensibleByAI,
    'data-testid': testId || 'ai-alert',
    role: 'alert',
  }
  
  return (
    <div
      ref={ref}
      className={alertClasses}
      {...accessibilityProps}
      {...props}
    >
      <div className="flex items-start space-x-3">
        {/* Icon */}
        {getVariantIcon() && (
          <div className={cn('flex-shrink-0 mt-0.5', getIconColor())}>
            {getVariantIcon()}
          </div>
        )}
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          {title && (
            <h3 className={cn(
              'font-medium',
              size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-lg' : 'text-base'
            )}>
              {title}
            </h3>
          )}
          
          {/* Message */}
          {message && (
            <p className={cn(
              'opacity-90',
              title ? 'mt-1' : '',
              size === 'sm' ? 'text-sm' : 'text-sm'
            )}>
              {message}
            </p>
          )}
          
          {/* Children content */}
          {children && (
            <div className={title || message ? 'mt-2' : ''}>
              {children}
            </div>
          )}
          
          {/* Actions */}
          {actions && (
            <div className="mt-3 flex items-center space-x-2">
              {React.Children.map(actions, (action, index) => {
                if (React.isValidElement(action)) {
                  return React.cloneElement(action, {
                    key: index,
                    onClick: (e: React.MouseEvent) => {
                      action.props.onClick?.(e)
                      handleAction(`action-${index}`)
                    },
                    ...action.props,
                  })
                }
                return action
              })}
            </div>
          )}
        </div>
        
        {/* Dismiss button */}
        {dismissible && (
          <button
            type="button"
            onClick={handleDismiss}
            className={cn(
              'flex-shrink-0 p-1 rounded-md transition-colors duration-200',
              'hover:bg-black hover:bg-opacity-10 focus:outline-none focus:ring-2 focus:ring-offset-2',
              variant === 'error' ? 'focus:ring-error-500' : 'focus:ring-primary-500'
            )}
            aria-label="Dismiss alert"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      
      {/* Hidden capabilities description */}
      {capabilities.length > 0 && (
        <span className="sr-only">
          Alert capabilities: {capabilities.join(', ')}
        </span>
      )}
    </div>
  )
})

Alert.displayName = 'Alert'

// Alert variants for common use cases
export const SuccessAlert = forwardRef<HTMLDivElement, Omit<AlertProps, 'variant'>>((props, ref) => (
  <Alert ref={ref} variant="success" {...props} />
))

export const ErrorAlert = forwardRef<HTMLDivElement, Omit<AlertProps, 'variant'>>((props, ref) => (
  <Alert ref={ref} variant="error" {...props} />
))

export const WarningAlert = forwardRef<HTMLDivElement, Omit<AlertProps, 'variant'>>((props, ref) => (
  <Alert ref={ref} variant="warning" {...props} />
))

export const InfoAlert = forwardRef<HTMLDivElement, Omit<AlertProps, 'variant'>>((props, ref) => (
  <Alert ref={ref} variant="info" {...props} />
))

// MCP-specific alert variants
export const MCPCommandAlert = forwardRef<HTMLDivElement, Omit<AlertProps, 'mcpType'>>((props, ref) => (
  <Alert 
    ref={ref} 
    mcpType="command" 
    semanticMeaning="MCP Command Result"
    capabilities={['alert', 'mcp-feedback', 'dismissible']}
    {...props} 
  />
))

export const MCPErrorAlert = forwardRef<HTMLDivElement, Omit<AlertProps, 'variant' | 'mcpType'>>((props, ref) => (
  <Alert 
    ref={ref} 
    variant="error"
    mcpType="error" 
    semanticMeaning="MCP Error Alert"
    capabilities={['alert', 'mcp-error', 'dismissible']}
    {...props} 
  />
))

SuccessAlert.displayName = 'SuccessAlert'
ErrorAlert.displayName = 'ErrorAlert'
WarningAlert.displayName = 'WarningAlert'
InfoAlert.displayName = 'InfoAlert'
MCPCommandAlert.displayName = 'MCPCommandAlert'
MCPErrorAlert.displayName = 'MCPErrorAlert'

export default Alert

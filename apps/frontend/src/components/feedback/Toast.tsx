/**
 * Toast Component - AI-First semantic toast notifications with MCP integration
 * SemanticType: AIFirstToast
 * ExtensibleByAI: true
 * AIUseCases: ["User feedback", "Status notifications", "MCP command results", "System messages"]
 */

import React, { forwardRef, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import {
  cn,
  getTransition,
  useScreenReaderAnnouncement,
  type SemanticVariant,
  type AIFirstComponentProps,
} from '../../design-system'

export interface ToastProps extends AIFirstComponentProps {
  /**
   * Toast message
   */
  message: string
  
  /**
   * Toast description
   */
  description?: string
  
  /**
   * Toast variant
   */
  variant?: SemanticVariant
  
  /**
   * Toast position
   */
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'
  
  /**
   * Whether toast is visible
   */
  visible?: boolean
  
  /**
   * Auto-dismiss duration in milliseconds (0 to disable)
   */
  duration?: number
  
  /**
   * Whether to show close button
   */
  closable?: boolean
  
  /**
   * Whether to show icon
   */
  showIcon?: boolean
  
  /**
   * Custom icon
   */
  icon?: React.ReactNode
  
  /**
   * Custom action button
   */
  action?: React.ReactNode
  
  /**
   * Close handler
   */
  onClose?: () => void
  
  /**
   * Action handler
   */
  onAction?: () => void
  
  /**
   * Portal container
   */
  container?: HTMLElement
}

/**
 * AI-First Toast Component
 * 
 * Features:
 * - Semantic variants with appropriate icons and colors
 * - Auto-dismiss with configurable duration
 * - Screen reader announcements
 * - Portal rendering for proper z-index management
 * - MCP integration for AI-driven notifications
 * - Accessibility-first with proper ARIA attributes
 */
export const Toast = forwardRef<HTMLDivElement, ToastProps>(({
  message,
  description,
  variant = 'info',
  position = 'top-right',
  visible = true,
  duration = 5000,
  closable = true,
  showIcon = true,
  icon,
  action,
  onClose,
  onAction,
  container,
  semanticMeaning,
  capabilities = ['notification', 'auto-dismiss', 'screen-reader', 'accessibility'],
  extensibleByAI = true,
  mcpType,
  onMCPCommand,
  aiContext,
  onAIInteraction,
  'data-testid': testId,
}, ref) => {
  const [isVisible, setIsVisible] = useState(visible)
  const [isExiting, setIsExiting] = useState(false)
  const announce = useScreenReaderAnnouncement()
  
  // Handle auto-dismiss
  useEffect(() => {
    if (!visible || duration === 0) return
    
    const timer = setTimeout(() => {
      handleClose()
    }, duration)
    
    return () => clearTimeout(timer)
  }, [visible, duration])
  
  // Handle visibility changes
  useEffect(() => {
    if (visible && !isVisible) {
      setIsVisible(true)
      setIsExiting(false)
      
      // Announce to screen readers
      const priority = variant === 'error' ? 'assertive' : 'polite'
      announce(`${variant} notification: ${message}`, priority)
      
      // MCP command for toast show
      if (mcpType && onMCPCommand) {
        onMCPCommand('toast:show', {
          message,
          variant,
          semanticMeaning,
          timestamp: new Date().toISOString(),
        })
      }
      
      // AI interaction for toast show
      if (onAIInteraction) {
        onAIInteraction({
          type: 'toast:show',
          data: {
            message,
            variant,
            semanticMeaning,
          },
          context: aiContext,
        })
      }
    } else if (!visible && isVisible) {
      handleClose()
    }
  }, [visible, isVisible, variant, message, announce, mcpType, onMCPCommand, semanticMeaning, onAIInteraction, aiContext])
  
  // Handle close
  const handleClose = () => {
    setIsExiting(true)
    
    setTimeout(() => {
      setIsVisible(false)
      setIsExiting(false)
      onClose?.()
    }, 300) // Match animation duration
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
  
  // Get position classes
  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4'
      case 'top-center':
        return 'top-4 left-1/2 transform -translate-x-1/2'
      case 'top-right':
        return 'top-4 right-4'
      case 'bottom-left':
        return 'bottom-4 left-4'
      case 'bottom-center':
        return 'bottom-4 left-1/2 transform -translate-x-1/2'
      case 'bottom-right':
        return 'bottom-4 right-4'
      default:
        return 'top-4 right-4'
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
  
  // Generate toast classes
  const toastClasses = cn(
    'fixed z-50 max-w-sm w-full',
    'bg-white border rounded-lg shadow-lg',
    'transform transition-all duration-300 ease-in-out',
    getPositionClasses(),
    getVariantClasses(),
    {
      'translate-y-0 opacity-100': isVisible && !isExiting,
      'translate-y-2 opacity-0': !isVisible || isExiting,
    }
  )
  
  // Generate accessibility attributes
  const accessibilityProps = {
    'aria-live': variant === 'error' ? 'assertive' as const : 'polite' as const,
    'aria-atomic': true,
    'data-semantic-type': 'ai-first-toast',
    'data-mcp-type': mcpType,
    'data-ai-extensible': extensibleByAI,
    'data-testid': testId || 'ai-toast',
    role: 'alert',
  }
  
  if (!isVisible) return null
  
  const toastContent = (
    <div
      ref={ref}
      className={toastClasses}
      {...accessibilityProps}
    >
      <div className="p-4">
        <div className="flex items-start space-x-3">
          {/* Icon */}
          {getVariantIcon() && (
            <div className={cn('flex-shrink-0 mt-0.5', getIconColor())}>
              {getVariantIcon()}
            </div>
          )}
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">
              {message}
            </p>
            
            {description && (
              <p className="mt-1 text-sm opacity-90">
                {description}
              </p>
            )}
            
            {/* Action */}
            {action && (
              <div className="mt-3">
                {action}
              </div>
            )}
          </div>
          
          {/* Close button */}
          {closable && (
            <button
              type="button"
              onClick={handleClose}
              className={cn(
                'flex-shrink-0 p-1 rounded-md transition-colors duration-200',
                'hover:bg-black hover:bg-opacity-10 focus:outline-none focus:ring-2 focus:ring-offset-2',
                variant === 'error' ? 'focus:ring-error-500' : 'focus:ring-primary-500'
              )}
              aria-label="Close notification"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      
      {/* Progress bar for auto-dismiss */}
      {duration > 0 && (
        <div className="h-1 bg-black bg-opacity-10">
          <div 
            className={cn(
              'h-full transition-all ease-linear',
              variant === 'success' ? 'bg-success-500' :
              variant === 'warning' ? 'bg-warning-500' :
              variant === 'error' ? 'bg-error-500' :
              variant === 'info' ? 'bg-info-500' :
              'bg-primary-500'
            )}
            style={{
              width: '100%',
              animation: `shrink ${duration}ms linear forwards`,
            }}
          />
        </div>
      )}
      
      {/* Hidden capabilities description */}
      {capabilities.length > 0 && (
        <span className="sr-only">
          Toast capabilities: {capabilities.join(', ')}
        </span>
      )}
      
      <style jsx>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  )
  
  // Render in portal
  return createPortal(
    toastContent,
    container || document.body
  )
})

Toast.displayName = 'Toast'

// Toast variants for common use cases
export const SuccessToast = forwardRef<HTMLDivElement, Omit<ToastProps, 'variant'>>((props, ref) => (
  <Toast ref={ref} variant="success" {...props} />
))

export const ErrorToast = forwardRef<HTMLDivElement, Omit<ToastProps, 'variant'>>((props, ref) => (
  <Toast ref={ref} variant="error" {...props} />
))

export const WarningToast = forwardRef<HTMLDivElement, Omit<ToastProps, 'variant'>>((props, ref) => (
  <Toast ref={ref} variant="warning" {...props} />
))

export const InfoToast = forwardRef<HTMLDivElement, Omit<ToastProps, 'variant'>>((props, ref) => (
  <Toast ref={ref} variant="info" {...props} />
))

// Toast manager hook for programmatic usage
export interface ToastOptions extends Omit<ToastProps, 'visible' | 'onClose'> {
  id?: string
}

export interface ToastManagerState {
  toasts: (ToastOptions & { id: string; visible: boolean })[]
}

let toastId = 0
const toastListeners: ((state: ToastManagerState) => void)[] = []
let toastState: ToastManagerState = { toasts: [] }

const notifyListeners = () => {
  toastListeners.forEach(listener => listener(toastState))
}

export const toastManager = {
  show: (options: ToastOptions) => {
    const id = options.id || `toast-${++toastId}`
    const toast = { ...options, id, visible: true }
    
    toastState = {
      toasts: [...toastState.toasts, toast]
    }
    
    notifyListeners()
    return id
  },
  
  hide: (id: string) => {
    toastState = {
      toasts: toastState.toasts.map(toast =>
        toast.id === id ? { ...toast, visible: false } : toast
      )
    }
    
    notifyListeners()
  },
  
  remove: (id: string) => {
    toastState = {
      toasts: toastState.toasts.filter(toast => toast.id !== id)
    }
    
    notifyListeners()
  },
  
  clear: () => {
    toastState = { toasts: [] }
    notifyListeners()
  },
  
  success: (message: string, options?: Omit<ToastOptions, 'message' | 'variant'>) =>
    toastManager.show({ ...options, message, variant: 'success' }),
  
  error: (message: string, options?: Omit<ToastOptions, 'message' | 'variant'>) =>
    toastManager.show({ ...options, message, variant: 'error' }),
  
  warning: (message: string, options?: Omit<ToastOptions, 'message' | 'variant'>) =>
    toastManager.show({ ...options, message, variant: 'warning' }),
  
  info: (message: string, options?: Omit<ToastOptions, 'message' | 'variant'>) =>
    toastManager.show({ ...options, message, variant: 'info' }),
}

export const useToast = () => {
  const [state, setState] = useState(toastState)
  
  useEffect(() => {
    toastListeners.push(setState)
    
    return () => {
      const index = toastListeners.indexOf(setState)
      if (index > -1) {
        toastListeners.splice(index, 1)
      }
    }
  }, [])
  
  return {
    toasts: state.toasts,
    show: toastManager.show,
    hide: toastManager.hide,
    remove: toastManager.remove,
    clear: toastManager.clear,
    success: toastManager.success,
    error: toastManager.error,
    warning: toastManager.warning,
    info: toastManager.info,
  }
}

SuccessToast.displayName = 'SuccessToast'
ErrorToast.displayName = 'ErrorToast'
WarningToast.displayName = 'WarningToast'
InfoToast.displayName = 'InfoToast'

export default Toast

/**
 * Modal Component - AI-First semantic modal with focus management and MCP integration
 * SemanticType: AIFirstModal
 * ExtensibleByAI: true
 * AIUseCases: ["Dialog interfaces", "Form overlays", "Confirmation dialogs", "MCP command interfaces"]
 */

import React, { forwardRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import {
  cn,
  getTransition,
  useFocusTrap,
  useFocusRestore,
  useScreenReaderAnnouncement,
  Keys,
  type SemanticVariant,
  type ComponentSize,
  type AIFirstComponentProps,
} from '../../design-system'

export interface ModalProps extends AIFirstComponentProps {
  /**
   * Whether modal is open
   */
  open: boolean
  
  /**
   * Callback when modal should close
   */
  onClose: () => void
  
  /**
   * Modal size
   */
  size?: ComponentSize | 'xl' | '2xl' | '3xl' | 'full'
  
  /**
   * Modal variant for styling
   */
  variant?: SemanticVariant
  
  /**
   * Modal title
   */
  title?: string
  
  /**
   * Modal description
   */
  description?: string
  
  /**
   * Whether to show close button
   */
  showCloseButton?: boolean
  
  /**
   * Whether clicking overlay closes modal
   */
  closeOnOverlayClick?: boolean
  
  /**
   * Whether pressing escape closes modal
   */
  closeOnEscape?: boolean
  
  /**
   * Modal header content
   */
  header?: React.ReactNode
  
  /**
   * Modal footer content
   */
  footer?: React.ReactNode
  
  /**
   * Modal children content
   */
  children?: React.ReactNode
  
  /**
   * Custom overlay className
   */
  overlayClassName?: string
  
  /**
   * Custom content className
   */
  contentClassName?: string
  
  /**
   * Portal container element
   */
  container?: HTMLElement
}

/**
 * AI-First Modal Component
 * 
 * Features:
 * - Focus trap and restoration
 * - Keyboard navigation (Escape to close)
 * - Screen reader announcements
 * - MCP command integration
 * - Semantic variants with proper ARIA attributes
 * - Portal rendering for proper z-index management
 * - Overlay click handling
 * - AI-extensible with semantic metadata
 */
export const Modal = forwardRef<HTMLDivElement, ModalProps>(({
  open,
  onClose,
  size = 'md',
  variant = 'neutral',
  title,
  description,
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  header,
  footer,
  children,
  className,
  overlayClassName,
  contentClassName,
  container,
  mcpType,
  onMCPCommand,
  aiContext,
  onAIInteraction,
  semanticMeaning,
  capabilities = ['dialog', 'focus-trap', 'keyboard-navigation', 'screen-reader'],
  extensibleByAI = true,
  'aria-label': ariaLabel,
  'data-testid': testId,
  ...props
}, ref) => {
  // Focus management hooks
  const { containerRef } = useFocusTrap(open)
  const { saveFocus, restoreFocus } = useFocusRestore()
  const announce = useScreenReaderAnnouncement()
  
  // Handle modal open/close effects
  useEffect(() => {
    if (open) {
      saveFocus()
      announce(`${title || 'Modal'} opened`, 'polite')
      
      // Prevent body scroll
      document.body.style.overflow = 'hidden'
      
      // MCP command for modal open
      if (mcpType && onMCPCommand) {
        onMCPCommand('modal:open', {
          title,
          variant,
          size,
          timestamp: new Date().toISOString(),
        })
      }
      
      // AI interaction for modal open
      if (onAIInteraction) {
        onAIInteraction({
          type: 'modal:open',
          data: {
            title,
            variant,
            size,
            semanticMeaning,
          },
          context: aiContext,
        })
      }
    } else {
      restoreFocus()
      announce(`${title || 'Modal'} closed`, 'polite')
      
      // Restore body scroll
      document.body.style.overflow = ''
    }
    
    return () => {
      document.body.style.overflow = ''
    }
  }, [open, title, saveFocus, restoreFocus, announce, mcpType, onMCPCommand, variant, size, onAIInteraction, semanticMeaning, aiContext])
  
  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (open && closeOnEscape && event.key === Keys.ESCAPE) {
        event.preventDefault()
        onClose()
      }
    }
    
    if (open) {
      document.addEventListener('keydown', handleEscape)
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open, closeOnEscape, onClose])
  
  // Handle overlay click
  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnOverlayClick && event.target === event.currentTarget) {
      onClose()
    }
  }
  
  // Get size classes
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'max-w-sm'
      case 'md':
        return 'max-w-md'
      case 'lg':
        return 'max-w-lg'
      case 'xl':
        return 'max-w-xl'
      case '2xl':
        return 'max-w-2xl'
      case '3xl':
        return 'max-w-3xl'
      case 'full':
        return 'max-w-full mx-4'
      default:
        return 'max-w-md'
    }
  }
  
  // Get variant classes
  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'border-primary-200'
      case 'success':
        return 'border-success-200'
      case 'warning':
        return 'border-warning-200'
      case 'error':
        return 'border-error-200'
      case 'info':
        return 'border-info-200'
      default:
        return 'border-neutral-200'
    }
  }
  
  // Generate modal classes
  const overlayClasses = cn(
    'fixed inset-0 z-50 flex items-center justify-center',
    'bg-black bg-opacity-50 backdrop-blur-sm',
    'transition-opacity duration-300 ease-in-out',
    overlayClassName
  )
  
  const contentClasses = cn(
    'relative w-full bg-white rounded-lg shadow-xl border',
    'transform transition-all duration-300 ease-in-out',
    'max-h-[90vh] overflow-hidden flex flex-col',
    getSizeClasses(),
    getVariantClasses(),
    contentClassName
  )
  
  // Generate accessibility attributes
  const accessibilityProps = {
    'aria-label': ariaLabel || title || semanticMeaning,
    'aria-describedby': description ? 'modal-description' : undefined,
    'aria-modal': true,
    'data-semantic-type': 'ai-first-modal',
    'data-mcp-type': mcpType,
    'data-ai-extensible': extensibleByAI,
    'data-testid': testId || 'ai-modal',
    role: 'dialog',
  }
  
  // Don't render if not open
  if (!open) return null
  
  const modalContent = (
    <div
      className={overlayClasses}
      onClick={handleOverlayClick}
      aria-hidden={!open}
      data-testid="modal-overlay"
    >
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
        className={contentClasses}
        onClick={(e) => e.stopPropagation()}
        {...accessibilityProps}
        {...props}
      >
        {/* Modal header */}
        {(header || title || showCloseButton) && (
          <div className="flex items-center justify-between p-6 border-b border-neutral-200">
            <div className="flex-1">
              {header || (
                <div>
                  {title && (
                    <h2 className="text-lg font-semibold text-neutral-900">
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p 
                      id="modal-description"
                      className="mt-1 text-sm text-neutral-600"
                    >
                      {description}
                    </p>
                  )}
                </div>
              )}
            </div>
            
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className={cn(
                  'ml-4 p-2 rounded-md text-neutral-400 hover:text-neutral-600',
                  'hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500',
                  'transition-colors duration-200'
                )}
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}
        
        {/* Modal content */}
        {children && (
          <div className="flex-1 overflow-y-auto p-6">
            {children}
          </div>
        )}
        
        {/* Modal footer */}
        {footer && (
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-neutral-200">
            {footer}
          </div>
        )}
        
        {/* Hidden capabilities description */}
        {capabilities.length > 0 && (
          <span className="sr-only">
            Modal capabilities: {capabilities.join(', ')}
          </span>
        )}
      </div>
    </div>
  )
  
  // Render in portal
  return createPortal(
    modalContent,
    container || document.body
  )
})

Modal.displayName = 'Modal'

// Modal variants for common use cases
export const ConfirmationModal = forwardRef<HTMLDivElement, Omit<ModalProps, 'variant'>>((props, ref) => (
  <Modal 
    ref={ref} 
    variant="warning" 
    semanticMeaning="Confirmation Dialog"
    capabilities={['dialog', 'confirmation', 'focus-trap', 'keyboard-navigation']}
    {...props} 
  />
))

export const ErrorModal = forwardRef<HTMLDivElement, Omit<ModalProps, 'variant'>>((props, ref) => (
  <Modal 
    ref={ref} 
    variant="error" 
    semanticMeaning="Error Dialog"
    capabilities={['dialog', 'error-display', 'focus-trap', 'keyboard-navigation']}
    {...props} 
  />
))

export const InfoModal = forwardRef<HTMLDivElement, Omit<ModalProps, 'variant'>>((props, ref) => (
  <Modal 
    ref={ref} 
    variant="info" 
    semanticMeaning="Information Dialog"
    capabilities={['dialog', 'information', 'focus-trap', 'keyboard-navigation']}
    {...props} 
  />
))

// MCP-specific modal variants
export const MCPCommandModal = forwardRef<HTMLDivElement, Omit<ModalProps, 'mcpType'>>((props, ref) => (
  <Modal 
    ref={ref} 
    mcpType="command" 
    semanticMeaning="MCP Command Interface"
    capabilities={['dialog', 'mcp-command', 'focus-trap', 'keyboard-navigation']}
    {...props} 
  />
))

ConfirmationModal.displayName = 'ConfirmationModal'
ErrorModal.displayName = 'ErrorModal'
InfoModal.displayName = 'InfoModal'
MCPCommandModal.displayName = 'MCPCommandModal'

export default Modal

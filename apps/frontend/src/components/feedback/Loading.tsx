/**
 * Loading Component - AI-First semantic loading indicators with MCP integration
 * SemanticType: AIFirstLoading
 * ExtensibleByAI: true
 * AIUseCases: ["Loading states", "Progress indication", "MCP command execution", "Async operations"]
 */

import React, { forwardRef } from 'react'
import { Loader2, RefreshCw, Download, Upload, Zap } from 'lucide-react'
import {
  cn,
  type SemanticVariant,
  type ComponentSize,
  type AIFirstComponentProps,
} from '../../design-system'

export interface LoadingProps extends 
  React.HTMLAttributes<HTMLDivElement>,
  AIFirstComponentProps {
  /**
   * Loading variant
   */
  variant?: 'spinner' | 'dots' | 'pulse' | 'skeleton' | 'progress'
  
  /**
   * Loading size
   */
  size?: ComponentSize | 'xs' | 'xl'
  
  /**
   * Color variant
   */
  color?: SemanticVariant
  
  /**
   * Loading text
   */
  text?: string
  
  /**
   * Loading description
   */
  description?: string
  
  /**
   * Whether to show as overlay
   */
  overlay?: boolean
  
  /**
   * Custom loading icon
   */
  icon?: React.ReactNode
  
  /**
   * Progress value (0-100) for progress variant
   */
  progress?: number
  
  /**
   * Whether progress is indeterminate
   */
  indeterminate?: boolean
  
  /**
   * Loading operation type for semantic meaning
   */
  operation?: 'loading' | 'saving' | 'uploading' | 'downloading' | 'processing' | 'thinking'
  
  /**
   * Whether loading is visible
   */
  visible?: boolean
}

/**
 * AI-First Loading Component
 * 
 * Features:
 * - Multiple loading variants (spinner, dots, pulse, skeleton, progress)
 * - Semantic operation types with appropriate icons
 * - Overlay mode for blocking interactions
 * - Progress indication with determinate/indeterminate states
 * - MCP integration for AI operation feedback
 * - Accessibility-first with proper ARIA attributes
 */
export const Loading = forwardRef<HTMLDivElement, LoadingProps>(({
  variant = 'spinner',
  size = 'md',
  color = 'primary',
  text,
  description,
  overlay = false,
  icon,
  progress = 0,
  indeterminate = true,
  operation = 'loading',
  visible = true,
  className,
  semanticMeaning,
  capabilities = ['loading-indicator', 'progress', 'accessibility', 'screen-reader'],
  extensibleByAI = true,
  mcpType,
  onMCPCommand,
  aiContext,
  onAIInteraction,
  'aria-label': ariaLabel,
  'data-testid': testId,
  ...props
}, ref) => {
  // Get operation icon
  const getOperationIcon = () => {
    if (icon) return icon
    
    switch (operation) {
      case 'saving':
        return <RefreshCw className="animate-spin" />
      case 'uploading':
        return <Upload className="animate-pulse" />
      case 'downloading':
        return <Download className="animate-pulse" />
      case 'processing':
        return <Zap className="animate-pulse" />
      case 'thinking':
        return <Loader2 className="animate-spin" />
      case 'loading':
      default:
        return <Loader2 className="animate-spin" />
    }
  }
  
  // Get size classes
  const getSizeClasses = () => {
    switch (size) {
      case 'xs':
        return 'h-3 w-3'
      case 'sm':
        return 'h-4 w-4'
      case 'md':
        return 'h-6 w-6'
      case 'lg':
        return 'h-8 w-8'
      case 'xl':
        return 'h-12 w-12'
      default:
        return 'h-6 w-6'
    }
  }
  
  // Get color classes
  const getColorClasses = () => {
    switch (color) {
      case 'primary':
        return 'text-primary-500'
      case 'success':
        return 'text-success-500'
      case 'warning':
        return 'text-warning-500'
      case 'error':
        return 'text-error-500'
      case 'info':
        return 'text-info-500'
      default:
        return 'text-neutral-500'
    }
  }
  
  // Get text size classes
  const getTextSizeClasses = () => {
    switch (size) {
      case 'xs':
        return 'text-xs'
      case 'sm':
        return 'text-sm'
      case 'md':
        return 'text-base'
      case 'lg':
        return 'text-lg'
      case 'xl':
        return 'text-xl'
      default:
        return 'text-base'
    }
  }
  
  // Render spinner variant
  const renderSpinner = () => (
    <div className={cn('flex items-center justify-center', getSizeClasses(), getColorClasses())}>
      {getOperationIcon()}
    </div>
  )
  
  // Render dots variant
  const renderDots = () => (
    <div className="flex items-center space-x-1">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className={cn(
            'rounded-full animate-pulse',
            size === 'xs' ? 'h-1 w-1' :
            size === 'sm' ? 'h-1.5 w-1.5' :
            size === 'lg' ? 'h-3 w-3' :
            size === 'xl' ? 'h-4 w-4' :
            'h-2 w-2',
            getColorClasses().replace('text-', 'bg-')
          )}
          style={{
            animationDelay: `${index * 0.2}s`,
            animationDuration: '1s',
          }}
        />
      ))}
    </div>
  )
  
  // Render pulse variant
  const renderPulse = () => (
    <div className={cn(
      'rounded-full animate-pulse',
      getSizeClasses(),
      getColorClasses().replace('text-', 'bg-')
    )} />
  )
  
  // Render skeleton variant
  const renderSkeleton = () => (
    <div className="space-y-2">
      <div className="h-4 bg-neutral-200 rounded animate-pulse"></div>
      <div className="h-4 bg-neutral-200 rounded animate-pulse w-3/4"></div>
      <div className="h-4 bg-neutral-200 rounded animate-pulse w-1/2"></div>
    </div>
  )
  
  // Render progress variant
  const renderProgress = () => (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1">
        {text && (
          <span className={cn('font-medium', getTextSizeClasses(), getColorClasses())}>
            {text}
          </span>
        )}
        {!indeterminate && (
          <span className={cn('text-sm', getColorClasses())}>
            {Math.round(progress)}%
          </span>
        )}
      </div>
      
      <div className={cn(
        'w-full bg-neutral-200 rounded-full overflow-hidden',
        size === 'xs' ? 'h-1' :
        size === 'sm' ? 'h-2' :
        size === 'lg' ? 'h-4' :
        size === 'xl' ? 'h-6' :
        'h-3'
      )}>
        <div
          className={cn(
            'h-full transition-all duration-300 ease-out',
            getColorClasses().replace('text-', 'bg-'),
            {
              'animate-pulse': indeterminate,
            }
          )}
          style={{
            width: indeterminate ? '100%' : `${Math.min(Math.max(progress, 0), 100)}%`,
            transform: indeterminate ? 'translateX(-100%)' : 'none',
            animation: indeterminate ? 'slide 2s infinite' : 'none',
          }}
        />
      </div>
    </div>
  )
  
  // Get loading indicator based on variant
  const getLoadingIndicator = () => {
    switch (variant) {
      case 'dots':
        return renderDots()
      case 'pulse':
        return renderPulse()
      case 'skeleton':
        return renderSkeleton()
      case 'progress':
        return renderProgress()
      case 'spinner':
      default:
        return renderSpinner()
    }
  }
  
  // Generate loading classes
  const loadingClasses = cn(
    'flex flex-col items-center justify-center',
    {
      'fixed inset-0 z-50 bg-white bg-opacity-75 backdrop-blur-sm': overlay,
      'space-y-2': text || description,
    },
    className
  )
  
  // Generate accessibility attributes
  const accessibilityProps = {
    'aria-label': ariaLabel || text || `${operation} in progress`,
    'aria-live': 'polite' as const,
    'aria-busy': true,
    'aria-valuenow': variant === 'progress' && !indeterminate ? progress : undefined,
    'aria-valuemin': variant === 'progress' ? 0 : undefined,
    'aria-valuemax': variant === 'progress' ? 100 : undefined,
    'data-semantic-type': 'ai-first-loading',
    'data-mcp-type': mcpType,
    'data-ai-extensible': extensibleByAI,
    'data-testid': testId || 'ai-loading',
    role: variant === 'progress' ? 'progressbar' : 'status',
  }
  
  if (!visible) return null
  
  return (
    <div
      ref={ref}
      className={loadingClasses}
      {...accessibilityProps}
      {...props}
    >
      {/* Loading indicator */}
      {getLoadingIndicator()}
      
      {/* Text */}
      {text && variant !== 'progress' && (
        <p className={cn('font-medium', getTextSizeClasses(), getColorClasses())}>
          {text}
        </p>
      )}
      
      {/* Description */}
      {description && (
        <p className={cn(
          'text-center max-w-sm',
          size === 'xs' || size === 'sm' ? 'text-xs' : 'text-sm',
          'text-neutral-600'
        )}>
          {description}
        </p>
      )}
      
      {/* Hidden capabilities description */}
      {capabilities.length > 0 && (
        <span className="sr-only">
          Loading capabilities: {capabilities.join(', ')}
        </span>
      )}
      
      <style jsx>{`
        @keyframes slide {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(0%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  )
})

Loading.displayName = 'Loading'

// Loading variants for common use cases
export const SpinnerLoading = forwardRef<HTMLDivElement, Omit<LoadingProps, 'variant'>>((props, ref) => (
  <Loading ref={ref} variant="spinner" {...props} />
))

export const DotsLoading = forwardRef<HTMLDivElement, Omit<LoadingProps, 'variant'>>((props, ref) => (
  <Loading ref={ref} variant="dots" {...props} />
))

export const PulseLoading = forwardRef<HTMLDivElement, Omit<LoadingProps, 'variant'>>((props, ref) => (
  <Loading ref={ref} variant="pulse" {...props} />
))

export const SkeletonLoading = forwardRef<HTMLDivElement, Omit<LoadingProps, 'variant'>>((props, ref) => (
  <Loading ref={ref} variant="skeleton" {...props} />
))

export const ProgressLoading = forwardRef<HTMLDivElement, Omit<LoadingProps, 'variant'>>((props, ref) => (
  <Loading ref={ref} variant="progress" {...props} />
))

// Operation-specific loading variants
export const SavingLoading = forwardRef<HTMLDivElement, Omit<LoadingProps, 'operation'>>((props, ref) => (
  <Loading ref={ref} operation="saving" text="Saving..." {...props} />
))

export const UploadingLoading = forwardRef<HTMLDivElement, Omit<LoadingProps, 'operation'>>((props, ref) => (
  <Loading ref={ref} operation="uploading" text="Uploading..." {...props} />
))

export const ProcessingLoading = forwardRef<HTMLDivElement, Omit<LoadingProps, 'operation'>>((props, ref) => (
  <Loading ref={ref} operation="processing" text="Processing..." {...props} />
))

export const ThinkingLoading = forwardRef<HTMLDivElement, Omit<LoadingProps, 'operation'>>((props, ref) => (
  <Loading ref={ref} operation="thinking" text="AI is thinking..." {...props} />
))

// MCP-specific loading variants
export const MCPCommandLoading = forwardRef<HTMLDivElement, Omit<LoadingProps, 'mcpType' | 'operation'>>((props, ref) => (
  <Loading 
    ref={ref} 
    mcpType="command"
    operation="processing"
    text="Executing MCP command..."
    semanticMeaning="MCP Command Execution"
    capabilities={['loading-indicator', 'mcp-feedback', 'progress']}
    {...props} 
  />
))

SpinnerLoading.displayName = 'SpinnerLoading'
DotsLoading.displayName = 'DotsLoading'
PulseLoading.displayName = 'PulseLoading'
SkeletonLoading.displayName = 'SkeletonLoading'
ProgressLoading.displayName = 'ProgressLoading'
SavingLoading.displayName = 'SavingLoading'
UploadingLoading.displayName = 'UploadingLoading'
ProcessingLoading.displayName = 'ProcessingLoading'
ThinkingLoading.displayName = 'ThinkingLoading'
MCPCommandLoading.displayName = 'MCPCommandLoading'

export default Loading

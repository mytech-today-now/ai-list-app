/**
 * Progress Component - AI-First semantic progress indicators with MCP integration
 * SemanticType: AIFirstProgress
 * ExtensibleByAI: true
 * AIUseCases: ["Progress tracking", "Task completion", "MCP operation progress", "Multi-step processes"]
 */

import React, { forwardRef } from 'react'
import { Check, Clock, AlertCircle } from 'lucide-react'
import {
  cn,
  getTransition,
  type SemanticVariant,
  type ComponentSize,
  type AIFirstComponentProps,
} from '../../design-system'

export interface ProgressStep {
  id: string
  label: string
  description?: string
  status: 'pending' | 'current' | 'completed' | 'error'
  optional?: boolean
}

export interface ProgressProps extends 
  React.HTMLAttributes<HTMLDivElement>,
  AIFirstComponentProps {
  /**
   * Progress value (0-100)
   */
  value?: number
  
  /**
   * Maximum value
   */
  max?: number
  
  /**
   * Progress variant
   */
  variant?: 'linear' | 'circular' | 'stepped'
  
  /**
   * Progress size
   */
  size?: ComponentSize | 'xs' | 'xl'
  
  /**
   * Color variant
   */
  color?: SemanticVariant
  
  /**
   * Whether progress is indeterminate
   */
  indeterminate?: boolean
  
  /**
   * Progress label
   */
  label?: string
  
  /**
   * Progress description
   */
  description?: string
  
  /**
   * Whether to show percentage
   */
  showPercentage?: boolean
  
  /**
   * Whether to show value
   */
  showValue?: boolean
  
  /**
   * Steps for stepped progress
   */
  steps?: ProgressStep[]
  
  /**
   * Current step index
   */
  currentStep?: number
  
  /**
   * Custom format function for value display
   */
  formatValue?: (value: number, max: number) => string
  
  /**
   * Progress change handler
   */
  onProgressChange?: (value: number) => void
  
  /**
   * Step change handler
   */
  onStepChange?: (step: number) => void
}

/**
 * AI-First Progress Component
 * 
 * Features:
 * - Multiple progress variants (linear, circular, stepped)
 * - Determinate and indeterminate states
 * - Step-by-step progress with status indicators
 * - Custom value formatting and display
 * - MCP integration for AI operation progress
 * - Accessibility-first with proper ARIA attributes
 */
export const Progress = forwardRef<HTMLDivElement, ProgressProps>(({
  value = 0,
  max = 100,
  variant = 'linear',
  size = 'md',
  color = 'primary',
  indeterminate = false,
  label,
  description,
  showPercentage = false,
  showValue = false,
  steps = [],
  currentStep = 0,
  formatValue,
  onProgressChange,
  onStepChange,
  className,
  semanticMeaning,
  capabilities = ['progress-indicator', 'accessibility', 'step-tracking'],
  extensibleByAI = true,
  mcpType,
  onMCPCommand,
  aiContext,
  onAIInteraction,
  'aria-label': ariaLabel,
  'data-testid': testId,
  ...props
}, ref) => {
  // Calculate percentage
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)
  
  // Get size classes
  const getSizeClasses = () => {
    switch (size) {
      case 'xs':
        return 'h-1'
      case 'sm':
        return 'h-2'
      case 'md':
        return 'h-3'
      case 'lg':
        return 'h-4'
      case 'xl':
        return 'h-6'
      default:
        return 'h-3'
    }
  }
  
  // Get color classes
  const getColorClasses = () => {
    switch (color) {
      case 'primary':
        return 'bg-primary-500'
      case 'success':
        return 'bg-success-500'
      case 'warning':
        return 'bg-warning-500'
      case 'error':
        return 'bg-error-500'
      case 'info':
        return 'bg-info-500'
      default:
        return 'bg-neutral-500'
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
  
  // Format display value
  const getDisplayValue = () => {
    if (formatValue) {
      return formatValue(value, max)
    }
    
    if (showPercentage) {
      return `${Math.round(percentage)}%`
    }
    
    if (showValue) {
      return `${value} / ${max}`
    }
    
    return null
  }
  
  // Render linear progress
  const renderLinearProgress = () => (
    <div className="w-full">
      {/* Header */}
      {(label || getDisplayValue()) && (
        <div className="flex justify-between items-center mb-2">
          {label && (
            <span className={cn('font-medium', getTextSizeClasses())}>
              {label}
            </span>
          )}
          {getDisplayValue() && (
            <span className={cn('text-sm text-neutral-600')}>
              {getDisplayValue()}
            </span>
          )}
        </div>
      )}
      
      {/* Progress bar */}
      <div className={cn(
        'w-full bg-neutral-200 rounded-full overflow-hidden',
        getSizeClasses()
      )}>
        <div
          className={cn(
            'h-full transition-all duration-300 ease-out',
            getColorClasses(),
            {
              'animate-pulse': indeterminate,
            }
          )}
          style={{
            width: indeterminate ? '100%' : `${percentage}%`,
            transform: indeterminate ? 'translateX(-100%)' : 'none',
            animation: indeterminate ? 'slide 2s infinite' : 'none',
          }}
        />
      </div>
      
      {/* Description */}
      {description && (
        <p className="mt-1 text-sm text-neutral-600">
          {description}
        </p>
      )}
    </div>
  )
  
  // Render circular progress
  const renderCircularProgress = () => {
    const radius = size === 'xs' ? 16 : size === 'sm' ? 20 : size === 'lg' ? 32 : size === 'xl' ? 40 : 24
    const strokeWidth = size === 'xs' ? 2 : size === 'sm' ? 2 : size === 'lg' ? 4 : size === 'xl' ? 4 : 3
    const normalizedRadius = radius - strokeWidth * 2
    const circumference = normalizedRadius * 2 * Math.PI
    const strokeDasharray = `${circumference} ${circumference}`
    const strokeDashoffset = circumference - (percentage / 100) * circumference
    
    return (
      <div className="flex flex-col items-center">
        <div className="relative">
          <svg
            height={radius * 2}
            width={radius * 2}
            className="transform -rotate-90"
          >
            {/* Background circle */}
            <circle
              stroke="currentColor"
              fill="transparent"
              strokeWidth={strokeWidth}
              r={normalizedRadius}
              cx={radius}
              cy={radius}
              className="text-neutral-200"
            />
            
            {/* Progress circle */}
            <circle
              stroke="currentColor"
              fill="transparent"
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDasharray}
              strokeDashoffset={indeterminate ? 0 : strokeDashoffset}
              strokeLinecap="round"
              r={normalizedRadius}
              cx={radius}
              cy={radius}
              className={cn(
                'transition-all duration-300 ease-out',
                getColorClasses().replace('bg-', 'text-'),
                {
                  'animate-spin': indeterminate,
                }
              )}
              style={{
                strokeDasharray: indeterminate ? `${circumference * 0.25} ${circumference}` : strokeDasharray,
              }}
            />
          </svg>
          
          {/* Center content */}
          {getDisplayValue() && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={cn('font-medium', getTextSizeClasses())}>
                {getDisplayValue()}
              </span>
            </div>
          )}
        </div>
        
        {/* Label */}
        {label && (
          <span className={cn('mt-2 font-medium text-center', getTextSizeClasses())}>
            {label}
          </span>
        )}
        
        {/* Description */}
        {description && (
          <p className="mt-1 text-sm text-neutral-600 text-center">
            {description}
          </p>
        )}
      </div>
    )
  }
  
  // Render stepped progress
  const renderSteppedProgress = () => (
    <div className="w-full">
      {/* Header */}
      {label && (
        <h3 className={cn('font-medium mb-4', getTextSizeClasses())}>
          {label}
        </h3>
      )}
      
      {/* Steps */}
      <div className="space-y-4">
        {steps.map((step, index) => {
          const isCompleted = step.status === 'completed'
          const isCurrent = step.status === 'current'
          const isError = step.status === 'error'
          const isPending = step.status === 'pending'
          
          return (
            <div
              key={step.id}
              className={cn(
                'flex items-start space-x-3 cursor-pointer transition-colors duration-200',
                {
                  'hover:bg-neutral-50 rounded-lg p-2 -m-2': onStepChange,
                }
              )}
              onClick={() => onStepChange?.(index)}
            >
              {/* Step indicator */}
              <div className={cn(
                'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium',
                {
                  'bg-success-500 text-white': isCompleted,
                  'bg-primary-500 text-white': isCurrent,
                  'bg-error-500 text-white': isError,
                  'bg-neutral-200 text-neutral-600': isPending,
                }
              )}>
                {isCompleted ? (
                  <Check className="h-3 w-3" />
                ) : isError ? (
                  <AlertCircle className="h-3 w-3" />
                ) : isCurrent ? (
                  <Clock className="h-3 w-3" />
                ) : (
                  index + 1
                )}
              </div>
              
              {/* Step content */}
              <div className="flex-1 min-w-0">
                <p className={cn(
                  'font-medium',
                  {
                    'text-neutral-900': isCompleted || isCurrent,
                    'text-error-700': isError,
                    'text-neutral-500': isPending,
                  }
                )}>
                  {step.label}
                  {step.optional && (
                    <span className="ml-1 text-sm text-neutral-400">(optional)</span>
                  )}
                </p>
                
                {step.description && (
                  <p className={cn(
                    'mt-1 text-sm',
                    {
                      'text-neutral-600': isCompleted || isCurrent,
                      'text-error-600': isError,
                      'text-neutral-400': isPending,
                    }
                  )}>
                    {step.description}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
      
      {/* Description */}
      {description && (
        <p className="mt-4 text-sm text-neutral-600">
          {description}
        </p>
      )}
    </div>
  )
  
  // Get progress indicator based on variant
  const getProgressIndicator = () => {
    switch (variant) {
      case 'circular':
        return renderCircularProgress()
      case 'stepped':
        return renderSteppedProgress()
      case 'linear':
      default:
        return renderLinearProgress()
    }
  }
  
  // Generate progress classes
  const progressClasses = cn(
    'w-full',
    className
  )
  
  // Generate accessibility attributes
  const accessibilityProps = {
    'aria-label': ariaLabel || label || semanticMeaning,
    'aria-valuenow': indeterminate ? undefined : value,
    'aria-valuemin': 0,
    'aria-valuemax': max,
    'aria-valuetext': getDisplayValue() || undefined,
    'data-semantic-type': 'ai-first-progress',
    'data-mcp-type': mcpType,
    'data-ai-extensible': extensibleByAI,
    'data-testid': testId || 'ai-progress',
    role: 'progressbar',
  }
  
  return (
    <div
      ref={ref}
      className={progressClasses}
      {...accessibilityProps}
      {...props}
    >
      {getProgressIndicator()}
      
      {/* Hidden capabilities description */}
      {capabilities.length > 0 && (
        <span className="sr-only">
          Progress capabilities: {capabilities.join(', ')}
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

Progress.displayName = 'Progress'

// Progress variants for common use cases
export const LinearProgress = forwardRef<HTMLDivElement, Omit<ProgressProps, 'variant'>>((props, ref) => (
  <Progress ref={ref} variant="linear" {...props} />
))

export const CircularProgress = forwardRef<HTMLDivElement, Omit<ProgressProps, 'variant'>>((props, ref) => (
  <Progress ref={ref} variant="circular" {...props} />
))

export const SteppedProgress = forwardRef<HTMLDivElement, Omit<ProgressProps, 'variant'>>((props, ref) => (
  <Progress ref={ref} variant="stepped" {...props} />
))

// MCP-specific progress variants
export const MCPOperationProgress = forwardRef<HTMLDivElement, Omit<ProgressProps, 'mcpType'>>((props, ref) => (
  <Progress 
    ref={ref} 
    mcpType="command"
    semanticMeaning="MCP Operation Progress"
    capabilities={['progress-indicator', 'mcp-feedback', 'step-tracking']}
    {...props} 
  />
))

LinearProgress.displayName = 'LinearProgress'
CircularProgress.displayName = 'CircularProgress'
SteppedProgress.displayName = 'SteppedProgress'
MCPOperationProgress.displayName = 'MCPOperationProgress'

export default Progress

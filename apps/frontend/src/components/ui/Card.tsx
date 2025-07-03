/**
 * Card Component - AI-First semantic card with MCP integration
 * SemanticType: AIFirstCard
 * ExtensibleByAI: true
 * AIUseCases: ["Content containers", "Data display", "Interactive panels", "MCP resource display"]
 */

import React, { forwardRef } from 'react'
import {
  cn,
  getTransition,
  type SemanticVariant,
  type ComponentSize,
  type AIFirstComponentProps,
} from '../../design-system'

export interface CardProps extends 
  React.HTMLAttributes<HTMLDivElement>,
  AIFirstComponentProps {
  /**
   * Card visual variant
   */
  variant?: SemanticVariant
  
  /**
   * Card size
   */
  size?: ComponentSize
  
  /**
   * Card elevation level
   */
  elevation?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  
  /**
   * Whether card is interactive (clickable)
   */
  interactive?: boolean
  
  /**
   * Whether card is selected
   */
  selected?: boolean
  
  /**
   * Whether card is loading
   */
  loading?: boolean
  
  /**
   * Card header content
   */
  header?: React.ReactNode
  
  /**
   * Card footer content
   */
  footer?: React.ReactNode
  
  /**
   * Card children content
   */
  children?: React.ReactNode
  
  /**
   * Click handler for interactive cards
   */
  onCardClick?: () => void
}

/**
 * AI-First Card Component
 * 
 * Features:
 * - Semantic variants with proper visual hierarchy
 * - Interactive states with accessibility support
 * - MCP resource integration
 * - Loading states with proper announcements
 * - Keyboard navigation for interactive cards
 * - AI-extensible with semantic metadata
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(({
  variant = 'neutral',
  size = 'md',
  elevation = 'sm',
  interactive = false,
  selected = false,
  loading = false,
  header,
  footer,
  children,
  className,
  onCardClick,
  mcpType,
  onMCPCommand,
  aiContext,
  onAIInteraction,
  semanticMeaning,
  capabilities = ['display', 'focus'],
  extensibleByAI = true,
  onClick,
  onKeyDown,
  'aria-label': ariaLabel,
  'data-testid': testId,
  ...props
}, ref) => {
  // Handle card click with MCP and AI integration
  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (loading) return
    
    // Trigger MCP command if configured
    if (mcpType && onMCPCommand) {
      onMCPCommand('card:click', {
        variant,
        size,
        semanticMeaning,
        selected,
        timestamp: new Date().toISOString(),
      })
    }
    
    // Trigger AI interaction if configured
    if (onAIInteraction) {
      onAIInteraction({
        type: 'card:click',
        data: {
          variant,
          size,
          semanticMeaning,
          selected,
          context: aiContext,
        },
        context: {
          capabilities,
          extensibleByAI,
        },
      })
    }
    
    onCardClick?.()
    onClick?.(event)
  }
  
  // Handle keyboard navigation for interactive cards
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (interactive && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault()
      handleClick(event as any)
    }
    
    onKeyDown?.(event)
  }
  
  // Get elevation classes
  const getElevationClasses = () => {
    switch (elevation) {
      case 'none':
        return 'shadow-none'
      case 'sm':
        return 'shadow-sm'
      case 'md':
        return 'shadow-md'
      case 'lg':
        return 'shadow-lg'
      case 'xl':
        return 'shadow-xl'
      default:
        return 'shadow-sm'
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
  
  // Get variant classes
  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'bg-primary-50 border-primary-200'
      case 'secondary':
        return 'bg-neutral-50 border-neutral-200'
      case 'success':
        return 'bg-success-50 border-success-200'
      case 'warning':
        return 'bg-warning-50 border-warning-200'
      case 'error':
        return 'bg-error-50 border-error-200'
      case 'info':
        return 'bg-info-50 border-info-200'
      default:
        return 'bg-white border-neutral-200'
    }
  }
  
  // Generate card classes
  const cardClasses = cn(
    // Base card styles
    'rounded-lg border',
    'transition-all duration-200 ease-in-out',
    
    // Size classes
    getSizeClasses(),
    
    // Variant classes
    getVariantClasses(),
    
    // Elevation classes
    getElevationClasses(),
    
    // Interactive states
    {
      'cursor-pointer hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2': interactive,
      'ring-2 ring-primary-500 ring-offset-2': selected,
      'opacity-75 cursor-wait': loading,
      'transform hover:scale-[1.02]': interactive && !loading,
    },
    
    // MCP-specific classes
    mcpType && `mcp-${mcpType}`,
    
    // Custom classes
    className
  )
  
  // Generate accessibility attributes
  const accessibilityProps = {
    'aria-label': ariaLabel || semanticMeaning,
    'aria-selected': interactive ? selected : undefined,
    'aria-busy': loading,
    'aria-describedby': capabilities.length > 0 ? `card-capabilities-${capabilities.join('-')}` : undefined,
    'data-semantic-type': 'ai-first-card',
    'data-mcp-type': mcpType,
    'data-ai-extensible': extensibleByAI,
    'data-testid': testId || 'ai-card',
    role: interactive ? 'button' : undefined,
    tabIndex: interactive ? 0 : undefined,
  }
  
  return (
    <div
      ref={ref}
      className={cardClasses}
      onClick={interactive ? handleClick : onClick}
      onKeyDown={interactive ? handleKeyDown : onKeyDown}
      {...accessibilityProps}
      {...props}
    >
      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500" />
          <span className="sr-only">Loading card content...</span>
        </div>
      )}
      
      {/* Card header */}
      {header && (
        <div className={cn(
          'mb-4 pb-3 border-b border-neutral-200',
          size === 'sm' ? 'mb-2 pb-2' : size === 'lg' ? 'mb-6 pb-4' : 'mb-4 pb-3'
        )}>
          {header}
        </div>
      )}
      
      {/* Card content */}
      {children && (
        <div className={loading ? 'opacity-50' : ''}>
          {children}
        </div>
      )}
      
      {/* Card footer */}
      {footer && (
        <div className={cn(
          'mt-4 pt-3 border-t border-neutral-200',
          size === 'sm' ? 'mt-2 pt-2' : size === 'lg' ? 'mt-6 pt-4' : 'mt-4 pt-3'
        )}>
          {footer}
        </div>
      )}
      
      {/* Hidden capabilities description */}
      {capabilities.length > 0 && (
        <span 
          id={`card-capabilities-${capabilities.join('-')}`}
          className="sr-only"
        >
          Card capabilities: {capabilities.join(', ')}
        </span>
      )}
    </div>
  )
})

Card.displayName = 'Card'

// Card sub-components
export const CardHeader = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({
  className,
  children,
  ...props
}, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5', className)}
    {...props}
  >
    {children}
  </div>
))

export const CardTitle = forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(({
  className,
  children,
  ...props
}, ref) => (
  <h3
    ref={ref}
    className={cn('text-lg font-semibold leading-none tracking-tight', className)}
    {...props}
  >
    {children}
  </h3>
))

export const CardDescription = forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(({
  className,
  children,
  ...props
}, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-neutral-600', className)}
    {...props}
  >
    {children}
  </p>
))

export const CardContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({
  className,
  children,
  ...props
}, ref) => (
  <div
    ref={ref}
    className={cn('flex-1', className)}
    {...props}
  >
    {children}
  </div>
))

export const CardFooter = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({
  className,
  children,
  ...props
}, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center', className)}
    {...props}
  >
    {children}
  </div>
))

// MCP-specific card variants
export const MCPResourceCard = forwardRef<HTMLDivElement, Omit<CardProps, 'mcpType'>>((props, ref) => (
  <Card 
    ref={ref} 
    mcpType="resource" 
    semanticMeaning="MCP Resource Display"
    capabilities={['display', 'mcp-resource', 'focus']}
    {...props} 
  />
))

export const MCPCommandCard = forwardRef<HTMLDivElement, Omit<CardProps, 'mcpType'>>((props, ref) => (
  <Card 
    ref={ref} 
    mcpType="command" 
    interactive={true}
    semanticMeaning="MCP Command Interface"
    capabilities={['display', 'mcp-command', 'click', 'keyboard-navigation']}
    {...props} 
  />
))

CardHeader.displayName = 'CardHeader'
CardTitle.displayName = 'CardTitle'
CardDescription.displayName = 'CardDescription'
CardContent.displayName = 'CardContent'
CardFooter.displayName = 'CardFooter'
MCPResourceCard.displayName = 'MCPResourceCard'
MCPCommandCard.displayName = 'MCPCommandCard'

export default Card

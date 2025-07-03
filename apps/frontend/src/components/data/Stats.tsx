/**
 * Stats Component - AI-First semantic statistics display with MCP integration
 * SemanticType: AIFirstStats
 * ExtensibleByAI: true
 * AIUseCases: ["Metrics display", "KPI visualization", "Data insights", "MCP analytics"]
 */

import React, { forwardRef } from 'react'
import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react'
import {
  cn,
  getTransition,
  type SemanticVariant,
  type ComponentSize,
  type AIFirstComponentProps,
} from '../../design-system'

export interface StatItem {
  id: string
  label: string
  value: string | number
  previousValue?: string | number
  change?: number
  changeType?: 'increase' | 'decrease' | 'neutral'
  trend?: 'up' | 'down' | 'neutral'
  icon?: React.ReactNode
  description?: string
  unit?: string
  format?: 'number' | 'currency' | 'percentage' | 'duration'
  precision?: number
  color?: SemanticVariant
}

export interface StatsProps extends 
  React.HTMLAttributes<HTMLDivElement>,
  AIFirstComponentProps {
  /**
   * Statistics items
   */
  stats: StatItem[]
  
  /**
   * Stats layout variant
   */
  variant?: 'grid' | 'horizontal' | 'vertical'
  
  /**
   * Stats size
   */
  size?: ComponentSize
  
  /**
   * Number of columns for grid layout
   */
  columns?: 1 | 2 | 3 | 4 | 5 | 6
  
  /**
   * Whether to show trend indicators
   */
  showTrend?: boolean
  
  /**
   * Whether to show change values
   */
  showChange?: boolean
  
  /**
   * Whether to show descriptions
   */
  showDescription?: boolean
  
  /**
   * Whether stats are loading
   */
  loading?: boolean
  
  /**
   * Whether stats are interactive
   */
  interactive?: boolean
  
  /**
   * Custom stat renderer
   */
  renderStat?: (stat: StatItem, index: number) => React.ReactNode
  
  /**
   * Stat click handler
   */
  onStatClick?: (stat: StatItem, index: number) => void
  
  /**
   * Stat hover handler
   */
  onStatHover?: (stat: StatItem, index: number) => void
}

/**
 * AI-First Stats Component
 * 
 * Features:
 * - Multiple layout variants (grid, horizontal, vertical)
 * - Trend indicators and change calculations
 * - Value formatting (currency, percentage, duration)
 * - Interactive stats with click handlers
 * - Loading states with skeleton animation
 * - MCP integration for analytics data
 * - Accessibility-first with proper ARIA attributes
 */
export const Stats = forwardRef<HTMLDivElement, StatsProps>(({
  stats = [],
  variant = 'grid',
  size = 'md',
  columns = 3,
  showTrend = true,
  showChange = true,
  showDescription = false,
  loading = false,
  interactive = false,
  renderStat,
  onStatClick,
  onStatHover,
  className,
  semanticMeaning,
  capabilities = ['metrics-display', 'trend-analysis', 'data-visualization'],
  extensibleByAI = true,
  mcpType,
  onMCPCommand,
  aiContext,
  onAIInteraction,
  'aria-label': ariaLabel,
  'data-testid': testId,
  ...props
}, ref) => {
  // Format value based on type
  const formatValue = (stat: StatItem): string => {
    const { value, format, precision = 0, unit } = stat
    const numValue = typeof value === 'string' ? parseFloat(value) : value
    
    if (isNaN(numValue)) return value.toString()
    
    let formatted: string
    
    switch (format) {
      case 'currency':
        formatted = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: precision,
          maximumFractionDigits: precision,
        }).format(numValue)
        break
        
      case 'percentage':
        formatted = `${numValue.toFixed(precision)}%`
        break
        
      case 'duration':
        // Simple duration formatting (assumes minutes)
        const hours = Math.floor(numValue / 60)
        const minutes = numValue % 60
        formatted = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
        break
        
      default:
        formatted = numValue.toLocaleString('en-US', {
          minimumFractionDigits: precision,
          maximumFractionDigits: precision,
        })
    }
    
    return unit ? `${formatted} ${unit}` : formatted
  }
  
  // Calculate change percentage
  const calculateChange = (stat: StatItem): number | null => {
    if (!stat.previousValue || !stat.change) return stat.change || null
    
    const current = typeof stat.value === 'string' ? parseFloat(stat.value) : stat.value
    const previous = typeof stat.previousValue === 'string' ? parseFloat(stat.previousValue) : stat.previousValue
    
    if (isNaN(current) || isNaN(previous) || previous === 0) return null
    
    return ((current - previous) / previous) * 100
  }
  
  // Get trend icon
  const getTrendIcon = (stat: StatItem) => {
    const change = calculateChange(stat)
    
    if (change === null) return null
    
    if (change > 0) {
      return <TrendingUp className="h-4 w-4 text-success-500" />
    } else if (change < 0) {
      return <TrendingDown className="h-4 w-4 text-error-500" />
    } else {
      return <Minus className="h-4 w-4 text-neutral-400" />
    }
  }
  
  // Get change color
  const getChangeColor = (stat: StatItem) => {
    const change = calculateChange(stat)
    
    if (change === null) return 'text-neutral-500'
    
    if (change > 0) {
      return 'text-success-600'
    } else if (change < 0) {
      return 'text-error-600'
    } else {
      return 'text-neutral-500'
    }
  }
  
  // Handle stat click
  const handleStatClick = (stat: StatItem, index: number) => {
    if (!interactive) return
    
    // MCP command for stat interaction
    if (mcpType && onMCPCommand) {
      onMCPCommand('stats:click', {
        stat: {
          id: stat.id,
          label: stat.label,
          value: stat.value,
        },
        index,
        semanticMeaning,
        timestamp: new Date().toISOString(),
      })
    }
    
    // AI interaction for stat click
    if (onAIInteraction) {
      onAIInteraction({
        type: 'stats:click',
        data: {
          stat,
          index,
          semanticMeaning,
        },
        context: aiContext,
      })
    }
    
    onStatClick?.(stat, index)
  }
  
  // Get size classes
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'p-4'
      case 'md':
        return 'p-6'
      case 'lg':
        return 'p-8'
      default:
        return 'p-6'
    }
  }
  
  // Get layout classes
  const getLayoutClasses = () => {
    switch (variant) {
      case 'horizontal':
        return 'flex flex-wrap gap-4'
      case 'vertical':
        return 'space-y-4'
      case 'grid':
      default:
        return `grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-${columns}`
    }
  }
  
  // Render individual stat
  const renderStatItem = (stat: StatItem, index: number) => {
    const change = calculateChange(stat)
    
    return (
      <div
        key={stat.id}
        className={cn(
          'bg-white border border-neutral-200 rounded-lg transition-all duration-200',
          getSizeClasses(),
          {
            'hover:shadow-md cursor-pointer': interactive,
            'hover:border-neutral-300': interactive,
          }
        )}
        onClick={() => handleStatClick(stat, index)}
        onMouseEnter={() => onStatHover?.(stat, index)}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        aria-label={`${stat.label}: ${formatValue(stat)}`}
      >
        {/* Header with icon and label */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            {stat.icon && (
              <div className="flex-shrink-0 text-neutral-400">
                {stat.icon}
              </div>
            )}
            <h3 className="text-sm font-medium text-neutral-600 truncate">
              {stat.label}
            </h3>
          </div>
          
          {showTrend && getTrendIcon(stat)}
        </div>
        
        {/* Value */}
        <div className="mb-2">
          <p className={cn(
            'text-2xl font-bold',
            stat.color ? `text-${stat.color}-600` : 'text-neutral-900'
          )}>
            {formatValue(stat)}
          </p>
        </div>
        
        {/* Change indicator */}
        {showChange && change !== null && (
          <div className="flex items-center space-x-1">
            <span className={cn('text-sm font-medium', getChangeColor(stat))}>
              {change > 0 ? '+' : ''}{change.toFixed(1)}%
            </span>
            <span className="text-sm text-neutral-500">
              vs previous
            </span>
          </div>
        )}
        
        {/* Description */}
        {showDescription && stat.description && (
          <div className="mt-2 pt-2 border-t border-neutral-100">
            <p className="text-sm text-neutral-500">
              {stat.description}
            </p>
          </div>
        )}
      </div>
    )
  }
  
  // Loading skeleton
  const renderLoadingSkeleton = () => (
    <div className={getLayoutClasses()}>
      {Array.from({ length: columns }).map((_, index) => (
        <div
          key={index}
          className={cn(
            'bg-white border border-neutral-200 rounded-lg',
            getSizeClasses()
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="h-4 bg-neutral-200 rounded animate-pulse w-24"></div>
            <div className="h-4 w-4 bg-neutral-200 rounded animate-pulse"></div>
          </div>
          <div className="h-8 bg-neutral-200 rounded animate-pulse mb-2"></div>
          <div className="h-4 bg-neutral-100 rounded animate-pulse w-20"></div>
        </div>
      ))}
    </div>
  )
  
  // Generate stats classes
  const statsClasses = cn(
    'w-full',
    className
  )
  
  // Generate accessibility attributes
  const accessibilityProps = {
    'aria-label': ariaLabel || semanticMeaning || 'Statistics',
    'aria-busy': loading,
    'data-semantic-type': 'ai-first-stats',
    'data-mcp-type': mcpType,
    'data-ai-extensible': extensibleByAI,
    'data-testid': testId || 'ai-stats',
    role: 'region',
  }
  
  return (
    <div ref={ref} className={statsClasses} {...accessibilityProps} {...props}>
      {loading ? (
        renderLoadingSkeleton()
      ) : stats.length === 0 ? (
        <div className="text-center py-12">
          <Info className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
          <p className="text-neutral-500">No statistics available</p>
        </div>
      ) : (
        <div className={getLayoutClasses()}>
          {stats.map((stat, index) => 
            renderStat ? renderStat(stat, index) : renderStatItem(stat, index)
          )}
        </div>
      )}
      
      {/* Hidden capabilities description */}
      {capabilities.length > 0 && (
        <span className="sr-only">
          Statistics capabilities: {capabilities.join(', ')}
        </span>
      )}
    </div>
  )
})

Stats.displayName = 'Stats'

// Stats variants for common use cases
export const GridStats = forwardRef<HTMLDivElement, Omit<StatsProps, 'variant'>>((props, ref) => (
  <Stats ref={ref} variant="grid" {...props} />
))

export const HorizontalStats = forwardRef<HTMLDivElement, Omit<StatsProps, 'variant'>>((props, ref) => (
  <Stats ref={ref} variant="horizontal" {...props} />
))

export const VerticalStats = forwardRef<HTMLDivElement, Omit<StatsProps, 'variant'>>((props, ref) => (
  <Stats ref={ref} variant="vertical" {...props} />
))

export const InteractiveStats = forwardRef<HTMLDivElement, Omit<StatsProps, 'interactive'>>((props, ref) => (
  <Stats ref={ref} interactive={true} {...props} />
))

GridStats.displayName = 'GridStats'
HorizontalStats.displayName = 'HorizontalStats'
VerticalStats.displayName = 'VerticalStats'
InteractiveStats.displayName = 'InteractiveStats'

export default Stats

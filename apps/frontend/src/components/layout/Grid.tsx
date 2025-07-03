/**
 * Grid Component - AI-First semantic grid layout with responsive design
 * SemanticType: AIFirstGrid
 * ExtensibleByAI: true
 * AIUseCases: ["Grid layouts", "Responsive design", "Content organization", "Data display"]
 */

import React, { forwardRef } from 'react'
import {
  cn,
  type AIFirstComponentProps,
} from '../../design-system'

export interface GridProps extends 
  React.HTMLAttributes<HTMLDivElement>,
  AIFirstComponentProps {
  /**
   * Number of columns
   */
  cols?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 'auto' | 'none'
  
  /**
   * Number of rows
   */
  rows?: 1 | 2 | 3 | 4 | 5 | 6 | 'auto' | 'none'
  
  /**
   * Gap between grid items
   */
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  
  /**
   * Column gap (overrides gap for columns)
   */
  colGap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  
  /**
   * Row gap (overrides gap for rows)
   */
  rowGap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  
  /**
   * Responsive column configuration
   */
  responsive?: {
    sm?: GridProps['cols']
    md?: GridProps['cols']
    lg?: GridProps['cols']
    xl?: GridProps['cols']
  }
  
  /**
   * Auto-fit columns with minimum width
   */
  autoFit?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  
  /**
   * Auto-fill columns with minimum width
   */
  autoFill?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  
  /**
   * Alignment of items along the inline axis
   */
  justifyItems?: 'start' | 'end' | 'center' | 'stretch'
  
  /**
   * Alignment of items along the block axis
   */
  alignItems?: 'start' | 'end' | 'center' | 'stretch'
  
  /**
   * Alignment of the grid along the inline axis
   */
  justifyContent?: 'start' | 'end' | 'center' | 'stretch' | 'between' | 'around' | 'evenly'
  
  /**
   * Alignment of the grid along the block axis
   */
  alignContent?: 'start' | 'end' | 'center' | 'stretch' | 'between' | 'around' | 'evenly'
  
  /**
   * Semantic HTML element to render
   */
  as?: 'div' | 'section' | 'article' | 'aside' | 'main' | 'ul' | 'ol'
  
  /**
   * Grid children
   */
  children?: React.ReactNode
}

/**
 * AI-First Grid Component
 * 
 * Features:
 * - Flexible grid system with responsive breakpoints
 * - Auto-fit and auto-fill column options
 * - Semantic HTML element selection
 * - Comprehensive alignment options
 * - Gap control for spacing
 * - AI-extensible with semantic metadata
 * - Accessibility-aware structure
 */
export const Grid = forwardRef<HTMLDivElement, GridProps>(({
  cols = 'auto',
  rows = 'auto',
  gap = 'md',
  colGap,
  rowGap,
  responsive,
  autoFit,
  autoFill,
  justifyItems = 'stretch',
  alignItems = 'stretch',
  justifyContent = 'start',
  alignContent = 'start',
  as: Component = 'div',
  className,
  children,
  semanticMeaning,
  capabilities = ['grid-layout', 'responsive', 'alignment', 'spacing'],
  extensibleByAI = true,
  'aria-label': ariaLabel,
  'data-testid': testId,
  ...props
}, ref) => {
  // Get column classes
  const getColumnClasses = () => {
    if (autoFit || autoFill) {
      const minWidthMap = {
        xs: '8rem',
        sm: '12rem',
        md: '16rem',
        lg: '20rem',
        xl: '24rem',
      }
      
      if (autoFit) {
        return `grid-cols-[repeat(auto-fit,minmax(${minWidthMap[autoFit]},1fr))]`
      }
      
      if (autoFill) {
        return `grid-cols-[repeat(auto-fill,minmax(${minWidthMap[autoFill]},1fr))]`
      }
    }
    
    if (cols === 'auto') return 'grid-cols-auto'
    if (cols === 'none') return 'grid-cols-none'
    
    let classes = `grid-cols-${cols}`
    
    // Add responsive classes
    if (responsive) {
      if (responsive.sm) classes += ` sm:grid-cols-${responsive.sm}`
      if (responsive.md) classes += ` md:grid-cols-${responsive.md}`
      if (responsive.lg) classes += ` lg:grid-cols-${responsive.lg}`
      if (responsive.xl) classes += ` xl:grid-cols-${responsive.xl}`
    }
    
    return classes
  }
  
  // Get row classes
  const getRowClasses = () => {
    if (rows === 'auto') return 'grid-rows-auto'
    if (rows === 'none') return 'grid-rows-none'
    return `grid-rows-${rows}`
  }
  
  // Get gap classes
  const getGapClasses = () => {
    const gapMap = {
      none: 'gap-0',
      xs: 'gap-1',
      sm: 'gap-2',
      md: 'gap-4',
      lg: 'gap-6',
      xl: 'gap-8',
      '2xl': 'gap-12',
    }
    
    let classes = gapMap[gap] || gapMap.md
    
    // Override with specific column/row gaps
    if (colGap) {
      const colGapMap = {
        none: 'gap-x-0',
        xs: 'gap-x-1',
        sm: 'gap-x-2',
        md: 'gap-x-4',
        lg: 'gap-x-6',
        xl: 'gap-x-8',
        '2xl': 'gap-x-12',
      }
      classes = classes.replace(/gap-\d+/, '') + ` ${colGapMap[colGap]}`
    }
    
    if (rowGap) {
      const rowGapMap = {
        none: 'gap-y-0',
        xs: 'gap-y-1',
        sm: 'gap-y-2',
        md: 'gap-y-4',
        lg: 'gap-y-6',
        xl: 'gap-y-8',
        '2xl': 'gap-y-12',
      }
      classes = classes.replace(/gap-\d+/, '') + ` ${rowGapMap[rowGap]}`
    }
    
    return classes
  }
  
  // Get alignment classes
  const getAlignmentClasses = () => {
    const justifyItemsMap = {
      start: 'justify-items-start',
      end: 'justify-items-end',
      center: 'justify-items-center',
      stretch: 'justify-items-stretch',
    }
    
    const alignItemsMap = {
      start: 'items-start',
      end: 'items-end',
      center: 'items-center',
      stretch: 'items-stretch',
    }
    
    const justifyContentMap = {
      start: 'justify-start',
      end: 'justify-end',
      center: 'justify-center',
      stretch: 'justify-stretch',
      between: 'justify-between',
      around: 'justify-around',
      evenly: 'justify-evenly',
    }
    
    const alignContentMap = {
      start: 'content-start',
      end: 'content-end',
      center: 'content-center',
      stretch: 'content-stretch',
      between: 'content-between',
      around: 'content-around',
      evenly: 'content-evenly',
    }
    
    return cn(
      justifyItemsMap[justifyItems],
      alignItemsMap[alignItems],
      justifyContentMap[justifyContent],
      alignContentMap[alignContent]
    )
  }
  
  // Generate grid classes
  const gridClasses = cn(
    'grid',
    getColumnClasses(),
    getRowClasses(),
    getGapClasses(),
    getAlignmentClasses(),
    className
  )
  
  // Generate accessibility attributes based on semantic element
  const getAccessibilityProps = () => {
    const baseProps = {
      'aria-label': ariaLabel || semanticMeaning,
      'data-semantic-type': 'ai-first-grid',
      'data-ai-extensible': extensibleByAI,
      'data-testid': testId || 'ai-grid',
    }
    
    // Add semantic-specific attributes
    switch (Component) {
      case 'ul':
      case 'ol':
        return { ...baseProps, role: 'list' }
      case 'main':
        return { ...baseProps, role: 'main' }
      case 'aside':
        return { ...baseProps, role: 'complementary' }
      default:
        return baseProps
    }
  }
  
  return (
    <Component
      ref={ref as any}
      className={gridClasses}
      {...getAccessibilityProps()}
      {...props}
    >
      {children}
      
      {/* Hidden capabilities description */}
      {capabilities.length > 0 && (
        <span className="sr-only">
          Grid capabilities: {capabilities.join(', ')}
        </span>
      )}
    </Component>
  )
})

Grid.displayName = 'Grid'

// Grid item component
export interface GridItemProps extends 
  React.HTMLAttributes<HTMLDivElement>,
  AIFirstComponentProps {
  /**
   * Column span
   */
  colSpan?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 'auto' | 'full'
  
  /**
   * Row span
   */
  rowSpan?: 1 | 2 | 3 | 4 | 5 | 6 | 'auto' | 'full'
  
  /**
   * Column start position
   */
  colStart?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 'auto'
  
  /**
   * Column end position
   */
  colEnd?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 'auto'
  
  /**
   * Row start position
   */
  rowStart?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 'auto'
  
  /**
   * Row end position
   */
  rowEnd?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 'auto'
  
  /**
   * Self alignment along the inline axis
   */
  justifySelf?: 'start' | 'end' | 'center' | 'stretch'
  
  /**
   * Self alignment along the block axis
   */
  alignSelf?: 'start' | 'end' | 'center' | 'stretch'
  
  /**
   * Grid item children
   */
  children?: React.ReactNode
}

export const GridItem = forwardRef<HTMLDivElement, GridItemProps>(({
  colSpan,
  rowSpan,
  colStart,
  colEnd,
  rowStart,
  rowEnd,
  justifySelf = 'stretch',
  alignSelf = 'stretch',
  className,
  children,
  semanticMeaning,
  capabilities = ['grid-item', 'positioning', 'alignment'],
  extensibleByAI = true,
  'data-testid': testId,
  ...props
}, ref) => {
  // Get span classes
  const getSpanClasses = () => {
    let classes = ''
    
    if (colSpan) {
      classes += colSpan === 'auto' ? ' col-auto' : colSpan === 'full' ? ' col-span-full' : ` col-span-${colSpan}`
    }
    
    if (rowSpan) {
      classes += rowSpan === 'auto' ? ' row-auto' : rowSpan === 'full' ? ' row-span-full' : ` row-span-${rowSpan}`
    }
    
    return classes
  }
  
  // Get position classes
  const getPositionClasses = () => {
    let classes = ''
    
    if (colStart) {
      classes += colStart === 'auto' ? ' col-start-auto' : ` col-start-${colStart}`
    }
    
    if (colEnd) {
      classes += colEnd === 'auto' ? ' col-end-auto' : ` col-end-${colEnd}`
    }
    
    if (rowStart) {
      classes += rowStart === 'auto' ? ' row-start-auto' : ` row-start-${rowStart}`
    }
    
    if (rowEnd) {
      classes += rowEnd === 'auto' ? ' row-end-auto' : ` row-end-${rowEnd}`
    }
    
    return classes
  }
  
  // Get self alignment classes
  const getSelfAlignmentClasses = () => {
    const justifySelfMap = {
      start: 'justify-self-start',
      end: 'justify-self-end',
      center: 'justify-self-center',
      stretch: 'justify-self-stretch',
    }
    
    const alignSelfMap = {
      start: 'self-start',
      end: 'self-end',
      center: 'self-center',
      stretch: 'self-stretch',
    }
    
    return cn(
      justifySelfMap[justifySelf],
      alignSelfMap[alignSelf]
    )
  }
  
  // Generate grid item classes
  const gridItemClasses = cn(
    getSpanClasses(),
    getPositionClasses(),
    getSelfAlignmentClasses(),
    className
  )
  
  return (
    <div
      ref={ref}
      className={gridItemClasses}
      data-semantic-type="ai-first-grid-item"
      data-ai-extensible={extensibleByAI}
      data-testid={testId || 'ai-grid-item'}
      {...props}
    >
      {children}
      
      {/* Hidden capabilities description */}
      {capabilities.length > 0 && (
        <span className="sr-only">
          Grid item capabilities: {capabilities.join(', ')}
        </span>
      )}
    </div>
  )
})

GridItem.displayName = 'GridItem'

// Grid variants for common use cases
export const ResponsiveGrid = forwardRef<HTMLDivElement, Omit<GridProps, 'responsive'>>((props, ref) => (
  <Grid 
    ref={ref} 
    responsive={{ sm: 1, md: 2, lg: 3, xl: 4 }}
    semanticMeaning="Responsive grid layout"
    {...props} 
  />
))

export const AutoFitGrid = forwardRef<HTMLDivElement, Omit<GridProps, 'autoFit'>>((props, ref) => (
  <Grid 
    ref={ref} 
    autoFit="md"
    semanticMeaning="Auto-fit grid layout"
    {...props} 
  />
))

export const CardGrid = forwardRef<HTMLDivElement, GridProps>((props, ref) => (
  <Grid 
    ref={ref} 
    autoFit="sm"
    gap="lg"
    semanticMeaning="Card grid layout"
    capabilities={['grid-layout', 'card-display', 'responsive']}
    {...props} 
  />
))

ResponsiveGrid.displayName = 'ResponsiveGrid'
AutoFitGrid.displayName = 'AutoFitGrid'
CardGrid.displayName = 'CardGrid'

export default Grid

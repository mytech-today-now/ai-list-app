/**
 * Stack Component - AI-First semantic stack layout with flexible spacing
 * SemanticType: AIFirstStack
 * ExtensibleByAI: true
 * AIUseCases: ["Layout arrangement", "Spacing control", "Responsive stacking", "Content organization"]
 */

import React, { forwardRef } from 'react'
import {
  cn,
  type AIFirstComponentProps,
} from '../../design-system'

export interface StackProps extends 
  React.HTMLAttributes<HTMLDivElement>,
  AIFirstComponentProps {
  /**
   * Stack direction
   */
  direction?: 'row' | 'column' | 'row-reverse' | 'column-reverse'
  
  /**
   * Spacing between items
   */
  spacing?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'
  
  /**
   * Alignment of items along main axis
   */
  justify?: 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly'
  
  /**
   * Alignment of items along cross axis
   */
  align?: 'start' | 'end' | 'center' | 'baseline' | 'stretch'
  
  /**
   * Whether items should wrap
   */
  wrap?: boolean
  
  /**
   * Whether to use responsive direction
   */
  responsive?: boolean
  
  /**
   * Responsive breakpoint for direction change
   */
  responsiveBreakpoint?: 'sm' | 'md' | 'lg' | 'xl'
  
  /**
   * Direction for mobile (when responsive is true)
   */
  mobileDirection?: 'row' | 'column'
  
  /**
   * Whether to divide items with borders
   */
  divider?: boolean
  
  /**
   * Custom divider element
   */
  dividerElement?: React.ReactNode
  
  /**
   * Semantic HTML element to render
   */
  as?: 'div' | 'section' | 'article' | 'aside' | 'header' | 'footer' | 'nav' | 'ul' | 'ol'
  
  /**
   * Stack children
   */
  children?: React.ReactNode
}

/**
 * AI-First Stack Component
 * 
 * Features:
 * - Flexible direction and spacing control
 * - Responsive layout options
 * - Semantic HTML element selection
 * - Item dividers with customization
 * - Alignment and justification options
 * - AI-extensible with semantic metadata
 * - Accessibility-aware structure
 */
export const Stack = forwardRef<HTMLDivElement, StackProps>(({
  direction = 'column',
  spacing = 'md',
  justify = 'start',
  align = 'stretch',
  wrap = false,
  responsive = false,
  responsiveBreakpoint = 'md',
  mobileDirection = 'column',
  divider = false,
  dividerElement,
  as: Component = 'div',
  className,
  children,
  semanticMeaning,
  capabilities = ['layout', 'spacing', 'alignment', 'responsive'],
  extensibleByAI = true,
  'aria-label': ariaLabel,
  'data-testid': testId,
  ...props
}, ref) => {
  // Get direction classes
  const getDirectionClasses = () => {
    const directionMap = {
      row: 'flex-row',
      column: 'flex-col',
      'row-reverse': 'flex-row-reverse',
      'column-reverse': 'flex-col-reverse',
    }
    
    let classes = `flex ${directionMap[direction]}`
    
    if (responsive) {
      const mobileDirectionClass = mobileDirection === 'row' ? 'flex-row' : 'flex-col'
      const desktopDirectionClass = directionMap[direction]
      classes = `flex ${mobileDirectionClass} ${responsiveBreakpoint}:${desktopDirectionClass}`
    }
    
    return classes
  }
  
  // Get spacing classes
  const getSpacingClasses = () => {
    if (spacing === 'none') return ''
    
    const isRow = direction === 'row' || direction === 'row-reverse'
    const spacingMap = {
      xs: isRow ? 'space-x-1' : 'space-y-1',
      sm: isRow ? 'space-x-2' : 'space-y-2',
      md: isRow ? 'space-x-4' : 'space-y-4',
      lg: isRow ? 'space-x-6' : 'space-y-6',
      xl: isRow ? 'space-x-8' : 'space-y-8',
      '2xl': isRow ? 'space-x-12' : 'space-y-12',
      '3xl': isRow ? 'space-x-16' : 'space-y-16',
    }
    
    let classes = spacingMap[spacing] || spacingMap.md
    
    if (responsive) {
      const mobileIsRow = mobileDirection === 'row'
      const mobileSpacing = mobileIsRow ? spacing.replace('y', 'x') : spacing.replace('x', 'y')
      const desktopSpacing = spacingMap[spacing]
      
      const mobileSpacingMap = {
        xs: mobileIsRow ? 'space-x-1' : 'space-y-1',
        sm: mobileIsRow ? 'space-x-2' : 'space-y-2',
        md: mobileIsRow ? 'space-x-4' : 'space-y-4',
        lg: mobileIsRow ? 'space-x-6' : 'space-y-6',
        xl: mobileIsRow ? 'space-x-8' : 'space-y-8',
        '2xl': mobileIsRow ? 'space-x-12' : 'space-y-12',
        '3xl': mobileIsRow ? 'space-x-16' : 'space-y-16',
      }
      
      classes = `${mobileSpacingMap[spacing]} ${responsiveBreakpoint}:${desktopSpacing}`
    }
    
    return classes
  }
  
  // Get justify classes
  const getJustifyClasses = () => {
    const justifyMap = {
      start: 'justify-start',
      end: 'justify-end',
      center: 'justify-center',
      between: 'justify-between',
      around: 'justify-around',
      evenly: 'justify-evenly',
    }
    
    return justifyMap[justify]
  }
  
  // Get align classes
  const getAlignClasses = () => {
    const alignMap = {
      start: 'items-start',
      end: 'items-end',
      center: 'items-center',
      baseline: 'items-baseline',
      stretch: 'items-stretch',
    }
    
    return alignMap[align]
  }
  
  // Get wrap classes
  const getWrapClasses = () => {
    return wrap ? 'flex-wrap' : 'flex-nowrap'
  }
  
  // Get divider classes
  const getDividerClasses = () => {
    if (!divider) return ''
    
    const isRow = direction === 'row' || direction === 'row-reverse'
    return isRow ? 'divide-x divide-neutral-200' : 'divide-y divide-neutral-200'
  }
  
  // Generate stack classes
  const stackClasses = cn(
    getDirectionClasses(),
    getSpacingClasses(),
    getJustifyClasses(),
    getAlignClasses(),
    getWrapClasses(),
    getDividerClasses(),
    className
  )
  
  // Generate accessibility attributes based on semantic element
  const getAccessibilityProps = () => {
    const baseProps = {
      'aria-label': ariaLabel || semanticMeaning,
      'data-semantic-type': 'ai-first-stack',
      'data-ai-extensible': extensibleByAI,
      'data-testid': testId || 'ai-stack',
    }
    
    // Add semantic-specific attributes
    switch (Component) {
      case 'ul':
      case 'ol':
        return { ...baseProps, role: 'list' }
      case 'nav':
        return { ...baseProps, role: 'navigation' }
      case 'aside':
        return { ...baseProps, role: 'complementary' }
      case 'header':
        return { ...baseProps, role: 'banner' }
      case 'footer':
        return { ...baseProps, role: 'contentinfo' }
      default:
        return baseProps
    }
  }
  
  // Process children for dividers
  const processChildren = () => {
    if (!divider || !children) return children
    
    const childArray = React.Children.toArray(children)
    
    if (dividerElement) {
      return childArray.reduce((acc, child, index) => {
        acc.push(child)
        if (index < childArray.length - 1) {
          acc.push(
            <div key={`divider-${index}`} className="flex-shrink-0">
              {dividerElement}
            </div>
          )
        }
        return acc
      }, [] as React.ReactNode[])
    }
    
    return children
  }
  
  return (
    <Component
      ref={ref as any}
      className={stackClasses}
      {...getAccessibilityProps()}
      {...props}
    >
      {processChildren()}
      
      {/* Hidden capabilities description */}
      {capabilities.length > 0 && (
        <span className="sr-only">
          Stack capabilities: {capabilities.join(', ')}
        </span>
      )}
    </Component>
  )
})

Stack.displayName = 'Stack'

// Stack variants for common use cases
export const HStack = forwardRef<HTMLDivElement, Omit<StackProps, 'direction'>>((props, ref) => (
  <Stack 
    ref={ref} 
    direction="row" 
    semanticMeaning="Horizontal stack layout"
    {...props} 
  />
))

export const VStack = forwardRef<HTMLDivElement, Omit<StackProps, 'direction'>>((props, ref) => (
  <Stack 
    ref={ref} 
    direction="column" 
    semanticMeaning="Vertical stack layout"
    {...props} 
  />
))

export const ResponsiveStack = forwardRef<HTMLDivElement, Omit<StackProps, 'responsive'>>((props, ref) => (
  <Stack 
    ref={ref} 
    responsive={true} 
    semanticMeaning="Responsive stack layout"
    {...props} 
  />
))

export const DividedStack = forwardRef<HTMLDivElement, Omit<StackProps, 'divider'>>((props, ref) => (
  <Stack 
    ref={ref} 
    divider={true} 
    semanticMeaning="Divided stack layout"
    {...props} 
  />
))

HStack.displayName = 'HStack'
VStack.displayName = 'VStack'
ResponsiveStack.displayName = 'ResponsiveStack'
DividedStack.displayName = 'DividedStack'

export default Stack

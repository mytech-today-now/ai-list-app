/**
 * Container Component - AI-First semantic container with responsive design
 * SemanticType: AIFirstContainer
 * ExtensibleByAI: true
 * AIUseCases: ["Layout structure", "Content containment", "Responsive design", "Semantic sections"]
 */

import React, { forwardRef } from 'react'
import {
  cn,
  type AIFirstComponentProps,
} from '../../design-system'

export interface ContainerProps extends 
  React.HTMLAttributes<HTMLDivElement>,
  AIFirstComponentProps {
  /**
   * Container size variant
   */
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  
  /**
   * Whether container should be centered
   */
  centered?: boolean
  
  /**
   * Padding size
   */
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  
  /**
   * Whether to add responsive padding
   */
  responsivePadding?: boolean
  
  /**
   * Semantic HTML element to render
   */
  as?: 'div' | 'main' | 'section' | 'article' | 'aside' | 'header' | 'footer' | 'nav'
  
  /**
   * Container children
   */
  children?: React.ReactNode
}

/**
 * AI-First Container Component
 * 
 * Features:
 * - Responsive max-width containers
 * - Semantic HTML element selection
 * - Flexible padding system
 * - Centered layout option
 * - AI-extensible with semantic metadata
 * - Accessibility-aware landmarks
 */
export const Container = forwardRef<HTMLDivElement, ContainerProps>(({
  size = 'lg',
  centered = true,
  padding = 'md',
  responsivePadding = true,
  as: Component = 'div',
  className,
  children,
  semanticMeaning,
  capabilities = ['layout', 'responsive', 'semantic-structure'],
  extensibleByAI = true,
  'aria-label': ariaLabel,
  'data-testid': testId,
  ...props
}, ref) => {
  // Get size classes
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'max-w-sm'
      case 'md':
        return 'max-w-md'
      case 'lg':
        return 'max-w-4xl'
      case 'xl':
        return 'max-w-6xl'
      case '2xl':
        return 'max-w-7xl'
      case 'full':
        return 'max-w-full'
      default:
        return 'max-w-4xl'
    }
  }
  
  // Get padding classes
  const getPaddingClasses = () => {
    if (padding === 'none') return ''
    
    const basePadding = {
      sm: 'px-4 py-2',
      md: 'px-6 py-4',
      lg: 'px-8 py-6',
      xl: 'px-12 py-8',
    }[padding] || 'px-6 py-4'
    
    if (!responsivePadding) return basePadding
    
    // Responsive padding
    switch (padding) {
      case 'sm':
        return 'px-2 py-1 sm:px-4 sm:py-2'
      case 'md':
        return 'px-4 py-2 sm:px-6 sm:py-4'
      case 'lg':
        return 'px-4 py-3 sm:px-6 sm:py-4 lg:px-8 lg:py-6'
      case 'xl':
        return 'px-6 py-4 sm:px-8 sm:py-6 lg:px-12 lg:py-8'
      default:
        return 'px-4 py-2 sm:px-6 sm:py-4'
    }
  }
  
  // Generate container classes
  const containerClasses = cn(
    'w-full',
    getSizeClasses(),
    getPaddingClasses(),
    {
      'mx-auto': centered,
    },
    className
  )
  
  // Generate accessibility attributes based on semantic element
  const getAccessibilityProps = () => {
    const baseProps = {
      'aria-label': ariaLabel || semanticMeaning,
      'data-semantic-type': 'ai-first-container',
      'data-ai-extensible': extensibleByAI,
      'data-testid': testId || 'ai-container',
    }
    
    // Add semantic-specific attributes
    switch (Component) {
      case 'main':
        return { ...baseProps, role: 'main' }
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
  
  return (
    <Component
      ref={ref as any}
      className={containerClasses}
      {...getAccessibilityProps()}
      {...props}
    >
      {children}
      
      {/* Hidden capabilities description */}
      {capabilities.length > 0 && (
        <span className="sr-only">
          Container capabilities: {capabilities.join(', ')}
        </span>
      )}
    </Component>
  )
})

Container.displayName = 'Container'

// Container variants for common use cases
export const MainContainer = forwardRef<HTMLElement, Omit<ContainerProps, 'as'>>((props, ref) => (
  <Container 
    ref={ref as any} 
    as="main" 
    semanticMeaning="Main content container"
    {...props} 
  />
))

export const SectionContainer = forwardRef<HTMLElement, Omit<ContainerProps, 'as'>>((props, ref) => (
  <Container 
    ref={ref as any} 
    as="section" 
    semanticMeaning="Section container"
    {...props} 
  />
))

export const ArticleContainer = forwardRef<HTMLElement, Omit<ContainerProps, 'as'>>((props, ref) => (
  <Container 
    ref={ref as any} 
    as="article" 
    semanticMeaning="Article container"
    {...props} 
  />
))

export const HeaderContainer = forwardRef<HTMLElement, Omit<ContainerProps, 'as'>>((props, ref) => (
  <Container 
    ref={ref as any} 
    as="header" 
    semanticMeaning="Header container"
    {...props} 
  />
))

export const FooterContainer = forwardRef<HTMLElement, Omit<ContainerProps, 'as'>>((props, ref) => (
  <Container 
    ref={ref as any} 
    as="footer" 
    semanticMeaning="Footer container"
    {...props} 
  />
))

export const NavContainer = forwardRef<HTMLElement, Omit<ContainerProps, 'as'>>((props, ref) => (
  <Container 
    ref={ref as any} 
    as="nav" 
    semanticMeaning="Navigation container"
    {...props} 
  />
))

MainContainer.displayName = 'MainContainer'
SectionContainer.displayName = 'SectionContainer'
ArticleContainer.displayName = 'ArticleContainer'
HeaderContainer.displayName = 'HeaderContainer'
FooterContainer.displayName = 'FooterContainer'
NavContainer.displayName = 'NavContainer'

export default Container

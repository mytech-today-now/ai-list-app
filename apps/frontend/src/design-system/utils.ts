/**
 * Design System Utilities - Helper functions for AI-First UI components
 * SemanticType: DesignSystemUtils
 * ExtensibleByAI: true
 * AIUseCases: ["Style composition", "Accessibility helpers", "Theme utilities"]
 */

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Combines class names with proper Tailwind CSS merging
 * Handles conflicts and ensures proper precedence
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Semantic variant types for components
 */
export type SemanticVariant = 
  | 'primary' 
  | 'secondary' 
  | 'success' 
  | 'warning' 
  | 'error' 
  | 'info' 
  | 'neutral'

export type ComponentSize = 'sm' | 'md' | 'lg'
export type ComponentState = 'default' | 'hover' | 'active' | 'disabled' | 'loading'

/**
 * Get semantic color classes for a variant
 */
export function getSemanticColors(variant: SemanticVariant, type: 'background' | 'text' | 'border' = 'background') {
  const colorMap = {
    primary: {
      background: 'bg-primary-500 hover:bg-primary-600 active:bg-primary-700',
      text: 'text-primary-500 hover:text-primary-600 active:text-primary-700',
      border: 'border-primary-500 hover:border-primary-600 active:border-primary-700',
    },
    secondary: {
      background: 'bg-neutral-500 hover:bg-neutral-600 active:bg-neutral-700',
      text: 'text-neutral-500 hover:text-neutral-600 active:text-neutral-700',
      border: 'border-neutral-500 hover:border-neutral-600 active:border-neutral-700',
    },
    success: {
      background: 'bg-success-500 hover:bg-success-600 active:bg-success-700',
      text: 'text-success-500 hover:text-success-600 active:text-success-700',
      border: 'border-success-500 hover:border-success-600 active:border-success-700',
    },
    warning: {
      background: 'bg-warning-500 hover:bg-warning-600 active:bg-warning-700',
      text: 'text-warning-500 hover:text-warning-600 active:text-warning-700',
      border: 'border-warning-500 hover:border-warning-600 active:border-warning-700',
    },
    error: {
      background: 'bg-error-500 hover:bg-error-600 active:bg-error-700',
      text: 'text-error-500 hover:text-error-600 active:text-error-700',
      border: 'border-error-500 hover:border-error-600 active:border-error-700',
    },
    info: {
      background: 'bg-info-500 hover:bg-info-600 active:bg-info-700',
      text: 'text-info-500 hover:text-info-600 active:text-info-700',
      border: 'border-info-500 hover:border-info-600 active:border-info-700',
    },
    neutral: {
      background: 'bg-neutral-100 hover:bg-neutral-200 active:bg-neutral-300',
      text: 'text-neutral-700 hover:text-neutral-800 active:text-neutral-900',
      border: 'border-neutral-300 hover:border-neutral-400 active:border-neutral-500',
    },
  }

  return colorMap[variant][type]
}

/**
 * Get size classes for components
 */
export function getSizeClasses(size: ComponentSize, component: 'button' | 'input' | 'text' = 'button') {
  const sizeMap = {
    button: {
      sm: 'h-8 px-3 text-sm',
      md: 'h-10 px-4 text-base',
      lg: 'h-12 px-6 text-lg',
    },
    input: {
      sm: 'h-8 px-3 text-sm',
      md: 'h-10 px-3 text-base',
      lg: 'h-12 px-4 text-lg',
    },
    text: {
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
    },
  }

  return sizeMap[component][size]
}

/**
 * Get focus ring classes for accessibility
 */
export function getFocusRing(variant: SemanticVariant = 'primary') {
  const focusMap = {
    primary: 'focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
    secondary: 'focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2',
    success: 'focus:ring-2 focus:ring-success-500 focus:ring-offset-2',
    warning: 'focus:ring-2 focus:ring-warning-500 focus:ring-offset-2',
    error: 'focus:ring-2 focus:ring-error-500 focus:ring-offset-2',
    info: 'focus:ring-2 focus:ring-info-500 focus:ring-offset-2',
    neutral: 'focus:ring-2 focus:ring-neutral-300 focus:ring-offset-2',
  }

  return `focus:outline-none ${focusMap[variant]}`
}

/**
 * Get transition classes for smooth animations
 */
export function getTransition(type: 'all' | 'colors' | 'transform' | 'opacity' = 'all') {
  const transitionMap = {
    all: 'transition-all duration-200 ease-in-out',
    colors: 'transition-colors duration-200 ease-in-out',
    transform: 'transition-transform duration-200 ease-in-out',
    opacity: 'transition-opacity duration-200 ease-in-out',
  }

  return transitionMap[type]
}

/**
 * Get disabled state classes
 */
export function getDisabledClasses() {
  return 'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none'
}

/**
 * Get loading state classes
 */
export function getLoadingClasses() {
  return 'relative overflow-hidden'
}

/**
 * Generate semantic class names for MCP components
 */
export function getMCPClasses(type?: 'command' | 'resource' | 'prompt' | 'event' | 'error') {
  if (!type) return ''

  const mcpMap = {
    command: 'mcp-command border-l-4 border-mcp-command bg-blue-50',
    resource: 'mcp-resource border-l-4 border-mcp-resource bg-green-50',
    prompt: 'mcp-prompt border-l-4 border-mcp-prompt bg-yellow-50',
    event: 'mcp-event border-l-4 border-mcp-event bg-purple-50',
    error: 'mcp-error border-l-4 border-mcp-error bg-red-50',
  }

  return mcpMap[type]
}

/**
 * Generate AI-specific semantic classes
 */
export function getAIClasses(type: 'surface' | 'accent' | 'highlight' = 'surface') {
  const aiMap = {
    surface: 'ai-surface bg-ai-surface border border-ai-border',
    accent: 'bg-ai-primary text-white',
    highlight: 'bg-ai-accent text-ai-primary',
  }

  return aiMap[type]
}

/**
 * Accessibility helper: Generate ARIA attributes
 */
export function getAriaAttributes(options: {
  label?: string
  describedBy?: string
  expanded?: boolean
  selected?: boolean
  disabled?: boolean
  required?: boolean
  invalid?: boolean
  live?: 'polite' | 'assertive' | 'off'
  atomic?: boolean
}) {
  const attrs: Record<string, string | boolean> = {}

  if (options.label) attrs['aria-label'] = options.label
  if (options.describedBy) attrs['aria-describedby'] = options.describedBy
  if (options.expanded !== undefined) attrs['aria-expanded'] = options.expanded
  if (options.selected !== undefined) attrs['aria-selected'] = options.selected
  if (options.disabled !== undefined) attrs['aria-disabled'] = options.disabled
  if (options.required !== undefined) attrs['aria-required'] = options.required
  if (options.invalid !== undefined) attrs['aria-invalid'] = options.invalid
  if (options.live) attrs['aria-live'] = options.live
  if (options.atomic !== undefined) attrs['aria-atomic'] = options.atomic

  return attrs
}

/**
 * Generate responsive classes
 */
export function getResponsiveClasses(
  base: string,
  sm?: string,
  md?: string,
  lg?: string,
  xl?: string
) {
  const classes = [base]
  
  if (sm) classes.push(`sm:${sm}`)
  if (md) classes.push(`md:${md}`)
  if (lg) classes.push(`lg:${lg}`)
  if (xl) classes.push(`xl:${xl}`)
  
  return classes.join(' ')
}

/**
 * Dark mode utility
 */
export function getDarkModeClasses(lightClasses: string, darkClasses: string) {
  return `${lightClasses} dark:${darkClasses}`
}

/**
 * Generate component variant classes
 */
export function getVariantClasses(
  variant: SemanticVariant,
  style: 'filled' | 'outlined' | 'ghost' | 'link' = 'filled'
) {
  const baseClasses = getTransition('colors')
  
  switch (style) {
    case 'filled':
      return cn(
        baseClasses,
        getSemanticColors(variant, 'background'),
        variant === 'neutral' ? 'text-neutral-700' : 'text-white',
        getFocusRing(variant)
      )
    
    case 'outlined':
      return cn(
        baseClasses,
        'bg-transparent border-2',
        getSemanticColors(variant, 'border'),
        getSemanticColors(variant, 'text'),
        'hover:bg-opacity-10',
        getFocusRing(variant)
      )
    
    case 'ghost':
      return cn(
        baseClasses,
        'bg-transparent border-transparent',
        getSemanticColors(variant, 'text'),
        'hover:bg-opacity-10',
        getFocusRing(variant)
      )
    
    case 'link':
      return cn(
        baseClasses,
        'bg-transparent border-none p-0 h-auto',
        getSemanticColors(variant, 'text'),
        'underline hover:no-underline',
        getFocusRing(variant)
      )
    
    default:
      return baseClasses
  }
}

/**
 * Type guard for semantic variants
 */
export function isSemanticVariant(value: string): value is SemanticVariant {
  return ['primary', 'secondary', 'success', 'warning', 'error', 'info', 'neutral'].includes(value)
}

/**
 * Type guard for component sizes
 */
export function isComponentSize(value: string): value is ComponentSize {
  return ['sm', 'md', 'lg'].includes(value)
}

/**
 * ARIA roles for accessibility
 */
export type AriaRole =
  | 'button'
  | 'link'
  | 'dialog'
  | 'alert'
  | 'status'
  | 'region'
  | 'navigation'
  | 'main'
  | 'complementary'
  | 'banner'
  | 'contentinfo'

/**
 * Design tokens interface
 */
export interface DesignTokens {
  colors: ColorTokens
  spacing: SpacingTokens
  typography: TypographyTokens
}

export interface ColorTokens {
  primary: Record<string, string>
  secondary: Record<string, string>
  success: Record<string, string>
  warning: Record<string, string>
  error: Record<string, string>
  info: Record<string, string>
  neutral: Record<string, string>
}

export interface SpacingTokens {
  xs: string
  sm: string
  md: string
  lg: string
  xl: string
}

export interface TypographyTokens {
  fontFamily: Record<string, string>
  fontSize: Record<string, string>
  fontWeight: Record<string, string>
  lineHeight: Record<string, string>
}

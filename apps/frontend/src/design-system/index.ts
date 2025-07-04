/**
 * Design System - AI-First UI Component Library
 * SemanticType: DesignSystemExport
 * ExtensibleByAI: true
 * AIUseCases: ["Component discovery", "Design consistency", "Accessibility standards"]
 */

// Design tokens
export * from './tokens'
import { designTokens } from './tokens'
export { designTokens as tokens, designTokens }

// Utilities
export * from './utils'
export {
  cn,
  getSemanticColors,
  getSizeClasses,
  getFocusRing,
  getTransition,
  getDisabledClasses,
  getLoadingClasses,
  getMCPClasses,
  getAIClasses,
  getAriaAttributes,
  getResponsiveClasses,
  getDarkModeClasses,
  getVariantClasses,
  isSemanticVariant,
  isComponentSize,
} from './utils'

// Accessibility
export * from './accessibility'
export {
  Keys,
  ContrastRatios,
  generateA11yId,
  useFocusTrap,
  useFocusRestore,
  useKeyboardNavigation,
  useScreenReaderAnnouncement,
  a11yValidation,
  a11yPatterns,
  mcpA11yPatterns,
} from './accessibility'

// Type exports
export type {
  SemanticVariant,
  ComponentSize,
  ComponentState,
  AriaRole,
  DesignTokens,
  ColorTokens,
  SpacingTokens,
  TypographyTokens,
} from './utils'

// Design system configuration
export const designSystemConfig = {
  version: '1.0.0',
  name: 'AI-First UI',
  description: 'Semantic design system for AI-driven applications',
  features: [
    'Semantic color system',
    'Accessibility-first design',
    'MCP integration patterns',
    'AI-extensible components',
    'Dark mode support',
    'Responsive design',
    'WCAG 2.1 AA compliance',
  ],
  principles: [
    'Semantic meaning over visual appearance',
    'Accessibility is not optional',
    'AI-first component architecture',
    'Consistent user experience',
    'Performance and usability',
  ],
} as const

// Component base props interface
export interface BaseComponentProps {
  /**
   * Additional CSS classes
   */
  className?: string
  
  /**
   * Semantic variant for styling
   */
  variant?: SemanticVariant
  
  /**
   * Component size
   */
  size?: ComponentSize
  
  /**
   * Whether the component is disabled
   */
  disabled?: boolean
  
  /**
   * Whether the component is in loading state
   */
  loading?: boolean
  
  /**
   * Accessibility label
   */
  'aria-label'?: string
  
  /**
   * Accessibility description
   */
  'aria-describedby'?: string
  
  /**
   * Test ID for testing
   */
  'data-testid'?: string
  
  /**
   * Semantic type for AI extensibility
   */
  'data-semantic-type'?: string
}

// MCP-aware component props
export interface MCPComponentProps extends BaseComponentProps {
  /**
   * MCP command type
   */
  mcpType?: 'command' | 'resource' | 'prompt' | 'event' | 'error'
  
  /**
   * MCP command handler
   */
  onMCPCommand?: (command: string, params?: Record<string, unknown>) => void
  
  /**
   * MCP resource URI
   */
  mcpResourceUri?: string
  
  /**
   * MCP event handler
   */
  onMCPEvent?: (event: string, data?: unknown) => void
}

// AI-extensible component props
export interface AIComponentProps extends BaseComponentProps {
  /**
   * AI context for component behavior
   */
  aiContext?: {
    role?: string
    capabilities?: string[]
    suggestions?: string[]
    metadata?: Record<string, unknown>
  }
  
  /**
   * AI interaction handler
   */
  onAIInteraction?: (interaction: {
    type: string
    data: unknown
    context?: Record<string, unknown>
  }) => void
  
  /**
   * Whether component should adapt to AI suggestions
   */
  aiAdaptive?: boolean
}

// Combined component props for full AI-First components
export interface AIFirstComponentProps extends MCPComponentProps, AIComponentProps {
  /**
   * Semantic meaning of the component for AI understanding
   */
  semanticMeaning?: string
  
  /**
   * Component capabilities exposed to AI
   */
  capabilities?: string[]
  
  /**
   * Whether component is AI-extensible
   */
  extensibleByAI?: boolean
}

// Theme configuration
export interface ThemeConfig {
  mode: 'light' | 'dark' | 'auto'
  primaryColor: string
  accentColor: string
  semanticColors: Record<SemanticVariant, string>
  customTokens?: Record<string, unknown>
}

// Design system context
export interface DesignSystemContext {
  theme: ThemeConfig
  tokens: typeof designTokens
  accessibility: {
    reducedMotion: boolean
    highContrast: boolean
    screenReader: boolean
  }
  mcp: {
    enabled: boolean
    commandPrefix: string
    resourcePrefix: string
  }
  ai: {
    enabled: boolean
    adaptiveUI: boolean
    suggestions: boolean
  }
}

// Validation schemas for design system
export const designSystemValidation = {
  variant: (value: string): value is SemanticVariant => 
    ['primary', 'secondary', 'success', 'warning', 'error', 'info', 'neutral'].includes(value),
  
  size: (value: string): value is ComponentSize => 
    ['sm', 'md', 'lg'].includes(value),
  
  mcpType: (value: string): value is 'command' | 'resource' | 'prompt' | 'event' | 'error' =>
    ['command', 'resource', 'prompt', 'event', 'error'].includes(value),
} as const

// Design system utilities for AI
export const aiDesignUtils = {
  /**
   * Generate semantic classes based on AI context
   */
  generateSemanticClasses: (context: AIComponentProps['aiContext']) => {
    if (!context) return ''
    
    const classes = []
    
    if (context.role) {
      classes.push(`ai-role-${context.role}`)
    }
    
    if (context.capabilities?.length) {
      classes.push(`ai-capabilities-${context.capabilities.length}`)
    }
    
    return classes.join(' ')
  },
  
  /**
   * Generate MCP-aware attributes
   */
  generateMCPAttributes: (props: MCPComponentProps) => {
    const attributes: Record<string, string> = {}
    
    if (props.mcpType) {
      attributes['data-mcp-type'] = props.mcpType
    }
    
    if (props.mcpResourceUri) {
      attributes['data-mcp-resource'] = props.mcpResourceUri
    }
    
    return attributes
  },
  
  /**
   * Generate accessibility attributes for AI components
   */
  generateAIAccessibilityAttributes: (props: AIFirstComponentProps) => {
    const attributes: Record<string, string | boolean> = {}
    
    if (props.semanticMeaning) {
      attributes['aria-label'] = props.semanticMeaning
    }
    
    if (props.capabilities?.length) {
      attributes['aria-describedby'] = `capabilities-${props.capabilities.join('-')}`
    }
    
    if (props.extensibleByAI) {
      attributes['data-ai-extensible'] = true
    }
    
    return attributes
  },
}

// Export design system version and metadata
export const DESIGN_SYSTEM_VERSION = '1.0.0'
export const DESIGN_SYSTEM_NAME = 'AI-First UI'

// Default export
export default {
  tokens: designTokens,
  config: designSystemConfig,
  version: DESIGN_SYSTEM_VERSION,
  name: DESIGN_SYSTEM_NAME,
}

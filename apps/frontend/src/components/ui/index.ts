/**
 * UI Components - AI-First Component Library Export
 * SemanticType: UIComponentsExport
 * ExtensibleByAI: true
 * AIUseCases: ["Component discovery", "UI composition", "Design system integration"]
 */

// Core UI Components
export { default as Button } from './Button'
export {
  Button,
  PrimaryButton,
  SecondaryButton,
  SuccessButton,
  WarningButton,
  ErrorButton,
  InfoButton,
  MCPCommandButton,
  type ButtonProps,
} from './Button'

export { default as Input } from './Input'
export {
  Input,
  type InputProps,
} from './Input'

export { default as Card } from './Card'
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  MCPResourceCard,
  MCPCommandCard,
  type CardProps,
} from './Card'

export { default as Modal } from './Modal'
export {
  Modal,
  ConfirmationModal,
  ErrorModal,
  InfoModal,
  MCPCommandModal,
  type ModalProps,
} from './Modal'

// Error Boundary (existing)
export { default as ErrorBoundary } from './ErrorBoundary'

// Re-export design system for convenience
export * from '../../design-system'

// Component metadata for AI discovery
export const componentMetadata = {
  Button: {
    name: 'Button',
    description: 'AI-First semantic button with MCP integration',
    semanticType: 'AIFirstButton',
    capabilities: ['click', 'focus', 'keyboard-navigation', 'mcp-command'],
    variants: ['primary', 'secondary', 'success', 'warning', 'error', 'info', 'neutral'],
    sizes: ['sm', 'md', 'lg'],
    styleTypes: ['filled', 'outlined', 'ghost', 'link'],
    aiExtensible: true,
    mcpIntegration: true,
    accessibility: {
      ariaSupport: true,
      keyboardNavigation: true,
      screenReaderSupport: true,
      focusManagement: true,
    },
  },
  
  Input: {
    name: 'Input',
    description: 'AI-First semantic input with validation and MCP integration',
    semanticType: 'AIFirstInput',
    capabilities: ['input', 'focus', 'keyboard-navigation', 'validation', 'ai-suggestions'],
    variants: ['primary', 'secondary', 'success', 'warning', 'error', 'info', 'neutral'],
    sizes: ['sm', 'md', 'lg'],
    states: ['default', 'success', 'warning', 'error'],
    aiExtensible: true,
    mcpIntegration: true,
    features: ['password-toggle', 'ai-suggestions', 'mcp-prompt-validation'],
    accessibility: {
      ariaSupport: true,
      keyboardNavigation: true,
      screenReaderSupport: true,
      labelAssociation: true,
      errorAnnouncement: true,
    },
  },
  
  Card: {
    name: 'Card',
    description: 'AI-First semantic card with MCP integration',
    semanticType: 'AIFirstCard',
    capabilities: ['display', 'focus', 'click', 'mcp-resource'],
    variants: ['primary', 'secondary', 'success', 'warning', 'error', 'info', 'neutral'],
    sizes: ['sm', 'md', 'lg'],
    elevations: ['none', 'sm', 'md', 'lg', 'xl'],
    aiExtensible: true,
    mcpIntegration: true,
    features: ['interactive', 'loading-states', 'header-footer'],
    accessibility: {
      ariaSupport: true,
      keyboardNavigation: true,
      screenReaderSupport: true,
      roleManagement: true,
    },
  },
  
  Modal: {
    name: 'Modal',
    description: 'AI-First semantic modal with focus management and MCP integration',
    semanticType: 'AIFirstModal',
    capabilities: ['dialog', 'focus-trap', 'keyboard-navigation', 'screen-reader'],
    variants: ['primary', 'secondary', 'success', 'warning', 'error', 'info', 'neutral'],
    sizes: ['sm', 'md', 'lg', 'xl', '2xl', '3xl', 'full'],
    aiExtensible: true,
    mcpIntegration: true,
    features: ['focus-trap', 'focus-restoration', 'overlay-click', 'escape-close', 'portal-rendering'],
    accessibility: {
      ariaSupport: true,
      keyboardNavigation: true,
      screenReaderSupport: true,
      focusManagement: true,
      announcements: true,
    },
  },
} as const

// Component categories for organization
export const componentCategories = {
  'Form Controls': ['Button', 'Input'],
  'Data Display': ['Card'],
  'Feedback': ['Modal', 'ErrorBoundary'],
  'Navigation': [],
  'Layout': [],
  'AI-Specific': ['MCPCommandButton', 'MCPResourceCard', 'MCPCommandModal'],
} as const

// Usage examples for AI assistance
export const usageExamples = {
  Button: {
    basic: `<Button variant="primary" size="md">Click me</Button>`,
    withIcon: `<Button leftIcon={<Icon />} variant="success">Save</Button>`,
    loading: `<Button loading variant="primary">Saving...</Button>`,
    mcpCommand: `<MCPCommandButton onMCPCommand={handleCommand}>Execute</MCPCommandButton>`,
  },
  
  Input: {
    basic: `<Input label="Email" type="email" placeholder="Enter email" />`,
    withValidation: `<Input label="Password" type="password" error="Password required" />`,
    withSuggestions: `<Input aiSuggestions={["suggestion1", "suggestion2"]} />`,
    mcpPrompt: `<Input mcpPromptEnabled mcpPromptValidator={validatePrompt} />`,
  },
  
  Card: {
    basic: `<Card><CardContent>Content here</CardContent></Card>`,
    interactive: `<Card interactive onCardClick={handleClick}>Clickable card</Card>`,
    withHeader: `<Card header={<CardTitle>Title</CardTitle>}>Content</Card>`,
    mcpResource: `<MCPResourceCard mcpResourceUri="/api/resource">Resource</MCPResourceCard>`,
  },
  
  Modal: {
    basic: `<Modal open={isOpen} onClose={handleClose} title="Modal Title">Content</Modal>`,
    confirmation: `<ConfirmationModal open={isOpen} onClose={handleClose}>Confirm action?</ConfirmationModal>`,
    mcpCommand: `<MCPCommandModal open={isOpen} onMCPCommand={handleCommand}>Command interface</MCPCommandModal>`,
  },
} as const

// Accessibility guidelines
export const accessibilityGuidelines = {
  general: [
    'All components support keyboard navigation',
    'Screen reader announcements are provided for state changes',
    'Focus management is handled automatically',
    'Color contrast meets WCAG 2.1 AA standards',
    'Semantic HTML and ARIA attributes are used appropriately',
  ],
  
  Button: [
    'Use semantic button element or role="button"',
    'Provide accessible names via aria-label or text content',
    'Handle Enter and Space key activation',
    'Announce loading states to screen readers',
  ],
  
  Input: [
    'Associate labels with form controls',
    'Provide error messages with aria-describedby',
    'Announce validation state changes',
    'Support password visibility toggle',
  ],
  
  Card: [
    'Use appropriate roles for interactive cards',
    'Provide accessible names for card content',
    'Handle keyboard activation for interactive cards',
    'Announce loading states',
  ],
  
  Modal: [
    'Implement focus trap within modal',
    'Restore focus when modal closes',
    'Support Escape key to close',
    'Announce modal open/close to screen readers',
    'Use aria-modal and role="dialog"',
  ],
} as const

// Performance considerations
export const performanceGuidelines = {
  general: [
    'Components use React.forwardRef for ref forwarding',
    'Memoization is used where appropriate',
    'Event handlers are optimized with useCallback',
    'CSS transitions are hardware-accelerated',
    'Bundle size is optimized with tree-shaking',
  ],
  
  recommendations: [
    'Use semantic variants instead of custom styling',
    'Leverage the design system tokens for consistency',
    'Implement proper loading states for async operations',
    'Use MCP integration for AI-driven interactions',
    'Follow accessibility best practices for inclusive design',
  ],
} as const

// Export component library metadata
export const componentLibraryInfo = {
  name: 'AI-First UI Components',
  version: '1.0.0',
  description: 'Semantic, accessible, and AI-extensible React component library',
  features: [
    'AI-First architecture with semantic meaning',
    'MCP (Model Context Protocol) integration',
    'Comprehensive accessibility support',
    'Semantic design system with tokens',
    'TypeScript support with full type safety',
    'Dark mode support',
    'Responsive design patterns',
    'Performance optimized',
  ],
  principles: [
    'Semantic meaning over visual appearance',
    'Accessibility is not optional',
    'AI-extensible by design',
    'Consistent user experience',
    'Developer experience focused',
  ],
} as const

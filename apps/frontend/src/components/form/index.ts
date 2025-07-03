/**
 * Form Components - AI-First Form Component Library Export
 * SemanticType: FormComponentsExport
 * ExtensibleByAI: true
 * AIUseCases: ["Form composition", "Data collection", "Validation", "User input", "MCP integration"]
 */

// Form Components
export { default as Form } from './Form'
export {
  Form,
  FormSection,
  FormField,
  type FormProps,
  type FormSectionProps,
  type FormFieldProps,
} from './Form'

export { default as Select } from './Select'
export {
  Select,
  type SelectProps,
  type SelectOption,
} from './Select'

export { default as Textarea } from './Textarea'
export {
  Textarea,
  type TextareaProps,
} from './Textarea'

// Re-export Input from UI components for convenience
export { Input, type InputProps } from '../ui/Input'

// Component metadata for AI discovery
export const formComponentMetadata = {
  Form: {
    name: 'Form',
    description: 'AI-First semantic form with validation and MCP integration',
    semanticType: 'AIFirstForm',
    capabilities: ['form-submission', 'validation', 'accessibility', 'mcp-integration'],
    features: ['real-time-validation', 'error-handling', 'screen-reader-support', 'mcp-commands'],
    aiExtensible: true,
    mcpIntegration: true,
    accessibility: {
      ariaSupport: true,
      screenReaderSupport: true,
      keyboardNavigation: true,
      validationAnnouncements: true,
      errorSummary: true,
    },
  },
  
  FormSection: {
    name: 'FormSection',
    description: 'Semantic form section with fieldset and legend',
    semanticType: 'FormSection',
    capabilities: ['grouping', 'semantic-structure', 'accessibility'],
    features: ['fieldset-legend', 'required-indication', 'description-support'],
    accessibility: {
      semanticHTML: true,
      fieldsetLegend: true,
      ariaSupport: true,
    },
  },
  
  FormField: {
    name: 'FormField',
    description: 'Form field wrapper with label, description, and error handling',
    semanticType: 'FormField',
    capabilities: ['labeling', 'error-handling', 'description', 'accessibility'],
    features: ['label-association', 'error-display', 'help-text', 'required-indication'],
    accessibility: {
      labelAssociation: true,
      ariaDescribedby: true,
      errorAnnouncement: true,
      requiredIndication: true,
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
    features: ['password-toggle', 'ai-suggestions', 'mcp-prompt-validation', 'icons'],
    accessibility: {
      ariaSupport: true,
      keyboardNavigation: true,
      screenReaderSupport: true,
      labelAssociation: true,
      errorAnnouncement: true,
    },
  },
  
  Select: {
    name: 'Select',
    description: 'AI-First semantic select with validation and MCP integration',
    semanticType: 'AIFirstSelect',
    capabilities: ['selection', 'keyboard-navigation', 'validation', 'accessibility'],
    variants: ['primary', 'secondary', 'success', 'warning', 'error', 'info', 'neutral'],
    sizes: ['sm', 'md', 'lg'],
    states: ['default', 'success', 'warning', 'error'],
    aiExtensible: true,
    mcpIntegration: true,
    features: ['option-grouping', 'multiple-selection', 'custom-dropdown', 'native-fallback'],
    accessibility: {
      ariaSupport: true,
      keyboardNavigation: true,
      screenReaderSupport: true,
      optionAnnouncement: true,
    },
  },
  
  Textarea: {
    name: 'Textarea',
    description: 'AI-First semantic textarea with validation and MCP integration',
    semanticType: 'AIFirstTextarea',
    capabilities: ['text-input', 'multi-line', 'auto-resize', 'validation', 'ai-suggestions'],
    variants: ['primary', 'secondary', 'success', 'warning', 'error', 'info', 'neutral'],
    sizes: ['sm', 'md', 'lg'],
    states: ['default', 'success', 'warning', 'error'],
    aiExtensible: true,
    mcpIntegration: true,
    features: ['auto-resize', 'character-count', 'ai-suggestions', 'mcp-prompt-validation'],
    accessibility: {
      ariaSupport: true,
      keyboardNavigation: true,
      screenReaderSupport: true,
      labelAssociation: true,
      errorAnnouncement: true,
    },
  },
} as const

// Form patterns for common use cases
export const formPatterns = {
  'Contact Form': {
    description: 'Basic contact form with name, email, and message',
    components: ['Form', 'FormSection', 'FormField', 'Input', 'Textarea'],
    example: `
      <Form onSubmit={handleSubmit}>
        <FormSection title="Contact Information">
          <FormField label="Name" required>
            <Input placeholder="Your full name" />
          </FormField>
          <FormField label="Email" required>
            <Input type="email" placeholder="your@email.com" />
          </FormField>
        </FormSection>
        
        <FormSection title="Message">
          <FormField label="Message" required>
            <Textarea 
              placeholder="Your message..."
              autoResize
              showCharacterCount
              maxLength={500}
            />
          </FormField>
        </FormSection>
      </Form>
    `,
  },
  
  'Registration Form': {
    description: 'User registration form with validation',
    components: ['Form', 'FormSection', 'FormField', 'Input', 'Select'],
    example: `
      <Form onSubmit={handleRegister} validate={validateRegistration}>
        <FormSection title="Account Details">
          <FormField label="Username" required>
            <Input placeholder="Choose a username" />
          </FormField>
          <FormField label="Email" required>
            <Input type="email" placeholder="your@email.com" />
          </FormField>
          <FormField label="Password" required>
            <Input type="password" showPasswordToggle />
          </FormField>
        </FormSection>
        
        <FormSection title="Personal Information">
          <FormField label="Country">
            <Select 
              placeholder="Select your country"
              options={countryOptions}
            />
          </FormField>
        </FormSection>
      </Form>
    `,
  },
  
  'Settings Form': {
    description: 'Application settings form with sections',
    components: ['Form', 'FormSection', 'FormField', 'Input', 'Select', 'Textarea'],
    example: `
      <Form onSubmit={handleSaveSettings}>
        <FormSection title="Profile Settings">
          <FormField label="Display Name">
            <Input defaultValue={user.displayName} />
          </FormField>
          <FormField label="Bio">
            <Textarea 
              defaultValue={user.bio}
              autoResize
              maxRows={6}
            />
          </FormField>
        </FormSection>
        
        <FormSection title="Preferences">
          <FormField label="Theme">
            <Select 
              options={themeOptions}
              defaultValue={user.theme}
            />
          </FormField>
        </FormSection>
      </Form>
    `,
  },
  
  'MCP Command Form': {
    description: 'Form for MCP command input with AI assistance',
    components: ['Form', 'FormField', 'Input', 'Textarea'],
    example: `
      <Form 
        mcpType="command"
        onSubmit={handleMCPCommand}
        onMCPCommand={handleMCPInteraction}
      >
        <FormField label="Command">
          <Input 
            mcpPromptEnabled
            mcpPromptValidator={validateMCPCommand}
            placeholder="Enter MCP command..."
          />
        </FormField>
        
        <FormField label="Parameters">
          <Textarea 
            mcpPromptEnabled
            aiSuggestions={mcpSuggestions}
            placeholder="Command parameters (JSON)..."
          />
        </FormField>
      </Form>
    `,
  },
} as const

// Usage examples for AI assistance
export const formUsageExamples = {
  Form: {
    basic: `<Form onSubmit={handleSubmit}>Form content</Form>`,
    withValidation: `<Form onSubmit={handleSubmit} validate={validateForm}>Form content</Form>`,
    mcpIntegrated: `<Form mcpType="command" onMCPCommand={handleMCP}>Form content</Form>`,
  },
  
  FormSection: {
    basic: `<FormSection title="Section Title">Section content</FormSection>`,
    withDescription: `<FormSection title="Title" description="Description">Content</FormSection>`,
    required: `<FormSection title="Required Section" required>Content</FormSection>`,
  },
  
  FormField: {
    basic: `<FormField label="Field Label"><Input /></FormField>`,
    withError: `<FormField label="Email" error="Invalid email"><Input type="email" /></FormField>`,
    withHelp: `<FormField label="Password" description="Must be 8+ characters"><Input type="password" /></FormField>`,
  },
  
  Input: {
    basic: `<Input placeholder="Enter text..." />`,
    withValidation: `<Input error="Required field" state="error" />`,
    withSuggestions: `<Input aiSuggestions={["suggestion1", "suggestion2"]} />`,
  },
  
  Select: {
    basic: `<Select options={options} placeholder="Choose option..." />`,
    multiple: `<Select options={options} multiple />`,
    withGroups: `<Select options={groupedOptions} />`,
  },
  
  Textarea: {
    basic: `<Textarea placeholder="Enter message..." />`,
    autoResize: `<Textarea autoResize minRows={3} maxRows={10} />`,
    withCount: `<Textarea showCharacterCount maxLength={500} />`,
  },
} as const

// Validation patterns and helpers
export const validationPatterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^\+?[\d\s\-\(\)]+$/,
  url: /^https?:\/\/.+/,
  strongPassword: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  
  // Common validation functions
  required: (value: unknown) => {
    if (typeof value === 'string') return value.trim().length > 0
    return value != null && value !== ''
  },
  
  minLength: (min: number) => (value: string) => value.length >= min,
  maxLength: (max: number) => (value: string) => value.length <= max,
  
  email: (value: string) => validationPatterns.email.test(value),
  url: (value: string) => validationPatterns.url.test(value),
  
  // MCP-specific validation
  mcpCommand: (value: string) => {
    // Basic MCP command format validation
    return /^[a-z_]+:[a-z_]+:[a-z_]+/.test(value)
  },
  
  mcpParameters: (value: string) => {
    try {
      JSON.parse(value)
      return true
    } catch {
      return false
    }
  },
} as const

// Accessibility guidelines for forms
export const formAccessibilityGuidelines = {
  general: [
    'Always associate labels with form controls',
    'Provide clear error messages and instructions',
    'Use fieldsets and legends for related form groups',
    'Ensure proper tab order and keyboard navigation',
    'Announce validation errors to screen readers',
    'Provide sufficient color contrast for all states',
  ],
  
  Form: [
    'Use semantic form element with proper attributes',
    'Implement client-side validation with server-side backup',
    'Provide clear submission feedback',
    'Handle errors gracefully with recovery options',
  ],
  
  FormField: [
    'Associate labels with form controls using for/id',
    'Use aria-describedby for help text and errors',
    'Indicate required fields clearly',
    'Group related fields with fieldsets',
  ],
  
  Input: [
    'Provide appropriate input types (email, tel, url, etc.)',
    'Use autocomplete attributes where appropriate',
    'Ensure sufficient touch target size (44px minimum)',
    'Provide clear placeholder text that doesn't replace labels',
  ],
  
  Select: [
    'Provide meaningful option labels',
    'Group related options with optgroups',
    'Ensure keyboard navigation works properly',
    'Announce selection changes to screen readers',
  ],
  
  Textarea: [
    'Provide clear instructions for expected content',
    'Use appropriate sizing for content type',
    'Implement character limits with clear feedback',
    'Support keyboard shortcuts for common actions',
  ],
} as const

// Export form library metadata
export const formLibraryInfo = {
  name: 'AI-First Form Components',
  version: '1.0.0',
  description: 'Semantic, accessible, and AI-extensible form components for data collection and user input',
  features: [
    'Comprehensive validation with real-time feedback',
    'AI-assisted input with suggestions and validation',
    'MCP integration for AI-driven form interactions',
    'Accessibility-first design with WCAG 2.1 AA compliance',
    'Semantic HTML structure with proper labeling',
    'TypeScript support with full type safety',
    'Responsive design with mobile-first approach',
    'Performance optimized with minimal re-renders',
  ],
  principles: [
    'Accessibility is built-in, not added on',
    'Clear and immediate feedback for user actions',
    'AI-enhanced user experience without complexity',
    'Semantic structure for better understanding',
    'Progressive enhancement with graceful degradation',
  ],
} as const

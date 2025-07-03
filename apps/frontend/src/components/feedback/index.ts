/**
 * Feedback Components - AI-First Feedback Component Library Export
 * SemanticType: FeedbackComponentsExport
 * ExtensibleByAI: true
 * AIUseCases: ["User feedback", "Status indication", "Progress tracking", "System notifications", "MCP feedback"]
 */

// Feedback Components
export { default as Toast } from './Toast'
export {
  Toast,
  SuccessToast,
  ErrorToast,
  WarningToast,
  InfoToast,
  toastManager,
  useToast,
  type ToastProps,
  type ToastOptions,
} from './Toast'

export { default as Alert } from './Alert'
export {
  Alert,
  SuccessAlert,
  ErrorAlert,
  WarningAlert,
  InfoAlert,
  MCPCommandAlert,
  MCPErrorAlert,
  type AlertProps,
} from './Alert'

export { default as Loading } from './Loading'
export {
  Loading,
  SpinnerLoading,
  DotsLoading,
  PulseLoading,
  SkeletonLoading,
  ProgressLoading,
  SavingLoading,
  UploadingLoading,
  ProcessingLoading,
  ThinkingLoading,
  MCPCommandLoading,
  type LoadingProps,
} from './Loading'

export { default as Progress } from './Progress'
export {
  Progress,
  LinearProgress,
  CircularProgress,
  SteppedProgress,
  MCPOperationProgress,
  type ProgressProps,
  type ProgressStep,
} from './Progress'

// Component metadata for AI discovery
export const feedbackComponentMetadata = {
  Toast: {
    name: 'Toast',
    description: 'AI-First semantic toast notifications with MCP integration',
    semanticType: 'AIFirstToast',
    capabilities: ['notification', 'auto-dismiss', 'screen-reader', 'accessibility'],
    variants: ['primary', 'secondary', 'success', 'warning', 'error', 'info', 'neutral'],
    positions: ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'],
    features: ['auto-dismiss', 'closable', 'actions', 'portal-rendering', 'screen-reader-announcements'],
    aiExtensible: true,
    mcpIntegration: true,
    accessibility: {
      ariaSupport: true,
      screenReaderSupport: true,
      announcements: true,
      keyboardNavigation: true,
    },
  },
  
  Alert: {
    name: 'Alert',
    description: 'AI-First semantic alert with MCP integration',
    semanticType: 'AIFirstAlert',
    capabilities: ['alert', 'dismissible', 'actions', 'accessibility'],
    variants: ['primary', 'secondary', 'success', 'warning', 'error', 'info', 'neutral'],
    sizes: ['sm', 'md', 'lg'],
    features: ['dismissible', 'custom-actions', 'icons', 'custom-content'],
    aiExtensible: true,
    mcpIntegration: true,
    accessibility: {
      ariaSupport: true,
      screenReaderSupport: true,
      announcements: true,
      roleManagement: true,
    },
  },
  
  Loading: {
    name: 'Loading',
    description: 'AI-First semantic loading indicators with MCP integration',
    semanticType: 'AIFirstLoading',
    capabilities: ['loading-indicator', 'progress', 'accessibility', 'screen-reader'],
    variants: ['spinner', 'dots', 'pulse', 'skeleton', 'progress'],
    sizes: ['xs', 'sm', 'md', 'lg', 'xl'],
    operations: ['loading', 'saving', 'uploading', 'downloading', 'processing', 'thinking'],
    features: ['overlay-mode', 'progress-indication', 'operation-types', 'custom-icons'],
    aiExtensible: true,
    mcpIntegration: true,
    accessibility: {
      ariaSupport: true,
      screenReaderSupport: true,
      progressAnnouncement: true,
      statusUpdates: true,
    },
  },
  
  Progress: {
    name: 'Progress',
    description: 'AI-First semantic progress indicators with MCP integration',
    semanticType: 'AIFirstProgress',
    capabilities: ['progress-indicator', 'accessibility', 'step-tracking'],
    variants: ['linear', 'circular', 'stepped'],
    sizes: ['xs', 'sm', 'md', 'lg', 'xl'],
    colors: ['primary', 'success', 'warning', 'error', 'info', 'neutral'],
    features: ['determinate-indeterminate', 'step-tracking', 'custom-formatting', 'value-display'],
    aiExtensible: true,
    mcpIntegration: true,
    accessibility: {
      ariaSupport: true,
      progressbarRole: true,
      valueAnnouncement: true,
      stepNavigation: true,
    },
  },
} as const

// Feedback patterns for common use cases
export const feedbackPatterns = {
  'Success Flow': {
    description: 'Complete success feedback flow with toast and alert',
    components: ['Toast', 'Alert'],
    example: `
      // Show immediate toast feedback
      toast.success('Operation completed successfully!')
      
      // Show persistent alert for important success
      <SuccessAlert
        title="Data Saved"
        message="Your changes have been saved successfully."
        dismissible={true}
        actions={
          <Button variant="success" size="sm">
            View Details
          </Button>
        }
      />
    `,
  },
  
  'Error Handling': {
    description: 'Comprehensive error feedback with recovery options',
    components: ['Toast', 'Alert'],
    example: `
      // Show error toast for immediate feedback
      toast.error('Failed to save changes')
      
      // Show detailed error alert with actions
      <ErrorAlert
        title="Save Failed"
        message="There was an error saving your changes. Please try again."
        dismissible={true}
        actions={
          <>
            <Button variant="error" size="sm">
              Retry
            </Button>
            <Button variant="secondary" size="sm">
              Cancel
            </Button>
          </>
        }
      />
    `,
  },
  
  'Loading States': {
    description: 'Progressive loading states with different indicators',
    components: ['Loading', 'Progress'],
    example: `
      // Initial loading
      <SpinnerLoading text="Loading..." />
      
      // Progress with steps
      <SteppedProgress
        steps={[
          { id: '1', label: 'Preparing', status: 'completed' },
          { id: '2', label: 'Processing', status: 'current' },
          { id: '3', label: 'Finalizing', status: 'pending' },
        ]}
      />
      
      // Overlay loading for blocking operations
      <ProcessingLoading overlay={true} />
    `,
  },
  
  'MCP Operation Feedback': {
    description: 'Feedback for MCP command execution and results',
    components: ['Toast', 'Alert', 'Loading', 'Progress'],
    example: `
      // MCP command execution
      <MCPCommandLoading text="Executing AI command..." />
      
      // MCP operation progress
      <MCPOperationProgress
        value={progress}
        label="AI Processing"
        description="Analyzing data and generating insights..."
      />
      
      // MCP result feedback
      <MCPCommandAlert
        title="Command Executed"
        message="AI analysis completed successfully."
        actions={
          <Button variant="primary" size="sm">
            View Results
          </Button>
        }
      />
    `,
  },
  
  'Multi-Step Process': {
    description: 'Feedback for complex multi-step operations',
    components: ['Progress', 'Toast', 'Alert'],
    example: `
      // Step progress indicator
      <SteppedProgress
        steps={wizardSteps}
        currentStep={currentStepIndex}
        onStepChange={handleStepChange}
      />
      
      // Step completion feedback
      {stepCompleted && (
        <SuccessToast
          message="Step completed successfully!"
          duration={3000}
        />
      )}
      
      // Final completion alert
      {allStepsCompleted && (
        <SuccessAlert
          title="Process Complete"
          message="All steps have been completed successfully."
        />
      )}
    `,
  },
} as const

// Usage examples for AI assistance
export const feedbackUsageExamples = {
  Toast: {
    basic: `toast.success('Operation successful!')`,
    withDescription: `toast.info('Processing', { description: 'This may take a few moments...' })`,
    withAction: `toast.warning('Warning', { action: <Button size="sm">Undo</Button> })`,
    programmatic: `const toastId = toast.show({ message: 'Custom toast', variant: 'info' })`,
  },
  
  Alert: {
    basic: `<Alert variant="info" message="Information message" />`,
    withTitle: `<InfoAlert title="Notice" message="Important information here" />`,
    dismissible: `<WarningAlert title="Warning" message="Please review" dismissible />`,
    withActions: `<ErrorAlert title="Error" actions={<Button>Retry</Button>} />`,
  },
  
  Loading: {
    spinner: `<SpinnerLoading text="Loading..." />`,
    overlay: `<ProcessingLoading overlay text="Processing..." />`,
    progress: `<ProgressLoading progress={75} text="Uploading..." />`,
    skeleton: `<SkeletonLoading />`,
  },
  
  Progress: {
    linear: `<LinearProgress value={50} showPercentage />`,
    circular: `<CircularProgress value={75} size="lg" />`,
    stepped: `<SteppedProgress steps={steps} currentStep={2} />`,
    indeterminate: `<Progress indeterminate text="Processing..." />`,
  },
} as const

// Feedback timing guidelines
export const feedbackTimingGuidelines = {
  toast: {
    success: '3-5 seconds',
    info: '5-7 seconds',
    warning: '7-10 seconds',
    error: 'Manual dismiss or 10+ seconds',
  },
  
  loading: {
    immediate: 'Show immediately for operations > 200ms',
    skeleton: 'Use for content loading < 2 seconds',
    spinner: 'Use for operations 2-10 seconds',
    progress: 'Use for operations > 10 seconds',
  },
  
  alerts: {
    temporary: 'Auto-dismiss after 10-30 seconds',
    important: 'Require manual dismissal',
    errors: 'Persist until resolved',
    success: 'Auto-dismiss after 5-10 seconds',
  },
} as const

// Accessibility guidelines for feedback components
export const feedbackAccessibilityGuidelines = {
  general: [
    'Provide clear and immediate feedback for user actions',
    'Use appropriate ARIA live regions for dynamic content',
    'Ensure feedback is perceivable by all users',
    'Provide alternative ways to access feedback information',
    'Use semantic colors with additional indicators',
  ],
  
  Toast: [
    'Use assertive live region for errors and warnings',
    'Use polite live region for success and info messages',
    'Provide keyboard navigation for interactive toasts',
    'Ensure sufficient contrast for all variants',
    'Allow users to disable auto-dismiss if needed',
  ],
  
  Alert: [
    'Use alert role for important messages',
    'Provide clear dismiss mechanisms',
    'Ensure actions are keyboard accessible',
    'Use appropriate heading levels for alert titles',
    'Group related alerts logically',
  ],
  
  Loading: [
    'Provide meaningful loading text',
    'Use progressbar role for determinate progress',
    'Announce progress changes to screen readers',
    'Provide estimated completion times when possible',
    'Allow users to cancel long-running operations',
  ],
  
  Progress: [
    'Use progressbar role with appropriate ARIA attributes',
    'Provide current value and range information',
    'Announce significant progress milestones',
    'Use clear labels for progress steps',
    'Ensure progress indicators are keyboard navigable',
  ],
} as const

// Performance guidelines for feedback components
export const feedbackPerformanceGuidelines = {
  general: [
    'Debounce rapid feedback updates',
    'Use CSS animations over JavaScript when possible',
    'Implement proper cleanup for timers and subscriptions',
    'Optimize re-renders with React.memo and useMemo',
    'Use portal rendering for overlays to avoid layout thrashing',
  ],
  
  Toast: [
    'Limit concurrent toasts to prevent performance issues',
    'Use efficient toast queue management',
    'Implement proper cleanup for auto-dismiss timers',
    'Optimize portal rendering performance',
  ],
  
  Loading: [
    'Use CSS animations for smooth loading indicators',
    'Implement efficient skeleton loading patterns',
    'Avoid excessive DOM updates during loading',
    'Use requestAnimationFrame for smooth progress updates',
  ],
  
  Progress: [
    'Throttle progress updates to reasonable intervals',
    'Use efficient SVG rendering for circular progress',
    'Implement smooth transitions between progress states',
    'Optimize step rendering for large step counts',
  ],
} as const

// Export feedback library metadata
export const feedbackLibraryInfo = {
  name: 'AI-First Feedback Components',
  version: '1.0.0',
  description: 'Comprehensive feedback and status indication components for AI-driven applications',
  features: [
    'Toast notifications with auto-dismiss and actions',
    'Alert messages with dismissible and action support',
    'Loading indicators with multiple variants and operations',
    'Progress tracking with linear, circular, and stepped variants',
    'MCP integration for AI operation feedback',
    'Accessibility-first design with WCAG 2.1 AA compliance',
    'Screen reader announcements and live regions',
    'TypeScript support with comprehensive types',
  ],
  principles: [
    'Immediate and clear feedback for all user actions',
    'Accessibility is built-in, not added on',
    'AI-extensible with semantic metadata',
    'Performance-optimized with smooth animations',
    'Consistent feedback patterns across the application',
  ],
} as const

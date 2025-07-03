/**
 * Button Component Stories
 * Comprehensive Storybook stories for the AI-First Button component
 */

import type { Meta, StoryObj } from '@storybook/react'
import { action } from '@storybook/addon-actions'
import { within, userEvent, expect } from '@storybook/test'
import { Save, Download, Plus, ArrowRight } from 'lucide-react'
import { Button } from '../ui/Button'

const meta: Meta<typeof Button> = {
  title: 'Core UI/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
# AI-First Button Component

A comprehensive button component with AI integration, accessibility features, and MCP support.

## Features

- **Semantic Variants**: Primary, secondary, success, warning, error, info, neutral
- **AI Integration**: MCP command support and semantic meaning
- **Accessibility**: WCAG 2.1 AA compliant with keyboard navigation
- **Performance**: Optimized with React.memo and efficient re-rendering
- **Customizable**: Icons, loading states, sizes, and variants

## Usage

\`\`\`tsx
import { Button } from '@your-org/ai-first-ui'

function MyComponent() {
  return (
    <Button 
      variant="primary" 
      size="lg"
      leftIcon={<SaveIcon />}
      mcpType="command"
      semanticMeaning="Save document action"
      onMCPCommand={handleMCPCommand}
    >
      Save Document
    </Button>
  )
}
\`\`\`
        `,
      },
    },
    a11y: {
      config: {
        rules: [
          {
            id: 'color-contrast',
            enabled: true,
          },
          {
            id: 'keyboard-navigation',
            enabled: true,
          },
        ],
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'success', 'warning', 'error', 'info', 'neutral'],
      description: 'Visual variant of the button',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: 'primary' },
      },
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Size of the button',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: 'md' },
      },
    },
    loading: {
      control: 'boolean',
      description: 'Whether the button is in loading state',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the button is disabled',
    },
    fullWidth: {
      control: 'boolean',
      description: 'Whether the button takes full width',
    },
    semanticMeaning: {
      control: 'text',
      description: 'Semantic meaning for AI understanding',
    },
    mcpType: {
      control: 'select',
      options: ['command', 'resource', 'tool'],
      description: 'MCP integration type',
    },
    onClick: {
      action: 'clicked',
      description: 'Click event handler',
    },
    onMCPCommand: {
      action: 'mcp-command',
      description: 'MCP command handler',
    },
  },
  args: {
    children: 'Button',
    onClick: action('clicked'),
    onMCPCommand: action('mcp-command'),
  },
}

export default meta
type Story = StoryObj<typeof meta>

// Basic Stories
export const Default: Story = {
  args: {
    children: 'Default Button',
  },
}

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Primary Button',
  },
}

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary Button',
  },
}

// Variant Stories
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="success">Success</Button>
      <Button variant="warning">Warning</Button>
      <Button variant="error">Error</Button>
      <Button variant="info">Info</Button>
      <Button variant="neutral">Neutral</Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'All available button variants showcasing different semantic meanings.',
      },
    },
  },
}

// Size Stories
export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Different button sizes for various use cases.',
      },
    },
  },
}

// Icon Stories
export const WithIcons: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Button leftIcon={<Save className="h-4 w-4" />}>Save</Button>
      <Button rightIcon={<ArrowRight className="h-4 w-4" />}>Next</Button>
      <Button 
        leftIcon={<Download className="h-4 w-4" />} 
        rightIcon={<ArrowRight className="h-4 w-4" />}
      >
        Download
      </Button>
      <Button variant="secondary" leftIcon={<Plus className="h-4 w-4" />}>
        Add Item
      </Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Buttons with left and right icons for enhanced visual communication.',
      },
    },
  },
}

// State Stories
export const States: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Button>Normal</Button>
      <Button loading>Loading</Button>
      <Button disabled>Disabled</Button>
      <Button variant="error" disabled>
        Disabled Error
      </Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Different button states including loading and disabled.',
      },
    },
  },
}

export const Loading: Story = {
  args: {
    loading: true,
    children: 'Loading Button',
  },
  parameters: {
    docs: {
      description: {
        story: 'Button in loading state with spinner and disabled interaction.',
      },
    },
  },
}

export const Disabled: Story = {
  args: {
    disabled: true,
    children: 'Disabled Button',
  },
  parameters: {
    docs: {
      description: {
        story: 'Disabled button that cannot be interacted with.',
      },
    },
  },
}

// Layout Stories
export const FullWidth: Story = {
  args: {
    fullWidth: true,
    children: 'Full Width Button',
  },
  parameters: {
    docs: {
      description: {
        story: 'Button that takes the full width of its container.',
      },
    },
  },
}

// AI Integration Stories
export const AIIntegrated: Story = {
  args: {
    variant: 'primary',
    children: 'AI-Powered Action',
    semanticMeaning: 'AI-powered document analysis',
    mcpType: 'command',
    leftIcon: <Save className="h-4 w-4" />,
  },
  parameters: {
    docs: {
      description: {
        story: 'Button with AI integration including semantic meaning and MCP support.',
      },
    },
  },
}

export const MCPCommand: Story = {
  args: {
    variant: 'info',
    children: 'Execute MCP Command',
    mcpType: 'command',
    semanticMeaning: 'Execute AI analysis command',
  },
  parameters: {
    docs: {
      description: {
        story: 'Button configured for MCP command execution with AI context.',
      },
    },
  },
}

// Interactive Stories with Tests
export const InteractiveTest: Story = {
  args: {
    variant: 'primary',
    children: 'Click Me',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const button = canvas.getByRole('button')
    
    // Test initial state
    await expect(button).toBeInTheDocument()
    await expect(button).not.toBeDisabled()
    
    // Test click interaction
    await userEvent.click(button)
    
    // Test keyboard interaction
    await userEvent.tab()
    await userEvent.keyboard('{Enter}')
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive test demonstrating button functionality and accessibility.',
      },
    },
  },
}

// Accessibility Stories
export const AccessibilityDemo: Story = {
  render: () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Keyboard Navigation</h3>
        <div className="flex gap-2">
          <Button>First</Button>
          <Button>Second</Button>
          <Button>Third</Button>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          Use Tab to navigate, Enter/Space to activate
        </p>
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-2">Screen Reader Support</h3>
        <Button 
          aria-label="Save document to cloud storage"
          aria-describedby="save-help"
        >
          Save
        </Button>
        <p id="save-help" className="text-sm text-gray-600 mt-1">
          This will save your document to cloud storage
        </p>
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-2">High Contrast</h3>
        <div className="flex gap-2">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="error">Error</Button>
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Accessibility features including keyboard navigation, screen reader support, and high contrast.',
      },
    },
  },
}

// Performance Stories
export const PerformanceTest: Story = {
  render: () => {
    const buttons = Array.from({ length: 100 }, (_, i) => (
      <Button key={i} size="sm" variant={i % 2 === 0 ? 'primary' : 'secondary'}>
        Button {i + 1}
      </Button>
    ))
    
    return (
      <div className="grid grid-cols-10 gap-2 max-h-96 overflow-auto">
        {buttons}
      </div>
    )
  },
  parameters: {
    docs: {
      description: {
        story: 'Performance test with 100 buttons to verify efficient rendering.',
      },
    },
  },
}

// Real-world Examples
export const RealWorldExamples: Story = {
  render: () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold mb-4">Form Actions</h3>
        <div className="flex gap-2">
          <Button variant="primary" type="submit">
            Save Changes
          </Button>
          <Button variant="secondary" type="button">
            Cancel
          </Button>
          <Button variant="error" type="button">
            Delete
          </Button>
        </div>
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-4">Navigation</h3>
        <div className="flex gap-2">
          <Button variant="primary" rightIcon={<ArrowRight className="h-4 w-4" />}>
            Continue
          </Button>
          <Button variant="secondary">
            Back
          </Button>
        </div>
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-4">Actions with Icons</h3>
        <div className="flex gap-2">
          <Button 
            variant="success" 
            leftIcon={<Save className="h-4 w-4" />}
            semanticMeaning="Save document action"
          >
            Save
          </Button>
          <Button 
            variant="info" 
            leftIcon={<Download className="h-4 w-4" />}
            semanticMeaning="Download file action"
          >
            Download
          </Button>
          <Button 
            variant="secondary" 
            leftIcon={<Plus className="h-4 w-4" />}
            semanticMeaning="Add new item action"
          >
            Add New
          </Button>
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Real-world usage examples showing common button patterns and combinations.',
      },
    },
  },
}

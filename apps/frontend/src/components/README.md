# AI-First UI Component Library

A comprehensive, accessible, and AI-extensible component library built for modern web applications with native MCP (Model Context Protocol) integration.

## 🌟 Features

- **AI-First Design**: Every component is designed with AI extensibility and semantic meaning
- **Accessibility Built-in**: WCAG 2.1 AA compliance out of the box
- **MCP Integration**: Native support for Model Context Protocol throughout
- **TypeScript First**: Comprehensive type definitions and IntelliSense support
- **Performance Optimized**: Tree-shakeable, minimal bundle size, efficient rendering
- **Semantic Components**: Components carry meaning that both humans and AI can understand

## 📦 Installation

```bash
npm install @your-org/ai-first-ui
# or
yarn add @your-org/ai-first-ui
# or
pnpm add @your-org/ai-first-ui
```

## 🚀 Quick Start

```tsx
import { Button, Card, VStack } from '@your-org/ai-first-ui'

function App() {
  return (
    <VStack spacing="lg">
      <Card variant="primary">
        <h2>Welcome to AI-First UI</h2>
        <p>Build intelligent interfaces with ease</p>
      </Card>
      
      <Button 
        variant="primary" 
        mcpType="command"
        semanticMeaning="Primary action button"
      >
        Get Started
      </Button>
    </VStack>
  )
}
```

## 🏗️ Architecture

### Component Categories

1. **Design System** - Foundational tokens, utilities, and patterns
2. **Core UI** - Essential interface components (Button, Input, Card, Modal)
3. **Layout** - Structural components (Container, Stack, Grid, Sidebar)
4. **Form** - Form controls and validation (Form, Select, Textarea, FormField)
5. **Data Display** - Data visualization (Table, List, Stats, DataGrid)
6. **Feedback** - User feedback (Toast, Alert, Loading, Progress)
7. **Navigation** - Navigation components (Menu, Breadcrumb, Tabs, Pagination)
8. **AI Patterns** - AI-specific patterns (CommandPalette, SmartSuggestions, AIContextMenu)

### AI-First Principles

Every component follows these principles:

- **Semantic Meaning**: Components have `semanticMeaning` props for AI understanding
- **MCP Integration**: Native support for Model Context Protocol commands
- **Extensible by AI**: Components can be enhanced and controlled by AI systems
- **Context Awareness**: Components understand their usage context
- **Accessibility First**: Screen reader and keyboard navigation support

## 🎨 Design System

### Design Tokens

```tsx
// Colors
const colors = {
  primary: { 50: '#eff6ff', 500: '#3b82f6', 900: '#1e3a8a' },
  success: { 50: '#f0fdf4', 500: '#22c55e', 900: '#14532d' },
  // ... more colors
}

// Spacing
const spacing = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
}
```

### Semantic Variants

All components support semantic variants that carry meaning:

- `primary` - Main actions and important content
- `secondary` - Supporting actions and content
- `success` - Positive outcomes and confirmations
- `warning` - Cautions and important notices
- `error` - Errors and destructive actions
- `info` - Informational content
- `neutral` - Default, neutral content

## 🤖 AI Integration

### MCP (Model Context Protocol) Support

Components natively support MCP for AI integration:

```tsx
<Button
  mcpType="command"
  onMCPCommand={async (command, data) => {
    const result = await mcpClient.execute(command, data)
    return result
  }}
  semanticMeaning="Save document action"
>
  Save Document
</Button>
```

### AI Context Awareness

Components can be made aware of AI context:

```tsx
<SmartSuggestions
  suggestions={aiSuggestions}
  context={userInput}
  onAIInteraction={(interaction) => {
    // Handle AI interaction
    console.log('AI interaction:', interaction)
  }}
  aiContext={{ userId: '123', sessionId: 'abc' }}
/>
```

### Semantic Annotations

All components support semantic meaning for AI understanding:

```tsx
<Card semanticMeaning="User profile card" extensibleByAI={true}>
  <h3>John Doe</h3>
  <p>Software Engineer</p>
</Card>
```

## ♿ Accessibility

### WCAG 2.1 AA Compliance

All components meet WCAG 2.1 AA standards:

- **Keyboard Navigation**: Full keyboard support
- **Screen Readers**: Optimized for assistive technologies
- **Color Contrast**: Minimum 4.5:1 contrast ratio
- **Focus Management**: Proper focus indicators and trapping
- **Semantic HTML**: Meaningful markup structure

### Accessibility Features

```tsx
// Automatic ARIA attributes
<Button aria-label="Save document" aria-describedby="save-help">
  Save
</Button>

// Screen reader announcements
<Toast variant="success" message="Document saved successfully" />

// Keyboard navigation
<Menu items={menuItems} onKeyDown={handleKeyNavigation} />
```

## 🎯 Component Examples

### Core UI Components

```tsx
// Button with AI integration
<Button
  variant="primary"
  size="lg"
  loading={isLoading}
  leftIcon={<SaveIcon />}
  mcpType="command"
  onMCPCommand={handleSave}
  semanticMeaning="Save document action"
>
  Save Document
</Button>

// Input with AI suggestions
<Input
  placeholder="Enter your message..."
  aiSuggestions={suggestions}
  mcpPromptEnabled={true}
  onAIInteraction={handleAIInteraction}
/>

// Card with semantic meaning
<Card
  variant="primary"
  interactive={true}
  semanticMeaning="Project overview card"
>
  <h3>Project Alpha</h3>
  <p>AI-powered analytics dashboard</p>
</Card>
```

### Data Display Components

```tsx
// Table with MCP integration
<Table
  data={userData}
  columns={userColumns}
  sortable={true}
  selectable={true}
  mcpType="resource"
  onMCPCommand={handleDataOperation}
/>

// Stats with trend analysis
<Stats
  stats={kpiData}
  variant="grid"
  columns={4}
  showTrend={true}
  interactive={true}
  onStatClick={handleStatClick}
/>

// DataGrid with AI features
<DataGrid
  data={analyticsData}
  columns={analyticsColumns}
  searchable={true}
  filterable={true}
  exportable={true}
  mcpType="resource"
/>
```

### AI-First Patterns

```tsx
// Command Palette for AI tools
<CommandPalette
  commands={aiCommands}
  placeholder="Search AI tools..."
  showCategories={true}
  mcpType="command"
  onCommandExecute={handleAICommand}
/>

// Smart Suggestions
<SmartSuggestions
  suggestions={aiSuggestions}
  variant="popup"
  showConfidence={true}
  onSuggestionSelect={handleSuggestion}
/>

// AI Context Menu
<AIContextMenu
  actions={contextActions}
  context={selectedContent}
  showAISuggestions={true}
  onActionExecute={handleContextAction}
/>
```

## 🧪 Testing

### Running Tests

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Accessibility tests
npm run test:a11y

# Visual regression tests
npm run test:visual
```

### Test Coverage

- **Unit Tests**: 95%+ coverage with Jest and React Testing Library
- **Integration Tests**: Cypress for user workflows
- **Accessibility Tests**: jest-axe for WCAG compliance
- **Visual Tests**: Percy/Chromatic for visual regression
- **Performance Tests**: Bundle size and render performance

### Writing Tests

```tsx
import { render, screen } from '@testing-library/react'
import { testUtils } from '@your-org/ai-first-ui/testing'
import { Button } from '@your-org/ai-first-ui'

test('Button meets accessibility standards', async () => {
  const { container } = render(<Button>Test</Button>)
  await testUtils.checkAccessibility(container)
})

test('Button supports MCP integration', async () => {
  const handleMCP = jest.fn()
  render(<Button mcpType="command" onMCPCommand={handleMCP}>Test</Button>)
  
  // Test MCP functionality
  await testUtils.testMCPIntegration(screen.getByRole('button'), 'command')
})
```

## 📊 Performance

### Bundle Size

- **Core**: 15KB gzipped
- **Full Library**: 45KB gzipped
- **Tree-shaken**: 8KB gzipped (typical usage)

### Performance Benchmarks

- **Initial Render**: < 16ms (60fps)
- **Re-render**: < 8ms (120fps)
- **Memory Usage**: < 2MB (typical app)

### Optimization Features

- Tree-shakeable exports
- React.memo optimization
- Efficient re-rendering
- Lazy loading support
- Bundle splitting

## 🔧 Configuration

### Theme Configuration

```tsx
import { ThemeProvider, createTheme } from '@your-org/ai-first-ui'

const customTheme = createTheme({
  colors: {
    primary: { 500: '#your-brand-color' },
  },
  spacing: {
    custom: '2.5rem',
  },
})

function App() {
  return (
    <ThemeProvider theme={customTheme}>
      <YourApp />
    </ThemeProvider>
  )
}
```

### MCP Configuration

```tsx
import { MCPProvider } from '@your-org/ai-first-ui'

const mcpConfig = {
  endpoint: 'your-mcp-endpoint',
  apiKey: 'your-api-key',
}

function App() {
  return (
    <MCPProvider config={mcpConfig}>
      <YourApp />
    </MCPProvider>
  )
}
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/your-org/ai-first-ui.git

# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build library
npm run build
```

### Code Standards

- **TypeScript**: All code must be TypeScript
- **Testing**: 95%+ test coverage required
- **Accessibility**: WCAG 2.1 AA compliance required
- **Documentation**: TSDoc comments for all public APIs
- **Performance**: Bundle size impact analysis

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🔗 Links

- [Documentation](https://ui.your-org.com)
- [Storybook](https://storybook.ui.your-org.com)
- [GitHub](https://github.com/your-org/ai-first-ui)
- [NPM](https://www.npmjs.com/package/@your-org/ai-first-ui)

## 🆘 Support

- [GitHub Issues](https://github.com/your-org/ai-first-ui/issues)
- [Discord Community](https://discord.gg/your-community)
- [Documentation](https://ui.your-org.com/docs)
- [Examples](https://ui.your-org.com/examples)

/**
 * Layout Components - AI-First Layout Component Library Export
 * SemanticType: LayoutComponentsExport
 * ExtensibleByAI: true
 * AIUseCases: ["Layout composition", "Responsive design", "Semantic structure", "Content organization"]
 */

// Layout Components
export { default as Container } from './Container'
export {
  Container,
  MainContainer,
  SectionContainer,
  ArticleContainer,
  HeaderContainer,
  FooterContainer,
  NavContainer,
  type ContainerProps,
} from './Container'

export { default as Stack } from './Stack'
export {
  Stack,
  HStack,
  VStack,
  ResponsiveStack,
  DividedStack,
  type StackProps,
} from './Stack'

export { default as Grid } from './Grid'
export {
  Grid,
  GridItem,
  ResponsiveGrid,
  AutoFitGrid,
  CardGrid,
  type GridProps,
  type GridItemProps,
} from './Grid'

export { default as Sidebar } from './Sidebar'
export {
  Sidebar,
  NavigationSidebar,
  ToolsSidebar,
  FilterSidebar,
  SidebarTrigger,
  type SidebarProps,
  type SidebarTriggerProps,
} from './Sidebar'

// Component metadata for AI discovery
export const layoutComponentMetadata = {
  Container: {
    name: 'Container',
    description: 'AI-First semantic container with responsive design',
    semanticType: 'AIFirstContainer',
    capabilities: ['layout', 'responsive', 'semantic-structure'],
    sizes: ['sm', 'md', 'lg', 'xl', '2xl', 'full'],
    padding: ['none', 'sm', 'md', 'lg', 'xl'],
    semanticElements: ['div', 'main', 'section', 'article', 'aside', 'header', 'footer', 'nav'],
    aiExtensible: true,
    features: ['responsive-padding', 'semantic-html', 'centered-layout'],
    accessibility: {
      semanticHTML: true,
      landmarkRoles: true,
      ariaSupport: true,
    },
  },
  
  Stack: {
    name: 'Stack',
    description: 'AI-First semantic stack layout with flexible spacing',
    semanticType: 'AIFirstStack',
    capabilities: ['layout', 'spacing', 'alignment', 'responsive'],
    directions: ['row', 'column', 'row-reverse', 'column-reverse'],
    spacing: ['none', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'],
    alignment: {
      justify: ['start', 'end', 'center', 'between', 'around', 'evenly'],
      align: ['start', 'end', 'center', 'baseline', 'stretch'],
    },
    aiExtensible: true,
    features: ['responsive-direction', 'item-dividers', 'wrap-support', 'semantic-html'],
    accessibility: {
      semanticHTML: true,
      listSupport: true,
      ariaSupport: true,
    },
  },
  
  Grid: {
    name: 'Grid',
    description: 'AI-First semantic grid layout with responsive design',
    semanticType: 'AIFirstGrid',
    capabilities: ['grid-layout', 'responsive', 'alignment', 'spacing'],
    columns: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 'auto', 'none'],
    rows: [1, 2, 3, 4, 5, 6, 'auto', 'none'],
    gap: ['none', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'],
    autoSizing: ['auto-fit', 'auto-fill'],
    aiExtensible: true,
    features: ['responsive-columns', 'auto-sizing', 'gap-control', 'alignment-options'],
    accessibility: {
      semanticHTML: true,
      gridStructure: true,
      ariaSupport: true,
    },
  },
  
  GridItem: {
    name: 'GridItem',
    description: 'AI-First grid item with positioning and spanning',
    semanticType: 'AIFirstGridItem',
    capabilities: ['grid-item', 'positioning', 'alignment'],
    spanning: {
      colSpan: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 'auto', 'full'],
      rowSpan: [1, 2, 3, 4, 5, 6, 'auto', 'full'],
    },
    positioning: {
      colStart: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 'auto'],
      colEnd: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 'auto'],
      rowStart: [1, 2, 3, 4, 5, 6, 7, 'auto'],
      rowEnd: [1, 2, 3, 4, 5, 6, 7, 'auto'],
    },
    aiExtensible: true,
    features: ['span-control', 'position-control', 'self-alignment'],
    accessibility: {
      gridItemStructure: true,
      ariaSupport: true,
    },
  },
  
  Sidebar: {
    name: 'Sidebar',
    description: 'AI-First semantic sidebar with responsive behavior',
    semanticType: 'AIFirstSidebar',
    capabilities: ['navigation', 'focus-trap', 'keyboard-navigation', 'responsive'],
    positions: ['left', 'right'],
    widths: ['sm', 'md', 'lg', 'xl', 'full'],
    behaviors: ['overlay', 'push', 'persistent'],
    aiExtensible: true,
    mcpIntegration: true,
    features: ['focus-trap', 'overlay-behavior', 'responsive-behavior', 'keyboard-navigation'],
    accessibility: {
      focusManagement: true,
      keyboardNavigation: true,
      screenReaderSupport: true,
      ariaSupport: true,
    },
  },
} as const

// Layout patterns for common use cases
export const layoutPatterns = {
  'App Layout': {
    description: 'Main application layout with header, sidebar, and content',
    components: ['Container', 'Sidebar', 'Stack'],
    example: `
      <Container as="main" size="full" padding="none">
        <Stack direction="row" spacing="none">
          <Sidebar open={sidebarOpen} onClose={closeSidebar}>
            Navigation content
          </Sidebar>
          <Stack direction="column" spacing="none" className="flex-1">
            <HeaderContainer>Header content</HeaderContainer>
            <MainContainer>Main content</MainContainer>
          </Stack>
        </Stack>
      </Container>
    `,
  },
  
  'Card Grid': {
    description: 'Responsive grid layout for displaying cards',
    components: ['Container', 'Grid', 'Card'],
    example: `
      <Container>
        <CardGrid gap="lg">
          {items.map(item => (
            <Card key={item.id}>{item.content}</Card>
          ))}
        </CardGrid>
      </Container>
    `,
  },
  
  'Form Layout': {
    description: 'Structured form layout with sections',
    components: ['Container', 'Stack', 'Grid'],
    example: `
      <Container size="md">
        <VStack spacing="xl">
          <SectionContainer>
            <Grid cols={2} gap="md">
              <Input label="First Name" />
              <Input label="Last Name" />
            </Grid>
          </SectionContainer>
          <SectionContainer>
            <VStack spacing="md">
              <Input label="Email" type="email" />
              <Input label="Message" as="textarea" />
            </VStack>
          </SectionContainer>
        </VStack>
      </Container>
    `,
  },
  
  'Dashboard Layout': {
    description: 'Dashboard layout with metrics and content areas',
    components: ['Container', 'Grid', 'Stack', 'Card'],
    example: `
      <Container size="full">
        <VStack spacing="lg">
          <Grid cols={4} gap="md">
            <Card>Metric 1</Card>
            <Card>Metric 2</Card>
            <Card>Metric 3</Card>
            <Card>Metric 4</Card>
          </Grid>
          <Grid cols={3} gap="lg">
            <GridItem colSpan={2}>
              <Card>Main content</Card>
            </GridItem>
            <Card>Sidebar content</Card>
          </Grid>
        </VStack>
      </Container>
    `,
  },
} as const

// Usage examples for AI assistance
export const layoutUsageExamples = {
  Container: {
    basic: `<Container>Content here</Container>`,
    semantic: `<MainContainer size="lg" padding="xl">Main content</MainContainer>`,
    responsive: `<Container size="xl" responsivePadding>Responsive content</Container>`,
  },
  
  Stack: {
    vertical: `<VStack spacing="md">Vertical items</VStack>`,
    horizontal: `<HStack spacing="lg" align="center">Horizontal items</HStack>`,
    responsive: `<ResponsiveStack mobileDirection="column" direction="row">Items</ResponsiveStack>`,
    divided: `<DividedStack spacing="md">Divided items</DividedStack>`,
  },
  
  Grid: {
    basic: `<Grid cols={3} gap="md">Grid items</Grid>`,
    responsive: `<ResponsiveGrid>Responsive grid items</ResponsiveGrid>`,
    autoFit: `<AutoFitGrid>Auto-fitting items</AutoFitGrid>`,
    cards: `<CardGrid>Card items</CardGrid>`,
  },
  
  Sidebar: {
    basic: `<Sidebar open={isOpen} onClose={handleClose}>Navigation</Sidebar>`,
    navigation: `<NavigationSidebar open={isOpen}>Nav items</NavigationSidebar>`,
    tools: `<ToolsSidebar open={isOpen}>Tool items</ToolsSidebar>`,
    withTrigger: `<SidebarTrigger onTrigger={toggleSidebar} sidebarOpen={isOpen} />`,
  },
} as const

// Responsive design guidelines
export const responsiveGuidelines = {
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
  
  recommendations: [
    'Use Container for consistent max-width and padding',
    'Leverage Stack for flexible spacing and alignment',
    'Use Grid for complex layouts with precise control',
    'Implement responsive behavior with breakpoint-specific props',
    'Consider mobile-first design approach',
    'Use semantic HTML elements for better accessibility',
    'Implement proper focus management for interactive layouts',
  ],
  
  patterns: [
    'Mobile: Stack vertically, Desktop: Grid horizontally',
    'Mobile: Full-width sidebar overlay, Desktop: Persistent sidebar',
    'Mobile: Single column, Desktop: Multi-column grid',
    'Mobile: Collapsed navigation, Desktop: Expanded navigation',
  ],
} as const

// Accessibility guidelines for layouts
export const layoutAccessibilityGuidelines = {
  general: [
    'Use semantic HTML elements for proper document structure',
    'Implement proper heading hierarchy',
    'Ensure keyboard navigation works across all layout components',
    'Provide skip links for main content areas',
    'Use ARIA landmarks for screen reader navigation',
  ],
  
  Container: [
    'Use appropriate semantic elements (main, section, article, etc.)',
    'Provide accessible names for landmark regions',
    'Ensure proper nesting of semantic elements',
  ],
  
  Stack: [
    'Use list elements (ul, ol) for related items',
    'Provide proper spacing for touch targets',
    'Ensure logical tab order for interactive items',
  ],
  
  Grid: [
    'Provide accessible names for grid regions',
    'Ensure grid items have proper relationships',
    'Use appropriate roles for data grids',
  ],
  
  Sidebar: [
    'Implement focus trap for overlay sidebars',
    'Provide keyboard shortcuts for opening/closing',
    'Announce sidebar state changes to screen readers',
    'Ensure proper focus restoration when closing',
  ],
} as const

// Export layout library metadata
export const layoutLibraryInfo = {
  name: 'AI-First Layout Components',
  version: '1.0.0',
  description: 'Semantic, responsive, and accessible layout components for AI-driven applications',
  features: [
    'Semantic HTML structure with proper landmarks',
    'Responsive design with mobile-first approach',
    'Flexible spacing and alignment systems',
    'Accessibility-first design with focus management',
    'AI-extensible with semantic metadata',
    'MCP integration for AI interactions',
    'TypeScript support with full type safety',
    'Performance optimized with minimal re-renders',
  ],
  principles: [
    'Semantic structure over visual appearance',
    'Mobile-first responsive design',
    'Accessibility is built-in, not added on',
    'Flexible and composable layout system',
    'AI-friendly with semantic meaning',
  ],
} as const

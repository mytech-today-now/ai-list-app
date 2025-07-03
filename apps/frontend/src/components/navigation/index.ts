/**
 * Navigation Components - AI-First Navigation Component Library Export
 * SemanticType: NavigationComponentsExport
 * ExtensibleByAI: true
 * AIUseCases: ["User navigation", "Content organization", "Wayfinding", "MCP interface navigation"]
 */

// Navigation Components
export { default as Menu } from './Menu'
export {
  Menu,
  ContextMenu,
  DropdownMenu,
  MCPCommandMenu,
  type MenuProps,
  type MenuItem,
} from './Menu'

export { default as Breadcrumb } from './Breadcrumb'
export {
  Breadcrumb,
  SimpleBreadcrumb,
  InteractiveBreadcrumb,
  MCPPathBreadcrumb,
  type BreadcrumbProps,
  type BreadcrumbItem,
} from './Breadcrumb'

export { default as Tabs } from './Tabs'
export {
  Tabs,
  PillTabs,
  UnderlineTabs,
  CardTabs,
  VerticalTabs,
  MCPToolTabs,
  type TabsProps,
  type TabItem,
} from './Tabs'

export { default as Pagination } from './Pagination'
export {
  Pagination,
  SimplePagination,
  DetailedPagination,
  MCPResultPagination,
  type PaginationProps,
} from './Pagination'

// Component metadata for AI discovery
export const navigationComponentMetadata = {
  Menu: {
    name: 'Menu',
    description: 'AI-First semantic menu with keyboard navigation and MCP integration',
    semanticType: 'AIFirstMenu',
    capabilities: ['navigation', 'keyboard-navigation', 'focus-management', 'accessibility'],
    itemTypes: ['item', 'checkbox', 'radio', 'separator', 'submenu'],
    placements: ['bottom-start', 'bottom-end', 'top-start', 'top-end', 'right-start', 'left-start'],
    features: ['submenu-support', 'keyboard-navigation', 'focus-trap', 'portal-rendering'],
    aiExtensible: true,
    mcpIntegration: true,
    accessibility: {
      ariaSupport: true,
      keyboardNavigation: true,
      focusManagement: true,
      screenReaderSupport: true,
      menuRole: true,
    },
  },
  
  Breadcrumb: {
    name: 'Breadcrumb',
    description: 'AI-First semantic breadcrumb navigation with MCP integration',
    semanticType: 'AIFirstBreadcrumb',
    capabilities: ['navigation', 'hierarchy', 'accessibility', 'keyboard-navigation'],
    features: ['collapsible-paths', 'interactive-items', 'custom-separators', 'home-icon'],
    aiExtensible: true,
    mcpIntegration: true,
    accessibility: {
      ariaSupport: true,
      navigationRole: true,
      listStructure: true,
      currentPageIndication: true,
    },
  },
  
  Tabs: {
    name: 'Tabs',
    description: 'AI-First semantic tabs with keyboard navigation and MCP integration',
    semanticType: 'AIFirstTabs',
    capabilities: ['navigation', 'keyboard-navigation', 'content-switching', 'accessibility'],
    variants: ['default', 'pills', 'underline', 'cards'],
    orientations: ['horizontal', 'vertical'],
    sizes: ['sm', 'md', 'lg'],
    features: ['closable-tabs', 'scrollable-tabs', 'reorderable-tabs', 'badges-icons'],
    aiExtensible: true,
    mcpIntegration: true,
    accessibility: {
      ariaSupport: true,
      keyboardNavigation: true,
      tablistRole: true,
      tabpanelRole: true,
      orientationSupport: true,
    },
  },
  
  Pagination: {
    name: 'Pagination',
    description: 'AI-First semantic pagination with keyboard navigation and MCP integration',
    semanticType: 'AIFirstPagination',
    capabilities: ['navigation', 'keyboard-navigation', 'page-switching', 'accessibility'],
    sizes: ['sm', 'md', 'lg'],
    features: ['smart-ellipsis', 'page-info', 'first-last-buttons', 'custom-formatting'],
    aiExtensible: true,
    mcpIntegration: true,
    accessibility: {
      ariaSupport: true,
      navigationRole: true,
      currentPageIndication: true,
      pageLabeling: true,
    },
  },
} as const

// Navigation patterns for common use cases
export const navigationPatterns = {
  'Application Navigation': {
    description: 'Complete application navigation with menu, breadcrumbs, and tabs',
    components: ['Menu', 'Breadcrumb', 'Tabs'],
    example: `
      <div className="space-y-4">
        {/* Main navigation menu */}
        <DropdownMenu
          trigger={<Button>Menu</Button>}
          items={navigationItems}
          onItemClick={handleNavigation}
        />
        
        {/* Breadcrumb navigation */}
        <InteractiveBreadcrumb
          items={breadcrumbItems}
          onItemClick={handleBreadcrumbClick}
        />
        
        {/* Content tabs */}
        <UnderlineTabs
          items={tabItems}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
      </div>
    `,
  },
  
  'Data Navigation': {
    description: 'Navigation for data-heavy interfaces with pagination and filtering',
    components: ['Tabs', 'Pagination', 'Menu'],
    example: `
      <div className="space-y-6">
        {/* Data view tabs */}
        <PillTabs
          items={viewTabs}
          activeTab={currentView}
          onTabChange={handleViewChange}
        />
        
        {/* Filter menu */}
        <ContextMenu
          items={filterItems}
          onItemClick={handleFilterChange}
        />
        
        {/* Pagination */}
        <DetailedPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={handlePageChange}
        />
      </div>
    `,
  },
  
  'MCP Interface Navigation': {
    description: 'Navigation for MCP-driven AI interfaces',
    components: ['MCPCommandMenu', 'MCPPathBreadcrumb', 'MCPToolTabs'],
    example: `
      <div className="space-y-4">
        {/* MCP command menu */}
        <MCPCommandMenu
          items={mcpCommands}
          onItemClick={handleMCPCommand}
        />
        
        {/* MCP resource path */}
        <MCPPathBreadcrumb
          items={mcpPath}
          onItemClick={handlePathNavigation}
        />
        
        {/* MCP tool tabs */}
        <MCPToolTabs
          items={mcpTools}
          activeTab={activeTool}
          onTabChange={handleToolChange}
        />
      </div>
    `,
  },
  
  'Content Organization': {
    description: 'Navigation for organizing and browsing content',
    components: ['Tabs', 'Breadcrumb', 'Pagination'],
    example: `
      <div className="space-y-4">
        {/* Category tabs */}
        <CardTabs
          items={categoryTabs}
          activeTab={activeCategory}
          onTabChange={handleCategoryChange}
        />
        
        {/* Content breadcrumb */}
        <SimpleBreadcrumb
          items={contentPath}
          showHomeIcon={true}
        />
        
        {/* Content pagination */}
        <SimplePagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      </div>
    `,
  },
} as const

// Usage examples for AI assistance
export const navigationUsageExamples = {
  Menu: {
    basic: `<Menu items={menuItems} onItemClick={handleClick} />`,
    dropdown: `<DropdownMenu trigger={<Button>Options</Button>} items={items} />`,
    context: `<ContextMenu items={contextItems} open={showContext} />`,
    submenu: `<Menu items={[{ id: '1', label: 'Item', submenu: subItems }]} />`,
  },
  
  Breadcrumb: {
    basic: `<Breadcrumb items={breadcrumbItems} />`,
    interactive: `<InteractiveBreadcrumb items={items} onItemClick={handleClick} />`,
    collapsible: `<Breadcrumb items={longPath} maxItems={3} />`,
    withIcons: `<Breadcrumb items={items} showHomeIcon={true} />`,
  },
  
  Tabs: {
    basic: `<Tabs items={tabItems} activeTab={activeTab} onTabChange={handleChange} />`,
    pills: `<PillTabs items={items} />`,
    vertical: `<VerticalTabs items={items} orientation="vertical" />`,
    closable: `<Tabs items={[{ id: '1', label: 'Tab', closable: true }]} />`,
  },
  
  Pagination: {
    basic: `<Pagination currentPage={1} totalPages={10} onPageChange={handleChange} />`,
    detailed: `<DetailedPagination currentPage={1} totalPages={10} totalItems={100} />`,
    simple: `<SimplePagination currentPage={1} totalPages={5} />`,
    withInfo: `<Pagination currentPage={1} totalPages={10} showPageInfo={true} />`,
  },
} as const

// Navigation accessibility guidelines
export const navigationAccessibilityGuidelines = {
  general: [
    'Provide clear and consistent navigation patterns',
    'Use semantic HTML elements for navigation structure',
    'Implement proper keyboard navigation for all components',
    'Provide skip links for main navigation areas',
    'Use ARIA landmarks and roles appropriately',
  ],
  
  Menu: [
    'Use menu and menuitem roles for menu components',
    'Implement arrow key navigation between menu items',
    'Provide escape key functionality to close menus',
    'Use aria-expanded for menu triggers',
    'Announce submenu availability to screen readers',
  ],
  
  Breadcrumb: [
    'Use navigation role for breadcrumb containers',
    'Provide aria-current="page" for current location',
    'Use list structure for breadcrumb items',
    'Ensure breadcrumb links are keyboard accessible',
    'Provide meaningful link text for each breadcrumb',
  ],
  
  Tabs: [
    'Use tablist, tab, and tabpanel roles',
    'Implement arrow key navigation between tabs',
    'Use aria-selected for active tabs',
    'Associate tabs with their panels using aria-controls',
    'Support both horizontal and vertical orientations',
  ],
  
  Pagination: [
    'Use navigation role for pagination containers',
    'Provide aria-current="page" for current page',
    'Use meaningful labels for pagination buttons',
    'Ensure keyboard navigation works for all controls',
    'Announce page changes to screen readers',
  ],
} as const

// Performance guidelines for navigation components
export const navigationPerformanceGuidelines = {
  general: [
    'Use React.memo for navigation components that rarely change',
    'Implement proper key props for dynamic navigation items',
    'Debounce rapid navigation changes',
    'Use efficient event handling patterns',
    'Optimize re-renders with useMemo and useCallback',
  ],
  
  Menu: [
    'Use portal rendering for dropdown menus to avoid layout issues',
    'Implement lazy loading for large menu structures',
    'Optimize submenu rendering with conditional rendering',
    'Use efficient focus management techniques',
  ],
  
  Tabs: [
    'Implement lazy loading for tab content',
    'Use conditional rendering for inactive tab panels',
    'Optimize tab switching with proper state management',
    'Minimize re-renders during tab changes',
  ],
  
  Pagination: [
    'Optimize page number calculation with useMemo',
    'Use efficient algorithms for ellipsis calculation',
    'Debounce rapid page changes',
    'Implement proper loading states for page transitions',
  ],
} as const

// Export navigation library metadata
export const navigationLibraryInfo = {
  name: 'AI-First Navigation Components',
  version: '1.0.0',
  description: 'Comprehensive navigation components for AI-driven applications with semantic meaning and accessibility',
  features: [
    'Menu system with submenu support and keyboard navigation',
    'Breadcrumb navigation with collapsible paths',
    'Tab interface with multiple variants and orientations',
    'Pagination with smart ellipsis and page info',
    'MCP integration for AI-driven navigation',
    'Accessibility-first design with WCAG 2.1 AA compliance',
    'Keyboard navigation support for all components',
    'TypeScript support with comprehensive types',
  ],
  principles: [
    'Semantic navigation structure for better understanding',
    'Accessibility is built-in, not added on',
    'AI-extensible with semantic metadata',
    'Consistent navigation patterns across components',
    'Performance-optimized with efficient rendering',
  ],
} as const

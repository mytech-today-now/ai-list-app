/**
 * Data Components - AI-First Data Display Component Library Export
 * SemanticType: DataComponentsExport
 * ExtensibleByAI: true
 * AIUseCases: ["Data visualization", "Analytics", "Metrics display", "Data manipulation", "MCP data operations"]
 */

// Data Display Components
export { default as Table } from './Table'
export {
  Table,
  type TableProps,
  type TableColumn,
} from './Table'

export { default as List } from './List'
export {
  List,
  CompactList,
  ComfortableList,
  SpaciousList,
  SelectableList,
  type ListProps,
  type ListItem,
} from './List'

export { default as Stats } from './Stats'
export {
  Stats,
  GridStats,
  HorizontalStats,
  VerticalStats,
  InteractiveStats,
  type StatsProps,
  type StatItem,
} from './Stats'

export { default as DataGrid } from './DataGrid'
export {
  DataGrid,
  SearchableDataGrid,
  FilterableDataGrid,
  ExportableDataGrid,
  FullFeaturedDataGrid,
  type DataGridProps,
  type DataGridColumn,
} from './DataGrid'

// Component metadata for AI discovery
export const dataComponentMetadata = {
  Table: {
    name: 'Table',
    description: 'AI-First semantic table with sorting, filtering, and MCP integration',
    semanticType: 'AIFirstTable',
    capabilities: ['data-display', 'sorting', 'filtering', 'selection', 'keyboard-navigation'],
    features: ['row-selection', 'column-sorting', 'pagination', 'loading-states', 'empty-states'],
    aiExtensible: true,
    mcpIntegration: true,
    accessibility: {
      ariaSupport: true,
      keyboardNavigation: true,
      screenReaderSupport: true,
      tableStructure: true,
      sortingAnnouncement: true,
    },
  },
  
  List: {
    name: 'List',
    description: 'AI-First semantic list with virtualization and MCP integration',
    semanticType: 'AIFirstList',
    capabilities: ['data-display', 'selection', 'keyboard-navigation', 'virtualization'],
    variants: ['default', 'compact', 'comfortable', 'spacious'],
    features: ['item-selection', 'custom-rendering', 'virtualization', 'loading-states', 'actions'],
    aiExtensible: true,
    mcpIntegration: true,
    accessibility: {
      ariaSupport: true,
      keyboardNavigation: true,
      screenReaderSupport: true,
      listStructure: true,
      selectionAnnouncement: true,
    },
  },
  
  Stats: {
    name: 'Stats',
    description: 'AI-First semantic statistics display with MCP integration',
    semanticType: 'AIFirstStats',
    capabilities: ['metrics-display', 'trend-analysis', 'data-visualization'],
    variants: ['grid', 'horizontal', 'vertical'],
    layouts: [1, 2, 3, 4, 5, 6],
    formats: ['number', 'currency', 'percentage', 'duration'],
    features: ['trend-indicators', 'change-calculation', 'value-formatting', 'interactive-stats'],
    aiExtensible: true,
    mcpIntegration: true,
    accessibility: {
      ariaSupport: true,
      screenReaderSupport: true,
      valueAnnouncement: true,
      trendDescription: true,
    },
  },
  
  DataGrid: {
    name: 'DataGrid',
    description: 'AI-First enhanced data grid with advanced features',
    semanticType: 'AIFirstDataGrid',
    capabilities: ['data-grid', 'search', 'filter', 'export', 'configuration'],
    features: ['search-bar', 'column-filters', 'data-export', 'column-configuration', 'toolbar'],
    exportFormats: ['csv', 'xlsx', 'json'],
    aiExtensible: true,
    mcpIntegration: true,
    accessibility: {
      ariaSupport: true,
      keyboardNavigation: true,
      screenReaderSupport: true,
      searchAnnouncement: true,
      filterAnnouncement: true,
    },
  },
} as const

// Data visualization patterns
export const dataVisualizationPatterns = {
  'Analytics Dashboard': {
    description: 'Comprehensive analytics dashboard with metrics and data tables',
    components: ['Stats', 'DataGrid', 'Table'],
    example: `
      <div className="space-y-6">
        <GridStats 
          stats={kpiStats}
          columns={4}
          showTrend={true}
          interactive={true}
        />
        
        <FullFeaturedDataGrid
          data={analyticsData}
          columns={analyticsColumns}
          searchable={true}
          exportable={true}
        />
      </div>
    `,
  },
  
  'Data Management Interface': {
    description: 'Interface for managing and manipulating data with advanced features',
    components: ['DataGrid', 'Table', 'List'],
    example: `
      <DataGrid
        data={userData}
        columns={userColumns}
        selectable={true}
        multiSelect={true}
        searchable={true}
        filterable={true}
        exportable={true}
        onSelectionChange={handleSelection}
        onExport={handleExport}
      />
    `,
  },
  
  'Metrics Overview': {
    description: 'Overview of key metrics and performance indicators',
    components: ['Stats', 'List'],
    example: `
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <GridStats 
            stats={performanceMetrics}
            columns={3}
            showTrend={true}
            showChange={true}
          />
        </div>
        
        <div>
          <List
            items={recentActivities}
            variant="compact"
            showActions={true}
          />
        </div>
      </div>
    `,
  },
  
  'Data Explorer': {
    description: 'Interactive data exploration interface with search and filtering',
    components: ['DataGrid', 'Stats', 'List'],
    example: `
      <div className="space-y-4">
        <HorizontalStats 
          stats={summaryStats}
          showTrend={false}
        />
        
        <SearchableDataGrid
          data={explorationData}
          columns={explorationColumns}
          searchable={true}
          filterable={true}
          configurable={true}
        />
      </div>
    `,
  },
} as const

// Usage examples for AI assistance
export const dataUsageExamples = {
  Table: {
    basic: `<Table data={data} columns={columns} />`,
    sortable: `<Table data={data} columns={columns} sortable onSortChange={handleSort} />`,
    selectable: `<Table data={data} columns={columns} selectable multiSelect onSelectionChange={handleSelection} />`,
    paginated: `<Table data={data} columns={columns} paginated pageSize={10} onPageChange={handlePageChange} />`,
  },
  
  List: {
    basic: `<List items={items} />`,
    selectable: `<SelectableList items={items} multiSelect onSelectionChange={handleSelection} />`,
    compact: `<CompactList items={items} showActions={true} />`,
    virtualized: `<List items={largeDataset} virtualized itemHeight={64} containerHeight={400} />`,
  },
  
  Stats: {
    grid: `<GridStats stats={metrics} columns={3} showTrend={true} />`,
    horizontal: `<HorizontalStats stats={kpis} showChange={true} />`,
    interactive: `<InteractiveStats stats={metrics} onStatClick={handleStatClick} />`,
  },
  
  DataGrid: {
    basic: `<DataGrid data={data} columns={columns} />`,
    searchable: `<SearchableDataGrid data={data} columns={columns} onSearch={handleSearch} />`,
    fullFeatured: `<FullFeaturedDataGrid data={data} columns={columns} onExport={handleExport} />`,
  },
} as const

// Data formatting utilities
export const dataFormatters = {
  currency: (value: number, currency = 'USD') => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value),
  
  percentage: (value: number, precision = 1) => 
    `${value.toFixed(precision)}%`,
  
  number: (value: number, precision = 0) => 
    value.toLocaleString('en-US', { minimumFractionDigits: precision, maximumFractionDigits: precision }),
  
  duration: (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  },
  
  fileSize: (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  },
  
  date: (date: Date | string, format: 'short' | 'medium' | 'long' = 'medium') => {
    const d = typeof date === 'string' ? new Date(date) : date
    const options: Intl.DateTimeFormatOptions = {
      short: { month: 'short', day: 'numeric' },
      medium: { month: 'short', day: 'numeric', year: 'numeric' },
      long: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
    }[format]
    return d.toLocaleDateString('en-US', options)
  },
} as const

// Data aggregation utilities
export const dataAggregators = {
  sum: (values: number[]) => values.reduce((sum, val) => sum + val, 0),
  avg: (values: number[]) => values.reduce((sum, val) => sum + val, 0) / values.length,
  min: (values: number[]) => Math.min(...values),
  max: (values: number[]) => Math.max(...values),
  count: (values: any[]) => values.length,
  countUnique: (values: any[]) => new Set(values).size,
  median: (values: number[]) => {
    const sorted = [...values].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
  },
} as const

// Accessibility guidelines for data components
export const dataAccessibilityGuidelines = {
  general: [
    'Provide clear and descriptive labels for all data elements',
    'Use semantic HTML structure for tables and lists',
    'Ensure keyboard navigation works for all interactive elements',
    'Announce data changes and updates to screen readers',
    'Provide alternative text for data visualizations',
  ],
  
  Table: [
    'Use proper table headers with scope attributes',
    'Provide sorting state announcements',
    'Implement keyboard navigation for table cells',
    'Use aria-describedby for additional context',
    'Announce selection changes clearly',
  ],
  
  List: [
    'Use semantic list elements (ul, ol, li)',
    'Provide clear item descriptions',
    'Implement proper focus management',
    'Announce list updates and changes',
    'Use aria-setsize and aria-posinset for large lists',
  ],
  
  Stats: [
    'Provide meaningful descriptions for statistics',
    'Announce trend changes and significance',
    'Use appropriate units and formatting',
    'Provide context for comparative data',
    'Ensure color is not the only indicator of meaning',
  ],
  
  DataGrid: [
    'Combine table accessibility with search/filter announcements',
    'Provide clear feedback for search results',
    'Announce filter applications and removals',
    'Ensure export functionality is keyboard accessible',
    'Provide progress feedback for long operations',
  ],
} as const

// Performance optimization guidelines
export const dataPerformanceGuidelines = {
  general: [
    'Use virtualization for large datasets (>1000 items)',
    'Implement proper memoization for expensive calculations',
    'Debounce search and filter operations',
    'Use pagination or infinite scrolling for large tables',
    'Optimize re-renders with React.memo and useMemo',
  ],
  
  Table: [
    'Virtualize rows for tables with >100 rows',
    'Memoize column configurations',
    'Use stable keys for table rows',
    'Implement server-side sorting and filtering for large datasets',
  ],
  
  List: [
    'Enable virtualization for lists with >50 items',
    'Use fixed item heights when possible',
    'Implement lazy loading for item content',
    'Optimize custom renderers with React.memo',
  ],
  
  Stats: [
    'Memoize calculation-heavy statistics',
    'Use efficient data structures for aggregations',
    'Implement caching for frequently accessed metrics',
    'Optimize trend calculations with incremental updates',
  ],
  
  DataGrid: [
    'Implement server-side search and filtering',
    'Use debounced search input',
    'Cache filter and sort configurations',
    'Optimize export operations with web workers',
  ],
} as const

// Export data library metadata
export const dataLibraryInfo = {
  name: 'AI-First Data Components',
  version: '1.0.0',
  description: 'Comprehensive data display and manipulation components for AI-driven applications',
  features: [
    'Advanced table with sorting, filtering, and selection',
    'Virtualized lists for large datasets',
    'Interactive statistics with trend analysis',
    'Enhanced data grid with search and export',
    'MCP integration for AI-driven data operations',
    'Accessibility-first design with WCAG 2.1 AA compliance',
    'Performance optimized with virtualization',
    'TypeScript support with comprehensive types',
  ],
  principles: [
    'Performance-first for large datasets',
    'Accessibility is built-in, not added on',
    'AI-extensible with semantic metadata',
    'Flexible and composable data display',
    'Comprehensive interaction patterns',
  ],
} as const

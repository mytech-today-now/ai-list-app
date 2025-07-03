/**
 * AI-First Patterns - AI-Specific Component Library Export
 * SemanticType: AIFirstPatternsExport
 * ExtensibleByAI: true
 * AIUseCases: ["AI interaction", "Intelligent interfaces", "MCP integration", "Smart automation"]
 */

// AI-First Pattern Components
export { default as CommandPalette } from './CommandPalette'
export {
  CommandPalette,
  type CommandPaletteProps,
  type CommandItem,
} from './CommandPalette'

export { default as SmartSuggestions } from './SmartSuggestions'
export {
  SmartSuggestions,
  type SmartSuggestionsProps,
  type Suggestion,
} from './SmartSuggestions'

export { default as AIContextMenu } from './AIContextMenu'
export {
  AIContextMenu,
  type AIContextMenuProps,
  type AIContextAction,
} from './AIContextMenu'

// Component metadata for AI discovery
export const aiPatternsComponentMetadata = {
  CommandPalette: {
    name: 'CommandPalette',
    description: 'AI-First command interface with MCP integration',
    semanticType: 'AIFirstCommandPalette',
    capabilities: ['command-execution', 'search', 'keyboard-navigation', 'mcp-integration'],
    features: ['fuzzy-search', 'command-categories', 'recent-favorites', 'mcp-commands', 'ai-prompts'],
    aiExtensible: true,
    mcpIntegration: true,
    accessibility: {
      ariaSupport: true,
      keyboardNavigation: true,
      focusManagement: true,
      screenReaderSupport: true,
      dialogRole: true,
    },
  },
  
  SmartSuggestions: {
    name: 'SmartSuggestions',
    description: 'AI-First intelligent suggestions with MCP integration',
    semanticType: 'AIFirstSmartSuggestions',
    capabilities: ['ai-suggestions', 'auto-completion', 'keyboard-navigation', 'mcp-integration'],
    suggestionTypes: ['completion', 'recommendation', 'insight', 'action', 'template'],
    variants: ['inline', 'popup', 'sidebar'],
    features: ['confidence-scoring', 'categorization', 'previews', 'dismissible'],
    aiExtensible: true,
    mcpIntegration: true,
    accessibility: {
      ariaSupport: true,
      keyboardNavigation: true,
      screenReaderSupport: true,
      listboxRole: true,
      liveRegions: true,
    },
  },
  
  AIContextMenu: {
    name: 'AIContextMenu',
    description: 'AI-First intelligent context menu with MCP integration',
    semanticType: 'AIFirstContextMenu',
    capabilities: ['context-menu', 'ai-suggestions', 'keyboard-navigation', 'mcp-integration'],
    actionTypes: ['ai-action', 'standard', 'separator', 'submenu'],
    categories: ['ai', 'edit', 'share', 'analyze', 'transform'],
    features: ['context-awareness', 'dynamic-suggestions', 'confidence-ranking', 'categorization'],
    aiExtensible: true,
    mcpIntegration: true,
    accessibility: {
      ariaSupport: true,
      keyboardNavigation: true,
      focusManagement: true,
      menuRole: true,
      portalRendering: true,
    },
  },
} as const

// AI-First interaction patterns
export const aiInteractionPatterns = {
  'Command-Driven Interface': {
    description: 'Interface driven by command palette for AI interactions',
    components: ['CommandPalette'],
    example: `
      const [paletteOpen, setPaletteOpen] = useState(false)
      
      // Global keyboard shortcut
      useEffect(() => {
        const handleKeyDown = (e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault()
            setPaletteOpen(true)
          }
        }
        
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
      }, [])
      
      return (
        <CommandPalette
          open={paletteOpen}
          commands={aiCommands}
          onClose={() => setPaletteOpen(false)}
          onCommandExecute={handleAICommand}
          mcpType="command"
        />
      )
    `,
  },
  
  'Intelligent Assistance': {
    description: 'Smart suggestions and context-aware assistance',
    components: ['SmartSuggestions', 'AIContextMenu'],
    example: `
      const [suggestions, setSuggestions] = useState([])
      const [contextMenu, setContextMenu] = useState({ open: false, position: { x: 0, y: 0 } })
      
      // AI-powered suggestions based on user input
      useEffect(() => {
        if (userInput) {
          generateAISuggestions(userInput).then(setSuggestions)
        }
      }, [userInput])
      
      return (
        <>
          <SmartSuggestions
            suggestions={suggestions}
            context={userInput}
            onSuggestionSelect={handleSuggestionSelect}
            variant="popup"
          />
          
          <AIContextMenu
            open={contextMenu.open}
            position={contextMenu.position}
            actions={contextActions}
            context={selectedContent}
            onClose={() => setContextMenu({ ...contextMenu, open: false })}
            onActionExecute={handleContextAction}
          />
        </>
      )
    `,
  },
  
  'MCP-Integrated Workflow': {
    description: 'Complete MCP-driven AI workflow with all patterns',
    components: ['CommandPalette', 'SmartSuggestions', 'AIContextMenu'],
    example: `
      const mcpClient = useMCPClient()
      
      const handleMCPCommand = async (command, data) => {
        try {
          const result = await mcpClient.executeCommand(command, data)
          // Handle MCP response
          return result
        } catch (error) {
          console.error('MCP command failed:', error)
        }
      }
      
      return (
        <div className="ai-workspace">
          {/* Command palette for AI tools */}
          <CommandPalette
            commands={mcpTools}
            mcpType="command"
            onMCPCommand={handleMCPCommand}
          />
          
          {/* Smart suggestions for content */}
          <SmartSuggestions
            suggestions={aiSuggestions}
            mcpType="resource"
            onMCPCommand={handleMCPCommand}
          />
          
          {/* Context menu for AI actions */}
          <AIContextMenu
            actions={aiContextActions}
            mcpType="command"
            onMCPCommand={handleMCPCommand}
            onRequestAISuggestions={generateContextSuggestions}
          />
        </div>
      )
    `,
  },
} as const

// Usage examples for AI assistance
export const aiPatternsUsageExamples = {
  CommandPalette: {
    basic: `<CommandPalette commands={commands} onCommandExecute={handleExecute} />`,
    withMCP: `<CommandPalette commands={mcpCommands} mcpType="command" onMCPCommand={handleMCP} />`,
    withSearch: `<CommandPalette commands={commands} placeholder="Search AI tools..." />`,
    withCategories: `<CommandPalette commands={commands} showCategories={true} showRecent={true} />`,
  },
  
  SmartSuggestions: {
    inline: `<SmartSuggestions suggestions={suggestions} variant="inline" />`,
    popup: `<SmartSuggestions suggestions={suggestions} variant="popup" showPreviews={true} />`,
    withConfidence: `<SmartSuggestions suggestions={suggestions} showConfidence={true} />`,
    contextAware: `<SmartSuggestions suggestions={suggestions} context={userInput} />`,
  },
  
  AIContextMenu: {
    basic: `<AIContextMenu actions={actions} context={selection} />`,
    withAI: `<AIContextMenu actions={actions} showAISuggestions={true} onRequestAISuggestions={getAISuggestions} />`,
    categorized: `<AIContextMenu actions={actions} groupByCategory={true} />`,
    positioned: `<AIContextMenu actions={actions} position={{ x: 100, y: 200 }} />`,
  },
} as const

// AI interaction guidelines
export const aiInteractionGuidelines = {
  general: [
    'Provide immediate feedback for AI operations',
    'Use progressive disclosure for complex AI features',
    'Implement graceful degradation when AI services are unavailable',
    'Provide clear explanations for AI-generated suggestions',
    'Allow users to control AI assistance levels',
  ],
  
  CommandPalette: [
    'Make command discovery intuitive with good search',
    'Provide clear command descriptions and shortcuts',
    'Group related commands logically',
    'Show recent and favorite commands prominently',
    'Implement fuzzy search for better usability',
  ],
  
  SmartSuggestions: [
    'Show confidence levels for AI suggestions',
    'Allow users to dismiss irrelevant suggestions',
    'Provide context for why suggestions were made',
    'Implement learning from user interactions',
    'Respect user preferences for suggestion frequency',
  ],
  
  AIContextMenu: [
    'Generate context-appropriate actions dynamically',
    'Prioritize actions based on user behavior',
    'Provide clear action descriptions and outcomes',
    'Group actions logically by category',
    'Implement smart action ranking based on context',
  ],
} as const

// Performance guidelines for AI patterns
export const aiPatternsPerformanceGuidelines = {
  general: [
    'Implement proper loading states for AI operations',
    'Use debouncing for real-time AI suggestions',
    'Cache AI responses when appropriate',
    'Implement progressive loading for large suggestion sets',
    'Use efficient algorithms for fuzzy search and ranking',
  ],
  
  CommandPalette: [
    'Implement virtual scrolling for large command sets',
    'Use efficient search algorithms (e.g., Fuse.js)',
    'Cache command metadata and search indices',
    'Debounce search input to avoid excessive API calls',
  ],
  
  SmartSuggestions: [
    'Implement suggestion caching and invalidation',
    'Use efficient ranking algorithms for suggestions',
    'Limit the number of concurrent AI requests',
    'Implement proper cleanup for dismissed suggestions',
  ],
  
  AIContextMenu: [
    'Generate context menus lazily when needed',
    'Cache context-specific action sets',
    'Use efficient positioning algorithms',
    'Implement proper cleanup for dynamic actions',
  ],
} as const

// Accessibility guidelines for AI patterns
export const aiPatternsAccessibilityGuidelines = {
  general: [
    'Provide clear announcements for AI operations',
    'Use appropriate ARIA roles and properties',
    'Implement proper keyboard navigation',
    'Provide alternative access methods for AI features',
    'Ensure AI suggestions are perceivable by screen readers',
  ],
  
  CommandPalette: [
    'Use dialog role with proper focus management',
    'Implement combobox pattern for search input',
    'Provide clear instructions for keyboard navigation',
    'Announce search results and command execution',
  ],
  
  SmartSuggestions: [
    'Use listbox role for suggestion lists',
    'Implement proper option selection patterns',
    'Announce suggestion updates with live regions',
    'Provide clear labels for suggestion types',
  ],
  
  AIContextMenu: [
    'Use menu role with proper item relationships',
    'Implement arrow key navigation between items',
    'Provide clear action descriptions and shortcuts',
    'Announce dynamic menu updates',
  ],
} as const

// MCP integration patterns
export const mcpIntegrationPatterns = {
  'Command Execution': {
    description: 'Execute MCP commands through UI components',
    example: `
      const handleMCPCommand = async (command, data) => {
        const response = await mcpClient.call(command, data)
        return response
      }
      
      <CommandPalette
        mcpType="command"
        onMCPCommand={handleMCPCommand}
        commands={mcpCommands}
      />
    `,
  },
  
  'Resource Access': {
    description: 'Access MCP resources through suggestions',
    example: `
      const handleMCPResource = async (resourceType, data) => {
        const resources = await mcpClient.getResources(resourceType, data)
        return resources
      }
      
      <SmartSuggestions
        mcpType="resource"
        onMCPCommand={handleMCPResource}
        suggestions={mcpSuggestions}
      />
    `,
  },
  
  'Tool Integration': {
    description: 'Integrate MCP tools through context menus',
    example: `
      const handleMCPTool = async (toolName, parameters) => {
        const result = await mcpClient.useTool(toolName, parameters)
        return result
      }
      
      <AIContextMenu
        mcpType="tool"
        onMCPCommand={handleMCPTool}
        actions={mcpToolActions}
      />
    `,
  },
} as const

// Export AI patterns library metadata
export const aiPatternsLibraryInfo = {
  name: 'AI-First Patterns',
  version: '1.0.0',
  description: 'Intelligent UI patterns for AI-driven applications with MCP integration',
  features: [
    'Command palette for AI tool access',
    'Smart suggestions with confidence scoring',
    'Context-aware AI action menus',
    'MCP protocol integration throughout',
    'Accessibility-first design with screen reader support',
    'Keyboard navigation and shortcuts',
    'TypeScript support with comprehensive types',
    'Performance optimized for real-time AI interactions',
  ],
  principles: [
    'AI assistance should be discoverable and intuitive',
    'Provide clear feedback for AI operations',
    'Respect user agency and control over AI features',
    'Implement graceful degradation for AI failures',
    'Maintain accessibility across all AI interactions',
  ],
} as const

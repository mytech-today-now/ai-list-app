/**
 * MCP-Native React Hooks - AI-First Component Architecture
 * SemanticType: MCPHooksExport
 * ExtensibleByAI: true
 * AIUseCases: ["Hook discovery", "Component integration", "AI interaction"]
 */

// MCP Tool Hooks
export {
  useMCPTool,
  useMCPToolRegistry,
  useMCPToolExecutor,
  type MCPToolOptions,
  type MCPToolHandler
} from './useMCPTool';

// MCP Resource Hooks
export {
  useMCPResource,
  useMCPResourceRegistry,
  useMCPResourceConsumer,
  type MCPResourceOptions
} from './useMCPResource';

// MCP Prompt Hooks
export {
  useMCPPrompt,
  useMCPPromptRegistry,
  useMCPContext,
  type MCPPromptOptions,
  type MCPPromptTemplate
} from './useMCPPrompt';

// MCP Subscription Hooks
export {
  useMCPSubscription,
  useMCPEventEmitter,
  useMCPEventBus,
  useMCPStateSync,
  type MCPSubscriptionOptions,
  type MCPEvent,
  type MCPEventHandler
} from './useMCPSubscription';

// Re-export shared types for convenience
export type {
  MCPCommand,
  MCPResponse,
  MCPError,
  MCPAction,
  MCPTargetType
} from '@ai-todo/shared-types';

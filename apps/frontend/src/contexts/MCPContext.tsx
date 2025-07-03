/**
 * MCP Context Provider - Global MCP state management and AI coordination
 * SemanticType: MCPContextProvider
 * ExtensibleByAI: true
 * AIUseCases: ["Global state management", "AI coordination", "Component communication"]
 */

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { MCPEngine } from '@ai-todo/mcp-core';
import { MCPCommand, MCPResponse, Agent, Session } from '@ai-todo/shared-types';
import { 
  useMCPToolRegistry, 
  useMCPResourceRegistry, 
  useMCPPromptRegistry,
  useMCPEventBus,
  useMCPEventEmitter
} from '../hooks';

export interface MCPContextValue {
  // Core MCP Engine
  engine: MCPEngine | null;
  isInitialized: boolean;
  
  // Session Management
  currentSession: Session | null;
  activeAgent: Agent | null;
  
  // Command Execution
  executeCommand: (command: MCPCommand) => Promise<MCPResponse>;
  
  // Registry Access
  tools: Array<{ name: string; description?: string; componentId: string }>;
  resources: Array<{ name: string; description?: string; componentId: string }>;
  prompts: Array<{ name: string; description?: string; componentId: string }>;
  
  // AI Context
  generateAIContext: () => string;
  
  // Real-time Features
  isConnected: boolean;
  lastActivity: string | null;
  
  // Error Handling
  lastError: string | null;
  clearError: () => void;
}

const MCPContext = createContext<MCPContextValue | null>(null);

export interface MCPProviderProps {
  children: ReactNode;
  config?: {
    apiUrl?: string;
    autoConnect?: boolean;
    sessionTimeout?: number;
    enableRealtime?: boolean;
  };
}

export const MCPProvider: React.FC<MCPProviderProps> = ({ 
  children, 
  config = {} 
}) => {
  const {
    apiUrl = '/api',
    autoConnect = true,
    sessionTimeout = 30 * 60 * 1000, // 30 minutes
    enableRealtime = true
  } = config;

  // Core State
  const [engine, setEngine] = useState<MCPEngine | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [activeAgent, setActiveAgent] = useState<Agent | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastActivity, setLastActivity] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  // Registry Hooks
  const toolRegistry = useMCPToolRegistry();
  const resourceRegistry = useMCPResourceRegistry();
  const promptRegistry = useMCPPromptRegistry();
  const eventBus = useMCPEventBus();
  const { emit } = useMCPEventEmitter();

  // Initialize MCP Engine
  useEffect(() => {
    const initializeEngine = async () => {
      try {
        const mcpEngine = new MCPEngine({
          apiUrl,
          enableRealtime,
          sessionTimeout
        });

        await mcpEngine.initialize();
        setEngine(mcpEngine);
        setIsInitialized(true);
        setIsConnected(true);
        setLastActivity(new Date().toISOString());

        // Emit initialization event
        emit('mcp.initialized', { 
          engine: 'MCPEngine',
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('Failed to initialize MCP Engine:', error);
        setLastError(error instanceof Error ? error.message : 'Unknown initialization error');
      }
    };

    if (autoConnect) {
      initializeEngine();
    }
  }, [apiUrl, autoConnect, sessionTimeout, enableRealtime, emit]);

  // Command Execution
  const executeCommand = useCallback(async (command: MCPCommand): Promise<MCPResponse> => {
    if (!engine) {
      throw new Error('MCP Engine not initialized');
    }

    try {
      setLastActivity(new Date().toISOString());
      
      // Emit command event
      emit('mcp.command.executing', command);
      
      const response = await engine.executeCommand(command);
      
      // Emit response event
      emit('mcp.command.completed', { command, response });
      
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Command execution failed';
      setLastError(errorMessage);
      
      // Emit error event
      emit('mcp.command.error', { command, error: errorMessage });
      
      throw error;
    }
  }, [engine, emit]);

  // AI Context Generation
  const generateAIContext = useCallback(() => {
    const contextSections: string[] = [];

    // Add system context
    contextSections.push(`## MCP System Status
- Engine: ${isInitialized ? 'Initialized' : 'Not Initialized'}
- Connection: ${isConnected ? 'Connected' : 'Disconnected'}
- Session: ${currentSession ? currentSession.id : 'None'}
- Agent: ${activeAgent ? activeAgent.name : 'None'}
- Last Activity: ${lastActivity || 'None'}`);

    // Add available tools
    const tools = toolRegistry.getTools();
    if (tools.length > 0) {
      contextSections.push(`## Available Tools (${tools.length})
${tools.map(tool => `- ${tool.name}: ${tool.description || 'No description'}`).join('\n')}`);
    }

    // Add available resources
    const resources = resourceRegistry.getResourceList();
    if (resources.length > 0) {
      contextSections.push(`## Available Resources (${resources.length})
${resources.map(resource => `- ${resource.name}: ${resource.description || 'No description'}`).join('\n')}`);
    }

    // Add dynamic prompts
    const dynamicContext = promptRegistry.generateContextPrompt();
    if (dynamicContext) {
      contextSections.push(`## Component Context\n${dynamicContext}`);
    }

    // Add event bus status
    const subscribers = eventBus.getSubscribers();
    if (subscribers.length > 0) {
      contextSections.push(`## Active Subscriptions (${subscribers.length})
${subscribers.map(sub => `- ${sub.eventType} (${sub.componentId})`).join('\n')}`);
    }

    return contextSections.join('\n\n');
  }, [
    isInitialized,
    isConnected,
    currentSession,
    activeAgent,
    lastActivity,
    toolRegistry,
    resourceRegistry,
    promptRegistry,
    eventBus
  ]);

  // Error Handling
  const clearError = useCallback(() => {
    setLastError(null);
  }, []);

  // Session Management
  useEffect(() => {
    if (engine && isInitialized) {
      // Create or restore session
      const initializeSession = async () => {
        try {
          // This would typically involve API calls to create/restore session
          const session: Session = {
            id: `session_${Date.now()}`,
            status: 'active',
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + sessionTimeout).toISOString(),
            lastActivity: new Date().toISOString()
          };
          
          setCurrentSession(session);
          emit('mcp.session.created', session);
        } catch (error) {
          console.error('Failed to initialize session:', error);
          setLastError('Session initialization failed');
        }
      };

      initializeSession();
    }
  }, [engine, isInitialized, sessionTimeout, emit]);

  // Prepare context value
  const contextValue: MCPContextValue = {
    engine,
    isInitialized,
    currentSession,
    activeAgent,
    executeCommand,
    tools: toolRegistry.getTools(),
    resources: resourceRegistry.getResourceList(),
    prompts: promptRegistry.getPromptList(),
    generateAIContext,
    isConnected,
    lastActivity,
    lastError,
    clearError
  };

  return (
    <MCPContext.Provider value={contextValue}>
      {children}
    </MCPContext.Provider>
  );
};

/**
 * Hook to access MCP context
 */
export const useMCPContext = (): MCPContextValue => {
  const context = useContext(MCPContext);
  if (!context) {
    throw new Error('useMCPContext must be used within an MCPProvider');
  }
  return context;
};

/**
 * Hook for MCP-aware navigation
 */
export const useMCPNavigation = () => {
  const { executeCommand } = useMCPContext();
  const { emit } = useMCPEventEmitter();

  const navigateTo = useCallback(async (path: string, params?: Record<string, any>) => {
    try {
      // Emit navigation event for AI awareness
      emit('navigation.request', { path, params });
      
      // Execute MCP navigation command
      await executeCommand({
        action: 'execute',
        targetType: 'system',
        targetId: 'navigation',
        parameters: { path, params }
      });

      emit('navigation.completed', { path, params });
    } catch (error) {
      emit('navigation.error', { path, params, error });
      throw error;
    }
  }, [executeCommand, emit]);

  return { navigateTo };
};

export default MCPContext;

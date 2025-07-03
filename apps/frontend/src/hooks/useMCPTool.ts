/**
 * MCP Tool Hook - Register component actions as callable MCP tools
 * SemanticType: MCPToolHook
 * ExtensibleByAI: true
 * AIUseCases: ["Component action registration", "AI tool discovery", "Command execution"]
 */

import { useEffect, useRef, useCallback } from 'react';
import { MCPCommand, MCPResponse } from '@ai-todo/shared-types';

export interface MCPToolOptions {
  description?: string;
  parameters?: Record<string, any>;
  permissions?: string[];
  category?: string;
}

export interface MCPToolHandler<T = any> {
  (params: T): Promise<any> | any;
}

interface MCPToolRegistry {
  tools: Map<string, {
    handler: MCPToolHandler;
    options: MCPToolOptions;
    componentId: string;
  }>;
  subscribe: (callback: (tools: Map<string, any>) => void) => () => void;
  execute: (toolName: string, params: any) => Promise<any>;
}

// Global MCP Tool Registry (singleton pattern)
const createMCPToolRegistry = (): MCPToolRegistry => {
  const tools = new Map();
  const subscribers = new Set<(tools: Map<string, any>) => void>();

  const notifySubscribers = () => {
    subscribers.forEach(callback => callback(new Map(tools)));
  };

  return {
    tools,
    subscribe: (callback) => {
      subscribers.add(callback);
      return () => subscribers.delete(callback);
    },
    execute: async (toolName: string, params: any) => {
      const tool = tools.get(toolName);
      if (!tool) {
        throw new Error(`MCP Tool '${toolName}' not found`);
      }
      
      try {
        const result = await tool.handler(params);
        return {
          success: true,
          result,
          metadata: {
            toolName,
            componentId: tool.componentId,
            timestamp: new Date().toISOString()
          }
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'TOOL_EXECUTION_ERROR',
            message: error instanceof Error ? error.message : 'Unknown error',
            details: `Failed to execute tool '${toolName}'`
          }
        };
      }
    }
  };
};

// Global registry instance
const mcpToolRegistry = createMCPToolRegistry();

/**
 * Hook to register a component action as an MCP tool
 * @param toolName - Unique name for the tool
 * @param handler - Function to execute when tool is called
 * @param options - Tool configuration options
 */
export const useMCPTool = <T = any>(
  toolName: string,
  handler: MCPToolHandler<T>,
  options: MCPToolOptions = {}
) => {
  const componentIdRef = useRef<string>();
  
  // Generate unique component ID if not exists
  if (!componentIdRef.current) {
    componentIdRef.current = `component_${Math.random().toString(36).substr(2, 9)}`;
  }

  const stableHandler = useCallback(handler, [handler]);

  useEffect(() => {
    const fullToolName = `${componentIdRef.current}.${toolName}`;
    
    // Register the tool
    mcpToolRegistry.tools.set(fullToolName, {
      handler: stableHandler,
      options: {
        ...options,
        description: options.description || `Tool: ${toolName}`,
      },
      componentId: componentIdRef.current!
    });

    // Cleanup on unmount
    return () => {
      mcpToolRegistry.tools.delete(fullToolName);
    };
  }, [toolName, stableHandler, options]);

  return {
    toolName: `${componentIdRef.current}.${toolName}`,
    componentId: componentIdRef.current,
    isRegistered: mcpToolRegistry.tools.has(`${componentIdRef.current}.${toolName}`)
  };
};

/**
 * Hook to access the global MCP tool registry
 */
export const useMCPToolRegistry = () => {
  return {
    execute: mcpToolRegistry.execute,
    getTools: () => Array.from(mcpToolRegistry.tools.entries()).map(([name, tool]) => ({
      name,
      description: tool.options.description,
      parameters: tool.options.parameters,
      permissions: tool.options.permissions,
      category: tool.options.category,
      componentId: tool.componentId
    })),
    subscribe: mcpToolRegistry.subscribe
  };
};

/**
 * Hook to execute MCP tools from other components
 */
export const useMCPToolExecutor = () => {
  const executeTool = useCallback(async (toolName: string, params: any = {}) => {
    return await mcpToolRegistry.execute(toolName, params);
  }, []);

  return { executeTool };
};

export default useMCPTool;

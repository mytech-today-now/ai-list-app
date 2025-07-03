/**
 * Tool Registry - Manages AI agent tools and capabilities
 * SemanticType: RoleBasedToolLoader
 * ExtensibleByAI: true
 * AIUseCases: ["Tool management", "Capability discovery", "Permission enforcement"]
 */

import { Agent, MCPAction } from '@ai-todo/shared-types';

export interface Tool {
  id: string;
  name: string;
  description: string;
  actions: MCPAction[];
  requiredPermissions: string[];
  category: string;
  version: string;
  enabled: boolean;
  handler?: (params: unknown) => Promise<unknown>;
}

export interface ToolFilter {
  category?: string;
  actions?: MCPAction[];
  permissions?: string[];
  enabled?: boolean;
}

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();
  private agentTools: Map<string, Set<string>> = new Map(); // agentId -> toolIds

  constructor() {
    this.initializeDefaultTools();
  }

  /**
   * Register a new tool
   */
  registerTool(tool: Tool): void {
    this.tools.set(tool.id, tool);
  }

  /**
   * Unregister a tool
   */
  unregisterTool(toolId: string): boolean {
    return this.tools.delete(toolId);
  }

  /**
   * Get tool by ID
   */
  getTool(toolId: string): Tool | undefined {
    return this.tools.get(toolId);
  }

  /**
   * Get all tools matching filter
   */
  getTools(filter?: ToolFilter): Tool[] {
    const tools = Array.from(this.tools.values());
    
    if (!filter) {
      return tools;
    }

    return tools.filter(tool => {
      if (filter.category && tool.category !== filter.category) {
        return false;
      }
      
      if (filter.enabled !== undefined && tool.enabled !== filter.enabled) {
        return false;
      }
      
      if (filter.actions && !filter.actions.some(action => tool.actions.includes(action))) {
        return false;
      }
      
      if (filter.permissions && !filter.permissions.every(perm => tool.requiredPermissions.includes(perm))) {
        return false;
      }
      
      return true;
    });
  }

  /**
   * Get tools available to an agent
   */
  getAgentTools(agent: Agent): Tool[] {
    return this.getTools().filter(tool => 
      tool.enabled && 
      tool.requiredPermissions.every(perm => agent.permissions.includes(perm as MCPAction))
    );
  }

  /**
   * Assign tools to an agent
   */
  assignToolsToAgent(agentId: string, toolIds: string[]): void {
    this.agentTools.set(agentId, new Set(toolIds));
  }

  /**
   * Get assigned tools for an agent
   */
  getAssignedTools(agentId: string): Tool[] {
    const toolIds = this.agentTools.get(agentId) || new Set();
    return Array.from(toolIds).map(id => this.tools.get(id)).filter(Boolean) as Tool[];
  }

  /**
   * Initialize default tools
   */
  private initializeDefaultTools(): void {
    const defaultTools: Tool[] = [
      {
        id: 'list_manager',
        name: 'List Manager',
        description: 'Create, read, update, and delete task lists',
        actions: ['create', 'read', 'update', 'delete'],
        requiredPermissions: ['create', 'read', 'update', 'delete'],
        category: 'list_management',
        version: '1.0.0',
        enabled: true,
      },
      {
        id: 'task_executor',
        name: 'Task Executor',
        description: 'Execute tasks and manage completion',
        actions: ['execute', 'mark_done'],
        requiredPermissions: ['execute', 'mark_done'],
        category: 'task_execution',
        version: '1.0.0',
        enabled: true,
      },
      {
        id: 'status_reporter',
        name: 'Status Reporter',
        description: 'Get status and generate reports',
        actions: ['status', 'read'],
        requiredPermissions: ['read', 'status'],
        category: 'reporting',
        version: '1.0.0',
        enabled: true,
      },
      {
        id: 'task_planner',
        name: 'Task Planner',
        description: 'Plan and organize tasks',
        actions: ['plan', 'create', 'update', 'reorder'],
        requiredPermissions: ['plan', 'create', 'update', 'reorder'],
        category: 'planning',
        version: '1.0.0',
        enabled: true,
      },
    ];

    defaultTools.forEach(tool => this.registerTool(tool));
  }

  /**
   * Get registry status
   */
  getStatus(): object {
    return {
      status: 'active',
      totalTools: this.tools.size,
      enabledTools: this.getTools({ enabled: true }).length,
      categories: [...new Set(Array.from(this.tools.values()).map(t => t.category))],
      agentsWithTools: this.agentTools.size,
    };
  }
}

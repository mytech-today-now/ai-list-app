/**
 * MCP Agent Manager - Manages AI agents and their capabilities
 * SemanticType: MCPAgentManager
 * ExtensibleByAI: true
 * AIUseCases: ["Agent lifecycle", "Permission management", "Capability tracking"]
 */

import { Agent, AgentRole, AgentStatus } from '@ai-todo/shared-types';

export interface AgentStats {
  total: number;
  active: number;
  inactive: number;
}

export class MCPAgentManager {
  private agents = new Map<string, Agent>();
  private systemAgent: Agent;

  constructor() {
    // Initialize system agent
    this.systemAgent = {
      id: 'system',
      name: 'System Agent',
      role: 'admin' as AgentRole,
      status: 'active' as AgentStatus,
      permissions: ['read', 'write', 'execute', 'admin'],
      capabilities: ['all'],
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };

    this.agents.set('system', this.systemAgent);
    this.initializeDefaultAgents();
  }

  private initializeDefaultAgents(): void {
    // Reader Agent
    const readerAgent: Agent = {
      id: 'agent_reader',
      name: 'Reader Agent',
      role: 'reader' as AgentRole,
      status: 'active' as AgentStatus,
      permissions: ['read'],
      capabilities: ['read_lists', 'read_items', 'status_check'],
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };

    // Writer Agent
    const writerAgent: Agent = {
      id: 'agent_writer',
      name: 'Writer Agent',
      role: 'writer' as AgentRole,
      status: 'active' as AgentStatus,
      permissions: ['read', 'write'],
      capabilities: ['read_lists', 'read_items', 'create_lists', 'create_items', 'update_lists', 'update_items'],
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };

    // Executor Agent
    const executorAgent: Agent = {
      id: 'agent_executor',
      name: 'Executor Agent',
      role: 'executor' as AgentRole,
      status: 'active' as AgentStatus,
      permissions: ['read', 'write', 'execute'],
      capabilities: [
        'read_lists', 'read_items', 'create_lists', 'create_items', 
        'update_lists', 'update_items', 'execute_workflows', 'batch_operations'
      ],
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };

    this.agents.set(readerAgent.id, readerAgent);
    this.agents.set(writerAgent.id, writerAgent);
    this.agents.set(executorAgent.id, executorAgent);
  }

  async getAgent(agentId: string): Promise<Agent | null> {
    const agent = this.agents.get(agentId);
    if (agent) {
      // Update last activity
      agent.lastActivity = new Date().toISOString();
      this.agents.set(agentId, agent);
    }
    return agent || null;
  }

  getSystemAgent(): Agent {
    return this.systemAgent;
  }

  async createAgent(agentData: {
    name: string;
    role: AgentRole;
    permissions: string[];
    capabilities?: string[];
    description?: string;
  }): Promise<Agent> {
    const agent: Agent = {
      id: `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: agentData.name,
      role: agentData.role,
      status: 'active' as AgentStatus,
      permissions: agentData.permissions,
      capabilities: agentData.capabilities || [],
      description: agentData.description,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };

    this.agents.set(agent.id, agent);
    return agent;
  }

  async updateAgent(agentId: string, updates: Partial<Agent>): Promise<Agent | null> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return null;
    }

    const updatedAgent = {
      ...agent,
      ...updates,
      id: agent.id, // Prevent ID changes
      updatedAt: new Date().toISOString()
    };

    this.agents.set(agentId, updatedAgent);
    return updatedAgent;
  }

  async deleteAgent(agentId: string): Promise<boolean> {
    // Prevent deletion of system agent
    if (agentId === 'system') {
      return false;
    }

    return this.agents.delete(agentId);
  }

  async listAgents(filters?: {
    role?: AgentRole;
    status?: AgentStatus;
    limit?: number;
    offset?: number;
  }): Promise<Agent[]> {
    let agents = Array.from(this.agents.values());

    if (filters) {
      if (filters.role) {
        agents = agents.filter(agent => agent.role === filters.role);
      }
      if (filters.status) {
        agents = agents.filter(agent => agent.status === filters.status);
      }
      if (filters.offset) {
        agents = agents.slice(filters.offset);
      }
      if (filters.limit) {
        agents = agents.slice(0, filters.limit);
      }
    }

    return agents;
  }

  async getAgentStats(): Promise<AgentStats> {
    const agents = Array.from(this.agents.values());
    
    return {
      total: agents.length,
      active: agents.filter(agent => agent.status === 'active').length,
      inactive: agents.filter(agent => agent.status === 'inactive').length
    };
  }

  async validateAgentPermissions(agent: Agent, requiredPermissions: string[]): Promise<boolean> {
    // System agent has all permissions
    if (agent.id === 'system') {
      return true;
    }

    // Check if agent has admin permission (grants all access)
    if (agent.permissions.includes('admin')) {
      return true;
    }

    // Check if agent has all required permissions
    return requiredPermissions.every(permission => 
      agent.permissions.includes(permission)
    );
  }

  async validateAgentCapability(agent: Agent, capability: string): Promise<boolean> {
    // System agent has all capabilities
    if (agent.id === 'system') {
      return true;
    }

    // Check if agent has the specific capability
    return agent.capabilities?.includes(capability) || 
           agent.capabilities?.includes('all') || 
           false;
  }

  async getAgentsByCapability(capability: string): Promise<Agent[]> {
    return Array.from(this.agents.values()).filter(agent =>
      agent.capabilities?.includes(capability) || 
      agent.capabilities?.includes('all') ||
      agent.id === 'system'
    );
  }

  async getAgentsByPermission(permission: string): Promise<Agent[]> {
    return Array.from(this.agents.values()).filter(agent =>
      agent.permissions.includes(permission) ||
      agent.permissions.includes('admin') ||
      agent.id === 'system'
    );
  }

  // Agent activity tracking
  async recordAgentActivity(agentId: string, activity: {
    action: string;
    targetType?: string;
    targetId?: string;
    timestamp?: string;
  }): Promise<void> {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.lastActivity = activity.timestamp || new Date().toISOString();
      
      // Store activity in agent metadata (in a real implementation, this might go to a database)
      if (!agent.metadata) {
        agent.metadata = {};
      }
      if (!agent.metadata.recentActivities) {
        agent.metadata.recentActivities = [];
      }
      
      agent.metadata.recentActivities.unshift(activity);
      
      // Keep only last 10 activities
      if (agent.metadata.recentActivities.length > 10) {
        agent.metadata.recentActivities = agent.metadata.recentActivities.slice(0, 10);
      }
      
      this.agents.set(agentId, agent);
    }
  }

  // Cleanup inactive agents
  async cleanupInactiveAgents(inactiveThresholdHours: number = 24): Promise<number> {
    const threshold = new Date(Date.now() - inactiveThresholdHours * 60 * 60 * 1000);
    let cleanedCount = 0;

    for (const [agentId, agent] of this.agents.entries()) {
      // Skip system and default agents
      if (agentId === 'system' || agentId.startsWith('agent_reader') || 
          agentId.startsWith('agent_writer') || agentId.startsWith('agent_executor')) {
        continue;
      }

      const lastActivity = new Date(agent.lastActivity || agent.createdAt);
      if (lastActivity < threshold && agent.status === 'active') {
        agent.status = 'inactive' as AgentStatus;
        this.agents.set(agentId, agent);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }
}

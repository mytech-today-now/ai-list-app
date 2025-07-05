/**
 * MCP Service Registry - Central registry for MCP services and capabilities
 * SemanticType: MCPServiceRegistry
 * ExtensibleByAI: true
 * AIUseCases: ["Service discovery", "Capability management", "Tool registration"]
 */

import { Agent, Session } from '@ai-todo/shared-types';
import { MCPToolInfo, MCPResourceInfo } from '../router/MCPCommandRouter';
import { MCPListService } from './MCPListService';
import { MCPItemService } from './MCPItemService';
import { MCPAgentService } from './MCPAgentService';
import { MCPSystemService } from './MCPSystemService';
import { MCPWorkflowService } from './MCPWorkflowService';

export interface MCPService {
  name: string;
  version: string;
  description: string;
  initialize(): Promise<void>;
  getTools(agent?: Agent, session?: Session): Promise<MCPToolInfo[]>;
  getResources(agent?: Agent, session?: Session): Promise<MCPResourceInfo[]>;
  getStatus(): Promise<{ status: 'healthy' | 'degraded' | 'error'; lastCheck: string }>;
  shutdown(): Promise<void>;
}

export class MCPServiceRegistry {
  private services = new Map<string, MCPService>();
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Register core MCP services
      await this.registerService(new MCPListService());
      await this.registerService(new MCPItemService());
      await this.registerService(new MCPAgentService());
      await this.registerService(new MCPSystemService());
      await this.registerService(new MCPWorkflowService());

      // Initialize all services
      for (const service of this.services.values()) {
        await service.initialize();
      }

      this.initialized = true;
      console.log('MCP Service Registry initialized successfully');
    } catch (error) {
      console.error('Failed to initialize MCP Service Registry:', error);
      throw error;
    }
  }

  async registerService(service: MCPService): Promise<void> {
    if (this.services.has(service.name)) {
      throw new Error(`Service ${service.name} is already registered`);
    }

    this.services.set(service.name, service);
    console.log(`Registered MCP service: ${service.name} v${service.version}`);
  }

  async unregisterService(serviceName: string): Promise<void> {
    const service = this.services.get(serviceName);
    if (service) {
      await service.shutdown();
      this.services.delete(serviceName);
      console.log(`Unregistered MCP service: ${serviceName}`);
    }
  }

  getService(serviceName: string): MCPService | undefined {
    return this.services.get(serviceName);
  }

  getServices(): MCPService[] {
    return Array.from(this.services.values());
  }

  async getAvailableTools(agent?: Agent, session?: Session): Promise<MCPToolInfo[]> {
    const allTools: MCPToolInfo[] = [];

    for (const service of this.services.values()) {
      try {
        const serviceTools = await service.getTools(agent, session);
        allTools.push(...serviceTools);
      } catch (error) {
        console.error(`Failed to get tools from service ${service.name}:`, error);
      }
    }

    return allTools;
  }

  async getAvailableResources(agent?: Agent, session?: Session): Promise<MCPResourceInfo[]> {
    const allResources: MCPResourceInfo[] = [];

    for (const service of this.services.values()) {
      try {
        const serviceResources = await service.getResources(agent, session);
        allResources.push(...serviceResources);
      } catch (error) {
        console.error(`Failed to get resources from service ${service.name}:`, error);
      }
    }

    return allResources;
  }

  async getServiceStatus(): Promise<Record<string, { status: 'healthy' | 'degraded' | 'error'; lastCheck: string }>> {
    const status: Record<string, { status: 'healthy' | 'degraded' | 'error'; lastCheck: string }> = {};

    for (const [name, service] of this.services.entries()) {
      try {
        status[name] = await service.getStatus();
      } catch (error) {
        status[name] = {
          status: 'error',
          lastCheck: new Date().toISOString()
        };
      }
    }

    return status;
  }

  async shutdown(): Promise<void> {
    console.log('Shutting down MCP Service Registry...');

    const shutdownPromises = Array.from(this.services.values()).map(service =>
      service.shutdown().catch(error =>
        console.error(`Error shutting down service ${service.name}:`, error)
      )
    );

    await Promise.all(shutdownPromises);
    this.services.clear();
    this.initialized = false;

    console.log('MCP Service Registry shutdown complete');
  }

  // Service discovery methods
  findServicesByCapability(capability: string): MCPService[] {
    return Array.from(this.services.values()).filter(service =>
      service.description.toLowerCase().includes(capability.toLowerCase())
    );
  }

  findServicesByTool(toolName: string): Promise<MCPService[]> {
    return Promise.all(
      Array.from(this.services.values()).map(async service => {
        try {
          const tools = await service.getTools();
          return tools.some(tool => tool.name === toolName) ? service : null;
        } catch {
          return null;
        }
      })
    ).then(results => results.filter(service => service !== null) as MCPService[]);
  }

  findServicesByResource(resourceUri: string): Promise<MCPService[]> {
    return Promise.all(
      Array.from(this.services.values()).map(async service => {
        try {
          const resources = await service.getResources();
          return resources.some(resource => resource.uri === resourceUri) ? service : null;
        } catch {
          return null;
        }
      })
    ).then(results => results.filter(service => service !== null) as MCPService[]);
  }

  // Health monitoring
  async performHealthCheck(): Promise<{
    overall: 'healthy' | 'degraded' | 'error';
    services: Record<string, { status: 'healthy' | 'degraded' | 'error'; lastCheck: string }>;
    summary: {
      total: number;
      healthy: number;
      degraded: number;
      error: number;
    };
  }> {
    const serviceStatus = await this.getServiceStatus();
    const summary = {
      total: Object.keys(serviceStatus).length,
      healthy: 0,
      degraded: 0,
      error: 0
    };

    for (const status of Object.values(serviceStatus)) {
      summary[status.status]++;
    }

    let overall: 'healthy' | 'degraded' | 'error' = 'healthy';
    if (summary.error > 0) {
      overall = 'error';
    } else if (summary.degraded > 0) {
      overall = 'degraded';
    }

    return {
      overall,
      services: serviceStatus,
      summary
    };
  }

  // Metrics and monitoring
  getRegistryMetrics(): {
    totalServices: number;
    initializedServices: number;
    serviceNames: string[];
    registryUptime: number;
  } {
    return {
      totalServices: this.services.size,
      initializedServices: this.initialized ? this.services.size : 0,
      serviceNames: Array.from(this.services.keys()),
      registryUptime: process.uptime()
    };
  }
}

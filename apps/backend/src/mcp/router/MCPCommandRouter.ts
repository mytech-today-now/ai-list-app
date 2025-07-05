/**
 * MCP Command Router - Central command routing and execution
 * SemanticType: MCPCommandRouter
 * ExtensibleByAI: true
 * AIUseCases: ["Command routing", "Service orchestration", "Response coordination"]
 */

import { MCPCommand, MCPResponse, MCPError, Agent, Session } from '@ai-todo/shared-types';
import { MCPEngine } from '@ai-todo/mcp-core';
import { MCPServiceRegistry } from '../services/MCPServiceRegistry';
import { MCPAgentManager } from '../agents/MCPAgentManager';
import { MCPSessionManager } from '../session/MCPSessionManager';
import { MCPValidationService } from '../validation/MCPValidationService';
import { MCPLoggingService } from '../logging/MCPLoggingService';
import { MCPPermissionService } from '../permissions/MCPPermissionService';
import { z } from 'zod';

export interface MCPExecutionContext {
  sessionId?: string;
  agentId?: string;
  userId?: string;
  correlationId?: string;
  userAgent?: string;
  ip?: string;
}

export interface MCPBatchOptions extends MCPExecutionContext {
  stopOnError?: boolean;
  parallel?: boolean;
  maxConcurrency?: number;
}

export interface MCPToolInfo {
  name: string;
  description: string;
  inputSchema: any;
  permissions: string[];
  category: string;
}

export interface MCPResourceInfo {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
  permissions: string[];
}

export interface MCPSystemStatus {
  engine: {
    status: 'healthy' | 'degraded' | 'error';
    uptime: number;
    version: string;
  };
  services: {
    [serviceName: string]: {
      status: 'healthy' | 'degraded' | 'error';
      lastCheck: string;
    };
  };
  agents: {
    total: number;
    active: number;
    inactive: number;
  };
  sessions: {
    total: number;
    active: number;
    expired: number;
  };
  performance: {
    averageResponseTime: number;
    commandsPerMinute: number;
    errorRate: number;
  };
}

export class MCPCommandRouter {
  private engine: MCPEngine;
  private serviceRegistry: MCPServiceRegistry;
  private agentManager: MCPAgentManager;
  private sessionManager: MCPSessionManager;
  private validationService: MCPValidationService;
  private loggingService: MCPLoggingService;
  private permissionService: MCPPermissionService;
  private startTime: Date;

  constructor() {
    this.startTime = new Date();
    this.initializeServices();
  }

  private async initializeServices(): Promise<void> {
    // Initialize MCP Engine
    this.engine = new MCPEngine({
      enableLogging: true,
      enableValidation: true,
      enablePermissions: true,
      maxExecutionTime: 30000,
      enableRealtime: true
    });

    await this.engine.initialize();

    // Initialize service components
    this.serviceRegistry = new MCPServiceRegistry();
    this.agentManager = new MCPAgentManager();
    this.sessionManager = new MCPSessionManager();
    this.validationService = new MCPValidationService();
    this.loggingService = new MCPLoggingService();
    this.permissionService = new MCPPermissionService();

    // Register default services
    await this.serviceRegistry.initialize();
  }

  /**
   * Execute a single MCP command
   */
  async executeCommand(
    command: MCPCommand,
    context: MCPExecutionContext = {}
  ): Promise<MCPResponse> {
    const startTime = Date.now();
    const correlationId = context.correlationId || this.generateCorrelationId();

    try {
      // Log command start
      await this.loggingService.logCommandStart(command, context, correlationId);

      // Validate command structure
      const validatedCommand = await this.validationService.validateCommand(command);

      // Get or create session
      const session = await this.getOrCreateSession(context);

      // Get agent
      const agent = await this.getAgent(context.agentId, session);

      // Check permissions
      await this.permissionService.checkPermissions(validatedCommand, agent, session);

      // Execute command through engine
      const result = await this.engine.executeCommand(
        validatedCommand,
        agent,
        session.id
      );

      // Log successful execution
      await this.loggingService.logCommandSuccess(
        command,
        result,
        context,
        correlationId,
        Date.now() - startTime
      );

      return result;

    } catch (error) {
      // Log error
      await this.loggingService.logCommandError(
        command,
        error,
        context,
        correlationId,
        Date.now() - startTime
      );

      // Format error response
      return this.formatErrorResponse(command, error, correlationId);
    }
  }

  /**
   * Execute multiple commands in batch
   */
  async executeBatch(
    commands: MCPCommand[],
    options: MCPBatchOptions = {}
  ): Promise<MCPResponse[]> {
    const {
      stopOnError = false,
      parallel = false,
      maxConcurrency = 5
    } = options;

    if (parallel) {
      return this.executeBatchParallel(commands, options, maxConcurrency);
    } else {
      return this.executeBatchSequential(commands, options, stopOnError);
    }
  }

  /**
   * Stream command execution with real-time updates
   */
  async *streamCommand(
    command: MCPCommand,
    context: MCPExecutionContext = {}
  ): AsyncGenerator<{ type: 'progress' | 'result' | 'error'; data: any }> {
    const correlationId = context.correlationId || this.generateCorrelationId();

    try {
      yield {
        type: 'progress',
        data: {
          status: 'starting',
          command: `${command.action}:${command.targetType}:${command.targetId}`,
          timestamp: new Date().toISOString(),
          correlationId
        }
      };

      // Use engine's streaming capability
      const stream = this.engine.streamCommand(command);

      for await (const chunk of stream) {
        yield chunk;
      }

    } catch (error) {
      yield {
        type: 'error',
        data: this.formatErrorResponse(command, error, correlationId)
      };
    }
  }

  /**
   * Get available tools for agent/session
   */
  async getAvailableTools(context: MCPExecutionContext): Promise<MCPToolInfo[]> {
    const session = await this.getOrCreateSession(context);
    const agent = await this.getAgent(context.agentId, session);

    return this.serviceRegistry.getAvailableTools(agent, session);
  }

  /**
   * Get available resources for agent/session
   */
  async getAvailableResources(context: MCPExecutionContext): Promise<MCPResourceInfo[]> {
    const session = await this.getOrCreateSession(context);
    const agent = await this.getAgent(context.agentId, session);

    return this.serviceRegistry.getAvailableResources(agent, session);
  }

  /**
   * Get system status
   */
  async getSystemStatus(): Promise<MCPSystemStatus> {
    const uptime = Date.now() - this.startTime.getTime();
    
    return {
      engine: {
        status: 'healthy',
        uptime,
        version: '1.0.0'
      },
      services: await this.serviceRegistry.getServiceStatus(),
      agents: await this.agentManager.getAgentStats(),
      sessions: await this.sessionManager.getSessionStats(),
      performance: await this.loggingService.getPerformanceMetrics()
    };
  }

  /**
   * Get command execution history
   */
  async getCommandHistory(options: {
    limit: number;
    offset: number;
    sessionId?: string;
    agentId?: string;
    userId?: string;
  }): Promise<any[]> {
    return this.loggingService.getCommandHistory(options);
  }

  // Private helper methods
  private async executeBatchSequential(
    commands: MCPCommand[],
    options: MCPBatchOptions,
    stopOnError: boolean
  ): Promise<MCPResponse[]> {
    const results: MCPResponse[] = [];

    for (const command of commands) {
      try {
        const result = await this.executeCommand(command, options);
        results.push(result);

        if (!result.success && stopOnError) {
          break;
        }
      } catch (error) {
        const errorResponse = this.formatErrorResponse(command, error);
        results.push(errorResponse);

        if (stopOnError) {
          break;
        }
      }
    }

    return results;
  }

  private async executeBatchParallel(
    commands: MCPCommand[],
    options: MCPBatchOptions,
    maxConcurrency: number
  ): Promise<MCPResponse[]> {
    const results: MCPResponse[] = [];
    const executing: Promise<MCPResponse>[] = [];

    for (let i = 0; i < commands.length; i += maxConcurrency) {
      const batch = commands.slice(i, i + maxConcurrency);
      
      const batchPromises = batch.map(command =>
        this.executeCommand(command, options).catch(error =>
          this.formatErrorResponse(command, error)
        )
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  private async getOrCreateSession(context: MCPExecutionContext): Promise<Session> {
    if (context.sessionId) {
      const session = await this.sessionManager.getSession(context.sessionId);
      if (session) {
        return session;
      }
    }

    return this.sessionManager.createSession({
      agentId: context.agentId,
      userId: context.userId,
      metadata: {
        userAgent: context.userAgent,
        ip: context.ip,
        correlationId: context.correlationId
      }
    });
  }

  private async getAgent(agentId?: string, session?: Session): Promise<Agent> {
    if (agentId) {
      const agent = await this.agentManager.getAgent(agentId);
      if (agent) {
        return agent;
      }
    }

    // Return default system agent
    return this.agentManager.getSystemAgent();
  }

  private formatErrorResponse(
    command: MCPCommand,
    error: any,
    correlationId?: string
  ): MCPResponse {
    const mcpError: MCPError = {
      code: error.code || 'EXECUTION_ERROR',
      message: error.message || 'Command execution failed',
      details: error.details || error.stack,
      stack: error.stack
    };

    return {
      success: false,
      command: `${command.action}:${command.targetType}:${command.targetId}`,
      error: mcpError,
      metadata: {
        timestamp: new Date().toISOString(),
        correlationId
      }
    };
  }

  private generateCorrelationId(): string {
    return `mcp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

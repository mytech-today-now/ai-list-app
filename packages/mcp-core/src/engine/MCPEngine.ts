/**
 * Main MCP Engine - Orchestrates command processing
 * SemanticType: MCPEngine
 * ExtensibleByAI: true
 * AIUseCases: ["Command orchestration", "Plugin management", "Error handling"]
 */

import {
  MCPCommand,
  MCPResponse,
  MCPError,
  Agent,
  MCPValidationError,
  MCPExecutionError,
  MCPPermissionError,
} from '@ai-todo/shared-types';

import { CommandParser } from '../parser/CommandParser';
import { CommandValidator } from '../validator/CommandValidator';
import { CommandExecutor } from '../executor/CommandExecutor';
import { ActionLogger } from '../logger/ActionLogger';
import { SessionManager } from '../modules/SessionManager';
import { MemoryCache } from '../modules/MemoryCache';
import { ToolRegistry } from '../modules/ToolRegistry';
import { StateSyncEngine } from '../modules/StateSyncEngine';

export interface MCPEngineConfig {
  enableLogging?: boolean;
  enableValidation?: boolean;
  enablePermissions?: boolean;
  maxExecutionTime?: number; // in milliseconds
  cacheSize?: number;
  apiUrl?: string;
  enableRealtime?: boolean;
  sessionTimeout?: number;
}

export class MCPEngine {
  private parser: CommandParser;
  private validator: CommandValidator;
  private executor: CommandExecutor;
  private logger: ActionLogger;
  private sessionManager: SessionManager;
  private memoryCache: MemoryCache;
  private toolRegistry: ToolRegistry;
  private stateSyncEngine: StateSyncEngine;
  private config: Required<MCPEngineConfig>;

  constructor(config: MCPEngineConfig = {}) {
    this.config = {
      enableLogging: true,
      enableValidation: true,
      enablePermissions: true,
      maxExecutionTime: 30000, // 30 seconds
      cacheSize: 1000,
      apiUrl: '/api',
      enableRealtime: true,
      sessionTimeout: 30 * 60 * 1000, // 30 minutes
      ...config,
    };

    // Initialize core components
    this.parser = new CommandParser();
    this.validator = new CommandValidator();
    this.executor = new CommandExecutor();
    this.logger = new ActionLogger();

    // Initialize MCP modules
    this.sessionManager = new SessionManager({
      defaultExpirationMinutes: this.config.sessionTimeout! / (60 * 1000),
      enableSessionExtension: true
    });
    this.memoryCache = new MemoryCache(this.config.cacheSize);
    this.toolRegistry = new ToolRegistry();
    this.stateSyncEngine = new StateSyncEngine({
      syncInterval: this.config.enableRealtime ? 1000 : 5000
    });

    // Wire up dependencies
    this.executor.setModules({
      sessionManager: this.sessionManager,
      memoryCache: this.memoryCache,
      toolRegistry: this.toolRegistry,
      stateSyncEngine: this.stateSyncEngine,
    });
  }

  /**
   * Initialize the MCP Engine
   */
  async initialize(): Promise<void> {
    // Initialize modules if needed
    // This is where you could load configuration, connect to databases, etc.
    console.log('MCP Engine initialized successfully');
  }

  /**
   * Execute an MCP command (supports both string and object formats)
   */
  async executeCommand(
    command: string | MCPCommand,
    agent?: Agent,
    sessionId?: string
  ): Promise<MCPResponse> {
    const startTime = Date.now();
    let parsedCommand: MCPCommand;
    const commandString = typeof command === 'string' ? command : this.commandToString(command);

    try {
      // Parse command (if string) or use provided command object
      if (typeof command === 'string') {
        parsedCommand = this.parser.parse(command);
      } else {
        parsedCommand = { ...command };
      }

      parsedCommand.sessionId = sessionId;
      parsedCommand.agentId = agent?.id;
      parsedCommand.timestamp = new Date().toISOString();

      // Validate command
      if (this.config.enableValidation) {
        await this.validator.validate(parsedCommand);
      }

      // Check permissions
      if (this.config.enablePermissions && agent) {
        this.checkPermissions(parsedCommand, agent);
      }

      // Execute with timeout
      const result = await this.executeWithTimeout(parsedCommand);

      const response: MCPResponse = {
        success: true,
        command: commandString,
        result,
        metadata: {
          executionTime: Date.now() - startTime,
          agent: agent?.name,
          timestamp: new Date().toISOString(),
        },
      };

      // Log successful execution
      if (this.config.enableLogging) {
        await this.logger.logAction({
          command: commandString,
          action: parsedCommand.action,
          targetType: parsedCommand.targetType,
          targetId: parsedCommand.targetId,
          agentId: agent?.id,
          parameters: parsedCommand.parameters,
          result,
          success: true,
          executionTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          sessionId,
        });
      }

      return response;
    } catch (error) {
      const mcpError = this.handleError(error);
      const response: MCPResponse = {
        success: false,
        command: commandString,
        error: mcpError,
        metadata: {
          executionTime: Date.now() - startTime,
          agent: agent?.name,
          timestamp: new Date().toISOString(),
        },
      };

      // Log failed execution
      if (this.config.enableLogging && parsedCommand!) {
        await this.logger.logAction({
          command: commandString,
          action: parsedCommand.action,
          targetType: parsedCommand.targetType,
          targetId: parsedCommand.targetId,
          agentId: agent?.id,
          parameters: parsedCommand.parameters,
          success: false,
          errorMessage: mcpError.message,
          executionTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          sessionId,
        });
      }

      return response;
    }
  }

  /**
   * Execute command with timeout
   */
  private async executeWithTimeout(command: MCPCommand): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new MCPExecutionError('Command execution timeout'));
      }, this.config.maxExecutionTime);

      this.executor
        .execute(command)
        .then(result => {
          clearTimeout(timeout);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  /**
   * Check agent permissions for command
   */
  private checkPermissions(command: MCPCommand, agent: Agent): void {
    if (!agent.permissions.includes(command.action)) {
      throw new MCPPermissionError(
        `Agent ${agent.name} does not have permission to perform ${command.action}`,
        command.action
      );
    }
  }

  /**
   * Handle and normalize errors
   */
  private handleError(error: unknown): MCPError {
    if (error instanceof MCPValidationError) {
      return {
        code: 'VALIDATION_ERROR',
        message: error.message,
        details: error.field,
      };
    }

    if (error instanceof MCPExecutionError) {
      return {
        code: 'EXECUTION_ERROR',
        message: error.message,
        details: error.command,
      };
    }

    if (error instanceof MCPPermissionError) {
      return {
        code: 'PERMISSION_ERROR',
        message: error.message,
        details: error.requiredPermission,
      };
    }

    if (error instanceof Error) {
      return {
        code: 'UNKNOWN_ERROR',
        message: error.message,
        stack: error.stack,
      };
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: 'An unknown error occurred',
      details: String(error),
    };
  }

  /**
   * Convert command object to string format
   */
  private commandToString(command: MCPCommand): string {
    const params = command.parameters ? JSON.stringify(command.parameters) : '{}';
    return `${command.action}:${command.targetType}:${command.targetId}${params}`;
  }

  /**
   * Discover available tools for an agent
   */
  async discoverTools(agent?: Agent): Promise<any[]> {
    if (agent) {
      return this.toolRegistry.getAgentTools(agent);
    }
    return this.toolRegistry.getTools({ enabled: true });
  }

  /**
   * Get available resources
   */
  async discoverResources(): Promise<any[]> {
    // This would typically query the resource registry
    // For now, return empty array as placeholder
    return [];
  }

  /**
   * Stream command execution (for real-time updates)
   */
  async *streamCommand(
    command: string | MCPCommand,
    agent?: Agent,
    sessionId?: string
  ): AsyncGenerator<{ type: 'progress' | 'result' | 'error'; data: any }> {
    try {
      yield { type: 'progress', data: { status: 'starting', timestamp: new Date().toISOString() } };

      const result = await this.executeCommand(command, agent, sessionId);

      yield { type: 'progress', data: { status: 'completed', timestamp: new Date().toISOString() } };
      yield { type: 'result', data: result };
    } catch (error) {
      yield { type: 'error', data: this.handleError(error) };
    }
  }

  /**
   * Get engine status and health
   */
  getStatus() {
    return {
      status: 'healthy',
      uptime: process.uptime(),
      config: this.config,
      modules: {
        sessionManager: this.sessionManager.getStatus(),
        memoryCache: this.memoryCache.getStatus(),
        toolRegistry: this.toolRegistry.getStatus(),
        stateSyncEngine: this.stateSyncEngine.getStatus(),
      },
    };
  }

  /**
   * Shutdown engine gracefully
   */
  async shutdown(): Promise<void> {
    await this.stateSyncEngine.shutdown();
    await this.logger.flush();
    this.memoryCache.clear();
  }
}

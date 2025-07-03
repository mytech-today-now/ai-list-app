/**
 * MCP Repository Service - Bridge between MCP Engine and Repository Layer
 * SemanticType: MCPRepositoryService
 * ExtensibleByAI: true
 * AIUseCases: ["Repository command execution", "Data validation", "Transaction management"]
 */

import { MCPCommand, MCPResponse, MCPError } from '@ai-todo/shared-types';
import { mcpRepositoryServer, MCPOperationResult } from '../db/mcp-repository-extensions';
import { getTransactionManager, TransactionOptions } from '../db/transaction-manager';
import { z } from 'zod';

/**
 * MCP Repository command schema validation
 */
const MCPRepositoryCommandSchema = z.object({
  action: z.enum(['create', 'read', 'update', 'delete', 'query', 'execute_tool', 'get_resource']),
  targetType: z.string(),
  targetId: z.string(),
  parameters: z.record(z.any()).optional(),
  options: z.object({
    transaction: z.boolean().optional(),
    isolationLevel: z.enum(['READ_UNCOMMITTED', 'READ_COMMITTED', 'REPEATABLE_READ', 'SERIALIZABLE']).optional(),
    timeout: z.number().optional(),
    retryAttempts: z.number().optional()
  }).optional()
});

/**
 * Repository operation mapping
 */
interface RepositoryOperation {
  repository: string;
  operation: string;
  params: any;
  requiresTransaction?: boolean;
}

/**
 * MCP Repository Service for handling repository operations via MCP commands
 */
export class MCPRepositoryService {
  private transactionManager = getTransactionManager();

  /**
   * Execute MCP command against repository layer
   */
  async executeCommand(command: MCPCommand): Promise<MCPResponse> {
    try {
      // Validate command structure
      const validatedCommand = MCPRepositoryCommandSchema.parse(command);
      
      // Parse repository operation from command
      const operation = this.parseRepositoryOperation(validatedCommand);
      
      // Execute with or without transaction
      const result = await this.executeOperation(operation, validatedCommand.options);
      
      return {
        success: true,
        result: result.data,
        metadata: {
          operation: `${operation.repository}.${operation.operation}`,
          timestamp: new Date().toISOString(),
          executionTime: result.metadata.executionTime,
          recordCount: result.metadata.recordCount
        }
      };
    } catch (error) {
      return this.handleError(error, command);
    }
  }

  /**
   * Parse MCP command into repository operation
   */
  private parseRepositoryOperation(command: MCPCommand): RepositoryOperation {
    const { action, targetType, targetId, parameters } = command;

    switch (action) {
      case 'create':
        return {
          repository: targetType,
          operation: `${targetType}.create`,
          params: { data: parameters },
          requiresTransaction: true
        };

      case 'read':
        if (targetId === 'all') {
          return {
            repository: targetType,
            operation: `${targetType}.find`,
            params: parameters || {}
          };
        } else {
          return {
            repository: targetType,
            operation: `${targetType}.findById`,
            params: { id: targetId, ...parameters }
          };
        }

      case 'update':
        return {
          repository: targetType,
          operation: `${targetType}.update`,
          params: { id: targetId, data: parameters },
          requiresTransaction: true
        };

      case 'delete':
        return {
          repository: targetType,
          operation: `${targetType}.delete`,
          params: { id: targetId },
          requiresTransaction: true
        };

      case 'query':
        return {
          repository: targetType,
          operation: `${targetType}.find`,
          params: parameters || {}
        };

      case 'execute_tool':
        return {
          repository: targetType,
          operation: targetId, // Tool name
          params: parameters || {}
        };

      case 'get_resource':
        return {
          repository: targetType,
          operation: 'get_resource',
          params: { uri: targetId }
        };

      default:
        throw new Error(`Unsupported action: ${action}`);
    }
  }

  /**
   * Execute repository operation with optional transaction
   */
  private async executeOperation(
    operation: RepositoryOperation,
    options?: MCPCommand['options']
  ): Promise<MCPOperationResult> {
    const useTransaction = options?.transaction || operation.requiresTransaction;

    if (useTransaction) {
      return this.executeWithTransaction(operation, options);
    } else {
      return this.executeDirectly(operation);
    }
  }

  /**
   * Execute operation within transaction
   */
  private async executeWithTransaction(
    operation: RepositoryOperation,
    options?: MCPCommand['options']
  ): Promise<MCPOperationResult> {
    const transactionOptions: TransactionOptions = {
      isolationLevel: options?.isolationLevel,
      timeout: options?.timeout,
      retryAttempts: options?.retryAttempts || 3
    };

    const result = await this.transactionManager.executeTransaction(
      async (db, context) => {
        if (operation.operation === 'get_resource') {
          return mcpRepositoryServer.getResource(operation.repository, operation.params.uri);
        } else {
          return mcpRepositoryServer.executeTool(
            operation.repository,
            operation.operation,
            operation.params
          );
        }
      },
      transactionOptions
    );

    if (!result.success) {
      throw new Error(result.error?.message || 'Transaction failed');
    }

    return result.result as MCPOperationResult;
  }

  /**
   * Execute operation directly without transaction
   */
  private async executeDirectly(operation: RepositoryOperation): Promise<MCPOperationResult> {
    if (operation.operation === 'get_resource') {
      return mcpRepositoryServer.getResource(operation.repository, operation.params.uri);
    } else {
      return mcpRepositoryServer.executeTool(
        operation.repository,
        operation.operation,
        operation.params
      );
    }
  }

  /**
   * Get available repositories and their capabilities
   */
  async getCapabilities(): Promise<{
    repositories: string[];
    tools: Array<{ name: string; repository: string; description: string }>;
    resources: Array<{ uri: string; repository: string; name: string; description: string }>;
  }> {
    const tools = mcpRepositoryServer.getAllTools();
    const resources = mcpRepositoryServer.getAllResources();
    
    const repositories = Array.from(new Set([
      ...tools.map(t => t.repository),
      ...resources.map(r => r.repository)
    ]));

    return {
      repositories,
      tools: tools.map(t => ({
        name: t.name,
        repository: t.repository,
        description: t.description
      })),
      resources: resources.map(r => ({
        uri: r.uri,
        repository: r.repository,
        name: r.name,
        description: r.description
      }))
    };
  }

  /**
   * Validate data against repository schema
   */
  async validateData(repository: string, data: any): Promise<{ valid: boolean; errors?: string[] }> {
    try {
      const schemaResult = await mcpRepositoryServer.getResource(repository, `${repository}://schema`);
      
      if (!schemaResult.success) {
        return { valid: false, errors: ['Schema not available'] };
      }

      // Basic validation - in a real implementation, you'd use a proper schema validator
      const schema = schemaResult.data;
      const errors: string[] = [];

      if (schema.properties) {
        for (const [field, fieldSchema] of Object.entries(schema.properties as any)) {
          if (fieldSchema.required && !(field in data)) {
            errors.push(`Required field '${field}' is missing`);
          }
        }
      }

      return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
    } catch (error) {
      return { valid: false, errors: ['Validation failed'] };
    }
  }

  /**
   * Handle errors and convert to MCP response format
   */
  private handleError(error: any, command: MCPCommand): MCPResponse {
    const mcpError: MCPError = {
      code: 'REPOSITORY_ERROR',
      message: error instanceof Error ? error.message : 'Unknown repository error',
      details: `Failed to execute ${command.action} on ${command.targetType}:${command.targetId}`
    };

    if (error instanceof z.ZodError) {
      mcpError.code = 'VALIDATION_ERROR';
      mcpError.message = 'Command validation failed';
      mcpError.details = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    }

    return {
      success: false,
      error: mcpError,
      metadata: {
        operation: `${command.targetType}.${command.action}`,
        timestamp: new Date().toISOString(),
        executionTime: 0
      }
    };
  }
}

/**
 * Global MCP Repository Service instance
 */
export const mcpRepositoryService = new MCPRepositoryService();

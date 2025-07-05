/**
 * MCP Validation Service - Validates MCP commands and parameters
 * SemanticType: MCPValidationService
 * ExtensibleByAI: true
 * AIUseCases: ["Command validation", "Schema enforcement", "Business rule validation"]
 */

import { MCPCommand, MCPAction, MCPTargetType } from '@ai-todo/shared-types';
import { z } from 'zod';

export class MCPValidationService {
  private commandSchema = z.object({
    action: z.enum([
      'create', 'read', 'update', 'delete',
      'execute', 'reorder', 'rename', 'status', 'mark_done',
      'rollback', 'plan', 'train', 'deploy', 'test',
      'monitor', 'optimize', 'debug', 'log'
    ] as const),
    targetType: z.enum([
      'list', 'item', 'agent', 'system',
      'batch', 'workflow', 'session'
    ] as const),
    targetId: z.string().min(1),
    parameters: z.record(z.unknown()).optional(),
    timestamp: z.string().optional(),
    sessionId: z.string().optional(),
    agentId: z.string().optional()
  });

  async validateCommand(command: MCPCommand): Promise<MCPCommand> {
    // Basic schema validation
    const validatedCommand = this.commandSchema.parse(command);

    // Business rule validation
    await this.validateBusinessRules(validatedCommand);

    // Parameter validation
    await this.validateParameters(validatedCommand);

    return validatedCommand;
  }

  private async validateBusinessRules(command: MCPCommand): Promise<void> {
    // Validate action-target combinations
    this.validateActionTargetCombination(command.action, command.targetType);

    // Validate target ID format
    this.validateTargetIdFormat(command.targetId, command.targetType);

    // Validate timestamps
    if (command.timestamp) {
      this.validateTimestamp(command.timestamp);
    }
  }

  private validateActionTargetCombination(action: MCPAction, targetType: MCPTargetType): void {
    const validCombinations: Record<MCPAction, MCPTargetType[]> = {
      create: ['list', 'item', 'agent', 'session'],
      read: ['list', 'item', 'agent', 'system', 'session'],
      update: ['list', 'item', 'agent', 'session'],
      delete: ['list', 'item', 'agent', 'session'],
      execute: ['list', 'item', 'batch', 'workflow', 'system'],
      reorder: ['list', 'item'],
      rename: ['list', 'item'],
      status: ['list', 'item', 'agent', 'system', 'session'],
      mark_done: ['item'],
      rollback: ['list', 'item', 'batch'],
      plan: ['list', 'workflow', 'system'],
      train: ['agent', 'system'],
      deploy: ['system'],
      test: ['list', 'item', 'system'],
      monitor: ['system', 'agent', 'session'],
      optimize: ['system', 'list'],
      debug: ['system', 'agent'],
      log: ['system', 'agent', 'session']
    };

    const validTargets = validCombinations[action];
    if (!validTargets || !validTargets.includes(targetType)) {
      throw new Error(`Invalid action-target combination: ${action} cannot be performed on ${targetType}`);
    }
  }

  private validateTargetIdFormat(targetId: string, targetType: MCPTargetType): void {
    if (!targetId || targetId.trim().length === 0) {
      throw new Error('Target ID cannot be empty');
    }

    if (targetId.length > 255) {
      throw new Error('Target ID exceeds maximum length of 255 characters');
    }

    // Format validation based on target type
    switch (targetType) {
      case 'list':
      case 'item':
        if (!/^[a-zA-Z0-9_-]+$/.test(targetId)) {
          throw new Error(`Invalid ${targetType} ID format`);
        }
        break;
      case 'agent':
        if (!/^(agent_[a-zA-Z0-9_-]+|system)$/.test(targetId)) {
          throw new Error('Invalid agent ID format');
        }
        break;
      case 'session':
        if (!/^(session_)?[a-zA-Z0-9_-]+$/.test(targetId)) {
          throw new Error('Invalid session ID format');
        }
        break;
    }
  }

  private validateTimestamp(timestamp: string): void {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid timestamp format');
    }

    // Check if timestamp is not too far in the future
    const now = new Date();
    const maxFuture = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    if (date > maxFuture) {
      throw new Error('Timestamp cannot be more than 24 hours in the future');
    }
  }

  private async validateParameters(command: MCPCommand): Promise<void> {
    if (!command.parameters) {
      return;
    }

    // Validate parameter size
    const paramString = JSON.stringify(command.parameters);
    if (paramString.length > 10000) {
      throw new Error('Parameters exceed maximum size limit');
    }

    // Action-specific parameter validation
    switch (command.action) {
      case 'create':
        await this.validateCreateParameters(command);
        break;
      case 'update':
        await this.validateUpdateParameters(command);
        break;
      case 'execute':
        await this.validateExecuteParameters(command);
        break;
    }
  }

  private async validateCreateParameters(command: MCPCommand): Promise<void> {
    const params = command.parameters!;

    switch (command.targetType) {
      case 'list':
        if (!params.title || typeof params.title !== 'string') {
          throw new Error('List creation requires a title parameter');
        }
        if (params.title.length > 255) {
          throw new Error('List title exceeds maximum length');
        }
        break;
      case 'item':
        if (!params.content || typeof params.content !== 'string') {
          throw new Error('Item creation requires a content parameter');
        }
        if (params.content.length > 1000) {
          throw new Error('Item content exceeds maximum length');
        }
        if (!params.listId || typeof params.listId !== 'string') {
          throw new Error('Item creation requires a listId parameter');
        }
        break;
    }
  }

  private async validateUpdateParameters(command: MCPCommand): Promise<void> {
    const params = command.parameters!;

    // At least one field should be provided for update
    if (Object.keys(params).length === 0) {
      throw new Error('Update requires at least one parameter');
    }

    // Validate specific fields if present
    if (params.title && typeof params.title === 'string' && params.title.length > 255) {
      throw new Error('Title exceeds maximum length');
    }

    if (params.content && typeof params.content === 'string' && params.content.length > 1000) {
      throw new Error('Content exceeds maximum length');
    }
  }

  private async validateExecuteParameters(command: MCPCommand): Promise<void> {
    // Execute commands may have specific parameter requirements
    // Add validation based on your business logic
  }
}

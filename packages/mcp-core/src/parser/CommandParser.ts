/**
 * MCP Command Parser - Parses command strings into structured commands
 * SemanticType: CommandParser
 * ExtensibleByAI: true
 * AIUseCases: ["Command parsing", "Syntax validation", "Parameter extraction"]
 */

import {
  MCPCommand,
  MCPAction,
  MCPTargetType,
  MCPValidationError,
} from '@ai-todo/shared-types';

export class CommandParser {
  private static readonly COMMAND_PATTERN = 
    /^([a-z_]+):([a-z_]+):([a-zA-Z0-9_-]+)(?:\{(.+)\})?$/;

  /**
   * Parse a command string into an MCPCommand object
   * Format: action:target_type:target_id{parameters}
   */
  parse(commandString: string): MCPCommand {
    if (!commandString || typeof commandString !== 'string') {
      throw new MCPValidationError('Command string is required');
    }

    const trimmed = commandString.trim();
    if (!trimmed) {
      throw new MCPValidationError('Command string cannot be empty');
    }

    const match = trimmed.match(CommandParser.COMMAND_PATTERN);
    if (!match) {
      throw new MCPValidationError(
        'Invalid command format. Expected: action:target_type:target_id{parameters}'
      );
    }

    const [, actionStr, targetTypeStr, targetId, parametersStr] = match;

    // Validate action
    const action = this.validateAction(actionStr);
    
    // Validate target type
    const targetType = this.validateTargetType(targetTypeStr);
    
    // Validate target ID
    this.validateTargetId(targetId);
    
    // Parse parameters
    const parameters = this.parseParameters(parametersStr);

    return {
      action,
      targetType,
      targetId,
      parameters,
    };
  }

  /**
   * Validate and normalize action
   */
  private validateAction(actionStr: string): MCPAction {
    const validActions: MCPAction[] = [
      'create', 'read', 'update', 'delete',
      'execute', 'reorder', 'rename', 'status', 'mark_done',
      'rollback', 'plan', 'train', 'deploy', 'test',
      'monitor', 'optimize', 'debug', 'log'
    ];

    if (!validActions.includes(actionStr as MCPAction)) {
      throw new MCPValidationError(
        `Invalid action: ${actionStr}. Valid actions: ${validActions.join(', ')}`
      );
    }

    return actionStr as MCPAction;
  }

  /**
   * Validate and normalize target type
   */
  private validateTargetType(targetTypeStr: string): MCPTargetType {
    const validTargetTypes: MCPTargetType[] = [
      'list', 'item', 'agent', 'system',
      'batch', 'workflow', 'session'
    ];

    if (!validTargetTypes.includes(targetTypeStr as MCPTargetType)) {
      throw new MCPValidationError(
        `Invalid target type: ${targetTypeStr}. Valid types: ${validTargetTypes.join(', ')}`
      );
    }

    return targetTypeStr as MCPTargetType;
  }

  /**
   * Validate target ID
   */
  private validateTargetId(targetId: string): void {
    if (!targetId) {
      throw new MCPValidationError('Target ID is required');
    }

    // Target ID should be alphanumeric with underscores and hyphens
    if (!/^[a-zA-Z0-9_-]+$/.test(targetId)) {
      throw new MCPValidationError(
        'Target ID must contain only alphanumeric characters, underscores, and hyphens'
      );
    }

    if (targetId.length > 255) {
      throw new MCPValidationError('Target ID cannot exceed 255 characters');
    }
  }

  /**
   * Parse parameters JSON string
   */
  private parseParameters(parametersStr?: string): Record<string, unknown> | undefined {
    if (!parametersStr) {
      return undefined;
    }

    try {
      const parsed = JSON.parse(parametersStr);
      
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new MCPValidationError('Parameters must be a JSON object');
      }

      return parsed as Record<string, unknown>;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new MCPValidationError(`Invalid JSON in parameters: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Serialize an MCPCommand back to a command string
   */
  serialize(command: MCPCommand): string {
    const { action, targetType, targetId, parameters } = command;
    
    let commandString = `${action}:${targetType}:${targetId}`;
    
    if (parameters && Object.keys(parameters).length > 0) {
      commandString += `{${JSON.stringify(parameters)}}`;
    } else {
      commandString += '{}';
    }
    
    return commandString;
  }

  /**
   * Validate a complete command object
   */
  validateCommand(command: MCPCommand): void {
    if (!command) {
      throw new MCPValidationError('Command object is required');
    }

    if (!command.action) {
      throw new MCPValidationError('Command action is required');
    }

    if (!command.targetType) {
      throw new MCPValidationError('Command target type is required');
    }

    if (!command.targetId) {
      throw new MCPValidationError('Command target ID is required');
    }

    // Re-validate using the same rules as parsing
    this.validateAction(command.action);
    this.validateTargetType(command.targetType);
    this.validateTargetId(command.targetId);
  }

  /**
   * Extract action and target type from a command string without full parsing
   */
  extractBasicInfo(commandString: string): { action: string; targetType: string } | null {
    const match = commandString.trim().match(/^([a-z_]+):([a-z_]+):/);
    if (!match) {
      return null;
    }

    return {
      action: match[1],
      targetType: match[2],
    };
  }

  /**
   * Check if a command string has valid syntax without throwing errors
   */
  isValidSyntax(commandString: string): boolean {
    try {
      this.parse(commandString);
      return true;
    } catch {
      return false;
    }
  }
}

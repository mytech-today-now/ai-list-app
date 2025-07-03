/**
 * MCP Command Validator - Validates commands against schemas and business rules
 * SemanticType: CommandValidator
 * ExtensibleByAI: true
 * AIUseCases: ["Schema validation", "Business rule enforcement", "Security checks"]
 */

import { z } from 'zod';
import {
  MCPCommand,
  MCPValidationError,
  Priority,
  ListStatus,
  ItemStatus,
} from '@ai-todo/shared-types';

export class CommandValidator {
  private schemas: Map<string, z.ZodSchema> = new Map();

  constructor() {
    this.initializeSchemas();
  }

  /**
   * Validate an MCP command
   */
  async validate(command: MCPCommand): Promise<void> {
    // Basic structure validation
    this.validateBasicStructure(command);

    // Action-specific parameter validation
    await this.validateParameters(command);

    // Business rule validation
    await this.validateBusinessRules(command);
  }

  /**
   * Validate basic command structure
   */
  private validateBasicStructure(command: MCPCommand): void {
    if (!command.action) {
      throw new MCPValidationError('Command action is required');
    }

    if (!command.targetType) {
      throw new MCPValidationError('Command target type is required');
    }

    if (!command.targetId) {
      throw new MCPValidationError('Command target ID is required');
    }

    // Validate timestamp if provided
    if (command.timestamp && !this.isValidISO8601(command.timestamp)) {
      throw new MCPValidationError('Invalid timestamp format. Use ISO 8601');
    }
  }

  /**
   * Validate command parameters based on action and target type
   */
  private async validateParameters(command: MCPCommand): Promise<void> {
    const schemaKey = `${command.action}:${command.targetType}`;
    const schema = this.schemas.get(schemaKey);

    if (schema && command.parameters) {
      try {
        await schema.parseAsync(command.parameters);
      } catch (error) {
        if (error instanceof z.ZodError) {
          const issues = error.issues.map(issue => 
            `${issue.path.join('.')}: ${issue.message}`
          ).join(', ');
          throw new MCPValidationError(`Parameter validation failed: ${issues}`);
        }
        throw error;
      }
    }
  }

  /**
   * Validate business rules
   */
  private async validateBusinessRules(command: MCPCommand): Promise<void> {
    // Target ID length limits
    if (command.targetId.length > 255) {
      throw new MCPValidationError('Target ID cannot exceed 255 characters');
    }

    // Action-specific business rules
    switch (command.action) {
      case 'create':
        await this.validateCreateRules(command);
        break;
      case 'update':
        await this.validateUpdateRules(command);
        break;
      case 'delete':
        await this.validateDeleteRules(command);
        break;
      case 'execute':
        await this.validateExecuteRules(command);
        break;
      default:
        // No specific rules for other actions
        break;
    }
  }

  /**
   * Initialize validation schemas for different command types
   */
  private initializeSchemas(): void {
    // Create list schema
    this.schemas.set('create:list', z.object({
      title: z.string().min(1).max(500),
      description: z.string().max(2000).optional(),
      parentListId: z.string().max(255).optional(),
      priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    }));

    // Create item schema
    this.schemas.set('create:item', z.object({
      listId: z.string().min(1).max(255),
      title: z.string().min(1).max(500),
      description: z.string().max(2000).optional(),
      priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
      dueDate: z.string().datetime().optional(),
      estimatedDuration: z.number().int().min(1).max(10080).optional(), // max 1 week in minutes
      tags: z.array(z.string().max(50)).max(20).optional(),
      assignedTo: z.string().max(255).optional(),
    }));

    // Update list schema
    this.schemas.set('update:list', z.object({
      title: z.string().min(1).max(500).optional(),
      description: z.string().max(2000).optional(),
      priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
      status: z.enum(['active', 'completed', 'archived', 'deleted']).optional(),
    }));

    // Update item schema
    this.schemas.set('update:item', z.object({
      title: z.string().min(1).max(500).optional(),
      description: z.string().max(2000).optional(),
      priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
      status: z.enum(['pending', 'in_progress', 'completed', 'cancelled', 'blocked']).optional(),
      dueDate: z.string().datetime().optional(),
      estimatedDuration: z.number().int().min(1).max(10080).optional(),
      actualDuration: z.number().int().min(1).max(10080).optional(),
      tags: z.array(z.string().max(50)).max(20).optional(),
      assignedTo: z.string().max(255).optional(),
    }));

    // Reorder schema
    this.schemas.set('reorder:item', z.object({
      position: z.number().int().min(0),
    }));

    this.schemas.set('reorder:list', z.object({
      position: z.number().int().min(0),
    }));

    // Status query schema
    this.schemas.set('status:list', z.object({
      recursive: z.boolean().optional(),
      includeItems: z.boolean().optional(),
    }));

    this.schemas.set('status:item', z.object({
      includeDependencies: z.boolean().optional(),
    }));

    // Execute schema
    this.schemas.set('execute:list', z.object({
      parallel: z.boolean().optional(),
      maxConcurrency: z.number().int().min(1).max(10).optional(),
    }));

    // Agent creation schema
    this.schemas.set('create:agent', z.object({
      name: z.string().min(1).max(255),
      role: z.enum(['reader', 'executor', 'planner', 'admin']),
      permissions: z.array(z.string()).min(1),
      configuration: z.record(z.unknown()).optional(),
    }));
  }

  /**
   * Validate create command rules
   */
  private async validateCreateRules(command: MCPCommand): Promise<void> {
    if (command.targetType === 'list' && command.parameters?.parentListId) {
      // Validate parent list exists and prevent circular references
      // This would typically involve a database check
    }

    if (command.targetType === 'item' && command.parameters?.dependencies) {
      // Validate dependency items exist and prevent circular dependencies
      const deps = command.parameters.dependencies as string[];
      if (deps.includes(command.targetId)) {
        throw new MCPValidationError('Item cannot depend on itself');
      }
    }
  }

  /**
   * Validate update command rules
   */
  private async validateUpdateRules(command: MCPCommand): Promise<void> {
    if (command.targetType === 'item' && command.parameters?.status === 'completed') {
      // Could validate that all dependencies are completed
    }
  }

  /**
   * Validate delete command rules
   */
  private async validateDeleteRules(command: MCPCommand): Promise<void> {
    if (command.targetType === 'list') {
      // Could validate that list is empty or force parameter is provided
    }
  }

  /**
   * Validate execute command rules
   */
  private async validateExecuteRules(command: MCPCommand): Promise<void> {
    if (command.targetType === 'list') {
      // Could validate that list has executable items
    }
  }

  /**
   * Check if string is valid ISO 8601 datetime
   */
  private isValidISO8601(dateString: string): boolean {
    try {
      const date = new Date(dateString);
      return date.toISOString() === dateString;
    } catch {
      return false;
    }
  }

  /**
   * Add custom validation schema
   */
  addSchema(actionTarget: string, schema: z.ZodSchema): void {
    this.schemas.set(actionTarget, schema);
  }

  /**
   * Remove validation schema
   */
  removeSchema(actionTarget: string): void {
    this.schemas.delete(actionTarget);
  }

  /**
   * Get all registered schemas
   */
  getSchemas(): string[] {
    return Array.from(this.schemas.keys());
  }
}

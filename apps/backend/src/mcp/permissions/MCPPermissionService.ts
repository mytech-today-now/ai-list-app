/**
 * MCP Permission Service - Handles authorization and permission checking
 * SemanticType: MCPPermissionService
 * ExtensibleByAI: true
 * AIUseCases: ["Authorization", "Permission validation", "Access control"]
 */

import { MCPCommand, Agent, Session } from '@ai-todo/shared-types';

export interface PermissionRule {
  action: string;
  targetType: string;
  requiredPermissions: string[];
  requiredCapabilities?: string[];
  conditions?: (command: MCPCommand, agent: Agent, session?: Session) => boolean;
}

export class MCPPermissionService {
  private permissionRules: PermissionRule[] = [];

  constructor() {
    this.initializeDefaultRules();
  }

  private initializeDefaultRules(): void {
    // List permissions
    this.addRule({
      action: 'create',
      targetType: 'list',
      requiredPermissions: ['write'],
      requiredCapabilities: ['create_lists']
    });

    this.addRule({
      action: 'read',
      targetType: 'list',
      requiredPermissions: ['read'],
      requiredCapabilities: ['read_lists']
    });

    this.addRule({
      action: 'update',
      targetType: 'list',
      requiredPermissions: ['write'],
      requiredCapabilities: ['update_lists']
    });

    this.addRule({
      action: 'delete',
      targetType: 'list',
      requiredPermissions: ['write', 'admin'],
      requiredCapabilities: ['delete_lists']
    });

    // Item permissions
    this.addRule({
      action: 'create',
      targetType: 'item',
      requiredPermissions: ['write'],
      requiredCapabilities: ['create_items']
    });

    this.addRule({
      action: 'read',
      targetType: 'item',
      requiredPermissions: ['read'],
      requiredCapabilities: ['read_items']
    });

    this.addRule({
      action: 'update',
      targetType: 'item',
      requiredPermissions: ['write'],
      requiredCapabilities: ['update_items']
    });

    this.addRule({
      action: 'delete',
      targetType: 'item',
      requiredPermissions: ['write'],
      requiredCapabilities: ['delete_items']
    });

    this.addRule({
      action: 'mark_done',
      targetType: 'item',
      requiredPermissions: ['write'],
      requiredCapabilities: ['update_items']
    });

    // Agent permissions
    this.addRule({
      action: 'create',
      targetType: 'agent',
      requiredPermissions: ['admin'],
      requiredCapabilities: ['manage_agents']
    });

    this.addRule({
      action: 'read',
      targetType: 'agent',
      requiredPermissions: ['read'],
      requiredCapabilities: ['read_agents']
    });

    this.addRule({
      action: 'update',
      targetType: 'agent',
      requiredPermissions: ['admin'],
      requiredCapabilities: ['manage_agents']
    });

    this.addRule({
      action: 'delete',
      targetType: 'agent',
      requiredPermissions: ['admin'],
      requiredCapabilities: ['manage_agents']
    });

    // System permissions
    this.addRule({
      action: 'status',
      targetType: 'system',
      requiredPermissions: ['read'],
      requiredCapabilities: ['system_status']
    });

    this.addRule({
      action: 'monitor',
      targetType: 'system',
      requiredPermissions: ['read'],
      requiredCapabilities: ['system_monitor']
    });

    this.addRule({
      action: 'debug',
      targetType: 'system',
      requiredPermissions: ['admin'],
      requiredCapabilities: ['system_debug']
    });

    // Workflow permissions
    this.addRule({
      action: 'execute',
      targetType: 'workflow',
      requiredPermissions: ['execute'],
      requiredCapabilities: ['execute_workflows']
    });

    this.addRule({
      action: 'execute',
      targetType: 'batch',
      requiredPermissions: ['execute'],
      requiredCapabilities: ['batch_operations']
    });

    // Session permissions
    this.addRule({
      action: 'read',
      targetType: 'session',
      requiredPermissions: ['read'],
      conditions: (command, agent, session) => {
        // Users can only read their own sessions, admins can read all
        return agent.permissions.includes('admin') || 
               (session && command.targetId === session.id);
      }
    });
  }

  addRule(rule: PermissionRule): void {
    this.permissionRules.push(rule);
  }

  async checkPermissions(
    command: MCPCommand,
    agent: Agent,
    session?: Session
  ): Promise<void> {
    // System agent has all permissions
    if (agent.id === 'system') {
      return;
    }

    // Find applicable rules
    const applicableRules = this.permissionRules.filter(rule =>
      rule.action === command.action && rule.targetType === command.targetType
    );

    if (applicableRules.length === 0) {
      // No specific rules found, check if agent has admin permission
      if (!agent.permissions.includes('admin')) {
        throw new Error(`No permission rules found for ${command.action}:${command.targetType}`);
      }
      return;
    }

    // Check each applicable rule
    for (const rule of applicableRules) {
      try {
        await this.checkRule(rule, command, agent, session);
        return; // If any rule passes, permission is granted
      } catch (error) {
        // Continue to next rule
        continue;
      }
    }

    // If no rules passed, deny permission
    throw new Error(
      `Permission denied: ${agent.name} cannot perform ${command.action} on ${command.targetType}`
    );
  }

  private async checkRule(
    rule: PermissionRule,
    command: MCPCommand,
    agent: Agent,
    session?: Session
  ): Promise<void> {
    // Check required permissions
    const hasRequiredPermissions = rule.requiredPermissions.every(permission =>
      agent.permissions.includes(permission) || agent.permissions.includes('admin')
    );

    if (!hasRequiredPermissions) {
      throw new Error(
        `Missing required permissions: ${rule.requiredPermissions.join(', ')}`
      );
    }

    // Check required capabilities
    if (rule.requiredCapabilities) {
      const hasRequiredCapabilities = rule.requiredCapabilities.every(capability =>
        agent.capabilities?.includes(capability) || 
        agent.capabilities?.includes('all') ||
        agent.permissions.includes('admin')
      );

      if (!hasRequiredCapabilities) {
        throw new Error(
          `Missing required capabilities: ${rule.requiredCapabilities.join(', ')}`
        );
      }
    }

    // Check custom conditions
    if (rule.conditions) {
      const conditionMet = rule.conditions(command, agent, session);
      if (!conditionMet) {
        throw new Error('Custom permission condition not met');
      }
    }
  }

  async getPermissionsForAgent(agent: Agent): Promise<{
    permissions: string[];
    capabilities: string[];
    allowedActions: Array<{ action: string; targetType: string }>;
  }> {
    const allowedActions: Array<{ action: string; targetType: string }> = [];

    // If agent has admin permission, they can do everything
    if (agent.permissions.includes('admin')) {
      return {
        permissions: agent.permissions,
        capabilities: agent.capabilities || [],
        allowedActions: this.permissionRules.map(rule => ({
          action: rule.action,
          targetType: rule.targetType
        }))
      };
    }

    // Check each rule to see what actions are allowed
    for (const rule of this.permissionRules) {
      try {
        // Create a dummy command to test permissions
        const testCommand: MCPCommand = {
          action: rule.action as any,
          targetType: rule.targetType as any,
          targetId: 'test'
        };

        await this.checkRule(rule, testCommand, agent);
        allowedActions.push({
          action: rule.action,
          targetType: rule.targetType
        });
      } catch (error) {
        // Rule doesn't apply to this agent
        continue;
      }
    }

    return {
      permissions: agent.permissions,
      capabilities: agent.capabilities || [],
      allowedActions
    };
  }

  async canPerformAction(
    action: string,
    targetType: string,
    agent: Agent,
    session?: Session
  ): Promise<boolean> {
    try {
      const testCommand: MCPCommand = {
        action: action as any,
        targetType: targetType as any,
        targetId: 'test'
      };

      await this.checkPermissions(testCommand, agent, session);
      return true;
    } catch (error) {
      return false;
    }
  }

  // Permission hierarchy management
  getPermissionHierarchy(): Record<string, string[]> {
    return {
      'admin': ['read', 'write', 'execute', 'delete'],
      'execute': ['read', 'write'],
      'write': ['read'],
      'read': []
    };
  }

  hasPermissionLevel(agent: Agent, requiredLevel: string): boolean {
    const hierarchy = this.getPermissionHierarchy();
    
    // Check if agent has the exact permission
    if (agent.permissions.includes(requiredLevel)) {
      return true;
    }

    // Check if agent has a higher-level permission
    for (const permission of agent.permissions) {
      const impliedPermissions = hierarchy[permission] || [];
      if (impliedPermissions.includes(requiredLevel)) {
        return true;
      }
    }

    return false;
  }

  // Resource-based permissions
  async checkResourcePermission(
    resourceUri: string,
    action: string,
    agent: Agent,
    session?: Session
  ): Promise<void> {
    // Parse resource URI to determine permissions
    const [protocol, resource] = resourceUri.split('://');
    
    switch (protocol) {
      case 'list':
        await this.checkPermissions({
          action: action as any,
          targetType: 'list',
          targetId: resource
        }, agent, session);
        break;
      case 'item':
        await this.checkPermissions({
          action: action as any,
          targetType: 'item',
          targetId: resource
        }, agent, session);
        break;
      case 'system':
        await this.checkPermissions({
          action: action as any,
          targetType: 'system',
          targetId: resource
        }, agent, session);
        break;
      default:
        throw new Error(`Unknown resource protocol: ${protocol}`);
    }
  }
}

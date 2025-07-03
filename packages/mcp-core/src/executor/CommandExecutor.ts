/**
 * MCP Command Executor - Executes validated commands
 * SemanticType: CommandExecutor
 * ExtensibleByAI: true
 * AIUseCases: ["Command execution", "State management", "Result handling"]
 */

import {
  MCPCommand,
  MCPExecutionError,
  TodoList,
  TodoItem,
  Agent,
} from '@ai-todo/shared-types';

import { SessionManager } from '../modules/SessionManager';
import { MemoryCache } from '../modules/MemoryCache';
import { ToolRegistry } from '../modules/ToolRegistry';
import { StateSyncEngine } from '../modules/StateSyncEngine';

export interface ExecutorModules {
  sessionManager: SessionManager;
  memoryCache: MemoryCache;
  toolRegistry: ToolRegistry;
  stateSyncEngine: StateSyncEngine;
}

export interface ExecutorHandler {
  (command: MCPCommand, modules: ExecutorModules): Promise<unknown>;
}

export class CommandExecutor {
  private handlers: Map<string, ExecutorHandler> = new Map();
  private modules?: ExecutorModules;

  constructor() {
    this.initializeHandlers();
  }

  /**
   * Set module dependencies
   */
  setModules(modules: ExecutorModules): void {
    this.modules = modules;
  }

  /**
   * Execute a command
   */
  async execute(command: MCPCommand): Promise<unknown> {
    if (!this.modules) {
      throw new MCPExecutionError('Executor modules not initialized');
    }

    const handlerKey = `${command.action}:${command.targetType}`;
    const handler = this.handlers.get(handlerKey);

    if (!handler) {
      throw new MCPExecutionError(
        `No handler found for ${handlerKey}`,
        `${command.action}:${command.targetType}:${command.targetId}`
      );
    }

    try {
      return await handler(command, this.modules);
    } catch (error) {
      if (error instanceof MCPExecutionError) {
        throw error;
      }
      throw new MCPExecutionError(
        `Execution failed: ${error instanceof Error ? error.message : String(error)}`,
        `${command.action}:${command.targetType}:${command.targetId}`
      );
    }
  }

  /**
   * Initialize command handlers
   */
  private initializeHandlers(): void {
    // List handlers
    this.handlers.set('create:list', this.createList.bind(this));
    this.handlers.set('read:list', this.readList.bind(this));
    this.handlers.set('update:list', this.updateList.bind(this));
    this.handlers.set('delete:list', this.deleteList.bind(this));
    this.handlers.set('status:list', this.getListStatus.bind(this));
    this.handlers.set('execute:list', this.executeList.bind(this));
    this.handlers.set('mark_done:list', this.markListDone.bind(this));

    // Item handlers
    this.handlers.set('create:item', this.createItem.bind(this));
    this.handlers.set('read:item', this.readItem.bind(this));
    this.handlers.set('update:item', this.updateItem.bind(this));
    this.handlers.set('delete:item', this.deleteItem.bind(this));
    this.handlers.set('status:item', this.getItemStatus.bind(this));
    this.handlers.set('reorder:item', this.reorderItem.bind(this));
    this.handlers.set('mark_done:item', this.markItemDone.bind(this));

    // Agent handlers
    this.handlers.set('create:agent', this.createAgent.bind(this));
    this.handlers.set('read:agent', this.readAgent.bind(this));
    this.handlers.set('update:agent', this.updateAgent.bind(this));
    this.handlers.set('delete:agent', this.deleteAgent.bind(this));

    // System handlers
    this.handlers.set('status:system', this.getSystemStatus.bind(this));
    this.handlers.set('log:system', this.logSystemEvent.bind(this));
    this.handlers.set('rollback:system', this.rollbackLastAction.bind(this));
  }

  // List Handlers
  private async createList(command: MCPCommand, modules: ExecutorModules): Promise<TodoList> {
    const { targetId, parameters } = command;
    const now = new Date().toISOString();

    const list: TodoList = {
      id: targetId,
      title: parameters?.title as string,
      description: parameters?.description as string,
      parentListId: parameters?.parentListId as string,
      position: 0, // Will be calculated based on existing lists
      priority: (parameters?.priority as any) || 'medium',
      status: 'active',
      createdBy: command.agentId,
      createdAt: now,
      updatedAt: now,
      metadata: parameters?.metadata as Record<string, unknown>,
    };

    // Store in cache and sync to backend
    modules.memoryCache.set(`list:${targetId}`, list);
    await modules.stateSyncEngine.syncCreate('lists', list);

    return list;
  }

  private async readList(command: MCPCommand, modules: ExecutorModules): Promise<TodoList> {
    const { targetId } = command;
    
    // Try cache first
    let list = modules.memoryCache.get(`list:${targetId}`) as TodoList;
    
    if (!list) {
      // Fetch from backend
      list = await modules.stateSyncEngine.syncRead('lists', targetId) as TodoList;
      if (list) {
        modules.memoryCache.set(`list:${targetId}`, list);
      }
    }

    if (!list) {
      throw new MCPExecutionError(`List not found: ${targetId}`);
    }

    return list;
  }

  private async updateList(command: MCPCommand, modules: ExecutorModules): Promise<TodoList> {
    const { targetId, parameters } = command;
    
    const existingList = await this.readList(command, modules);
    const updatedList: TodoList = {
      ...existingList,
      ...parameters,
      id: targetId, // Ensure ID doesn't change
      updatedAt: new Date().toISOString(),
    };

    modules.memoryCache.set(`list:${targetId}`, updatedList);
    await modules.stateSyncEngine.syncUpdate('lists', targetId, updatedList);

    return updatedList;
  }

  private async deleteList(command: MCPCommand, modules: ExecutorModules): Promise<{ deleted: boolean }> {
    const { targetId } = command;
    
    // Check if list exists
    await this.readList(command, modules);
    
    // Remove from cache and backend
    modules.memoryCache.delete(`list:${targetId}`);
    await modules.stateSyncEngine.syncDelete('lists', targetId);

    return { deleted: true };
  }

  private async getListStatus(command: MCPCommand, modules: ExecutorModules): Promise<object> {
    const list = await this.readList(command, modules);
    const recursive = command.parameters?.recursive as boolean;
    
    const status = {
      id: list.id,
      title: list.title,
      status: list.status,
      priority: list.priority,
      createdAt: list.createdAt,
      updatedAt: list.updatedAt,
      itemCount: 0,
      completedItems: 0,
    };

    if (recursive) {
      // Get items in this list
      const items = await modules.stateSyncEngine.syncQuery('items', { listId: list.id });
      status.itemCount = items.length;
      status.completedItems = items.filter((item: TodoItem) => item.status === 'completed').length;
    }

    return status;
  }

  private async executeList(command: MCPCommand, modules: ExecutorModules): Promise<object> {
    const list = await this.readList(command, modules);
    const parallel = command.parameters?.parallel as boolean || false;
    
    // Get all items in the list
    const items = await modules.stateSyncEngine.syncQuery('items', { 
      listId: list.id,
      status: ['pending', 'in_progress']
    });

    const results = [];
    
    if (parallel) {
      // Execute items in parallel
      const promises = items.map((item: TodoItem) => 
        this.executeItem(item, modules)
      );
      results.push(...await Promise.allSettled(promises));
    } else {
      // Execute items sequentially
      for (const item of items) {
        try {
          const result = await this.executeItem(item, modules);
          results.push({ status: 'fulfilled', value: result });
        } catch (error) {
          results.push({ status: 'rejected', reason: error });
        }
      }
    }

    return {
      listId: list.id,
      executedItems: items.length,
      results,
      completedAt: new Date().toISOString(),
    };
  }

  private async markListDone(command: MCPCommand, modules: ExecutorModules): Promise<TodoList> {
    return this.updateList({
      ...command,
      parameters: { status: 'completed', completedAt: new Date().toISOString() }
    }, modules);
  }

  // Item Handlers
  private async createItem(command: MCPCommand, modules: ExecutorModules): Promise<TodoItem> {
    const { targetId, parameters } = command;
    const now = new Date().toISOString();

    const item: TodoItem = {
      id: targetId,
      listId: parameters?.listId as string,
      title: parameters?.title as string,
      description: parameters?.description as string,
      position: 0, // Will be calculated
      priority: (parameters?.priority as any) || 'medium',
      status: 'pending',
      dueDate: parameters?.dueDate as string,
      estimatedDuration: parameters?.estimatedDuration as number,
      tags: parameters?.tags as string[],
      dependencies: parameters?.dependencies as string[],
      createdBy: command.agentId,
      assignedTo: parameters?.assignedTo as string,
      createdAt: now,
      updatedAt: now,
      metadata: parameters?.metadata as Record<string, unknown>,
    };

    modules.memoryCache.set(`item:${targetId}`, item);
    await modules.stateSyncEngine.syncCreate('items', item);

    return item;
  }

  private async readItem(command: MCPCommand, modules: ExecutorModules): Promise<TodoItem> {
    const { targetId } = command;
    
    let item = modules.memoryCache.get(`item:${targetId}`) as TodoItem;
    
    if (!item) {
      item = await modules.stateSyncEngine.syncRead('items', targetId) as TodoItem;
      if (item) {
        modules.memoryCache.set(`item:${targetId}`, item);
      }
    }

    if (!item) {
      throw new MCPExecutionError(`Item not found: ${targetId}`);
    }

    return item;
  }

  private async updateItem(command: MCPCommand, modules: ExecutorModules): Promise<TodoItem> {
    const { targetId, parameters } = command;
    
    const existingItem = await this.readItem(command, modules);
    const updatedItem: TodoItem = {
      ...existingItem,
      ...parameters,
      id: targetId,
      updatedAt: new Date().toISOString(),
    };

    modules.memoryCache.set(`item:${targetId}`, updatedItem);
    await modules.stateSyncEngine.syncUpdate('items', targetId, updatedItem);

    return updatedItem;
  }

  private async deleteItem(command: MCPCommand, modules: ExecutorModules): Promise<{ deleted: boolean }> {
    const { targetId } = command;
    
    await this.readItem(command, modules);
    
    modules.memoryCache.delete(`item:${targetId}`);
    await modules.stateSyncEngine.syncDelete('items', targetId);

    return { deleted: true };
  }

  private async getItemStatus(command: MCPCommand, modules: ExecutorModules): Promise<object> {
    const item = await this.readItem(command, modules);
    
    return {
      id: item.id,
      title: item.title,
      status: item.status,
      priority: item.priority,
      progress: this.calculateItemProgress(item),
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      dueDate: item.dueDate,
    };
  }

  private async reorderItem(command: MCPCommand, modules: ExecutorModules): Promise<TodoItem> {
    return this.updateItem({
      ...command,
      parameters: { position: command.parameters?.position }
    }, modules);
  }

  private async markItemDone(command: MCPCommand, modules: ExecutorModules): Promise<TodoItem> {
    return this.updateItem({
      ...command,
      parameters: { 
        status: 'completed', 
        completedAt: new Date().toISOString(),
        actualDuration: command.parameters?.actualDuration
      }
    }, modules);
  }

  // Helper methods
  private async executeItem(item: TodoItem, modules: ExecutorModules): Promise<object> {
    // Simulate item execution - in real implementation, this would
    // trigger actual task execution based on item type
    const startTime = Date.now();
    
    // Update item status to in_progress
    await modules.stateSyncEngine.syncUpdate('items', item.id, {
      ...item,
      status: 'in_progress',
      updatedAt: new Date().toISOString(),
    });

    // Simulate work (in real implementation, this would be actual task execution)
    await new Promise(resolve => setTimeout(resolve, 100));

    const executionTime = Date.now() - startTime;

    // Mark as completed
    await modules.stateSyncEngine.syncUpdate('items', item.id, {
      ...item,
      status: 'completed',
      completedAt: new Date().toISOString(),
      actualDuration: Math.round(executionTime / 1000 / 60), // Convert to minutes
      updatedAt: new Date().toISOString(),
    });

    return {
      itemId: item.id,
      executed: true,
      executionTime,
      completedAt: new Date().toISOString(),
    };
  }

  private calculateItemProgress(item: TodoItem): number {
    switch (item.status) {
      case 'pending': return 0;
      case 'in_progress': return 50;
      case 'completed': return 100;
      case 'cancelled': return 0;
      case 'blocked': return 0;
      default: return 0;
    }
  }

  // Agent Handlers (placeholder implementations)
  private async createAgent(command: MCPCommand, modules: ExecutorModules): Promise<Agent> {
    // Implementation would create agent in database
    throw new MCPExecutionError('Agent creation not yet implemented');
  }

  private async readAgent(command: MCPCommand, modules: ExecutorModules): Promise<Agent> {
    throw new MCPExecutionError('Agent reading not yet implemented');
  }

  private async updateAgent(command: MCPCommand, modules: ExecutorModules): Promise<Agent> {
    throw new MCPExecutionError('Agent updating not yet implemented');
  }

  private async deleteAgent(command: MCPCommand, modules: ExecutorModules): Promise<{ deleted: boolean }> {
    throw new MCPExecutionError('Agent deletion not yet implemented');
  }

  // System Handlers (placeholder implementations)
  private async getSystemStatus(command: MCPCommand, modules: ExecutorModules): Promise<object> {
    return {
      status: 'healthy',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
    };
  }

  private async logSystemEvent(command: MCPCommand, modules: ExecutorModules): Promise<object> {
    // Implementation would log to system
    return { logged: true };
  }

  private async rollbackLastAction(command: MCPCommand, modules: ExecutorModules): Promise<object> {
    // Implementation would rollback last action
    throw new MCPExecutionError('Rollback not yet implemented');
  }

  /**
   * Register custom handler
   */
  registerHandler(actionTarget: string, handler: ExecutorHandler): void {
    this.handlers.set(actionTarget, handler);
  }

  /**
   * Unregister handler
   */
  unregisterHandler(actionTarget: string): void {
    this.handlers.delete(actionTarget);
  }

  /**
   * Get all registered handlers
   */
  getHandlers(): string[] {
    return Array.from(this.handlers.keys());
  }
}

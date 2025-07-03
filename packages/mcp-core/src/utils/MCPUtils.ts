/**
 * MCP Utilities - Helper functions for MCP operations
 * SemanticType: MCPUtilities
 * ExtensibleByAI: true
 * AIUseCases: ["Command helpers", "Validation utilities", "Data transformation"]
 */

import {
  MCPCommand,
  MCPResponse,
  TodoList,
  TodoItem,
  Priority,
  ItemStatus,
  ListStatus,
} from '@ai-todo/shared-types';

export class MCPUtils {
  /**
   * Create a standardized MCP command
   */
  static createCommand(
    action: string,
    targetType: string,
    targetId: string,
    parameters?: Record<string, unknown>,
    agentId?: string,
    sessionId?: string
  ): MCPCommand {
    return {
      action: action as any,
      targetType: targetType as any,
      targetId,
      parameters,
      agentId,
      sessionId,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Create a success response
   */
  static createSuccessResponse<T>(
    command: string,
    result: T,
    executionTime?: number,
    agent?: string
  ): MCPResponse<T> {
    return {
      success: true,
      command,
      result,
      metadata: {
        executionTime,
        agent,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Create an error response
   */
  static createErrorResponse(
    command: string,
    error: { code: string; message: string; details?: string },
    executionTime?: number,
    agent?: string
  ): MCPResponse {
    return {
      success: false,
      command,
      error,
      metadata: {
        executionTime,
        agent,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Validate priority value
   */
  static isValidPriority(priority: string): priority is Priority {
    return ['low', 'medium', 'high', 'urgent'].includes(priority);
  }

  /**
   * Validate item status
   */
  static isValidItemStatus(status: string): status is ItemStatus {
    return ['pending', 'in_progress', 'completed', 'cancelled', 'blocked'].includes(status);
  }

  /**
   * Validate list status
   */
  static isValidListStatus(status: string): status is ListStatus {
    return ['active', 'completed', 'archived', 'deleted'].includes(status);
  }

  /**
   * Calculate list completion percentage
   */
  static calculateListCompletion(items: TodoItem[]): number {
    if (items.length === 0) return 0;
    
    const completedItems = items.filter(item => item.status === 'completed').length;
    return Math.round((completedItems / items.length) * 100);
  }

  /**
   * Get priority weight for sorting
   */
  static getPriorityWeight(priority: Priority): number {
    const weights = { urgent: 4, high: 3, medium: 2, low: 1 };
    return weights[priority] || 1;
  }

  /**
   * Sort items by priority and position
   */
  static sortItems(items: TodoItem[]): TodoItem[] {
    return [...items].sort((a, b) => {
      // First sort by priority (urgent first)
      const priorityDiff = this.getPriorityWeight(b.priority) - this.getPriorityWeight(a.priority);
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then by position
      return a.position - b.position;
    });
  }

  /**
   * Filter items by status
   */
  static filterItemsByStatus(items: TodoItem[], statuses: ItemStatus[]): TodoItem[] {
    return items.filter(item => statuses.includes(item.status));
  }

  /**
   * Get overdue items
   */
  static getOverdueItems(items: TodoItem[]): TodoItem[] {
    const now = new Date();
    return items.filter(item => 
      item.dueDate && 
      new Date(item.dueDate) < now && 
      item.status !== 'completed'
    );
  }

  /**
   * Get items due soon (within specified hours)
   */
  static getItemsDueSoon(items: TodoItem[], hours: number = 24): TodoItem[] {
    const now = new Date();
    const threshold = new Date(now.getTime() + hours * 60 * 60 * 1000);
    
    return items.filter(item => 
      item.dueDate && 
      new Date(item.dueDate) <= threshold && 
      new Date(item.dueDate) >= now &&
      item.status !== 'completed'
    );
  }

  /**
   * Calculate estimated completion time for a list
   */
  static calculateEstimatedTime(items: TodoItem[]): number {
    return items
      .filter(item => item.status !== 'completed' && item.estimatedDuration)
      .reduce((total, item) => total + (item.estimatedDuration || 0), 0);
  }

  /**
   * Generate a unique ID
   */
  static generateId(prefix?: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
  }

  /**
   * Sanitize string for use as ID
   */
  static sanitizeId(input: string): string {
    return input
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .substr(0, 50);
  }

  /**
   * Format duration in minutes to human readable
   */
  static formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (remainingMinutes === 0) {
      return `${hours}h`;
    }
    
    return `${hours}h ${remainingMinutes}m`;
  }

  /**
   * Parse duration string to minutes
   */
  static parseDuration(duration: string): number | null {
    const match = duration.match(/^(\d+)([hm])$/);
    if (!match) return null;
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    return unit === 'h' ? value * 60 : value;
  }

  /**
   * Check if two items have dependency conflict
   */
  static hasDependencyConflict(item1: TodoItem, item2: TodoItem): boolean {
    const item1Deps = item1.dependencies || [];
    const item2Deps = item2.dependencies || [];
    
    // Check for circular dependency
    return item1Deps.includes(item2.id) && item2Deps.includes(item1.id);
  }

  /**
   * Get item dependency chain
   */
  static getDependencyChain(item: TodoItem, allItems: TodoItem[]): string[] {
    const chain: string[] = [];
    const visited = new Set<string>();
    
    const traverse = (currentItem: TodoItem) => {
      if (visited.has(currentItem.id)) {
        return; // Avoid infinite loops
      }
      
      visited.add(currentItem.id);
      const deps = currentItem.dependencies || [];
      
      for (const depId of deps) {
        const depItem = allItems.find(i => i.id === depId);
        if (depItem) {
          chain.push(depId);
          traverse(depItem);
        }
      }
    };
    
    traverse(item);
    return chain;
  }

  /**
   * Validate item can be marked as completed
   */
  static canCompleteItem(item: TodoItem, allItems: TodoItem[]): { canComplete: boolean; reason?: string } {
    if (item.status === 'completed') {
      return { canComplete: false, reason: 'Item is already completed' };
    }
    
    if (item.status === 'blocked') {
      return { canComplete: false, reason: 'Item is blocked' };
    }
    
    // Check if all dependencies are completed
    const deps = item.dependencies || [];
    for (const depId of deps) {
      const depItem = allItems.find(i => i.id === depId);
      if (!depItem || depItem.status !== 'completed') {
        return { canComplete: false, reason: `Dependency ${depId} is not completed` };
      }
    }
    
    return { canComplete: true };
  }

  /**
   * Get items that can be started (no blocking dependencies)
   */
  static getStartableItems(items: TodoItem[]): TodoItem[] {
    return items.filter(item => {
      if (item.status !== 'pending') return false;
      
      const deps = item.dependencies || [];
      return deps.every(depId => {
        const depItem = items.find(i => i.id === depId);
        return depItem && depItem.status === 'completed';
      });
    });
  }

  /**
   * Create a summary of list/item statistics
   */
  static createSummary(lists: TodoList[], items: TodoItem[]) {
    const totalLists = lists.length;
    const activeLists = lists.filter(l => l.status === 'active').length;
    const completedLists = lists.filter(l => l.status === 'completed').length;
    
    const totalItems = items.length;
    const pendingItems = items.filter(i => i.status === 'pending').length;
    const inProgressItems = items.filter(i => i.status === 'in_progress').length;
    const completedItems = items.filter(i => i.status === 'completed').length;
    const blockedItems = items.filter(i => i.status === 'blocked').length;
    
    const overdue = this.getOverdueItems(items).length;
    const dueSoon = this.getItemsDueSoon(items).length;
    
    return {
      lists: {
        total: totalLists,
        active: activeLists,
        completed: completedLists,
        completionRate: totalLists > 0 ? Math.round((completedLists / totalLists) * 100) : 0,
      },
      items: {
        total: totalItems,
        pending: pendingItems,
        inProgress: inProgressItems,
        completed: completedItems,
        blocked: blockedItems,
        overdue,
        dueSoon,
        completionRate: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
      },
    };
  }
}

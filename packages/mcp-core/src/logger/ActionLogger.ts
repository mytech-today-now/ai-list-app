/**
 * Action Logger - Logs all MCP actions for audit and rollback
 * SemanticType: ActionLogger
 * ExtensibleByAI: true
 * AIUseCases: ["Audit logging", "Action tracking", "Rollback support"]
 */

import { ActionLog } from '@ai-todo/shared-types';

export interface LogEntry extends Omit<ActionLog, 'id'> {
  // ActionLog without the auto-generated ID
}

export interface LogFilter {
  agentId?: string;
  action?: string;
  targetType?: string;
  success?: boolean;
  startDate?: string;
  endDate?: string;
  sessionId?: string;
}

export class ActionLogger {
  private logs: ActionLog[] = [];
  private logBuffer: LogEntry[] = [];
  private nextId: number = 1;
  private flushInterval: NodeJS.Timeout;

  constructor(private bufferSize: number = 100, private flushIntervalMs: number = 5000) {
    // Flush logs periodically
    this.flushInterval = setInterval(() => {
      this.flush();
    }, flushIntervalMs);
  }

  /**
   * Log an action
   */
  async logAction(entry: LogEntry): Promise<void> {
    const logEntry: ActionLog = {
      ...entry,
      id: this.nextId++,
    };

    // Add to buffer
    this.logBuffer.push(entry);

    // Flush if buffer is full
    if (this.logBuffer.length >= this.bufferSize) {
      await this.flush();
    }
  }

  /**
   * Flush buffered logs
   */
  async flush(): Promise<void> {
    if (this.logBuffer.length === 0) {
      return;
    }

    const logsToFlush = [...this.logBuffer];
    this.logBuffer = [];

    // Convert to ActionLog entries with IDs
    const actionLogs: ActionLog[] = logsToFlush.map(entry => ({
      ...entry,
      id: this.nextId++,
    }));

    // Add to in-memory storage (in real implementation, this would go to database)
    this.logs.push(...actionLogs);

    // In real implementation, this would persist to database
    await this.persistLogs(actionLogs);
  }

  /**
   * Get logs with optional filtering
   */
  async getLogs(filter?: LogFilter, limit: number = 100, offset: number = 0): Promise<ActionLog[]> {
    let filteredLogs = [...this.logs];

    if (filter) {
      filteredLogs = filteredLogs.filter(log => {
        if (filter.agentId && log.agentId !== filter.agentId) {
          return false;
        }
        if (filter.action && log.action !== filter.action) {
          return false;
        }
        if (filter.targetType && log.targetType !== filter.targetType) {
          return false;
        }
        if (filter.success !== undefined && log.success !== filter.success) {
          return false;
        }
        if (filter.sessionId && log.sessionId !== filter.sessionId) {
          return false;
        }
        if (filter.startDate && log.timestamp < filter.startDate) {
          return false;
        }
        if (filter.endDate && log.timestamp > filter.endDate) {
          return false;
        }
        return true;
      });
    }

    // Sort by timestamp (newest first)
    filteredLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply pagination
    return filteredLogs.slice(offset, offset + limit);
  }

  /**
   * Get log by ID
   */
  async getLog(id: number): Promise<ActionLog | null> {
    return this.logs.find(log => log.id === id) || null;
  }

  /**
   * Get logs for a specific session
   */
  async getSessionLogs(sessionId: string): Promise<ActionLog[]> {
    return this.getLogs({ sessionId });
  }

  /**
   * Get logs for a specific agent
   */
  async getAgentLogs(agentId: string, limit: number = 50): Promise<ActionLog[]> {
    return this.getLogs({ agentId }, limit);
  }

  /**
   * Get failed actions that might need attention
   */
  async getFailedActions(limit: number = 20): Promise<ActionLog[]> {
    return this.getLogs({ success: false }, limit);
  }

  /**
   * Get action statistics
   */
  async getActionStats(): Promise<{
    totalActions: number;
    successfulActions: number;
    failedActions: number;
    successRate: number;
    actionsByType: Record<string, number>;
    actionsByAgent: Record<string, number>;
  }> {
    const totalActions = this.logs.length;
    const successfulActions = this.logs.filter(log => log.success).length;
    const failedActions = totalActions - successfulActions;
    const successRate = totalActions > 0 ? successfulActions / totalActions : 0;

    const actionsByType: Record<string, number> = {};
    const actionsByAgent: Record<string, number> = {};

    for (const log of this.logs) {
      // Count by action type
      const actionKey = `${log.action}:${log.targetType}`;
      actionsByType[actionKey] = (actionsByType[actionKey] || 0) + 1;

      // Count by agent
      if (log.agentId) {
        actionsByAgent[log.agentId] = (actionsByAgent[log.agentId] || 0) + 1;
      }
    }

    return {
      totalActions,
      successfulActions,
      failedActions,
      successRate: Math.round(successRate * 100) / 100,
      actionsByType,
      actionsByAgent,
    };
  }

  /**
   * Find actions that can be rolled back
   */
  async getRollbackCandidates(targetType: string, targetId: string): Promise<ActionLog[]> {
    return this.logs
      .filter(log => 
        log.targetType === targetType && 
        log.targetId === targetId && 
        log.success &&
        ['create', 'update', 'delete'].includes(log.action) &&
        !log.rollbackId // Not already rolled back
      )
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Mark an action as rolled back
   */
  async markAsRolledBack(originalActionId: number, rollbackActionId: number): Promise<void> {
    const originalLog = this.logs.find(log => log.id === originalActionId);
    if (originalLog) {
      originalLog.rollbackId = rollbackActionId;
    }
  }

  /**
   * Get recent activity summary
   */
  async getRecentActivity(hours: number = 24): Promise<{
    period: string;
    totalActions: number;
    uniqueAgents: number;
    topActions: Array<{ action: string; count: number }>;
  }> {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    const recentLogs = this.logs.filter(log => log.timestamp >= cutoffTime);

    const uniqueAgents = new Set(recentLogs.map(log => log.agentId).filter(Boolean)).size;
    
    const actionCounts: Record<string, number> = {};
    for (const log of recentLogs) {
      const actionKey = `${log.action}:${log.targetType}`;
      actionCounts[actionKey] = (actionCounts[actionKey] || 0) + 1;
    }

    const topActions = Object.entries(actionCounts)
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      period: `${hours} hours`,
      totalActions: recentLogs.length,
      uniqueAgents,
      topActions,
    };
  }

  /**
   * Persist logs to storage (placeholder)
   */
  private async persistLogs(logs: ActionLog[]): Promise<void> {
    // In real implementation, this would save to database
    // For now, we just keep them in memory
    console.log(`Persisted ${logs.length} action logs`);
  }

  /**
   * Clear old logs (cleanup)
   */
  async clearOldLogs(olderThanDays: number = 30): Promise<number> {
    const cutoffTime = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString();
    const initialCount = this.logs.length;
    
    this.logs = this.logs.filter(log => log.timestamp >= cutoffTime);
    
    const removedCount = initialCount - this.logs.length;
    console.log(`Removed ${removedCount} old log entries`);
    
    return removedCount;
  }

  /**
   * Export logs as JSON
   */
  async exportLogs(filter?: LogFilter): Promise<string> {
    const logs = await this.getLogs(filter, 10000); // Large limit for export
    return JSON.stringify(logs, null, 2);
  }

  /**
   * Get logger status
   */
  getStatus(): object {
    return {
      status: 'active',
      totalLogs: this.logs.length,
      bufferedLogs: this.logBuffer.length,
      bufferSize: this.bufferSize,
      flushInterval: this.flushIntervalMs,
    };
  }

  /**
   * Shutdown logger
   */
  async shutdown(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    
    // Flush any remaining logs
    await this.flush();
  }
}

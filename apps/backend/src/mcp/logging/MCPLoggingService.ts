/**
 * MCP Logging Service - Centralized logging for MCP operations
 * SemanticType: MCPLoggingService
 * ExtensibleByAI: true
 * AIUseCases: ["Audit logging", "Performance tracking", "Error monitoring"]
 */

import { MCPCommand, MCPResponse } from '@ai-todo/shared-types';
import { MCPExecutionContext } from '../router/MCPCommandRouter';

export interface MCPLogEntry {
  id: string;
  timestamp: string;
  correlationId: string;
  type: 'command_start' | 'command_success' | 'command_error' | 'performance';
  command?: MCPCommand;
  response?: MCPResponse;
  context?: MCPExecutionContext;
  executionTime?: number;
  error?: {
    code: string;
    message: string;
    stack?: string;
  };
  metadata?: Record<string, any>;
}

export interface PerformanceMetrics {
  averageResponseTime: number;
  commandsPerMinute: number;
  errorRate: number;
  totalCommands: number;
  totalErrors: number;
  slowestCommands: Array<{
    command: string;
    executionTime: number;
    timestamp: string;
  }>;
}

export class MCPLoggingService {
  private logs: MCPLogEntry[] = [];
  private maxLogs = 10000;
  private performanceWindow: Array<{ timestamp: number; executionTime: number; success: boolean }> = [];
  private commandCounts = new Map<string, number>();

  async logCommandStart(
    command: MCPCommand,
    context: MCPExecutionContext,
    correlationId: string
  ): Promise<void> {
    const logEntry: MCPLogEntry = {
      id: this.generateLogId(),
      timestamp: new Date().toISOString(),
      correlationId,
      type: 'command_start',
      command,
      context,
      metadata: {
        commandString: `${command.action}:${command.targetType}:${command.targetId}`
      }
    };

    this.addLog(logEntry);
  }

  async logCommandSuccess(
    command: MCPCommand,
    response: MCPResponse,
    context: MCPExecutionContext,
    correlationId: string,
    executionTime: number
  ): Promise<void> {
    const logEntry: MCPLogEntry = {
      id: this.generateLogId(),
      timestamp: new Date().toISOString(),
      correlationId,
      type: 'command_success',
      command,
      response,
      context,
      executionTime,
      metadata: {
        commandString: `${command.action}:${command.targetType}:${command.targetId}`,
        success: response.success
      }
    };

    this.addLog(logEntry);
    this.updatePerformanceMetrics(command, executionTime, true);
  }

  async logCommandError(
    command: MCPCommand,
    error: any,
    context: MCPExecutionContext,
    correlationId: string,
    executionTime: number
  ): Promise<void> {
    const logEntry: MCPLogEntry = {
      id: this.generateLogId(),
      timestamp: new Date().toISOString(),
      correlationId,
      type: 'command_error',
      command,
      context,
      executionTime,
      error: {
        code: error.code || 'UNKNOWN_ERROR',
        message: error.message || 'Unknown error occurred',
        stack: error.stack
      },
      metadata: {
        commandString: `${command.action}:${command.targetType}:${command.targetId}`
      }
    };

    this.addLog(logEntry);
    this.updatePerformanceMetrics(command, executionTime, false);
  }

  async getCommandHistory(options: {
    limit: number;
    offset: number;
    sessionId?: string;
    agentId?: string;
    userId?: string;
  }): Promise<MCPLogEntry[]> {
    let filteredLogs = [...this.logs];

    // Filter by context
    if (options.sessionId || options.agentId || options.userId) {
      filteredLogs = filteredLogs.filter(log => {
        if (!log.context) return false;
        
        if (options.sessionId && log.context.sessionId !== options.sessionId) return false;
        if (options.agentId && log.context.agentId !== options.agentId) return false;
        if (options.userId && log.context.userId !== options.userId) return false;
        
        return true;
      });
    }

    // Sort by timestamp (newest first)
    filteredLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply pagination
    return filteredLogs.slice(options.offset, options.offset + options.limit);
  }

  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    const now = Date.now();
    const fiveMinutesAgo = now - (5 * 60 * 1000);

    // Clean old performance data
    this.performanceWindow = this.performanceWindow.filter(entry => entry.timestamp > fiveMinutesAgo);

    const totalCommands = this.performanceWindow.length;
    const totalErrors = this.performanceWindow.filter(entry => !entry.success).length;
    const totalExecutionTime = this.performanceWindow.reduce((sum, entry) => sum + entry.executionTime, 0);

    const averageResponseTime = totalCommands > 0 ? totalExecutionTime / totalCommands : 0;
    const commandsPerMinute = totalCommands / 5; // 5-minute window
    const errorRate = totalCommands > 0 ? totalErrors / totalCommands : 0;

    // Get slowest commands from recent logs
    const recentLogs = this.logs
      .filter(log => log.type === 'command_success' || log.type === 'command_error')
      .filter(log => new Date(log.timestamp).getTime() > fiveMinutesAgo)
      .sort((a, b) => (b.executionTime || 0) - (a.executionTime || 0))
      .slice(0, 10);

    const slowestCommands = recentLogs.map(log => ({
      command: log.metadata?.commandString || 'unknown',
      executionTime: log.executionTime || 0,
      timestamp: log.timestamp
    }));

    return {
      averageResponseTime,
      commandsPerMinute,
      errorRate,
      totalCommands: this.getTotalCommandCount(),
      totalErrors: this.getTotalErrorCount(),
      slowestCommands
    };
  }

  async getLogsByCorrelationId(correlationId: string): Promise<MCPLogEntry[]> {
    return this.logs.filter(log => log.correlationId === correlationId);
  }

  async getLogsByType(type: MCPLogEntry['type'], limit: number = 100): Promise<MCPLogEntry[]> {
    return this.logs
      .filter(log => log.type === type)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  async getErrorLogs(limit: number = 100): Promise<MCPLogEntry[]> {
    return this.getLogsByType('command_error', limit);
  }

  async getCommandStats(): Promise<Record<string, number>> {
    return Object.fromEntries(this.commandCounts);
  }

  async searchLogs(query: {
    command?: string;
    agentId?: string;
    userId?: string;
    sessionId?: string;
    errorCode?: string;
    since?: string;
    until?: string;
    limit?: number;
  }): Promise<MCPLogEntry[]> {
    let filteredLogs = [...this.logs];

    if (query.command) {
      filteredLogs = filteredLogs.filter(log =>
        log.metadata?.commandString?.includes(query.command!)
      );
    }

    if (query.agentId) {
      filteredLogs = filteredLogs.filter(log =>
        log.context?.agentId === query.agentId
      );
    }

    if (query.userId) {
      filteredLogs = filteredLogs.filter(log =>
        log.context?.userId === query.userId
      );
    }

    if (query.sessionId) {
      filteredLogs = filteredLogs.filter(log =>
        log.context?.sessionId === query.sessionId
      );
    }

    if (query.errorCode) {
      filteredLogs = filteredLogs.filter(log =>
        log.error?.code === query.errorCode
      );
    }

    if (query.since) {
      const sinceDate = new Date(query.since);
      filteredLogs = filteredLogs.filter(log =>
        new Date(log.timestamp) >= sinceDate
      );
    }

    if (query.until) {
      const untilDate = new Date(query.until);
      filteredLogs = filteredLogs.filter(log =>
        new Date(log.timestamp) <= untilDate
      );
    }

    // Sort by timestamp (newest first)
    filteredLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply limit
    if (query.limit) {
      filteredLogs = filteredLogs.slice(0, query.limit);
    }

    return filteredLogs;
  }

  // Private helper methods
  private addLog(logEntry: MCPLogEntry): void {
    this.logs.push(logEntry);

    // Maintain log size limit
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Output to console in development
    if (process.env.NODE_ENV === 'development') {
      this.consoleLog(logEntry);
    }
  }

  private updatePerformanceMetrics(command: MCPCommand, executionTime: number, success: boolean): void {
    const commandString = `${command.action}:${command.targetType}`;
    
    // Update command counts
    const currentCount = this.commandCounts.get(commandString) || 0;
    this.commandCounts.set(commandString, currentCount + 1);

    // Add to performance window
    this.performanceWindow.push({
      timestamp: Date.now(),
      executionTime,
      success
    });
  }

  private getTotalCommandCount(): number {
    return Array.from(this.commandCounts.values()).reduce((sum, count) => sum + count, 0);
  }

  private getTotalErrorCount(): number {
    return this.logs.filter(log => log.type === 'command_error').length;
  }

  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private consoleLog(logEntry: MCPLogEntry): void {
    const logLevel = logEntry.type === 'command_error' ? 'error' : 'info';
    const message = this.formatLogMessage(logEntry);
    console[logLevel](message);
  }

  private formatLogMessage(logEntry: MCPLogEntry): string {
    const parts = [
      `[${logEntry.timestamp}]`,
      `[${logEntry.correlationId}]`,
      `[${logEntry.type.toUpperCase()}]`
    ];

    if (logEntry.metadata?.commandString) {
      parts.push(`Command: ${logEntry.metadata.commandString}`);
    }

    if (logEntry.executionTime) {
      parts.push(`Time: ${logEntry.executionTime}ms`);
    }

    if (logEntry.error) {
      parts.push(`Error: ${logEntry.error.message}`);
    }

    return parts.join(' ');
  }

  // Cleanup and maintenance
  async cleanup(olderThanHours: number = 24): Promise<number> {
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    const initialCount = this.logs.length;

    this.logs = this.logs.filter(log => new Date(log.timestamp) > cutoffTime);

    const removedCount = initialCount - this.logs.length;
    if (removedCount > 0) {
      console.log(`Cleaned up ${removedCount} old log entries`);
    }

    return removedCount;
  }
}

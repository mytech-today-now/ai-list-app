/**
 * MCP Logging Middleware
 * SemanticType: MCPLoggingMiddleware
 * ExtensibleByAI: true
 * AIUseCases: ["Request logging", "Performance monitoring", "Audit trails"]
 */

import { Request, Response, NextFunction } from 'express';
import { MCPCommand } from '@ai-todo/shared-types';

interface MCPLogEntry {
  timestamp: string;
  correlationId: string;
  type: 'request' | 'response' | 'error' | 'performance';
  method?: string;
  url?: string;
  statusCode?: number;
  executionTime?: number;
  command?: MCPCommand;
  userId?: string;
  sessionId?: string;
  agentId?: string;
  userAgent?: string;
  ip?: string;
  error?: {
    code: string;
    message: string;
    stack?: string;
  };
  metadata?: Record<string, any>;
}

class MCPLogger {
  private logs: MCPLogEntry[] = [];
  private maxLogs = 10000;
  private performanceMetrics = {
    totalRequests: 0,
    totalErrors: 0,
    totalExecutionTime: 0,
    averageResponseTime: 0,
    requestsPerMinute: 0,
    errorRate: 0
  };
  private metricsWindow: number[] = [];
  private errorWindow: number[] = [];

  log(entry: MCPLogEntry): void {
    // Add timestamp if not provided
    if (!entry.timestamp) {
      entry.timestamp = new Date().toISOString();
    }

    // Add to logs
    this.logs.push(entry);

    // Maintain log size limit
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Update metrics
    this.updateMetrics(entry);

    // Output to console in development
    if (process.env.NODE_ENV === 'development') {
      this.consoleLog(entry);
    }

    // In production, you might want to send to external logging service
    if (process.env.NODE_ENV === 'production') {
      this.externalLog(entry);
    }
  }

  private updateMetrics(entry: MCPLogEntry): void {
    const now = Date.now();

    if (entry.type === 'request') {
      this.performanceMetrics.totalRequests++;
      this.metricsWindow.push(now);
    }

    if (entry.type === 'error') {
      this.performanceMetrics.totalErrors++;
      this.errorWindow.push(now);
    }

    if (entry.type === 'response' && entry.executionTime) {
      this.performanceMetrics.totalExecutionTime += entry.executionTime;
      this.performanceMetrics.averageResponseTime = 
        this.performanceMetrics.totalExecutionTime / this.performanceMetrics.totalRequests;
    }

    // Clean old metrics (keep last 5 minutes)
    const fiveMinutesAgo = now - (5 * 60 * 1000);
    this.metricsWindow = this.metricsWindow.filter(time => time > fiveMinutesAgo);
    this.errorWindow = this.errorWindow.filter(time => time > fiveMinutesAgo);

    // Calculate rates
    this.performanceMetrics.requestsPerMinute = this.metricsWindow.length / 5;
    this.performanceMetrics.errorRate = this.metricsWindow.length > 0 
      ? this.errorWindow.length / this.metricsWindow.length 
      : 0;
  }

  private consoleLog(entry: MCPLogEntry): void {
    const logLevel = entry.type === 'error' ? 'error' : 'info';
    const message = this.formatLogMessage(entry);
    console[logLevel](message);
  }

  private externalLog(entry: MCPLogEntry): void {
    // Implement external logging service integration
    // Examples: Winston, Bunyan, Datadog, CloudWatch, etc.
    
    // For now, just structure the log for external consumption
    const structuredLog = {
      service: 'mcp-backend',
      level: entry.type === 'error' ? 'error' : 'info',
      ...entry
    };

    // You could send this to your logging service here
    // Example: winston.log(structuredLog);
  }

  private formatLogMessage(entry: MCPLogEntry): string {
    const parts = [
      `[${entry.timestamp}]`,
      `[${entry.correlationId}]`,
      `[${entry.type.toUpperCase()}]`
    ];

    if (entry.method && entry.url) {
      parts.push(`${entry.method} ${entry.url}`);
    }

    if (entry.command) {
      parts.push(`Command: ${entry.command.action}:${entry.command.targetType}:${entry.command.targetId}`);
    }

    if (entry.statusCode) {
      parts.push(`Status: ${entry.statusCode}`);
    }

    if (entry.executionTime) {
      parts.push(`Time: ${entry.executionTime}ms`);
    }

    if (entry.error) {
      parts.push(`Error: ${entry.error.message}`);
    }

    return parts.join(' ');
  }

  getMetrics() {
    return { ...this.performanceMetrics };
  }

  getLogs(filter?: {
    type?: string;
    correlationId?: string;
    userId?: string;
    sessionId?: string;
    agentId?: string;
    limit?: number;
    since?: string;
  }): MCPLogEntry[] {
    let filteredLogs = [...this.logs];

    if (filter) {
      if (filter.type) {
        filteredLogs = filteredLogs.filter(log => log.type === filter.type);
      }
      if (filter.correlationId) {
        filteredLogs = filteredLogs.filter(log => log.correlationId === filter.correlationId);
      }
      if (filter.userId) {
        filteredLogs = filteredLogs.filter(log => log.userId === filter.userId);
      }
      if (filter.sessionId) {
        filteredLogs = filteredLogs.filter(log => log.sessionId === filter.sessionId);
      }
      if (filter.agentId) {
        filteredLogs = filteredLogs.filter(log => log.agentId === filter.agentId);
      }
      if (filter.since) {
        const sinceDate = new Date(filter.since);
        filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) >= sinceDate);
      }
      if (filter.limit) {
        filteredLogs = filteredLogs.slice(-filter.limit);
      }
    }

    return filteredLogs;
  }
}

// Global logger instance
const mcpLogger = new MCPLogger();

/**
 * Main MCP Logging Middleware
 */
export const mcpLogging = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const correlationId = req.correlationId || `mcp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Set correlation ID if not already set
  if (!req.correlationId) {
    req.correlationId = correlationId;
  }

  // Log request
  mcpLogger.log({
    timestamp: new Date().toISOString(),
    correlationId,
    type: 'request',
    method: req.method,
    url: req.url,
    userId: req.userId,
    sessionId: req.sessionId,
    agentId: req.agentId,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    metadata: {
      headers: req.headers,
      query: req.query,
      body: req.method === 'POST' ? req.body : undefined
    }
  });

  // Override res.json to log response
  const originalJson = res.json;
  res.json = function(body: any) {
    const executionTime = Date.now() - startTime;
    
    // Log response
    mcpLogger.log({
      timestamp: new Date().toISOString(),
      correlationId,
      type: 'response',
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      executionTime,
      userId: req.userId,
      sessionId: req.sessionId,
      agentId: req.agentId,
      command: req.mcpCommand,
      metadata: {
        responseSize: JSON.stringify(body).length,
        success: body.success
      }
    });

    return originalJson.call(this, body);
  };

  // Log errors
  res.on('error', (error) => {
    mcpLogger.log({
      timestamp: new Date().toISOString(),
      correlationId,
      type: 'error',
      method: req.method,
      url: req.url,
      userId: req.userId,
      sessionId: req.sessionId,
      agentId: req.agentId,
      command: req.mcpCommand,
      error: {
        code: error.name,
        message: error.message,
        stack: error.stack
      }
    });
  });

  next();
};

/**
 * Performance monitoring middleware
 */
export const mcpPerformanceLogging = (req: Request, res: Response, next: NextFunction) => {
  const startTime = process.hrtime.bigint();
  
  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const executionTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    
    // Log performance metrics
    mcpLogger.log({
      timestamp: new Date().toISOString(),
      correlationId: req.correlationId!,
      type: 'performance',
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      executionTime,
      userId: req.userId,
      sessionId: req.sessionId,
      agentId: req.agentId,
      command: req.mcpCommand,
      metadata: {
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      }
    });
  });
  
  next();
};

/**
 * Command-specific logging
 */
export const mcpCommandLogging = (req: Request, res: Response, next: NextFunction) => {
  if (req.mcpCommand) {
    mcpLogger.log({
      timestamp: new Date().toISOString(),
      correlationId: req.correlationId!,
      type: 'request',
      command: req.mcpCommand,
      userId: req.userId,
      sessionId: req.sessionId,
      agentId: req.agentId,
      metadata: {
        commandParameters: req.mcpCommand.parameters
      }
    });
  }
  
  next();
};

/**
 * Get logger instance for external use
 */
export const getMCPLogger = () => mcpLogger;

/**
 * Export logger for direct use
 */
export { mcpLogger };

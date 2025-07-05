/**
 * MCP WebSocket Handler - Real-time MCP command streaming and events
 * SemanticType: MCPWebSocketHandler
 * ExtensibleByAI: true
 * AIUseCases: ["Real-time updates", "Command streaming", "Event broadcasting"]
 */

import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { MCPCommand, MCPResponse, Agent, Session } from '@ai-todo/shared-types';
import { MCPCommandRouter } from '../router/MCPCommandRouter';
import { MCPAgentManager } from '../agents/MCPAgentManager';
import { MCPSessionManager } from '../session/MCPSessionManager';
import { URL } from 'url';

export interface MCPWebSocketClient {
  id: string;
  ws: WebSocket;
  sessionId?: string;
  agentId?: string;
  userId?: string;
  subscriptions: Set<string>;
  lastActivity: Date;
}

export interface MCPWebSocketMessage {
  type: 'command' | 'subscribe' | 'unsubscribe' | 'ping' | 'auth';
  id?: string;
  data?: any;
  timestamp?: string;
}

export interface MCPWebSocketResponse {
  type: 'response' | 'event' | 'error' | 'pong' | 'auth_result';
  id?: string;
  data?: any;
  timestamp: string;
  correlationId?: string;
}

export class MCPWebSocketHandler {
  private wss: WebSocketServer;
  private clients = new Map<string, MCPWebSocketClient>();
  private commandRouter: MCPCommandRouter;
  private agentManager: MCPAgentManager;
  private sessionManager: MCPSessionManager;
  private heartbeatInterval: NodeJS.Timeout;

  constructor(
    commandRouter: MCPCommandRouter,
    agentManager: MCPAgentManager,
    sessionManager: MCPSessionManager
  ) {
    this.commandRouter = commandRouter;
    this.agentManager = agentManager;
    this.sessionManager = sessionManager;
    
    this.wss = new WebSocketServer({ 
      port: parseInt(process.env.MCP_WS_PORT || '8081'),
      path: '/mcp/ws'
    });

    this.setupWebSocketServer();
    this.startHeartbeat();
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WebSocket, request: IncomingMessage) => {
      this.handleConnection(ws, request);
    });

    this.wss.on('error', (error) => {
      console.error('WebSocket Server Error:', error);
    });

    console.log(`MCP WebSocket server listening on port ${process.env.MCP_WS_PORT || '8081'}`);
  }

  private async handleConnection(ws: WebSocket, request: IncomingMessage): Promise<void> {
    const clientId = this.generateClientId();
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    
    // Extract connection parameters
    const sessionId = url.searchParams.get('sessionId') || undefined;
    const agentId = url.searchParams.get('agentId') || undefined;
    const userId = url.searchParams.get('userId') || undefined;

    const client: MCPWebSocketClient = {
      id: clientId,
      ws,
      sessionId,
      agentId,
      userId,
      subscriptions: new Set(),
      lastActivity: new Date()
    };

    this.clients.set(clientId, client);

    console.log(`WebSocket client connected: ${clientId}`, {
      sessionId,
      agentId,
      userId,
      totalClients: this.clients.size
    });

    // Send welcome message
    this.sendToClient(client, {
      type: 'auth_result',
      data: {
        clientId,
        connected: true,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

    // Set up message handler
    ws.on('message', (data) => {
      this.handleMessage(client, data);
    });

    // Handle disconnection
    ws.on('close', () => {
      this.handleDisconnection(client);
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error(`WebSocket client error (${clientId}):`, error);
      this.handleDisconnection(client);
    });
  }

  private async handleMessage(client: MCPWebSocketClient, data: any): Promise<void> {
    try {
      const message: MCPWebSocketMessage = JSON.parse(data.toString());
      client.lastActivity = new Date();

      console.log(`WebSocket message from ${client.id}:`, message.type);

      switch (message.type) {
        case 'command':
          await this.handleCommandMessage(client, message);
          break;
        case 'subscribe':
          await this.handleSubscribeMessage(client, message);
          break;
        case 'unsubscribe':
          await this.handleUnsubscribeMessage(client, message);
          break;
        case 'ping':
          await this.handlePingMessage(client, message);
          break;
        case 'auth':
          await this.handleAuthMessage(client, message);
          break;
        default:
          this.sendErrorToClient(client, `Unknown message type: ${message.type}`, message.id);
      }
    } catch (error) {
      console.error(`Error handling WebSocket message from ${client.id}:`, error);
      this.sendErrorToClient(client, 'Invalid message format', undefined);
    }
  }

  private async handleCommandMessage(client: MCPWebSocketClient, message: MCPWebSocketMessage): Promise<void> {
    try {
      const command: MCPCommand = message.data;
      const correlationId = this.generateCorrelationId();

      // Execute command through router
      const stream = this.commandRouter.streamCommand(command, {
        sessionId: client.sessionId,
        agentId: client.agentId,
        userId: client.userId,
        correlationId
      });

      // Stream results back to client
      for await (const chunk of stream) {
        this.sendToClient(client, {
          type: 'response',
          id: message.id,
          data: chunk,
          timestamp: new Date().toISOString(),
          correlationId
        });
      }
    } catch (error) {
      this.sendErrorToClient(
        client,
        error instanceof Error ? error.message : 'Command execution failed',
        message.id
      );
    }
  }

  private async handleSubscribeMessage(client: MCPWebSocketClient, message: MCPWebSocketMessage): Promise<void> {
    const { channel } = message.data || {};
    
    if (!channel) {
      this.sendErrorToClient(client, 'Channel is required for subscription', message.id);
      return;
    }

    client.subscriptions.add(channel);
    
    this.sendToClient(client, {
      type: 'response',
      id: message.id,
      data: {
        subscribed: true,
        channel,
        totalSubscriptions: client.subscriptions.size
      },
      timestamp: new Date().toISOString()
    });

    console.log(`Client ${client.id} subscribed to channel: ${channel}`);
  }

  private async handleUnsubscribeMessage(client: MCPWebSocketClient, message: MCPWebSocketMessage): Promise<void> {
    const { channel } = message.data || {};
    
    if (!channel) {
      this.sendErrorToClient(client, 'Channel is required for unsubscription', message.id);
      return;
    }

    const wasSubscribed = client.subscriptions.delete(channel);
    
    this.sendToClient(client, {
      type: 'response',
      id: message.id,
      data: {
        unsubscribed: wasSubscribed,
        channel,
        totalSubscriptions: client.subscriptions.size
      },
      timestamp: new Date().toISOString()
    });

    console.log(`Client ${client.id} unsubscribed from channel: ${channel}`);
  }

  private async handlePingMessage(client: MCPWebSocketClient, message: MCPWebSocketMessage): Promise<void> {
    this.sendToClient(client, {
      type: 'pong',
      id: message.id,
      data: { timestamp: new Date().toISOString() },
      timestamp: new Date().toISOString()
    });
  }

  private async handleAuthMessage(client: MCPWebSocketClient, message: MCPWebSocketMessage): Promise<void> {
    const { sessionId, agentId, userId } = message.data || {};
    
    // Update client authentication
    if (sessionId) client.sessionId = sessionId;
    if (agentId) client.agentId = agentId;
    if (userId) client.userId = userId;

    this.sendToClient(client, {
      type: 'auth_result',
      id: message.id,
      data: {
        authenticated: true,
        sessionId: client.sessionId,
        agentId: client.agentId,
        userId: client.userId
      },
      timestamp: new Date().toISOString()
    });
  }

  private handleDisconnection(client: MCPWebSocketClient): void {
    this.clients.delete(client.id);
    console.log(`WebSocket client disconnected: ${client.id}`, {
      totalClients: this.clients.size
    });
  }

  // Public methods for broadcasting events
  public broadcastEvent(channel: string, event: any): void {
    const message: MCPWebSocketResponse = {
      type: 'event',
      data: {
        channel,
        event
      },
      timestamp: new Date().toISOString()
    };

    for (const client of this.clients.values()) {
      if (client.subscriptions.has(channel)) {
        this.sendToClient(client, message);
      }
    }
  }

  public sendToSession(sessionId: string, message: MCPWebSocketResponse): void {
    for (const client of this.clients.values()) {
      if (client.sessionId === sessionId) {
        this.sendToClient(client, message);
      }
    }
  }

  public sendToAgent(agentId: string, message: MCPWebSocketResponse): void {
    for (const client of this.clients.values()) {
      if (client.agentId === agentId) {
        this.sendToClient(client, message);
      }
    }
  }

  public sendToUser(userId: string, message: MCPWebSocketResponse): void {
    for (const client of this.clients.values()) {
      if (client.userId === userId) {
        this.sendToClient(client, message);
      }
    }
  }

  // Private helper methods
  private sendToClient(client: MCPWebSocketClient, message: MCPWebSocketResponse): void {
    if (client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error(`Error sending message to client ${client.id}:`, error);
      }
    }
  }

  private sendErrorToClient(client: MCPWebSocketClient, error: string, messageId?: string): void {
    this.sendToClient(client, {
      type: 'error',
      id: messageId,
      data: { error },
      timestamp: new Date().toISOString()
    });
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCorrelationId(): string {
    return `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = new Date();
      const timeout = 30000; // 30 seconds

      for (const [clientId, client] of this.clients.entries()) {
        const timeSinceLastActivity = now.getTime() - client.lastActivity.getTime();
        
        if (timeSinceLastActivity > timeout) {
          console.log(`Removing inactive WebSocket client: ${clientId}`);
          client.ws.terminate();
          this.clients.delete(clientId);
        }
      }
    }, 15000); // Check every 15 seconds
  }

  // Cleanup
  public shutdown(): void {
    console.log('Shutting down MCP WebSocket handler...');
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Close all client connections
    for (const client of this.clients.values()) {
      client.ws.close();
    }

    this.clients.clear();
    this.wss.close();
    
    console.log('MCP WebSocket handler shutdown complete');
  }

  // Statistics
  public getStats(): {
    totalClients: number;
    clientsBySession: Record<string, number>;
    clientsByAgent: Record<string, number>;
    totalSubscriptions: number;
  } {
    const clientsBySession: Record<string, number> = {};
    const clientsByAgent: Record<string, number> = {};
    let totalSubscriptions = 0;

    for (const client of this.clients.values()) {
      if (client.sessionId) {
        clientsBySession[client.sessionId] = (clientsBySession[client.sessionId] || 0) + 1;
      }
      if (client.agentId) {
        clientsByAgent[client.agentId] = (clientsByAgent[client.agentId] || 0) + 1;
      }
      totalSubscriptions += client.subscriptions.size;
    }

    return {
      totalClients: this.clients.size,
      clientsBySession,
      clientsByAgent,
      totalSubscriptions
    };
  }
}

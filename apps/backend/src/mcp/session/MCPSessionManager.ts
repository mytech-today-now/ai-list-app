/**
 * MCP Session Manager - Manages user sessions and agent contexts
 * SemanticType: MCPSessionManager
 * ExtensibleByAI: true
 * AIUseCases: ["Session lifecycle", "Context management", "State persistence"]
 */

import { Session } from '@ai-todo/shared-types';

export interface SessionStats {
  total: number;
  active: number;
  expired: number;
}

export interface CreateSessionOptions {
  agentId?: string;
  userId?: string;
  expirationMinutes?: number;
  metadata?: Record<string, unknown>;
}

export class MCPSessionManager {
  private sessions = new Map<string, Session>();
  private defaultExpirationMinutes = 30;

  constructor(options?: { defaultExpirationMinutes?: number }) {
    if (options?.defaultExpirationMinutes) {
      this.defaultExpirationMinutes = options.defaultExpirationMinutes;
    }

    // Start cleanup interval
    this.startCleanupInterval();
  }

  async createSession(options: CreateSessionOptions = {}): Promise<Session> {
    const sessionId = this.generateSessionId();
    const now = new Date();
    const expirationMinutes = options.expirationMinutes || this.defaultExpirationMinutes;
    const expiresAt = new Date(now.getTime() + expirationMinutes * 60 * 1000);

    const session: Session = {
      id: sessionId,
      agentId: options.agentId,
      userId: options.userId,
      status: 'active',
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      lastActivity: now.toISOString(),
      metadata: options.metadata || {}
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  async getSession(sessionId: string): Promise<Session | null> {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return null;
    }

    // Check if session is expired
    if (this.isSessionExpired(session)) {
      session.status = 'expired';
      this.sessions.set(sessionId, session);
      return null;
    }

    // Update last activity
    session.lastActivity = new Date().toISOString();
    this.sessions.set(sessionId, session);

    return session;
  }

  async updateSession(sessionId: string, updates: Partial<Session>): Promise<Session | null> {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return null;
    }

    const updatedSession = {
      ...session,
      ...updates,
      id: session.id, // Prevent ID changes
      lastActivity: new Date().toISOString()
    };

    this.sessions.set(sessionId, updatedSession);
    return updatedSession;
  }

  async extendSession(sessionId: string, additionalMinutes: number = 30): Promise<Session | null> {
    const session = this.sessions.get(sessionId);
    
    if (!session || session.status !== 'active') {
      return null;
    }

    const currentExpiration = new Date(session.expiresAt);
    const newExpiration = new Date(currentExpiration.getTime() + additionalMinutes * 60 * 1000);

    session.expiresAt = newExpiration.toISOString();
    session.lastActivity = new Date().toISOString();
    
    this.sessions.set(sessionId, session);
    return session;
  }

  async terminateSession(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return false;
    }

    session.status = 'terminated';
    session.lastActivity = new Date().toISOString();
    
    this.sessions.set(sessionId, session);
    return true;
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    return this.sessions.delete(sessionId);
  }

  async listSessions(filters?: {
    userId?: string;
    agentId?: string;
    status?: 'active' | 'expired' | 'terminated';
    limit?: number;
    offset?: number;
  }): Promise<Session[]> {
    let sessions = Array.from(this.sessions.values());

    if (filters) {
      if (filters.userId) {
        sessions = sessions.filter(session => session.userId === filters.userId);
      }
      if (filters.agentId) {
        sessions = sessions.filter(session => session.agentId === filters.agentId);
      }
      if (filters.status) {
        sessions = sessions.filter(session => session.status === filters.status);
      }
      if (filters.offset) {
        sessions = sessions.slice(filters.offset);
      }
      if (filters.limit) {
        sessions = sessions.slice(0, filters.limit);
      }
    }

    return sessions;
  }

  async getSessionStats(): Promise<SessionStats> {
    const sessions = Array.from(this.sessions.values());
    
    return {
      total: sessions.length,
      active: sessions.filter(session => session.status === 'active').length,
      expired: sessions.filter(session => session.status === 'expired').length
    };
  }

  async getActiveSessions(): Promise<Session[]> {
    return Array.from(this.sessions.values()).filter(session => 
      session.status === 'active' && !this.isSessionExpired(session)
    );
  }

  async getExpiredSessions(): Promise<Session[]> {
    return Array.from(this.sessions.values()).filter(session => 
      this.isSessionExpired(session) || session.status === 'expired'
    );
  }

  async getUserSessions(userId: string): Promise<Session[]> {
    return Array.from(this.sessions.values()).filter(session => 
      session.userId === userId
    );
  }

  async getAgentSessions(agentId: string): Promise<Session[]> {
    return Array.from(this.sessions.values()).filter(session => 
      session.agentId === agentId
    );
  }

  // Session validation
  async validateSession(sessionId: string): Promise<boolean> {
    const session = await this.getSession(sessionId);
    return session !== null && session.status === 'active';
  }

  // Session context management
  async setSessionContext(sessionId: string, key: string, value: any): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return false;
    }

    if (!session.metadata) {
      session.metadata = {};
    }

    session.metadata[key] = value;
    session.lastActivity = new Date().toISOString();
    
    this.sessions.set(sessionId, session);
    return true;
  }

  async getSessionContext(sessionId: string, key: string): Promise<any> {
    const session = this.sessions.get(sessionId);
    
    if (!session || !session.metadata) {
      return null;
    }

    return session.metadata[key] || null;
  }

  async clearSessionContext(sessionId: string, key?: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return false;
    }

    if (key) {
      if (session.metadata) {
        delete session.metadata[key];
      }
    } else {
      session.metadata = {};
    }

    session.lastActivity = new Date().toISOString();
    this.sessions.set(sessionId, session);
    return true;
  }

  // Private helper methods
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
  }

  private isSessionExpired(session: Session): boolean {
    return new Date() > new Date(session.expiresAt);
  }

  private startCleanupInterval(): void {
    // Clean up expired sessions every 5 minutes
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, 5 * 60 * 1000);
  }

  private async cleanupExpiredSessions(): Promise<number> {
    const expiredSessions = await this.getExpiredSessions();
    let cleanedCount = 0;

    for (const session of expiredSessions) {
      if (session.status !== 'expired') {
        session.status = 'expired';
        this.sessions.set(session.id, session);
      }

      // Delete sessions that have been expired for more than 1 hour
      const expiredTime = new Date(session.expiresAt).getTime();
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      
      if (expiredTime < oneHourAgo) {
        this.sessions.delete(session.id);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} expired sessions`);
    }

    return cleanedCount;
  }

  // Graceful shutdown
  async shutdown(): Promise<void> {
    console.log('MCPSessionManager shutting down...');
    
    // Mark all active sessions as terminated
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.status === 'active') {
        session.status = 'terminated';
        this.sessions.set(sessionId, session);
      }
    }

    console.log('MCPSessionManager shutdown complete');
  }
}

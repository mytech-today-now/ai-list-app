/**
 * Session Manager - Manages AI agent sessions and authentication
 * SemanticType: SessionManager
 * ExtensibleByAI: true
 * AIUseCases: ["Session management", "Authentication", "Agent tracking"]
 */

import { Session, Agent } from '@ai-todo/shared-types';

export interface SessionConfig {
  defaultExpirationMinutes: number;
  maxConcurrentSessions: number;
  enableSessionExtension: boolean;
}

export class SessionManager {
  private sessions: Map<string, Session> = new Map();
  private agentSessions: Map<string, Set<string>> = new Map(); // agentId -> sessionIds
  private config: SessionConfig;

  constructor(config: Partial<SessionConfig> = {}) {
    this.config = {
      defaultExpirationMinutes: 60,
      maxConcurrentSessions: 10,
      enableSessionExtension: true,
      ...config,
    };

    // Clean up expired sessions every 5 minutes
    setInterval(() => this.cleanupExpiredSessions(), 5 * 60 * 1000);
  }

  /**
   * Create a new session for an agent
   */
  async createSession(agentId: string, userId?: string): Promise<Session> {
    // Check concurrent session limit
    const existingSessions = this.agentSessions.get(agentId) || new Set();
    if (existingSessions.size >= this.config.maxConcurrentSessions) {
      throw new Error(`Maximum concurrent sessions (${this.config.maxConcurrentSessions}) reached for agent ${agentId}`);
    }

    const sessionId = this.generateSessionId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.config.defaultExpirationMinutes * 60 * 1000);

    const session: Session = {
      id: sessionId,
      agentId,
      userId,
      status: 'active',
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      lastActivity: now.toISOString(),
      metadata: {},
    };

    this.sessions.set(sessionId, session);
    
    // Track agent sessions
    if (!this.agentSessions.has(agentId)) {
      this.agentSessions.set(agentId, new Set());
    }
    this.agentSessions.get(agentId)!.add(sessionId);

    return session;
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<Session | null> {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return null;
    }

    // Check if session is expired
    if (this.isSessionExpired(session)) {
      await this.terminateSession(sessionId);
      return null;
    }

    return session;
  }

  /**
   * Update session activity
   */
  async updateActivity(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    
    if (!session || this.isSessionExpired(session)) {
      return;
    }

    session.lastActivity = new Date().toISOString();
    
    // Extend session if enabled
    if (this.config.enableSessionExtension) {
      const newExpiresAt = new Date(Date.now() + this.config.defaultExpirationMinutes * 60 * 1000);
      session.expiresAt = newExpiresAt.toISOString();
    }

    this.sessions.set(sessionId, session);
  }

  /**
   * Terminate a session
   */
  async terminateSession(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return false;
    }

    // Update session status
    session.status = 'terminated';
    this.sessions.set(sessionId, session);

    // Remove from agent sessions tracking
    if (session.agentId) {
      const agentSessions = this.agentSessions.get(session.agentId);
      if (agentSessions) {
        agentSessions.delete(sessionId);
        if (agentSessions.size === 0) {
          this.agentSessions.delete(session.agentId);
        }
      }
    }

    // Remove from active sessions after a delay (for audit purposes)
    setTimeout(() => {
      this.sessions.delete(sessionId);
    }, 24 * 60 * 60 * 1000); // Keep for 24 hours

    return true;
  }

  /**
   * Get all active sessions for an agent
   */
  async getAgentSessions(agentId: string): Promise<Session[]> {
    const sessionIds = this.agentSessions.get(agentId) || new Set();
    const sessions: Session[] = [];

    for (const sessionId of sessionIds) {
      const session = await this.getSession(sessionId);
      if (session && session.status === 'active') {
        sessions.push(session);
      }
    }

    return sessions;
  }

  /**
   * Validate session and return agent info
   */
  async validateSession(sessionId: string): Promise<{ valid: boolean; session?: Session; agentId?: string }> {
    const session = await this.getSession(sessionId);
    
    if (!session || session.status !== 'active') {
      return { valid: false };
    }

    // Update activity
    await this.updateActivity(sessionId);

    return {
      valid: true,
      session,
      agentId: session.agentId,
    };
  }

  /**
   * Get session statistics
   */
  getSessionStats(): {
    totalSessions: number;
    activeSessions: number;
    expiredSessions: number;
    agentsWithSessions: number;
  } {
    let activeSessions = 0;
    let expiredSessions = 0;

    for (const session of this.sessions.values()) {
      if (session.status === 'active' && !this.isSessionExpired(session)) {
        activeSessions++;
      } else {
        expiredSessions++;
      }
    }

    return {
      totalSessions: this.sessions.size,
      activeSessions,
      expiredSessions,
      agentsWithSessions: this.agentSessions.size,
    };
  }

  /**
   * Clean up expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = new Date();
    const expiredSessions: string[] = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      if (this.isSessionExpired(session)) {
        expiredSessions.push(sessionId);
      }
    }

    // Terminate expired sessions
    expiredSessions.forEach(sessionId => {
      this.terminateSession(sessionId);
    });

    if (expiredSessions.length > 0) {
      console.log(`Cleaned up ${expiredSessions.length} expired sessions`);
    }
  }

  /**
   * Check if session is expired
   */
  private isSessionExpired(session: Session): boolean {
    return new Date(session.expiresAt) < new Date();
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get manager status
   */
  getStatus(): object {
    return {
      status: 'active',
      config: this.config,
      stats: this.getSessionStats(),
    };
  }

  /**
   * Shutdown session manager
   */
  async shutdown(): Promise<void> {
    // Terminate all active sessions
    const activeSessions = Array.from(this.sessions.keys());
    await Promise.all(activeSessions.map(sessionId => this.terminateSession(sessionId)));
    
    this.sessions.clear();
    this.agentSessions.clear();
  }
}

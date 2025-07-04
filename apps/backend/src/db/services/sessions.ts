import { eq, and, or, desc, asc, lt, gte, sql } from 'drizzle-orm'
import { BaseService } from './base'
import { sessionsTable, agentsTable, type Session, type NewSession } from '../schema'
import { randomUUID } from 'crypto'

/**
 * Sessions service with expiration management and agent association
 */
export class SessionsService extends BaseService<typeof sessionsTable, Session, NewSession> {
  protected table = sessionsTable
  protected primaryKey = 'id' as const

  /**
   * Create a new session with automatic expiration
   */
  async createSession(agentId: string, userId?: string, expirationMinutes: number = 60): Promise<Session> {
    const now = new Date()
    const expiresAt = new Date(now.getTime() + expirationMinutes * 60 * 1000)

    const sessionData: NewSession = {
      id: randomUUID(),
      agentId,
      userId,
      status: 'active',
      createdAt: now,
      expiresAt,
      lastActivity: now,
      metadata: JSON.stringify({})
    }

    return await this.create(sessionData)
  }

  /**
   * Find sessions by agent ID
   */
  async findByAgentId(agentId: string, includeExpired: boolean = false): Promise<Session[]> {
    const db = await this.getDb()
    const now = new Date()
    
    let whereClause = eq(sessionsTable.agentId, agentId)
    
    if (!includeExpired) {
      whereClause = and(
        whereClause,
        or(
          eq(sessionsTable.status, 'active'),
          gte(sessionsTable.expiresAt, now)
        )
      )
    }

    return await db
      .select()
      .from(sessionsTable)
      .where(whereClause)
      .orderBy(desc(sessionsTable.lastActivity))
  }

  /**
   * Find sessions by user ID
   */
  async findByUserId(userId: string, includeExpired: boolean = false): Promise<Session[]> {
    const db = await this.getDb()
    const now = new Date()
    
    let whereClause = eq(sessionsTable.userId, userId)
    
    if (!includeExpired) {
      whereClause = and(
        whereClause,
        or(
          eq(sessionsTable.status, 'active'),
          gte(sessionsTable.expiresAt, now)
        )
      )
    }

    return await db
      .select()
      .from(sessionsTable)
      .where(whereClause)
      .orderBy(desc(sessionsTable.lastActivity))
  }

  /**
   * Find active sessions
   */
  async findActive(): Promise<Session[]> {
    const db = await this.getDb()
    const now = new Date()

    return await db
      .select()
      .from(sessionsTable)
      .where(and(
        eq(sessionsTable.status, 'active'),
        gte(sessionsTable.expiresAt, now)
      ))
      .orderBy(desc(sessionsTable.lastActivity))
  }

  /**
   * Find expired sessions
   */
  async findExpired(): Promise<Session[]> {
    const db = await this.getDb()
    const now = new Date()

    return await db
      .select()
      .from(sessionsTable)
      .where(and(
        eq(sessionsTable.status, 'active'),
        lt(sessionsTable.expiresAt, now)
      ))
      .orderBy(desc(sessionsTable.expiresAt))
  }

  /**
   * Update session activity and extend expiration
   */
  async updateActivity(sessionId: string, extendMinutes: number = 60): Promise<Session | null> {
    const session = await this.findById(sessionId)
    if (!session) {
      return null
    }

    const now = new Date()
    const newExpiresAt = new Date(now.getTime() + extendMinutes * 60 * 1000)

    return await this.updateById(sessionId, {
      lastActivity: now,
      expiresAt: newExpiresAt,
      updatedAt: now
    })
  }

  /**
   * Validate session and check if it's active and not expired
   */
  async validateSession(sessionId: string): Promise<{ valid: boolean; session?: Session; reason?: string }> {
    const session = await this.findById(sessionId)
    
    if (!session) {
      return { valid: false, reason: 'Session not found' }
    }

    if (session.status !== 'active') {
      return { valid: false, session, reason: 'Session is not active' }
    }

    const now = new Date()
    if (session.expiresAt < now) {
      // Auto-expire the session
      await this.expireSession(sessionId)
      return { valid: false, session, reason: 'Session has expired' }
    }

    // Update activity
    await this.updateActivity(sessionId)
    
    return { valid: true, session }
  }

  /**
   * Expire a session
   */
  async expireSession(sessionId: string): Promise<Session | null> {
    return await this.updateById(sessionId, {
      status: 'expired',
      updatedAt: new Date()
    })
  }

  /**
   * Terminate a session
   */
  async terminateSession(sessionId: string): Promise<Session | null> {
    return await this.updateById(sessionId, {
      status: 'terminated',
      updatedAt: new Date()
    })
  }

  /**
   * Cleanup expired sessions (mark as expired)
   */
  async cleanupExpiredSessions(): Promise<number> {
    const db = await this.getDb()
    const now = new Date()

    const result = await db
      .update(sessionsTable)
      .set({
        status: 'expired',
        updatedAt: now
      })
      .where(and(
        eq(sessionsTable.status, 'active'),
        lt(sessionsTable.expiresAt, now)
      ))
      .returning()

    return result.length
  }

  /**
   * Get session with agent information
   */
  async findWithAgent(sessionId: string): Promise<(Session & { agent?: any }) | null> {
    const db = await this.getDb()
    
    const result = await db
      .select({
        session: sessionsTable,
        agent: agentsTable
      })
      .from(sessionsTable)
      .leftJoin(agentsTable, eq(sessionsTable.agentId, agentsTable.id))
      .where(eq(sessionsTable.id, sessionId))
      .limit(1)

    if (result.length === 0) {
      return null
    }

    const { session, agent } = result[0]
    return {
      ...session,
      agent: agent ? { ...agent, apiKeyHash: undefined } : undefined
    }
  }

  /**
   * Get session statistics
   */
  async getSessionStats(): Promise<{
    total: number
    active: number
    expired: number
    terminated: number
    byAgent: Record<string, number>
  }> {
    const db = await this.getDb()

    const [totalResult, activeResult, expiredResult, terminatedResult, byAgentResult] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(sessionsTable),
      db.select({ count: sql<number>`count(*)` }).from(sessionsTable).where(eq(sessionsTable.status, 'active')),
      db.select({ count: sql<number>`count(*)` }).from(sessionsTable).where(eq(sessionsTable.status, 'expired')),
      db.select({ count: sql<number>`count(*)` }).from(sessionsTable).where(eq(sessionsTable.status, 'terminated')),
      db.select({
        agentId: sessionsTable.agentId,
        count: sql<number>`count(*)`
      }).from(sessionsTable).groupBy(sessionsTable.agentId)
    ])

    const byAgent: Record<string, number> = {}
    byAgentResult.forEach(row => {
      if (row.agentId) {
        byAgent[row.agentId] = Number(row.count)
      }
    })

    return {
      total: Number(totalResult[0]?.count || 0),
      active: Number(activeResult[0]?.count || 0),
      expired: Number(expiredResult[0]?.count || 0),
      terminated: Number(terminatedResult[0]?.count || 0),
      byAgent
    }
  }

  /**
   * Extend session expiration
   */
  async extendSession(sessionId: string, additionalMinutes: number): Promise<Session | null> {
    const session = await this.findById(sessionId)
    if (!session || session.status !== 'active') {
      return null
    }

    const newExpiresAt = new Date(session.expiresAt.getTime() + additionalMinutes * 60 * 1000)

    return await this.updateById(sessionId, {
      expiresAt: newExpiresAt,
      updatedAt: new Date()
    })
  }

  /**
   * Terminate all sessions for an agent
   */
  async terminateAgentSessions(agentId: string): Promise<number> {
    const db = await this.getDb()
    const now = new Date()

    const result = await db
      .update(sessionsTable)
      .set({
        status: 'terminated',
        updatedAt: now
      })
      .where(and(
        eq(sessionsTable.agentId, agentId),
        eq(sessionsTable.status, 'active')
      ))
      .returning()

    return result.length
  }

  /**
   * Terminate all sessions for a user
   */
  async terminateUserSessions(userId: string): Promise<number> {
    const db = await this.getDb()
    const now = new Date()

    const result = await db
      .update(sessionsTable)
      .set({
        status: 'terminated',
        updatedAt: now
      })
      .where(and(
        eq(sessionsTable.userId, userId),
        eq(sessionsTable.status, 'active')
      ))
      .returning()

    return result.length
  }

  /**
   * Get sessions expiring soon (within specified minutes)
   */
  async findExpiringSoon(withinMinutes: number = 30): Promise<Session[]> {
    const db = await this.getDb()
    const now = new Date()
    const threshold = new Date(now.getTime() + withinMinutes * 60 * 1000)

    return await db
      .select()
      .from(sessionsTable)
      .where(and(
        eq(sessionsTable.status, 'active'),
        gte(sessionsTable.expiresAt, now),
        lt(sessionsTable.expiresAt, threshold)
      ))
      .orderBy(asc(sessionsTable.expiresAt))
  }

  /**
   * Update session metadata
   */
  async updateMetadata(sessionId: string, metadata: Record<string, any>): Promise<Session | null> {
    return await this.updateById(sessionId, {
      metadata: JSON.stringify(metadata),
      updatedAt: new Date()
    })
  }
}

// Export service instance
export const sessionsService = new SessionsService()

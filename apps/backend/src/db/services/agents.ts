import { eq, and, or, desc, asc, sql } from 'drizzle-orm'
import { BaseService } from './base'
import { agentsTable, actionLogsTable, type Agent, type NewAgent } from '../schema'
import bcrypt from 'bcryptjs'

/**
 * Agents service with authentication and activity tracking
 */
export class AgentsService extends BaseService<typeof agentsTable, Agent, NewAgent> {
  protected table = agentsTable
  protected primaryKey = 'id' as const

  /**
   * Find agents by role
   */
  async findByRole(role: string): Promise<Agent[]> {
    const db = await this.getDb()
    return await db
      .select()
      .from(agentsTable)
      .where(and(
        eq(agentsTable.role, role),
        eq(agentsTable.status, 'active')
      ))
      .orderBy(asc(agentsTable.name))
  }

  /**
   * Find active agents
   */
  async findActive(): Promise<Agent[]> {
    const db = await this.getDb()
    return await db
      .select()
      .from(agentsTable)
      .where(eq(agentsTable.status, 'active'))
      .orderBy(desc(agentsTable.lastActive), asc(agentsTable.name))
  }

  /**
   * Create agent with hashed API key
   */
  async createWithApiKey(data: Omit<NewAgent, 'apiKeyHash'> & { apiKey: string }): Promise<Agent> {
    const { apiKey, ...agentData } = data
    const apiKeyHash = await bcrypt.hash(apiKey, 10)
    
    return await this.create({
      ...agentData,
      apiKeyHash,
      createdAt: new Date(),
      updatedAt: new Date()
    })
  }

  /**
   * Verify agent API key
   */
  async verifyApiKey(agentId: string, apiKey: string): Promise<boolean> {
    const agent = await this.findById(agentId)
    if (!agent || !agent.apiKeyHash || agent.status !== 'active') {
      return false
    }
    
    return await bcrypt.compare(apiKey, agent.apiKeyHash)
  }

  /**
   * Update last active timestamp
   */
  async updateLastActive(agentId: string): Promise<void> {
    await this.updateById(agentId, {
      lastActive: new Date(),
      updatedAt: new Date()
    })
  }

  /**
   * Check if agent has permission
   */
  async hasPermission(agentId: string, permission: string): Promise<boolean> {
    const agent = await this.findById(agentId)
    if (!agent || agent.status !== 'active') {
      return false
    }

    try {
      const permissions = JSON.parse(agent.permissions || '[]')
      return permissions.includes(permission) || permissions.includes('*')
    } catch {
      return false
    }
  }

  /**
   * Add permission to agent
   */
  async addPermission(agentId: string, permission: string): Promise<Agent | null> {
    const agent = await this.findById(agentId)
    if (!agent) return null

    try {
      const permissions = JSON.parse(agent.permissions || '[]')
      if (!permissions.includes(permission)) {
        permissions.push(permission)
        return await this.updateById(agentId, {
          permissions: JSON.stringify(permissions),
          updatedAt: new Date()
        })
      }
      return agent
    } catch {
      return await this.updateById(agentId, {
        permissions: JSON.stringify([permission]),
        updatedAt: new Date()
      })
    }
  }

  /**
   * Remove permission from agent
   */
  async removePermission(agentId: string, permission: string): Promise<Agent | null> {
    const agent = await this.findById(agentId)
    if (!agent) return null

    try {
      const permissions = JSON.parse(agent.permissions || '[]')
      const filteredPermissions = permissions.filter((p: string) => p !== permission)
      
      return await this.updateById(agentId, {
        permissions: JSON.stringify(filteredPermissions),
        updatedAt: new Date()
      })
    } catch {
      return agent
    }
  }

  /**
   * Update agent configuration
   */
  async updateConfiguration(agentId: string, config: Record<string, any>): Promise<Agent | null> {
    const agent = await this.findById(agentId)
    if (!agent) return null

    try {
      const currentConfig = JSON.parse(agent.configuration || '{}')
      const newConfig = { ...currentConfig, ...config }
      
      return await this.updateById(agentId, {
        configuration: JSON.stringify(newConfig),
        updatedAt: new Date()
      })
    } catch {
      return await this.updateById(agentId, {
        configuration: JSON.stringify(config),
        updatedAt: new Date()
      })
    }
  }

  /**
   * Get agent activity summary
   */
  async getActivitySummary(agentId: string, days: number = 30): Promise<{
    totalActions: number
    successfulActions: number
    failedActions: number
    successRate: number
    lastAction: Date | null
    actionsPerDay: { date: string; count: number }[]
  }> {
    const db = await this.getDb()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get action counts
    const actionStats = await db
      .select({
        total: sql<number>`COUNT(*)`,
        successful: sql<number>`COUNT(CASE WHEN ${actionLogsTable.success} = true THEN 1 END)`,
        failed: sql<number>`COUNT(CASE WHEN ${actionLogsTable.success} = false THEN 1 END)`,
        lastAction: sql<Date>`MAX(${actionLogsTable.timestamp})`
      })
      .from(actionLogsTable)
      .where(and(
        eq(actionLogsTable.agentId, agentId),
        sql`${actionLogsTable.timestamp} >= ${startDate}`
      ))

    const stats = actionStats[0] || { total: 0, successful: 0, failed: 0, lastAction: null }

    // Get daily action counts
    const dailyActions = await db
      .select({
        date: sql<string>`DATE(${actionLogsTable.timestamp})`,
        count: sql<number>`COUNT(*)`
      })
      .from(actionLogsTable)
      .where(and(
        eq(actionLogsTable.agentId, agentId),
        sql`${actionLogsTable.timestamp} >= ${startDate}`
      ))
      .groupBy(sql`DATE(${actionLogsTable.timestamp})`)
      .orderBy(sql`DATE(${actionLogsTable.timestamp})`)

    return {
      totalActions: stats.total,
      successfulActions: stats.successful,
      failedActions: stats.failed,
      successRate: stats.total > 0 ? (stats.successful / stats.total) * 100 : 0,
      lastAction: stats.lastAction,
      actionsPerDay: dailyActions
    }
  }

  /**
   * Suspend agent
   */
  async suspend(agentId: string, reason?: string): Promise<Agent | null> {
    const metadata = reason ? { suspensionReason: reason, suspendedAt: new Date() } : undefined
    
    return await this.updateById(agentId, {
      status: 'suspended',
      metadata: metadata ? JSON.stringify(metadata) : undefined,
      updatedAt: new Date()
    })
  }

  /**
   * Reactivate suspended agent
   */
  async reactivate(agentId: string): Promise<Agent | null> {
    return await this.updateById(agentId, {
      status: 'active',
      updatedAt: new Date()
    })
  }

  /**
   * Get agents with recent activity
   */
  async findRecentlyActive(hours: number = 24): Promise<Agent[]> {
    const db = await this.getDb()
    const cutoffTime = new Date()
    cutoffTime.setHours(cutoffTime.getHours() - hours)

    return await db
      .select()
      .from(agentsTable)
      .where(and(
        eq(agentsTable.status, 'active'),
        sql`${agentsTable.lastActive} >= ${cutoffTime}`
      ))
      .orderBy(desc(agentsTable.lastActive))
  }

  /**
   * Search agents by name or role
   */
  async search(query: string): Promise<Agent[]> {
    const db = await this.getDb()
    const searchTerm = `%${query.toLowerCase()}%`
    
    return await db
      .select()
      .from(agentsTable)
      .where(and(
        eq(agentsTable.status, 'active'),
        or(
          sql`LOWER(${agentsTable.name}) LIKE ${searchTerm}`,
          sql`LOWER(${agentsTable.role}) LIKE ${searchTerm}`
        )
      ))
      .orderBy(asc(agentsTable.name))
  }
}

export const agentsService = new AgentsService()

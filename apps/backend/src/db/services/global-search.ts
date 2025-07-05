import { eq, and, or, desc, asc, inArray, sql } from 'drizzle-orm'
import { listsTable, itemsTable, agentsTable, type List, type Item, type Agent } from '../schema'
import { BaseService } from './base'

/**
 * Global search result interface
 */
export interface GlobalSearchResult {
  type: 'list' | 'item' | 'agent'
  id: string
  title: string
  description?: string
  status?: string
  priority?: string
  relevanceScore: number
  metadata?: Record<string, any>
}

/**
 * Global search service for searching across multiple entity types
 */
export class GlobalSearchService extends BaseService<any, any, any> {
  protected table = listsTable // Not used for global search
  protected primaryKey = 'id' as const

  /**
   * Search across multiple entity types
   */
  async globalSearch(options: {
    query: string
    types?: string[]
    fields?: string[]
    status?: string[]
    priority?: string[]
    page?: number
    limit?: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
    includeArchived?: boolean
  }): Promise<{ results: GlobalSearchResult[], total: number, page: number, totalPages: number }> {
    const db = await this.getDb()
    const {
      query,
      types = ['lists', 'items'],
      fields = ['title', 'description', 'name'],
      status,
      priority,
      page = 1,
      limit = 20,
      sortBy = 'relevance',
      sortOrder = 'desc',
      includeArchived = false
    } = options

    const searchTerm = `%${query.toLowerCase()}%`
    const offset = (page - 1) * limit
    const results: GlobalSearchResult[] = []

    // Search in lists
    if (types.includes('lists')) {
      const listSearchConditions = []
      if (fields.includes('title')) {
        listSearchConditions.push(sql`LOWER(${listsTable.title}) LIKE ${searchTerm}`)
      }
      if (fields.includes('description')) {
        listSearchConditions.push(sql`LOWER(${listsTable.description}) LIKE ${searchTerm}`)
      }

      const listFilterConditions = []
      if (status && status.length > 0) {
        listFilterConditions.push(inArray(listsTable.status, status))
      } else if (!includeArchived) {
        listFilterConditions.push(sql`${listsTable.status} != 'archived' AND ${listsTable.status} != 'deleted'`)
      }

      if (priority && priority.length > 0) {
        listFilterConditions.push(inArray(listsTable.priority, priority))
      }

      const listResults = await db
        .select({
          id: listsTable.id,
          title: listsTable.title,
          description: listsTable.description,
          status: listsTable.status,
          priority: listsTable.priority,
          createdAt: listsTable.createdAt,
          updatedAt: listsTable.updatedAt
        })
        .from(listsTable)
        .where(and(
          or(...listSearchConditions),
          ...listFilterConditions
        ))

      results.push(...listResults.map(list => ({
        type: 'list' as const,
        id: list.id,
        title: list.title,
        description: list.description || undefined,
        status: list.status,
        priority: list.priority,
        relevanceScore: this.calculateRelevanceScore(query, list.title, list.description),
        metadata: {
          createdAt: list.createdAt,
          updatedAt: list.updatedAt
        }
      })))
    }

    // Search in items
    if (types.includes('items')) {
      const itemSearchConditions = []
      if (fields.includes('title')) {
        itemSearchConditions.push(sql`LOWER(${itemsTable.title}) LIKE ${searchTerm}`)
      }
      if (fields.includes('description')) {
        itemSearchConditions.push(sql`LOWER(${itemsTable.description}) LIKE ${searchTerm}`)
      }
      if (fields.includes('tags')) {
        itemSearchConditions.push(sql`LOWER(${itemsTable.tags}) LIKE ${searchTerm}`)
      }

      const itemFilterConditions = []
      if (status && status.length > 0) {
        itemFilterConditions.push(inArray(itemsTable.status, status))
      }

      if (priority && priority.length > 0) {
        itemFilterConditions.push(inArray(itemsTable.priority, priority))
      }

      const itemResults = await db
        .select({
          id: itemsTable.id,
          title: itemsTable.title,
          description: itemsTable.description,
          status: itemsTable.status,
          priority: itemsTable.priority,
          listId: itemsTable.listId,
          tags: itemsTable.tags,
          dueDate: itemsTable.dueDate,
          createdAt: itemsTable.createdAt,
          updatedAt: itemsTable.updatedAt
        })
        .from(itemsTable)
        .where(and(
          or(...itemSearchConditions),
          ...itemFilterConditions
        ))

      results.push(...itemResults.map(item => ({
        type: 'item' as const,
        id: item.id,
        title: item.title,
        description: item.description || undefined,
        status: item.status,
        priority: item.priority,
        relevanceScore: this.calculateRelevanceScore(query, item.title, item.description),
        metadata: {
          listId: item.listId,
          tags: item.tags,
          dueDate: item.dueDate,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt
        }
      })))
    }

    // Search in agents
    if (types.includes('agents')) {
      const agentSearchConditions = []
      if (fields.includes('name')) {
        agentSearchConditions.push(sql`LOWER(${agentsTable.name}) LIKE ${searchTerm}`)
      }

      const agentFilterConditions = []
      if (status && status.length > 0) {
        agentFilterConditions.push(inArray(agentsTable.status, status))
      } else if (!includeArchived) {
        agentFilterConditions.push(sql`${agentsTable.status} = 'active'`)
      }

      const agentResults = await db
        .select({
          id: agentsTable.id,
          name: agentsTable.name,
          role: agentsTable.role,
          status: agentsTable.status,
          createdAt: agentsTable.createdAt,
          updatedAt: agentsTable.updatedAt
        })
        .from(agentsTable)
        .where(and(
          or(...agentSearchConditions),
          ...agentFilterConditions
        ))

      results.push(...agentResults.map(agent => ({
        type: 'agent' as const,
        id: agent.id,
        title: agent.name,
        description: undefined,
        status: agent.status,
        priority: undefined,
        relevanceScore: this.calculateRelevanceScore(query, agent.name),
        metadata: {
          role: agent.role,
          createdAt: agent.createdAt,
          updatedAt: agent.updatedAt
        }
      })))
    }

    // Sort results
    if (sortBy === 'relevance') {
      results.sort((a, b) => sortOrder === 'desc' ? b.relevanceScore - a.relevanceScore : a.relevanceScore - b.relevanceScore)
    } else {
      results.sort((a, b) => {
        const aValue = a.metadata?.[sortBy] || a[sortBy as keyof GlobalSearchResult]
        const bValue = b.metadata?.[sortBy] || b[sortBy as keyof GlobalSearchResult]
        
        if (sortOrder === 'desc') {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
        } else {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
        }
      })
    }

    // Apply pagination
    const total = results.length
    const paginatedResults = results.slice(offset, offset + limit)
    const totalPages = Math.ceil(total / limit)

    return {
      results: paginatedResults,
      total,
      page,
      totalPages
    }
  }

  /**
   * Calculate relevance score based on query match
   */
  private calculateRelevanceScore(query: string, title: string, description?: string): number {
    const queryLower = query.toLowerCase()
    const titleLower = title.toLowerCase()
    const descriptionLower = description?.toLowerCase() || ''

    let score = 0

    // Exact title match gets highest score
    if (titleLower === queryLower) {
      score += 100
    }
    // Title starts with query
    else if (titleLower.startsWith(queryLower)) {
      score += 80
    }
    // Title contains query
    else if (titleLower.includes(queryLower)) {
      score += 60
    }

    // Description matches
    if (description) {
      if (descriptionLower.includes(queryLower)) {
        score += 20
      }
    }

    // Boost score for shorter titles (more specific matches)
    if (title.length < 50) {
      score += 10
    }

    return score
  }
}

export const globalSearchService = new GlobalSearchService()

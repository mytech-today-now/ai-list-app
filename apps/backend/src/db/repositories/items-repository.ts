import { eq, and, or, desc, asc, sql, inArray, gte, lte, isNull } from 'drizzle-orm'
import { BaseService, QueryOptions, FilterCondition } from '../services/base'
import { itemsTable, itemDependenciesTable, listsTable, type Item, type NewItem } from '../schema'
import { QueryBuilderFactory, FilterBuilder } from '../query-builder'
import { getTransactionManager, TransactionOptions } from '../transaction-manager'
import { MCPAwareRepository } from '../mcp-repository-extensions'
import { CachedRepositoryMixin } from '../performance-cache'
import { Repository } from '../repository-registry'

/**
 * SemanticType: ItemsRepository
 * Description: Specialized repository for Items entity with dependency management and advanced querying
 * ExtensibleByAI: true
 * AIUseCases:
 *   - Add item template management
 *   - Implement smart scheduling algorithms
 *   - Add item analytics and time tracking
 *   - Integrate with external calendar systems
 */

/**
 * Item dependency information
 */
export interface ItemDependencyInfo {
  item: Item
  dependencies: Item[]
  dependents: Item[]
  canStart: boolean
  blockedBy: Item[]
}

/**
 * Item search options
 */
export interface ItemSearchOptions extends QueryOptions {
  includeCompleted?: boolean
  dueDateRange?: { start?: Date; end?: Date }
  priorityFilter?: string[]
  statusFilter?: string[]
  assigneeFilter?: string[]
  tagFilter?: string[]
}

/**
 * Item statistics
 */
export interface ItemStats {
  totalItems: number
  completedItems: number
  overdueItems: number
  averageCompletionTime?: number
  productivityScore: number
}

/**
 * Advanced Items Repository with dependency management, MCP integration, and caching
 */
@Repository({
  name: 'items',
  entityType: 'Item',
  description: 'Repository for managing items with dependency tracking and MCP support',
  dependencies: [],
  singleton: true
})
export class ItemsRepository extends MCPAwareRepository<typeof itemsTable, Item, NewItem> {
  protected table = itemsTable
  protected primaryKey = 'id' as const
  private cacheMixin: CachedRepositoryMixin

  constructor() {
    super()
    this.cacheMixin = new CachedRepositoryMixin({
      maxSize: 2000,
      ttl: 3 * 60 * 1000 // 3 minutes
    })
    this.initializeCustomMCPTools()
  }

  /**
   * Get entity name for MCP integration
   */
  protected getEntityName(): string {
    return 'items'
  }

  /**
   * Get entity schema for MCP
   */
  protected getEntitySchema(): any {
    return {
      type: 'object',
      properties: {
        id: { type: 'string' },
        listId: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
        position: { type: 'number' },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
        status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'cancelled', 'blocked'] },
        dueDate: { type: 'string', format: 'date-time', nullable: true },
        estimatedDuration: { type: 'number' },
        actualDuration: { type: 'number', nullable: true },
        tags: { type: 'array', items: { type: 'string' } },
        dependencies: { type: 'array', items: { type: 'string' } },
        createdBy: { type: 'string' },
        assignedTo: { type: 'string', nullable: true },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
        completedAt: { type: 'string', format: 'date-time', nullable: true },
        metadata: { type: 'object' }
      }
    }
  }

  /**
   * Get entity statistics for MCP
   */
  protected async getEntityStatistics(): Promise<any> {
    return this.cacheMixin.executeWithCache(
      'items:statistics',
      async () => {
        const totalItems = await this.count()
        const completedItems = await this.count(eq(itemsTable.status, 'completed'))
        const pendingItems = await this.count(eq(itemsTable.status, 'pending'))
        const inProgressItems = await this.count(eq(itemsTable.status, 'in_progress'))
        const overdueItems = await this.getOverdueItems()

        return {
          total: totalItems,
          completed: completedItems,
          pending: pendingItems,
          inProgress: inProgressItems,
          overdue: overdueItems.length,
          completionRate: totalItems > 0 ? (completedItems / totalItems) * 100 : 0
        }
      },
      {},
      { ttl: 2 * 60 * 1000 } // 2 minutes cache
    )
  }

  /**
   * Initialize custom MCP tools for items
   */
  private initializeCustomMCPTools(): void {
    this.registerCustomMCPTool({
      name: 'items.findWithDependencies',
      description: 'Find item with complete dependency information',
      inputSchema: {
        type: 'object',
        properties: {
          itemId: { type: 'string' }
        },
        required: ['itemId']
      },
      handler: async (params) => {
        return this.findWithDependencies(params.itemId)
      }
    })

    this.registerCustomMCPTool({
      name: 'items.getStartableItems',
      description: 'Get items that can be started (no blocking dependencies)',
      inputSchema: {
        type: 'object',
        properties: {
          listId: { type: 'string' }
        }
      },
      handler: async (params) => {
        return this.getStartableItems(params.listId)
      }
    })

    this.registerCustomMCPTool({
      name: 'items.addDependency',
      description: 'Add dependency between items',
      inputSchema: {
        type: 'object',
        properties: {
          itemId: { type: 'string' },
          dependsOnItemId: { type: 'string' }
        },
        required: ['itemId', 'dependsOnItemId']
      },
      handler: async (params) => {
        await this.addDependency(params.itemId, params.dependsOnItemId)
        return { success: true }
      }
    })

    this.registerCustomMCPResource({
      uri: 'items://overdue',
      name: 'Overdue Items',
      description: 'All overdue items across the system',
      mimeType: 'application/json',
      handler: async () => {
        return this.getOverdueItems()
      }
    })
  }

  /**
   * Find items by list with advanced filtering
   */
  async findByList(
    listId: string,
    options: ItemSearchOptions = {}
  ): Promise<Item[]> {
    const filters: FilterCondition[] = [
      { field: 'listId', operator: 'eq', value: listId },
      ...(options.filters || [])
    ]

    // Add status filter
    if (!options.includeCompleted) {
      filters.push({ field: 'status', operator: 'ne', value: 'completed' })
    }

    if (options.statusFilter) {
      filters.push({ field: 'status', operator: 'in', values: options.statusFilter })
    }

    // Add priority filter
    if (options.priorityFilter) {
      filters.push({ field: 'priority', operator: 'in', values: options.priorityFilter })
    }

    // Add assignee filter
    if (options.assigneeFilter) {
      filters.push({ field: 'assignedTo', operator: 'in', values: options.assigneeFilter })
    }

    // Add due date range filter
    if (options.dueDateRange) {
      if (options.dueDateRange.start) {
        filters.push({ field: 'dueDate', operator: 'gte', value: options.dueDateRange.start })
      }
      if (options.dueDateRange.end) {
        filters.push({ field: 'dueDate', operator: 'lte', value: options.dueDateRange.end })
      }
    }

    return this.findAll({
      ...options,
      filters,
      sorts: options.sorts || [
        { field: 'position', direction: 'asc' },
        { field: 'priority', direction: 'desc' },
        { field: 'dueDate', direction: 'asc' }
      ]
    })
  }

  /**
   * Find items with dependency information
   */
  async findWithDependencies(itemId: string): Promise<ItemDependencyInfo | null> {
    const transactionManager = getTransactionManager()
    
    const result = await transactionManager.executeTransaction(async (db, context) => {
      const item = await this.findById(itemId)
      if (!item) return null

      // Get direct dependencies
      const dependencies = await this.getDependencies(itemId)
      
      // Get items that depend on this item
      const dependents = await this.getDependents(itemId)
      
      // Check if item can start (all dependencies completed)
      const canStart = await this.canItemStart(itemId)
      
      // Get items blocking this one
      const blockedBy = dependencies.filter(dep => dep.status !== 'completed')

      return {
        item,
        dependencies,
        dependents,
        canStart,
        blockedBy
      }
    }, { readOnly: true })

    return result.success ? result.result! : null
  }

  /**
   * Get items that can be started (no blocking dependencies)
   */
  async getStartableItems(listId?: string): Promise<Item[]> {
    const query = QueryBuilderFactory
      .for<Item>(itemsTable)
      .where(builder => {
        builder.notEquals(itemsTable.status, 'completed')
        
        if (listId) {
          builder.and(new FilterBuilder().equals(itemsTable.listId, listId))
        }
        
        return builder
      })

    const allItems = await query.execute()
    const startableItems: Item[] = []

    // Check each item's dependencies
    for (const item of allItems) {
      const canStart = await this.canItemStart(item.id)
      if (canStart) {
        startableItems.push(item)
      }
    }

    return startableItems
  }

  /**
   * Search items with advanced filtering
   */
  async search(
    searchQuery: string,
    options: ItemSearchOptions = {}
  ): Promise<Item[]> {
    const searchTerm = `%${searchQuery.toLowerCase()}%`
    
    const query = QueryBuilderFactory
      .for<Item>(itemsTable)
      .where(builder => 
        builder
          .like(itemsTable.title, searchTerm)
          .or(new FilterBuilder().like(itemsTable.description, searchTerm))
      )

    // Apply additional filters
    if (options.statusFilter) {
      query.where(builder => builder.in(itemsTable.status, options.statusFilter!))
    }

    if (options.priorityFilter) {
      query.where(builder => builder.in(itemsTable.priority, options.priorityFilter!))
    }

    if (options.assigneeFilter) {
      query.where(builder => builder.in(itemsTable.assignedTo, options.assigneeFilter!))
    }

    if (options.dueDateRange) {
      if (options.dueDateRange.start) {
        query.where(builder => builder.greaterThanOrEqual(itemsTable.dueDate, options.dueDateRange!.start!))
      }
      if (options.dueDateRange.end) {
        query.where(builder => builder.lessThanOrEqual(itemsTable.dueDate, options.dueDateRange!.end!))
      }
    }

    // Tag filtering (JSON array search)
    if (options.tagFilter && options.tagFilter.length > 0) {
      query.where(builder => {
        options.tagFilter!.forEach(tag => {
          builder.custom(sql`JSON_EXTRACT(${itemsTable.tags}, '$') LIKE '%${tag}%'`)
        })
        return builder
      })
    }

    // Apply sorting
    if (options.sorts) {
      options.sorts.forEach(sort => {
        query.orderBy((itemsTable as any)[sort.field], sort.direction.toUpperCase() as 'ASC' | 'DESC')
      })
    } else {
      query.orderBy(itemsTable.updatedAt, 'DESC')
    }

    // Apply pagination
    if (options.limit) query.limit(options.limit)
    if (options.offset) query.offset(options.offset)

    return query.execute()
  }

  /**
   * Get overdue items
   */
  async getOverdueItems(assignedTo?: string): Promise<Item[]> {
    const now = new Date()
    
    const filters: FilterCondition[] = [
      { field: 'dueDate', operator: 'lt', value: now },
      { field: 'status', operator: 'ne', value: 'completed' }
    ]

    if (assignedTo) {
      filters.push({ field: 'assignedTo', operator: 'eq', value: assignedTo })
    }

    return this.findAll({
      filters,
      sorts: [{ field: 'dueDate', direction: 'asc' }]
    })
  }

  /**
   * Add dependency between items
   */
  async addDependency(
    itemId: string,
    dependsOnItemId: string
  ): Promise<void> {
    const transactionManager = getTransactionManager()
    
    const result = await transactionManager.executeTransaction(async (db, context) => {
      // Validate items exist
      const [item, dependsOnItem] = await Promise.all([
        this.findById(itemId),
        this.findById(dependsOnItemId)
      ])

      if (!item || !dependsOnItem) {
        throw new Error('One or both items not found')
      }

      // Check for circular dependency
      const wouldCreateCycle = await this.wouldCreateCircularDependency(itemId, dependsOnItemId)
      if (wouldCreateCycle) {
        throw new Error('Cannot add dependency: would create circular dependency')
      }

      // Add dependency record
      await db.insert(itemDependenciesTable).values({
        itemId,
        dependsOnItemId,
        createdAt: new Date()
      })

      transactionManager.logOperation(context, 'INSERT', 'item_dependencies', 1, {
        action: 'add_dependency',
        itemId,
        dependsOnItemId
      })
    })

    if (!result.success) {
      throw result.error
    }
  }

  /**
   * Remove dependency between items
   */
  async removeDependency(
    itemId: string,
    dependsOnItemId: string
  ): Promise<void> {
    const transactionManager = getTransactionManager()
    
    const result = await transactionManager.executeTransaction(async (db, context) => {
      await db
        .delete(itemDependenciesTable)
        .where(and(
          eq(itemDependenciesTable.itemId, itemId),
          eq(itemDependenciesTable.dependsOnItemId, dependsOnItemId)
        ))

      transactionManager.logOperation(context, 'DELETE', 'item_dependencies', 1, {
        action: 'remove_dependency',
        itemId,
        dependsOnItemId
      })
    })

    if (!result.success) {
      throw result.error
    }
  }

  /**
   * Reorder items within a list
   */
  async reorderInList(
    listId: string,
    itemIds: string[]
  ): Promise<Item[]> {
    const transactionManager = getTransactionManager()
    
    const result = await transactionManager.executeTransaction(async (db, context) => {
      const updatedItems: Item[] = []

      for (let i = 0; i < itemIds.length; i++) {
        const item = await this.updateById(itemIds[i], {
          position: i,
          updatedAt: new Date()
        })
        
        if (item) {
          updatedItems.push(item)
        }
      }

      transactionManager.logOperation(context, 'UPDATE', 'items', itemIds.length, {
        action: 'reorder_in_list',
        listId,
        itemIds
      })

      return updatedItems
    })

    if (!result.success) {
      throw result.error
    }

    return result.result!
  }

  /**
   * Mark item as completed with duration tracking
   */
  async markCompleted(
    itemId: string,
    actualDuration?: number
  ): Promise<Item> {
    const transactionManager = getTransactionManager()
    
    const result = await transactionManager.executeTransaction(async (db, context) => {
      const updateData: Partial<NewItem> = {
        status: 'completed',
        completedAt: new Date(),
        updatedAt: new Date()
      }

      if (actualDuration !== undefined) {
        updateData.actualDuration = actualDuration
      }

      const item = await this.updateById(itemId, updateData)
      if (!item) {
        throw new Error(`Item with ID ${itemId} not found`)
      }

      transactionManager.logOperation(context, 'UPDATE', 'items', 1, {
        action: 'mark_completed',
        itemId,
        actualDuration
      })

      return item
    })

    if (!result.success) {
      throw result.error
    }

    return result.result!
  }

  /**
   * Get item statistics for a list or user
   */
  async getItemStatistics(
    listId?: string,
    assignedTo?: string
  ): Promise<ItemStats> {
    const filters: FilterCondition[] = []
    
    if (listId) {
      filters.push({ field: 'listId', operator: 'eq', value: listId })
    }
    
    if (assignedTo) {
      filters.push({ field: 'assignedTo', operator: 'eq', value: assignedTo })
    }

    const items = await this.findAll({ filters })
    const now = new Date()

    const totalItems = items.length
    const completedItems = items.filter(i => i.status === 'completed').length
    const overdueItems = items.filter(i => 
      i.dueDate && new Date(i.dueDate) < now && i.status !== 'completed'
    ).length

    // Calculate average completion time
    const completedWithDuration = items.filter(i => 
      i.status === 'completed' && i.actualDuration
    )
    const averageCompletionTime = completedWithDuration.length > 0
      ? completedWithDuration.reduce((sum, i) => sum + (i.actualDuration || 0), 0) / completedWithDuration.length
      : undefined

    // Calculate productivity score (0-100)
    const completionRate = totalItems > 0 ? (completedItems / totalItems) * 100 : 0
    const overdueRate = totalItems > 0 ? (overdueItems / totalItems) * 100 : 0
    const productivityScore = Math.max(0, completionRate - overdueRate)

    return {
      totalItems,
      completedItems,
      overdueItems,
      averageCompletionTime,
      productivityScore
    }
  }

  /**
   * Helper: Get item dependencies
   */
  private async getDependencies(itemId: string): Promise<Item[]> {
    const query = QueryBuilderFactory
      .for<Item>(itemsTable)
      .innerJoin(
        itemDependenciesTable,
        eq(itemsTable.id, itemDependenciesTable.dependsOnItemId)
      )
      .where(builder => 
        builder.equals(itemDependenciesTable.itemId, itemId)
      )

    return query.execute()
  }

  /**
   * Helper: Get items that depend on this item
   */
  private async getDependents(itemId: string): Promise<Item[]> {
    const query = QueryBuilderFactory
      .for<Item>(itemsTable)
      .innerJoin(
        itemDependenciesTable,
        eq(itemsTable.id, itemDependenciesTable.itemId)
      )
      .where(builder => 
        builder.equals(itemDependenciesTable.dependsOnItemId, itemId)
      )

    return query.execute()
  }

  /**
   * Helper: Check if item can start
   */
  private async canItemStart(itemId: string): Promise<boolean> {
    const dependencies = await this.getDependencies(itemId)
    return dependencies.every(dep => dep.status === 'completed')
  }

  /**
   * Helper: Check for circular dependency
   */
  private async wouldCreateCircularDependency(
    itemId: string,
    dependsOnItemId: string
  ): Promise<boolean> {
    // Check if dependsOnItemId eventually depends on itemId
    const visited = new Set<string>()
    const stack = [dependsOnItemId]

    while (stack.length > 0) {
      const currentId = stack.pop()!
      
      if (visited.has(currentId)) continue
      visited.add(currentId)

      if (currentId === itemId) {
        return true
      }

      const dependencies = await this.getDependencies(currentId)
      stack.push(...dependencies.map(d => d.id))
    }

    return false
  }
}

/**
 * Export singleton instance
 */
export const itemsRepository = new ItemsRepository()

import { eq, and, or, desc, asc, isNull, sql, count } from 'drizzle-orm'
import { BaseService, QueryOptions, FilterCondition, SortCondition } from '../services/base'
import { listsTable, itemsTable, type List, type NewList } from '../schema'
import { QueryBuilderFactory, FilterBuilder } from '../query-builder'
import { getTransactionManager, TransactionOptions } from '../transaction-manager'
import { MCPAwareRepository } from '../mcp-repository-extensions'
import { CachedRepositoryMixin } from '../performance-cache'
import { Repository } from '../repository-registry'

/**
 * SemanticType: ListsRepository
 * Description: Specialized repository for Lists entity with hierarchical operations and advanced querying
 * ExtensibleByAI: true
 * AIUseCases:
 *   - Add list template management
 *   - Implement list sharing and permissions
 *   - Add list analytics and insights
 *   - Integrate with workflow automation
 */

/**
 * List hierarchy options for tree operations
 */
export interface ListHierarchyOptions {
  maxDepth?: number
  includeItems?: boolean
  includeStats?: boolean
  statusFilter?: string[]
}

/**
 * List statistics interface
 */
export interface ListStats {
  totalItems: number
  completedItems: number
  pendingItems: number
  inProgressItems: number
  completionRate: number
  averageDuration?: number
  overdueItems: number
}

/**
 * List with extended information
 */
export interface ListWithStats extends List {
  stats: ListStats
  itemCount: number
  children?: ListWithStats[]
}

/**
 * Advanced Lists Repository with domain-specific operations, MCP integration, and caching
 */
@Repository({
  name: 'lists',
  entityType: 'List',
  description: 'Repository for managing hierarchical lists with MCP support',
  dependencies: [],
  singleton: true
})
export class ListsRepository extends MCPAwareRepository<typeof listsTable, List, NewList> {
  protected table = listsTable
  protected primaryKey = 'id' as const
  private cacheMixin: CachedRepositoryMixin

  constructor() {
    super()
    this.cacheMixin = new CachedRepositoryMixin({
      maxSize: 1000,
      ttl: 5 * 60 * 1000 // 5 minutes
    })
    this.initializeCustomMCPTools()
  }

  /**
   * Get entity name for MCP integration
   */
  protected getEntityName(): string {
    return 'lists'
  }

  /**
   * Get entity schema for MCP
   */
  protected getEntitySchema(): any {
    return {
      type: 'object',
      properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
        parentListId: { type: 'string', nullable: true },
        position: { type: 'number' },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
        status: { type: 'string', enum: ['active', 'completed', 'archived', 'deleted'] },
        createdBy: { type: 'string' },
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
      'lists:statistics',
      async () => {
        const totalLists = await this.count()
        const activeLists = await this.count(eq(listsTable.status, 'active'))
        const completedLists = await this.count(eq(listsTable.status, 'completed'))

        return {
          total: totalLists,
          active: activeLists,
          completed: completedLists,
          completionRate: totalLists > 0 ? (completedLists / totalLists) * 100 : 0
        }
      },
      {},
      { ttl: 2 * 60 * 1000 } // 2 minutes cache
    )
  }

  /**
   * Initialize custom MCP tools for lists
   */
  private initializeCustomMCPTools(): void {
    this.registerCustomMCPTool({
      name: 'lists.getHierarchy',
      description: 'Get complete list hierarchy as tree structure',
      inputSchema: {
        type: 'object',
        properties: {
          maxDepth: { type: 'number' },
          includeStats: { type: 'boolean' },
          statusFilter: { type: 'array', items: { type: 'string' } }
        }
      },
      handler: async (params) => {
        return this.getHierarchy(params)
      }
    })

    this.registerCustomMCPTool({
      name: 'lists.moveToParent',
      description: 'Move a list to a different parent',
      inputSchema: {
        type: 'object',
        properties: {
          listId: { type: 'string' },
          newParentId: { type: 'string', nullable: true },
          newPosition: { type: 'number' }
        },
        required: ['listId']
      },
      handler: async (params) => {
        return this.moveToParent(params.listId, params.newParentId, params.newPosition)
      }
    })

    this.registerCustomMCPResource({
      uri: 'lists://hierarchy',
      name: 'Lists Hierarchy',
      description: 'Complete hierarchical structure of all lists',
      mimeType: 'application/json',
      handler: async () => {
        return this.getHierarchy()
      }
    })
  }

  /**
   * Find lists by parent ID with advanced filtering
   */
  async findByParent(
    parentId: string | null = null,
    options: QueryOptions = {}
  ): Promise<List[]> {
    const filters: FilterCondition[] = [
      {
        field: 'parentListId',
        operator: parentId ? 'eq' : 'isNull',
        value: parentId
      },
      ...(options.filters || [])
    ]

    return this.findAll({
      ...options,
      filters,
      sorts: options.sorts || [
        { field: 'position', direction: 'asc' },
        { field: 'createdAt', direction: 'asc' }
      ]
    })
  }

  /**
   * Get complete list hierarchy as tree structure
   */
  async getHierarchy(options: ListHierarchyOptions = {}): Promise<ListWithStats[]> {
    const transactionManager = getTransactionManager()
    
    return transactionManager.executeTransaction(async (db, context) => {
      // Get all lists with stats
      const listsWithStats = await this.findAllWithStats({
        filters: options.statusFilter ? [
          { field: 'status', operator: 'in', values: options.statusFilter }
        ] : undefined
      })

      // Build hierarchy tree
      const listMap = new Map<string, ListWithStats>()
      const rootLists: ListWithStats[] = []

      // First pass: create map and identify root lists
      for (const list of listsWithStats) {
        listMap.set(list.id, { ...list, children: [] })
        
        if (!list.parentListId) {
          rootLists.push(listMap.get(list.id)!)
        }
      }

      // Second pass: build parent-child relationships
      for (const list of listsWithStats) {
        if (list.parentListId) {
          const parent = listMap.get(list.parentListId)
          const child = listMap.get(list.id)
          
          if (parent && child) {
            parent.children!.push(child)
          }
        }
      }

      // Apply depth limit if specified
      if (options.maxDepth) {
        this.limitTreeDepth(rootLists, options.maxDepth)
      }

      return rootLists
    }, { readOnly: true })
  }

  /**
   * Find all lists with comprehensive statistics
   */
  async findAllWithStats(options: QueryOptions = {}): Promise<ListWithStats[]> {
    const query = QueryBuilderFactory
      .for<ListWithStats>(listsTable)
      .select(
        ...Object.keys(listsTable),
        'itemCount',
        'completedCount',
        'pendingCount',
        'inProgressCount',
        'overdueCount'
      )
      .leftJoin(itemsTable, eq(listsTable.id, itemsTable.listId))
      .groupBy(listsTable.id)

    // Apply filters if provided
    if (options.filters) {
      query.where(builder => {
        options.filters!.forEach(filter => {
          switch (filter.operator) {
            case 'eq':
              builder.equals((listsTable as any)[filter.field], filter.value)
              break
            case 'in':
              builder.in((listsTable as any)[filter.field], filter.values || [])
              break
            case 'like':
              builder.like((listsTable as any)[filter.field], filter.value)
              break
            // Add more operators as needed
          }
        })
        return builder
      })
    }

    // Apply sorting
    if (options.sorts) {
      options.sorts.forEach(sort => {
        query.orderBy((listsTable as any)[sort.field], sort.direction.toUpperCase() as 'ASC' | 'DESC')
      })
    }

    const results = await query.execute()

    // Calculate statistics for each list
    return results.map(list => ({
      ...list,
      stats: this.calculateListStats(list),
      children: []
    }))
  }

  /**
   * Find lists by status with pagination
   */
  async findByStatus(
    status: string | string[],
    options: QueryOptions = {}
  ): Promise<List[]> {
    const statusArray = Array.isArray(status) ? status : [status]
    
    return this.findAll({
      ...options,
      filters: [
        { field: 'status', operator: 'in', values: statusArray },
        ...(options.filters || [])
      ]
    })
  }

  /**
   * Search lists by title, description, or metadata
   */
  async search(
    query: string,
    options: QueryOptions = {}
  ): Promise<List[]> {
    const searchTerm = `%${query.toLowerCase()}%`
    
    const qb = QueryBuilderFactory.for<List>(listsTable)
      .where(builder => 
        builder
          .like(listsTable.title, searchTerm)
          .or(new FilterBuilder().like(listsTable.description, searchTerm))
      )

    // Apply additional filters
    if (options.filters) {
      qb.where(builder => {
        options.filters!.forEach(filter => {
          this.applyFilterToBuilder(builder, filter)
        })
        return builder
      })
    }

    // Apply sorting
    if (options.sorts) {
      options.sorts.forEach(sort => {
        qb.orderBy((listsTable as any)[sort.field], sort.direction.toUpperCase() as 'ASC' | 'DESC')
      })
    } else {
      qb.orderBy(listsTable.updatedAt, 'DESC')
    }

    // Apply pagination
    if (options.limit) qb.limit(options.limit)
    if (options.offset) qb.offset(options.offset)

    return qb.execute()
  }

  /**
   * Move list to different parent (with validation)
   */
  async moveToParent(
    listId: string,
    newParentId: string | null,
    newPosition?: number
  ): Promise<List> {
    const transactionManager = getTransactionManager()
    
    const result = await transactionManager.executeTransaction(async (db, context) => {
      // Validate the move (prevent circular references)
      if (newParentId) {
        const isCircular = await this.wouldCreateCircularReference(listId, newParentId)
        if (isCircular) {
          throw new Error('Cannot move list: would create circular reference')
        }
      }

      // Get current list
      const list = await this.findById(listId)
      if (!list) {
        throw new Error(`List with ID ${listId} not found`)
      }

      // Update position of siblings in old parent
      if (list.parentListId) {
        await this.adjustSiblingPositions(list.parentListId, list.position, -1)
      }

      // Determine new position
      let finalPosition = newPosition
      if (finalPosition === undefined) {
        finalPosition = await this.getNextPosition(newParentId)
      } else {
        // Make room for the list at the specified position
        await this.adjustSiblingPositions(newParentId, finalPosition, 1)
      }

      // Update the list
      const updatedList = await this.updateById(listId, {
        parentListId: newParentId,
        position: finalPosition,
        updatedAt: new Date()
      })

      transactionManager.logOperation(context, 'UPDATE', 'lists', 1, {
        action: 'move_to_parent',
        listId,
        oldParentId: list.parentListId,
        newParentId,
        newPosition: finalPosition
      })

      return updatedList!
    })

    if (!result.success) {
      throw result.error
    }

    return result.result!
  }

  /**
   * Reorder lists within the same parent
   */
  async reorderWithinParent(
    parentId: string | null,
    listIds: string[]
  ): Promise<List[]> {
    const transactionManager = getTransactionManager()
    
    const result = await transactionManager.executeTransaction(async (db, context) => {
      const updatedLists: List[] = []

      for (let i = 0; i < listIds.length; i++) {
        const list = await this.updateById(listIds[i], {
          position: i,
          updatedAt: new Date()
        })
        
        if (list) {
          updatedLists.push(list)
        }
      }

      transactionManager.logOperation(context, 'UPDATE', 'lists', listIds.length, {
        action: 'reorder_within_parent',
        parentId,
        listIds
      })

      return updatedLists
    })

    if (!result.success) {
      throw result.error
    }

    return result.result!
  }

  /**
   * Archive list and all its children
   */
  async archiveWithChildren(listId: string): Promise<void> {
    const transactionManager = getTransactionManager()
    
    const result = await transactionManager.executeTransaction(async (db, context) => {
      // Get all descendant lists
      const descendants = await this.getAllDescendants(listId)
      const allListIds = [listId, ...descendants.map(d => d.id)]

      // Archive all lists
      await this.updateMany(
        sql`id IN (${allListIds.join(',')})`,
        {
          status: 'archived',
          updatedAt: new Date()
        }
      )

      transactionManager.logOperation(context, 'UPDATE', 'lists', allListIds.length, {
        action: 'archive_with_children',
        rootListId: listId,
        archivedListIds: allListIds
      })
    })

    if (!result.success) {
      throw result.error
    }
  }

  /**
   * Get list statistics
   */
  async getListStatistics(listId: string): Promise<ListStats> {
    const query = QueryBuilderFactory
      .for(itemsTable)
      .where(builder => builder.equals(itemsTable.listId, listId))
      .count('*', 'totalItems')
      .count('status', 'completedItems')
      .avg('actualDuration', 'averageDuration')

    const result = await query.first()
    
    if (!result) {
      return {
        totalItems: 0,
        completedItems: 0,
        pendingItems: 0,
        inProgressItems: 0,
        completionRate: 0,
        overdueItems: 0
      }
    }

    return this.calculateListStats(result)
  }

  /**
   * Helper: Check if moving a list would create circular reference
   */
  private async wouldCreateCircularReference(
    listId: string,
    newParentId: string
  ): Promise<boolean> {
    let currentParentId: string | null = newParentId
    
    while (currentParentId) {
      if (currentParentId === listId) {
        return true
      }
      
      const parent = await this.findById(currentParentId)
      currentParentId = parent?.parentListId || null
    }
    
    return false
  }

  /**
   * Helper: Get all descendant lists
   */
  private async getAllDescendants(listId: string): Promise<List[]> {
    const children = await this.findByParent(listId)
    const descendants: List[] = [...children]
    
    for (const child of children) {
      const childDescendants = await this.getAllDescendants(child.id)
      descendants.push(...childDescendants)
    }
    
    return descendants
  }

  /**
   * Helper: Get next position for a parent
   */
  private async getNextPosition(parentId: string | null): Promise<number> {
    const siblings = await this.findByParent(parentId)
    return siblings.length > 0 ? Math.max(...siblings.map(s => s.position)) + 1 : 0
  }

  /**
   * Helper: Adjust sibling positions
   */
  private async adjustSiblingPositions(
    parentId: string | null,
    fromPosition: number,
    adjustment: number
  ): Promise<void> {
    const siblings = await this.findByParent(parentId)
    
    for (const sibling of siblings) {
      if (sibling.position >= fromPosition) {
        await this.updateById(sibling.id, {
          position: sibling.position + adjustment,
          updatedAt: new Date()
        })
      }
    }
  }

  /**
   * Helper: Calculate list statistics
   */
  private calculateListStats(data: any): ListStats {
    const totalItems = data.totalItems || 0
    const completedItems = data.completedItems || 0
    const pendingItems = data.pendingItems || 0
    const inProgressItems = data.inProgressItems || 0
    const overdueItems = data.overdueItems || 0
    
    return {
      totalItems,
      completedItems,
      pendingItems,
      inProgressItems,
      completionRate: totalItems > 0 ? (completedItems / totalItems) * 100 : 0,
      averageDuration: data.averageDuration,
      overdueItems
    }
  }

  /**
   * Helper: Apply filter to query builder
   */
  private applyFilterToBuilder(builder: FilterBuilder, filter: FilterCondition): void {
    const column = (listsTable as any)[filter.field]

    switch (filter.operator) {
      case 'eq':
        builder.equals(column, filter.value)
        break
      case 'ne':
        builder.notEquals(column, filter.value)
        break
      case 'like':
        builder.like(column, filter.value)
        break
      case 'in':
        builder.in(column, filter.values || [])
        break
      case 'isNull':
        builder.isNull(column)
        break
      case 'isNotNull':
        builder.isNotNull(column)
        break
      case 'gt':
        builder.greaterThan(column, filter.value)
        break
      case 'gte':
        builder.greaterThanOrEqual(column, filter.value)
        break
      case 'lt':
        builder.lessThan(column, filter.value)
        break
      case 'lte':
        builder.lessThanOrEqual(column, filter.value)
        break
      case 'between':
        builder.between(column, filter.values?.[0], filter.values?.[1])
        break
    }
  }

  /**
   * Helper: Limit tree depth
   */
  private limitTreeDepth(lists: ListWithStats[], maxDepth: number, currentDepth = 0): void {
    if (currentDepth >= maxDepth) {
      lists.forEach(list => {
        list.children = []
      })
      return
    }

    lists.forEach(list => {
      if (list.children && list.children.length > 0) {
        this.limitTreeDepth(list.children, maxDepth, currentDepth + 1)
      }
    })
  }
}

/**
 * Export singleton instance
 */
export const listsRepository = new ListsRepository()

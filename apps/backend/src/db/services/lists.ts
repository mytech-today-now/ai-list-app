import { eq, and, or, desc, asc, isNull, sql } from 'drizzle-orm'
import { BaseService, BulkOperationResult } from './base'
import { listsTable, itemsTable, type List, type NewList } from '../schema'

/**
 * Lists service with hierarchical operations
 */
export class ListsService extends BaseService<typeof listsTable, List, NewList> {
  protected table = listsTable
  protected primaryKey = 'id' as const

  /**
   * Find lists by parent ID (including root lists)
   */
  async findByParent(parentId: string | null = null): Promise<List[]> {
    const db = await this.getDb()
    const whereClause = parentId 
      ? eq(listsTable.parentListId, parentId)
      : isNull(listsTable.parentListId)

    return await db
      .select()
      .from(listsTable)
      .where(and(
        whereClause,
        eq(listsTable.status, 'active')
      ))
      .orderBy(asc(listsTable.position), asc(listsTable.createdAt))
  }

  /**
   * Find all root lists (no parent)
   */
  async findRootLists(): Promise<List[]> {
    return await this.findByParent(null)
  }

  /**
   * Find all child lists of a parent
   */
  async findChildLists(parentId: string): Promise<List[]> {
    return await this.findByParent(parentId)
  }

  /**
   * Get full hierarchy starting from a list
   */
  async getHierarchy(listId: string): Promise<List & { children: List[] }> {
    const list = await this.findById(listId)
    if (!list) {
      throw new Error(`List with ID ${listId} not found`)
    }

    const children = await this.findChildLists(listId)
    return { ...list, children }
  }

  /**
   * Get full tree structure
   */
  async getTree(): Promise<(List & { children: List[] })[]> {
    const rootLists = await this.findRootLists()
    const result = []

    for (const rootList of rootLists) {
      const children = await this.findChildLists(rootList.id)
      result.push({ ...rootList, children })
    }

    return result
  }

  /**
   * Move a list to a new parent
   */
  async moveToParent(listId: string, newParentId: string | null): Promise<List | null> {
    // Validate that we're not creating a circular reference
    if (newParentId) {
      const isCircular = await this.wouldCreateCircularReference(listId, newParentId)
      if (isCircular) {
        throw new Error('Cannot move list: would create circular reference')
      }
    }

    return await this.updateById(listId, { 
      parentListId: newParentId,
      updatedAt: new Date()
    })
  }

  /**
   * Reorder lists within the same parent
   */
  async reorder(listId: string, newPosition: number): Promise<void> {
    const list = await this.findById(listId)
    if (!list) {
      throw new Error(`List with ID ${listId} not found`)
    }

    await this.transaction(async (db) => {
      // Get siblings
      const siblings = await this.findByParent(list.parentListId)
      
      // Update positions
      const updates = siblings
        .filter(s => s.id !== listId)
        .map((sibling, index) => {
          const position = index >= newPosition ? index + 1 : index
          return { id: sibling.id, position }
        })

      // Update all siblings
      for (const update of updates) {
        await db
          .update(listsTable)
          .set({ position: update.position, updatedAt: new Date() })
          .where(eq(listsTable.id, update.id))
      }

      // Update the moved list
      await db
        .update(listsTable)
        .set({ position: newPosition, updatedAt: new Date() })
        .where(eq(listsTable.id, listId))
    })
  }

  /**
   * Archive a list and all its children
   */
  async archive(listId: string): Promise<void> {
    await this.transaction(async (db) => {
      // Archive the list
      await db
        .update(listsTable)
        .set({ status: 'archived', updatedAt: new Date() })
        .where(eq(listsTable.id, listId))

      // Archive all child lists recursively
      const children = await this.findChildLists(listId)
      for (const child of children) {
        await this.archive(child.id)
      }
    })
  }

  /**
   * Get lists with item counts
   */
  async findWithItemCounts(): Promise<(List & { itemCount: number; completedCount: number })[]> {
    const db = await this.getDb()
    
    return await db
      .select({
        ...listsTable,
        itemCount: sql<number>`COALESCE(${sql`COUNT(${itemsTable.id})`}, 0)`,
        completedCount: sql<number>`COALESCE(${sql`COUNT(CASE WHEN ${itemsTable.status} = 'completed' THEN 1 END)`}, 0)`
      })
      .from(listsTable)
      .leftJoin(itemsTable, eq(listsTable.id, itemsTable.listId))
      .where(eq(listsTable.status, 'active'))
      .groupBy(listsTable.id)
      .orderBy(asc(listsTable.position), asc(listsTable.createdAt))
  }

  /**
   * Search lists by title or description
   */
  async search(query: string): Promise<List[]> {
    const db = await this.getDb()
    const searchTerm = `%${query.toLowerCase()}%`

    return await db
      .select()
      .from(listsTable)
      .where(and(
        eq(listsTable.status, 'active'),
        or(
          sql`LOWER(${listsTable.title}) LIKE ${searchTerm}`,
          sql`LOWER(${listsTable.description}) LIKE ${searchTerm}`
        )
      ))
      .orderBy(asc(listsTable.title))
  }

  /**
   * Advanced search with comprehensive filtering and pagination
   */
  async advancedSearch(options: {
    query: string
    fields?: string[]
    status?: string[]
    priority?: string[]
    parentListId?: string
    hasParent?: boolean
    hasChildren?: boolean
    hasItems?: boolean
    itemCountMin?: number
    itemCountMax?: number
    completionRateMin?: number
    completionRateMax?: number
    createdFrom?: Date
    createdTo?: Date
    updatedFrom?: Date
    updatedTo?: Date
    page?: number
    limit?: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
    includeArchived?: boolean
  }): Promise<{ lists: (List & { itemCount: number; completedCount: number; completionRate: number })[], total: number, page: number, totalPages: number }> {
    const db = await this.getDb()
    const {
      query,
      fields = ['title', 'description'],
      status,
      priority,
      parentListId,
      hasParent,
      hasChildren,
      hasItems,
      itemCountMin,
      itemCountMax,
      completionRateMin,
      completionRateMax,
      createdFrom,
      createdTo,
      updatedFrom,
      updatedTo,
      page = 1,
      limit = 20,
      sortBy = 'updatedAt',
      sortOrder = 'desc',
      includeArchived = false
    } = options

    const searchTerm = `%${query.toLowerCase()}%`
    const offset = (page - 1) * limit

    // Build search conditions
    const searchConditions = []
    if (fields.includes('title')) {
      searchConditions.push(sql`LOWER(${listsTable.title}) LIKE ${searchTerm}`)
    }
    if (fields.includes('description')) {
      searchConditions.push(sql`LOWER(${listsTable.description}) LIKE ${searchTerm}`)
    }

    // Build filter conditions
    const filterConditions = []

    if (status && status.length > 0) {
      filterConditions.push(inArray(listsTable.status, status))
    } else if (!includeArchived) {
      filterConditions.push(sql`${listsTable.status} != 'archived' AND ${listsTable.status} != 'deleted'`)
    }

    if (priority && priority.length > 0) {
      filterConditions.push(inArray(listsTable.priority, priority))
    }

    if (parentListId !== undefined) {
      if (parentListId === null) {
        filterConditions.push(isNull(listsTable.parentListId))
      } else {
        filterConditions.push(eq(listsTable.parentListId, parentListId))
      }
    }

    if (hasParent !== undefined) {
      if (hasParent) {
        filterConditions.push(sql`${listsTable.parentListId} IS NOT NULL`)
      } else {
        filterConditions.push(isNull(listsTable.parentListId))
      }
    }

    // Date range filters
    if (createdFrom) {
      filterConditions.push(sql`${listsTable.createdAt} >= ${createdFrom}`)
    }
    if (createdTo) {
      filterConditions.push(sql`${listsTable.createdAt} <= ${createdTo}`)
    }
    if (updatedFrom) {
      filterConditions.push(sql`${listsTable.updatedAt} >= ${updatedFrom}`)
    }
    if (updatedTo) {
      filterConditions.push(sql`${listsTable.updatedAt} <= ${updatedTo}`)
    }

    // Build the main query with item counts and completion rates
    const baseQuery = db
      .select({
        ...listsTable,
        itemCount: sql<number>`COALESCE(COUNT(${itemsTable.id}), 0)`,
        completedCount: sql<number>`COALESCE(COUNT(CASE WHEN ${itemsTable.status} = 'completed' THEN 1 END), 0)`,
        completionRate: sql<number>`CASE
          WHEN COUNT(${itemsTable.id}) = 0 THEN 0
          ELSE ROUND((COUNT(CASE WHEN ${itemsTable.status} = 'completed' THEN 1 END) * 100.0) / COUNT(${itemsTable.id}), 2)
        END`
      })
      .from(listsTable)
      .leftJoin(itemsTable, eq(listsTable.id, itemsTable.listId))
      .where(and(
        or(...searchConditions),
        ...filterConditions
      ))
      .groupBy(listsTable.id)

    // Apply additional filters that require aggregated data
    const havingConditions = []

    if (hasItems !== undefined) {
      if (hasItems) {
        havingConditions.push(sql`COUNT(${itemsTable.id}) > 0`)
      } else {
        havingConditions.push(sql`COUNT(${itemsTable.id}) = 0`)
      }
    }

    if (itemCountMin !== undefined) {
      havingConditions.push(sql`COUNT(${itemsTable.id}) >= ${itemCountMin}`)
    }
    if (itemCountMax !== undefined) {
      havingConditions.push(sql`COUNT(${itemsTable.id}) <= ${itemCountMax}`)
    }

    if (completionRateMin !== undefined) {
      havingConditions.push(sql`
        CASE
          WHEN COUNT(${itemsTable.id}) = 0 THEN 0
          ELSE (COUNT(CASE WHEN ${itemsTable.status} = 'completed' THEN 1 END) * 100.0) / COUNT(${itemsTable.id})
        END >= ${completionRateMin}
      `)
    }
    if (completionRateMax !== undefined) {
      havingConditions.push(sql`
        CASE
          WHEN COUNT(${itemsTable.id}) = 0 THEN 0
          ELSE (COUNT(CASE WHEN ${itemsTable.status} = 'completed' THEN 1 END) * 100.0) / COUNT(${itemsTable.id})
        END <= ${completionRateMax}
      `)
    }

    if (havingConditions.length > 0) {
      baseQuery.having(and(...havingConditions))
    }

    // Build sort condition
    let sortColumn
    switch (sortBy) {
      case 'itemCount':
        sortColumn = sql`COUNT(${itemsTable.id})`
        break
      case 'completionRate':
        sortColumn = sql`CASE
          WHEN COUNT(${itemsTable.id}) = 0 THEN 0
          ELSE (COUNT(CASE WHEN ${itemsTable.status} = 'completed' THEN 1 END) * 100.0) / COUNT(${itemsTable.id})
        END`
        break
      default:
        sortColumn = (listsTable as any)[sortBy] || listsTable.updatedAt
    }

    const sortDirection = sortOrder === 'asc' ? asc : desc

    // Execute query for lists
    const lists = await baseQuery
      .orderBy(sortDirection(sortColumn))
      .limit(limit)
      .offset(offset)

    // Execute count query (simplified without aggregations for performance)
    const countQuery = db
      .select({ count: sql<number>`COUNT(DISTINCT ${listsTable.id})` })
      .from(listsTable)
      .leftJoin(itemsTable, eq(listsTable.id, itemsTable.listId))
      .where(and(
        or(...searchConditions),
        ...filterConditions
      ))

    let total: number
    if (havingConditions.length > 0) {
      // For count with having clauses, we need to use a subquery
      const subquery = db
        .select({ id: listsTable.id })
        .from(listsTable)
        .leftJoin(itemsTable, eq(listsTable.id, itemsTable.listId))
        .where(and(
          or(...searchConditions),
          ...filterConditions
        ))
        .groupBy(listsTable.id)
        .having(and(...havingConditions))
        .as('filtered_lists')

      const countResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(subquery)

      total = countResult[0]?.count || 0
    } else {
      const countResult = await countQuery
      total = countResult[0]?.count || 0
    }

    const totalPages = Math.ceil(total / limit)

    return {
      lists,
      total,
      page,
      totalPages
    }
  }

  /**
   * Filter lists without search query
   */
  async filter(options: {
    status?: string[]
    priority?: string[]
    parentListId?: string
    hasParent?: boolean
    hasChildren?: boolean
    hasItems?: boolean
    itemCountMin?: number
    itemCountMax?: number
    completionRateMin?: number
    completionRateMax?: number
    createdFrom?: Date
    createdTo?: Date
    updatedFrom?: Date
    updatedTo?: Date
    page?: number
    limit?: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
    includeArchived?: boolean
  }): Promise<{ lists: (List & { itemCount: number; completedCount: number; completionRate: number })[], total: number, page: number, totalPages: number }> {
    const db = await this.getDb()
    const {
      status,
      priority,
      parentListId,
      hasParent,
      hasChildren,
      hasItems,
      itemCountMin,
      itemCountMax,
      completionRateMin,
      completionRateMax,
      createdFrom,
      createdTo,
      updatedFrom,
      updatedTo,
      page = 1,
      limit = 20,
      sortBy = 'updatedAt',
      sortOrder = 'desc',
      includeArchived = false
    } = options

    const offset = (page - 1) * limit

    // Build filter conditions
    const filterConditions = []

    if (status && status.length > 0) {
      filterConditions.push(inArray(listsTable.status, status))
    } else if (!includeArchived) {
      filterConditions.push(sql`${listsTable.status} != 'archived' AND ${listsTable.status} != 'deleted'`)
    }

    if (priority && priority.length > 0) {
      filterConditions.push(inArray(listsTable.priority, priority))
    }

    if (parentListId !== undefined) {
      if (parentListId === null) {
        filterConditions.push(isNull(listsTable.parentListId))
      } else {
        filterConditions.push(eq(listsTable.parentListId, parentListId))
      }
    }

    if (hasParent !== undefined) {
      if (hasParent) {
        filterConditions.push(sql`${listsTable.parentListId} IS NOT NULL`)
      } else {
        filterConditions.push(isNull(listsTable.parentListId))
      }
    }

    // Date range filters
    if (createdFrom) {
      filterConditions.push(sql`${listsTable.createdAt} >= ${createdFrom}`)
    }
    if (createdTo) {
      filterConditions.push(sql`${listsTable.createdAt} <= ${createdTo}`)
    }
    if (updatedFrom) {
      filterConditions.push(sql`${listsTable.updatedAt} >= ${updatedFrom}`)
    }
    if (updatedTo) {
      filterConditions.push(sql`${listsTable.updatedAt} <= ${updatedTo}`)
    }

    // Build the main query with item counts and completion rates
    const baseQuery = db
      .select({
        ...listsTable,
        itemCount: sql<number>`COALESCE(COUNT(${itemsTable.id}), 0)`,
        completedCount: sql<number>`COALESCE(COUNT(CASE WHEN ${itemsTable.status} = 'completed' THEN 1 END), 0)`,
        completionRate: sql<number>`CASE
          WHEN COUNT(${itemsTable.id}) = 0 THEN 0
          ELSE ROUND((COUNT(CASE WHEN ${itemsTable.status} = 'completed' THEN 1 END) * 100.0) / COUNT(${itemsTable.id}), 2)
        END`
      })
      .from(listsTable)
      .leftJoin(itemsTable, eq(listsTable.id, itemsTable.listId))
      .where(filterConditions.length > 0 ? and(...filterConditions) : undefined)
      .groupBy(listsTable.id)

    // Apply additional filters that require aggregated data
    const havingConditions = []

    if (hasItems !== undefined) {
      if (hasItems) {
        havingConditions.push(sql`COUNT(${itemsTable.id}) > 0`)
      } else {
        havingConditions.push(sql`COUNT(${itemsTable.id}) = 0`)
      }
    }

    if (itemCountMin !== undefined) {
      havingConditions.push(sql`COUNT(${itemsTable.id}) >= ${itemCountMin}`)
    }
    if (itemCountMax !== undefined) {
      havingConditions.push(sql`COUNT(${itemsTable.id}) <= ${itemCountMax}`)
    }

    if (completionRateMin !== undefined) {
      havingConditions.push(sql`
        CASE
          WHEN COUNT(${itemsTable.id}) = 0 THEN 0
          ELSE (COUNT(CASE WHEN ${itemsTable.status} = 'completed' THEN 1 END) * 100.0) / COUNT(${itemsTable.id})
        END >= ${completionRateMin}
      `)
    }
    if (completionRateMax !== undefined) {
      havingConditions.push(sql`
        CASE
          WHEN COUNT(${itemsTable.id}) = 0 THEN 0
          ELSE (COUNT(CASE WHEN ${itemsTable.status} = 'completed' THEN 1 END) * 100.0) / COUNT(${itemsTable.id})
        END <= ${completionRateMax}
      `)
    }

    if (havingConditions.length > 0) {
      baseQuery.having(and(...havingConditions))
    }

    // Build sort condition
    let sortColumn
    switch (sortBy) {
      case 'itemCount':
        sortColumn = sql`COUNT(${itemsTable.id})`
        break
      case 'completionRate':
        sortColumn = sql`CASE
          WHEN COUNT(${itemsTable.id}) = 0 THEN 0
          ELSE (COUNT(CASE WHEN ${itemsTable.status} = 'completed' THEN 1 END) * 100.0) / COUNT(${itemsTable.id})
        END`
        break
      default:
        sortColumn = (listsTable as any)[sortBy] || listsTable.updatedAt
    }

    const sortDirection = sortOrder === 'asc' ? asc : desc

    // Execute query for lists
    const lists = await baseQuery
      .orderBy(sortDirection(sortColumn))
      .limit(limit)
      .offset(offset)

    // Execute count query
    const countQuery = db
      .select({ count: sql<number>`COUNT(DISTINCT ${listsTable.id})` })
      .from(listsTable)
      .leftJoin(itemsTable, eq(listsTable.id, itemsTable.listId))
      .where(filterConditions.length > 0 ? and(...filterConditions) : undefined)

    let total: number
    if (havingConditions.length > 0) {
      // For count with having clauses, we need to use a subquery
      const subquery = db
        .select({ id: listsTable.id })
        .from(listsTable)
        .leftJoin(itemsTable, eq(listsTable.id, itemsTable.listId))
        .where(filterConditions.length > 0 ? and(...filterConditions) : undefined)
        .groupBy(listsTable.id)
        .having(and(...havingConditions))
        .as('filtered_lists')

      const countResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(subquery)

      total = countResult[0]?.count || 0
    } else {
      const countResult = await countQuery
      total = countResult[0]?.count || 0
    }

    const totalPages = Math.ceil(total / limit)

    return {
      lists,
      total,
      page,
      totalPages
    }
  }

  /**
   * Check if moving a list would create a circular reference
   */
  private async wouldCreateCircularReference(listId: string, newParentId: string): Promise<boolean> {
    let currentParentId = newParentId
    
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
   * Get breadcrumb path for a list
   */
  async getBreadcrumbs(listId: string): Promise<List[]> {
    const breadcrumbs: List[] = []
    let currentId: string | null = listId

    while (currentId) {
      const list = await this.findById(currentId)
      if (!list) break

      breadcrumbs.unshift(list)
      currentId = list.parentListId
    }

    return breadcrumbs
  }

  /**
   * Bulk update list status with hierarchy validation
   */
  async bulkUpdateStatus(
    ids: string[],
    status: 'active' | 'completed' | 'archived' | 'deleted',
    options: {
      continueOnError?: boolean
      validateHierarchy?: boolean
      updateTimestamps?: boolean
      cascadeToItems?: boolean
    } = {}
  ): Promise<BulkOperationResult<List>> {
    const { continueOnError = false, validateHierarchy = true, updateTimestamps = true, cascadeToItems = false } = options
    const results: List[] = []
    const errors: Array<{ index: number; id: string; error: string; details?: any }> = []

    if (ids.length === 0) {
      return {
        success: true,
        results: [],
        errors: [],
        summary: { total: 0, successful: 0, failed: 0 }
      }
    }

    // Validate hierarchy constraints if required
    if (validateHierarchy) {
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i]
        try {
          // Check if list has children and status change would create invalid state
          const children = await this.findByParent(id)
          if (children.length > 0 && (status === 'deleted' || status === 'archived')) {
            errors.push({
              index: i,
              id,
              error: `Cannot ${status} list with active children`,
              details: { childCount: children.length, children: children.map(c => c.id) }
            })

            if (!continueOnError) {
              return {
                success: false,
                results,
                errors,
                summary: { total: ids.length, successful: 0, failed: errors.length }
              }
            }
          }
        } catch (error) {
          errors.push({
            index: i,
            id,
            error: error instanceof Error ? error.message : 'Hierarchy validation failed',
            details: error
          })

          if (!continueOnError) {
            return {
              success: false,
              results,
              errors,
              summary: { total: ids.length, successful: 0, failed: errors.length }
            }
          }
        }
      }
    }

    // Filter out lists with errors if continuing on error
    const validIds = continueOnError
      ? ids.filter((_, index) => !errors.some(e => e.index === index))
      : ids

    if (validIds.length === 0) {
      return {
        success: false,
        results,
        errors,
        summary: { total: ids.length, successful: 0, failed: errors.length }
      }
    }

    // Prepare update data
    const updateData: Partial<NewList> = { status, updatedAt: new Date() }
    if (updateTimestamps && status === 'completed') {
      updateData.completedAt = new Date()
    }

    // Perform bulk update
    try {
      await this.transaction(async (db) => {
        for (const id of validIds) {
          const result = await db
            .update(listsTable)
            .set(updateData)
            .where(eq(listsTable.id, id))
            .returning()

          if (result.length === 0) {
            throw new Error(`List with ID ${id} not found`)
          }
          results.push(result[0])

          // Cascade to items if requested
          if (cascadeToItems) {
            await db
              .update(require('../schema').itemsTable)
              .set({ status: status === 'completed' ? 'completed' : 'pending', updatedAt: new Date() })
              .where(eq(require('../schema').itemsTable.listId, id))
          }
        }
      })
    } catch (error) {
      // Add errors for all lists in the failed transaction
      for (let i = 0; i < validIds.length; i++) {
        const originalIndex = ids.indexOf(validIds[i])
        errors.push({
          index: originalIndex,
          id: validIds[i],
          error: error instanceof Error ? error.message : 'Bulk status update failed',
          details: error
        })
      }
    }

    return {
      success: errors.length === 0,
      results,
      errors,
      summary: {
        total: ids.length,
        successful: results.length,
        failed: errors.length
      }
    }
  }

  /**
   * Bulk move lists to a different parent
   */
  async bulkMoveToParent(
    ids: string[],
    targetParentId: string | null,
    options: {
      continueOnError?: boolean
      validateHierarchy?: boolean
    } = {}
  ): Promise<BulkOperationResult<List>> {
    const { continueOnError = false, validateHierarchy = true } = options
    const results: List[] = []
    const errors: Array<{ index: number; id: string; error: string; details?: any }> = []

    if (ids.length === 0) {
      return {
        success: true,
        results: [],
        errors: [],
        summary: { total: 0, successful: 0, failed: 0 }
      }
    }

    // Validate hierarchy constraints if required
    if (validateHierarchy && targetParentId) {
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i]
        try {
          // Check for circular references
          const wouldCreateCycle = await this.wouldCreateCycle(id, targetParentId)
          if (wouldCreateCycle) {
            errors.push({
              index: i,
              id,
              error: 'Moving list would create circular reference',
              details: { targetParentId, listId: id }
            })

            if (!continueOnError) {
              return {
                success: false,
                results,
                errors,
                summary: { total: ids.length, successful: 0, failed: errors.length }
              }
            }
          }
        } catch (error) {
          errors.push({
            index: i,
            id,
            error: error instanceof Error ? error.message : 'Hierarchy validation failed',
            details: error
          })

          if (!continueOnError) {
            return {
              success: false,
              results,
              errors,
              summary: { total: ids.length, successful: 0, failed: errors.length }
            }
          }
        }
      }
    }

    // Filter out lists with errors if continuing on error
    const validIds = continueOnError
      ? ids.filter((_, index) => !errors.some(e => e.index === index))
      : ids

    if (validIds.length === 0) {
      return {
        success: false,
        results,
        errors,
        summary: { total: ids.length, successful: 0, failed: errors.length }
      }
    }

    // Perform bulk move
    try {
      await this.transaction(async (db) => {
        for (const id of validIds) {
          const result = await db
            .update(listsTable)
            .set({
              parentListId: targetParentId,
              updatedAt: new Date()
            })
            .where(eq(listsTable.id, id))
            .returning()

          if (result.length === 0) {
            throw new Error(`List with ID ${id} not found`)
          }
          results.push(result[0])
        }
      })
    } catch (error) {
      // Add errors for all lists in the failed transaction
      for (let i = 0; i < validIds.length; i++) {
        const originalIndex = ids.indexOf(validIds[i])
        errors.push({
          index: originalIndex,
          id: validIds[i],
          error: error instanceof Error ? error.message : 'Bulk move operation failed',
          details: error
        })
      }
    }

    return {
      success: errors.length === 0,
      results,
      errors,
      summary: {
        total: ids.length,
        successful: results.length,
        failed: errors.length
      }
    }
  }
}

export const listsService = new ListsService()

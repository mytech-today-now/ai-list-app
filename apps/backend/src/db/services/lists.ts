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

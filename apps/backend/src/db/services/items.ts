import { eq, and, or, desc, asc, inArray, sql, isNull } from 'drizzle-orm'
import { BaseService, BulkOperationResult } from './base'
import { itemsTable, itemDependenciesTable, type Item, type NewItem } from '../schema'

/**
 * Items service with dependency management
 */
export class ItemsService extends BaseService<typeof itemsTable, Item, NewItem> {
  protected table = itemsTable
  protected primaryKey = 'id' as const

  /**
   * Find items by list ID
   */
  async findByListId(listId: string): Promise<Item[]> {
    const db = await this.getDb()
    return await db
      .select()
      .from(itemsTable)
      .where(eq(itemsTable.listId, listId))
      .orderBy(asc(itemsTable.position), asc(itemsTable.createdAt))
  }

  /**
   * Find items by status
   */
  async findByStatus(status: string | string[]): Promise<Item[]> {
    const db = await this.getDb()
    const statusArray = Array.isArray(status) ? status : [status]
    
    return await db
      .select()
      .from(itemsTable)
      .where(inArray(itemsTable.status, statusArray))
      .orderBy(desc(itemsTable.createdAt))
  }

  /**
   * Find items assigned to a user
   */
  async findByAssignee(assignedTo: string): Promise<Item[]> {
    const db = await this.getDb()
    return await db
      .select()
      .from(itemsTable)
      .where(eq(itemsTable.assignedTo, assignedTo))
      .orderBy(asc(itemsTable.dueDate), desc(itemsTable.priority))
  }

  /**
   * Find overdue items
   */
  async findOverdue(): Promise<Item[]> {
    const db = await this.getDb()
    const now = new Date()
    
    return await db
      .select()
      .from(itemsTable)
      .where(and(
        sql`${itemsTable.dueDate} < ${now}`,
        inArray(itemsTable.status, ['pending', 'in_progress'])
      ))
      .orderBy(asc(itemsTable.dueDate))
  }

  /**
   * Find items due soon (within specified days)
   */
  async findDueSoon(days: number = 7): Promise<Item[]> {
    const db = await this.getDb()
    const now = new Date()
    const futureDate = new Date(now.getTime() + (days * 24 * 60 * 60 * 1000))
    
    return await db
      .select()
      .from(itemsTable)
      .where(and(
        sql`${itemsTable.dueDate} BETWEEN ${now} AND ${futureDate}`,
        inArray(itemsTable.status, ['pending', 'in_progress'])
      ))
      .orderBy(asc(itemsTable.dueDate))
  }

  /**
   * Search items by title, description, or tags
   */
  async search(query: string): Promise<Item[]> {
    const db = await this.getDb()
    const searchTerm = `%${query.toLowerCase()}%`
    
    return await db
      .select()
      .from(itemsTable)
      .where(or(
        sql`LOWER(${itemsTable.title}) LIKE ${searchTerm}`,
        sql`LOWER(${itemsTable.description}) LIKE ${searchTerm}`,
        sql`LOWER(${itemsTable.tags}) LIKE ${searchTerm}`
      ))
      .orderBy(desc(itemsTable.updatedAt))
  }

  /**
   * Reorder items within a list
   */
  async reorder(itemId: string, newPosition: number): Promise<void> {
    const item = await this.findById(itemId)
    if (!item) {
      throw new Error(`Item with ID ${itemId} not found`)
    }

    await this.transaction(async (db) => {
      // Get siblings in the same list
      const siblings = await this.findByListId(item.listId)
      
      // Update positions
      const updates = siblings
        .filter(s => s.id !== itemId)
        .map((sibling, index) => {
          const position = index >= newPosition ? index + 1 : index
          return { id: sibling.id, position }
        })

      // Update all siblings
      for (const update of updates) {
        await db
          .update(itemsTable)
          .set({ position: update.position, updatedAt: new Date() })
          .where(eq(itemsTable.id, update.id))
      }

      // Update the moved item
      await db
        .update(itemsTable)
        .set({ position: newPosition, updatedAt: new Date() })
        .where(eq(itemsTable.id, itemId))
    })
  }

  /**
   * Move item to a different list
   */
  async moveToList(itemId: string, newListId: string): Promise<Item | null> {
    return await this.updateById(itemId, {
      listId: newListId,
      position: 0, // Move to top of new list
      updatedAt: new Date()
    })
  }

  /**
   * Mark item as completed
   */
  async markCompleted(itemId: string): Promise<Item | null> {
    return await this.updateById(itemId, {
      status: 'completed',
      completedAt: new Date(),
      updatedAt: new Date()
    })
  }

  /**
   * Mark item as in progress
   */
  async markInProgress(itemId: string): Promise<Item | null> {
    return await this.updateById(itemId, {
      status: 'in_progress',
      updatedAt: new Date()
    })
  }

  /**
   * Add dependency between items
   */
  async addDependency(itemId: string, dependsOnItemId: string, type: 'blocks' | 'requires' | 'follows' = 'requires'): Promise<void> {
    // Check for circular dependencies
    const wouldCreateCycle = await this.wouldCreateCircularDependency(itemId, dependsOnItemId)
    if (wouldCreateCycle) {
      throw new Error('Cannot add dependency: would create circular dependency')
    }

    const db = await this.getDb()
    await db.insert(itemDependenciesTable).values({
      itemId,
      dependsOnItemId,
      dependencyType: type,
      createdAt: new Date()
    })
  }

  /**
   * Remove dependency between items
   */
  async removeDependency(itemId: string, dependsOnItemId: string): Promise<void> {
    const db = await this.getDb()
    await db
      .delete(itemDependenciesTable)
      .where(and(
        eq(itemDependenciesTable.itemId, itemId),
        eq(itemDependenciesTable.dependsOnItemId, dependsOnItemId)
      ))
  }

  /**
   * Get items that this item depends on
   */
  async getDependencies(itemId: string): Promise<Item[]> {
    const db = await this.getDb()
    return await db
      .select(itemsTable)
      .from(itemsTable)
      .innerJoin(itemDependenciesTable, eq(itemsTable.id, itemDependenciesTable.dependsOnItemId))
      .where(eq(itemDependenciesTable.itemId, itemId))
  }

  /**
   * Get items that depend on this item
   */
  async getDependents(itemId: string): Promise<Item[]> {
    const db = await this.getDb()
    return await db
      .select(itemsTable)
      .from(itemsTable)
      .innerJoin(itemDependenciesTable, eq(itemsTable.id, itemDependenciesTable.itemId))
      .where(eq(itemDependenciesTable.dependsOnItemId, itemId))
  }

  /**
   * Check if item can be started (all dependencies completed)
   */
  async canStart(itemId: string): Promise<boolean> {
    const dependencies = await this.getDependencies(itemId)
    return dependencies.every(dep => dep.status === 'completed')
  }

  /**
   * Get items ready to start (no blocking dependencies)
   */
  async getReadyToStart(): Promise<Item[]> {
    const db = await this.getDb()
    
    // Get all pending items
    const pendingItems = await this.findByStatus('pending')
    
    // Filter items that can start
    const readyItems = []
    for (const item of pendingItems) {
      const canStart = await this.canStart(item.id)
      if (canStart) {
        readyItems.push(item)
      }
    }
    
    return readyItems
  }

  /**
   * Check if adding a dependency would create a circular reference
   */
  private async wouldCreateCircularDependency(itemId: string, dependsOnItemId: string): Promise<boolean> {
    const visited = new Set<string>()
    
    const checkCycle = async (currentId: string): Promise<boolean> => {
      if (visited.has(currentId)) return false
      if (currentId === itemId) return true
      
      visited.add(currentId)
      
      const dependencies = await this.getDependencies(currentId)
      for (const dep of dependencies) {
        if (await checkCycle(dep.id)) return true
      }
      
      return false
    }
    
    return await checkCycle(dependsOnItemId)
  }

  /**
   * Get item statistics for a list
   */
  async getListStats(listId: string): Promise<{
    total: number
    completed: number
    inProgress: number
    pending: number
    overdue: number
  }> {
    const items = await this.findByListId(listId)
    const now = new Date()

    return {
      total: items.length,
      completed: items.filter(i => i.status === 'completed').length,
      inProgress: items.filter(i => i.status === 'in_progress').length,
      pending: items.filter(i => i.status === 'pending').length,
      overdue: items.filter(i => i.dueDate && new Date(i.dueDate) < now && i.status !== 'completed').length
    }
  }

  /**
   * Bulk update item status with dependency validation
   */
  async bulkUpdateStatus(
    ids: string[],
    status: 'pending' | 'in_progress' | 'completed' | 'blocked',
    options: {
      continueOnError?: boolean
      validateDependencies?: boolean
      updateTimestamps?: boolean
    } = {}
  ): Promise<BulkOperationResult<Item>> {
    const { continueOnError = false, validateDependencies = true, updateTimestamps = true } = options
    const results: Item[] = []
    const errors: Array<{ index: number; id: string; error: string; details?: any }> = []

    if (ids.length === 0) {
      return {
        success: true,
        results: [],
        errors: [],
        summary: { total: 0, successful: 0, failed: 0 }
      }
    }

    // Validate dependencies if required
    if (validateDependencies && status === 'completed') {
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i]
        try {
          const canComplete = await this.canStart(id)
          if (!canComplete) {
            errors.push({
              index: i,
              id,
              error: 'Cannot complete item due to incomplete dependencies',
              details: { status, dependencies: await this.getDependencies(id) }
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
            error: error instanceof Error ? error.message : 'Dependency validation failed',
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

    // Filter out items with errors if continuing on error
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
    const updateData: Partial<NewItem> = { status, updatedAt: new Date() }
    if (updateTimestamps && status === 'completed') {
      updateData.completedAt = new Date()
    }

    // Perform bulk update
    try {
      await this.transaction(async (db) => {
        for (const id of validIds) {
          const result = await db
            .update(itemsTable)
            .set(updateData)
            .where(eq(itemsTable.id, id))
            .returning()

          if (result.length === 0) {
            throw new Error(`Item with ID ${id} not found`)
          }
          results.push(result[0])
        }
      })
    } catch (error) {
      // Add errors for all items in the failed transaction
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
   * Bulk move items to a different list
   */
  async bulkMoveToList(
    ids: string[],
    targetListId: string,
    options: {
      continueOnError?: boolean
      preservePosition?: boolean
    } = {}
  ): Promise<BulkOperationResult<Item>> {
    const { continueOnError = false, preservePosition = false } = options
    const results: Item[] = []
    const errors: Array<{ index: number; id: string; error: string; details?: any }> = []

    if (ids.length === 0) {
      return {
        success: true,
        results: [],
        errors: [],
        summary: { total: 0, successful: 0, failed: 0 }
      }
    }

    try {
      await this.transaction(async (db) => {
        for (let i = 0; i < ids.length; i++) {
          const id = ids[i]
          try {
            // Get current item
            const currentItem = await this.findById(id)
            if (!currentItem) {
              throw new Error(`Item with ID ${id} not found`)
            }

            // Prepare update data
            const updateData: Partial<NewItem> = {
              listId: targetListId,
              updatedAt: new Date()
            }

            // Set position if not preserving
            if (!preservePosition) {
              // Get max position in target list
              const maxPositionResult = await db
                .select({ maxPosition: sql<number>`COALESCE(MAX(${itemsTable.position}), -1)` })
                .from(itemsTable)
                .where(eq(itemsTable.listId, targetListId))

              updateData.position = (maxPositionResult[0]?.maxPosition || -1) + 1
            }

            // Update item
            const result = await db
              .update(itemsTable)
              .set(updateData)
              .where(eq(itemsTable.id, id))
              .returning()

            if (result.length === 0) {
              throw new Error(`Failed to update item ${id}`)
            }

            results.push(result[0])
          } catch (error) {
            if (continueOnError) {
              errors.push({
                index: i,
                id,
                error: error instanceof Error ? error.message : 'Unknown error',
                details: error
              })
            } else {
              throw error
            }
          }
        }
      })
    } catch (error) {
      if (!continueOnError) {
        // Add errors for all items if transaction failed
        for (let i = 0; i < ids.length; i++) {
          errors.push({
            index: i,
            id: ids[i],
            error: error instanceof Error ? error.message : 'Bulk move operation failed',
            details: error
          })
        }
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

export const itemsService = new ItemsService()

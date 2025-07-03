import { eq, and, or, desc, asc, isNull, sql } from 'drizzle-orm'
import { BaseService } from './base'
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
}

export const listsService = new ListsService()

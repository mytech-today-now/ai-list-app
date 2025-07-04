import { Router } from 'express'
import { itemsService } from '../db/services'
import { itemsTable } from '../db/schema'
import { sql } from 'drizzle-orm'
import { randomUUID } from 'crypto'

const router = Router()

/**
 * GET /api/items
 * Get items with optional filtering
 */
router.get('/', async (req, res) => {
  try {
    const { listId, status, assignedTo, overdue, dueSoon } = req.query

    let items
    if (listId) {
      items = await itemsService.findByListId(listId as string)
    } else if (status) {
      const statusArray = Array.isArray(status) ? status : [status]
      items = await itemsService.findByStatus(statusArray as string[])
    } else if (assignedTo) {
      items = await itemsService.findByAssignee(assignedTo as string)
    } else if (overdue === 'true') {
      items = await itemsService.findOverdue()
    } else if (dueSoon) {
      const days = parseInt(dueSoon as string) || 7
      items = await itemsService.findDueSoon(days)
    } else {
      items = await itemsService.findAll({
        orderBy: [sql`${itemsTable.updatedAt} DESC`],
        limit: 100
      })
    }

    // Ensure items is always an array
    const safeItems = Array.isArray(items) ? items : []

    res.json({
      success: true,
      data: safeItems,
      message: `Found ${safeItems.length} items`
    })
  } catch (error) {
    console.error('Error fetching items:', error)
    res.status(500).json({
      success: false,
      data: [], // Always provide empty array as fallback
      error: 'Internal server error',
      message: 'Failed to fetch items'
    })
  }
})

/**
 * GET /api/items/:id
 * Get a specific item by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { include } = req.query

    const item = await itemsService.findById(id)
    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Item not found'
      })
    }

    let result: any = item

    if (include === 'dependencies') {
      const dependencies = await itemsService.getDependencies(id)
      const dependents = await itemsService.getDependents(id)
      result = { ...item, dependencies, dependents }
    }

    res.json({
      success: true,
      data: result,
      message: 'Item found'
    })
  } catch (error) {
    console.error('Error fetching item:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch item'
    })
  }
})

/**
 * POST /api/items
 * Create a new item
 */
router.post('/', async (req, res) => {
  try {
    const {
      listId,
      title,
      description,
      priority = 'medium',
      dueDate,
      estimatedDuration,
      tags,
      assignedTo
    } = req.body

    if (!listId || !title) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'List ID and title are required'
      })
    }

    const newItem = await itemsService.create({
      id: randomUUID(),
      listId,
      title,
      description,
      priority,
      status: 'pending',
      dueDate: dueDate ? new Date(dueDate) : null,
      estimatedDuration,
      tags: tags ? JSON.stringify(tags) : null,
      assignedTo,
      createdBy: 'user', // TODO: Get from auth
      createdAt: new Date(),
      updatedAt: new Date()
    })

    res.status(201).json({
      success: true,
      data: newItem,
      message: 'Item created successfully'
    })
  } catch (error) {
    console.error('Error creating item:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to create item'
    })
  }
})

/**
 * PUT /api/items/:id
 * Update an item
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const {
      title,
      description,
      priority,
      status,
      dueDate,
      estimatedDuration,
      actualDuration,
      tags,
      assignedTo
    } = req.body

    const updateData: any = {
      title,
      description,
      priority,
      status,
      estimatedDuration,
      actualDuration,
      assignedTo,
      updatedAt: new Date()
    }

    if (dueDate !== undefined) {
      updateData.dueDate = dueDate ? new Date(dueDate) : null
    }

    if (tags !== undefined) {
      updateData.tags = tags ? JSON.stringify(tags) : null
    }

    if (status === 'completed') {
      updateData.completedAt = new Date()
    }

    const updatedItem = await itemsService.updateById(id, updateData)

    if (!updatedItem) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Item not found'
      })
    }

    res.json({
      success: true,
      data: updatedItem,
      message: 'Item updated successfully'
    })
  } catch (error) {
    console.error('Error updating item:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to update item'
    })
  }
})

/**
 * DELETE /api/items/:id
 * Delete an item
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const deleted = await itemsService.deleteById(id)
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Item not found'
      })
    }

    res.json({
      success: true,
      message: 'Item deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting item:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to delete item'
    })
  }
})

/**
 * POST /api/items/:id/complete
 * Mark an item as completed
 */
router.post('/:id/complete', async (req, res) => {
  try {
    const { id } = req.params

    const updatedItem = await itemsService.markCompleted(id)
    if (!updatedItem) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Item not found'
      })
    }

    res.json({
      success: true,
      data: updatedItem,
      message: 'Item marked as completed'
    })
  } catch (error) {
    console.error('Error completing item:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to complete item'
    })
  }
})

/**
 * POST /api/items/:id/start
 * Mark an item as in progress
 */
router.post('/:id/start', async (req, res) => {
  try {
    const { id } = req.params

    const canStart = await itemsService.canStart(id)
    if (!canStart) {
      return res.status(400).json({
        success: false,
        error: 'Dependency error',
        message: 'Cannot start item: dependencies not completed'
      })
    }

    const updatedItem = await itemsService.markInProgress(id)
    if (!updatedItem) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Item not found'
      })
    }

    res.json({
      success: true,
      data: updatedItem,
      message: 'Item started'
    })
  } catch (error) {
    console.error('Error starting item:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to start item'
    })
  }
})

/**
 * POST /api/items/:id/move
 * Move an item to a different list
 */
router.post('/:id/move', async (req, res) => {
  try {
    const { id } = req.params
    const { listId } = req.body

    if (!listId) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'List ID is required'
      })
    }

    const updatedItem = await itemsService.moveToList(id, listId)
    if (!updatedItem) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Item not found'
      })
    }

    res.json({
      success: true,
      data: updatedItem,
      message: 'Item moved successfully'
    })
  } catch (error) {
    console.error('Error moving item:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to move item'
    })
  }
})

/**
 * POST /api/items/:id/duplicate
 * Duplicate an item
 */
router.post('/:id/duplicate', async (req, res) => {
  try {
    const { id } = req.params
    const { listId } = req.body

    const originalItem = await itemsService.findById(id)
    if (!originalItem) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Item not found'
      })
    }

    const duplicatedItem = await itemsService.create({
      id: randomUUID(),
      listId: listId || originalItem.listId,
      title: `${originalItem.title} (Copy)`,
      description: originalItem.description,
      priority: originalItem.priority,
      status: 'pending',
      dueDate: originalItem.dueDate,
      estimatedDuration: originalItem.estimatedDuration,
      tags: originalItem.tags,
      createdBy: 'user', // TODO: Get from auth
      createdAt: new Date(),
      updatedAt: new Date()
    })

    res.status(201).json({
      success: true,
      data: duplicatedItem,
      message: 'Item duplicated successfully'
    })
  } catch (error) {
    console.error('Error duplicating item:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to duplicate item'
    })
  }
})

/**
 * GET /api/items/search
 * Search items by title or description
 */
router.get('/search', async (req, res) => {
  try {
    const { q, listId, status, limit = 50 } = req.query

    if (!q || typeof q !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Search query (q) is required'
      })
    }

    const searchResults = await itemsService.search(q, {
      listId: listId as string,
      status: status as string,
      limit: parseInt(limit as string)
    })

    res.json({
      success: true,
      data: searchResults,
      message: `Found ${searchResults.length} items matching "${q}"`
    })
  } catch (error) {
    console.error('Error searching items:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to search items'
    })
  }
})

/**
 * GET /api/items/stats
 * Get global item statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const { listId } = req.query

    const stats = listId
      ? await itemsService.getListStats(listId as string)
      : await itemsService.getGlobalStats()

    res.json({
      success: true,
      data: stats,
      message: 'Item statistics retrieved'
    })
  } catch (error) {
    console.error('Error fetching item stats:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch item statistics'
    })
  }
})

export default router

import { Router } from 'express'
import { listsService, itemsService } from '../db/services'
import { randomUUID } from 'crypto'

const router = Router()

/**
 * GET /api/lists
 * Get all lists with optional hierarchy
 */
router.get('/', async (req, res) => {
  try {
    const { tree, parent } = req.query
    
    if (tree === 'true') {
      const lists = await listsService.getTree()
      res.json({
        success: true,
        data: lists,
        message: `Found ${lists.length} root lists`
      })
    } else if (parent) {
      const parentId = parent === 'null' ? null : parent as string
      const lists = await listsService.findByParent(parentId)
      res.json({
        success: true,
        data: lists,
        message: `Found ${lists.length} lists`
      })
    } else {
      const lists = await listsService.findWithItemCounts()
      res.json({
        success: true,
        data: lists,
        message: `Found ${lists.length} lists`
      })
    }
  } catch (error) {
    console.error('Error fetching lists:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch lists'
    })
  }
})

/**
 * GET /api/lists/:id
 * Get a specific list by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { include } = req.query
    
    const list = await listsService.findById(id)
    if (!list) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'List not found'
      })
    }

    let result: any = list

    if (include === 'children') {
      result = await listsService.getHierarchy(id)
    } else if (include === 'items') {
      const items = await itemsService.findByListId(id)
      result = { ...list, items }
    } else if (include === 'breadcrumbs') {
      const breadcrumbs = await listsService.getBreadcrumbs(id)
      result = { ...list, breadcrumbs }
    }

    res.json({
      success: true,
      data: result,
      message: 'List found'
    })
  } catch (error) {
    console.error('Error fetching list:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch list'
    })
  }
})

/**
 * POST /api/lists
 * Create a new list
 */
router.post('/', async (req, res) => {
  try {
    const { title, description, parentListId, priority = 'medium' } = req.body

    if (!title) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Title is required'
      })
    }

    const newList = await listsService.create({
      id: randomUUID(),
      title,
      description,
      parentListId: parentListId || null,
      priority,
      status: 'active',
      createdBy: 'user', // TODO: Get from auth
      createdAt: new Date(),
      updatedAt: new Date()
    })

    res.status(201).json({
      success: true,
      data: newList,
      message: 'List created successfully'
    })
  } catch (error) {
    console.error('Error creating list:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to create list'
    })
  }
})

/**
 * PUT /api/lists/:id
 * Update a list
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { title, description, priority, status } = req.body

    const updatedList = await listsService.updateById(id, {
      title,
      description,
      priority,
      status,
      updatedAt: new Date()
    })

    if (!updatedList) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'List not found'
      })
    }

    res.json({
      success: true,
      data: updatedList,
      message: 'List updated successfully'
    })
  } catch (error) {
    console.error('Error updating list:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to update list'
    })
  }
})

/**
 * DELETE /api/lists/:id
 * Delete a list
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const deleted = await listsService.deleteById(id)
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'List not found'
      })
    }

    res.json({
      success: true,
      message: 'List deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting list:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to delete list'
    })
  }
})

/**
 * POST /api/lists/:id/move
 * Move a list to a new parent
 */
router.post('/:id/move', async (req, res) => {
  try {
    const { id } = req.params
    const { parentId } = req.body

    const updatedList = await listsService.moveToParent(id, parentId || null)
    if (!updatedList) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'List not found'
      })
    }

    res.json({
      success: true,
      data: updatedList,
      message: 'List moved successfully'
    })
  } catch (error) {
    console.error('Error moving list:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message || 'Failed to move list'
    })
  }
})

/**
 * POST /api/lists/:id/reorder
 * Reorder a list within its parent
 */
router.post('/:id/reorder', async (req, res) => {
  try {
    const { id } = req.params
    const { position } = req.body

    if (typeof position !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Position must be a number'
      })
    }

    await listsService.reorder(id, position)

    res.json({
      success: true,
      message: 'List reordered successfully'
    })
  } catch (error) {
    console.error('Error reordering list:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message || 'Failed to reorder list'
    })
  }
})

/**
 * POST /api/lists/:id/archive
 * Archive a list and its children
 */
router.post('/:id/archive', async (req, res) => {
  try {
    const { id } = req.params

    await listsService.archive(id)

    res.json({
      success: true,
      message: 'List archived successfully'
    })
  } catch (error) {
    console.error('Error archiving list:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to archive list'
    })
  }
})

export default router

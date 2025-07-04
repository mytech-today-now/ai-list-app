import { Router } from 'express'
import { agentsService } from '../db/services'
import { randomUUID } from 'crypto'

const router = Router()

/**
 * GET /api/agents
 * Get all agents with optional filtering
 */
router.get('/', async (req, res) => {
  try {
    const { role, active, recent } = req.query

    let agents
    if (role) {
      agents = await agentsService.findByRole(role as string)
    } else if (active === 'true') {
      agents = await agentsService.findActive()
    } else if (recent) {
      const hours = parseInt(recent as string) || 24
      agents = await agentsService.findRecentlyActive(hours)
    } else {
      agents = await agentsService.findAll()
    }

    // Remove sensitive data
    const safeAgents = agents.map(agent => ({
      ...agent,
      apiKeyHash: undefined
    }))

    res.json({
      success: true,
      data: safeAgents,
      message: `Found ${agents.length} agents`
    })
  } catch (error) {
    console.error('Error fetching agents:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch agents'
    })
  }
})

/**
 * GET /api/agents/:id
 * Get a specific agent by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { include } = req.query

    const agent = await agentsService.findById(id)
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Agent not found'
      })
    }

    let result: any = { ...agent, apiKeyHash: undefined }

    if (include === 'activity') {
      const days = 30
      const activity = await agentsService.getActivitySummary(id, days)
      result = { ...result, activity }
    }

    res.json({
      success: true,
      data: result,
      message: 'Agent found'
    })
  } catch (error) {
    console.error('Error fetching agent:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch agent'
    })
  }
})

/**
 * POST /api/agents
 * Create a new agent
 */
router.post('/', async (req, res) => {
  try {
    const {
      name,
      role,
      permissions = [],
      configuration = {},
      apiKey
    } = req.body

    if (!name || !role) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Name and role are required'
      })
    }

    const validRoles = ['reader', 'executor', 'planner', 'admin']
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Invalid role'
      })
    }

    const agentData = {
      id: randomUUID(),
      name,
      role,
      status: 'active' as const,
      permissions: JSON.stringify(permissions),
      configuration: JSON.stringify(configuration)
    }

    let newAgent
    if (apiKey) {
      newAgent = await agentsService.createWithApiKey({ ...agentData, apiKey })
    } else {
      newAgent = await agentsService.create(agentData)
    }

    // Remove sensitive data from response
    const safeAgent = { ...newAgent, apiKeyHash: undefined }

    res.status(201).json({
      success: true,
      data: safeAgent,
      message: 'Agent created successfully'
    })
  } catch (error) {
    console.error('Error creating agent:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to create agent'
    })
  }
})

/**
 * PUT /api/agents/:id
 * Update an agent
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name, status, permissions, configuration } = req.body

    const updateData: any = {
      name,
      status,
      updatedAt: new Date()
    }

    if (permissions !== undefined) {
      updateData.permissions = JSON.stringify(permissions)
    }

    if (configuration !== undefined) {
      updateData.configuration = JSON.stringify(configuration)
    }

    const updatedAgent = await agentsService.updateById(id, updateData)

    if (!updatedAgent) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Agent not found'
      })
    }

    // Remove sensitive data from response
    const safeAgent = { ...updatedAgent, apiKeyHash: undefined }

    res.json({
      success: true,
      data: safeAgent,
      message: 'Agent updated successfully'
    })
  } catch (error) {
    console.error('Error updating agent:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to update agent'
    })
  }
})

/**
 * DELETE /api/agents/:id
 * Delete an agent
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const deleted = await agentsService.deleteById(id)
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Agent not found'
      })
    }

    res.json({
      success: true,
      message: 'Agent deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting agent:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to delete agent'
    })
  }
})

/**
 * POST /api/agents/:id/suspend
 * Suspend an agent
 */
router.post('/:id/suspend', async (req, res) => {
  try {
    const { id } = req.params
    const { reason } = req.body

    const suspendedAgent = await agentsService.suspend(id, reason)
    if (!suspendedAgent) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Agent not found'
      })
    }

    const safeAgent = { ...suspendedAgent, apiKeyHash: undefined }

    res.json({
      success: true,
      data: safeAgent,
      message: 'Agent suspended successfully'
    })
  } catch (error) {
    console.error('Error suspending agent:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to suspend agent'
    })
  }
})

/**
 * POST /api/agents/:id/reactivate
 * Reactivate a suspended agent
 */
router.post('/:id/reactivate', async (req, res) => {
  try {
    const { id } = req.params

    const reactivatedAgent = await agentsService.reactivate(id)
    if (!reactivatedAgent) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Agent not found'
      })
    }

    const safeAgent = { ...reactivatedAgent, apiKeyHash: undefined }

    res.json({
      success: true,
      data: safeAgent,
      message: 'Agent reactivated successfully'
    })
  } catch (error) {
    console.error('Error reactivating agent:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to reactivate agent'
    })
  }
})

/**
 * GET /api/agents/:id/activity
 * Get agent activity summary
 */
router.get('/:id/activity', async (req, res) => {
  try {
    const { id } = req.params
    const { days = 30 } = req.query

    const activity = await agentsService.getActivitySummary(id, parseInt(days as string))

    res.json({
      success: true,
      data: activity,
      message: 'Activity summary retrieved'
    })
  } catch (error) {
    console.error('Error fetching agent activity:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch agent activity'
    })
  }
})

/**
 * POST /api/agents/:id/permissions
 * Update agent permissions
 */
router.post('/:id/permissions', async (req, res) => {
  try {
    const { id } = req.params
    const { permissions } = req.body

    if (!Array.isArray(permissions)) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Permissions must be an array'
      })
    }

    const updatedAgent = await agentsService.updateById(id, {
      permissions: JSON.stringify(permissions),
      updatedAt: new Date()
    })

    if (!updatedAgent) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Agent not found'
      })
    }

    // Remove sensitive data from response
    const safeAgent = { ...updatedAgent, apiKeyHash: undefined }

    res.json({
      success: true,
      data: safeAgent,
      message: 'Agent permissions updated successfully'
    })
  } catch (error) {
    console.error('Error updating agent permissions:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to update agent permissions'
    })
  }
})

/**
 * POST /api/agents/:id/verify-key
 * Verify agent API key
 */
router.post('/:id/verify-key', async (req, res) => {
  try {
    const { id } = req.params
    const { apiKey } = req.body

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'API key is required'
      })
    }

    const isValid = await agentsService.verifyApiKey(id, apiKey)

    res.json({
      success: true,
      data: { valid: isValid },
      message: isValid ? 'API key is valid' : 'API key is invalid'
    })
  } catch (error) {
    console.error('Error verifying API key:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to verify API key'
    })
  }
})

/**
 * GET /api/agents/stats
 * Get agent statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await agentsService.getAgentStats()

    res.json({
      success: true,
      data: stats,
      message: 'Agent statistics retrieved'
    })
  } catch (error) {
    console.error('Error fetching agent stats:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch agent statistics'
    })
  }
})

export default router

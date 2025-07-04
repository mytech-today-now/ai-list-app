import { Router } from 'express'
import { sessionsService } from '../db/services/sessions'
import { agentsService } from '../db/services'
import { randomUUID } from 'crypto'

const router = Router()

/**
 * GET /api/sessions
 * Get sessions with optional filtering
 */
router.get('/', async (req, res) => {
  try {
    const { agentId, userId, status, active, expired, expiringSoon } = req.query

    let sessions
    if (agentId) {
      const includeExpired = status === 'all'
      sessions = await sessionsService.findByAgentId(agentId as string, includeExpired)
    } else if (userId) {
      const includeExpired = status === 'all'
      sessions = await sessionsService.findByUserId(userId as string, includeExpired)
    } else if (active === 'true') {
      sessions = await sessionsService.findActive()
    } else if (expired === 'true') {
      sessions = await sessionsService.findExpired()
    } else if (expiringSoon) {
      const minutes = parseInt(expiringSoon as string) || 30
      sessions = await sessionsService.findExpiringSoon(minutes)
    } else {
      // Get all sessions with pagination
      const limit = Math.min(100, parseInt(req.query.limit as string) || 50)
      const offset = parseInt(req.query.offset as string) || 0
      
      sessions = await sessionsService.findAll({
        limit,
        offset,
        orderBy: [{ column: 'lastActivity', direction: 'desc' }]
      })
    }

    res.json({
      success: true,
      data: sessions,
      message: `Found ${sessions.length} sessions`
    })
  } catch (error) {
    console.error('Error fetching sessions:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch sessions'
    })
  }
})

/**
 * GET /api/sessions/stats
 * Get session statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await sessionsService.getSessionStats()
    
    res.json({
      success: true,
      data: stats,
      message: 'Session statistics retrieved'
    })
  } catch (error) {
    console.error('Error fetching session stats:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch session statistics'
    })
  }
})

/**
 * GET /api/sessions/:id
 * Get a specific session by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { include } = req.query

    let session
    if (include === 'agent') {
      session = await sessionsService.findWithAgent(id)
    } else {
      session = await sessionsService.findById(id)
    }

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Session not found'
      })
    }

    res.json({
      success: true,
      data: session,
      message: 'Session found'
    })
  } catch (error) {
    console.error('Error fetching session:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch session'
    })
  }
})

/**
 * POST /api/sessions
 * Create a new session
 */
router.post('/', async (req, res) => {
  try {
    const {
      agentId,
      userId,
      expirationMinutes = 60
    } = req.body

    if (!agentId) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Agent ID is required'
      })
    }

    // Verify agent exists and is active
    const agent = await agentsService.findById(agentId)
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Agent not found'
      })
    }

    if (agent.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Agent is not active'
      })
    }

    const session = await sessionsService.createSession(agentId, userId, expirationMinutes)

    res.status(201).json({
      success: true,
      data: session,
      message: 'Session created successfully'
    })
  } catch (error) {
    console.error('Error creating session:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to create session'
    })
  }
})

/**
 * PUT /api/sessions/:id
 * Update session metadata
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { metadata } = req.body

    if (!metadata || typeof metadata !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Valid metadata object is required'
      })
    }

    const updatedSession = await sessionsService.updateMetadata(id, metadata)
    if (!updatedSession) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Session not found'
      })
    }

    res.json({
      success: true,
      data: updatedSession,
      message: 'Session updated successfully'
    })
  } catch (error) {
    console.error('Error updating session:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to update session'
    })
  }
})

/**
 * DELETE /api/sessions/:id
 * Terminate a session
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const terminatedSession = await sessionsService.terminateSession(id)
    if (!terminatedSession) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Session not found'
      })
    }

    res.json({
      success: true,
      data: terminatedSession,
      message: 'Session terminated successfully'
    })
  } catch (error) {
    console.error('Error terminating session:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to terminate session'
    })
  }
})

/**
 * POST /api/sessions/:id/validate
 * Validate a session and update activity
 */
router.post('/:id/validate', async (req, res) => {
  try {
    const { id } = req.params

    const validation = await sessionsService.validateSession(id)
    
    if (!validation.valid) {
      return res.status(401).json({
        success: false,
        error: 'Session invalid',
        message: validation.reason || 'Session is not valid',
        data: { valid: false, reason: validation.reason }
      })
    }

    res.json({
      success: true,
      data: {
        valid: true,
        session: validation.session
      },
      message: 'Session is valid'
    })
  } catch (error) {
    console.error('Error validating session:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to validate session'
    })
  }
})

/**
 * POST /api/sessions/:id/extend
 * Extend session expiration
 */
router.post('/:id/extend', async (req, res) => {
  try {
    const { id } = req.params
    const { additionalMinutes = 60 } = req.body

    if (additionalMinutes <= 0 || additionalMinutes > 1440) { // Max 24 hours
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Additional minutes must be between 1 and 1440 (24 hours)'
      })
    }

    const extendedSession = await sessionsService.extendSession(id, additionalMinutes)
    if (!extendedSession) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Session not found or not active'
      })
    }

    res.json({
      success: true,
      data: extendedSession,
      message: `Session extended by ${additionalMinutes} minutes`
    })
  } catch (error) {
    console.error('Error extending session:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to extend session'
    })
  }
})

/**
 * POST /api/sessions/:id/activity
 * Update session activity (heartbeat)
 */
router.post('/:id/activity', async (req, res) => {
  try {
    const { id } = req.params
    const { extendMinutes = 60 } = req.body

    const updatedSession = await sessionsService.updateActivity(id, extendMinutes)
    if (!updatedSession) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Session not found'
      })
    }

    res.json({
      success: true,
      data: updatedSession,
      message: 'Session activity updated'
    })
  } catch (error) {
    console.error('Error updating session activity:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to update session activity'
    })
  }
})

/**
 * POST /api/sessions/cleanup
 * Cleanup expired sessions
 */
router.post('/cleanup', async (req, res) => {
  try {
    const cleanedCount = await sessionsService.cleanupExpiredSessions()

    res.json({
      success: true,
      data: { cleanedCount },
      message: `Cleaned up ${cleanedCount} expired sessions`
    })
  } catch (error) {
    console.error('Error cleaning up sessions:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to cleanup expired sessions'
    })
  }
})

/**
 * DELETE /api/sessions/agent/:agentId
 * Terminate all sessions for an agent
 */
router.delete('/agent/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params

    const terminatedCount = await sessionsService.terminateAgentSessions(agentId)

    res.json({
      success: true,
      data: { terminatedCount },
      message: `Terminated ${terminatedCount} sessions for agent`
    })
  } catch (error) {
    console.error('Error terminating agent sessions:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to terminate agent sessions'
    })
  }
})

/**
 * DELETE /api/sessions/user/:userId
 * Terminate all sessions for a user
 */
router.delete('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params

    const terminatedCount = await sessionsService.terminateUserSessions(userId)

    res.json({
      success: true,
      data: { terminatedCount },
      message: `Terminated ${terminatedCount} sessions for user`
    })
  } catch (error) {
    console.error('Error terminating user sessions:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to terminate user sessions'
    })
  }
})

export default router

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
      message: `Found ${sessions.length} sessions`,
      correlationId: randomUUID()
    })
  } catch (error) {
    console.error('Error fetching sessions:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch sessions',
      correlationId: randomUUID()
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
      message: 'Session statistics retrieved',
      correlationId: randomUUID()
    })
  } catch (error) {
    console.error('Error fetching session stats:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch session statistics',
      correlationId: randomUUID()
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
        message: 'Session not found',
        correlationId: randomUUID()
      })
    }

    res.json({
      success: true,
      data: session,
      message: 'Session found',
      correlationId: randomUUID()
    })
  } catch (error) {
    console.error('Error fetching session:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch session',
      correlationId: randomUUID()
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
        message: 'Agent ID is required',
        correlationId: randomUUID()
      })
    }

    // Verify agent exists and is active
    const agent = await agentsService.findById(agentId)
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Agent not found',
        correlationId: randomUUID()
      })
    }

    if (agent.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Agent is not active',
        correlationId: randomUUID()
      })
    }

    const session = await sessionsService.createSession(agentId, userId, expirationMinutes)

    res.status(201).json({
      success: true,
      data: session,
      message: 'Session created successfully',
      correlationId: randomUUID()
    })
  } catch (error) {
    console.error('Error creating session:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to create session',
      correlationId: randomUUID()
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
        message: 'Valid metadata object is required',
        correlationId: randomUUID()
      })
    }

    const updatedSession = await sessionsService.updateMetadata(id, metadata)
    if (!updatedSession) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Session not found',
        correlationId: randomUUID()
      })
    }

    res.json({
      success: true,
      data: updatedSession,
      message: 'Session updated successfully',
      correlationId: randomUUID()
    })
  } catch (error) {
    console.error('Error updating session:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to update session',
      correlationId: randomUUID()
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
        message: 'Session not found',
        correlationId: randomUUID()
      })
    }

    res.json({
      success: true,
      data: terminatedSession,
      message: 'Session terminated successfully',
      correlationId: randomUUID()
    })
  } catch (error) {
    console.error('Error terminating session:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to terminate session',
      correlationId: randomUUID()
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
      message: 'Session is valid',
      correlationId: randomUUID()
    })
  } catch (error) {
    console.error('Error validating session:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to validate session',
      correlationId: randomUUID()
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
        message: 'Additional minutes must be between 1 and 1440 (24 hours)',
        correlationId: randomUUID()
      })
    }

    const extendedSession = await sessionsService.extendSession(id, additionalMinutes)
    if (!extendedSession) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Session not found or not active',
        correlationId: randomUUID()
      })
    }

    res.json({
      success: true,
      data: extendedSession,
      message: `Session extended by ${additionalMinutes} minutes`,
      correlationId: randomUUID()
    })
  } catch (error) {
    console.error('Error extending session:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to extend session',
      correlationId: randomUUID()
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
        message: 'Session not found',
        correlationId: randomUUID()
      })
    }

    res.json({
      success: true,
      data: updatedSession,
      message: 'Session activity updated',
      correlationId: randomUUID()
    })
  } catch (error) {
    console.error('Error updating session activity:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to update session activity',
      correlationId: randomUUID()
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
      message: `Cleaned up ${cleanedCount} expired sessions`,
      correlationId: randomUUID()
    })
  } catch (error) {
    console.error('Error cleaning up sessions:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to cleanup expired sessions',
      correlationId: randomUUID()
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
      message: `Terminated ${terminatedCount} sessions for agent`,
      correlationId: randomUUID()
    })
  } catch (error) {
    console.error('Error terminating agent sessions:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to terminate agent sessions',
      correlationId: randomUUID()
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
      message: `Terminated ${terminatedCount} sessions for user`,
      correlationId: randomUUID()
    })
  } catch (error) {
    console.error('Error terminating user sessions:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to terminate user sessions',
      correlationId: randomUUID()
    })
  }
})

export default router

import request from 'supertest'
import express from 'express'
import sessionsRouter from '../../routes/sessions'
import { sessionsService } from '../../db/services/sessions'
import { agentsService } from '../../db/services'

// Mock the database services
jest.mock('../../db/services/sessions', () => ({
  sessionsService: {
    findAll: jest.fn(),
    findByAgentId: jest.fn(),
    findByUserId: jest.fn(),
    findActive: jest.fn(),
    findExpired: jest.fn(),
    findExpiringSoon: jest.fn(),
    getSessionStats: jest.fn(),
    findById: jest.fn(),
    findWithAgent: jest.fn(),
    createSession: jest.fn(),
    updateMetadata: jest.fn(),
    terminateSession: jest.fn(),
    validateSession: jest.fn(),
    extendSession: jest.fn(),
    updateActivity: jest.fn(),
    cleanupExpiredSessions: jest.fn(),
    terminateAgentSessions: jest.fn(),
    terminateUserSessions: jest.fn()
  }
}))

jest.mock('../../db/services', () => ({
  agentsService: {
    findById: jest.fn()
  }
}))

describe('Sessions API Integration Tests', () => {
  let app: express.Application

  beforeEach(() => {
    app = express()
    app.use(express.json())
    app.use('/api/sessions', sessionsRouter)
    jest.clearAllMocks()
  })

  describe('GET /api/sessions', () => {
    it('should get all sessions with default pagination', async () => {
      const mockSessions = [
        { 
          id: 'session-1', 
          agentId: 'agent-1', 
          userId: 'user-1',
          status: 'active',
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          lastActivity: new Date().toISOString()
        },
        { 
          id: 'session-2', 
          agentId: 'agent-2', 
          userId: 'user-2',
          status: 'active',
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          lastActivity: new Date().toISOString()
        }
      ]
      
      ;(sessionsService.findAll as jest.Mock).mockResolvedValue(mockSessions)

      const response = await request(app)
        .get('/api/sessions')
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        data: mockSessions,
        message: 'Found 2 sessions'
      })
      expect(sessionsService.findAll).toHaveBeenCalledWith({
        limit: 50,
        offset: 0,
        orderBy: [{ column: 'lastActivity', direction: 'desc' }]
      })
    })

    it('should get sessions with custom pagination', async () => {
      const mockSessions = []
      ;(sessionsService.findAll as jest.Mock).mockResolvedValue(mockSessions)

      await request(app)
        .get('/api/sessions?limit=25&offset=10')
        .expect(200)

      expect(sessionsService.findAll).toHaveBeenCalledWith({
        limit: 25,
        offset: 10,
        orderBy: [{ column: 'lastActivity', direction: 'desc' }]
      })
    })

    it('should enforce maximum limit of 100', async () => {
      const mockSessions = []
      ;(sessionsService.findAll as jest.Mock).mockResolvedValue(mockSessions)

      await request(app)
        .get('/api/sessions?limit=200')
        .expect(200)

      expect(sessionsService.findAll).toHaveBeenCalledWith({
        limit: 100,
        offset: 0,
        orderBy: [{ column: 'lastActivity', direction: 'desc' }]
      })
    })

    it('should filter sessions by agent ID', async () => {
      const mockSessions = [
        { 
          id: 'session-1', 
          agentId: 'agent-1', 
          status: 'active'
        }
      ]
      
      ;(sessionsService.findByAgentId as jest.Mock).mockResolvedValue(mockSessions)

      const response = await request(app)
        .get('/api/sessions?agentId=agent-1')
        .expect(200)

      expect(response.body.data).toEqual(mockSessions)
      expect(sessionsService.findByAgentId).toHaveBeenCalledWith('agent-1', false)
    })

    it('should filter sessions by agent ID including expired when status=all', async () => {
      const mockSessions = []
      ;(sessionsService.findByAgentId as jest.Mock).mockResolvedValue(mockSessions)

      await request(app)
        .get('/api/sessions?agentId=agent-1&status=all')
        .expect(200)

      expect(sessionsService.findByAgentId).toHaveBeenCalledWith('agent-1', true)
    })

    it('should filter sessions by user ID', async () => {
      const mockSessions = [
        { 
          id: 'session-1', 
          userId: 'user-1', 
          status: 'active'
        }
      ]
      
      ;(sessionsService.findByUserId as jest.Mock).mockResolvedValue(mockSessions)

      const response = await request(app)
        .get('/api/sessions?userId=user-1')
        .expect(200)

      expect(response.body.data).toEqual(mockSessions)
      expect(sessionsService.findByUserId).toHaveBeenCalledWith('user-1', false)
    })

    it('should filter active sessions', async () => {
      const mockSessions = [
        { 
          id: 'session-1', 
          status: 'active'
        }
      ]
      
      ;(sessionsService.findActive as jest.Mock).mockResolvedValue(mockSessions)

      const response = await request(app)
        .get('/api/sessions?active=true')
        .expect(200)

      expect(response.body.data).toEqual(mockSessions)
      expect(sessionsService.findActive).toHaveBeenCalledTimes(1)
    })

    it('should filter expired sessions', async () => {
      const mockSessions = [
        { 
          id: 'session-1', 
          status: 'expired'
        }
      ]
      
      ;(sessionsService.findExpired as jest.Mock).mockResolvedValue(mockSessions)

      const response = await request(app)
        .get('/api/sessions?expired=true')
        .expect(200)

      expect(response.body.data).toEqual(mockSessions)
      expect(sessionsService.findExpired).toHaveBeenCalledTimes(1)
    })

    it('should filter sessions expiring soon with default minutes', async () => {
      const mockSessions = []
      ;(sessionsService.findExpiringSoon as jest.Mock).mockResolvedValue(mockSessions)

      await request(app)
        .get('/api/sessions?expiringSoon=true')
        .expect(200)

      expect(sessionsService.findExpiringSoon).toHaveBeenCalledWith(30)
    })

    it('should filter sessions expiring soon with custom minutes', async () => {
      const mockSessions = []
      ;(sessionsService.findExpiringSoon as jest.Mock).mockResolvedValue(mockSessions)

      await request(app)
        .get('/api/sessions?expiringSoon=60')
        .expect(200)

      expect(sessionsService.findExpiringSoon).toHaveBeenCalledWith(60)
    })

    it('should handle database errors', async () => {
      ;(sessionsService.findAll as jest.Mock).mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .get('/api/sessions')
        .expect(500)

      expect(response.body).toEqual({
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch sessions'
      })
    })
  })

  describe('GET /api/sessions/stats', () => {
    it('should get session statistics', async () => {
      const mockStats = {
        total: 100,
        active: 75,
        expired: 20,
        terminated: 5,
        averageSessionDuration: 3600,
        totalSessionTime: 360000,
        agentDistribution: {
          'agent-1': 30,
          'agent-2': 45
        }
      }

      ;(sessionsService.getSessionStats as jest.Mock).mockResolvedValue(mockStats)

      const response = await request(app)
        .get('/api/sessions/stats')
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        data: mockStats,
        message: 'Session statistics retrieved'
      })
      expect(sessionsService.getSessionStats).toHaveBeenCalledTimes(1)
    })

    it('should handle database errors', async () => {
      ;(sessionsService.getSessionStats as jest.Mock).mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .get('/api/sessions/stats')
        .expect(500)

      expect(response.body).toEqual({
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch session statistics'
      })
    })
  })

  describe('GET /api/sessions/:id', () => {
    it('should get a specific session by ID', async () => {
      const mockSession = {
        id: 'session-1',
        agentId: 'agent-1',
        userId: 'user-1',
        status: 'active',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        lastActivity: new Date().toISOString(),
        metadata: { key: 'value' }
      }

      ;(sessionsService.findById as jest.Mock).mockResolvedValue(mockSession)

      const response = await request(app)
        .get('/api/sessions/session-1')
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        data: mockSession,
        message: 'Session found'
      })
      expect(sessionsService.findById).toHaveBeenCalledWith('session-1')
    })

    it('should get session with agent details when include=agent', async () => {
      const mockSessionWithAgent = {
        id: 'session-1',
        agentId: 'agent-1',
        status: 'active',
        agent: {
          id: 'agent-1',
          name: 'Test Agent',
          role: 'executor'
        }
      }

      ;(sessionsService.findWithAgent as jest.Mock).mockResolvedValue(mockSessionWithAgent)

      const response = await request(app)
        .get('/api/sessions/session-1?include=agent')
        .expect(200)

      expect(response.body.data).toEqual(mockSessionWithAgent)
      expect(sessionsService.findWithAgent).toHaveBeenCalledWith('session-1')
    })

    it('should return 404 for non-existent session', async () => {
      ;(sessionsService.findById as jest.Mock).mockResolvedValue(null)

      const response = await request(app)
        .get('/api/sessions/nonexistent')
        .expect(404)

      expect(response.body).toEqual({
        success: false,
        error: 'Not found',
        message: 'Session not found'
      })
    })

    it('should handle database errors', async () => {
      ;(sessionsService.findById as jest.Mock).mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .get('/api/sessions/session-1')
        .expect(500)

      expect(response.body).toEqual({
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch session'
      })
    })
  })

  describe('POST /api/sessions', () => {
    it('should create a new session', async () => {
      const newSessionData = {
        agentId: 'agent-1',
        userId: 'user-1',
        expirationMinutes: 120
      }

      const mockAgent = {
        id: 'agent-1',
        name: 'Test Agent',
        role: 'executor',
        status: 'active'
      }

      const createdSession = {
        id: 'session-1',
        agentId: 'agent-1',
        userId: 'user-1',
        status: 'active',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7200000).toISOString(),
        lastActivity: new Date().toISOString(),
        metadata: {}
      }

      ;(agentsService.findById as jest.Mock).mockResolvedValue(mockAgent)
      ;(sessionsService.createSession as jest.Mock).mockResolvedValue(createdSession)

      const response = await request(app)
        .post('/api/sessions')
        .send(newSessionData)
        .expect(201)

      expect(response.body).toEqual({
        success: true,
        data: createdSession,
        message: 'Session created successfully'
      })

      expect(agentsService.findById).toHaveBeenCalledWith('agent-1')
      expect(sessionsService.createSession).toHaveBeenCalledWith('agent-1', 'user-1', 120)
    })

    it('should create session with default expiration when not specified', async () => {
      const newSessionData = {
        agentId: 'agent-1',
        userId: 'user-1'
      }

      const mockAgent = {
        id: 'agent-1',
        status: 'active'
      }

      const createdSession = {
        id: 'session-1',
        agentId: 'agent-1',
        status: 'active'
      }

      ;(agentsService.findById as jest.Mock).mockResolvedValue(mockAgent)
      ;(sessionsService.createSession as jest.Mock).mockResolvedValue(createdSession)

      await request(app)
        .post('/api/sessions')
        .send(newSessionData)
        .expect(201)

      expect(sessionsService.createSession).toHaveBeenCalledWith('agent-1', 'user-1', 60)
    })

    it('should return 400 for missing agent ID', async () => {
      const response = await request(app)
        .post('/api/sessions')
        .send({ userId: 'user-1' })
        .expect(400)

      expect(response.body).toEqual({
        success: false,
        error: 'Validation error',
        message: 'Agent ID is required'
      })
      expect(agentsService.findById).not.toHaveBeenCalled()
    })

    it('should return 404 for non-existent agent', async () => {
      ;(agentsService.findById as jest.Mock).mockResolvedValue(null)

      const response = await request(app)
        .post('/api/sessions')
        .send({ agentId: 'nonexistent' })
        .expect(404)

      expect(response.body).toEqual({
        success: false,
        error: 'Not found',
        message: 'Agent not found'
      })
    })

    it('should return 400 for inactive agent', async () => {
      const mockAgent = {
        id: 'agent-1',
        status: 'inactive'
      }

      ;(agentsService.findById as jest.Mock).mockResolvedValue(mockAgent)

      const response = await request(app)
        .post('/api/sessions')
        .send({ agentId: 'agent-1' })
        .expect(400)

      expect(response.body).toEqual({
        success: false,
        error: 'Validation error',
        message: 'Agent is not active'
      })
      expect(sessionsService.createSession).not.toHaveBeenCalled()
    })

    it('should handle database errors during creation', async () => {
      const mockAgent = { id: 'agent-1', status: 'active' }
      ;(agentsService.findById as jest.Mock).mockResolvedValue(mockAgent)
      ;(sessionsService.createSession as jest.Mock).mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .post('/api/sessions')
        .send({ agentId: 'agent-1' })
        .expect(500)

      expect(response.body).toEqual({
        success: false,
        error: 'Internal server error',
        message: 'Failed to create session'
      })
    })
  })

  describe('PUT /api/sessions/:id', () => {
    it('should update session metadata', async () => {
      const updateData = {
        metadata: {
          key1: 'value1',
          key2: 'value2',
          nested: { prop: 'value' }
        }
      }

      const updatedSession = {
        id: 'session-1',
        agentId: 'agent-1',
        status: 'active',
        metadata: updateData.metadata,
        updatedAt: new Date().toISOString()
      }

      ;(sessionsService.updateMetadata as jest.Mock).mockResolvedValue(updatedSession)

      const response = await request(app)
        .put('/api/sessions/session-1')
        .send(updateData)
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        data: updatedSession,
        message: 'Session updated successfully'
      })

      expect(sessionsService.updateMetadata).toHaveBeenCalledWith('session-1', updateData.metadata)
    })

    it('should return 400 for missing metadata', async () => {
      const response = await request(app)
        .put('/api/sessions/session-1')
        .send({})
        .expect(400)

      expect(response.body).toEqual({
        success: false,
        error: 'Validation error',
        message: 'Valid metadata object is required'
      })
      expect(sessionsService.updateMetadata).not.toHaveBeenCalled()
    })

    it('should return 400 for invalid metadata type', async () => {
      const response = await request(app)
        .put('/api/sessions/session-1')
        .send({ metadata: 'invalid' })
        .expect(400)

      expect(response.body).toEqual({
        success: false,
        error: 'Validation error',
        message: 'Valid metadata object is required'
      })
      expect(sessionsService.updateMetadata).not.toHaveBeenCalled()
    })

    it('should return 404 for non-existent session', async () => {
      ;(sessionsService.updateMetadata as jest.Mock).mockResolvedValue(null)

      const response = await request(app)
        .put('/api/sessions/nonexistent')
        .send({ metadata: { key: 'value' } })
        .expect(404)

      expect(response.body).toEqual({
        success: false,
        error: 'Not found',
        message: 'Session not found'
      })
    })

    it('should handle database errors', async () => {
      ;(sessionsService.updateMetadata as jest.Mock).mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .put('/api/sessions/session-1')
        .send({ metadata: { key: 'value' } })
        .expect(500)

      expect(response.body).toEqual({
        success: false,
        error: 'Internal server error',
        message: 'Failed to update session'
      })
    })
  })

  describe('DELETE /api/sessions/:id', () => {
    it('should terminate an existing session', async () => {
      const terminatedSession = {
        id: 'session-1',
        status: 'terminated',
        terminatedAt: new Date().toISOString()
      }

      ;(sessionsService.terminateSession as jest.Mock).mockResolvedValue(terminatedSession)

      const response = await request(app)
        .delete('/api/sessions/session-1')
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        data: terminatedSession,
        message: 'Session terminated successfully'
      })
      expect(sessionsService.terminateSession).toHaveBeenCalledWith('session-1')
    })

    it('should return 404 for non-existent session', async () => {
      ;(sessionsService.terminateSession as jest.Mock).mockResolvedValue(null)

      const response = await request(app)
        .delete('/api/sessions/nonexistent')
        .expect(404)

      expect(response.body).toEqual({
        success: false,
        error: 'Not found',
        message: 'Session not found'
      })
    })

    it('should handle database errors', async () => {
      ;(sessionsService.terminateSession as jest.Mock).mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .delete('/api/sessions/session-1')
        .expect(500)

      expect(response.body).toEqual({
        success: false,
        error: 'Internal server error',
        message: 'Failed to terminate session'
      })
    })
  })

  describe('POST /api/sessions/:id/validate', () => {
    it('should validate a valid session', async () => {
      const mockSession = {
        id: 'session-1',
        status: 'active',
        expiresAt: new Date(Date.now() + 3600000).toISOString()
      }

      const validation = {
        valid: true,
        session: mockSession
      }

      ;(sessionsService.validateSession as jest.Mock).mockResolvedValue(validation)

      const response = await request(app)
        .post('/api/sessions/session-1/validate')
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        data: {
          valid: true,
          session: mockSession
        },
        message: 'Session is valid'
      })
      expect(sessionsService.validateSession).toHaveBeenCalledWith('session-1')
    })

    it('should return 401 for invalid session', async () => {
      const validation = {
        valid: false,
        reason: 'Session has expired'
      }

      ;(sessionsService.validateSession as jest.Mock).mockResolvedValue(validation)

      const response = await request(app)
        .post('/api/sessions/session-1/validate')
        .expect(401)

      expect(response.body).toEqual({
        success: false,
        error: 'Session invalid',
        message: 'Session has expired',
        data: { valid: false, reason: 'Session has expired' }
      })
    })

    it('should return 401 for session not found during validation', async () => {
      const validation = {
        valid: false,
        reason: 'Session not found'
      }

      ;(sessionsService.validateSession as jest.Mock).mockResolvedValue(validation)

      const response = await request(app)
        .post('/api/sessions/nonexistent/validate')
        .expect(401)

      expect(response.body).toEqual({
        success: false,
        error: 'Session invalid',
        message: 'Session not found',
        data: { valid: false, reason: 'Session not found' }
      })
    })

    it('should handle database errors', async () => {
      ;(sessionsService.validateSession as jest.Mock).mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .post('/api/sessions/session-1/validate')
        .expect(500)

      expect(response.body).toEqual({
        success: false,
        error: 'Internal server error',
        message: 'Failed to validate session'
      })
    })
  })

  describe('POST /api/sessions/:id/extend', () => {
    it('should extend session expiration', async () => {
      const extendedSession = {
        id: 'session-1',
        status: 'active',
        expiresAt: new Date(Date.now() + 7200000).toISOString()
      }

      ;(sessionsService.extendSession as jest.Mock).mockResolvedValue(extendedSession)

      const response = await request(app)
        .post('/api/sessions/session-1/extend')
        .send({ additionalMinutes: 120 })
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        data: extendedSession,
        message: 'Session extended by 120 minutes'
      })
      expect(sessionsService.extendSession).toHaveBeenCalledWith('session-1', 120)
    })

    it('should extend session with default minutes when not specified', async () => {
      const extendedSession = { id: 'session-1', status: 'active' }
      ;(sessionsService.extendSession as jest.Mock).mockResolvedValue(extendedSession)

      await request(app)
        .post('/api/sessions/session-1/extend')
        .send({})
        .expect(200)

      expect(sessionsService.extendSession).toHaveBeenCalledWith('session-1', 60)
    })

    it('should return 400 for invalid additional minutes (too low)', async () => {
      const response = await request(app)
        .post('/api/sessions/session-1/extend')
        .send({ additionalMinutes: 0 })
        .expect(400)

      expect(response.body).toEqual({
        success: false,
        error: 'Validation error',
        message: 'Additional minutes must be between 1 and 1440 (24 hours)'
      })
      expect(sessionsService.extendSession).not.toHaveBeenCalled()
    })

    it('should return 400 for invalid additional minutes (too high)', async () => {
      const response = await request(app)
        .post('/api/sessions/session-1/extend')
        .send({ additionalMinutes: 1500 })
        .expect(400)

      expect(response.body).toEqual({
        success: false,
        error: 'Validation error',
        message: 'Additional minutes must be between 1 and 1440 (24 hours)'
      })
      expect(sessionsService.extendSession).not.toHaveBeenCalled()
    })

    it('should return 404 for non-existent or inactive session', async () => {
      ;(sessionsService.extendSession as jest.Mock).mockResolvedValue(null)

      const response = await request(app)
        .post('/api/sessions/nonexistent/extend')
        .send({ additionalMinutes: 60 })
        .expect(404)

      expect(response.body).toEqual({
        success: false,
        error: 'Not found',
        message: 'Session not found or not active'
      })
    })

    it('should handle database errors', async () => {
      ;(sessionsService.extendSession as jest.Mock).mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .post('/api/sessions/session-1/extend')
        .send({ additionalMinutes: 60 })
        .expect(500)

      expect(response.body).toEqual({
        success: false,
        error: 'Internal server error',
        message: 'Failed to extend session'
      })
    })
  })

  describe('POST /api/sessions/:id/activity', () => {
    it('should update session activity', async () => {
      const updatedSession = {
        id: 'session-1',
        status: 'active',
        lastActivity: new Date().toISOString()
      }

      ;(sessionsService.updateActivity as jest.Mock).mockResolvedValue(updatedSession)

      const response = await request(app)
        .post('/api/sessions/session-1/activity')
        .send({ extendMinutes: 30 })
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        data: updatedSession,
        message: 'Session activity updated'
      })
      expect(sessionsService.updateActivity).toHaveBeenCalledWith('session-1', 30)
    })

    it('should update activity with default extend minutes', async () => {
      const updatedSession = { id: 'session-1', status: 'active' }
      ;(sessionsService.updateActivity as jest.Mock).mockResolvedValue(updatedSession)

      await request(app)
        .post('/api/sessions/session-1/activity')
        .send({})
        .expect(200)

      expect(sessionsService.updateActivity).toHaveBeenCalledWith('session-1', 60)
    })

    it('should return 404 for non-existent session', async () => {
      ;(sessionsService.updateActivity as jest.Mock).mockResolvedValue(null)

      const response = await request(app)
        .post('/api/sessions/nonexistent/activity')
        .send({})
        .expect(404)

      expect(response.body).toEqual({
        success: false,
        error: 'Not found',
        message: 'Session not found'
      })
    })

    it('should handle database errors', async () => {
      ;(sessionsService.updateActivity as jest.Mock).mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .post('/api/sessions/session-1/activity')
        .send({})
        .expect(500)

      expect(response.body).toEqual({
        success: false,
        error: 'Internal server error',
        message: 'Failed to update session activity'
      })
    })
  })

  describe('POST /api/sessions/cleanup', () => {
    it('should cleanup expired sessions', async () => {
      ;(sessionsService.cleanupExpiredSessions as jest.Mock).mockResolvedValue(5)

      const response = await request(app)
        .post('/api/sessions/cleanup')
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        data: { cleanedCount: 5 },
        message: 'Cleaned up 5 expired sessions'
      })
      expect(sessionsService.cleanupExpiredSessions).toHaveBeenCalledTimes(1)
    })

    it('should handle cleanup when no sessions to clean', async () => {
      ;(sessionsService.cleanupExpiredSessions as jest.Mock).mockResolvedValue(0)

      const response = await request(app)
        .post('/api/sessions/cleanup')
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        data: { cleanedCount: 0 },
        message: 'Cleaned up 0 expired sessions'
      })
    })

    it('should handle database errors', async () => {
      ;(sessionsService.cleanupExpiredSessions as jest.Mock).mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .post('/api/sessions/cleanup')
        .expect(500)

      expect(response.body).toEqual({
        success: false,
        error: 'Internal server error',
        message: 'Failed to cleanup expired sessions'
      })
    })
  })

  describe('DELETE /api/sessions/agent/:agentId', () => {
    it('should terminate all sessions for an agent', async () => {
      ;(sessionsService.terminateAgentSessions as jest.Mock).mockResolvedValue(3)

      const response = await request(app)
        .delete('/api/sessions/agent/agent-1')
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        data: { terminatedCount: 3 },
        message: 'Terminated 3 sessions for agent'
      })
      expect(sessionsService.terminateAgentSessions).toHaveBeenCalledWith('agent-1')
    })

    it('should handle when no sessions to terminate', async () => {
      ;(sessionsService.terminateAgentSessions as jest.Mock).mockResolvedValue(0)

      const response = await request(app)
        .delete('/api/sessions/agent/agent-1')
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        data: { terminatedCount: 0 },
        message: 'Terminated 0 sessions for agent'
      })
    })

    it('should handle database errors', async () => {
      ;(sessionsService.terminateAgentSessions as jest.Mock).mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .delete('/api/sessions/agent/agent-1')
        .expect(500)

      expect(response.body).toEqual({
        success: false,
        error: 'Internal server error',
        message: 'Failed to terminate agent sessions'
      })
    })
  })

  describe('DELETE /api/sessions/user/:userId', () => {
    it('should terminate all sessions for a user', async () => {
      ;(sessionsService.terminateUserSessions as jest.Mock).mockResolvedValue(2)

      const response = await request(app)
        .delete('/api/sessions/user/user-1')
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        data: { terminatedCount: 2 },
        message: 'Terminated 2 sessions for user'
      })
      expect(sessionsService.terminateUserSessions).toHaveBeenCalledWith('user-1')
    })

    it('should handle when no sessions to terminate', async () => {
      ;(sessionsService.terminateUserSessions as jest.Mock).mockResolvedValue(0)

      const response = await request(app)
        .delete('/api/sessions/user/user-1')
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        data: { terminatedCount: 0 },
        message: 'Terminated 0 sessions for user'
      })
    })

    it('should handle database errors', async () => {
      ;(sessionsService.terminateUserSessions as jest.Mock).mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .delete('/api/sessions/user/user-1')
        .expect(500)

      expect(response.body).toEqual({
        success: false,
        error: 'Internal server error',
        message: 'Failed to terminate user sessions'
      })
    })
  })
})

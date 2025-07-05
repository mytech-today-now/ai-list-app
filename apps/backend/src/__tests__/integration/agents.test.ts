import request from 'supertest'
import express from 'express'
import { randomUUID } from 'crypto'
import agentsRouter from '../../routes/agents'
import { agentsService } from '../../db/services'

// Mock the database services
jest.mock('../../db/services', () => ({
  agentsService: {
    findAll: jest.fn(),
    findByRole: jest.fn(),
    findActive: jest.fn(),
    findRecentlyActive: jest.fn(),
    findById: jest.fn(),
    getActivitySummary: jest.fn(),
    create: jest.fn(),
    createWithApiKey: jest.fn(),
    updateById: jest.fn(),
    deleteById: jest.fn(),
    updateLastActive: jest.fn(),
    suspend: jest.fn(),
    reactivate: jest.fn(),
    verifyApiKey: jest.fn(),
    getAgentStats: jest.fn()
  }
}))

describe('Agents API Integration Tests', () => {
  let app: express.Application

  beforeEach(() => {
    app = express()
    app.use(express.json())

    // Add correlation ID middleware
    app.use((req: any, res: any, next: any) => {
      const correlationId = req.headers['x-correlation-id'] as string || randomUUID()
      req.correlationId = correlationId
      res.setHeader('X-Correlation-ID', correlationId)
      next()
    })

    app.use('/api/agents', agentsRouter)
    jest.clearAllMocks()
  })

  describe('GET /api/agents', () => {
    it('should get all agents', async () => {
      const mockAgents = [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          name: 'Reader Agent',
          role: 'reader',
          status: 'active',
          permissions: ['read'],
          apiKeyHash: 'hash1'
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          name: 'Executor Agent',
          role: 'executor',
          status: 'active',
          permissions: ['create', 'update'],
          apiKeyHash: 'hash2'
        }
      ]
      
      ;(agentsService.findAll as jest.Mock).mockResolvedValue(mockAgents)

      const response = await request(app)
        .get('/api/agents')
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        data: mockAgents.map(agent => ({ ...agent, apiKeyHash: undefined })),
        message: 'Found 2 agents',
        correlationId: expect.any(String)
      })
      expect(agentsService.findAll).toHaveBeenCalledTimes(1)
    })

    it('should filter agents by role', async () => {
      const mockAgents = [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          name: 'Reader Agent',
          role: 'reader',
          status: 'active',
          permissions: ['read']
        }
      ]
      
      ;(agentsService.findByRole as jest.Mock).mockResolvedValue(mockAgents)

      const response = await request(app)
        .get('/api/agents?role=reader')
        .expect(200)

      expect(response.body.data).toEqual(mockAgents.map(agent => ({ ...agent, apiKeyHash: undefined })))
      expect(agentsService.findByRole).toHaveBeenCalledWith('reader')
    })

    it('should filter active agents', async () => {
      const mockAgents = [
        { 
          id: 'agent-1', 
          name: 'Active Agent', 
          role: 'executor', 
          status: 'active',
          permissions: ['create']
        }
      ]
      
      ;(agentsService.findActive as jest.Mock).mockResolvedValue(mockAgents)

      const response = await request(app)
        .get('/api/agents?active=true')
        .expect(200)

      expect(response.body.data).toEqual(mockAgents.map(agent => ({ ...agent, apiKeyHash: undefined })))
      expect(agentsService.findActive).toHaveBeenCalledTimes(1)
    })

    it('should filter recently active agents with default hours', async () => {
      const mockAgents = [
        { 
          id: 'agent-1', 
          name: 'Recent Agent', 
          role: 'planner', 
          status: 'active',
          permissions: ['plan'],
          lastActive: new Date().toISOString()
        }
      ]
      
      ;(agentsService.findRecentlyActive as jest.Mock).mockResolvedValue(mockAgents)

      const response = await request(app)
        .get('/api/agents?recent=true')
        .expect(200)

      expect(response.body.data).toEqual(mockAgents.map(agent => ({ ...agent, apiKeyHash: undefined })))
      expect(agentsService.findRecentlyActive).toHaveBeenCalledWith(24)
    })

    it('should filter recently active agents with custom hours', async () => {
      const mockAgents = []
      
      ;(agentsService.findRecentlyActive as jest.Mock).mockResolvedValue(mockAgents)

      await request(app)
        .get('/api/agents?recent=12')
        .expect(200)

      expect(agentsService.findRecentlyActive).toHaveBeenCalledWith(12)
    })

    it('should handle database errors', async () => {
      ;(agentsService.findAll as jest.Mock).mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .get('/api/agents')
        .expect(500)

      expect(response.body).toEqual({
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch agents'
      ,
        correlationId: expect.any(String)})
    })
  })

  describe('GET /api/agents/:id', () => {
    it('should get a specific agent by ID', async () => {
      const mockAgent = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Test Agent',
        role: 'executor',
        status: 'active',
        permissions: ['create', 'update'],
        apiKeyHash: 'secret-hash'
      }

      ;(agentsService.findById as jest.Mock).mockResolvedValue(mockAgent)

      const response = await request(app)
        .get('/api/agents/550e8400-e29b-41d4-a716-446655440001')
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        data: { ...mockAgent, apiKeyHash: undefined },
        message: 'Agent found',
        correlationId: expect.any(String)
      })
      expect(agentsService.findById).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440001')
    })

    it('should return 404 for non-existent agent', async () => {
      ;(agentsService.findById as jest.Mock).mockResolvedValue(null)

      const response = await request(app)
        .get('/api/agents/nonexistent')
        .expect(404)

      expect(response.body).toEqual({
        success: false,
        error: 'Not found',
        message: 'Agent not found'
      ,
        correlationId: expect.any(String)})
    })

    it('should include activity summary when requested', async () => {
      const mockAgent = { 
        id: 'agent-1', 
        name: 'Test Agent', 
        role: 'executor',
        status: 'active',
        permissions: ['create']
      }
      
      const mockActivity = {
        totalCommands: 150,
        successRate: 0.95,
        averageExecutionTime: 250,
        lastCommand: '2023-01-01T12:00:00Z'
      }
      
      ;(agentsService.findById as jest.Mock).mockResolvedValue(mockAgent)
      ;(agentsService.getActivitySummary as jest.Mock).mockResolvedValue(mockActivity)

      const response = await request(app)
        .get('/api/agents/agent-1?include=activity')
        .expect(200)

      expect(response.body.data).toEqual({
        ...mockAgent,
        apiKeyHash: undefined,
        activity: mockActivity
      })
      expect(agentsService.getActivitySummary).toHaveBeenCalledWith('agent-1', 30)
    })

    it('should handle database errors', async () => {
      ;(agentsService.findById as jest.Mock).mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .get('/api/agents/agent-1')
        .expect(500)

      expect(response.body).toEqual({
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch agent'
      ,
        correlationId: expect.any(String)})
    })
  })

  describe('POST /api/agents', () => {
    it('should create a new agent', async () => {
      const newAgentData = {
        name: 'New Agent',
        role: 'executor',
        permissions: ['create', 'update'],
        configuration: { model: 'gpt-4', temperature: 0.7 },
        apiKey: 'secret-api-key'
      }
      
      const createdAgent = {
        id: 'agent-1',
        name: 'New Agent',
        role: 'executor',
        status: 'active',
        permissions: JSON.stringify(['create', 'update']),
        configuration: JSON.stringify({ model: 'gpt-4', temperature: 0.7 }),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      ;(agentsService.createWithApiKey as jest.Mock).mockResolvedValue(createdAgent)

      const response = await request(app)
        .post('/api/agents')
        .send(newAgentData)
        .expect(201)

      expect(response.body).toEqual({
        success: true,
        data: createdAgent,
        message: 'Agent created successfully',
        correlationId: expect.any(String)
      })

      expect(agentsService.createWithApiKey).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Agent',
          role: 'executor',
          status: 'active',
          permissions: JSON.stringify(['create', 'update']),
          configuration: JSON.stringify({ model: 'gpt-4', temperature: 0.7 }),
          apiKey: 'secret-api-key'
        })
      )
    })

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/agents')
        .send({ permissions: ['read'] })
        .expect(400)

      expect(response.body).toEqual({
        success: false,
        error: 'Validation error',
        message: 'Name and role are required'
      ,
        correlationId: expect.any(String)})
      expect(agentsService.create).not.toHaveBeenCalled()
    })

    it('should return 400 for invalid role', async () => {
      const response = await request(app)
        .post('/api/agents')
        .send({ name: 'Test Agent', role: 'invalid_role' })
        .expect(400)

      expect(response.body).toEqual({
        success: false,
        error: 'Validation error',
        message: 'Invalid role'
      ,
        correlationId: expect.any(String)})
      expect(agentsService.create).not.toHaveBeenCalled()
    })

    it('should create agent with default values', async () => {
      const minimalAgentData = {
        name: 'Minimal Agent',
        role: 'reader'
      }
      
      const createdAgent = {
        id: 'agent-1',
        ...minimalAgentData,
        status: 'active',
        permissions: JSON.stringify([]),
        configuration: JSON.stringify({})
      }
      
      ;(agentsService.create as jest.Mock).mockResolvedValue(createdAgent)

      await request(app)
        .post('/api/agents')
        .send(minimalAgentData)
        .expect(201)

      expect(agentsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          permissions: JSON.stringify([]),
          configuration: JSON.stringify({})
        })
      )
    })

    it('should handle database errors during creation', async () => {
      ;(agentsService.create as jest.Mock).mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .post('/api/agents')
        .send({ name: 'Test Agent', role: 'executor' })
        .expect(500)

      expect(response.body).toEqual({
        success: false,
        error: 'Internal server error',
        message: 'Failed to create agent'
      ,
        correlationId: expect.any(String)})
    })
  })

  describe('PUT /api/agents/:id', () => {
    it('should update an existing agent', async () => {
      const updateData = {
        name: 'Updated Agent',
        status: 'inactive',
        permissions: ['read', 'status'],
        configuration: { model: 'gpt-3.5-turbo' }
      }
      
      const updatedAgent = { 
        id: 'agent-1', 
        ...updateData,
        permissions: JSON.stringify(updateData.permissions),
        configuration: JSON.stringify(updateData.configuration)
      }
      
      ;(agentsService.updateById as jest.Mock).mockResolvedValue(updatedAgent)

      const response = await request(app)
        .put('/api/agents/agent-1')
        .send(updateData)
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        data: updatedAgent,
        message: 'Agent updated successfully',
        correlationId: expect.any(String)
      })
      
      expect(agentsService.updateById).toHaveBeenCalledWith('agent-1', 
        expect.objectContaining({
          name: 'Updated Agent',
          status: 'inactive',
          permissions: JSON.stringify(['read', 'status']),
          configuration: JSON.stringify({ model: 'gpt-3.5-turbo' })
        })
      )
    })

    it('should return 404 for non-existent agent', async () => {
      ;(agentsService.updateById as jest.Mock).mockResolvedValue(null)

      const response = await request(app)
        .put('/api/agents/nonexistent')
        .send({ name: 'Updated' })
        .expect(404)

      expect(response.body).toEqual({
        success: false,
        error: 'Not found',
        message: 'Agent not found'
      ,
        correlationId: expect.any(String)})
    })
  })

  describe('DELETE /api/agents/:id', () => {
    it('should delete an existing agent', async () => {
      ;(agentsService.deleteById as jest.Mock).mockResolvedValue(true)

      const response = await request(app)
        .delete('/api/agents/agent-1')
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        message: 'Agent deleted successfully',
        correlationId: expect.any(String)
      })
      expect(agentsService.deleteById).toHaveBeenCalledWith('agent-1')
    })

    it('should return 404 for non-existent agent', async () => {
      ;(agentsService.deleteById as jest.Mock).mockResolvedValue(false)

      const response = await request(app)
        .delete('/api/agents/nonexistent')
        .expect(404)

      expect(response.body).toEqual({
        success: false,
        error: 'Not found',
        message: 'Agent not found'
      ,
        correlationId: expect.any(String)})
    })

    it('should handle database errors during deletion', async () => {
      ;(agentsService.deleteById as jest.Mock).mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .delete('/api/agents/agent-1')
        .expect(500)

      expect(response.body).toEqual({
        success: false,
        error: 'Internal server error',
        message: 'Failed to delete agent'
      ,
        correlationId: expect.any(String)})
    })
  })

  describe('POST /api/agents/:id/suspend', () => {
    it('should suspend an agent', async () => {
      const suspendedAgent = {
        id: 'agent-1',
        name: 'Test Agent',
        status: 'suspended',
        suspendedAt: new Date().toISOString(),
        suspensionReason: 'Security violation',
        apiKeyHash: 'secret-hash'
      }

      ;(agentsService.suspend as jest.Mock).mockResolvedValue(suspendedAgent)

      const response = await request(app)
        .post('/api/agents/agent-1/suspend')
        .send({ reason: 'Security violation' })
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        data: { ...suspendedAgent, apiKeyHash: undefined },
        message: 'Agent suspended successfully',
        correlationId: expect.any(String)
      })
      expect(agentsService.suspend).toHaveBeenCalledWith('agent-1', 'Security violation')
    })

    it('should suspend agent without reason', async () => {
      const suspendedAgent = {
        id: 'agent-1',
        status: 'suspended',
        apiKeyHash: 'secret-hash'
      }

      ;(agentsService.suspend as jest.Mock).mockResolvedValue(suspendedAgent)

      await request(app)
        .post('/api/agents/agent-1/suspend')
        .send({})
        .expect(200)

      expect(agentsService.suspend).toHaveBeenCalledWith('agent-1', undefined)
    })

    it('should return 404 for non-existent agent', async () => {
      ;(agentsService.suspend as jest.Mock).mockResolvedValue(null)

      const response = await request(app)
        .post('/api/agents/nonexistent/suspend')
        .send({ reason: 'Test' })
        .expect(404)

      expect(response.body).toEqual({
        success: false,
        error: 'Not found',
        message: 'Agent not found'
      ,
        correlationId: expect.any(String)})
    })

    it('should handle database errors', async () => {
      ;(agentsService.suspend as jest.Mock).mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .post('/api/agents/agent-1/suspend')
        .send({ reason: 'Test' })
        .expect(500)

      expect(response.body).toEqual({
        success: false,
        error: 'Internal server error',
        message: 'Failed to suspend agent'
      ,
        correlationId: expect.any(String)})
    })
  })

  describe('POST /api/agents/:id/reactivate', () => {
    it('should reactivate a suspended agent', async () => {
      const reactivatedAgent = {
        id: 'agent-1',
        name: 'Test Agent',
        status: 'active',
        reactivatedAt: new Date().toISOString(),
        apiKeyHash: 'secret-hash'
      }

      ;(agentsService.reactivate as jest.Mock).mockResolvedValue(reactivatedAgent)

      const response = await request(app)
        .post('/api/agents/agent-1/reactivate')
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        data: { ...reactivatedAgent, apiKeyHash: undefined },
        message: 'Agent reactivated successfully',
        correlationId: expect.any(String)
      })
      expect(agentsService.reactivate).toHaveBeenCalledWith('agent-1')
    })

    it('should return 404 for non-existent agent', async () => {
      ;(agentsService.reactivate as jest.Mock).mockResolvedValue(null)

      const response = await request(app)
        .post('/api/agents/nonexistent/reactivate')
        .expect(404)

      expect(response.body).toEqual({
        success: false,
        error: 'Not found',
        message: 'Agent not found'
      ,
        correlationId: expect.any(String)})
    })

    it('should handle database errors', async () => {
      ;(agentsService.reactivate as jest.Mock).mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .post('/api/agents/agent-1/reactivate')
        .expect(500)

      expect(response.body).toEqual({
        success: false,
        error: 'Internal server error',
        message: 'Failed to reactivate agent'
      ,
        correlationId: expect.any(String)})
    })
  })

  describe('GET /api/agents/:id/activity', () => {
    it('should get agent activity summary with default days', async () => {
      const mockActivity = {
        totalCommands: 150,
        successRate: 0.95,
        averageExecutionTime: 250,
        lastCommand: '2023-01-01T12:00:00Z',
        commandsByDay: [
          { date: '2023-01-01', count: 10 },
          { date: '2023-01-02', count: 15 }
        ]
      }

      ;(agentsService.getActivitySummary as jest.Mock).mockResolvedValue(mockActivity)

      const response = await request(app)
        .get('/api/agents/agent-1/activity')
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        data: mockActivity,
        message: 'Activity summary retrieved',
        correlationId: expect.any(String)
      })
      expect(agentsService.getActivitySummary).toHaveBeenCalledWith('agent-1', 30)
    })

    it('should get agent activity summary with custom days', async () => {
      const mockActivity = { totalCommands: 50 }
      ;(agentsService.getActivitySummary as jest.Mock).mockResolvedValue(mockActivity)

      await request(app)
        .get('/api/agents/agent-1/activity?days=7')
        .expect(200)

      expect(agentsService.getActivitySummary).toHaveBeenCalledWith('agent-1', 7)
    })

    it('should handle database errors', async () => {
      ;(agentsService.getActivitySummary as jest.Mock).mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .get('/api/agents/agent-1/activity')
        .expect(500)

      expect(response.body).toEqual({
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch agent activity'
      ,
        correlationId: expect.any(String)})
    })
  })

  describe('POST /api/agents/:id/permissions', () => {
    it('should update agent permissions', async () => {
      const newPermissions = ['read', 'write', 'execute']
      const updatedAgent = {
        id: 'agent-1',
        name: 'Test Agent',
        permissions: JSON.stringify(newPermissions),
        updatedAt: new Date().toISOString(),
        apiKeyHash: 'secret-hash'
      }

      ;(agentsService.updateById as jest.Mock).mockResolvedValue(updatedAgent)

      const response = await request(app)
        .post('/api/agents/agent-1/permissions')
        .send({ permissions: newPermissions })
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        data: { ...updatedAgent, apiKeyHash: undefined },
        message: 'Agent permissions updated successfully',
        correlationId: expect.any(String)
      })

      expect(agentsService.updateById).toHaveBeenCalledWith('agent-1', {
        permissions: JSON.stringify(newPermissions),
        updatedAt: expect.any(Date)
      })
    })

    it('should return 400 for invalid permissions type', async () => {
      const response = await request(app)
        .post('/api/agents/agent-1/permissions')
        .send({ permissions: 'invalid' })
        .expect(400)

      expect(response.body).toEqual({
        success: false,
        error: 'Validation error',
        message: 'Permissions must be an array'
      ,
        correlationId: expect.any(String)})
      expect(agentsService.updateById).not.toHaveBeenCalled()
    })

    it('should return 400 for missing permissions', async () => {
      const response = await request(app)
        .post('/api/agents/agent-1/permissions')
        .send({})
        .expect(400)

      expect(response.body).toEqual({
        success: false,
        error: 'Validation error',
        message: 'Permissions must be an array'
      ,
        correlationId: expect.any(String)})
    })

    it('should return 404 for non-existent agent', async () => {
      ;(agentsService.updateById as jest.Mock).mockResolvedValue(null)

      const response = await request(app)
        .post('/api/agents/nonexistent/permissions')
        .send({ permissions: ['read'] })
        .expect(404)

      expect(response.body).toEqual({
        success: false,
        error: 'Not found',
        message: 'Agent not found'
      ,
        correlationId: expect.any(String)})
    })

    it('should handle database errors', async () => {
      ;(agentsService.updateById as jest.Mock).mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .post('/api/agents/agent-1/permissions')
        .send({ permissions: ['read'] })
        .expect(500)

      expect(response.body).toEqual({
        success: false,
        error: 'Internal server error',
        message: 'Failed to update agent permissions'
      ,
        correlationId: expect.any(String)})
    })
  })

  describe('POST /api/agents/:id/verify-key', () => {
    it('should verify valid API key', async () => {
      ;(agentsService.verifyApiKey as jest.Mock).mockResolvedValue(true)

      const response = await request(app)
        .post('/api/agents/agent-1/verify-key')
        .send({ apiKey: 'valid-api-key' })
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        data: { valid: true },
        message: 'API key is valid',
        correlationId: expect.any(String)
      })
      expect(agentsService.verifyApiKey).toHaveBeenCalledWith('agent-1', 'valid-api-key')
    })

    it('should verify invalid API key', async () => {
      ;(agentsService.verifyApiKey as jest.Mock).mockResolvedValue(false)

      const response = await request(app)
        .post('/api/agents/agent-1/verify-key')
        .send({ apiKey: 'invalid-api-key' })
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        data: { valid: false },
        message: 'API key is invalid',
        correlationId: expect.any(String)
      })
    })

    it('should return 400 for missing API key', async () => {
      const response = await request(app)
        .post('/api/agents/agent-1/verify-key')
        .send({})
        .expect(400)

      expect(response.body).toEqual({
        success: false,
        error: 'Validation error',
        message: 'API key is required'
      ,
        correlationId: expect.any(String)})
      expect(agentsService.verifyApiKey).not.toHaveBeenCalled()
    })

    it('should handle database errors', async () => {
      ;(agentsService.verifyApiKey as jest.Mock).mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .post('/api/agents/agent-1/verify-key')
        .send({ apiKey: 'test-key' })
        .expect(500)

      expect(response.body).toEqual({
        success: false,
        error: 'Internal server error',
        message: 'Failed to verify API key'
      ,
        correlationId: expect.any(String)})
    })
  })

  describe('GET /api/agents/stats', () => {
    it('should get agent statistics', async () => {
      const mockStats = {
        total: 25,
        active: 20,
        inactive: 3,
        suspended: 2,
        roleDistribution: {
          reader: 10,
          executor: 8,
          planner: 5,
          admin: 2
        },
        averageActivityRate: 0.85,
        totalCommands: 15000,
        successRate: 0.92
      }

      ;(agentsService.getAgentStats as jest.Mock).mockResolvedValue(mockStats)

      const response = await request(app)
        .get('/api/agents/stats')
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        data: mockStats,
        message: 'Agent statistics retrieved',
        correlationId: expect.any(String)
      })
      expect(agentsService.getAgentStats).toHaveBeenCalledTimes(1)
    })

    it('should handle database errors', async () => {
      ;(agentsService.getAgentStats as jest.Mock).mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .get('/api/agents/stats')
        .expect(500)

      expect(response.body).toEqual({
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch agent statistics'
      ,
        correlationId: expect.any(String)})
    })
  })
})

import request from 'supertest'
import express from 'express'
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
    updateById: jest.fn(),
    deleteById: jest.fn(),
    updateLastActive: jest.fn()
  }
}))

describe('Agents API Integration Tests', () => {
  let app: express.Application

  beforeEach(() => {
    app = express()
    app.use(express.json())
    app.use('/api/agents', agentsRouter)
    jest.clearAllMocks()
  })

  describe('GET /api/agents', () => {
    it('should get all agents', async () => {
      const mockAgents = [
        { 
          id: 'agent-1', 
          name: 'Reader Agent', 
          role: 'reader', 
          status: 'active',
          permissions: ['read'],
          apiKeyHash: 'hash1'
        },
        { 
          id: 'agent-2', 
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
        message: 'Found 2 agents'
      })
      expect(agentsService.findAll).toHaveBeenCalledTimes(1)
    })

    it('should filter agents by role', async () => {
      const mockAgents = [
        { 
          id: 'agent-1', 
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
      })
    })
  })

  describe('GET /api/agents/:id', () => {
    it('should get a specific agent by ID', async () => {
      const mockAgent = { 
        id: 'agent-1', 
        name: 'Test Agent', 
        role: 'executor',
        status: 'active',
        permissions: ['create', 'update'],
        apiKeyHash: 'secret-hash'
      }
      
      ;(agentsService.findById as jest.Mock).mockResolvedValue(mockAgent)

      const response = await request(app)
        .get('/api/agents/agent-1')
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        data: { ...mockAgent, apiKeyHash: undefined },
        message: 'Agent found'
      })
      expect(agentsService.findById).toHaveBeenCalledWith('agent-1')
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
      })
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
      })
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
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      ;(agentsService.create as jest.Mock).mockResolvedValue(createdAgent)

      const response = await request(app)
        .post('/api/agents')
        .send(newAgentData)
        .expect(201)

      expect(response.body).toEqual({
        success: true,
        data: createdAgent,
        message: 'Agent created successfully'
      })
      
      expect(agentsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Agent',
          role: 'executor',
          status: 'active',
          permissions: JSON.stringify(['create', 'update']),
          configuration: JSON.stringify({ model: 'gpt-4', temperature: 0.7 })
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
      })
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
      })
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
      })
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
        message: 'Agent updated successfully'
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
      })
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
        message: 'Agent deleted successfully'
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
      })
    })
  })
})

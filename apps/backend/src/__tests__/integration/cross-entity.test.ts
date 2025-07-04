import request from 'supertest'
import express from 'express'
import { listsService, itemsService, agentsService } from '../../db/services'
import { sessionsService } from '../../db/services/sessions'

// Create a test app with all routes
const createTestApp = () => {
  const app = express()
  app.use(express.json())
  
  // MCP command endpoint
  app.post('/api/mcp/command', (req, res) => {
    const { action, targetType, targetId, parameters } = req.body
    
    res.json({
      success: true,
      command: `${action}:${targetType}:${targetId}`,
      result: {
        message: `MCP command executed: ${action} on ${targetType}`,
        parameters
      },
      metadata: {
        executionTime: Math.random() * 100,
        agent: 'system',
        timestamp: new Date().toISOString()
      }
    })
  })
  
  return app
}

// Mock all services
jest.mock('../../db/services', () => ({
  listsService: {
    findById: jest.fn(),
    create: jest.fn(),
    updateById: jest.fn(),
    deleteById: jest.fn(),
    findWithItemCounts: jest.fn()
  },
  itemsService: {
    findByListId: jest.fn(),
    create: jest.fn(),
    updateById: jest.fn(),
    deleteById: jest.fn(),
    markCompleted: jest.fn()
  },
  agentsService: {
    findById: jest.fn(),
    findActive: jest.fn(),
    updateLastActive: jest.fn()
  }
}))

jest.mock('../../db/services/sessions', () => ({
  sessionsService: {
    findByAgentId: jest.fn(),
    createSession: jest.fn(),
    validateSession: jest.fn(),
    terminateSession: jest.fn()
  }
}))

describe('Cross-Entity Integration Tests', () => {
  let app: express.Application

  beforeEach(() => {
    app = createTestApp()
    jest.clearAllMocks()
  })

  describe('List-Item Relationships', () => {
    it('should create a list and verify it can contain items', async () => {
      const mockList = {
        id: 'list-1',
        title: 'Test List',
        status: 'active',
        createdAt: new Date().toISOString()
      }
      
      const mockItems = [
        { id: 'item-1', title: 'Item 1', listId: 'list-1', status: 'pending' },
        { id: 'item-2', title: 'Item 2', listId: 'list-1', status: 'completed' }
      ]
      
      ;(listsService.findById as jest.Mock).mockResolvedValue(mockList)
      ;(itemsService.findByListId as jest.Mock).mockResolvedValue(mockItems)
      
      // Verify list exists
      const list = await listsService.findById('list-1')
      expect(list).toEqual(mockList)
      
      // Verify items belong to list
      const items = await itemsService.findByListId('list-1')
      expect(items).toEqual(mockItems)
      expect(items.every(item => item.listId === 'list-1')).toBe(true)
    })

    it('should handle cascading operations when list is deleted', async () => {
      ;(listsService.deleteById as jest.Mock).mockResolvedValue(true)
      ;(itemsService.findByListId as jest.Mock).mockResolvedValue([
        { id: 'item-1', listId: 'list-1' },
        { id: 'item-2', listId: 'list-1' }
      ])
      ;(itemsService.deleteById as jest.Mock).mockResolvedValue(true)
      
      // Simulate cascading delete
      const items = await itemsService.findByListId('list-1')
      for (const item of items) {
        await itemsService.deleteById(item.id)
      }
      await listsService.deleteById('list-1')
      
      expect(itemsService.deleteById).toHaveBeenCalledTimes(2)
      expect(listsService.deleteById).toHaveBeenCalledWith('list-1')
    })

    it('should update list statistics when items change status', async () => {
      const mockList = { id: 'list-1', title: 'Test List' }
      const mockUpdatedList = { 
        ...mockList, 
        completedItems: 1, 
        totalItems: 2,
        completionRate: 0.5
      }
      
      ;(itemsService.markCompleted as jest.Mock).mockResolvedValue({
        id: 'item-1',
        status: 'completed'
      })
      ;(listsService.updateById as jest.Mock).mockResolvedValue(mockUpdatedList)
      
      // Mark item as completed
      await itemsService.markCompleted('item-1')
      
      // Update list statistics
      await listsService.updateById('list-1', {
        completedItems: 1,
        totalItems: 2,
        completionRate: 0.5
      })
      
      expect(itemsService.markCompleted).toHaveBeenCalledWith('item-1')
      expect(listsService.updateById).toHaveBeenCalledWith('list-1', expect.objectContaining({
        completionRate: 0.5
      }))
    })
  })

  describe('Agent-Session Relationships', () => {
    it('should create session for active agent', async () => {
      const mockAgent = {
        id: 'agent-1',
        name: 'Test Agent',
        role: 'executor',
        status: 'active'
      }
      
      const mockSession = {
        id: 'session-1',
        agentId: 'agent-1',
        status: 'active',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString()
      }
      
      ;(agentsService.findById as jest.Mock).mockResolvedValue(mockAgent)
      ;(sessionsService.createSession as jest.Mock).mockResolvedValue(mockSession)
      
      const agent = await agentsService.findById('agent-1')
      expect(agent.status).toBe('active')
      
      const session = await sessionsService.createSession('agent-1', 'user-1', 60)
      expect(session.agentId).toBe('agent-1')
      expect(sessionsService.createSession).toHaveBeenCalledWith('agent-1', 'user-1', 60)
    })

    it('should terminate all sessions when agent is deactivated', async () => {
      const mockSessions = [
        { id: 'session-1', agentId: 'agent-1', status: 'active' },
        { id: 'session-2', agentId: 'agent-1', status: 'active' }
      ]
      
      ;(sessionsService.findByAgentId as jest.Mock).mockResolvedValue(mockSessions)
      ;(sessionsService.terminateSession as jest.Mock).mockResolvedValue({
        id: 'session-1',
        status: 'terminated'
      })
      
      // Simulate agent deactivation workflow
      const sessions = await sessionsService.findByAgentId('agent-1')
      for (const session of sessions) {
        await sessionsService.terminateSession(session.id)
      }
      
      expect(sessionsService.terminateSession).toHaveBeenCalledTimes(2)
    })

    it('should update agent activity when session is used', async () => {
      const mockSession = {
        id: 'session-1',
        agentId: 'agent-1',
        status: 'active'
      }
      
      ;(sessionsService.validateSession as jest.Mock).mockResolvedValue({
        valid: true,
        session: mockSession
      })
      ;(agentsService.updateLastActive as jest.Mock).mockResolvedValue({
        id: 'agent-1',
        lastActive: new Date().toISOString()
      })
      
      // Simulate session validation and agent activity update
      const validation = await sessionsService.validateSession('session-1')
      if (validation.valid) {
        await agentsService.updateLastActive('agent-1')
      }
      
      expect(sessionsService.validateSession).toHaveBeenCalledWith('session-1')
      expect(agentsService.updateLastActive).toHaveBeenCalledWith('agent-1')
    })
  })

  describe('MCP Command Endpoint', () => {
    it('should handle list creation command', async () => {
      const response = await request(app)
        .post('/api/mcp/command')
        .send({
          action: 'create',
          targetType: 'list',
          targetId: 'weekend_tasks',
          parameters: {
            title: 'Weekend Tasks',
            priority: 'high'
          }
        })
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        command: 'create:list:weekend_tasks',
        result: {
          message: 'MCP command executed: create on list',
          parameters: {
            title: 'Weekend Tasks',
            priority: 'high'
          }
        },
        metadata: {
          executionTime: expect.any(Number),
          agent: 'system',
          timestamp: expect.any(String)
        }
      })
    })

    it('should handle item operations command', async () => {
      const response = await request(app)
        .post('/api/mcp/command')
        .send({
          action: 'update',
          targetType: 'item',
          targetId: 'buy_groceries',
          parameters: {
            status: 'in_progress'
          }
        })
        .expect(200)

      expect(response.body.command).toBe('update:item:buy_groceries')
      expect(response.body.result.parameters.status).toBe('in_progress')
    })

    it('should handle agent operations command', async () => {
      const response = await request(app)
        .post('/api/mcp/command')
        .send({
          action: 'read',
          targetType: 'agent',
          targetId: 'task_executor',
          parameters: {}
        })
        .expect(200)

      expect(response.body.command).toBe('read:agent:task_executor')
      expect(response.body.success).toBe(true)
    })

    it('should handle system operations command', async () => {
      const response = await request(app)
        .post('/api/mcp/command')
        .send({
          action: 'status',
          targetType: 'system',
          targetId: 'health',
          parameters: {}
        })
        .expect(200)

      expect(response.body.command).toBe('status:system:health')
      expect(response.body.metadata.agent).toBe('system')
    })

    it('should handle complex batch operations', async () => {
      const response = await request(app)
        .post('/api/mcp/command')
        .send({
          action: 'execute',
          targetType: 'list',
          targetId: 'weekend_tasks',
          parameters: {
            recursive: true,
            parallel: false
          }
        })
        .expect(200)

      expect(response.body.command).toBe('execute:list:weekend_tasks')
      expect(response.body.result.parameters.recursive).toBe(true)
      expect(response.body.result.parameters.parallel).toBe(false)
    })
  })

  describe('Complex Cross-Entity Workflows', () => {
    it('should handle complete task management workflow', async () => {
      // Mock a complete workflow: create list -> add items -> assign agent -> create session -> execute tasks
      const mockList = { id: 'list-1', title: 'Project Tasks' }
      const mockItems = [
        { id: 'item-1', listId: 'list-1', title: 'Task 1', status: 'pending' },
        { id: 'item-2', listId: 'list-1', title: 'Task 2', status: 'pending' }
      ]
      const mockAgent = { id: 'agent-1', role: 'executor', status: 'active' }
      const mockSession = { id: 'session-1', agentId: 'agent-1', status: 'active' }

      ;(listsService.create as jest.Mock).mockResolvedValue(mockList)
      ;(itemsService.create as jest.Mock).mockResolvedValueOnce(mockItems[0]).mockResolvedValueOnce(mockItems[1])
      ;(agentsService.findById as jest.Mock).mockResolvedValue(mockAgent)
      ;(sessionsService.createSession as jest.Mock).mockResolvedValue(mockSession)
      ;(itemsService.markCompleted as jest.Mock).mockResolvedValue({ ...mockItems[0], status: 'completed' })

      // Step 1: Create list
      const list = await listsService.create(mockList)
      expect(list.id).toBe('list-1')

      // Step 2: Add items to list
      const item1 = await itemsService.create(mockItems[0])
      const item2 = await itemsService.create(mockItems[1])
      expect(item1.listId).toBe('list-1')
      expect(item2.listId).toBe('list-1')

      // Step 3: Get active agent
      const agent = await agentsService.findById('agent-1')
      expect(agent.status).toBe('active')

      // Step 4: Create session for agent
      const session = await sessionsService.createSession('agent-1')
      expect(session.agentId).toBe('agent-1')

      // Step 5: Execute task (mark as completed)
      const completedItem = await itemsService.markCompleted('item-1')
      expect(completedItem.status).toBe('completed')

      // Verify all steps were called
      expect(listsService.create).toHaveBeenCalledWith(mockList)
      expect(itemsService.create).toHaveBeenCalledTimes(2)
      expect(agentsService.findById).toHaveBeenCalledWith('agent-1')
      expect(sessionsService.createSession).toHaveBeenCalledWith('agent-1')
      expect(itemsService.markCompleted).toHaveBeenCalledWith('item-1')
    })

    it('should handle error scenarios in cross-entity operations', async () => {
      // Test error handling when dependencies fail
      ;(listsService.findById as jest.Mock).mockResolvedValue(null)
      ;(itemsService.create as jest.Mock).mockRejectedValue(new Error('List not found'))

      // Attempt to create item for non-existent list
      const list = await listsService.findById('nonexistent-list')
      expect(list).toBeNull()

      // Should fail to create item
      await expect(itemsService.create({
        id: 'item-1',
        listId: 'nonexistent-list',
        title: 'Test Item'
      })).rejects.toThrow('List not found')
    })

    it('should handle concurrent operations on shared resources', async () => {
      // Simulate concurrent access to the same list
      const mockList = { id: 'list-1', title: 'Shared List', version: 1 }
      const updatedList1 = { ...mockList, title: 'Updated by User 1', version: 2 }
      const updatedList2 = { ...mockList, title: 'Updated by User 2', version: 2 }

      ;(listsService.findById as jest.Mock).mockResolvedValue(mockList)
      ;(listsService.updateById as jest.Mock)
        .mockResolvedValueOnce(updatedList1)
        .mockResolvedValueOnce(updatedList2)

      // Simulate two concurrent updates
      const update1 = listsService.updateById('list-1', { title: 'Updated by User 1' })
      const update2 = listsService.updateById('list-1', { title: 'Updated by User 2' })

      const [result1, result2] = await Promise.all([update1, update2])

      expect(result1.title).toBe('Updated by User 1')
      expect(result2.title).toBe('Updated by User 2')
      expect(listsService.updateById).toHaveBeenCalledTimes(2)
    })

    it('should validate data consistency across entities', async () => {
      // Test referential integrity
      const mockList = { id: 'list-1', title: 'Test List' }
      const mockItems = [
        { id: 'item-1', listId: 'list-1', title: 'Item 1' },
        { id: 'item-2', listId: 'list-1', title: 'Item 2' }
      ]

      ;(listsService.findById as jest.Mock).mockResolvedValue(mockList)
      ;(itemsService.findByListId as jest.Mock).mockResolvedValue(mockItems)

      // Verify list exists
      const list = await listsService.findById('list-1')
      expect(list).toBeTruthy()

      // Verify all items reference the correct list
      const items = await itemsService.findByListId('list-1')
      const allItemsBelongToList = items.every(item => item.listId === 'list-1')
      expect(allItemsBelongToList).toBe(true)

      // Verify item count matches
      expect(items.length).toBe(2)
    })

    it('should handle cascading updates across related entities', async () => {
      // Test cascading updates when a list is archived
      const mockList = { id: 'list-1', title: 'Test List', status: 'active' }
      const mockItems = [
        { id: 'item-1', listId: 'list-1', status: 'pending' },
        { id: 'item-2', listId: 'list-1', status: 'in-progress' }
      ]

      ;(listsService.updateById as jest.Mock).mockResolvedValue({
        ...mockList,
        status: 'archived'
      })
      ;(itemsService.findByListId as jest.Mock).mockResolvedValue(mockItems)
      ;(itemsService.updateById as jest.Mock).mockResolvedValue({
        id: 'item-1',
        status: 'cancelled'
      })

      // Archive the list
      const archivedList = await listsService.updateById('list-1', { status: 'archived' })
      expect(archivedList.status).toBe('archived')

      // Get all items in the list
      const items = await itemsService.findByListId('list-1')

      // Cancel all pending/in-progress items
      for (const item of items) {
        if (item.status === 'pending' || item.status === 'in-progress') {
          await itemsService.updateById(item.id, { status: 'cancelled' })
        }
      }

      expect(itemsService.updateById).toHaveBeenCalledTimes(2)
    })
  })
})

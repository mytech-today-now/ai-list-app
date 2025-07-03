import {
  MCPCommand,
  MCPResponse,
  MCPError,
  MCPAction,
  MCPTargetType,
  Priority,
  ListStatus,
  ItemStatus,
  AgentRole,
  AgentStatus,
  TodoList,
  TodoItem,
  Agent,
  ActionLog,
  Session,
  CreateListRequest,
  CreateItemRequest,
  UpdateListRequest,
  UpdateItemRequest,
  UIState,
  StorageConfig,
  StorageMetadata,
  MCPValidationError,
  MCPExecutionError,
  MCPPermissionError
} from '../index'

describe('Shared Types', () => {
  describe('MCPCommand', () => {
    it('should create valid MCPCommand', () => {
      const command: MCPCommand = {
        action: 'create',
        targetType: 'list',
        targetId: 'test-list',
        parameters: { title: 'Test List' },
        timestamp: new Date().toISOString(),
        sessionId: 'session-1',
        agentId: 'agent-1'
      }

      expect(command.action).toBe('create')
      expect(command.targetType).toBe('list')
      expect(command.targetId).toBe('test-list')
      expect(command.parameters).toEqual({ title: 'Test List' })
    })

    it('should create minimal MCPCommand', () => {
      const command: MCPCommand = {
        action: 'read',
        targetType: 'item',
        targetId: 'item-1'
      }

      expect(command.action).toBe('read')
      expect(command.parameters).toBeUndefined()
      expect(command.timestamp).toBeUndefined()
    })
  })

  describe('MCPResponse', () => {
    it('should create successful response', () => {
      const response: MCPResponse = {
        success: true,
        command: 'create:list:test{}',
        result: { id: 'list-1', title: 'Test List' },
        metadata: {
          executionTime: 150,
          agent: 'Test Agent',
          timestamp: new Date().toISOString()
        }
      }

      expect(response.success).toBe(true)
      expect(response.error).toBeUndefined()
      expect(response.result).toBeDefined()
    })

    it('should create error response', () => {
      const response: MCPResponse = {
        success: false,
        command: 'create:list:test{}',
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid parameters',
          details: 'title is required'
        },
        metadata: {
          executionTime: 50,
          timestamp: new Date().toISOString()
        }
      }

      expect(response.success).toBe(false)
      expect(response.result).toBeUndefined()
      expect(response.error).toBeDefined()
    })
  })

  describe('Type Unions', () => {
    it('should validate MCPAction types', () => {
      const validActions: MCPAction[] = [
        'create', 'read', 'update', 'delete',
        'execute', 'reorder', 'rename', 'status', 'mark_done',
        'rollback', 'plan', 'train', 'deploy', 'test',
        'monitor', 'optimize', 'debug', 'log'
      ]

      validActions.forEach(action => {
        const command: MCPCommand = {
          action,
          targetType: 'list',
          targetId: 'test'
        }
        expect(command.action).toBe(action)
      })
    })

    it('should validate MCPTargetType types', () => {
      const validTargetTypes: MCPTargetType[] = [
        'list', 'item', 'agent', 'system',
        'batch', 'workflow', 'session'
      ]

      validTargetTypes.forEach(targetType => {
        const command: MCPCommand = {
          action: 'read',
          targetType,
          targetId: 'test'
        }
        expect(command.targetType).toBe(targetType)
      })
    })

    it('should validate Priority types', () => {
      const validPriorities: Priority[] = ['low', 'medium', 'high', 'urgent']

      validPriorities.forEach(priority => {
        const list: TodoList = {
          id: 'list-1',
          title: 'Test List',
          position: 0,
          priority,
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        expect(list.priority).toBe(priority)
      })
    })

    it('should validate Status types', () => {
      const validListStatuses: ListStatus[] = ['active', 'completed', 'archived', 'deleted']
      const validItemStatuses: ItemStatus[] = ['pending', 'in_progress', 'completed', 'cancelled', 'blocked']
      const validAgentStatuses: AgentStatus[] = ['active', 'inactive', 'suspended']

      validListStatuses.forEach(status => {
        const list: TodoList = {
          id: 'list-1',
          title: 'Test',
          position: 0,
          priority: 'medium',
          status,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        expect(list.status).toBe(status)
      })

      validItemStatuses.forEach(status => {
        const item: TodoItem = {
          id: 'item-1',
          listId: 'list-1',
          title: 'Test Item',
          position: 0,
          priority: 'medium',
          status,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        expect(item.status).toBe(status)
      })

      validAgentStatuses.forEach(status => {
        const agent: Agent = {
          id: 'agent-1',
          name: 'Test Agent',
          role: 'executor',
          status,
          permissions: ['read'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        expect(agent.status).toBe(status)
      })
    })
  })

  describe('Entity Types', () => {
    it('should create valid TodoList', () => {
      const list: TodoList = {
        id: 'list-1',
        title: 'My Todo List',
        description: 'A test list',
        parentListId: 'parent-list',
        position: 1,
        priority: 'high',
        status: 'active',
        createdBy: 'user-1',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
        completedAt: undefined,
        metadata: { source: 'api' }
      }

      expect(list.id).toBe('list-1')
      expect(list.title).toBe('My Todo List')
      expect(list.priority).toBe('high')
      expect(list.status).toBe('active')
    })

    it('should create valid TodoItem', () => {
      const item: TodoItem = {
        id: 'item-1',
        listId: 'list-1',
        title: 'Complete task',
        description: 'A test item',
        position: 0,
        priority: 'medium',
        status: 'pending',
        dueDate: '2023-12-31T23:59:59Z',
        estimatedDuration: 60,
        actualDuration: undefined,
        tags: ['work', 'urgent'],
        dependencies: ['item-0'],
        createdBy: 'user-1',
        assignedTo: 'user-2',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
        completedAt: undefined,
        metadata: { complexity: 'medium' }
      }

      expect(item.id).toBe('item-1')
      expect(item.listId).toBe('list-1')
      expect(item.tags).toEqual(['work', 'urgent'])
      expect(item.dependencies).toEqual(['item-0'])
    })

    it('should create valid Agent', () => {
      const agent: Agent = {
        id: 'agent-1',
        name: 'AI Assistant',
        role: 'executor',
        status: 'active',
        permissions: ['create', 'read', 'update'],
        configuration: { model: 'gpt-4', temperature: 0.7 },
        apiKeyHash: 'hash123',
        lastActive: '2023-01-01T12:00:00Z',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
        metadata: { version: '1.0' }
      }

      expect(agent.role).toBe('executor')
      expect(agent.permissions).toContain('create')
      expect(agent.permissions).toContain('read')
      expect(agent.permissions).toContain('update')
    })

    it('should create valid ActionLog', () => {
      const log: ActionLog = {
        id: 1,
        command: 'create:list:test{}',
        action: 'create',
        targetType: 'list',
        targetId: 'test',
        agentId: 'agent-1',
        parameters: { title: 'Test List' },
        result: { id: 'list-1' },
        success: true,
        executionTime: 150,
        timestamp: '2023-01-01T00:00:00Z',
        sessionId: 'session-1'
      }

      expect(log.success).toBe(true)
      expect(log.action).toBe('create')
      expect(log.targetType).toBe('list')
      expect(log.errorMessage).toBeUndefined()
    })

    it('should create valid Session', () => {
      const session: Session = {
        id: 'session-1',
        agentId: 'agent-1',
        userId: 'user-1',
        status: 'active',
        createdAt: '2023-01-01T00:00:00Z',
        expiresAt: '2023-01-01T01:00:00Z',
        lastActivity: '2023-01-01T00:30:00Z',
        metadata: { ip: '192.168.1.1' }
      }

      expect(session.status).toBe('active')
      expect(session.agentId).toBe('agent-1')
      expect(session.userId).toBe('user-1')
    })
  })

  describe('Request/Response Types', () => {
    it('should create valid CreateListRequest', () => {
      const request: CreateListRequest = {
        title: 'New List',
        description: 'A new todo list',
        parentListId: 'parent-1',
        priority: 'high'
      }

      expect(request.title).toBe('New List')
      expect(request.priority).toBe('high')
    })

    it('should create minimal CreateListRequest', () => {
      const request: CreateListRequest = {
        title: 'Minimal List'
      }

      expect(request.title).toBe('Minimal List')
      expect(request.description).toBeUndefined()
    })

    it('should create valid CreateItemRequest', () => {
      const request: CreateItemRequest = {
        listId: 'list-1',
        title: 'New Item',
        description: 'A new todo item',
        priority: 'medium',
        dueDate: '2023-12-31T23:59:59Z',
        estimatedDuration: 30,
        tags: ['work'],
        assignedTo: 'user-1'
      }

      expect(request.listId).toBe('list-1')
      expect(request.title).toBe('New Item')
      expect(request.tags).toEqual(['work'])
    })
  })

  describe('UI State Types', () => {
    it('should create valid UIState', () => {
      const uiState: UIState = {
        selectedListId: 'list-1',
        selectedItemId: 'item-1',
        viewMode: 'kanban',
        sidebarOpen: true,
        darkMode: false,
        filters: {
          status: ['pending', 'in_progress'],
          priority: ['high', 'urgent'],
          assignedTo: ['user-1'],
          tags: ['work', 'personal']
        }
      }

      expect(uiState.viewMode).toBe('kanban')
      expect(uiState.sidebarOpen).toBe(true)
      expect(uiState.filters.status).toEqual(['pending', 'in_progress'])
    })
  })

  describe('Storage Types', () => {
    it('should create valid StorageConfig', () => {
      const config: StorageConfig = {
        encrypted: true,
        version: 2,
        lastMigration: '2023-01-01T00:00:00Z'
      }

      expect(config.encrypted).toBe(true)
      expect(config.version).toBe(2)
    })

    it('should create valid StorageMetadata', () => {
      const metadata: StorageMetadata = {
        version: 1,
        createdAt: '2023-01-01T00:00:00Z',
        lastAccessed: '2023-01-01T12:00:00Z',
        size: 1024
      }

      expect(metadata.version).toBe(1)
      expect(metadata.size).toBe(1024)
    })
  })

  describe('Error Classes', () => {
    it('should create MCPValidationError', () => {
      const error = new MCPValidationError('Validation failed', 'title')

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(MCPValidationError)
      expect(error.name).toBe('MCPValidationError')
      expect(error.message).toBe('Validation failed')
      expect(error.field).toBe('title')
    })

    it('should create MCPExecutionError', () => {
      const error = new MCPExecutionError('Execution failed', 'create:list:test')

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(MCPExecutionError)
      expect(error.name).toBe('MCPExecutionError')
      expect(error.message).toBe('Execution failed')
      expect(error.command).toBe('create:list:test')
    })

    it('should create MCPPermissionError', () => {
      const error = new MCPPermissionError('Permission denied', 'delete')

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(MCPPermissionError)
      expect(error.name).toBe('MCPPermissionError')
      expect(error.message).toBe('Permission denied')
      expect(error.requiredPermission).toBe('delete')
    })

    it('should create errors without optional parameters', () => {
      const validationError = new MCPValidationError('Validation failed')
      const executionError = new MCPExecutionError('Execution failed')
      const permissionError = new MCPPermissionError('Permission denied')

      expect(validationError.field).toBeUndefined()
      expect(executionError.command).toBeUndefined()
      expect(permissionError.requiredPermission).toBeUndefined()
    })
  })
})

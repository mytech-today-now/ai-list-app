import { MCPEngine, MCPEngineConfig } from '../../engine/MCPEngine'
import {
  MCPCommand,
  Agent,
  MCPValidationError,
  MCPExecutionError,
  MCPPermissionError
} from '@ai-todo/shared-types'

// Mock all dependencies
jest.mock('../../parser/CommandParser')
jest.mock('../../validator/CommandValidator')
jest.mock('../../executor/CommandExecutor')
jest.mock('../../logger/ActionLogger')
jest.mock('../../modules/SessionManager')
jest.mock('../../modules/MemoryCache')
jest.mock('../../modules/ToolRegistry')
jest.mock('../../modules/StateSyncEngine')

describe('MCPEngine', () => {
  let engine: MCPEngine
  let mockAgent: Agent
  let mockCommand: MCPCommand

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockAgent = {
      id: 'agent-1',
      name: 'Test Agent',
      role: 'executor',
      permissions: ['create', 'read', 'update'],
      status: 'active',
      configuration: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    mockCommand = {
      action: 'create',
      targetType: 'list',
      targetId: 'test-list',
      parameters: { title: 'Test List' },
      sessionId: 'session-1',
      agentId: 'agent-1',
      timestamp: new Date().toISOString()
    }
  })

  describe('Constructor', () => {
    it('should initialize with default config', () => {
      engine = new MCPEngine()
      expect(engine).toBeInstanceOf(MCPEngine)
    })

    it('should initialize with custom config', () => {
      const config: MCPEngineConfig = {
        enableLogging: false,
        enableValidation: false,
        enablePermissions: false,
        maxExecutionTime: 5000,
        cacheSize: 500
      }
      
      engine = new MCPEngine(config)
      expect(engine).toBeInstanceOf(MCPEngine)
    })

    it('should merge custom config with defaults', () => {
      const config: MCPEngineConfig = {
        enableLogging: false,
        maxExecutionTime: 5000
      }
      
      engine = new MCPEngine(config)
      const status = engine.getStatus()
      expect(status.config.enableLogging).toBe(false)
      expect(status.config.maxExecutionTime).toBe(5000)
      expect(status.config.enableValidation).toBe(true) // default
    })
  })

  describe('executeCommand', () => {
    beforeEach(() => {
      engine = new MCPEngine()
      
      // Mock parser
      const mockParser = require('../../parser/CommandParser').CommandParser
      mockParser.prototype.parse = jest.fn().mockReturnValue(mockCommand)
      
      // Mock validator
      const mockValidator = require('../../validator/CommandValidator').CommandValidator
      mockValidator.prototype.validate = jest.fn().mockResolvedValue(undefined)
      
      // Mock executor
      const mockExecutor = require('../../executor/CommandExecutor').CommandExecutor
      mockExecutor.prototype.execute = jest.fn().mockResolvedValue({ id: 'result-1' })
      mockExecutor.prototype.setModules = jest.fn()
      
      // Mock logger
      const mockLogger = require('../../logger/ActionLogger').ActionLogger
      mockLogger.prototype.logAction = jest.fn().mockResolvedValue(undefined)
      mockLogger.prototype.flush = jest.fn().mockResolvedValue(undefined)
    })

    it('should execute command successfully', async () => {
      const result = await engine.executeCommand('create:list:test{}', mockAgent, 'session-1')
      
      expect(result.success).toBe(true)
      expect(result.command).toBe('create:list:test{}')
      expect(result.result).toEqual({ id: 'result-1' })
      expect(result.metadata.agent).toBe('Test Agent')
      expect(result.metadata.executionTime).toBeGreaterThan(0)
    })

    it('should handle parsing errors', async () => {
      const mockParser = require('../../parser/CommandParser').CommandParser
      mockParser.prototype.parse = jest.fn().mockImplementation(() => {
        throw new Error('Invalid command syntax')
      })
      
      const result = await engine.executeCommand('invalid:command', mockAgent)
      
      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('UNKNOWN_ERROR')
      expect(result.error?.message).toBe('Invalid command syntax')
    })

    it('should handle validation errors', async () => {
      const mockValidator = require('../../validator/CommandValidator').CommandValidator
      mockValidator.prototype.validate = jest.fn().mockImplementation(() => {
        throw new MCPValidationError('Invalid parameters', 'parameters')
      })
      
      const result = await engine.executeCommand('create:list:test{}', mockAgent)
      
      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('VALIDATION_ERROR')
      expect(result.error?.message).toBe('Invalid parameters')
      expect(result.error?.details).toBe('parameters')
    })

    it('should handle permission errors', async () => {
      const restrictedAgent = {
        ...mockAgent,
        permissions: ['read'] // Missing 'create' permission
      }
      
      const result = await engine.executeCommand('create:list:test{}', restrictedAgent)
      
      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('PERMISSION_ERROR')
      expect(result.error?.message).toContain('does not have permission')
    })

    it('should handle execution errors', async () => {
      const mockExecutor = require('../../executor/CommandExecutor').CommandExecutor
      mockExecutor.prototype.execute = jest.fn().mockImplementation(() => {
        throw new MCPExecutionError('Execution failed', 'create:list:test')
      })
      
      const result = await engine.executeCommand('create:list:test{}', mockAgent)
      
      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('EXECUTION_ERROR')
      expect(result.error?.message).toBe('Execution failed')
    })

    it('should handle execution timeout', async () => {
      const shortTimeoutEngine = new MCPEngine({ maxExecutionTime: 100 })
      
      const mockExecutor = require('../../executor/CommandExecutor').CommandExecutor
      mockExecutor.prototype.execute = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 200))
      )
      
      const result = await shortTimeoutEngine.executeCommand('create:list:test{}', mockAgent)
      
      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('EXECUTION_ERROR')
      expect(result.error?.message).toBe('Command execution timeout')
    })

    it('should skip validation when disabled', async () => {
      const noValidationEngine = new MCPEngine({ enableValidation: false })
      
      const mockValidator = require('../../validator/CommandValidator').CommandValidator
      const validateSpy = jest.spyOn(mockValidator.prototype, 'validate')
      
      await noValidationEngine.executeCommand('create:list:test{}', mockAgent)
      
      expect(validateSpy).not.toHaveBeenCalled()
    })

    it('should skip permissions when disabled', async () => {
      const noPermissionsEngine = new MCPEngine({ enablePermissions: false })
      
      const restrictedAgent = {
        ...mockAgent,
        permissions: [] // No permissions
      }
      
      const result = await noPermissionsEngine.executeCommand('create:list:test{}', restrictedAgent)
      
      expect(result.success).toBe(true)
    })

    it('should skip logging when disabled', async () => {
      const noLoggingEngine = new MCPEngine({ enableLogging: false })
      
      const mockLogger = require('../../logger/ActionLogger').ActionLogger
      const logSpy = jest.spyOn(mockLogger.prototype, 'logAction')
      
      await noLoggingEngine.executeCommand('create:list:test{}', mockAgent)
      
      expect(logSpy).not.toHaveBeenCalled()
    })

    it('should execute without agent', async () => {
      const noPermissionsEngine = new MCPEngine({ enablePermissions: false })
      
      const result = await noPermissionsEngine.executeCommand('create:list:test{}')
      
      expect(result.success).toBe(true)
      expect(result.metadata.agent).toBeUndefined()
    })
  })

  describe('getStatus', () => {
    beforeEach(() => {
      engine = new MCPEngine()
      
      // Mock module status methods
      const mockSessionManager = require('../../modules/SessionManager').SessionManager
      mockSessionManager.prototype.getStatus = jest.fn().mockReturnValue({ activeSessions: 5 })
      
      const mockMemoryCache = require('../../modules/MemoryCache').MemoryCache
      mockMemoryCache.prototype.getStatus = jest.fn().mockReturnValue({ hitRate: 0.85 })
      
      const mockToolRegistry = require('../../modules/ToolRegistry').ToolRegistry
      mockToolRegistry.prototype.getStatus = jest.fn().mockReturnValue({ registeredTools: 10 })
      
      const mockStateSyncEngine = require('../../modules/StateSyncEngine').StateSyncEngine
      mockStateSyncEngine.prototype.getStatus = jest.fn().mockReturnValue({ syncStatus: 'active' })
    })

    it('should return engine status', () => {
      const status = engine.getStatus()
      
      expect(status.status).toBe('healthy')
      expect(status.uptime).toBeGreaterThan(0)
      expect(status.config).toBeDefined()
      expect(status.modules.sessionManager).toEqual({ activeSessions: 5 })
      expect(status.modules.memoryCache).toEqual({ hitRate: 0.85 })
      expect(status.modules.toolRegistry).toEqual({ registeredTools: 10 })
      expect(status.modules.stateSyncEngine).toEqual({ syncStatus: 'active' })
    })
  })

  describe('shutdown', () => {
    beforeEach(() => {
      engine = new MCPEngine()
      
      // Mock shutdown methods
      const mockStateSyncEngine = require('../../modules/StateSyncEngine').StateSyncEngine
      mockStateSyncEngine.prototype.shutdown = jest.fn().mockResolvedValue(undefined)
      
      const mockLogger = require('../../logger/ActionLogger').ActionLogger
      mockLogger.prototype.flush = jest.fn().mockResolvedValue(undefined)
      
      const mockMemoryCache = require('../../modules/MemoryCache').MemoryCache
      mockMemoryCache.prototype.clear = jest.fn()
    })

    it('should shutdown gracefully', async () => {
      await engine.shutdown()
      
      const mockStateSyncEngine = require('../../modules/StateSyncEngine').StateSyncEngine
      const mockLogger = require('../../logger/ActionLogger').ActionLogger
      const mockMemoryCache = require('../../modules/MemoryCache').MemoryCache
      
      expect(mockStateSyncEngine.prototype.shutdown).toHaveBeenCalled()
      expect(mockLogger.prototype.flush).toHaveBeenCalled()
      expect(mockMemoryCache.prototype.clear).toHaveBeenCalled()
    })
  })
})

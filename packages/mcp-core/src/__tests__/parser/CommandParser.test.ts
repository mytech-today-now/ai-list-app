import { CommandParser } from '../../parser/CommandParser'
import { MCPValidationError } from '@ai-todo/shared-types'

describe('CommandParser', () => {
  let parser: CommandParser

  beforeEach(() => {
    parser = new CommandParser()
  })

  describe('parse', () => {
    it('should parse valid command without parameters', () => {
      const result = parser.parse('create:list:my-list{}')
      
      expect(result).toEqual({
        action: 'create',
        targetType: 'list',
        targetId: 'my-list',
        parameters: undefined
      })
    })

    it('should parse valid command with parameters', () => {
      const result = parser.parse('create:list:my-list{"title":"My List","priority":"high"}')
      
      expect(result).toEqual({
        action: 'create',
        targetType: 'list',
        targetId: 'my-list',
        parameters: {
          title: 'My List',
          priority: 'high'
        }
      })
    })

    it('should parse command with complex parameters', () => {
      const result = parser.parse('update:item:task-1{"status":"completed","tags":["urgent","work"],"metadata":{"assignee":"john"}}')
      
      expect(result.parameters).toEqual({
        status: 'completed',
        tags: ['urgent', 'work'],
        metadata: { assignee: 'john' }
      })
    })

    it('should handle commands with underscores and hyphens in IDs', () => {
      const result = parser.parse('read:list:my_list-123{}')
      
      expect(result.targetId).toBe('my_list-123')
    })

    it('should trim whitespace from command string', () => {
      const result = parser.parse('  create:list:test{}  ')
      
      expect(result.action).toBe('create')
      expect(result.targetType).toBe('list')
      expect(result.targetId).toBe('test')
    })

    // Error cases
    it('should throw error for null/undefined command', () => {
      expect(() => parser.parse(null as any)).toThrow(MCPValidationError)
      expect(() => parser.parse(undefined as any)).toThrow(MCPValidationError)
    })

    it('should throw error for empty command', () => {
      expect(() => parser.parse('')).toThrow(MCPValidationError)
      expect(() => parser.parse('   ')).toThrow(MCPValidationError)
    })

    it('should throw error for invalid command format', () => {
      expect(() => parser.parse('invalid-command')).toThrow(MCPValidationError)
      expect(() => parser.parse('create:list')).toThrow(MCPValidationError)
      expect(() => parser.parse('create:list:')).toThrow(MCPValidationError)
    })

    it('should throw error for invalid action', () => {
      expect(() => parser.parse('invalid_action:list:test{}')).toThrow(MCPValidationError)
    })

    it('should throw error for invalid target type', () => {
      expect(() => parser.parse('create:invalid_type:test{}')).toThrow(MCPValidationError)
    })

    it('should throw error for invalid target ID', () => {
      expect(() => parser.parse('create:list:{}'))
        .toThrow('Target ID is required')
      
      expect(() => parser.parse('create:list:test@invalid{}'))
        .toThrow('Target ID must contain only alphanumeric characters')
      
      expect(() => parser.parse(`create:list:${'a'.repeat(256)}{}`))
        .toThrow('Target ID cannot exceed 255 characters')
    })

    it('should throw error for invalid JSON parameters', () => {
      expect(() => parser.parse('create:list:test{invalid-json}'))
        .toThrow('Invalid JSON in parameters')
      
      expect(() => parser.parse('create:list:test{"unclosed":}'))
        .toThrow('Invalid JSON in parameters')
    })

    it('should throw error for non-object parameters', () => {
      expect(() => parser.parse('create:list:test{[]}'))
        .toThrow('Parameters must be a JSON object')
      
      expect(() => parser.parse('create:list:test{"string"}'))
        .toThrow('Parameters must be a JSON object')
      
      expect(() => parser.parse('create:list:test{null}'))
        .toThrow('Parameters must be a JSON object')
    })
  })

  describe('serialize', () => {
    it('should serialize command without parameters', () => {
      const command = {
        action: 'create' as const,
        targetType: 'list' as const,
        targetId: 'my-list',
        parameters: undefined
      }
      
      const result = parser.serialize(command)
      expect(result).toBe('create:list:my-list{}')
    })

    it('should serialize command with parameters', () => {
      const command = {
        action: 'create' as const,
        targetType: 'list' as const,
        targetId: 'my-list',
        parameters: { title: 'My List', priority: 'high' }
      }
      
      const result = parser.serialize(command)
      expect(result).toBe('create:list:my-list{"title":"My List","priority":"high"}')
    })

    it('should serialize command with empty parameters object', () => {
      const command = {
        action: 'create' as const,
        targetType: 'list' as const,
        targetId: 'my-list',
        parameters: {}
      }
      
      const result = parser.serialize(command)
      expect(result).toBe('create:list:my-list{}')
    })
  })

  describe('validateCommand', () => {
    it('should validate valid command object', () => {
      const command = {
        action: 'create' as const,
        targetType: 'list' as const,
        targetId: 'my-list',
        parameters: { title: 'Test' }
      }
      
      expect(() => parser.validateCommand(command)).not.toThrow()
    })

    it('should throw error for missing command object', () => {
      expect(() => parser.validateCommand(null as any)).toThrow('Command object is required')
    })

    it('should throw error for missing required fields', () => {
      expect(() => parser.validateCommand({} as any)).toThrow('Command action is required')
      
      expect(() => parser.validateCommand({ action: 'create' } as any))
        .toThrow('Command target type is required')
      
      expect(() => parser.validateCommand({ 
        action: 'create', 
        targetType: 'list' 
      } as any)).toThrow('Command target ID is required')
    })
  })

  describe('extractBasicInfo', () => {
    it('should extract action and target type', () => {
      const result = parser.extractBasicInfo('create:list:my-list{}')
      
      expect(result).toEqual({
        action: 'create',
        targetType: 'list'
      })
    })

    it('should return null for invalid format', () => {
      expect(parser.extractBasicInfo('invalid')).toBeNull()
      expect(parser.extractBasicInfo('create:list')).toBeNull()
    })

    it('should handle commands with complex parameters', () => {
      const result = parser.extractBasicInfo('update:item:task-1{"complex":"data"}')
      
      expect(result).toEqual({
        action: 'update',
        targetType: 'item'
      })
    })
  })

  describe('isValidSyntax', () => {
    it('should return true for valid commands', () => {
      expect(parser.isValidSyntax('create:list:test{}')).toBe(true)
      expect(parser.isValidSyntax('update:item:task-1{"status":"done"}')).toBe(true)
    })

    it('should return false for invalid commands', () => {
      expect(parser.isValidSyntax('invalid')).toBe(false)
      expect(parser.isValidSyntax('create:invalid_type:test{}')).toBe(false)
      expect(parser.isValidSyntax('create:list:test{invalid-json}')).toBe(false)
    })
  })

  describe('edge cases and boundary conditions', () => {
    it('should handle all valid actions', () => {
      const validActions = [
        'create', 'read', 'update', 'delete',
        'execute', 'reorder', 'rename', 'status', 'mark_done',
        'rollback', 'plan', 'train', 'deploy', 'test',
        'monitor', 'optimize', 'debug', 'log'
      ]
      
      validActions.forEach(action => {
        expect(() => parser.parse(`${action}:list:test{}`)).not.toThrow()
      })
    })

    it('should handle all valid target types', () => {
      const validTargetTypes = [
        'list', 'item', 'agent', 'system',
        'batch', 'workflow', 'session'
      ]
      
      validTargetTypes.forEach(targetType => {
        expect(() => parser.parse(`create:${targetType}:test{}`)).not.toThrow()
      })
    })

    it('should handle maximum length target ID', () => {
      const maxLengthId = 'a'.repeat(255)
      expect(() => parser.parse(`create:list:${maxLengthId}{}`)).not.toThrow()
    })

    it('should handle complex nested parameters', () => {
      const complexParams = {
        nested: {
          deep: {
            value: 'test',
            array: [1, 2, { inner: true }]
          }
        },
        numbers: [1, 2.5, -3],
        boolean: true,
        null_value: null
      }
      
      const command = `create:list:test{${JSON.stringify(complexParams)}}`
      const result = parser.parse(command)
      
      expect(result.parameters).toEqual(complexParams)
    })
  })
})

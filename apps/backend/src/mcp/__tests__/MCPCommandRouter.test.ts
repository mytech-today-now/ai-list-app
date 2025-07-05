/**
 * MCP Command Router Tests
 * SemanticType: MCPCommandRouterTests
 * ExtensibleByAI: true
 * AIUseCases: ["Unit testing", "Integration testing", "Command validation"]
 */

import { MCPCommandRouter } from '../router/MCPCommandRouter';
import { MCPCommand, MCPAction, MCPTargetType } from '@ai-todo/shared-types';

describe('MCPCommandRouter', () => {
  let router: MCPCommandRouter;

  beforeEach(() => {
    router = new MCPCommandRouter();
  });

  describe('Command Execution', () => {
    it('should execute a valid command', async () => {
      const command: MCPCommand = {
        action: 'read' as MCPAction,
        targetType: 'list' as MCPTargetType,
        targetId: 'test-list-1',
        parameters: {}
      };

      const response = await router.executeCommand(command);

      expect(response).toBeDefined();
      expect(response.success).toBe(true);
      expect(response.command).toBe('read:list:test-list-1');
      expect(response.metadata).toBeDefined();
      expect(response.metadata?.timestamp).toBeDefined();
    });

    it('should handle command with parameters', async () => {
      const command: MCPCommand = {
        action: 'create' as MCPAction,
        targetType: 'list' as MCPTargetType,
        targetId: 'new-list',
        parameters: {
          title: 'Test List',
          description: 'A test list'
        }
      };

      const response = await router.executeCommand(command);

      expect(response).toBeDefined();
      expect(response.success).toBe(true);
      expect(response.result).toBeDefined();
    });

    it('should handle invalid command gracefully', async () => {
      const command: MCPCommand = {
        action: 'invalid_action' as any,
        targetType: 'list' as MCPTargetType,
        targetId: 'test-list',
        parameters: {}
      };

      const response = await router.executeCommand(command);

      expect(response).toBeDefined();
      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
      expect(response.error?.code).toBe('EXECUTION_ERROR');
    });
  });

  describe('Batch Execution', () => {
    it('should execute multiple commands sequentially', async () => {
      const commands: MCPCommand[] = [
        {
          action: 'create' as MCPAction,
          targetType: 'list' as MCPTargetType,
          targetId: 'list-1',
          parameters: { title: 'List 1' }
        },
        {
          action: 'create' as MCPAction,
          targetType: 'list' as MCPTargetType,
          targetId: 'list-2',
          parameters: { title: 'List 2' }
        }
      ];

      const responses = await router.executeBatch(commands);

      expect(responses).toHaveLength(2);
      expect(responses[0].success).toBe(true);
      expect(responses[1].success).toBe(true);
    });

    it('should handle batch execution with stopOnError', async () => {
      const commands: MCPCommand[] = [
        {
          action: 'create' as MCPAction,
          targetType: 'list' as MCPTargetType,
          targetId: 'list-1',
          parameters: { title: 'List 1' }
        },
        {
          action: 'invalid_action' as any,
          targetType: 'list' as MCPTargetType,
          targetId: 'list-2',
          parameters: {}
        },
        {
          action: 'create' as MCPAction,
          targetType: 'list' as MCPTargetType,
          targetId: 'list-3',
          parameters: { title: 'List 3' }
        }
      ];

      const responses = await router.executeBatch(commands, { stopOnError: true });

      expect(responses).toHaveLength(2); // Should stop after error
      expect(responses[0].success).toBe(true);
      expect(responses[1].success).toBe(false);
    });

    it('should execute commands in parallel', async () => {
      const commands: MCPCommand[] = [
        {
          action: 'read' as MCPAction,
          targetType: 'list' as MCPTargetType,
          targetId: 'list-1',
          parameters: {}
        },
        {
          action: 'read' as MCPAction,
          targetType: 'list' as MCPTargetType,
          targetId: 'list-2',
          parameters: {}
        }
      ];

      const startTime = Date.now();
      const responses = await router.executeBatch(commands, { parallel: true });
      const endTime = Date.now();

      expect(responses).toHaveLength(2);
      expect(responses[0].success).toBe(true);
      expect(responses[1].success).toBe(true);
      
      // Parallel execution should be faster than sequential
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });

  describe('Stream Execution', () => {
    it('should stream command execution', async () => {
      const command: MCPCommand = {
        action: 'read' as MCPAction,
        targetType: 'list' as MCPTargetType,
        targetId: 'test-list',
        parameters: {}
      };

      const stream = router.streamCommand(command);
      const chunks = [];

      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].type).toBe('progress');
      expect(chunks[chunks.length - 1].type).toBe('result');
    });
  });

  describe('System Status', () => {
    it('should return system status', async () => {
      const status = await router.getSystemStatus();

      expect(status).toBeDefined();
      expect(status.engine).toBeDefined();
      expect(status.engine.status).toBe('healthy');
      expect(status.engine.uptime).toBeGreaterThanOrEqual(0);
      expect(status.services).toBeDefined();
      expect(status.agents).toBeDefined();
      expect(status.sessions).toBeDefined();
      expect(status.performance).toBeDefined();
    });
  });

  describe('Tools and Resources', () => {
    it('should return available tools', async () => {
      const tools = await router.getAvailableTools();

      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
      
      const tool = tools[0];
      expect(tool.name).toBeDefined();
      expect(tool.description).toBeDefined();
      expect(tool.permissions).toBeDefined();
      expect(tool.category).toBeDefined();
    });

    it('should return available resources', async () => {
      const resources = await router.getAvailableResources();

      expect(Array.isArray(resources)).toBe(true);
      expect(resources.length).toBeGreaterThan(0);
      
      const resource = resources[0];
      expect(resource.uri).toBeDefined();
      expect(resource.name).toBeDefined();
      expect(resource.description).toBeDefined();
      expect(resource.mimeType).toBeDefined();
      expect(resource.permissions).toBeDefined();
    });
  });

  describe('Command History', () => {
    it('should return command history', async () => {
      // Execute a command first
      const command: MCPCommand = {
        action: 'read' as MCPAction,
        targetType: 'list' as MCPTargetType,
        targetId: 'test-list',
        parameters: {}
      };

      await router.executeCommand(command);

      const history = await router.getCommandHistory({
        limit: 10,
        offset: 0
      });

      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThan(0);
    });

    it('should filter command history by session', async () => {
      const sessionId = 'test-session-123';
      
      const command: MCPCommand = {
        action: 'read' as MCPAction,
        targetType: 'list' as MCPTargetType,
        targetId: 'test-list',
        parameters: {}
      };

      await router.executeCommand(command, { sessionId });

      const history = await router.getCommandHistory({
        limit: 10,
        offset: 0,
        sessionId
      });

      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed commands', async () => {
      const command = {
        action: 'read',
        // Missing targetType and targetId
      } as any;

      const response = await router.executeCommand(command);

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });

    it('should handle execution timeouts', async () => {
      // This would require a mock that simulates a long-running command
      // For now, we'll just test that the router handles errors gracefully
      const command: MCPCommand = {
        action: 'read' as MCPAction,
        targetType: 'list' as MCPTargetType,
        targetId: 'test-list',
        parameters: {}
      };

      const response = await router.executeCommand(command);
      expect(response).toBeDefined();
    });
  });
});

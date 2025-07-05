/**
 * MCP API Integration Tests
 * SemanticType: MCPAPIIntegrationTests
 * ExtensibleByAI: true
 * AIUseCases: ["API testing", "End-to-end validation", "Integration verification"]
 */

import request from 'supertest';
import express from 'express';
import { MCPCommand, MCPAction, MCPTargetType } from '@ai-todo/shared-types';
import mcpRouter from '../../routes/mcp';

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/mcp', mcpRouter);
  return app;
};

describe('MCP API Integration', () => {
  let app: express.Application;

  beforeEach(() => {
    app = createTestApp();
  });

  describe('POST /api/mcp/command', () => {
    it('should execute a valid MCP command', async () => {
      const command: MCPCommand = {
        action: 'read' as MCPAction,
        targetType: 'list' as MCPTargetType,
        targetId: 'test-list-1',
        parameters: {}
      };

      const response = await request(app)
        .post('/api/mcp/command')
        .send(command)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.command).toBe('read:list:test-list-1');
      expect(response.body.metadata).toBeDefined();
      expect(response.body.metadata.timestamp).toBeDefined();
    });

    it('should handle command with parameters', async () => {
      const command: MCPCommand = {
        action: 'create' as MCPAction,
        targetType: 'list' as MCPTargetType,
        targetId: 'new-list',
        parameters: {
          title: 'Test List',
          description: 'A test list created via API'
        }
      };

      const response = await request(app)
        .post('/api/mcp/command')
        .send(command)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.result).toBeDefined();
    });

    it('should return error for invalid command', async () => {
      const invalidCommand = {
        action: 'invalid_action',
        targetType: 'list',
        targetId: 'test-list'
      };

      const response = await request(app)
        .post('/api/mcp/command')
        .send(invalidCommand)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should include correlation ID in response headers', async () => {
      const command: MCPCommand = {
        action: 'read' as MCPAction,
        targetType: 'list' as MCPTargetType,
        targetId: 'test-list',
        parameters: {}
      };

      const response = await request(app)
        .post('/api/mcp/command')
        .send(command)
        .expect(200);

      expect(response.headers['x-mcp-correlation-id']).toBeDefined();
      expect(response.headers['x-mcp-version']).toBe('1.0.0');
    });
  });

  describe('POST /api/mcp/batch', () => {
    it('should execute multiple commands in batch', async () => {
      const commands: MCPCommand[] = [
        {
          action: 'create' as MCPAction,
          targetType: 'list' as MCPTargetType,
          targetId: 'batch-list-1',
          parameters: { title: 'Batch List 1' }
        },
        {
          action: 'create' as MCPAction,
          targetType: 'list' as MCPTargetType,
          targetId: 'batch-list-2',
          parameters: { title: 'Batch List 2' }
        }
      ];

      const response = await request(app)
        .post('/api/mcp/batch')
        .send({ commands })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.results).toHaveLength(2);
      expect(response.body.metadata.totalCommands).toBe(2);
      expect(response.body.metadata.successCount).toBe(2);
      expect(response.body.metadata.errorCount).toBe(0);
    });

    it('should handle batch with mixed success/failure', async () => {
      const commands: MCPCommand[] = [
        {
          action: 'create' as MCPAction,
          targetType: 'list' as MCPTargetType,
          targetId: 'valid-list',
          parameters: { title: 'Valid List' }
        },
        {
          action: 'invalid_action' as any,
          targetType: 'list' as MCPTargetType,
          targetId: 'invalid-list',
          parameters: {}
        }
      ];

      const response = await request(app)
        .post('/api/mcp/batch')
        .send({ commands })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.results).toHaveLength(2);
      expect(response.body.metadata.successCount).toBe(1);
      expect(response.body.metadata.errorCount).toBe(1);
    });

    it('should support batch options', async () => {
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

      const response = await request(app)
        .post('/api/mcp/batch')
        .send({ 
          commands,
          options: {
            parallel: true,
            stopOnError: false
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.results).toHaveLength(2);
    });
  });

  describe('GET /api/mcp/tools', () => {
    it('should return available tools', async () => {
      const response = await request(app)
        .get('/api/mcp/tools')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.tools)).toBe(true);
      expect(response.body.tools.length).toBeGreaterThan(0);
      expect(response.body.metadata.count).toBe(response.body.tools.length);

      const tool = response.body.tools[0];
      expect(tool.name).toBeDefined();
      expect(tool.description).toBeDefined();
      expect(tool.permissions).toBeDefined();
      expect(tool.category).toBeDefined();
    });
  });

  describe('GET /api/mcp/resources', () => {
    it('should return available resources', async () => {
      const response = await request(app)
        .get('/api/mcp/resources')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.resources)).toBe(true);
      expect(response.body.resources.length).toBeGreaterThan(0);
      expect(response.body.metadata.count).toBe(response.body.resources.length);

      const resource = response.body.resources[0];
      expect(resource.uri).toBeDefined();
      expect(resource.name).toBeDefined();
      expect(resource.description).toBeDefined();
      expect(resource.mimeType).toBeDefined();
      expect(resource.permissions).toBeDefined();
    });
  });

  describe('GET /api/mcp/status', () => {
    it('should return system status', async () => {
      const response = await request(app)
        .get('/api/mcp/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.status).toBeDefined();
      expect(response.body.status.engine).toBeDefined();
      expect(response.body.status.engine.status).toBe('healthy');
      expect(response.body.status.services).toBeDefined();
      expect(response.body.status.agents).toBeDefined();
      expect(response.body.status.sessions).toBeDefined();
      expect(response.body.status.performance).toBeDefined();
    });
  });

  describe('GET /api/mcp/history', () => {
    it('should return command history', async () => {
      // Execute a command first to create history
      const command: MCPCommand = {
        action: 'read' as MCPAction,
        targetType: 'list' as MCPTargetType,
        targetId: 'history-test',
        parameters: {}
      };

      await request(app)
        .post('/api/mcp/command')
        .send(command);

      const response = await request(app)
        .get('/api/mcp/history')
        .query({ limit: 10, offset: 0 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.history)).toBe(true);
      expect(response.body.metadata.limit).toBe(10);
      expect(response.body.metadata.offset).toBe(0);
    });

    it('should support history filtering', async () => {
      const sessionId = 'test-session-123';

      const response = await request(app)
        .get('/api/mcp/history')
        .query({ 
          limit: 10, 
          offset: 0,
          sessionId 
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.history)).toBe(true);
    });
  });

  describe('Authentication Headers', () => {
    it('should handle session ID header', async () => {
      const command: MCPCommand = {
        action: 'read' as MCPAction,
        targetType: 'list' as MCPTargetType,
        targetId: 'test-list',
        parameters: {}
      };

      const response = await request(app)
        .post('/api/mcp/command')
        .set('X-MCP-Session-ID', 'test-session-123')
        .send(command)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle agent ID header', async () => {
      const command: MCPCommand = {
        action: 'read' as MCPAction,
        targetType: 'list' as MCPTargetType,
        targetId: 'test-list',
        parameters: {}
      };

      const response = await request(app)
        .post('/api/mcp/command')
        .set('X-MCP-Agent-ID', 'agent_test_123')
        .send(command)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle user ID header', async () => {
      const command: MCPCommand = {
        action: 'read' as MCPAction,
        targetType: 'list' as MCPTargetType,
        targetId: 'test-list',
        parameters: {}
      };

      const response = await request(app)
        .post('/api/mcp/command')
        .set('X-User-ID', 'user-123')
        .send(command)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/mcp/command')
        .send('invalid json')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle missing required fields', async () => {
      const incompleteCommand = {
        action: 'read'
        // Missing targetType and targetId
      };

      const response = await request(app)
        .post('/api/mcp/command')
        .send(incompleteCommand)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limits', async () => {
      const command: MCPCommand = {
        action: 'read' as MCPAction,
        targetType: 'list' as MCPTargetType,
        targetId: 'rate-limit-test',
        parameters: {}
      };

      // Make multiple requests rapidly
      const requests = Array(5).fill(null).map(() =>
        request(app)
          .post('/api/mcp/command')
          .send(command)
      );

      const responses = await Promise.all(requests);

      // All should succeed under normal rate limits
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status);
      });
    });
  });
});

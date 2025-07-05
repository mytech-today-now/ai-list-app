/**
 * MCP Integration Layer - Main Router
 * SemanticType: MCPRouter
 * ExtensibleByAI: true
 * AIUseCases: ["Command routing", "Request handling", "Response formatting"]
 */

import { Router } from 'express';
import { MCPCommandRouter } from '../mcp/router/MCPCommandRouter';
import { MCPWebSocketHandler } from '../mcp/websocket/MCPWebSocketHandler';
import { mcpMiddleware } from '../mcp/middleware';
import { mcpValidation } from '../mcp/middleware/validation';
import { mcpAuth } from '../mcp/middleware/auth';
import { mcpRateLimit } from '../mcp/middleware/rateLimit';
import { mcpLogging } from '../mcp/middleware/logging';
import agentRoutes from '../mcp/routes/agents';

const router = Router();

// Apply MCP-specific middleware stack
router.use(mcpLogging);
router.use(mcpAuth);
router.use(mcpRateLimit);
router.use(mcpValidation);
router.use(mcpMiddleware);

// Initialize MCP Command Router
const commandRouter = new MCPCommandRouter();

// Sub-routes
router.use('/agents', agentRoutes);

/**
 * Execute MCP Command
 * POST /api/mcp/command
 */
router.post('/command', async (req, res, next) => {
  try {
    const result = await commandRouter.executeCommand(req.body, {
      sessionId: req.sessionId,
      agentId: req.agentId,
      userId: req.userId,
      correlationId: req.correlationId,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * Execute Batch MCP Commands
 * POST /api/mcp/batch
 */
router.post('/batch', async (req, res, next) => {
  try {
    const { commands, options = {} } = req.body;
    
    const results = await commandRouter.executeBatch(commands, {
      sessionId: req.sessionId,
      agentId: req.agentId,
      userId: req.userId,
      correlationId: req.correlationId,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      ...options
    });

    res.json({
      success: true,
      results,
      metadata: {
        totalCommands: commands.length,
        successCount: results.filter(r => r.success).length,
        errorCount: results.filter(r => !r.success).length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Stream MCP Command Execution
 * POST /api/mcp/stream
 */
router.post('/stream', async (req, res, next) => {
  try {
    // Set up Server-Sent Events
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    const stream = commandRouter.streamCommand(req.body, {
      sessionId: req.sessionId,
      agentId: req.agentId,
      userId: req.userId,
      correlationId: req.correlationId
    });

    for await (const chunk of stream) {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }

    res.end();
  } catch (error) {
    next(error);
  }
});

/**
 * Get MCP Tools Registry
 * GET /api/mcp/tools
 */
router.get('/tools', async (req, res, next) => {
  try {
    const tools = await commandRouter.getAvailableTools({
      agentId: req.agentId,
      sessionId: req.sessionId
    });

    res.json({
      success: true,
      tools,
      metadata: {
        count: tools.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get MCP Resources Registry
 * GET /api/mcp/resources
 */
router.get('/resources', async (req, res, next) => {
  try {
    const resources = await commandRouter.getAvailableResources({
      agentId: req.agentId,
      sessionId: req.sessionId
    });

    res.json({
      success: true,
      resources,
      metadata: {
        count: resources.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get MCP System Status
 * GET /api/mcp/status
 */
router.get('/status', async (req, res, next) => {
  try {
    const status = await commandRouter.getSystemStatus();

    res.json({
      success: true,
      status,
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get MCP Command History
 * GET /api/mcp/history
 */
router.get('/history', async (req, res, next) => {
  try {
    const { limit = 50, offset = 0, sessionId, agentId } = req.query;
    
    const history = await commandRouter.getCommandHistory({
      limit: Number(limit),
      offset: Number(offset),
      sessionId: sessionId as string,
      agentId: agentId as string,
      userId: req.userId
    });

    res.json({
      success: true,
      history,
      metadata: {
        count: history.length,
        limit: Number(limit),
        offset: Number(offset),
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;

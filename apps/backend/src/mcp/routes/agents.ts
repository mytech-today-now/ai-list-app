/**
 * MCP Agent Routes - HTTP endpoints for agent management
 * SemanticType: MCPAgentRoutes
 * ExtensibleByAI: true
 * AIUseCases: ["Agent CRUD operations", "Permission management", "Agent discovery"]
 */

import { Router } from 'express';
import { MCPAgentManager } from '../agents/MCPAgentManager';
import { requirePermission } from '../middleware/auth';
import { z } from 'zod';

const router = Router();
const agentManager = new MCPAgentManager();

// Validation schemas
const CreateAgentSchema = z.object({
  name: z.string().min(1).max(255),
  role: z.enum(['reader', 'writer', 'executor', 'admin']),
  permissions: z.array(z.string()),
  capabilities: z.array(z.string()).optional(),
  description: z.string().optional()
});

const UpdateAgentSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  permissions: z.array(z.string()).optional(),
  capabilities: z.array(z.string()).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  description: z.string().optional()
});

/**
 * GET /api/mcp/agents
 * List all agents with optional filtering
 */
router.get('/', async (req, res, next) => {
  try {
    const { role, status, limit, offset } = req.query;
    
    const agents = await agentManager.listAgents({
      role: role as any,
      status: status as any,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined
    });

    res.json({
      success: true,
      agents,
      metadata: {
        count: agents.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/mcp/agents/:id
 * Get specific agent details
 */
router.get('/:id', async (req, res, next) => {
  try {
    const agent = await agentManager.getAgent(req.params.id);
    
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'AGENT_NOT_FOUND',
          message: `Agent not found: ${req.params.id}`
        }
      });
    }

    res.json({
      success: true,
      agent,
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/mcp/agents
 * Create a new agent
 */
router.post('/', requirePermission('admin'), async (req, res, next) => {
  try {
    const validatedData = CreateAgentSchema.parse(req.body);
    
    const agent = await agentManager.createAgent(validatedData);

    res.status(201).json({
      success: true,
      agent,
      metadata: {
        timestamp: new Date().toISOString(),
        operation: 'create'
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/mcp/agents/:id
 * Update an existing agent
 */
router.put('/:id', requirePermission('admin'), async (req, res, next) => {
  try {
    const validatedData = UpdateAgentSchema.parse(req.body);
    
    const agent = await agentManager.updateAgent(req.params.id, validatedData);
    
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'AGENT_NOT_FOUND',
          message: `Agent not found: ${req.params.id}`
        }
      });
    }

    res.json({
      success: true,
      agent,
      metadata: {
        timestamp: new Date().toISOString(),
        operation: 'update'
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/mcp/agents/:id
 * Delete an agent
 */
router.delete('/:id', requirePermission('admin'), async (req, res, next) => {
  try {
    const deleted = await agentManager.deleteAgent(req.params.id);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'AGENT_NOT_FOUND',
          message: `Agent not found: ${req.params.id}`
        }
      });
    }

    res.json({
      success: true,
      deleted: true,
      metadata: {
        timestamp: new Date().toISOString(),
        operation: 'delete'
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/mcp/agents/stats
 * Get agent statistics
 */
router.get('/stats', async (req, res, next) => {
  try {
    const stats = await agentManager.getAgentStats();

    res.json({
      success: true,
      stats,
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/mcp/agents/:id/permissions
 * Get agent permissions and capabilities
 */
router.get('/:id/permissions', async (req, res, next) => {
  try {
    const agent = await agentManager.getAgent(req.params.id);
    
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'AGENT_NOT_FOUND',
          message: `Agent not found: ${req.params.id}`
        }
      });
    }

    res.json({
      success: true,
      permissions: {
        permissions: agent.permissions,
        capabilities: agent.capabilities || [],
        role: agent.role
      },
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/mcp/agents/:id/activity
 * Record agent activity
 */
router.post('/:id/activity', async (req, res, next) => {
  try {
    const { action, targetType, targetId } = req.body;
    
    await agentManager.recordAgentActivity(req.params.id, {
      action,
      targetType,
      targetId,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      recorded: true,
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;

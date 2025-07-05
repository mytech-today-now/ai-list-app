/**
 * MCP Authentication Middleware
 * SemanticType: MCPAuthMiddleware
 * ExtensibleByAI: true
 * AIUseCases: ["Authentication", "Authorization", "Session management"]
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

interface MCPAuthPayload {
  userId: string;
  sessionId?: string;
  agentId?: string;
  permissions: string[];
  exp?: number;
}

const AuthHeaderSchema = z.object({
  authorization: z.string().optional(),
  'x-api-key': z.string().optional(),
  'x-mcp-session-id': z.string().optional(),
  'x-mcp-agent-id': z.string().optional()
});

/**
 * Main MCP Authentication Middleware
 */
export const mcpAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Parse and validate headers
    const headers = AuthHeaderSchema.parse({
      authorization: req.headers.authorization,
      'x-api-key': req.headers['x-api-key'],
      'x-mcp-session-id': req.headers['x-mcp-session-id'],
      'x-mcp-agent-id': req.headers['x-mcp-agent-id']
    });

    // Skip auth for health checks and public endpoints
    if (isPublicEndpoint(req.path)) {
      return next();
    }

    // Try different authentication methods
    let authResult = null;

    // 1. JWT Token Authentication
    if (headers.authorization) {
      authResult = await authenticateWithJWT(headers.authorization);
    }
    
    // 2. API Key Authentication
    else if (headers['x-api-key']) {
      authResult = await authenticateWithApiKey(headers['x-api-key']);
    }
    
    // 3. Session-based Authentication
    else if (headers['x-mcp-session-id']) {
      authResult = await authenticateWithSession(headers['x-mcp-session-id']);
    }
    
    // 4. Development mode - allow anonymous access
    else if (process.env.NODE_ENV === 'development') {
      authResult = await getAnonymousAuth();
    }

    if (!authResult) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required for MCP access'
        },
        metadata: {
          timestamp: new Date().toISOString(),
          correlationId: req.correlationId
        }
      });
    }

    // Set authentication context
    req.userId = authResult.userId;
    req.sessionId = authResult.sessionId || headers['x-mcp-session-id'];
    req.agentId = authResult.agentId || headers['x-mcp-agent-id'];
    
    // Store permissions for later use
    (req as any).permissions = authResult.permissions;

    next();

  } catch (error) {
    console.error('MCP Auth Error:', error);
    
    res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Authentication failed'
      },
      metadata: {
        timestamp: new Date().toISOString(),
        correlationId: req.correlationId
      }
    });
  }
};

/**
 * JWT Token Authentication
 */
async function authenticateWithJWT(authHeader: string): Promise<MCPAuthPayload | null> {
  try {
    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, JWT_SECRET) as MCPAuthPayload;
    
    // Validate token structure
    if (!decoded.userId) {
      throw new Error('Invalid token: missing userId');
    }
    
    return decoded;
  } catch (error) {
    console.error('JWT Authentication failed:', error);
    return null;
  }
}

/**
 * API Key Authentication
 */
async function authenticateWithApiKey(apiKey: string): Promise<MCPAuthPayload | null> {
  try {
    // In a real implementation, you would validate the API key against a database
    // For now, we'll use a simple validation
    if (!apiKey || apiKey.length < 32) {
      return null;
    }
    
    // Mock API key validation - replace with actual implementation
    const validApiKeys = process.env.VALID_API_KEYS?.split(',') || [];
    if (!validApiKeys.includes(apiKey)) {
      return null;
    }
    
    return {
      userId: 'api-user',
      permissions: ['read', 'write', 'execute']
    };
  } catch (error) {
    console.error('API Key Authentication failed:', error);
    return null;
  }
}

/**
 * Session-based Authentication
 */
async function authenticateWithSession(sessionId: string): Promise<MCPAuthPayload | null> {
  try {
    // In a real implementation, you would validate the session against a database
    // For now, we'll use a simple validation
    if (!sessionId || sessionId.length < 10) {
      return null;
    }
    
    // Mock session validation - replace with actual session store lookup
    return {
      userId: 'session-user',
      sessionId,
      permissions: ['read', 'write']
    };
  } catch (error) {
    console.error('Session Authentication failed:', error);
    return null;
  }
}

/**
 * Anonymous Authentication (Development only)
 */
async function getAnonymousAuth(): Promise<MCPAuthPayload | null> {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  return {
    userId: 'anonymous',
    permissions: ['read', 'write', 'execute']
  };
}

/**
 * Check if endpoint is public (doesn't require authentication)
 */
function isPublicEndpoint(path: string): boolean {
  const publicPaths = [
    '/health',
    '/status',
    '/api/mcp/health',
    '/api/mcp/status'
  ];
  
  return publicPaths.some(publicPath => path.startsWith(publicPath));
}

/**
 * Permission checking middleware
 */
export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const permissions = (req as any).permissions || [];
    
    if (!permissions.includes(permission) && !permissions.includes('admin')) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: `Permission '${permission}' required`
        },
        metadata: {
          timestamp: new Date().toISOString(),
          correlationId: req.correlationId
        }
      });
    }
    
    next();
  };
};

/**
 * Agent-specific authentication
 */
export const requireAgent = (req: Request, res: Response, next: NextFunction) => {
  if (!req.agentId) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'AGENT_REQUIRED',
        message: 'Agent ID required for this operation'
      },
      metadata: {
        timestamp: new Date().toISOString(),
        correlationId: req.correlationId
      }
    });
  }
  
  next();
};

/**
 * Session-specific authentication
 */
export const requireSession = (req: Request, res: Response, next: NextFunction) => {
  if (!req.sessionId) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'SESSION_REQUIRED',
        message: 'Session ID required for this operation'
      },
      metadata: {
        timestamp: new Date().toISOString(),
        correlationId: req.correlationId
      }
    });
  }
  
  next();
};

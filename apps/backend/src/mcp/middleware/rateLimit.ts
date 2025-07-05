/**
 * MCP Rate Limiting Middleware
 * SemanticType: MCPRateLimitMiddleware
 * ExtensibleByAI: true
 * AIUseCases: ["Rate limiting", "DDoS protection", "Resource management"]
 */

import { Request, Response, NextFunction } from 'express';
import { MCPAction, MCPTargetType } from '@ai-todo/shared-types';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
  firstRequest: number;
}

class RateLimitStore {
  private store = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  get(key: string): RateLimitEntry | undefined {
    return this.store.get(key);
  }

  set(key: string, entry: RateLimitEntry): void {
    this.store.set(key, entry);
  }

  increment(key: string, windowMs: number): RateLimitEntry {
    const now = Date.now();
    const existing = this.store.get(key);

    if (!existing || now > existing.resetTime) {
      // Create new entry or reset expired entry
      const entry: RateLimitEntry = {
        count: 1,
        resetTime: now + windowMs,
        firstRequest: now
      };
      this.store.set(key, entry);
      return entry;
    }

    // Increment existing entry
    existing.count++;
    this.store.set(key, existing);
    return existing;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }
}

// Global rate limit store
const globalStore = new RateLimitStore();

// Rate limit configurations for different scenarios
const rateLimitConfigs: Record<string, RateLimitConfig> = {
  // General API rate limit
  general: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 1000
  },
  
  // Per-user rate limit
  perUser: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 500,
    keyGenerator: (req) => `user:${req.userId || req.ip}`
  },
  
  // Per-session rate limit
  perSession: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 200,
    keyGenerator: (req) => `session:${req.sessionId || req.ip}`
  },
  
  // Per-agent rate limit
  perAgent: {
    windowMs: 1 * 60 * 1000, // 1 minute
    maxRequests: 100,
    keyGenerator: (req) => `agent:${req.agentId || 'anonymous'}`
  },
  
  // Command-specific rate limits
  createCommands: {
    windowMs: 1 * 60 * 1000, // 1 minute
    maxRequests: 50,
    keyGenerator: (req) => `create:${req.userId || req.ip}`
  },
  
  deleteCommands: {
    windowMs: 1 * 60 * 1000, // 1 minute
    maxRequests: 20,
    keyGenerator: (req) => `delete:${req.userId || req.ip}`
  },
  
  batchCommands: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 10,
    keyGenerator: (req) => `batch:${req.userId || req.ip}`
  },
  
  streamCommands: {
    windowMs: 1 * 60 * 1000, // 1 minute
    maxRequests: 5,
    keyGenerator: (req) => `stream:${req.userId || req.ip}`
  }
};

/**
 * Create rate limit middleware
 */
function createRateLimit(config: RateLimitConfig) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = config.keyGenerator ? config.keyGenerator(req) : req.ip;
    const entry = globalStore.increment(key, config.windowMs);
    
    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', config.maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, config.maxRequests - entry.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000));
    res.setHeader('X-RateLimit-Window', Math.ceil(config.windowMs / 1000));
    
    if (entry.count > config.maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - Date.now()) / 1000);
      res.setHeader('Retry-After', retryAfter);
      
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Rate limit exceeded',
          details: {
            limit: config.maxRequests,
            window: config.windowMs,
            retryAfter
          }
        },
        metadata: {
          timestamp: new Date().toISOString(),
          correlationId: req.correlationId
        }
      });
    }
    
    next();
  };
}

/**
 * Main MCP Rate Limiting Middleware
 */
export const mcpRateLimit = (req: Request, res: Response, next: NextFunction) => {
  // Apply multiple rate limits in sequence
  const rateLimits = [
    createRateLimit(rateLimitConfigs.general),
    createRateLimit(rateLimitConfigs.perUser)
  ];
  
  // Add session-specific rate limit if session exists
  if (req.sessionId) {
    rateLimits.push(createRateLimit(rateLimitConfigs.perSession));
  }
  
  // Add agent-specific rate limit if agent exists
  if (req.agentId) {
    rateLimits.push(createRateLimit(rateLimitConfigs.perAgent));
  }
  
  // Add endpoint-specific rate limits
  switch (req.path) {
    case '/batch':
      rateLimits.push(createRateLimit(rateLimitConfigs.batchCommands));
      break;
    case '/stream':
      rateLimits.push(createRateLimit(rateLimitConfigs.streamCommands));
      break;
    case '/command':
      // Add command-specific rate limits based on action
      if (req.body && req.body.action) {
        switch (req.body.action) {
          case 'create':
            rateLimits.push(createRateLimit(rateLimitConfigs.createCommands));
            break;
          case 'delete':
            rateLimits.push(createRateLimit(rateLimitConfigs.deleteCommands));
            break;
        }
      }
      break;
  }
  
  // Execute rate limits sequentially
  let currentIndex = 0;
  
  function executeNext() {
    if (currentIndex >= rateLimits.length) {
      return next();
    }
    
    const currentRateLimit = rateLimits[currentIndex++];
    currentRateLimit(req, res, (err?: any) => {
      if (err) {
        return next(err);
      }
      if (res.headersSent) {
        return; // Rate limit exceeded
      }
      executeNext();
    });
  }
  
  executeNext();
};

/**
 * Burst protection for high-frequency requests
 */
export const mcpBurstProtection = (req: Request, res: Response, next: NextFunction) => {
  const burstConfig: RateLimitConfig = {
    windowMs: 10 * 1000, // 10 seconds
    maxRequests: 20,
    keyGenerator: (req) => `burst:${req.userId || req.ip}`
  };
  
  const burstLimit = createRateLimit(burstConfig);
  burstLimit(req, res, next);
};

/**
 * Adaptive rate limiting based on system load
 */
export const mcpAdaptiveRateLimit = (req: Request, res: Response, next: NextFunction) => {
  // Get system metrics (simplified)
  const cpuUsage = process.cpuUsage();
  const memoryUsage = process.memoryUsage();
  
  // Calculate load factor (0-1)
  const loadFactor = Math.min(1, (memoryUsage.heapUsed / memoryUsage.heapTotal) * 0.7);
  
  // Adjust rate limits based on load
  const adjustedConfig: RateLimitConfig = {
    windowMs: 1 * 60 * 1000, // 1 minute
    maxRequests: Math.floor(100 * (1 - loadFactor)), // Reduce limits under high load
    keyGenerator: (req) => `adaptive:${req.userId || req.ip}`
  };
  
  // Only apply adaptive limiting under high load
  if (loadFactor > 0.7) {
    const adaptiveLimit = createRateLimit(adjustedConfig);
    return adaptiveLimit(req, res, next);
  }
  
  next();
};

/**
 * IP-based rate limiting for anonymous users
 */
export const mcpIPRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
  keyGenerator: (req) => `ip:${req.ip}`
});

/**
 * Cleanup function for graceful shutdown
 */
export const cleanupRateLimit = () => {
  globalStore.destroy();
};

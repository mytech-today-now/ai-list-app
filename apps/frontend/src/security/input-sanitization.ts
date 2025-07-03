/**
 * Input Sanitization and Validation Utilities
 * SemanticType: InputSanitization
 * ExtensibleByAI: true
 * AIUseCases: ["XSS prevention", "Data validation", "Input cleaning"]
 */

import DOMPurify from 'dompurify';
import { z } from 'zod';

/**
 * HTML sanitization options
 */
export interface SanitizeOptions {
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
  stripTags?: boolean;
  preserveWhitespace?: boolean;
}

/**
 * Default sanitization configuration
 */
const defaultSanitizeOptions: SanitizeOptions = {
  allowedTags: ['b', 'i', 'em', 'strong', 'u', 'br', 'p', 'span'],
  allowedAttributes: {
    'span': ['class'],
    'p': ['class']
  },
  stripTags: false,
  preserveWhitespace: true
};

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export function sanitizeHTML(
  input: string, 
  options: SanitizeOptions = defaultSanitizeOptions
): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  const config: DOMPurify.Config = {
    ALLOWED_TAGS: options.allowedTags || [],
    ALLOWED_ATTR: Object.keys(options.allowedAttributes || {}),
    KEEP_CONTENT: !options.stripTags,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    RETURN_DOM_IMPORT: false
  };

  return DOMPurify.sanitize(input, config);
}

/**
 * Sanitize plain text input
 */
export function sanitizeText(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Sanitize URL to prevent malicious redirects
 */
export function sanitizeURL(url: string): string {
  if (!url || typeof url !== 'string') {
    return '';
  }

  // Remove dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
  const lowerUrl = url.toLowerCase();
  
  for (const protocol of dangerousProtocols) {
    if (lowerUrl.startsWith(protocol)) {
      return '';
    }
  }

  // Allow only http, https, mailto, tel
  const allowedProtocols = /^(https?|mailto|tel):/i;
  if (url.includes(':') && !allowedProtocols.test(url)) {
    return '';
  }

  return url;
}

/**
 * Sanitize file name to prevent path traversal
 */
export function sanitizeFileName(fileName: string): string {
  if (!fileName || typeof fileName !== 'string') {
    return '';
  }

  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars with underscore
    .replace(/\.{2,}/g, '.') // Replace multiple dots with single dot
    .replace(/^\.+|\.+$/g, '') // Remove leading/trailing dots
    .substring(0, 255); // Limit length
}

/**
 * Zod schemas for common validation patterns
 */
export const ValidationSchemas = {
  email: z.string().email('Invalid email format'),
  
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  
  url: z.string().url('Invalid URL format'),
  
  phoneNumber: z.string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),
  
  uuid: z.string().uuid('Invalid UUID format'),
  
  slug: z.string()
    .min(1, 'Slug cannot be empty')
    .max(100, 'Slug must be at most 100 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  
  htmlContent: z.string().transform((val) => sanitizeHTML(val)),
  
  plainText: z.string().transform((val) => sanitizeText(val)),
  
  safeUrl: z.string().transform((val) => sanitizeURL(val)),
  
  fileName: z.string().transform((val) => sanitizeFileName(val))
};

/**
 * Validate and sanitize form data
 */
export function validateFormData<T>(
  data: unknown,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      );
      return { success: false, errors };
    }
    return { success: false, errors: ['Validation failed'] };
  }
}

/**
 * Rate limiting for input validation
 */
class RateLimiter {
  private attempts = new Map<string, { count: number; resetTime: number }>();
  private maxAttempts: number;
  private windowMs: number;

  constructor(maxAttempts = 5, windowMs = 60000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const record = this.attempts.get(identifier);

    if (!record || now > record.resetTime) {
      this.attempts.set(identifier, { count: 1, resetTime: now + this.windowMs });
      return true;
    }

    if (record.count >= this.maxAttempts) {
      return false;
    }

    record.count++;
    return true;
  }

  reset(identifier: string): void {
    this.attempts.delete(identifier);
  }
}

/**
 * Global rate limiter for validation attempts
 */
export const validationRateLimiter = new RateLimiter(10, 60000); // 10 attempts per minute

/**
 * Secure input validation with rate limiting
 */
export function secureValidate<T>(
  data: unknown,
  schema: z.ZodSchema<T>,
  identifier: string = 'default'
): { success: true; data: T } | { success: false; errors: string[] } {
  // Check rate limit
  if (!validationRateLimiter.isAllowed(identifier)) {
    return { 
      success: false, 
      errors: ['Too many validation attempts. Please try again later.'] 
    };
  }

  return validateFormData(data, schema);
}

/**
 * Content Security Policy for user-generated content
 */
export function sanitizeUserContent(content: string): string {
  // First pass: DOMPurify with strict settings
  const cleaned = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
    RETURN_DOM: false
  });

  // Second pass: Additional text-based cleaning
  return cleaned
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .trim();
}

/**
 * Validate and sanitize MCP command parameters
 */
export const MCPParameterSchema = z.object({
  action: z.enum(['create', 'read', 'update', 'delete', 'execute', 'query']),
  targetType: z.string().min(1).max(50).regex(/^[a-zA-Z0-9_-]+$/),
  targetId: z.string().min(1).max(100),
  parameters: z.record(z.any()).optional(),
  sessionId: z.string().uuid().optional(),
  agentId: z.string().min(1).max(50).optional(),
  timestamp: z.string().datetime().optional()
});

/**
 * Sanitize MCP command for safe execution
 */
export function sanitizeMCPCommand(command: unknown) {
  return secureValidate(command, MCPParameterSchema, 'mcp-command');
}

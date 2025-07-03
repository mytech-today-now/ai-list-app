/**
 * Content Security Policy Configuration
 * SemanticType: CSPConfiguration
 * ExtensibleByAI: true
 * AIUseCases: ["Security policy management", "XSS prevention", "Resource control"]
 */

export interface CSPDirectives {
  'default-src'?: string[];
  'script-src'?: string[];
  'style-src'?: string[];
  'img-src'?: string[];
  'font-src'?: string[];
  'connect-src'?: string[];
  'media-src'?: string[];
  'object-src'?: string[];
  'child-src'?: string[];
  'frame-src'?: string[];
  'worker-src'?: string[];
  'manifest-src'?: string[];
  'base-uri'?: string[];
  'form-action'?: string[];
  'frame-ancestors'?: string[];
  'upgrade-insecure-requests'?: boolean;
  'block-all-mixed-content'?: boolean;
}

export interface CSPConfig {
  directives: CSPDirectives;
  reportUri?: string;
  reportOnly?: boolean;
  nonce?: string;
}

/**
 * Generate CSP nonce for inline scripts and styles
 */
export function generateCSPNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
}

/**
 * Default CSP configuration for production
 */
export const defaultCSPConfig: CSPConfig = {
  directives: {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      "'unsafe-inline'", // Only for development - should use nonces in production
      'https://cdn.jsdelivr.net',
      'https://unpkg.com'
    ],
    'style-src': [
      "'self'",
      "'unsafe-inline'", // Required for CSS-in-JS and Tailwind
      'https://fonts.googleapis.com'
    ],
    'img-src': [
      "'self'",
      'data:',
      'blob:',
      'https:'
    ],
    'font-src': [
      "'self'",
      'https://fonts.gstatic.com'
    ],
    'connect-src': [
      "'self'",
      'ws:',
      'wss:',
      'https://api.github.com' // For potential GitHub integration
    ],
    'media-src': ["'self'"],
    'object-src': ["'none'"],
    'child-src': ["'self'"],
    'frame-src': ["'none'"],
    'worker-src': ["'self'", 'blob:'],
    'manifest-src': ["'self'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'upgrade-insecure-requests': true,
    'block-all-mixed-content': true
  },
  reportOnly: false
};

/**
 * Development CSP configuration (more permissive)
 */
export const developmentCSPConfig: CSPConfig = {
  directives: {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      "'unsafe-inline'",
      "'unsafe-eval'", // Required for development tools
      'localhost:*',
      '127.0.0.1:*',
      'https://cdn.jsdelivr.net',
      'https://unpkg.com'
    ],
    'style-src': [
      "'self'",
      "'unsafe-inline'",
      'localhost:*',
      '127.0.0.1:*',
      'https://fonts.googleapis.com'
    ],
    'img-src': [
      "'self'",
      'data:',
      'blob:',
      'https:',
      'localhost:*',
      '127.0.0.1:*'
    ],
    'font-src': [
      "'self'",
      'https://fonts.gstatic.com',
      'localhost:*',
      '127.0.0.1:*'
    ],
    'connect-src': [
      "'self'",
      'ws:',
      'wss:',
      'localhost:*',
      '127.0.0.1:*',
      'https://api.github.com'
    ],
    'media-src': ["'self'", 'localhost:*', '127.0.0.1:*'],
    'object-src': ["'none'"],
    'child-src': ["'self'"],
    'frame-src': ["'self'", 'localhost:*', '127.0.0.1:*'],
    'worker-src': ["'self'", 'blob:', 'localhost:*', '127.0.0.1:*'],
    'manifest-src': ["'self'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"]
  },
  reportOnly: true
};

/**
 * Convert CSP config to header string
 */
export function buildCSPHeader(config: CSPConfig): string {
  const directives: string[] = [];

  for (const [directive, values] of Object.entries(config.directives)) {
    if (typeof values === 'boolean') {
      if (values) {
        directives.push(directive);
      }
    } else if (Array.isArray(values) && values.length > 0) {
      directives.push(`${directive} ${values.join(' ')}`);
    }
  }

  if (config.reportUri) {
    directives.push(`report-uri ${config.reportUri}`);
  }

  return directives.join('; ');
}

/**
 * Apply CSP to document
 */
export function applyCSP(config: CSPConfig = defaultCSPConfig): void {
  const headerName = config.reportOnly ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy';
  const headerValue = buildCSPHeader(config);

  // Create meta tag for CSP
  const meta = document.createElement('meta');
  meta.httpEquiv = headerName;
  meta.content = headerValue;
  
  // Remove existing CSP meta tags
  const existingMeta = document.querySelector(`meta[http-equiv="${headerName}"]`);
  if (existingMeta) {
    existingMeta.remove();
  }
  
  document.head.appendChild(meta);
}

/**
 * CSP violation reporting
 */
export interface CSPViolationReport {
  'document-uri': string;
  referrer: string;
  'violated-directive': string;
  'effective-directive': string;
  'original-policy': string;
  disposition: string;
  'blocked-uri': string;
  'line-number': number;
  'column-number': number;
  'source-file': string;
  'status-code': number;
  'script-sample': string;
}

/**
 * Handle CSP violation reports
 */
export function handleCSPViolation(report: CSPViolationReport): void {
  console.warn('CSP Violation:', report);
  
  // In production, you would send this to your logging service
  if (import.meta.env.PROD) {
    // Send to logging service
    fetch('/api/security/csp-violation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(report)
    }).catch(error => {
      console.error('Failed to report CSP violation:', error);
    });
  }
}

/**
 * Initialize CSP violation reporting
 */
export function initializeCSPReporting(): void {
  document.addEventListener('securitypolicyviolation', (event) => {
    const report: CSPViolationReport = {
      'document-uri': event.documentURI,
      referrer: event.referrer,
      'violated-directive': event.violatedDirective,
      'effective-directive': event.effectiveDirective,
      'original-policy': event.originalPolicy,
      disposition: event.disposition,
      'blocked-uri': event.blockedURI,
      'line-number': event.lineNumber,
      'column-number': event.columnNumber,
      'source-file': event.sourceFile,
      'status-code': event.statusCode,
      'script-sample': event.sample
    };
    
    handleCSPViolation(report);
  });
}

/**
 * Get current environment CSP config
 */
export function getCSPConfig(): CSPConfig {
  return import.meta.env.DEV ? developmentCSPConfig : defaultCSPConfig;
}

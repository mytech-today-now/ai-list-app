/**
 * Security Context Provider - Global security state and utilities
 * SemanticType: SecurityContextProvider
 * ExtensibleByAI: true
 * AIUseCases: ["Security management", "Access control", "Input validation"]
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth, Permission, UserRole } from '../security/auth-rbac';
import { applyCSP, getCSPConfig, initializeCSPReporting } from '../security/csp-config';
import { sanitizeHTML, sanitizeText, validateFormData } from '../security/input-sanitization';
import { z } from 'zod';

export interface SecurityContextValue {
  // Authentication
  isAuthenticated: boolean;
  user: any;
  hasPermission: (permission: Permission) => boolean;
  hasRoleOrHigher: (role: UserRole) => boolean;
  
  // Input Sanitization
  sanitizeHTML: (input: string) => string;
  sanitizeText: (input: string) => string;
  validateForm: <T>(data: unknown, schema: z.ZodSchema<T>) => { success: boolean; data?: T; errors?: string[] };
  
  // Security Status
  cspEnabled: boolean;
  securityLevel: 'low' | 'medium' | 'high';
  
  // Security Actions
  reportSecurityIssue: (issue: SecurityIssue) => void;
  checkResourceAccess: (resource: string, action: string) => boolean;
}

export interface SecurityIssue {
  type: 'csp_violation' | 'xss_attempt' | 'unauthorized_access' | 'validation_error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details?: any;
  timestamp: string;
  userAgent?: string;
  url?: string;
}

const SecurityContext = createContext<SecurityContextValue | null>(null);

export interface SecurityProviderProps {
  children: ReactNode;
  config?: {
    enableCSP?: boolean;
    securityLevel?: 'low' | 'medium' | 'high';
    reportingEndpoint?: string;
  };
}

export const SecurityProvider: React.FC<SecurityProviderProps> = ({ 
  children, 
  config = {} 
}) => {
  const {
    enableCSP = true,
    securityLevel = 'high',
    reportingEndpoint = '/api/security/report'
  } = config;

  const auth = useAuth();
  const [cspEnabled, setCspEnabled] = useState(false);
  const [securityIssues, setSecurityIssues] = useState<SecurityIssue[]>([]);

  // Initialize security features
  useEffect(() => {
    if (enableCSP) {
      try {
        const cspConfig = getCSPConfig();
        applyCSP(cspConfig);
        initializeCSPReporting();
        setCspEnabled(true);
      } catch (error) {
        console.error('Failed to initialize CSP:', error);
        reportSecurityIssue({
          type: 'csp_violation',
          severity: 'medium',
          message: 'Failed to initialize Content Security Policy',
          details: error,
          timestamp: new Date().toISOString()
        });
      }
    }
  }, [enableCSP]);

  // Enhanced input sanitization with security reporting
  const securesanitizeHTML = (input: string): string => {
    try {
      const sanitized = sanitizeHTML(input);
      
      // Check if sanitization removed potentially dangerous content
      if (sanitized !== input && input.includes('<script')) {
        reportSecurityIssue({
          type: 'xss_attempt',
          severity: 'high',
          message: 'Potential XSS attempt detected in HTML input',
          details: { original: input.substring(0, 100), sanitized: sanitized.substring(0, 100) },
          timestamp: new Date().toISOString()
        });
      }
      
      return sanitized;
    } catch (error) {
      reportSecurityIssue({
        type: 'validation_error',
        severity: 'medium',
        message: 'HTML sanitization failed',
        details: error,
        timestamp: new Date().toISOString()
      });
      return '';
    }
  };

  const securesanitizeText = (input: string): string => {
    try {
      const sanitized = sanitizeText(input);
      
      // Check for potential injection attempts
      if (input.toLowerCase().includes('javascript:') || input.includes('on')) {
        reportSecurityIssue({
          type: 'xss_attempt',
          severity: 'medium',
          message: 'Potential script injection detected in text input',
          details: { input: input.substring(0, 100) },
          timestamp: new Date().toISOString()
        });
      }
      
      return sanitized;
    } catch (error) {
      reportSecurityIssue({
        type: 'validation_error',
        severity: 'low',
        message: 'Text sanitization failed',
        details: error,
        timestamp: new Date().toISOString()
      });
      return '';
    }
  };

  // Enhanced form validation with security checks
  const secureValidateForm = <T>(
    data: unknown, 
    schema: z.ZodSchema<T>
  ): { success: boolean; data?: T; errors?: string[] } => {
    try {
      const result = validateFormData(data, schema);
      
      if (!result.success) {
        reportSecurityIssue({
          type: 'validation_error',
          severity: 'low',
          message: 'Form validation failed',
          details: { errors: result.errors },
          timestamp: new Date().toISOString()
        });
      }
      
      return result;
    } catch (error) {
      reportSecurityIssue({
        type: 'validation_error',
        severity: 'medium',
        message: 'Form validation error',
        details: error,
        timestamp: new Date().toISOString()
      });
      return { success: false, errors: ['Validation failed'] };
    }
  };

  // Security issue reporting
  const reportSecurityIssue = (issue: SecurityIssue): void => {
    // Add to local state
    setSecurityIssues(prev => [...prev.slice(-99), issue]); // Keep last 100 issues
    
    // Log to console in development
    if (import.meta.env.DEV) {
      console.warn('Security Issue:', issue);
    }
    
    // Send to server in production
    if (import.meta.env.PROD && reportingEndpoint) {
      fetch(reportingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...issue,
          userAgent: navigator.userAgent,
          url: window.location.href,
          userId: auth.user?.id
        })
      }).catch(error => {
        console.error('Failed to report security issue:', error);
      });
    }
  };

  // Resource access checking
  const checkResourceAccess = (resource: string, action: string): boolean => {
    if (!auth.isAuthenticated) {
      reportSecurityIssue({
        type: 'unauthorized_access',
        severity: 'medium',
        message: `Unauthorized access attempt to ${resource}:${action}`,
        details: { resource, action },
        timestamp: new Date().toISOString()
      });
      return false;
    }
    
    return auth.canAccessResource(resource, resource, action);
  };

  // Enhanced permission checking with logging
  const secureHasPermission = (permission: Permission): boolean => {
    const hasPermission = auth.hasPermission(permission);
    
    if (!hasPermission && auth.isAuthenticated) {
      reportSecurityIssue({
        type: 'unauthorized_access',
        severity: 'low',
        message: `Permission denied: ${permission}`,
        details: { permission, userRole: auth.user?.role },
        timestamp: new Date().toISOString()
      });
    }
    
    return hasPermission;
  };

  const contextValue: SecurityContextValue = {
    // Authentication
    isAuthenticated: auth.isAuthenticated,
    user: auth.user,
    hasPermission: secureHasPermission,
    hasRoleOrHigher: auth.hasRoleOrHigher,
    
    // Input Sanitization
    sanitizeHTML: securesanitizeHTML,
    sanitizeText: securesanitizeText,
    validateForm: secureValidateForm,
    
    // Security Status
    cspEnabled,
    securityLevel,
    
    // Security Actions
    reportSecurityIssue,
    checkResourceAccess
  };

  return (
    <SecurityContext.Provider value={contextValue}>
      {children}
    </SecurityContext.Provider>
  );
};

/**
 * Hook to access security context
 */
export const useSecurity = (): SecurityContextValue => {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
};

/**
 * Higher-order component for protected routes
 */
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  requiredPermission?: Permission,
  requiredRole?: UserRole
) {
  return function AuthenticatedComponent(props: P) {
    const security = useSecurity();
    
    if (!security.isAuthenticated) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h2>
            <p className="text-gray-600">Please log in to access this page.</p>
          </div>
        </div>
      );
    }
    
    if (requiredPermission && !security.hasPermission(requiredPermission)) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
            <p className="text-gray-600">You don't have permission to access this page.</p>
          </div>
        </div>
      );
    }
    
    if (requiredRole && !security.hasRoleOrHigher(requiredRole)) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Insufficient Privileges</h2>
            <p className="text-gray-600">Your role doesn't allow access to this page.</p>
          </div>
        </div>
      );
    }
    
    return <Component {...props} />;
  };
}

export default SecurityContext;

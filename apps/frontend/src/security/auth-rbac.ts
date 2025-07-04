/**
 * Authentication and Role-Based Access Control (RBAC) System
 * SemanticType: AuthRBACSystem
 * ExtensibleByAI: true
 * AIUseCases: ["User authentication", "Permission management", "Access control"]
 */

import { z } from 'zod';
import { ValidationSchemas } from './input-sanitization';

/**
 * User roles with hierarchical permissions
 */
export enum UserRole {
  GUEST = 'guest',
  USER = 'user',
  MODERATOR = 'moderator',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin'
}

/**
 * Permission categories
 */
export enum PermissionCategory {
  LISTS = 'lists',
  ITEMS = 'items',
  USERS = 'users',
  SYSTEM = 'system',
  MCP = 'mcp'
}

/**
 * Specific permissions
 */
export enum Permission {
  // List permissions
  LIST_CREATE = 'list:create',
  LIST_READ = 'list:read',
  LIST_UPDATE = 'list:update',
  LIST_DELETE = 'list:delete',
  LIST_SHARE = 'list:share',
  
  // Item permissions
  ITEM_CREATE = 'item:create',
  ITEM_READ = 'item:read',
  ITEM_UPDATE = 'item:update',
  ITEM_DELETE = 'item:delete',
  ITEM_ASSIGN = 'item:assign',
  
  // User permissions
  USER_READ = 'user:read',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  USER_MANAGE_ROLES = 'user:manage_roles',
  
  // System permissions
  SYSTEM_CONFIG = 'system:config',
  SYSTEM_LOGS = 'system:logs',
  SYSTEM_BACKUP = 'system:backup',
  
  // MCP permissions
  MCP_EXECUTE = 'mcp:execute',
  MCP_ADMIN = 'mcp:admin',
  MCP_TOOLS = 'mcp:tools',
  MCP_RESOURCES = 'mcp:resources'
}

/**
 * Base permissions for each role
 */
const GUEST_PERMISSIONS = [
  Permission.LIST_READ,
  Permission.ITEM_READ
];

const USER_PERMISSIONS = [
  Permission.LIST_CREATE,
  Permission.LIST_READ,
  Permission.LIST_UPDATE,
  Permission.LIST_DELETE,
  Permission.ITEM_CREATE,
  Permission.ITEM_READ,
  Permission.ITEM_UPDATE,
  Permission.ITEM_DELETE,
  Permission.USER_READ,
  Permission.USER_UPDATE,
  Permission.MCP_EXECUTE
];

const MODERATOR_PERMISSIONS = [
  ...USER_PERMISSIONS,
  Permission.LIST_SHARE,
  Permission.ITEM_ASSIGN,
  Permission.USER_DELETE,
  Permission.MCP_TOOLS
];

const ADMIN_PERMISSIONS = [
  ...MODERATOR_PERMISSIONS,
  Permission.USER_MANAGE_ROLES,
  Permission.SYSTEM_CONFIG,
  Permission.SYSTEM_LOGS,
  Permission.MCP_ADMIN,
  Permission.MCP_RESOURCES
];

const SUPER_ADMIN_PERMISSIONS = [
  ...ADMIN_PERMISSIONS,
  Permission.SYSTEM_BACKUP
];

/**
 * Role permission mapping
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.GUEST]: GUEST_PERMISSIONS,
  [UserRole.USER]: USER_PERMISSIONS,
  [UserRole.MODERATOR]: MODERATOR_PERMISSIONS,
  [UserRole.ADMIN]: ADMIN_PERMISSIONS,
  [UserRole.SUPER_ADMIN]: SUPER_ADMIN_PERMISSIONS
};

/**
 * User interface
 */
export interface User {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  permissions: Permission[];
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

/**
 * Authentication token interface
 */
export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  tokenType: 'Bearer';
}

/**
 * Authentication context
 */
export interface AuthContext {
  user: User | null;
  token: AuthToken | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

/**
 * Login credentials schema
 */
export const LoginCredentialsSchema = z.object({
  email: ValidationSchemas.email,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional()
});

/**
 * Registration data schema
 */
export const RegistrationSchema = z.object({
  email: ValidationSchemas.email,
  username: ValidationSchemas.username,
  password: ValidationSchemas.password,
  confirmPassword: z.string(),
  acceptTerms: z.boolean().refine(val => val === true, 'You must accept the terms and conditions')
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

/**
 * Permission checker utility
 */
export class PermissionChecker {
  private user: User | null;

  constructor(user: User | null) {
    this.user = user;
  }

  /**
   * Check if user has specific permission
   */
  hasPermission(permission: Permission): boolean {
    if (!this.user || !this.user.isActive) {
      return false;
    }

    return this.user.permissions.includes(permission);
  }

  /**
   * Check if user has any of the specified permissions
   */
  hasAnyPermission(permissions: Permission[]): boolean {
    return permissions.some(permission => this.hasPermission(permission));
  }

  /**
   * Check if user has all specified permissions
   */
  hasAllPermissions(permissions: Permission[]): boolean {
    return permissions.every(permission => this.hasPermission(permission));
  }

  /**
   * Check if user has role or higher
   */
  hasRoleOrHigher(role: UserRole): boolean {
    if (!this.user) return false;

    const roleHierarchy = [
      UserRole.GUEST,
      UserRole.USER,
      UserRole.MODERATOR,
      UserRole.ADMIN,
      UserRole.SUPER_ADMIN
    ];

    const userRoleIndex = roleHierarchy.indexOf(this.user.role);
    const requiredRoleIndex = roleHierarchy.indexOf(role);

    return userRoleIndex >= requiredRoleIndex;
  }

  /**
   * Check if user can access resource
   */
  canAccessResource(resourceType: string, resourceId: string, action: string): boolean {
    // Basic resource access logic - can be extended
    const permission = `${resourceType}:${action}` as Permission;
    return this.hasPermission(permission);
  }
}

/**
 * Authentication service
 */
export class AuthService {
  private static instance: AuthService;
  private authContext: AuthContext = {
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false
  };
  private listeners: Set<(context: AuthContext) => void> = new Set();

  private constructor() {
    this.loadStoredAuth();
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Subscribe to auth state changes
   */
  subscribe(listener: (context: AuthContext) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify listeners of auth state changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.authContext));
  }

  /**
   * Get current auth context
   */
  getAuthContext(): AuthContext {
    return { ...this.authContext };
  }

  /**
   * Get permission checker for current user
   */
  getPermissionChecker(): PermissionChecker {
    return new PermissionChecker(this.authContext.user);
  }

  /**
   * Login user
   */
  async login(credentials: z.infer<typeof LoginCredentialsSchema>): Promise<{ success: boolean; error?: string }> {
    this.authContext.isLoading = true;
    this.notifyListeners();

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials)
      });

      if (!response.ok) {
        const error = await response.json();
        return { success: false, error: error.message || 'Login failed' };
      }

      const { user, token } = await response.json();
      
      // Add permissions based on role
      user.permissions = ROLE_PERMISSIONS[user.role] || [];

      this.authContext = {
        user,
        token,
        isAuthenticated: true,
        isLoading: false
      };

      this.storeAuth(token, credentials.rememberMe);
      this.notifyListeners();

      return { success: true };
    } catch (error) {
      this.authContext.isLoading = false;
      this.notifyListeners();
      return { success: false, error: 'Network error' };
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      if (this.authContext.token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.authContext.token.accessToken}`
          }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearAuth();
    }
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(): Promise<boolean> {
    if (!this.authContext.token?.refreshToken) {
      return false;
    }

    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken: this.authContext.token.refreshToken
        })
      });

      if (!response.ok) {
        this.clearAuth();
        return false;
      }

      const { token } = await response.json();
      this.authContext.token = token;
      this.storeAuth(token);
      this.notifyListeners();

      return true;
    } catch (error) {
      this.clearAuth();
      return false;
    }
  }

  /**
   * Store authentication data
   */
  private storeAuth(token: AuthToken, persistent = false): void {
    const storage = persistent ? localStorage : sessionStorage;
    storage.setItem('auth_token', JSON.stringify(token));
  }

  /**
   * Load stored authentication data
   */
  private loadStoredAuth(): void {
    const sessionToken = sessionStorage.getItem('auth_token');
    const localToken = localStorage.getItem('auth_token');
    const tokenData = sessionToken || localToken;

    if (tokenData) {
      try {
        const token = JSON.parse(tokenData);
        if (new Date(token.expiresAt) > new Date()) {
          // Token is still valid, attempt to get user info
          this.validateStoredToken(token);
        } else {
          this.clearAuth();
        }
      } catch (error) {
        this.clearAuth();
      }
    }
  }

  /**
   * Validate stored token and get user info
   */
  private async validateStoredToken(token: AuthToken): Promise<void> {
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token.accessToken}`
        }
      });

      if (response.ok) {
        const user = await response.json();
        user.permissions = ROLE_PERMISSIONS[user.role] || [];

        this.authContext = {
          user,
          token,
          isAuthenticated: true,
          isLoading: false
        };
        this.notifyListeners();
      } else {
        this.clearAuth();
      }
    } catch (error) {
      this.clearAuth();
    }
  }

  /**
   * Clear authentication data
   */
  private clearAuth(): void {
    sessionStorage.removeItem('auth_token');
    localStorage.removeItem('auth_token');
    
    this.authContext = {
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false
    };
    
    this.notifyListeners();
  }
}

/**
 * Global auth service instance
 */
export const authService = AuthService.getInstance();

/**
 * React hook for authentication
 */
import { useState, useEffect } from 'react';

export function useAuth() {
  const [authContext, setAuthContext] = useState<AuthContext>(authService.getAuthContext());

  useEffect(() => {
    const unsubscribe = authService.subscribe(setAuthContext);
    return unsubscribe;
  }, []);

  const permissionChecker = authService.getPermissionChecker();

  return {
    ...authContext,
    login: authService.login.bind(authService),
    logout: authService.logout.bind(authService),
    refreshToken: authService.refreshToken.bind(authService),
    hasPermission: permissionChecker.hasPermission.bind(permissionChecker),
    hasAnyPermission: permissionChecker.hasAnyPermission.bind(permissionChecker),
    hasAllPermissions: permissionChecker.hasAllPermissions.bind(permissionChecker),
    hasRoleOrHigher: permissionChecker.hasRoleOrHigher.bind(permissionChecker),
    canAccessResource: permissionChecker.canAccessResource.bind(permissionChecker)
  };
}

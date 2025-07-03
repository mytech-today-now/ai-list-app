/**
 * Shared TypeScript types for AI ToDo MCP system
 * SemanticType: SharedTypeDefinitions
 * ExtensibleByAI: true
 * AIUseCases: ["Type validation", "Schema evolution", "API contracts"]
 */

// Core MCP Types
export interface MCPCommand {
  action: MCPAction;
  targetType: MCPTargetType;
  targetId: string;
  parameters?: Record<string, unknown>;
  timestamp?: string;
  sessionId?: string;
  agentId?: string;
}

export interface MCPResponse<T = unknown> {
  success: boolean;
  command: string;
  result?: T;
  error?: MCPError;
  metadata?: {
    executionTime?: number;
    agent?: string;
    timestamp?: string;
  };
}

export interface MCPError {
  code: string;
  message: string;
  details?: string;
  stack?: string;
}

// MCP Actions and Targets
export type MCPAction = 
  | 'create' | 'read' | 'update' | 'delete' 
  | 'execute' | 'reorder' | 'rename' | 'status' | 'mark_done'
  | 'rollback' | 'plan' | 'train' | 'deploy' | 'test' 
  | 'monitor' | 'optimize' | 'debug' | 'log';

export type MCPTargetType = 
  | 'list' | 'item' | 'agent' | 'system' 
  | 'batch' | 'workflow' | 'session';

// Priority and Status Enums
export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type ListStatus = 'active' | 'completed' | 'archived' | 'deleted';
export type ItemStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'blocked';
export type AgentRole = 'reader' | 'executor' | 'planner' | 'admin';
export type AgentStatus = 'active' | 'inactive' | 'suspended';

// Core Entity Types
export interface TodoList {
  id: string;
  title: string;
  description?: string;
  parentListId?: string;
  position: number;
  priority: Priority;
  status: ListStatus;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface TodoItem {
  id: string;
  listId: string;
  title: string;
  description?: string;
  position: number;
  priority: Priority;
  status: ItemStatus;
  dueDate?: string;
  estimatedDuration?: number; // in minutes
  actualDuration?: number; // in minutes
  tags?: string[];
  dependencies?: string[]; // item IDs this depends on
  createdBy?: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  status: AgentStatus;
  permissions: MCPAction[];
  configuration?: Record<string, unknown>;
  apiKeyHash?: string;
  lastActive?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface ActionLog {
  id: number;
  command: string;
  action: MCPAction;
  targetType: MCPTargetType;
  targetId?: string;
  agentId?: string;
  parameters?: Record<string, unknown>;
  result?: Record<string, unknown>;
  success: boolean;
  errorMessage?: string;
  executionTime?: number; // in milliseconds
  timestamp: string;
  rollbackId?: number;
  sessionId?: string;
}

export interface Session {
  id: string;
  agentId?: string;
  userId?: string;
  status: 'active' | 'expired' | 'terminated';
  createdAt: string;
  expiresAt: string;
  lastActivity: string;
  metadata?: Record<string, unknown>;
}

// API Request/Response Types
export interface CreateListRequest {
  title: string;
  description?: string;
  parentListId?: string;
  priority?: Priority;
}

export interface CreateItemRequest {
  listId: string;
  title: string;
  description?: string;
  priority?: Priority;
  dueDate?: string;
  estimatedDuration?: number;
  tags?: string[];
  assignedTo?: string;
}

export interface UpdateListRequest {
  title?: string;
  description?: string;
  priority?: Priority;
  status?: ListStatus;
}

export interface UpdateItemRequest {
  title?: string;
  description?: string;
  priority?: Priority;
  status?: ItemStatus;
  dueDate?: string;
  estimatedDuration?: number;
  actualDuration?: number;
  tags?: string[];
  assignedTo?: string;
}

// UI State Types
export interface UIState {
  selectedListId?: string;
  selectedItemId?: string;
  viewMode: 'list' | 'kanban' | 'calendar';
  sidebarOpen: boolean;
  darkMode: boolean;
  filters: {
    status?: ItemStatus[];
    priority?: Priority[];
    assignedTo?: string[];
    tags?: string[];
  };
}

// Storage Types
export interface StorageConfig {
  encrypted: boolean;
  version: number;
  lastMigration?: string;
}

export interface StorageMetadata {
  version: number;
  createdAt: string;
  lastAccessed: string;
  size: number;
}

// Error Types
export class MCPValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'MCPValidationError';
  }
}

export class MCPExecutionError extends Error {
  constructor(message: string, public command?: string) {
    super(message);
    this.name = 'MCPExecutionError';
  }
}

export class MCPPermissionError extends Error {
  constructor(message: string, public requiredPermission?: string) {
    super(message);
    this.name = 'MCPPermissionError';
  }
}

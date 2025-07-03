/**
 * State Sync Engine - Synchronizes state between frontend, cache, and backend
 * SemanticType: StateSyncEngine
 * ExtensibleByAI: true
 * AIUseCases: ["State synchronization", "Conflict resolution", "Data consistency"]
 */

export interface SyncOperation {
  id: string;
  type: 'create' | 'read' | 'update' | 'delete' | 'query';
  table: string;
  entityId?: string;
  data?: unknown;
  query?: Record<string, unknown>;
  timestamp: number;
  status: 'pending' | 'completed' | 'failed';
  retryCount: number;
  error?: string;
}

export interface SyncConfig {
  maxRetries: number;
  retryDelay: number;
  batchSize: number;
  syncInterval: number;
}

export class StateSyncEngine {
  private operations: Map<string, SyncOperation> = new Map();
  private config: SyncConfig;
  private isOnline: boolean = true;
  private syncTimer?: NodeJS.Timeout;

  constructor(config: Partial<SyncConfig> = {}) {
    this.config = {
      maxRetries: 3,
      retryDelay: 1000,
      batchSize: 10,
      syncInterval: 5000,
      ...config,
    };

    this.startSyncTimer();
  }

  /**
   * Sync create operation
   */
  async syncCreate(table: string, data: unknown): Promise<unknown> {
    const operation: SyncOperation = {
      id: this.generateOperationId(),
      type: 'create',
      table,
      data,
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0,
    };

    this.operations.set(operation.id, operation);

    if (this.isOnline) {
      return this.executeOperation(operation);
    }

    // Return optimistic result for offline mode
    return data;
  }

  /**
   * Sync read operation
   */
  async syncRead(table: string, entityId: string): Promise<unknown> {
    const operation: SyncOperation = {
      id: this.generateOperationId(),
      type: 'read',
      table,
      entityId,
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0,
    };

    if (this.isOnline) {
      return this.executeOperation(operation);
    }

    // Return null for offline mode - would typically check local storage
    return null;
  }

  /**
   * Sync update operation
   */
  async syncUpdate(table: string, entityId: string, data: unknown): Promise<unknown> {
    const operation: SyncOperation = {
      id: this.generateOperationId(),
      type: 'update',
      table,
      entityId,
      data,
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0,
    };

    this.operations.set(operation.id, operation);

    if (this.isOnline) {
      return this.executeOperation(operation);
    }

    return data;
  }

  /**
   * Sync delete operation
   */
  async syncDelete(table: string, entityId: string): Promise<boolean> {
    const operation: SyncOperation = {
      id: this.generateOperationId(),
      type: 'delete',
      table,
      entityId,
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0,
    };

    this.operations.set(operation.id, operation);

    if (this.isOnline) {
      await this.executeOperation(operation);
      return true;
    }

    return true; // Optimistic delete
  }

  /**
   * Sync query operation
   */
  async syncQuery(table: string, query: Record<string, unknown>): Promise<unknown[]> {
    const operation: SyncOperation = {
      id: this.generateOperationId(),
      type: 'query',
      table,
      query,
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0,
    };

    if (this.isOnline) {
      return this.executeOperation(operation) as Promise<unknown[]>;
    }

    // Return empty array for offline mode
    return [];
  }

  /**
   * Execute a sync operation
   */
  private async executeOperation(operation: SyncOperation): Promise<unknown> {
    try {
      // Simulate API call - in real implementation, this would call the backend
      const result = await this.simulateApiCall(operation);
      
      operation.status = 'completed';
      this.operations.set(operation.id, operation);
      
      return result;
    } catch (error) {
      operation.status = 'failed';
      operation.error = error instanceof Error ? error.message : String(error);
      operation.retryCount++;
      
      this.operations.set(operation.id, operation);
      
      if (operation.retryCount < this.config.maxRetries) {
        // Schedule retry
        setTimeout(() => {
          this.retryOperation(operation.id);
        }, this.config.retryDelay * operation.retryCount);
      }
      
      throw error;
    }
  }

  /**
   * Retry a failed operation
   */
  private async retryOperation(operationId: string): Promise<void> {
    const operation = this.operations.get(operationId);
    
    if (!operation || operation.status !== 'failed') {
      return;
    }
    
    operation.status = 'pending';
    this.operations.set(operationId, operation);
    
    try {
      await this.executeOperation(operation);
    } catch (error) {
      // Error handling is done in executeOperation
    }
  }

  /**
   * Simulate API call (placeholder)
   */
  private async simulateApiCall(operation: SyncOperation): Promise<unknown> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 50));
    
    switch (operation.type) {
      case 'create':
        return { ...operation.data, id: operation.entityId || this.generateId() };
      case 'read':
        return { id: operation.entityId, data: 'mock_data' };
      case 'update':
        return { ...operation.data, id: operation.entityId };
      case 'delete':
        return { deleted: true };
      case 'query':
        return []; // Mock empty result
      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }

  /**
   * Set online/offline status
   */
  setOnlineStatus(isOnline: boolean): void {
    const wasOffline = !this.isOnline;
    this.isOnline = isOnline;
    
    if (wasOffline && isOnline) {
      // Sync pending operations when coming back online
      this.syncPendingOperations();
    }
  }

  /**
   * Sync all pending operations
   */
  private async syncPendingOperations(): Promise<void> {
    const pendingOps = Array.from(this.operations.values())
      .filter(op => op.status === 'pending' || op.status === 'failed')
      .sort((a, b) => a.timestamp - b.timestamp);

    const batches = this.chunkArray(pendingOps, this.config.batchSize);
    
    for (const batch of batches) {
      await Promise.allSettled(
        batch.map(op => this.executeOperation(op))
      );
    }
  }

  /**
   * Start sync timer
   */
  private startSyncTimer(): void {
    this.syncTimer = setInterval(() => {
      if (this.isOnline) {
        this.syncPendingOperations();
      }
    }, this.config.syncInterval);
  }

  /**
   * Generate operation ID
   */
  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate entity ID
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Get sync statistics
   */
  getSyncStats(): {
    totalOperations: number;
    pendingOperations: number;
    failedOperations: number;
    completedOperations: number;
    isOnline: boolean;
  } {
    const operations = Array.from(this.operations.values());
    
    return {
      totalOperations: operations.length,
      pendingOperations: operations.filter(op => op.status === 'pending').length,
      failedOperations: operations.filter(op => op.status === 'failed').length,
      completedOperations: operations.filter(op => op.status === 'completed').length,
      isOnline: this.isOnline,
    };
  }

  /**
   * Get engine status
   */
  getStatus(): object {
    return {
      status: 'active',
      isOnline: this.isOnline,
      config: this.config,
      stats: this.getSyncStats(),
    };
  }

  /**
   * Shutdown sync engine
   */
  async shutdown(): Promise<void> {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
    
    // Try to sync any remaining operations
    if (this.isOnline) {
      await this.syncPendingOperations();
    }
    
    this.operations.clear();
  }
}

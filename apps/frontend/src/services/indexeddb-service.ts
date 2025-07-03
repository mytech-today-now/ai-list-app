/**
 * IndexedDB Service - Offline-first data storage with Dexie
 * SemanticType: IndexedDBService
 * ExtensibleByAI: true
 * AIUseCases: ["Offline storage", "Data synchronization", "Local caching", "Background sync"]
 */

import Dexie, { Table } from 'dexie';
import { TodoList, TodoItem, User, Agent, Session } from '@ai-todo/shared-types';

/**
 * Offline action for background sync
 */
export interface OfflineAction {
  id?: number;
  type: 'create' | 'update' | 'delete';
  entity: 'list' | 'item' | 'user';
  entityId: string;
  data: any;
  timestamp: number;
  synced: boolean;
  retryCount: number;
  lastError?: string;
}

/**
 * Cached API response
 */
export interface CachedResponse {
  id?: number;
  url: string;
  method: string;
  data: any;
  timestamp: number;
  expiresAt: number;
  etag?: string;
}

/**
 * User preferences and settings
 */
export interface UserPreferences {
  id?: number;
  userId: string;
  theme: 'light' | 'dark' | 'auto';
  language: string;
  notifications: {
    enabled: boolean;
    email: boolean;
    push: boolean;
    desktop: boolean;
  };
  privacy: {
    analytics: boolean;
    crashReporting: boolean;
  };
  ui: {
    compactMode: boolean;
    showCompletedTasks: boolean;
    defaultView: 'list' | 'board' | 'calendar';
  };
  sync: {
    autoSync: boolean;
    syncInterval: number;
    offlineMode: boolean;
  };
  updatedAt: number;
}

/**
 * Dexie database class
 */
class AITodoDatabase extends Dexie {
  // Core entities
  lists!: Table<TodoList>;
  items!: Table<TodoItem>;
  users!: Table<User>;
  agents!: Table<Agent>;
  sessions!: Table<Session>;

  // Offline functionality
  offlineActions!: Table<OfflineAction>;
  cachedResponses!: Table<CachedResponse>;
  userPreferences!: Table<UserPreferences>;

  constructor() {
    super('AITodoMCP');

    this.version(1).stores({
      lists: '++id, title, userId, createdAt, updatedAt, status',
      items: '++id, listId, title, status, priority, dueDate, createdAt, updatedAt',
      users: '++id, email, username, role, isActive, createdAt',
      agents: '++id, name, type, status, createdAt',
      sessions: '++id, userId, status, createdAt, expiresAt',
      offlineActions: '++id, type, entity, entityId, timestamp, synced',
      cachedResponses: '++id, url, method, timestamp, expiresAt',
      userPreferences: '++id, userId, updatedAt'
    });

    // Hooks for automatic timestamping
    this.lists.hook('creating', (primKey, obj, trans) => {
      obj.createdAt = obj.createdAt || new Date().toISOString();
      obj.updatedAt = new Date().toISOString();
    });

    this.lists.hook('updating', (modifications, primKey, obj, trans) => {
      modifications.updatedAt = new Date().toISOString();
    });

    this.items.hook('creating', (primKey, obj, trans) => {
      obj.createdAt = obj.createdAt || new Date().toISOString();
      obj.updatedAt = new Date().toISOString();
    });

    this.items.hook('updating', (modifications, primKey, obj, trans) => {
      modifications.updatedAt = new Date().toISOString();
    });
  }
}

/**
 * IndexedDB Service for offline-first data management
 */
export class IndexedDBService {
  private static instance: IndexedDBService;
  private db: AITodoDatabase;

  private constructor() {
    this.db = new AITodoDatabase();
  }

  static getInstance(): IndexedDBService {
    if (!IndexedDBService.instance) {
      IndexedDBService.instance = new IndexedDBService();
    }
    return IndexedDBService.instance;
  }

  /**
   * Initialize the database
   */
  async initialize(): Promise<void> {
    try {
      await this.db.open();
      console.log('IndexedDB initialized successfully');
    } catch (error) {
      console.error('Failed to initialize IndexedDB:', error);
      throw error;
    }
  }

  // ===== LISTS OPERATIONS =====

  async getLists(userId?: string): Promise<TodoList[]> {
    if (userId) {
      return this.db.lists.where('userId').equals(userId).toArray();
    }
    return this.db.lists.toArray();
  }

  async getList(id: string): Promise<TodoList | undefined> {
    return this.db.lists.where('id').equals(id).first();
  }

  async saveList(list: TodoList): Promise<void> {
    await this.db.lists.put(list);
  }

  async deleteList(id: string): Promise<void> {
    await this.db.transaction('rw', [this.db.lists, this.db.items], async () => {
      await this.db.lists.where('id').equals(id).delete();
      await this.db.items.where('listId').equals(id).delete();
    });
  }

  // ===== ITEMS OPERATIONS =====

  async getItems(listId?: string): Promise<TodoItem[]> {
    if (listId) {
      return this.db.items.where('listId').equals(listId).toArray();
    }
    return this.db.items.toArray();
  }

  async getItem(id: string): Promise<TodoItem | undefined> {
    return this.db.items.where('id').equals(id).first();
  }

  async saveItem(item: TodoItem): Promise<void> {
    await this.db.items.put(item);
  }

  async deleteItem(id: string): Promise<void> {
    await this.db.items.where('id').equals(id).delete();
  }

  async updateItemStatus(id: string, status: TodoItem['status']): Promise<void> {
    await this.db.items.where('id').equals(id).modify({ status, updatedAt: new Date().toISOString() });
  }

  // ===== OFFLINE ACTIONS =====

  async addOfflineAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'synced' | 'retryCount'>): Promise<void> {
    await this.db.offlineActions.add({
      ...action,
      timestamp: Date.now(),
      synced: false,
      retryCount: 0
    });
  }

  async getPendingActions(): Promise<OfflineAction[]> {
    return this.db.offlineActions.where('synced').equals(false).toArray();
  }

  async markActionSynced(id: number): Promise<void> {
    await this.db.offlineActions.update(id, { synced: true });
  }

  async incrementRetryCount(id: number, error?: string): Promise<void> {
    const action = await this.db.offlineActions.get(id);
    if (action) {
      await this.db.offlineActions.update(id, {
        retryCount: action.retryCount + 1,
        lastError: error
      });
    }
  }

  async clearSyncedActions(): Promise<void> {
    await this.db.offlineActions.where('synced').equals(true).delete();
  }

  // ===== CACHING =====

  async cacheResponse(url: string, method: string, data: any, ttl: number = 300000): Promise<void> {
    const expiresAt = Date.now() + ttl;
    await this.db.cachedResponses.put({
      url,
      method,
      data,
      timestamp: Date.now(),
      expiresAt
    });
  }

  async getCachedResponse(url: string, method: string): Promise<any | null> {
    const cached = await this.db.cachedResponses
      .where(['url', 'method'])
      .equals([url, method])
      .first();

    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    if (cached) {
      // Remove expired cache
      await this.db.cachedResponses.delete(cached.id!);
    }

    return null;
  }

  async clearExpiredCache(): Promise<void> {
    await this.db.cachedResponses.where('expiresAt').below(Date.now()).delete();
  }

  // ===== USER PREFERENCES =====

  async getUserPreferences(userId: string): Promise<UserPreferences | undefined> {
    return this.db.userPreferences.where('userId').equals(userId).first();
  }

  async saveUserPreferences(preferences: UserPreferences): Promise<void> {
    preferences.updatedAt = Date.now();
    await this.db.userPreferences.put(preferences);
  }

  // ===== SEARCH =====

  async searchLists(query: string): Promise<TodoList[]> {
    const lowerQuery = query.toLowerCase();
    return this.db.lists
      .filter(list => 
        list.title.toLowerCase().includes(lowerQuery) ||
        (list.description && list.description.toLowerCase().includes(lowerQuery))
      )
      .toArray();
  }

  async searchItems(query: string): Promise<TodoItem[]> {
    const lowerQuery = query.toLowerCase();
    return this.db.items
      .filter(item => 
        item.title.toLowerCase().includes(lowerQuery) ||
        (item.description && item.description.toLowerCase().includes(lowerQuery))
      )
      .toArray();
  }

  // ===== STATISTICS =====

  async getStatistics(): Promise<{
    totalLists: number;
    totalItems: number;
    completedItems: number;
    pendingActions: number;
    cacheSize: number;
  }> {
    const [totalLists, totalItems, completedItems, pendingActions, cacheSize] = await Promise.all([
      this.db.lists.count(),
      this.db.items.count(),
      this.db.items.where('status').equals('completed').count(),
      this.db.offlineActions.where('synced').equals(false).count(),
      this.db.cachedResponses.count()
    ]);

    return {
      totalLists,
      totalItems,
      completedItems,
      pendingActions,
      cacheSize
    };
  }

  // ===== MAINTENANCE =====

  async clearAllData(): Promise<void> {
    await this.db.transaction('rw', this.db.tables, async () => {
      await Promise.all(this.db.tables.map(table => table.clear()));
    });
  }

  async exportData(): Promise<any> {
    const [lists, items, preferences] = await Promise.all([
      this.db.lists.toArray(),
      this.db.items.toArray(),
      this.db.userPreferences.toArray()
    ]);

    return {
      lists,
      items,
      preferences,
      exportedAt: new Date().toISOString()
    };
  }

  async importData(data: any): Promise<void> {
    await this.db.transaction('rw', [this.db.lists, this.db.items, this.db.userPreferences], async () => {
      if (data.lists) {
        await this.db.lists.bulkPut(data.lists);
      }
      if (data.items) {
        await this.db.items.bulkPut(data.items);
      }
      if (data.preferences) {
        await this.db.userPreferences.bulkPut(data.preferences);
      }
    });
  }

  /**
   * Get database instance for advanced operations
   */
  getDatabase(): AITodoDatabase {
    return this.db;
  }
}

/**
 * Global IndexedDB service instance
 */
export const indexedDBService = IndexedDBService.getInstance();

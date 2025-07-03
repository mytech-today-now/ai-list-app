/**
 * Memory Cache - High-performance in-memory cache with LRU eviction
 * SemanticType: MemoryCacheEngine
 * ExtensibleByAI: true
 * AIUseCases: ["Performance optimization", "Data caching", "State management"]
 */

export interface CacheEntry<T = unknown> {
  value: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  ttl?: number; // Time to live in milliseconds
}

export interface CacheStats {
  size: number;
  maxSize: number;
  hits: number;
  misses: number;
  hitRate: number;
  evictions: number;
  memoryUsage: number;
}

export class MemoryCache {
  private cache: Map<string, CacheEntry> = new Map();
  private accessOrder: string[] = []; // For LRU tracking
  private maxSize: number;
  private stats: Omit<CacheStats, 'hitRate' | 'memoryUsage'> = {
    size: 0,
    maxSize: 0,
    hits: 0,
    misses: 0,
    evictions: 0,
  };

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
    this.stats.maxSize = maxSize;

    // Clean up expired entries every 5 minutes
    setInterval(() => this.cleanupExpired(), 5 * 60 * 1000);
  }

  /**
   * Set a value in the cache
   */
  set<T>(key: string, value: T, ttl?: number): void {
    const now = Date.now();
    
    // Remove existing entry if it exists
    if (this.cache.has(key)) {
      this.removeFromAccessOrder(key);
    } else if (this.cache.size >= this.maxSize) {
      // Evict least recently used item
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      value,
      timestamp: now,
      accessCount: 0,
      lastAccessed: now,
      ttl,
    };

    this.cache.set(key, entry);
    this.accessOrder.push(key);
    this.stats.size = this.cache.size;
  }

  /**
   * Get a value from the cache
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    
    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    // Check if entry is expired
    if (this.isExpired(entry)) {
      this.delete(key);
      this.stats.misses++;
      return undefined;
    }

    // Update access information
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    
    // Move to end of access order (most recently used)
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);
    
    this.stats.hits++;
    return entry.value;
  }

  /**
   * Check if a key exists in the cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    if (this.isExpired(entry)) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete a key from the cache
   */
  delete(key: string): boolean {
    const existed = this.cache.delete(key);
    
    if (existed) {
      this.removeFromAccessOrder(key);
      this.stats.size = this.cache.size;
    }
    
    return existed;
  }

  /**
   * Clear all entries from the cache
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    this.stats.size = 0;
    this.stats.evictions = 0;
  }

  /**
   * Get all keys in the cache
   */
  keys(): string[] {
    return Array.from(this.cache.keys()).filter(key => {
      const entry = this.cache.get(key);
      return entry && !this.isExpired(entry);
    });
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;
    
    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 100) / 100,
      memoryUsage: this.estimateMemoryUsage(),
    };
  }

  /**
   * Get entries by pattern
   */
  getByPattern(pattern: RegExp): Map<string, unknown> {
    const results = new Map<string, unknown>();
    
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        const value = this.get(key);
        if (value !== undefined) {
          results.set(key, value);
        }
      }
    }
    
    return results;
  }

  /**
   * Set multiple values at once
   */
  setMultiple<T>(entries: Map<string, T>, ttl?: number): void {
    for (const [key, value] of entries) {
      this.set(key, value, ttl);
    }
  }

  /**
   * Get multiple values at once
   */
  getMultiple<T>(keys: string[]): Map<string, T> {
    const results = new Map<string, T>();
    
    for (const key of keys) {
      const value = this.get<T>(key);
      if (value !== undefined) {
        results.set(key, value);
      }
    }
    
    return results;
  }

  /**
   * Update TTL for an existing entry
   */
  updateTTL(key: string, ttl: number): boolean {
    const entry = this.cache.get(key);
    
    if (!entry || this.isExpired(entry)) {
      return false;
    }
    
    entry.ttl = ttl;
    entry.timestamp = Date.now(); // Reset timestamp for new TTL
    return true;
  }

  /**
   * Get entry metadata
   */
  getMetadata(key: string): Omit<CacheEntry, 'value'> | undefined {
    const entry = this.cache.get(key);
    
    if (!entry || this.isExpired(entry)) {
      return undefined;
    }
    
    return {
      timestamp: entry.timestamp,
      accessCount: entry.accessCount,
      lastAccessed: entry.lastAccessed,
      ttl: entry.ttl,
    };
  }

  /**
   * Check if an entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    if (!entry.ttl) {
      return false;
    }
    
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Remove key from access order array
   */
  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  /**
   * Evict least recently used item
   */
  private evictLRU(): void {
    if (this.accessOrder.length === 0) {
      return;
    }
    
    const lruKey = this.accessOrder[0];
    this.cache.delete(lruKey);
    this.accessOrder.shift();
    this.stats.evictions++;
    this.stats.size = this.cache.size;
  }

  /**
   * Clean up expired entries
   */
  private cleanupExpired(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        expiredKeys.push(key);
      }
    }
    
    for (const key of expiredKeys) {
      this.delete(key);
    }
    
    if (expiredKeys.length > 0) {
      console.log(`Cleaned up ${expiredKeys.length} expired cache entries`);
    }
  }

  /**
   * Estimate memory usage (rough calculation)
   */
  private estimateMemoryUsage(): number {
    let totalSize = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      // Rough estimation: key size + value size + metadata
      totalSize += key.length * 2; // UTF-16 characters
      totalSize += JSON.stringify(entry.value).length * 2;
      totalSize += 64; // Estimated metadata size
    }
    
    return totalSize;
  }

  /**
   * Get cache status
   */
  getStatus(): object {
    return {
      status: 'active',
      stats: this.getStats(),
      config: {
        maxSize: this.maxSize,
      },
    };
  }
}

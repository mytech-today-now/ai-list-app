import { LRUCache } from 'lru-cache'
import { createHash } from 'crypto'

/**
 * SemanticType: PerformanceCacheLayer
 * Description: Advanced caching and performance optimization for repository operations
 * ExtensibleByAI: true
 * AIUseCases:
 *   - Add intelligent cache warming strategies
 *   - Implement predictive caching based on usage patterns
 *   - Add cache analytics and optimization recommendations
 *   - Integrate with distributed caching systems
 */

/**
 * Cache configuration options
 */
export interface CacheOptions {
  maxSize?: number
  ttl?: number // Time to live in milliseconds
  staleWhileRevalidate?: number
  updateAgeOnGet?: boolean
  allowStale?: boolean
}

/**
 * Cache key generation options
 */
export interface CacheKeyOptions {
  prefix?: string
  includeParams?: boolean
  customKey?: string
}

/**
 * Performance metrics for monitoring
 */
export interface PerformanceMetrics {
  queryCount: number
  cacheHits: number
  cacheMisses: number
  averageQueryTime: number
  slowQueries: Array<{
    query: string
    duration: number
    timestamp: Date
  }>
  connectionPoolStats: {
    active: number
    idle: number
    waiting: number
  }
}

/**
 * Query performance data
 */
export interface QueryPerformance {
  query: string
  duration: number
  timestamp: Date
  cacheHit: boolean
  resultSize: number
}

/**
 * Cache statistics
 */
export interface CacheStats {
  size: number
  maxSize: number
  hitRate: number
  missRate: number
  evictions: number
  sets: number
  gets: number
}

/**
 * Advanced caching layer with LRU and TTL support
 */
export class RepositoryCache {
  private cache: LRUCache<string, any>
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    gets: 0,
    evictions: 0
  }

  constructor(options: CacheOptions = {}) {
    this.cache = new LRUCache({
      max: options.maxSize || 1000,
      ttl: options.ttl || 5 * 60 * 1000, // 5 minutes default
      staleWhileRevalidate: options.staleWhileRevalidate || 60 * 1000, // 1 minute
      updateAgeOnGet: options.updateAgeOnGet !== false,
      allowStale: options.allowStale !== false,
      dispose: () => {
        this.stats.evictions++
      }
    })
  }

  /**
   * Generate cache key from query and parameters
   */
  generateKey(
    operation: string,
    params: any = {},
    options: CacheKeyOptions = {}
  ): string {
    if (options.customKey) {
      return options.customKey
    }

    const prefix = options.prefix || 'repo'
    const baseKey = `${prefix}:${operation}`
    
    if (!options.includeParams && Object.keys(params).length === 0) {
      return baseKey
    }

    // Create deterministic hash of parameters
    const paramString = JSON.stringify(params, Object.keys(params).sort())
    const paramHash = createHash('md5').update(paramString).digest('hex').substring(0, 8)
    
    return `${baseKey}:${paramHash}`
  }

  /**
   * Get value from cache
   */
  get<T>(key: string): T | undefined {
    this.stats.gets++
    const value = this.cache.get(key)
    
    if (value !== undefined) {
      this.stats.hits++
      return value
    } else {
      this.stats.misses++
      return undefined
    }
  }

  /**
   * Set value in cache
   */
  set<T>(key: string, value: T, ttl?: number): void {
    this.stats.sets++
    
    if (ttl) {
      this.cache.set(key, value, { ttl })
    } else {
      this.cache.set(key, value)
    }
  }

  /**
   * Delete value from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear()
    this.resetStats()
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    return this.cache.has(key)
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const hitRate = this.stats.gets > 0 ? (this.stats.hits / this.stats.gets) * 100 : 0
    const missRate = this.stats.gets > 0 ? (this.stats.misses / this.stats.gets) * 100 : 0

    return {
      size: this.cache.size,
      maxSize: this.cache.max,
      hitRate: Math.round(hitRate * 100) / 100,
      missRate: Math.round(missRate * 100) / 100,
      evictions: this.stats.evictions,
      sets: this.stats.sets,
      gets: this.stats.gets
    }
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      gets: 0,
      evictions: 0
    }
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size
  }

  /**
   * Invalidate cache entries by pattern
   */
  invalidatePattern(pattern: string): number {
    let invalidated = 0
    const regex = new RegExp(pattern)
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key)
        invalidated++
      }
    }
    
    return invalidated
  }
}

/**
 * Performance monitoring and metrics collection
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    queryCount: 0,
    cacheHits: 0,
    cacheMisses: 0,
    averageQueryTime: 0,
    slowQueries: [],
    connectionPoolStats: {
      active: 0,
      idle: 0,
      waiting: 0
    }
  }

  private queryTimes: number[] = []
  private slowQueryThreshold = 1000 // 1 second

  /**
   * Record query performance
   */
  recordQuery(performance: QueryPerformance): void {
    this.metrics.queryCount++
    this.queryTimes.push(performance.duration)
    
    if (performance.cacheHit) {
      this.metrics.cacheHits++
    } else {
      this.metrics.cacheMisses++
    }

    // Track slow queries
    if (performance.duration > this.slowQueryThreshold) {
      this.metrics.slowQueries.push({
        query: performance.query,
        duration: performance.duration,
        timestamp: performance.timestamp
      })

      // Keep only last 100 slow queries
      if (this.metrics.slowQueries.length > 100) {
        this.metrics.slowQueries = this.metrics.slowQueries.slice(-100)
      }
    }

    // Update average query time
    this.metrics.averageQueryTime = 
      this.queryTimes.reduce((sum, time) => sum + time, 0) / this.queryTimes.length

    // Keep only last 1000 query times for average calculation
    if (this.queryTimes.length > 1000) {
      this.queryTimes = this.queryTimes.slice(-1000)
    }
  }

  /**
   * Update connection pool statistics
   */
  updateConnectionPoolStats(stats: { active: number; idle: number; waiting: number }): void {
    this.metrics.connectionPoolStats = stats
  }

  /**
   * Get current metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  /**
   * Get cache hit rate
   */
  getCacheHitRate(): number {
    const total = this.metrics.cacheHits + this.metrics.cacheMisses
    return total > 0 ? (this.metrics.cacheHits / total) * 100 : 0
  }

  /**
   * Get slow queries
   */
  getSlowQueries(limit = 10): Array<{ query: string; duration: number; timestamp: Date }> {
    return this.metrics.slowQueries
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit)
  }

  /**
   * Reset metrics
   */
  reset(): void {
    this.metrics = {
      queryCount: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageQueryTime: 0,
      slowQueries: [],
      connectionPoolStats: {
        active: 0,
        idle: 0,
        waiting: 0
      }
    }
    this.queryTimes = []
  }

  /**
   * Set slow query threshold
   */
  setSlowQueryThreshold(threshold: number): void {
    this.slowQueryThreshold = threshold
  }
}

/**
 * Cached repository mixin for performance optimization
 */
export class CachedRepositoryMixin {
  protected cache: RepositoryCache
  protected monitor: PerformanceMonitor
  protected cacheEnabled = true

  constructor(cacheOptions: CacheOptions = {}) {
    this.cache = new RepositoryCache(cacheOptions)
    this.monitor = new PerformanceMonitor()
  }

  /**
   * Execute query with caching
   */
  protected async executeWithCache<T>(
    operation: string,
    queryFn: () => Promise<T>,
    params: any = {},
    cacheOptions: CacheKeyOptions & { ttl?: number } = {}
  ): Promise<T> {
    const startTime = Date.now()
    const cacheKey = this.cache.generateKey(operation, params, cacheOptions)
    
    // Try to get from cache first
    if (this.cacheEnabled) {
      const cached = this.cache.get<T>(cacheKey)
      if (cached !== undefined) {
        const duration = Date.now() - startTime
        
        this.monitor.recordQuery({
          query: operation,
          duration,
          timestamp: new Date(),
          cacheHit: true,
          resultSize: this.getResultSize(cached)
        })
        
        return cached
      }
    }

    // Execute query
    const result = await queryFn()
    const duration = Date.now() - startTime
    
    // Cache the result
    if (this.cacheEnabled && result !== null && result !== undefined) {
      this.cache.set(cacheKey, result, cacheOptions.ttl)
    }

    // Record performance metrics
    this.monitor.recordQuery({
      query: operation,
      duration,
      timestamp: new Date(),
      cacheHit: false,
      resultSize: this.getResultSize(result)
    })

    return result
  }

  /**
   * Invalidate cache for specific patterns
   */
  protected invalidateCache(patterns: string[]): void {
    for (const pattern of patterns) {
      this.cache.invalidatePattern(pattern)
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats {
    return this.cache.getStats()
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return this.monitor.getMetrics()
  }

  /**
   * Enable or disable caching
   */
  setCacheEnabled(enabled: boolean): void {
    this.cacheEnabled = enabled
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * Warm cache with common queries
   */
  async warmCache(warmupQueries: Array<() => Promise<any>>): Promise<void> {
    console.log(`🔥 Warming cache with ${warmupQueries.length} queries...`)
    
    for (const query of warmupQueries) {
      try {
        await query()
      } catch (error) {
        console.warn('Cache warmup query failed:', error)
      }
    }
    
    console.log('✅ Cache warmup completed')
  }

  /**
   * Get result size for metrics
   */
  private getResultSize(result: any): number {
    if (Array.isArray(result)) {
      return result.length
    } else if (result && typeof result === 'object') {
      return 1
    } else {
      return 0
    }
  }
}

/**
 * Global cache and monitor instances
 */
export const globalCache = new RepositoryCache({
  maxSize: 5000,
  ttl: 10 * 60 * 1000, // 10 minutes
  staleWhileRevalidate: 2 * 60 * 1000 // 2 minutes
})

export const globalMonitor = new PerformanceMonitor()

/**
 * Cache invalidation strategies
 */
export class CacheInvalidationStrategy {
  /**
   * Invalidate cache on entity changes
   */
  static onEntityChange(entityType: string, operation: 'create' | 'update' | 'delete'): string[] {
    const patterns = [
      `repo:${entityType}:.*`,
      `repo:${entityType}_.*`,
      `repo:.*_${entityType}:.*`
    ]

    // For updates and deletes, also invalidate related entities
    if (operation === 'update' || operation === 'delete') {
      patterns.push(`repo:.*:.*${entityType}.*`)
    }

    return patterns
  }

  /**
   * Invalidate cache on relationship changes
   */
  static onRelationshipChange(parentEntity: string, childEntity: string): string[] {
    return [
      `repo:${parentEntity}:.*`,
      `repo:${childEntity}:.*`,
      `repo:.*_${parentEntity}_.*`,
      `repo:.*_${childEntity}_.*`
    ]
  }

  /**
   * Time-based invalidation patterns
   */
  static timeBasedPatterns(entityType: string): string[] {
    return [
      `repo:${entityType}:recent.*`,
      `repo:${entityType}:today.*`,
      `repo:${entityType}:stats.*`
    ]
  }
}

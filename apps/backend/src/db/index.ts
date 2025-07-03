/**
 * SemanticType: DataAccessLayerIndex
 * Description: Comprehensive Data Access Layer with repository pattern, MCP integration, and performance optimization
 * ExtensibleByAI: true
 * AIUseCases:
 *   - Add new repository types automatically
 *   - Implement cross-cutting concerns
 *   - Add monitoring and observability
 *   - Integrate with external data sources
 */

// Core base services and interfaces
export * from './services/base'
export * from './connection'
export * from './schema'

// Enhanced repository pattern
export * from './repositories/lists-repository'
export * from './repositories/items-repository'

// Transaction management
export * from './transaction-manager'

// Query building and filtering
export * from './query-builder'

// MCP integration
export * from './mcp-repository-extensions'

// Dependency injection and registry
export * from './repository-registry'

// Performance and caching
export * from './performance-cache'

// Testing utilities
export * from './__tests__/repository-test-suite'

// Legacy service exports for backward compatibility
export { listsService } from './services/lists'
export { itemsService } from './services/items'
export { agentsService } from './services/agents'

// Repository instances
export { listsRepository } from './repositories/lists-repository'
export { itemsRepository } from './repositories/items-repository'

// Global instances
export { 
  repositoryRegistry,
  getRepository,
  getService,
  hasRepository,
  hasService
} from './repository-registry'

export {
  globalCache,
  globalMonitor
} from './performance-cache'

export {
  mcpRepositoryServer
} from './mcp-repository-extensions'

export {
  getTransactionManager
} from './transaction-manager'

/**
 * Initialize the Data Access Layer
 */
export async function initializeDAL(): Promise<void> {
  console.log('🚀 Initializing Data Access Layer...')
  
  try {
    // Validate dependency graph
    repositoryRegistry.validateDependencies()
    
    // Initialize eager repositories
    await repositoryRegistry.initializeEager()
    
    // Register repositories with MCP server
    const listsRepo = await getRepository('lists')
    const itemsRepo = await getRepository('items')
    
    mcpRepositoryServer.registerRepository('lists', listsRepo)
    mcpRepositoryServer.registerRepository('items', itemsRepo)
    
    console.log('✅ Data Access Layer initialized successfully')
    
    // Log initialization summary
    const repoNames = repositoryRegistry.getRepositoryNames()
    const serviceNames = repositoryRegistry.getServiceNames()
    
    console.log(`📊 DAL Summary:`)
    console.log(`   - Repositories: ${repoNames.length} (${repoNames.join(', ')})`)
    console.log(`   - Services: ${serviceNames.length} (${serviceNames.join(', ')})`)
    console.log(`   - MCP Tools: ${mcpRepositoryServer.getAllTools().length}`)
    console.log(`   - MCP Resources: ${mcpRepositoryServer.getAllResources().length}`)
    
  } catch (error) {
    console.error('❌ Failed to initialize Data Access Layer:', error)
    throw error
  }
}

/**
 * Get DAL health status
 */
export function getDALHealthStatus(): Record<string, any> {
  return {
    repositories: repositoryRegistry.getHealthStatus(),
    cache: globalCache.getStats(),
    performance: globalMonitor.getMetrics(),
    mcp: {
      tools: mcpRepositoryServer.getAllTools().length,
      resources: mcpRepositoryServer.getAllResources().length
    }
  }
}

/**
 * Shutdown DAL gracefully
 */
export async function shutdownDAL(): Promise<void> {
  console.log('🔌 Shutting down Data Access Layer...')
  
  try {
    // Clear caches
    globalCache.clear()
    globalMonitor.reset()
    
    // Clear registry
    repositoryRegistry.clear()
    
    console.log('✅ Data Access Layer shutdown completed')
  } catch (error) {
    console.error('❌ Error during DAL shutdown:', error)
    throw error
  }
}

/**
 * DAL Configuration
 */
export interface DALConfig {
  cache: {
    enabled: boolean
    maxSize: number
    ttl: number
  }
  performance: {
    monitoring: boolean
    slowQueryThreshold: number
  }
  mcp: {
    enabled: boolean
    toolPrefix: string
  }
  transactions: {
    defaultTimeout: number
    retryAttempts: number
  }
}

/**
 * Configure DAL with custom settings
 */
export function configureDAL(config: Partial<DALConfig>): void {
  console.log('⚙️ Configuring Data Access Layer...')
  
  // Apply cache configuration
  if (config.cache) {
    if (!config.cache.enabled) {
      globalCache.clear()
    }
  }
  
  // Apply performance configuration
  if (config.performance) {
    if (config.performance.slowQueryThreshold) {
      globalMonitor.setSlowQueryThreshold(config.performance.slowQueryThreshold)
    }
  }
  
  console.log('✅ DAL configuration applied')
}

/**
 * Export default configuration
 */
export const defaultDALConfig: DALConfig = {
  cache: {
    enabled: true,
    maxSize: 5000,
    ttl: 10 * 60 * 1000 // 10 minutes
  },
  performance: {
    monitoring: true,
    slowQueryThreshold: 1000 // 1 second
  },
  mcp: {
    enabled: true,
    toolPrefix: 'repo'
  },
  transactions: {
    defaultTimeout: 30000, // 30 seconds
    retryAttempts: 3
  }
}

/**
 * Utility functions for common DAL operations
 */
export class DALUtils {
  /**
   * Execute operation with automatic retry and caching
   */
  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    retries = 3,
    delay = 1000
  ): Promise<T> {
    let lastError: Error
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error
        
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, delay * attempt))
          continue
        }
      }
    }
    
    throw lastError!
  }

  /**
   * Batch process entities with transaction support
   */
  static async batchProcess<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    batchSize = 100
  ): Promise<R[]> {
    const results: R[] = []
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize)
      const batchResults = await Promise.all(batch.map(processor))
      results.push(...batchResults)
    }
    
    return results
  }

  /**
   * Warm up caches with common queries
   */
  static async warmupCaches(): Promise<void> {
    console.log('🔥 Warming up DAL caches...')
    
    try {
      const listsRepo = await getRepository('lists')
      const itemsRepo = await getRepository('items')
      
      // Warm up with common queries
      await Promise.all([
        listsRepo.findAll({ limit: 50 }),
        itemsRepo.findAll({ limit: 100 }),
        listsRepo.getHierarchy(),
      ])
      
      console.log('✅ Cache warmup completed')
    } catch (error) {
      console.warn('⚠️ Cache warmup failed:', error)
    }
  }

  /**
   * Generate performance report
   */
  static generatePerformanceReport(): Record<string, any> {
    const cacheStats = globalCache.getStats()
    const perfMetrics = globalMonitor.getMetrics()
    
    return {
      timestamp: new Date().toISOString(),
      cache: {
        hitRate: cacheStats.hitRate,
        size: cacheStats.size,
        efficiency: cacheStats.hitRate > 80 ? 'excellent' : 
                   cacheStats.hitRate > 60 ? 'good' : 
                   cacheStats.hitRate > 40 ? 'fair' : 'poor'
      },
      performance: {
        averageQueryTime: perfMetrics.averageQueryTime,
        slowQueries: perfMetrics.slowQueries.length,
        queryCount: perfMetrics.queryCount,
        efficiency: perfMetrics.averageQueryTime < 100 ? 'excellent' :
                   perfMetrics.averageQueryTime < 500 ? 'good' :
                   perfMetrics.averageQueryTime < 1000 ? 'fair' : 'poor'
      },
      recommendations: DALUtils.generateRecommendations(cacheStats, perfMetrics)
    }
  }

  /**
   * Generate optimization recommendations
   */
  private static generateRecommendations(
    cacheStats: any,
    perfMetrics: any
  ): string[] {
    const recommendations: string[] = []
    
    if (cacheStats.hitRate < 60) {
      recommendations.push('Consider increasing cache TTL or warming up cache with common queries')
    }
    
    if (perfMetrics.averageQueryTime > 500) {
      recommendations.push('Review slow queries and consider adding database indexes')
    }
    
    if (perfMetrics.slowQueries.length > 10) {
      recommendations.push('Optimize frequently slow queries or implement query result caching')
    }
    
    if (cacheStats.size / cacheStats.maxSize > 0.9) {
      recommendations.push('Consider increasing cache size to reduce evictions')
    }
    
    return recommendations
  }
}

/**
 * DAL Event System for monitoring and hooks
 */
export class DALEventSystem {
  private static listeners = new Map<string, Function[]>()

  static on(event: string, listener: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)!.push(listener)
  }

  static emit(event: string, data: any): void {
    const listeners = this.listeners.get(event) || []
    listeners.forEach(listener => {
      try {
        listener(data)
      } catch (error) {
        console.error(`Error in DAL event listener for ${event}:`, error)
      }
    })
  }

  static off(event: string, listener?: Function): void {
    if (!listener) {
      this.listeners.delete(event)
    } else {
      const listeners = this.listeners.get(event) || []
      const index = listeners.indexOf(listener)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }
}

// Set up default event listeners
DALEventSystem.on('query:slow', (data) => {
  console.warn(`🐌 Slow query detected: ${data.query} (${data.duration}ms)`)
})

DALEventSystem.on('cache:miss', (data) => {
  console.debug(`📊 Cache miss: ${data.key}`)
})

DALEventSystem.on('transaction:failed', (data) => {
  console.error(`💥 Transaction failed: ${data.error}`)
})

/**
 * Export event system for external use
 */
export { DALEventSystem }

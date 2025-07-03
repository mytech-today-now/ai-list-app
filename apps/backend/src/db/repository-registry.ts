import { BaseService } from './services/base'
import { MCPAwareRepository } from './mcp-repository-extensions'

/**
 * SemanticType: RepositoryRegistry
 * Description: Dependency injection container and registry for repository management
 * ExtensibleByAI: true
 * AIUseCases:
 *   - Add automatic repository discovery
 *   - Implement repository lifecycle management
 *   - Add repository health monitoring
 *   - Integrate with service mesh patterns
 */

/**
 * Repository interface for type safety
 */
export interface IRepository<TEntity, TCreateEntity> {
  findById(id: string): Promise<TEntity | null>
  findAll(options?: any): Promise<TEntity[]>
  create(data: TCreateEntity): Promise<TEntity>
  updateById(id: string, data: Partial<TCreateEntity>): Promise<TEntity | null>
  deleteById(id: string): Promise<boolean>
  count(where?: any): Promise<number>
}

/**
 * Repository metadata for registration
 */
export interface RepositoryMetadata {
  name: string
  entityType: string
  version: string
  description: string
  dependencies: string[]
  singleton: boolean
  lazy: boolean
}

/**
 * Repository factory function type
 */
export type RepositoryFactory<T> = () => T | Promise<T>

/**
 * Repository registration entry
 */
interface RepositoryEntry<T = any> {
  metadata: RepositoryMetadata
  factory: RepositoryFactory<T>
  instance?: T
  initialized: boolean
  dependencies: string[]
}

/**
 * Dependency injection scope
 */
export type DIScope = 'singleton' | 'transient' | 'scoped'

/**
 * Service registration options
 */
export interface ServiceRegistrationOptions {
  scope?: DIScope
  lazy?: boolean
  tags?: string[]
  metadata?: Record<string, any>
}

/**
 * Repository Registry with Dependency Injection
 */
export class RepositoryRegistry {
  private static instance: RepositoryRegistry
  private repositories = new Map<string, RepositoryEntry>()
  private services = new Map<string, any>()
  private scopes = new Map<string, DIScope>()
  private initializing = new Set<string>()

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): RepositoryRegistry {
    if (!RepositoryRegistry.instance) {
      RepositoryRegistry.instance = new RepositoryRegistry()
    }
    return RepositoryRegistry.instance
  }

  /**
   * Register a repository with metadata
   */
  register<T>(
    name: string,
    factory: RepositoryFactory<T>,
    metadata: Partial<RepositoryMetadata> = {}
  ): void {
    const fullMetadata: RepositoryMetadata = {
      name,
      entityType: metadata.entityType || name,
      version: metadata.version || '1.0.0',
      description: metadata.description || `Repository for ${name}`,
      dependencies: metadata.dependencies || [],
      singleton: metadata.singleton !== false,
      lazy: metadata.lazy !== false
    }

    this.repositories.set(name, {
      metadata: fullMetadata,
      factory,
      initialized: false,
      dependencies: fullMetadata.dependencies
    })

    console.log(`📦 Registered repository: ${name}`)
  }

  /**
   * Register a service with DI container
   */
  registerService<T>(
    name: string,
    factory: RepositoryFactory<T>,
    options: ServiceRegistrationOptions = {}
  ): void {
    this.services.set(name, {
      factory,
      instance: null,
      options: {
        scope: options.scope || 'singleton',
        lazy: options.lazy !== false,
        tags: options.tags || [],
        metadata: options.metadata || {}
      }
    })

    this.scopes.set(name, options.scope || 'singleton')
    console.log(`🔧 Registered service: ${name} (${options.scope || 'singleton'})`)
  }

  /**
   * Get repository instance with dependency injection
   */
  async get<T>(name: string): Promise<T> {
    const entry = this.repositories.get(name)
    if (!entry) {
      throw new Error(`Repository '${name}' not found. Available: ${Array.from(this.repositories.keys()).join(', ')}`)
    }

    // Check for circular dependencies
    if (this.initializing.has(name)) {
      throw new Error(`Circular dependency detected for repository '${name}'`)
    }

    // Return existing instance if singleton and already initialized
    if (entry.metadata.singleton && entry.instance) {
      return entry.instance
    }

    this.initializing.add(name)

    try {
      // Initialize dependencies first
      const dependencies: any[] = []
      for (const depName of entry.dependencies) {
        const dependency = await this.get(depName)
        dependencies.push(dependency)
      }

      // Create instance
      const instance = await entry.factory()
      
      // Inject dependencies if the instance has an inject method
      if (instance && typeof (instance as any).inject === 'function') {
        await (instance as any).inject(dependencies)
      }

      // Store instance if singleton
      if (entry.metadata.singleton) {
        entry.instance = instance
        entry.initialized = true
      }

      return instance
    } finally {
      this.initializing.delete(name)
    }
  }

  /**
   * Get service instance with DI
   */
  async getService<T>(name: string): Promise<T> {
    const service = this.services.get(name)
    if (!service) {
      throw new Error(`Service '${name}' not found. Available: ${Array.from(this.services.keys()).join(', ')}`)
    }

    const scope = this.scopes.get(name) || 'singleton'

    switch (scope) {
      case 'singleton':
        if (!service.instance) {
          service.instance = await service.factory()
        }
        return service.instance

      case 'transient':
        return await service.factory()

      case 'scoped':
        // For now, treat scoped as singleton
        // In a real implementation, this would be tied to request/session scope
        if (!service.instance) {
          service.instance = await service.factory()
        }
        return service.instance

      default:
        throw new Error(`Unknown scope: ${scope}`)
    }
  }

  /**
   * Check if repository is registered
   */
  has(name: string): boolean {
    return this.repositories.has(name)
  }

  /**
   * Check if service is registered
   */
  hasService(name: string): boolean {
    return this.services.has(name)
  }

  /**
   * Get all registered repository names
   */
  getRepositoryNames(): string[] {
    return Array.from(this.repositories.keys())
  }

  /**
   * Get all registered service names
   */
  getServiceNames(): string[] {
    return Array.from(this.services.keys())
  }

  /**
   * Get repository metadata
   */
  getMetadata(name: string): RepositoryMetadata | undefined {
    return this.repositories.get(name)?.metadata
  }

  /**
   * Initialize all non-lazy repositories
   */
  async initializeEager(): Promise<void> {
    const eagerRepos = Array.from(this.repositories.entries())
      .filter(([_, entry]) => !entry.metadata.lazy)
      .map(([name, _]) => name)

    console.log(`🚀 Initializing ${eagerRepos.length} eager repositories...`)

    for (const name of eagerRepos) {
      try {
        await this.get(name)
        console.log(`✅ Initialized repository: ${name}`)
      } catch (error) {
        console.error(`❌ Failed to initialize repository ${name}:`, error)
        throw error
      }
    }
  }

  /**
   * Validate dependency graph
   */
  validateDependencies(): void {
    const visited = new Set<string>()
    const visiting = new Set<string>()

    const visit = (name: string): void => {
      if (visiting.has(name)) {
        throw new Error(`Circular dependency detected: ${Array.from(visiting).join(' -> ')} -> ${name}`)
      }

      if (visited.has(name)) {
        return
      }

      visiting.add(name)

      const entry = this.repositories.get(name)
      if (entry) {
        for (const dep of entry.dependencies) {
          if (!this.repositories.has(dep)) {
            throw new Error(`Repository '${name}' depends on '${dep}' which is not registered`)
          }
          visit(dep)
        }
      }

      visiting.delete(name)
      visited.add(name)
    }

    for (const name of this.repositories.keys()) {
      visit(name)
    }

    console.log('✅ Dependency graph validation passed')
  }

  /**
   * Get dependency graph visualization
   */
  getDependencyGraph(): Record<string, string[]> {
    const graph: Record<string, string[]> = {}
    
    for (const [name, entry] of this.repositories) {
      graph[name] = entry.dependencies
    }
    
    return graph
  }

  /**
   * Clear all registrations (for testing)
   */
  clear(): void {
    this.repositories.clear()
    this.services.clear()
    this.scopes.clear()
    this.initializing.clear()
  }

  /**
   * Get repository health status
   */
  getHealthStatus(): Record<string, any> {
    const status: Record<string, any> = {}
    
    for (const [name, entry] of this.repositories) {
      status[name] = {
        registered: true,
        initialized: entry.initialized,
        singleton: entry.metadata.singleton,
        lazy: entry.metadata.lazy,
        dependencies: entry.dependencies,
        hasInstance: !!entry.instance
      }
    }
    
    return status
  }

  /**
   * Create a scoped registry for testing
   */
  createScope(): RepositoryRegistry {
    const scopedRegistry = new RepositoryRegistry()
    
    // Copy registrations to scoped registry
    for (const [name, entry] of this.repositories) {
      scopedRegistry.repositories.set(name, {
        ...entry,
        instance: undefined,
        initialized: false
      })
    }
    
    for (const [name, service] of this.services) {
      scopedRegistry.services.set(name, {
        ...service,
        instance: null
      })
    }
    
    return scopedRegistry
  }
}

/**
 * Decorator for automatic repository registration
 */
export function Repository(metadata: Partial<RepositoryMetadata> = {}) {
  return function <T extends new (...args: any[]) => any>(constructor: T) {
    const registry = RepositoryRegistry.getInstance()
    const name = metadata.name || constructor.name.replace('Repository', '').toLowerCase()
    
    registry.register(
      name,
      () => new constructor(),
      {
        ...metadata,
        name,
        entityType: metadata.entityType || name
      }
    )
    
    return constructor
  }
}

/**
 * Decorator for dependency injection
 */
export function Inject(repositoryName: string) {
  return function (target: any, propertyKey: string) {
    if (!target._injections) {
      target._injections = []
    }
    target._injections.push({ propertyKey, repositoryName })
  }
}

/**
 * Service decorator for automatic service registration
 */
export function Service(options: ServiceRegistrationOptions = {}) {
  return function <T extends new (...args: any[]) => any>(constructor: T) {
    const registry = RepositoryRegistry.getInstance()
    const name = options.metadata?.name || constructor.name.toLowerCase()
    
    registry.registerService(
      name,
      () => new constructor(),
      options
    )
    
    return constructor
  }
}

/**
 * Global registry instance
 */
export const repositoryRegistry = RepositoryRegistry.getInstance()

/**
 * Convenience functions
 */
export const getRepository = <T>(name: string): Promise<T> => repositoryRegistry.get<T>(name)
export const getService = <T>(name: string): Promise<T> => repositoryRegistry.getService<T>(name)
export const hasRepository = (name: string): boolean => repositoryRegistry.has(name)
export const hasService = (name: string): boolean => repositoryRegistry.hasService(name)

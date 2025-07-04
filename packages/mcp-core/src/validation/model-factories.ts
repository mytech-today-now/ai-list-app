import { faker } from '@faker-js/faker'
import { ValidationContext, validationRegistry } from './model-validators'

/**
 * Factory configuration options
 */
export interface FactoryOptions {
  count?: number
  overrides?: Record<string, any>
  relationships?: Record<string, any>
  validateConstraints?: boolean
  skipBusinessRules?: boolean
}

/**
 * Factory build result
 */
export interface FactoryResult<T> {
  success: boolean
  data?: T | T[]
  errors: string[]
  warnings: string[]
}

/**
 * Relationship configuration
 */
export interface RelationshipConfig {
  type: 'belongs_to' | 'has_many' | 'has_one'
  model: string
  foreignKey: string
  factory?: string
  required?: boolean
}

/**
 * Base factory class for generating test data
 */
export abstract class BaseFactory<T> {
  protected abstract modelName: string
  protected relationships: Map<string, RelationshipConfig> = new Map()
  protected sequences: Map<string, number> = new Map()

  /**
   * Generate a single instance
   */
  abstract generate(options?: FactoryOptions): T

  /**
   * Build and validate a single instance
   */
  async build(options: FactoryOptions = {}): Promise<FactoryResult<T>> {
    try {
      const data = this.generate(options)
      
      if (options.validateConstraints) {
        const validationResult = await this.validateData(data, options)
        if (!validationResult.success) {
          return {
            success: false,
            errors: validationResult.errors.map(e => e.message),
            warnings: validationResult.warnings.map(w => w.message)
          }
        }
      }

      return {
        success: true,
        data,
        errors: [],
        warnings: []
      }
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: []
      }
    }
  }

  /**
   * Build multiple instances
   */
  async buildMany(count: number, options: FactoryOptions = {}): Promise<FactoryResult<T[]>> {
    const results: T[] = []
    const errors: string[] = []
    const warnings: string[] = []

    for (let i = 0; i < count; i++) {
      const result = await this.build(options)
      
      if (result.success && result.data) {
        results.push(result.data as T)
      } else {
        errors.push(...result.errors)
      }
      
      warnings.push(...result.warnings)
    }

    return {
      success: errors.length === 0,
      data: results,
      errors,
      warnings
    }
  }

  /**
   * Create and persist instances (would integrate with actual database)
   */
  async create(options: FactoryOptions = {}): Promise<FactoryResult<T>> {
    const buildResult = await this.build(options)
    
    if (!buildResult.success) {
      return buildResult
    }

    // This would persist to database
    // For now, we'll just return the built data
    return buildResult
  }

  /**
   * Create and persist multiple instances
   */
  async createMany(count: number, options: FactoryOptions = {}): Promise<FactoryResult<T[]>> {
    const buildResult = await this.buildMany(count, options)
    
    if (!buildResult.success) {
      return buildResult
    }

    // This would persist to database
    // For now, we'll just return the built data
    return buildResult
  }

  /**
   * Validate generated data
   */
  protected async validateData(data: T, options: FactoryOptions): Promise<any> {
    const context: ValidationContext = {
      operation: 'create',
      skipBusinessRules: options.skipBusinessRules || false,
      skipConstraints: false
    }

    return await validationRegistry.validateCreate(this.modelName, data, context)
  }

  /**
   * Get next sequence value
   */
  protected sequence(name: string): number {
    const current = this.sequences.get(name) || 0
    const next = current + 1
    this.sequences.set(name, next)
    return next
  }

  /**
   * Reset sequence
   */
  protected resetSequence(name: string): void {
    this.sequences.set(name, 0)
  }

  /**
   * Add relationship configuration
   */
  protected addRelationship(name: string, config: RelationshipConfig): void {
    this.relationships.set(name, config)
  }

  /**
   * Generate related data
   */
  protected async generateRelated(relationshipName: string, options: FactoryOptions = {}): Promise<any> {
    const relationship = this.relationships.get(relationshipName)
    if (!relationship) {
      return null
    }

    // This would use the factory registry to create related data
    // For now, we'll simulate
    return null
  }
}

/**
 * List factory
 */
export class ListFactory extends BaseFactory<any> {
  protected modelName = 'list'

  constructor() {
    super()
    this.addRelationship('parent', {
      type: 'belongs_to',
      model: 'list',
      foreignKey: 'parentListId',
      factory: 'list',
      required: false
    })
  }

  generate(options: FactoryOptions = {}): any {
    const sequence = this.sequence('list')
    
    const baseData = {
      id: faker.string.uuid(),
      title: options.overrides?.title || `${faker.commerce.productName()} List ${sequence}`,
      description: options.overrides?.description || faker.lorem.paragraph(),
      parentListId: options.overrides?.parentListId || null,
      position: options.overrides?.position || sequence,
      priority: options.overrides?.priority || faker.helpers.arrayElement(['low', 'medium', 'high', 'urgent']),
      status: options.overrides?.status || 'active',
      createdBy: options.overrides?.createdBy || faker.string.uuid(),
      createdAt: options.overrides?.createdAt || faker.date.past(),
      updatedAt: options.overrides?.updatedAt || new Date(),
      completedAt: options.overrides?.completedAt || null,
      metadata: options.overrides?.metadata || {
        tags: faker.helpers.arrayElements(['work', 'personal', 'urgent', 'project'], { min: 0, max: 3 }),
        color: faker.color.rgb(),
        icon: faker.helpers.arrayElement(['📋', '📝', '✅', '🎯', '📊'])
      }
    }

    return { ...baseData, ...options.overrides }
  }

  /**
   * Generate a hierarchical list structure
   */
  async generateHierarchy(depth: number = 3, childrenPerLevel: number = 2): Promise<any[]> {
    const rootLists = await this.buildMany(2, { 
      overrides: { parentListId: null } 
    })

    if (!rootLists.success || !rootLists.data) {
      return []
    }

    const allLists = [...rootLists.data]

    for (let level = 1; level < depth; level++) {
      const parentLists = allLists.filter(list => 
        this.getListDepth(list, allLists) === level - 1
      )

      for (const parent of parentLists) {
        const children = await this.buildMany(childrenPerLevel, {
          overrides: { parentListId: parent.id }
        })

        if (children.success && children.data) {
          allLists.push(...children.data)
        }
      }
    }

    return allLists
  }

  private getListDepth(list: any, allLists: any[]): number {
    if (!list.parentListId) return 0
    
    const parent = allLists.find(l => l.id === list.parentListId)
    return parent ? this.getListDepth(parent, allLists) + 1 : 0
  }
}

/**
 * Item factory
 */
export class ItemFactory extends BaseFactory<any> {
  protected modelName = 'item'

  constructor() {
    super()
    this.addRelationship('list', {
      type: 'belongs_to',
      model: 'list',
      foreignKey: 'listId',
      factory: 'list',
      required: true
    })
  }

  generate(options: FactoryOptions = {}): any {
    const sequence = this.sequence('item')
    const now = new Date()
    
    const baseData = {
      id: faker.string.uuid(),
      listId: options.overrides?.listId || faker.string.uuid(),
      title: options.overrides?.title || `${faker.hacker.verb()} ${faker.hacker.noun()} ${sequence}`,
      description: options.overrides?.description || faker.lorem.sentences(2),
      position: options.overrides?.position || sequence,
      priority: options.overrides?.priority || faker.helpers.arrayElement(['low', 'medium', 'high', 'urgent']),
      status: options.overrides?.status || faker.helpers.arrayElement(['pending', 'in_progress', 'completed', 'cancelled', 'blocked']),
      dueDate: options.overrides?.dueDate || (faker.datatype.boolean() ? faker.date.future() : null),
      estimatedDuration: options.overrides?.estimatedDuration || faker.number.int({ min: 15, max: 480 }), // 15 minutes to 8 hours
      actualDuration: options.overrides?.actualDuration || null,
      tags: options.overrides?.tags || faker.helpers.arrayElements(['bug', 'feature', 'enhancement', 'documentation', 'testing'], { min: 0, max: 3 }),
      dependencies: options.overrides?.dependencies || [],
      createdBy: options.overrides?.createdBy || faker.string.uuid(),
      assignedTo: options.overrides?.assignedTo || (faker.datatype.boolean() ? faker.string.uuid() : null),
      createdAt: options.overrides?.createdAt || faker.date.past(),
      updatedAt: options.overrides?.updatedAt || now,
      completedAt: options.overrides?.completedAt || null,
      metadata: options.overrides?.metadata || {
        difficulty: faker.helpers.arrayElement(['easy', 'medium', 'hard']),
        category: faker.helpers.arrayElement(['development', 'design', 'testing', 'documentation', 'research']),
        source: faker.helpers.arrayElement(['user_request', 'bug_report', 'internal', 'external'])
      }
    }

    // Set completedAt if status is completed
    if (baseData.status === 'completed' && !baseData.completedAt) {
      baseData.completedAt = faker.date.between({ from: baseData.createdAt, to: now })
    }

    // Set actualDuration if completed
    if (baseData.status === 'completed' && !baseData.actualDuration && baseData.estimatedDuration) {
      baseData.actualDuration = faker.number.int({ 
        min: Math.floor(baseData.estimatedDuration * 0.5), 
        max: Math.floor(baseData.estimatedDuration * 1.5) 
      })
    }

    return { ...baseData, ...options.overrides }
  }

  /**
   * Generate items with dependencies
   */
  async generateWithDependencies(listId: string, itemCount: number = 5): Promise<any[]> {
    // Create items without dependencies first
    const itemsResult = await this.buildMany(itemCount, {
      overrides: { listId, dependencies: [] }
    })

    if (!itemsResult.success || !itemsResult.data) {
      return []
    }

    const items = itemsResult.data

    // Add some dependencies
    for (let i = 1; i < items.length; i++) {
      const dependencyCount = faker.number.int({ min: 0, max: Math.min(2, i) })
      const availableDependencies = items.slice(0, i)
      
      if (dependencyCount > 0 && availableDependencies.length > 0) {
        const dependencies = faker.helpers.arrayElements(
          availableDependencies.map(item => item.id),
          { min: 1, max: dependencyCount }
        )
        items[i].dependencies = dependencies
      }
    }

    return items
  }
}

/**
 * Agent factory
 */
export class AgentFactory extends BaseFactory<any> {
  protected modelName = 'agent'

  generate(options: FactoryOptions = {}): any {
    const sequence = this.sequence('agent')
    
    const baseData = {
      id: faker.string.uuid(),
      name: options.overrides?.name || `${faker.hacker.adjective()}-${faker.hacker.noun()}-agent-${sequence}`,
      role: options.overrides?.role || faker.helpers.arrayElement(['reader', 'executor', 'planner', 'admin']),
      status: options.overrides?.status || faker.helpers.arrayElement(['active', 'inactive', 'suspended']),
      permissions: options.overrides?.permissions || faker.helpers.arrayElements([
        'create', 'read', 'update', 'delete', 'execute', 'reorder', 'rename', 'status', 'mark_done'
      ], { min: 1, max: 5 }),
      configuration: options.overrides?.configuration || {
        maxConcurrentTasks: faker.number.int({ min: 1, max: 10 }),
        timeout: faker.number.int({ min: 1000, max: 30000 }),
        retryAttempts: faker.number.int({ min: 1, max: 5 })
      },
      apiKeyHash: options.overrides?.apiKeyHash || faker.string.alphanumeric(64),
      lastActive: options.overrides?.lastActive || faker.date.recent(),
      createdAt: options.overrides?.createdAt || faker.date.past(),
      updatedAt: options.overrides?.updatedAt || new Date(),
      metadata: options.overrides?.metadata || {
        version: faker.system.semver(),
        capabilities: faker.helpers.arrayElements(['nlp', 'planning', 'execution', 'monitoring'], { min: 1, max: 4 })
      }
    }

    return { ...baseData, ...options.overrides }
  }
}

/**
 * Factory registry
 */
export class FactoryRegistry {
  private static instance: FactoryRegistry
  private factories: Map<string, BaseFactory<any>> = new Map()

  static getInstance(): FactoryRegistry {
    if (!FactoryRegistry.instance) {
      FactoryRegistry.instance = new FactoryRegistry()
    }
    return FactoryRegistry.instance
  }

  constructor() {
    this.registerDefaultFactories()
  }

  private registerDefaultFactories(): void {
    this.register('list', new ListFactory())
    this.register('item', new ItemFactory())
    this.register('agent', new AgentFactory())
  }

  register<T>(name: string, factory: BaseFactory<T>): void {
    this.factories.set(name, factory)
  }

  get<T>(name: string): BaseFactory<T> | null {
    return this.factories.get(name) || null
  }

  has(name: string): boolean {
    return this.factories.has(name)
  }

  getFactoryNames(): string[] {
    return Array.from(this.factories.keys())
  }
}

/**
 * Global factory registry instance
 */
export const factoryRegistry = FactoryRegistry.getInstance()

/**
 * Convenience functions
 */
export const ListFactory_Instance = new ListFactory()
export const ItemFactory_Instance = new ItemFactory()
export const AgentFactory_Instance = new AgentFactory()

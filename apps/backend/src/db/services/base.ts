import { eq, and, or, desc, asc, count, SQL, sql, like, ilike, gte, lte, gt, lt, ne, inArray, notInArray, isNull, isNotNull } from 'drizzle-orm'
import { getDb } from '../connection'

/**
 * SemanticType: BaseRepositoryService
 * Description: Enhanced base repository with advanced query building, filtering, and MCP integration
 * ExtensibleByAI: true
 * AIUseCases:
 *   - Add custom query methods
 *   - Extend filtering capabilities
 *   - Add performance optimizations
 *   - Integrate caching layers
 */

/**
 * Advanced query builder interface for type-safe database operations
 */
export interface QueryBuilder<TSelect> {
  where(condition: SQL): QueryBuilder<TSelect>
  and(condition: SQL): QueryBuilder<TSelect>
  or(condition: SQL): QueryBuilder<TSelect>
  orderBy(...columns: SQL[]): QueryBuilder<TSelect>
  limit(count: number): QueryBuilder<TSelect>
  offset(count: number): QueryBuilder<TSelect>
  groupBy(...columns: SQL[]): QueryBuilder<TSelect>
  having(condition: SQL): QueryBuilder<TSelect>
  execute(): Promise<TSelect[]>
  first(): Promise<TSelect | null>
  count(): Promise<number>
}

/**
 * Filter operators for dynamic query building
 */
export type FilterOperator =
  | 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte'
  | 'like' | 'ilike' | 'in' | 'notIn'
  | 'isNull' | 'isNotNull' | 'between'

/**
 * Filter condition for dynamic queries
 */
export interface FilterCondition {
  field: string
  operator: FilterOperator
  value?: any
  values?: any[]
}

/**
 * Sort direction for ordering
 */
export type SortDirection = 'asc' | 'desc'

/**
 * Sort condition for dynamic ordering
 */
export interface SortCondition {
  field: string
  direction: SortDirection
}

/**
 * Advanced query options with filtering and sorting
 */
export interface QueryOptions {
  filters?: FilterCondition[]
  sorts?: SortCondition[]
  limit?: number
  offset?: number
  groupBy?: string[]
  having?: FilterCondition[]
}

/**
 * Enhanced base service class with advanced query building and repository patterns
 */
export abstract class BaseService<TTable, TSelect, TInsert> {
  protected abstract table: TTable
  protected abstract primaryKey: keyof TSelect

  /**
   * Get database instance
   */
  protected async getDb() {
    return await getDb()
  }

  /**
   * Create a dynamic query builder for complex queries
   */
  protected createQueryBuilder(): QueryBuilder<TSelect> {
    return new DrizzleQueryBuilder<TSelect>(this.table, this.getDb.bind(this))
  }

  /**
   * Build SQL conditions from filter conditions
   */
  protected buildFilterConditions(filters: FilterCondition[]): SQL | undefined {
    if (!filters || filters.length === 0) return undefined

    const conditions = filters.map(filter => this.buildSingleCondition(filter))
    return conditions.length === 1 ? conditions[0] : and(...conditions)
  }

  /**
   * Build a single SQL condition from filter
   */
  protected buildSingleCondition(filter: FilterCondition): SQL {
    const column = (this.table as any)[filter.field]

    switch (filter.operator) {
      case 'eq': return eq(column, filter.value)
      case 'ne': return ne(column, filter.value)
      case 'gt': return gt(column, filter.value)
      case 'gte': return gte(column, filter.value)
      case 'lt': return lt(column, filter.value)
      case 'lte': return lte(column, filter.value)
      case 'like': return like(column, filter.value)
      case 'ilike': return ilike(column, filter.value)
      case 'in': return inArray(column, filter.values || [])
      case 'notIn': return notInArray(column, filter.values || [])
      case 'isNull': return isNull(column)
      case 'isNotNull': return isNotNull(column)
      case 'between':
        return and(gte(column, filter.values?.[0]), lte(column, filter.values?.[1]))
      default:
        throw new Error(`Unsupported filter operator: ${filter.operator}`)
    }
  }

  /**
   * Build sort conditions from sort array
   */
  protected buildSortConditions(sorts: SortCondition[]): SQL[] {
    return sorts.map(sort => {
      const column = (this.table as any)[sort.field]
      return sort.direction === 'desc' ? desc(column) : asc(column)
    })
  }

  /**
   * Find a record by ID
   */
  async findById(id: string | number): Promise<TSelect | null> {
    const db = await this.getDb()
    const results = await db
      .select()
      .from(this.table)
      .where(eq((this.table as any)[this.primaryKey], id))
      .limit(1)

    return results[0] || null
  }

  /**
   * Find multiple records by IDs
   */
  async findByIds(ids: (string | number)[]): Promise<TSelect[]> {
    if (ids.length === 0) return []
    
    const db = await this.getDb()
    return await db
      .select()
      .from(this.table)
      .where(sql`${(this.table as any)[this.primaryKey]} IN ${ids}`)
  }

  /**
   * Find all records with enhanced filtering and sorting
   */
  async findAll(options: QueryOptions = {}): Promise<TSelect[]> {
    const db = await this.getDb()
    let query = db.select().from(this.table)

    // Apply filters
    if (options.filters && options.filters.length > 0) {
      const whereCondition = this.buildFilterConditions(options.filters)
      if (whereCondition) {
        query = query.where(whereCondition)
      }
    }

    // Apply sorting
    if (options.sorts && options.sorts.length > 0) {
      const sortConditions = this.buildSortConditions(options.sorts)
      query = query.orderBy(...sortConditions)
    }

    // Apply grouping
    if (options.groupBy && options.groupBy.length > 0) {
      const groupColumns = options.groupBy.map(field => (this.table as any)[field])
      query = query.groupBy(...groupColumns)
    }

    // Apply having conditions
    if (options.having && options.having.length > 0) {
      const havingCondition = this.buildFilterConditions(options.having)
      if (havingCondition) {
        query = query.having(havingCondition)
      }
    }

    // Apply pagination
    if (options.limit) {
      query = query.limit(options.limit)
    }

    if (options.offset) {
      query = query.offset(options.offset)
    }

    return await query
  }

  /**
   * Legacy findAll method for backward compatibility
   */
  async findAllLegacy(options: {
    where?: SQL
    orderBy?: SQL[]
    limit?: number
    offset?: number
  } = {}): Promise<TSelect[]> {
    const db = await this.getDb()
    let query = db.select().from(this.table)

    if (options.where) {
      query = query.where(options.where)
    }

    if (options.orderBy) {
      query = query.orderBy(...options.orderBy)
    }

    if (options.limit) {
      query = query.limit(options.limit)
    }

    if (options.offset) {
      query = query.offset(options.offset)
    }

    return await query
  }

  /**
   * Count records with optional filtering
   */
  async count(where?: SQL): Promise<number> {
    const db = await this.getDb()
    let query = db.select({ count: count() }).from(this.table)

    if (where) {
      query = query.where(where)
    }

    const result = await query
    return result[0]?.count || 0
  }

  /**
   * Create a new record
   */
  async create(data: TInsert): Promise<TSelect> {
    const db = await this.getDb()
    const result = await db.insert(this.table).values(data).returning()
    return result[0]
  }

  /**
   * Create multiple records
   */
  async createMany(data: TInsert[]): Promise<TSelect[]> {
    if (data.length === 0) return []
    
    const db = await this.getDb()
    return await db.insert(this.table).values(data).returning()
  }

  /**
   * Update a record by ID
   */
  async updateById(id: string | number, data: Partial<TInsert>): Promise<TSelect | null> {
    const db = await this.getDb()
    const result = await db
      .update(this.table)
      .set(data)
      .where(eq((this.table as any)[this.primaryKey], id))
      .returning()
    
    return result[0] || null
  }

  /**
   * Update multiple records
   */
  async updateMany(where: SQL, data: Partial<TInsert>): Promise<TSelect[]> {
    const db = await this.getDb()
    return await db
      .update(this.table)
      .set(data)
      .where(where)
      .returning()
  }

  /**
   * Delete a record by ID
   */
  async deleteById(id: string | number): Promise<boolean> {
    const db = await this.getDb()
    const result = await db
      .delete(this.table)
      .where(eq((this.table as any)[this.primaryKey], id))
    
    return result.changes > 0
  }

  /**
   * Delete multiple records
   */
  async deleteMany(where: SQL): Promise<number> {
    const db = await this.getDb()
    const result = await db.delete(this.table).where(where)
    return result.changes
  }

  /**
   * Check if a record exists
   */
  async exists(id: string | number): Promise<boolean> {
    const record = await this.findById(id)
    return record !== null
  }

  /**
   * Execute a transaction
   */
  async transaction<T>(callback: (db: any) => Promise<T>): Promise<T> {
    const db = await this.getDb()
    return await db.transaction(callback)
  }
}

/**
 * Pagination helper
 */
export interface PaginationOptions {
  page?: number
  limit?: number
}

export interface PaginatedResult<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

/**
 * Concrete implementation of QueryBuilder using Drizzle ORM
 */
class DrizzleQueryBuilder<TSelect> implements QueryBuilder<TSelect> {
  private conditions: SQL[] = []
  private orderConditions: SQL[] = []
  private limitValue?: number
  private offsetValue?: number
  private groupByColumns: SQL[] = []
  private havingConditions: SQL[] = []

  constructor(
    private table: any,
    private getDb: () => Promise<any>
  ) {}

  where(condition: SQL): QueryBuilder<TSelect> {
    this.conditions = [condition]
    return this
  }

  and(condition: SQL): QueryBuilder<TSelect> {
    this.conditions.push(condition)
    return this
  }

  or(condition: SQL): QueryBuilder<TSelect> {
    if (this.conditions.length > 0) {
      const combined = or(...this.conditions, condition)
      this.conditions = [combined]
    } else {
      this.conditions = [condition]
    }
    return this
  }

  orderBy(...columns: SQL[]): QueryBuilder<TSelect> {
    this.orderConditions.push(...columns)
    return this
  }

  limit(count: number): QueryBuilder<TSelect> {
    this.limitValue = count
    return this
  }

  offset(count: number): QueryBuilder<TSelect> {
    this.offsetValue = count
    return this
  }

  groupBy(...columns: SQL[]): QueryBuilder<TSelect> {
    this.groupByColumns.push(...columns)
    return this
  }

  having(condition: SQL): QueryBuilder<TSelect> {
    this.havingConditions.push(condition)
    return this
  }

  async execute(): Promise<TSelect[]> {
    const db = await this.getDb()
    let query = db.select().from(this.table)

    if (this.conditions.length > 0) {
      query = query.where(this.conditions.length === 1 ? this.conditions[0] : and(...this.conditions))
    }

    if (this.orderConditions.length > 0) {
      query = query.orderBy(...this.orderConditions)
    }

    if (this.groupByColumns.length > 0) {
      query = query.groupBy(...this.groupByColumns)
    }

    if (this.havingConditions.length > 0) {
      query = query.having(this.havingConditions.length === 1 ? this.havingConditions[0] : and(...this.havingConditions))
    }

    if (this.limitValue) {
      query = query.limit(this.limitValue)
    }

    if (this.offsetValue) {
      query = query.offset(this.offsetValue)
    }

    return await query
  }

  async first(): Promise<TSelect | null> {
    const results = await this.limit(1).execute()
    return results[0] || null
  }

  async count(): Promise<number> {
    const db = await this.getDb()
    let query = db.select({ count: count() }).from(this.table)

    if (this.conditions.length > 0) {
      query = query.where(this.conditions.length === 1 ? this.conditions[0] : and(...this.conditions))
    }

    if (this.groupByColumns.length > 0) {
      query = query.groupBy(...this.groupByColumns)
    }

    if (this.havingConditions.length > 0) {
      query = query.having(this.havingConditions.length === 1 ? this.havingConditions[0] : and(...this.havingConditions))
    }

    const result = await query
    return result[0]?.count || 0
  }
}

export async function paginate<T>(
  service: BaseService<any, T, any>,
  options: PaginationOptions & { filters?: FilterCondition[]; sorts?: SortCondition[] }
): Promise<PaginatedResult<T>> {
  const page = Math.max(1, options.page || 1)
  const limit = Math.min(100, Math.max(1, options.limit || 10))
  const offset = (page - 1) * limit

  const queryOptions: QueryOptions = {
    filters: options.filters,
    sorts: options.sorts,
    limit,
    offset
  }

  const [data, total] = await Promise.all([
    service.findAll(queryOptions),
    service.count(options.filters ? service['buildFilterConditions'](options.filters) : undefined)
  ])

  const totalPages = Math.ceil(total / limit)

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  }
}

/**
 * Legacy pagination function for backward compatibility
 */
export async function paginateLegacy<T>(
  service: BaseService<any, T, any>,
  options: PaginationOptions & { where?: SQL; orderBy?: SQL[] }
): Promise<PaginatedResult<T>> {
  const page = Math.max(1, options.page || 1)
  const limit = Math.min(100, Math.max(1, options.limit || 10))
  const offset = (page - 1) * limit

  const [data, total] = await Promise.all([
    service.findAllLegacy({
      where: options.where,
      orderBy: options.orderBy,
      limit,
      offset
    }),
    service.count(options.where)
  ])

  const totalPages = Math.ceil(total / limit)

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  }
}

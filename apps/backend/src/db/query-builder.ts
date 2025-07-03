import { SQL, sql, eq, and, or, desc, asc, like, ilike, gte, lte, gt, lt, ne, inArray, notInArray, isNull, isNotNull, count, sum, avg, min, max } from 'drizzle-orm'
import { getDb } from './connection'

/**
 * SemanticType: QueryBuilderFactory
 * Description: Advanced query builder with fluent API, type safety, and complex join support
 * ExtensibleByAI: true
 * AIUseCases:
 *   - Add custom aggregation functions
 *   - Implement query optimization hints
 *   - Add query caching strategies
 *   - Integrate with query performance monitoring
 */

/**
 * Join types for complex queries
 */
export type JoinType = 'INNER' | 'LEFT' | 'RIGHT' | 'FULL'

/**
 * Aggregation functions
 */
export type AggregateFunction = 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX'

/**
 * Join condition for complex queries
 */
export interface JoinCondition {
  type: JoinType
  table: any
  on: SQL
  alias?: string
}

/**
 * Aggregation specification
 */
export interface AggregateSpec {
  function: AggregateFunction
  column: string
  alias: string
  distinct?: boolean
}

/**
 * Advanced filter builder for complex conditions
 */
export class FilterBuilder {
  private conditions: SQL[] = []

  /**
   * Add equality condition
   */
  equals(column: any, value: any): FilterBuilder {
    this.conditions.push(eq(column, value))
    return this
  }

  /**
   * Add not equals condition
   */
  notEquals(column: any, value: any): FilterBuilder {
    this.conditions.push(ne(column, value))
    return this
  }

  /**
   * Add greater than condition
   */
  greaterThan(column: any, value: any): FilterBuilder {
    this.conditions.push(gt(column, value))
    return this
  }

  /**
   * Add greater than or equal condition
   */
  greaterThanOrEqual(column: any, value: any): FilterBuilder {
    this.conditions.push(gte(column, value))
    return this
  }

  /**
   * Add less than condition
   */
  lessThan(column: any, value: any): FilterBuilder {
    this.conditions.push(lt(column, value))
    return this
  }

  /**
   * Add less than or equal condition
   */
  lessThanOrEqual(column: any, value: any): FilterBuilder {
    this.conditions.push(lte(column, value))
    return this
  }

  /**
   * Add LIKE condition
   */
  like(column: any, pattern: string): FilterBuilder {
    this.conditions.push(like(column, pattern))
    return this
  }

  /**
   * Add case-insensitive LIKE condition
   */
  ilike(column: any, pattern: string): FilterBuilder {
    this.conditions.push(ilike(column, pattern))
    return this
  }

  /**
   * Add IN condition
   */
  in(column: any, values: any[]): FilterBuilder {
    this.conditions.push(inArray(column, values))
    return this
  }

  /**
   * Add NOT IN condition
   */
  notIn(column: any, values: any[]): FilterBuilder {
    this.conditions.push(notInArray(column, values))
    return this
  }

  /**
   * Add IS NULL condition
   */
  isNull(column: any): FilterBuilder {
    this.conditions.push(isNull(column))
    return this
  }

  /**
   * Add IS NOT NULL condition
   */
  isNotNull(column: any): FilterBuilder {
    this.conditions.push(isNotNull(column))
    return this
  }

  /**
   * Add BETWEEN condition
   */
  between(column: any, min: any, max: any): FilterBuilder {
    this.conditions.push(and(gte(column, min), lte(column, max)))
    return this
  }

  /**
   * Add custom SQL condition
   */
  custom(condition: SQL): FilterBuilder {
    this.conditions.push(condition)
    return this
  }

  /**
   * Combine conditions with AND
   */
  and(builder: FilterBuilder): FilterBuilder {
    const otherConditions = builder.build()
    if (otherConditions) {
      this.conditions.push(otherConditions)
    }
    return this
  }

  /**
   * Combine conditions with OR
   */
  or(builder: FilterBuilder): FilterBuilder {
    const otherConditions = builder.build()
    if (otherConditions && this.conditions.length > 0) {
      const combined = or(...this.conditions, otherConditions)
      this.conditions = [combined]
    } else if (otherConditions) {
      this.conditions.push(otherConditions)
    }
    return this
  }

  /**
   * Build the final SQL condition
   */
  build(): SQL | undefined {
    if (this.conditions.length === 0) return undefined
    if (this.conditions.length === 1) return this.conditions[0]
    return and(...this.conditions)
  }

  /**
   * Reset the builder
   */
  reset(): FilterBuilder {
    this.conditions = []
    return this
  }
}

/**
 * Advanced query builder with fluent API
 */
export class AdvancedQueryBuilder<TSelect> {
  private selectColumns: any[] = []
  private fromTable: any
  private whereConditions: SQL[] = []
  private joinConditions: JoinCondition[] = []
  private orderByConditions: SQL[] = []
  private groupByColumns: any[] = []
  private havingConditions: SQL[] = []
  private limitValue?: number
  private offsetValue?: number
  private aggregates: AggregateSpec[] = []
  private distinctValue = false

  constructor(table: any) {
    this.fromTable = table
  }

  /**
   * Select specific columns
   */
  select(...columns: any[]): AdvancedQueryBuilder<TSelect> {
    this.selectColumns = columns
    return this
  }

  /**
   * Select all columns
   */
  selectAll(): AdvancedQueryBuilder<TSelect> {
    this.selectColumns = []
    return this
  }

  /**
   * Add DISTINCT clause
   */
  distinct(): AdvancedQueryBuilder<TSelect> {
    this.distinctValue = true
    return this
  }

  /**
   * Add WHERE condition using FilterBuilder
   */
  where(builderFn: (builder: FilterBuilder) => FilterBuilder): AdvancedQueryBuilder<TSelect> {
    const builder = new FilterBuilder()
    const condition = builderFn(builder).build()
    if (condition) {
      this.whereConditions.push(condition)
    }
    return this
  }

  /**
   * Add raw WHERE condition
   */
  whereRaw(condition: SQL): AdvancedQueryBuilder<TSelect> {
    this.whereConditions.push(condition)
    return this
  }

  /**
   * Add JOIN condition
   */
  join(
    type: JoinType,
    table: any,
    on: SQL,
    alias?: string
  ): AdvancedQueryBuilder<TSelect> {
    this.joinConditions.push({ type, table, on, alias })
    return this
  }

  /**
   * Add INNER JOIN
   */
  innerJoin(table: any, on: SQL, alias?: string): AdvancedQueryBuilder<TSelect> {
    return this.join('INNER', table, on, alias)
  }

  /**
   * Add LEFT JOIN
   */
  leftJoin(table: any, on: SQL, alias?: string): AdvancedQueryBuilder<TSelect> {
    return this.join('LEFT', table, on, alias)
  }

  /**
   * Add RIGHT JOIN
   */
  rightJoin(table: any, on: SQL, alias?: string): AdvancedQueryBuilder<TSelect> {
    return this.join('RIGHT', table, on, alias)
  }

  /**
   * Add ORDER BY condition
   */
  orderBy(column: any, direction: 'ASC' | 'DESC' = 'ASC'): AdvancedQueryBuilder<TSelect> {
    this.orderByConditions.push(direction === 'DESC' ? desc(column) : asc(column))
    return this
  }

  /**
   * Add GROUP BY columns
   */
  groupBy(...columns: any[]): AdvancedQueryBuilder<TSelect> {
    this.groupByColumns.push(...columns)
    return this
  }

  /**
   * Add HAVING condition
   */
  having(builderFn: (builder: FilterBuilder) => FilterBuilder): AdvancedQueryBuilder<TSelect> {
    const builder = new FilterBuilder()
    const condition = builderFn(builder).build()
    if (condition) {
      this.havingConditions.push(condition)
    }
    return this
  }

  /**
   * Add LIMIT
   */
  limit(count: number): AdvancedQueryBuilder<TSelect> {
    this.limitValue = count
    return this
  }

  /**
   * Add OFFSET
   */
  offset(count: number): AdvancedQueryBuilder<TSelect> {
    this.offsetValue = count
    return this
  }

  /**
   * Add aggregation function
   */
  aggregate(
    func: AggregateFunction,
    column: string,
    alias: string,
    distinct = false
  ): AdvancedQueryBuilder<TSelect> {
    this.aggregates.push({ function: func, column, alias, distinct })
    return this
  }

  /**
   * Add COUNT aggregation
   */
  count(column = '*', alias = 'count', distinct = false): AdvancedQueryBuilder<TSelect> {
    return this.aggregate('COUNT', column, alias, distinct)
  }

  /**
   * Add SUM aggregation
   */
  sum(column: string, alias = 'sum'): AdvancedQueryBuilder<TSelect> {
    return this.aggregate('SUM', column, alias)
  }

  /**
   * Add AVG aggregation
   */
  avg(column: string, alias = 'avg'): AdvancedQueryBuilder<TSelect> {
    return this.aggregate('AVG', column, alias)
  }

  /**
   * Add MIN aggregation
   */
  min(column: string, alias = 'min'): AdvancedQueryBuilder<TSelect> {
    return this.aggregate('MIN', column, alias)
  }

  /**
   * Add MAX aggregation
   */
  max(column: string, alias = 'max'): AdvancedQueryBuilder<TSelect> {
    return this.aggregate('MAX', column, alias)
  }

  /**
   * Execute the query and return results
   */
  async execute(): Promise<TSelect[]> {
    const db = await getDb()
    
    // Build select clause
    let selectClause: any
    if (this.aggregates.length > 0) {
      selectClause = this.buildAggregateSelect()
    } else if (this.selectColumns.length > 0) {
      selectClause = this.buildColumnSelect()
    } else {
      selectClause = {}
    }

    let query = db.select(selectClause).from(this.fromTable)

    // Add DISTINCT
    if (this.distinctValue) {
      query = query.distinct()
    }

    // Add JOINs
    for (const join of this.joinConditions) {
      switch (join.type) {
        case 'INNER':
          query = query.innerJoin(join.table, join.on)
          break
        case 'LEFT':
          query = query.leftJoin(join.table, join.on)
          break
        case 'RIGHT':
          query = query.rightJoin(join.table, join.on)
          break
        case 'FULL':
          query = query.fullJoin(join.table, join.on)
          break
      }
    }

    // Add WHERE conditions
    if (this.whereConditions.length > 0) {
      const whereClause = this.whereConditions.length === 1 
        ? this.whereConditions[0] 
        : and(...this.whereConditions)
      query = query.where(whereClause)
    }

    // Add GROUP BY
    if (this.groupByColumns.length > 0) {
      query = query.groupBy(...this.groupByColumns)
    }

    // Add HAVING
    if (this.havingConditions.length > 0) {
      const havingClause = this.havingConditions.length === 1
        ? this.havingConditions[0]
        : and(...this.havingConditions)
      query = query.having(havingClause)
    }

    // Add ORDER BY
    if (this.orderByConditions.length > 0) {
      query = query.orderBy(...this.orderByConditions)
    }

    // Add LIMIT
    if (this.limitValue) {
      query = query.limit(this.limitValue)
    }

    // Add OFFSET
    if (this.offsetValue) {
      query = query.offset(this.offsetValue)
    }

    return await query
  }

  /**
   * Execute and return first result
   */
  async first(): Promise<TSelect | null> {
    const results = await this.limit(1).execute()
    return results[0] || null
  }

  /**
   * Build aggregate select clause
   */
  private buildAggregateSelect(): Record<string, any> {
    const select: Record<string, any> = {}
    
    for (const agg of this.aggregates) {
      const column = agg.column === '*' ? sql`*` : (this.fromTable as any)[agg.column]
      
      switch (agg.function) {
        case 'COUNT':
          select[agg.alias] = agg.distinct ? sql`COUNT(DISTINCT ${column})` : count(column)
          break
        case 'SUM':
          select[agg.alias] = sum(column)
          break
        case 'AVG':
          select[agg.alias] = avg(column)
          break
        case 'MIN':
          select[agg.alias] = min(column)
          break
        case 'MAX':
          select[agg.alias] = max(column)
          break
      }
    }
    
    return select
  }

  /**
   * Build column select clause
   */
  private buildColumnSelect(): Record<string, any> {
    const select: Record<string, any> = {}
    
    for (const column of this.selectColumns) {
      if (typeof column === 'string') {
        select[column] = (this.fromTable as any)[column]
      } else {
        // Assume it's already a column reference
        select[column.name || 'column'] = column
      }
    }
    
    return select
  }
}

/**
 * Query builder factory for creating advanced queries
 */
export class QueryBuilderFactory {
  /**
   * Create a new query builder for a table
   */
  static for<TSelect>(table: any): AdvancedQueryBuilder<TSelect> {
    return new AdvancedQueryBuilder<TSelect>(table)
  }

  /**
   * Create a new filter builder
   */
  static filter(): FilterBuilder {
    return new FilterBuilder()
  }

  /**
   * Create a raw SQL query
   */
  static raw(query: string, params?: any[]): SQL {
    return params ? sql.raw(query, params) : sql.raw(query)
  }
}

/**
 * Export convenience functions
 */
export const QB = QueryBuilderFactory
export const Filter = () => new FilterBuilder()

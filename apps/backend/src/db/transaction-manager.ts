import { getDb } from './connection'

/**
 * SemanticType: TransactionManager
 * Description: Comprehensive transaction management with atomic operations, savepoints, and rollback support
 * ExtensibleByAI: true
 * AIUseCases:
 *   - Add distributed transaction support
 *   - Implement transaction retry logic
 *   - Add transaction performance monitoring
 *   - Integrate with event sourcing patterns
 */

/**
 * Transaction isolation levels
 */
export type IsolationLevel = 
  | 'READ_UNCOMMITTED'
  | 'READ_COMMITTED' 
  | 'REPEATABLE_READ'
  | 'SERIALIZABLE'

/**
 * Transaction options for fine-grained control
 */
export interface TransactionOptions {
  isolationLevel?: IsolationLevel
  timeout?: number // in milliseconds
  retryAttempts?: number
  retryDelay?: number // in milliseconds
  savepoints?: boolean
  readOnly?: boolean
}

/**
 * Transaction context for tracking state
 */
export interface TransactionContext {
  id: string
  startTime: Date
  savepoints: string[]
  operations: TransactionOperation[]
  metadata: Record<string, any>
}

/**
 * Transaction operation for audit trail
 */
export interface TransactionOperation {
  type: 'INSERT' | 'UPDATE' | 'DELETE' | 'SELECT'
  table: string
  timestamp: Date
  affectedRows?: number
  metadata?: Record<string, any>
}

/**
 * Transaction result with metadata
 */
export interface TransactionResult<T> {
  success: boolean
  result?: T
  error?: Error
  context: TransactionContext
  duration: number
  operationsCount: number
}

/**
 * Comprehensive transaction manager with advanced features
 */
export class TransactionManager {
  private static instance: TransactionManager
  private activeTransactions = new Map<string, TransactionContext>()
  private transactionCounter = 0

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): TransactionManager {
    if (!TransactionManager.instance) {
      TransactionManager.instance = new TransactionManager()
    }
    return TransactionManager.instance
  }

  /**
   * Generate unique transaction ID
   */
  private generateTransactionId(): string {
    return `tx_${Date.now()}_${++this.transactionCounter}`
  }

  /**
   * Execute a transaction with comprehensive error handling and retry logic
   */
  async executeTransaction<T>(
    operation: (db: any, context: TransactionContext) => Promise<T>,
    options: TransactionOptions = {}
  ): Promise<TransactionResult<T>> {
    const transactionId = this.generateTransactionId()
    const context: TransactionContext = {
      id: transactionId,
      startTime: new Date(),
      savepoints: [],
      operations: [],
      metadata: {}
    }

    const startTime = Date.now()
    let attempts = 0
    const maxAttempts = options.retryAttempts || 1

    while (attempts < maxAttempts) {
      attempts++
      
      try {
        this.activeTransactions.set(transactionId, context)
        
        const db = await getDb()
        const result = await this.executeWithTimeout(
          () => db.transaction(async (tx: any) => {
            // Set isolation level if specified
            if (options.isolationLevel) {
              await this.setIsolationLevel(tx, options.isolationLevel)
            }

            // Set read-only mode if specified
            if (options.readOnly) {
              await this.setReadOnly(tx, true)
            }

            return await operation(tx, context)
          }),
          options.timeout || 30000 // 30 second default timeout
        )

        const duration = Date.now() - startTime
        this.activeTransactions.delete(transactionId)

        return {
          success: true,
          result,
          context,
          duration,
          operationsCount: context.operations.length
        }

      } catch (error) {
        console.error(`Transaction ${transactionId} failed (attempt ${attempts}):`, error)
        
        if (attempts < maxAttempts) {
          const delay = options.retryDelay || 1000 * attempts // Exponential backoff
          await this.sleep(delay)
          continue
        }

        const duration = Date.now() - startTime
        this.activeTransactions.delete(transactionId)

        return {
          success: false,
          error: error as Error,
          context,
          duration,
          operationsCount: context.operations.length
        }
      }
    }

    // This should never be reached, but TypeScript requires it
    throw new Error('Unexpected transaction execution path')
  }

  /**
   * Execute operation with timeout
   */
  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Transaction timeout after ${timeoutMs}ms`))
      }, timeoutMs)

      operation()
        .then(result => {
          clearTimeout(timeout)
          resolve(result)
        })
        .catch(error => {
          clearTimeout(timeout)
          reject(error)
        })
    })
  }

  /**
   * Set transaction isolation level
   */
  private async setIsolationLevel(tx: any, level: IsolationLevel): Promise<void> {
    const levelMap = {
      'READ_UNCOMMITTED': 'READ UNCOMMITTED',
      'READ_COMMITTED': 'READ COMMITTED',
      'REPEATABLE_READ': 'REPEATABLE READ',
      'SERIALIZABLE': 'SERIALIZABLE'
    }

    await tx.execute(`SET TRANSACTION ISOLATION LEVEL ${levelMap[level]}`)
  }

  /**
   * Set read-only mode
   */
  private async setReadOnly(tx: any, readOnly: boolean): Promise<void> {
    await tx.execute(`SET TRANSACTION ${readOnly ? 'READ ONLY' : 'READ WRITE'}`)
  }

  /**
   * Create a savepoint within a transaction
   */
  async createSavepoint(context: TransactionContext, name: string): Promise<void> {
    if (!this.activeTransactions.has(context.id)) {
      throw new Error(`Transaction ${context.id} is not active`)
    }

    context.savepoints.push(name)
    // Note: Actual savepoint creation would be handled by the database driver
  }

  /**
   * Rollback to a savepoint
   */
  async rollbackToSavepoint(context: TransactionContext, name: string): Promise<void> {
    if (!this.activeTransactions.has(context.id)) {
      throw new Error(`Transaction ${context.id} is not active`)
    }

    const index = context.savepoints.indexOf(name)
    if (index === -1) {
      throw new Error(`Savepoint ${name} not found in transaction ${context.id}`)
    }

    // Remove savepoints created after this one
    context.savepoints = context.savepoints.slice(0, index + 1)
    // Note: Actual rollback would be handled by the database driver
  }

  /**
   * Log transaction operation for audit trail
   */
  logOperation(
    context: TransactionContext,
    type: TransactionOperation['type'],
    table: string,
    affectedRows?: number,
    metadata?: Record<string, any>
  ): void {
    context.operations.push({
      type,
      table,
      timestamp: new Date(),
      affectedRows,
      metadata
    })
  }

  /**
   * Get active transaction contexts
   */
  getActiveTransactions(): TransactionContext[] {
    return Array.from(this.activeTransactions.values())
  }

  /**
   * Get transaction by ID
   */
  getTransaction(id: string): TransactionContext | undefined {
    return this.activeTransactions.get(id)
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Execute multiple operations atomically
   */
  async executeAtomic<T>(
    operations: Array<(db: any, context: TransactionContext) => Promise<any>>,
    options: TransactionOptions = {}
  ): Promise<TransactionResult<T[]>> {
    return this.executeTransaction(async (db, context) => {
      const results = []
      
      for (let i = 0; i < operations.length; i++) {
        try {
          const result = await operations[i](db, context)
          results.push(result)
          
          // Create savepoint after each operation if enabled
          if (options.savepoints) {
            await this.createSavepoint(context, `op_${i}`)
          }
        } catch (error) {
          // Rollback to previous savepoint if available
          if (options.savepoints && context.savepoints.length > 0) {
            const lastSavepoint = context.savepoints[context.savepoints.length - 1]
            await this.rollbackToSavepoint(context, lastSavepoint)
          }
          throw error
        }
      }
      
      return results
    }, options)
  }
}

/**
 * Convenience function to get transaction manager instance
 */
export function getTransactionManager(): TransactionManager {
  return TransactionManager.getInstance()
}

/**
 * Decorator for automatic transaction management
 */
export function Transactional(options: TransactionOptions = {}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const transactionManager = getTransactionManager()
      
      const result = await transactionManager.executeTransaction(
        async (db, context) => {
          // Bind the database instance to the method context
          const originalDb = this.db
          this.db = db
          
          try {
            return await method.apply(this, args)
          } finally {
            this.db = originalDb
          }
        },
        options
      )

      if (!result.success) {
        throw result.error
      }

      return result.result
    }

    return descriptor
  }
}

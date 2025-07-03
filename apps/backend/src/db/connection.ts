import dotenv from 'dotenv'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js'
import Database from 'better-sqlite3'
import postgres from 'postgres'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { migrate as migratePg } from 'drizzle-orm/postgres-js/migrator'
import { schema } from './schema/index'
import { dirname } from 'path'
import { mkdir } from 'fs/promises'

// Load environment variables
dotenv.config()

// Database configuration interface
export interface DatabaseConfig {
  url: string
  maxConnections?: number
  idleTimeout?: number
  connectionTimeout?: number
  ssl?: boolean
}

// Environment-based configuration
export function getDatabaseConfig(): DatabaseConfig {
  const isProduction = process.env.NODE_ENV === 'production'
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required')
  }

  return {
    url: databaseUrl,
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10'),
    idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000'),
    ssl: isProduction && process.env.DB_SSL !== 'false'
  }
}

// SQLite connection setup
async function createSqliteConnection(config: DatabaseConfig) {
  const dbPath = config.url.replace('sqlite:', '')
  
  // Ensure directory exists
  await mkdir(dirname(dbPath), { recursive: true }).catch(() => {})
  
  const sqlite = new Database(dbPath)
  
  // Enable WAL mode for better concurrency
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('synchronous = NORMAL')
  sqlite.pragma('cache_size = 1000')
  sqlite.pragma('foreign_keys = ON')
  sqlite.pragma('temp_store = MEMORY')
  
  const db = drizzle(sqlite, { schema })
  
  return { db, sqlite, close: () => sqlite.close() }
}

// PostgreSQL connection setup
function createPostgresConnection(config: DatabaseConfig) {
  const sql = postgres(config.url, {
    max: config.maxConnections,
    idle_timeout: config.idleTimeout,
    connect_timeout: config.connectionTimeout,
    ssl: config.ssl ? 'require' : false,
    onnotice: () => {}, // Suppress notices in production
    debug: process.env.NODE_ENV === 'development'
  })
  
  const db = drizzlePg(sql, { schema })
  
  return { db, sql, close: () => sql.end() }
}

// Connection manager
class DatabaseManager {
  private connection: any = null
  private config: DatabaseConfig
  
  constructor() {
    this.config = getDatabaseConfig()
  }
  
  async connect() {
    if (this.connection) {
      return this.connection.db
    }
    
    try {
      if (this.config.url.startsWith('sqlite:')) {
        this.connection = await createSqliteConnection(this.config)
        console.log('✅ Connected to SQLite database')
      } else if (this.config.url.startsWith('postgres://') || this.config.url.startsWith('postgresql://')) {
        this.connection = createPostgresConnection(this.config)
        console.log('✅ Connected to PostgreSQL database')
      } else {
        throw new Error(`Unsupported database URL: ${this.config.url}`)
      }
      
      return this.connection.db
    } catch (error) {
      console.error('❌ Database connection failed:', error)
      throw error
    }
  }
  
  async disconnect() {
    if (this.connection) {
      await this.connection.close()
      this.connection = null
      console.log('🔌 Database disconnected')
    }
  }
  
  async runMigrations() {
    if (!this.connection) {
      await this.connect()
    }
    
    try {
      if (this.config.url.startsWith('sqlite:')) {
        await migrate(this.connection.db, { migrationsFolder: './src/db/migrations' })
      } else {
        await migratePg(this.connection.db, { migrationsFolder: './src/db/migrations' })
      }
      console.log('✅ Database migrations completed')
    } catch (error) {
      console.error('❌ Migration failed:', error)
      throw error
    }
  }
  
  getDb() {
    if (!this.connection) {
      throw new Error('Database not connected. Call connect() first.')
    }
    return this.connection.db
  }

  getConnection() {
    if (!this.connection) {
      throw new Error('Database not connected. Call connect() first.')
    }
    return this.connection.connection
  }

  isConnected() {
    return this.connection !== null
  }
}

// Singleton instance
export const dbManager = new DatabaseManager()

// Convenience function to get database instance
export async function getDb() {
  if (!dbManager.isConnected()) {
    await dbManager.connect()
  }
  return dbManager.getDb()
}

// Graceful shutdown handler
export async function gracefulShutdown() {
  await dbManager.disconnect()
}

// Error handling wrapper for database operations
export async function withDbTransaction<T>(
  operation: (db: any) => Promise<T>
): Promise<T> {
  const db = await getDb()
  
  try {
    return await db.transaction(operation)
  } catch (error) {
    console.error('Database transaction failed:', error)
    throw error
  }
}

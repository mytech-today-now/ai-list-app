/**
 * SemanticType: MigrationManager
 * Description: Advanced migration management system with rollback capabilities, performance optimization, and transaction safety
 * ExtensibleByAI: true
 * AIUseCases:
 *   - Add new migration types
 *   - Implement custom rollback strategies
 *   - Add performance monitoring
 *   - Extend validation rules
 */

import { drizzle } from 'drizzle-orm/better-sqlite3'
import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js'
import Database from 'better-sqlite3'
import postgres from 'postgres'
import { sql } from 'drizzle-orm'
import { readdir, readFile, writeFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'

// Migration interfaces
export interface Migration {
  id: string
  name: string
  version: number
  timestamp: Date
  up: string
  down: string
  checksum: string
  dependencies?: string[]
  rollbackSafe: boolean
  performanceImpact: 'low' | 'medium' | 'high'
  description?: string
}

export interface MigrationRecord {
  id: string
  name: string
  version: number
  appliedAt: Date
  checksum: string
  executionTime: number
  rollbackSafe: boolean
  rollbackData?: string
}

export interface RollbackPlan {
  migrations: MigrationRecord[]
  estimatedTime: number
  riskLevel: 'low' | 'medium' | 'high'
  warnings: string[]
  dataLossRisk: boolean
}

export interface MigrationStatus {
  pending: Migration[]
  applied: MigrationRecord[]
  failed: MigrationRecord[]
  canRollback: boolean
  lastMigration?: MigrationRecord
}

// Migration execution context
export interface MigrationContext {
  db: any
  transaction: any
  isRollback: boolean
  dryRun: boolean
  environment: 'development' | 'production' | 'test'
  startTime: Date
}

/**
 * Advanced Migration Manager with rollback capabilities and performance optimization
 */
export class MigrationManager {
  private db: any
  private connection: Database | postgres.Sql
  private migrationsPath: string
  private environment: string
  private isPostgres: boolean

  constructor(
    connection: Database | postgres.Sql,
    migrationsPath: string = './src/db/migrations',
    environment: string = 'development'
  ) {
    this.connection = connection
    this.migrationsPath = migrationsPath
    this.environment = environment
    this.isPostgres = typeof connection === 'object' && 'sql' in connection
    
    // Initialize Drizzle instance
    if (this.isPostgres) {
      this.db = drizzlePg(connection as postgres.Sql)
    } else {
      this.db = drizzle(connection as Database)
    }
  }

  /**
   * Initialize migration tracking tables
   */
  async initialize(): Promise<void> {
    const createMigrationsTable = this.isPostgres ? `
      CREATE TABLE IF NOT EXISTS __migrations__ (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        version INTEGER NOT NULL,
        applied_at TIMESTAMP DEFAULT NOW(),
        checksum VARCHAR(64) NOT NULL,
        execution_time INTEGER NOT NULL,
        rollback_safe BOOLEAN DEFAULT false,
        rollback_data TEXT
      );
      
      CREATE INDEX IF NOT EXISTS idx_migrations_version ON __migrations__(version);
      CREATE INDEX IF NOT EXISTS idx_migrations_applied_at ON __migrations__(applied_at);
    ` : `
      CREATE TABLE IF NOT EXISTS __migrations__ (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        version INTEGER NOT NULL,
        applied_at INTEGER DEFAULT (unixepoch()),
        checksum TEXT NOT NULL,
        execution_time INTEGER NOT NULL,
        rollback_safe INTEGER DEFAULT 0,
        rollback_data TEXT
      );
      
      CREATE INDEX IF NOT EXISTS idx_migrations_version ON __migrations__(version);
      CREATE INDEX IF NOT EXISTS idx_migrations_applied_at ON __migrations__(applied_at);
    `

    const createRollbackTable = this.isPostgres ? `
      CREATE TABLE IF NOT EXISTS __migration_rollbacks__ (
        id SERIAL PRIMARY KEY,
        migration_id VARCHAR(255) NOT NULL,
        rolled_back_at TIMESTAMP DEFAULT NOW(),
        rollback_reason TEXT,
        rollback_data TEXT,
        FOREIGN KEY (migration_id) REFERENCES __migrations__(id)
      );
    ` : `
      CREATE TABLE IF NOT EXISTS __migration_rollbacks__ (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        migration_id TEXT NOT NULL,
        rolled_back_at INTEGER DEFAULT (unixepoch()),
        rollback_reason TEXT,
        rollback_data TEXT,
        FOREIGN KEY (migration_id) REFERENCES __migrations__(id)
      );
    `

    if (this.isPostgres) {
      await this.db.execute(sql.raw(createMigrationsTable))
      await this.db.execute(sql.raw(createRollbackTable))
    } else {
      // For SQLite, use the raw connection
      const connection = this.connection as Database
      connection.exec(createMigrationsTable)
      connection.exec(createRollbackTable)
    }
  }

  /**
   * Load migration files from disk
   */
  async loadMigrations(): Promise<Migration[]> {
    const files = await readdir(this.migrationsPath)
    const migrationFiles = files
      .filter(file => file.endsWith('.sql') && !file.startsWith('meta'))
      .sort()

    const migrations: Migration[] = []

    for (const file of migrationFiles) {
      const filePath = join(this.migrationsPath, file)
      const content = await readFile(filePath, 'utf-8')
      
      // Parse migration metadata from comments
      const metadata = this.parseMigrationMetadata(content)
      const { up, down } = this.splitMigrationContent(content)
      
      const migration: Migration = {
        id: file.replace('.sql', ''),
        name: metadata.name || file,
        version: this.extractVersionFromFilename(file),
        timestamp: new Date(metadata.timestamp || 0),
        up,
        down,
        checksum: this.calculateChecksum(up),
        dependencies: metadata.dependencies,
        rollbackSafe: metadata.rollbackSafe !== false,
        performanceImpact: metadata.performanceImpact || 'medium',
        description: metadata.description
      }

      migrations.push(migration)
    }

    return migrations
  }

  /**
   * Get current migration status
   */
  async getStatus(): Promise<MigrationStatus> {
    const allMigrations = await this.loadMigrations()
    const appliedRecords = await this.getAppliedMigrations()
    
    const appliedIds = new Set(appliedRecords.map(r => r.id))
    const pending = allMigrations.filter(m => !appliedIds.has(m.id))
    
    const failed = appliedRecords.filter(r => r.executionTime < 0)
    const applied = appliedRecords.filter(r => r.executionTime >= 0)
    
    const canRollback = applied.length > 0 && applied.every(r => r.rollbackSafe)
    const lastMigration = applied.sort((a, b) => b.version - a.version)[0]

    return {
      pending,
      applied,
      failed,
      canRollback,
      lastMigration
    }
  }

  /**
   * Execute pending migrations
   */
  async migrate(options: { dryRun?: boolean; target?: string } = {}): Promise<MigrationRecord[]> {
    const { dryRun = false, target } = options
    const status = await this.getStatus()
    
    let migrationsToRun = status.pending
    if (target) {
      const targetIndex = migrationsToRun.findIndex(m => m.id === target)
      if (targetIndex === -1) {
        throw new Error(`Target migration ${target} not found`)
      }
      migrationsToRun = migrationsToRun.slice(0, targetIndex + 1)
    }

    const results: MigrationRecord[] = []

    for (const migration of migrationsToRun) {
      console.log(`${dryRun ? '[DRY RUN] ' : ''}Applying migration: ${migration.name}`)
      
      if (dryRun) {
        console.log(`Would execute: ${migration.up.substring(0, 100)}...`)
        continue
      }

      const result = await this.executeMigration(migration, false)
      results.push(result)
    }

    return results
  }

  /**
   * Calculate checksum for migration content
   */
  private calculateChecksum(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex')
  }

  /**
   * Parse migration metadata from comments
   */
  private parseMigrationMetadata(content: string): any {
    const metadataRegex = /--\s*@(\w+):\s*(.+)/g
    const metadata: any = {}
    
    let match
    while ((match = metadataRegex.exec(content)) !== null) {
      const [, key, value] = match
      metadata[key] = value.trim()
    }
    
    return metadata
  }

  /**
   * Split migration content into up and down parts
   */
  private splitMigrationContent(content: string): { up: string; down: string } {
    const downMarker = '-- DOWN MIGRATION'
    const parts = content.split(downMarker)
    
    return {
      up: parts[0].trim(),
      down: parts[1]?.trim() || ''
    }
  }

  /**
   * Extract version number from filename
   */
  private extractVersionFromFilename(filename: string): number {
    const match = filename.match(/^(\d+)_/)
    return match ? parseInt(match[1], 10) : 0
  }

  /**
   * Get applied migrations from database
   */
  private async getAppliedMigrations(): Promise<MigrationRecord[]> {
    try {
      let result: any[]
      if (this.isPostgres) {
        result = await this.db.execute(sql`
          SELECT * FROM __migrations__
          ORDER BY version ASC
        `)
      } else {
        const connection = this.connection as Database
        result = connection.prepare('SELECT * FROM __migrations__ ORDER BY version ASC').all()
      }
      
      return result.map((row: any) => ({
        id: row.id,
        name: row.name,
        version: row.version,
        appliedAt: new Date(this.isPostgres ? row.applied_at : row.applied_at * 1000),
        checksum: row.checksum,
        executionTime: row.execution_time,
        rollbackSafe: this.isPostgres ? row.rollback_safe : Boolean(row.rollback_safe),
        rollbackData: row.rollback_data
      }))
    } catch (error) {
      // Table doesn't exist yet
      return []
    }
  }

  /**
   * Execute a single migration
   */
  private async executeMigration(migration: Migration, isRollback: boolean): Promise<MigrationRecord> {
    const startTime = Date.now()
    const context: MigrationContext = {
      db: this.db,
      transaction: null,
      isRollback,
      dryRun: false,
      environment: this.environment as any,
      startTime: new Date()
    }

    try {
      // Start transaction
      if (this.isPostgres) {
        await this.db.execute(sql`BEGIN`)
      } else {
        (this.connection as Database).exec('BEGIN')
      }

      // Execute migration SQL
      const migrationSql = isRollback ? migration.down : migration.up
      if (migrationSql) {
        if (this.isPostgres) {
          await this.db.execute(sql.raw(migrationSql))
        } else {
          (this.connection as Database).exec(migrationSql)
        }
      }

      // Record migration
      const executionTime = Date.now() - startTime
      const record: MigrationRecord = {
        id: migration.id,
        name: migration.name,
        version: migration.version,
        appliedAt: new Date(),
        checksum: migration.checksum,
        executionTime,
        rollbackSafe: migration.rollbackSafe
      }

      if (!isRollback) {
        await this.recordMigration(record)
      } else {
        await this.recordRollback(migration.id, 'Manual rollback')
      }

      // Commit transaction
      if (this.isPostgres) {
        await this.db.execute(sql`COMMIT`)
      } else {
        (this.connection as Database).exec('COMMIT')
      }

      console.log(`✅ Migration ${migration.name} completed in ${executionTime}ms`)
      return record

    } catch (error) {
      // Rollback transaction
      if (this.isPostgres) {
        await this.db.execute(sql`ROLLBACK`)
      } else {
        (this.connection as Database).exec('ROLLBACK')
      }

      console.error(`❌ Migration ${migration.name} failed:`, error)
      throw error
    }
  }

  /**
   * Record migration in tracking table
   */
  private async recordMigration(record: MigrationRecord): Promise<void> {
    const timestamp = this.isPostgres ? 'NOW()' : 'unixepoch()'
    const insertSql = `
      INSERT INTO __migrations__ (
        id, name, version, applied_at, checksum, execution_time, rollback_safe, rollback_data
      ) VALUES (
        '${record.id}',
        '${record.name}',
        ${record.version},
        ${timestamp},
        '${record.checksum}',
        ${record.executionTime},
        ${this.isPostgres ? record.rollbackSafe : (record.rollbackSafe ? 1 : 0)},
        ${record.rollbackData ? `'${record.rollbackData}'` : 'NULL'}
      )
    `

    if (this.isPostgres) {
      await this.db.execute(sql.raw(insertSql))
    } else {
      (this.connection as Database).exec(insertSql)
    }
  }

  /**
   * Record rollback in tracking table
   */
  private async recordRollback(migrationId: string, reason: string): Promise<void> {
    const timestamp = this.isPostgres ? 'NOW()' : 'unixepoch()'
    const insertSql = `
      INSERT INTO __migration_rollbacks__ (migration_id, rolled_back_at, rollback_reason)
      VALUES ('${migrationId}', ${timestamp}, '${reason}')
    `
    const deleteSql = `DELETE FROM __migrations__ WHERE id = '${migrationId}'`

    if (this.isPostgres) {
      await this.db.execute(sql.raw(insertSql))
      await this.db.execute(sql.raw(deleteSql))
    } else {
      const connection = this.connection as Database
      connection.exec(insertSql)
      connection.exec(deleteSql)
    }
  }
}

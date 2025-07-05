/**
 * SemanticType: RollbackManager
 * Description: Advanced rollback system with safety checks, data preservation, and transaction management
 * ExtensibleByAI: true
 * AIUseCases:
 *   - Add rollback validation rules
 *   - Implement data backup strategies
 *   - Add rollback simulation
 *   - Extend safety checks
 */

import { MigrationManager, Migration, MigrationRecord, RollbackPlan } from './migration-manager'
import { sql } from 'drizzle-orm'
import { writeFile, readFile } from 'fs/promises'
import { join } from 'path'

export interface RollbackOptions {
  target?: string
  steps?: number
  force?: boolean
  backup?: boolean
  dryRun?: boolean
  reason?: string
}

export interface RollbackResult {
  success: boolean
  rolledBackMigrations: string[]
  backupPath?: string
  warnings: string[]
  errors: string[]
  executionTime: number
}

export interface DataBackup {
  timestamp: Date
  tables: string[]
  backupPath: string
  size: number
  checksum: string
}

/**
 * Advanced Rollback Manager with safety checks and data preservation
 */
export class RollbackManager {
  private migrationManager: MigrationManager
  private backupPath: string

  constructor(migrationManager: MigrationManager, backupPath: string = './backups') {
    this.migrationManager = migrationManager
    this.backupPath = backupPath
  }

  /**
   * Create rollback plan with risk assessment
   */
  async createRollbackPlan(options: RollbackOptions): Promise<RollbackPlan> {
    const status = await this.migrationManager.getStatus()
    const { target, steps } = options

    let migrationsToRollback: MigrationRecord[] = []

    if (target) {
      // Rollback to specific migration
      const targetIndex = status.applied.findIndex(m => m.id === target)
      if (targetIndex === -1) {
        throw new Error(`Target migration ${target} not found in applied migrations`)
      }
      migrationsToRollback = status.applied.slice(targetIndex + 1).reverse()
    } else if (steps) {
      // Rollback specific number of steps
      migrationsToRollback = status.applied.slice(-steps).reverse()
    } else {
      // Rollback last migration
      if (status.lastMigration) {
        migrationsToRollback = [status.lastMigration]
      }
    }

    // Assess risks and warnings
    const warnings: string[] = []
    let riskLevel: 'low' | 'medium' | 'high' = 'low'
    let dataLossRisk = false

    for (const migration of migrationsToRollback) {
      if (!migration.rollbackSafe) {
        warnings.push(`Migration ${migration.name} is not marked as rollback-safe`)
        riskLevel = 'high'
        dataLossRisk = true
      }

      // Check for data-destructive operations
      const migrations = await this.migrationManager.loadMigrations()
      const migrationDef = migrations.find(m => m.id === migration.id)
      if (migrationDef && this.containsDestructiveOperations(migrationDef.down)) {
        warnings.push(`Migration ${migration.name} contains potentially destructive rollback operations`)
        riskLevel = riskLevel === 'low' ? 'medium' : 'high'
        dataLossRisk = true
      }
    }

    // Estimate execution time
    const estimatedTime = migrationsToRollback.reduce((total, m) => total + m.executionTime, 0)

    return {
      migrations: migrationsToRollback,
      estimatedTime,
      riskLevel,
      warnings,
      dataLossRisk
    }
  }

  /**
   * Execute rollback with safety checks
   */
  async rollback(options: RollbackOptions = {}): Promise<RollbackResult> {
    const startTime = Date.now()
    const result: RollbackResult = {
      success: false,
      rolledBackMigrations: [],
      warnings: [],
      errors: [],
      executionTime: 0
    }

    try {
      // Create rollback plan
      const plan = await this.createRollbackPlan(options)
      
      if (plan.migrations.length === 0) {
        result.warnings.push('No migrations to rollback')
        result.success = true
        return result
      }

      // Safety checks
      if (plan.riskLevel === 'high' && !options.force) {
        throw new Error('High-risk rollback detected. Use --force to proceed anyway.')
      }

      if (plan.dataLossRisk && !options.backup && !options.force) {
        throw new Error('Data loss risk detected. Use --backup or --force to proceed.')
      }

      // Create backup if requested or required
      if (options.backup || plan.dataLossRisk) {
        console.log('Creating database backup...')
        const backup = await this.createBackup()
        result.backupPath = backup.backupPath
        console.log(`✅ Backup created: ${backup.backupPath}`)
      }

      // Dry run check
      if (options.dryRun) {
        console.log('[DRY RUN] Would rollback the following migrations:')
        plan.migrations.forEach(m => {
          console.log(`  - ${m.name} (${m.id})`)
        })
        result.success = true
        return result
      }

      // Execute rollbacks in reverse order
      const migrations = await this.migrationManager.loadMigrations()
      
      for (const migrationRecord of plan.migrations) {
        const migration = migrations.find(m => m.id === migrationRecord.id)
        if (!migration) {
          result.errors.push(`Migration definition not found: ${migrationRecord.id}`)
          continue
        }

        console.log(`Rolling back: ${migration.name}`)
        
        try {
          await this.executeRollback(migration, options.reason || 'Manual rollback')
          result.rolledBackMigrations.push(migration.id)
          console.log(`✅ Rolled back: ${migration.name}`)
        } catch (error) {
          const errorMsg = `Failed to rollback ${migration.name}: ${error}`
          result.errors.push(errorMsg)
          console.error(`❌ ${errorMsg}`)
          
          // Stop on first error unless force is used
          if (!options.force) {
            break
          }
        }
      }

      result.success = result.errors.length === 0
      result.executionTime = Date.now() - startTime

      if (result.success) {
        console.log(`✅ Rollback completed successfully in ${result.executionTime}ms`)
      } else {
        console.log(`⚠️ Rollback completed with errors in ${result.executionTime}ms`)
      }

      return result

    } catch (error) {
      result.errors.push(`Rollback failed: ${error}`)
      result.executionTime = Date.now() - startTime
      console.error(`❌ Rollback failed: ${error}`)
      return result
    }
  }

  /**
   * Create database backup
   */
  async createBackup(): Promise<DataBackup> {
    const timestamp = new Date()
    const backupFileName = `backup_${timestamp.toISOString().replace(/[:.]/g, '-')}.sql`
    const backupFilePath = join(this.backupPath, backupFileName)

    // Ensure backup directory exists
    await import('fs').then(fs => fs.promises.mkdir(this.backupPath, { recursive: true }))

    // Get all table names
    const tables = await this.getAllTableNames()

    // Create backup SQL
    let backupSql = `-- Database backup created at ${timestamp.toISOString()}\n\n`

    for (const table of tables) {
      backupSql += await this.exportTableData(table)
      backupSql += '\n\n'
    }

    // Write backup file
    await writeFile(backupFilePath, backupSql, 'utf-8')
    
    // Calculate file size and checksum
    const stats = await import('fs').then(fs => fs.promises.stat(backupFilePath))
    const content = await readFile(backupFilePath, 'utf-8')
    const checksum = require('crypto').createHash('sha256').update(content).digest('hex')

    return {
      timestamp,
      tables,
      backupPath: backupFilePath,
      size: stats.size,
      checksum
    }
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(backupPath: string): Promise<void> {
    console.log(`Restoring from backup: ${backupPath}`)
    
    const backupSql = await readFile(backupPath, 'utf-8')
    const db = (this.migrationManager as any).db
    
    // Execute backup SQL
    const isPostgres = (this.migrationManager as any).isPostgres
    if (isPostgres) {
      await db.execute(sql.raw(backupSql))
    } else {
      const connection = (this.migrationManager as any).connection
      connection.exec(backupSql)
    }
    
    console.log('✅ Backup restored successfully')
  }

  /**
   * List available backups
   */
  async listBackups(): Promise<DataBackup[]> {
    const fs = await import('fs').then(fs => fs.promises)
    
    try {
      const files = await fs.readdir(this.backupPath)
      const backupFiles = files.filter(f => f.startsWith('backup_') && f.endsWith('.sql'))
      
      const backups: DataBackup[] = []
      
      for (const file of backupFiles) {
        const filePath = join(this.backupPath, file)
        const stats = await fs.stat(filePath)
        const content = await readFile(filePath, 'utf-8')
        const checksum = require('crypto').createHash('sha256').update(content).digest('hex')
        
        // Extract timestamp from filename
        const timestampStr = file.replace('backup_', '').replace('.sql', '').replace(/-/g, ':')
        const timestamp = new Date(timestampStr)
        
        backups.push({
          timestamp,
          tables: [], // Would need to parse from backup file
          backupPath: filePath,
          size: stats.size,
          checksum
        })
      }
      
      return backups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    } catch (error) {
      console.warn('Could not list backups:', error)
      return []
    }
  }

  /**
   * Check if migration contains destructive operations
   */
  private containsDestructiveOperations(sql: string): boolean {
    const destructivePatterns = [
      /DROP\s+TABLE/i,
      /DROP\s+COLUMN/i,
      /DELETE\s+FROM/i,
      /TRUNCATE/i,
      /ALTER\s+TABLE.*DROP/i
    ]
    
    return destructivePatterns.some(pattern => pattern.test(sql))
  }

  /**
   * Execute single migration rollback
   */
  private async executeRollback(migration: Migration, reason: string): Promise<void> {
    const db = (this.migrationManager as any).db
    const isPostgres = (this.migrationManager as any).isPostgres
    
    try {
      // Start transaction
      if (isPostgres) {
        await db.execute(sql`BEGIN`)
      } else {
        const connection = (this.migrationManager as any).connection
        connection.exec('BEGIN')
      }

      // Execute rollback SQL
      if (migration.down) {
        if (isPostgres) {
          await db.execute(sql.raw(migration.down))
        } else {
          const connection = (this.migrationManager as any).connection
          connection.exec(migration.down)
        }
      }

      // Record rollback
      await this.recordRollback(migration.id, reason)

      // Commit transaction
      if (isPostgres) {
        await db.execute(sql`COMMIT`)
      } else {
        const connection = (this.migrationManager as any).connection
        connection.exec('COMMIT')
      }

    } catch (error) {
      // Rollback transaction
      if (isPostgres) {
        await db.execute(sql`ROLLBACK`)
      } else {
        const connection = (this.migrationManager as any).connection
        connection.exec('ROLLBACK')
      }
      throw error
    }
  }

  /**
   * Record rollback in tracking table
   */
  private async recordRollback(migrationId: string, reason: string): Promise<void> {
    const db = (this.migrationManager as any).db
    const isPostgres = (this.migrationManager as any).isPostgres
    const timestamp = isPostgres ? 'NOW()' : 'unixepoch()'
    const insertSql = `
      INSERT INTO __migration_rollbacks__ (migration_id, rolled_back_at, rollback_reason)
      VALUES ('${migrationId}', ${timestamp}, '${reason}')
    `
    const deleteSql = `DELETE FROM __migrations__ WHERE id = '${migrationId}'`

    if (isPostgres) {
      await db.execute(sql.raw(insertSql))
      await db.execute(sql.raw(deleteSql))
    } else {
      const connection = (this.migrationManager as any).connection
      connection.exec(insertSql)
      connection.exec(deleteSql)
    }
  }

  /**
   * Get all table names from database
   */
  private async getAllTableNames(): Promise<string[]> {
    const db = (this.migrationManager as any).db
    const isPostgres = (this.migrationManager as any).isPostgres
    
    if (isPostgres) {
      const result = await db.execute(sql`
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename NOT LIKE '__migration%'
      `)
      return result.map((row: any) => row.tablename)
    } else {
      const connection = (this.migrationManager as any).connection
      const result = connection.prepare(`
        SELECT name FROM sqlite_master
        WHERE type = 'table'
        AND name NOT LIKE '__migration%'
        AND name NOT LIKE 'sqlite_%'
      `).all()
      return result.map((row: any) => row.name)
    }
  }

  /**
   * Export table data as SQL
   */
  private async exportTableData(tableName: string): Promise<string> {
    const db = (this.migrationManager as any).db
    const isPostgres = (this.migrationManager as any).isPostgres

    try {
      let result: any[]
      if (isPostgres) {
        result = await db.execute(sql.raw(`SELECT * FROM ${tableName}`))
      } else {
        const connection = (this.migrationManager as any).connection
        result = connection.prepare(`SELECT * FROM ${tableName}`).all()
      }
      
      if (result.length === 0) {
        return `-- Table ${tableName} is empty`
      }

      let exportSql = `-- Data for table ${tableName}\n`
      
      // Get column names
      const columns = Object.keys(result[0])
      
      for (const row of result) {
        const values = columns.map(col => {
          const value = row[col]
          if (value === null) return 'NULL'
          if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`
          return value
        }).join(', ')
        
        exportSql += `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values});\n`
      }
      
      return exportSql
    } catch (error) {
      return `-- Error exporting table ${tableName}: ${error}`
    }
  }
}

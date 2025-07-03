/**
 * SemanticType: MigrationSystemTests
 * Description: Comprehensive test suite for migration system including rollback scenarios and performance validation
 * ExtensibleByAI: true
 * AIUseCases:
 *   - Add new test scenarios
 *   - Implement performance benchmarks
 *   - Add integration tests
 *   - Extend rollback testing
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals'
import Database from 'better-sqlite3'
import { MigrationManager } from '../migration-manager'
import { RollbackManager } from '../rollback-manager'
import { PerformanceOptimizer } from '../performance-optimizer'
import { tmpdir } from 'os'
import { join } from 'path'
import { unlink } from 'fs/promises'

describe('Migration System', () => {
  let db: Database.Database
  let migrationManager: MigrationManager
  let rollbackManager: RollbackManager
  let optimizer: PerformanceOptimizer
  let testDbPath: string

  beforeAll(async () => {
    // Create temporary database for testing
    testDbPath = join(tmpdir(), `test-migration-${Date.now()}.db`)
    db = new Database(testDbPath)
  })

  afterAll(async () => {
    // Clean up test database
    if (db) {
      db.close()
    }
    try {
      await unlink(testDbPath)
    } catch (error) {
      // Ignore cleanup errors
    }
  })

  beforeEach(async () => {
    // Initialize managers for each test
    migrationManager = new MigrationManager(db, './src/db/migrations', 'test')
    rollbackManager = new RollbackManager(migrationManager)
    optimizer = new PerformanceOptimizer((migrationManager as any).db, false)
    
    await migrationManager.initialize()
  })

  afterEach(async () => {
    // Clean up between tests
    try {
      await (migrationManager as any).db.execute({ sql: 'DROP TABLE IF EXISTS __migrations__' })
      await (migrationManager as any).db.execute({ sql: 'DROP TABLE IF EXISTS __migration_rollbacks__' })
    } catch (error) {
      // Ignore cleanup errors
    }
  })

  describe('MigrationManager', () => {
    it('should initialize migration tracking tables', async () => {
      await migrationManager.initialize()
      
      // Check if tracking tables exist
      const tables = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type = 'table' AND name LIKE '__migration%'
      `).all()
      
      expect(tables).toHaveLength(2)
      expect(tables.map(t => t.name)).toContain('__migrations__')
      expect(tables.map(t => t.name)).toContain('__migration_rollbacks__')
    })

    it('should load migration files correctly', async () => {
      const migrations = await migrationManager.loadMigrations()
      
      expect(migrations).toBeDefined()
      expect(Array.isArray(migrations)).toBe(true)
      
      // Check migration structure
      if (migrations.length > 0) {
        const migration = migrations[0]
        expect(migration).toHaveProperty('id')
        expect(migration).toHaveProperty('name')
        expect(migration).toHaveProperty('version')
        expect(migration).toHaveProperty('up')
        expect(migration).toHaveProperty('down')
        expect(migration).toHaveProperty('checksum')
        expect(migration).toHaveProperty('rollbackSafe')
      }
    })

    it('should get migration status correctly', async () => {
      const status = await migrationManager.getStatus()
      
      expect(status).toHaveProperty('pending')
      expect(status).toHaveProperty('applied')
      expect(status).toHaveProperty('failed')
      expect(status).toHaveProperty('canRollback')
      expect(Array.isArray(status.pending)).toBe(true)
      expect(Array.isArray(status.applied)).toBe(true)
      expect(Array.isArray(status.failed)).toBe(true)
      expect(typeof status.canRollback).toBe('boolean')
    })

    it('should execute migrations in dry run mode', async () => {
      const results = await migrationManager.migrate({ dryRun: true })
      
      expect(Array.isArray(results)).toBe(true)
      
      // Verify no actual changes were made
      const status = await migrationManager.getStatus()
      expect(status.applied).toHaveLength(0)
    })

    it('should calculate checksums consistently', async () => {
      const content = 'CREATE TABLE test (id INTEGER);'
      const checksum1 = (migrationManager as any).calculateChecksum(content)
      const checksum2 = (migrationManager as any).calculateChecksum(content)
      
      expect(checksum1).toBe(checksum2)
      expect(typeof checksum1).toBe('string')
      expect(checksum1.length).toBe(64) // SHA-256 hex length
    })

    it('should parse migration metadata correctly', async () => {
      const content = `
        -- @name: Test Migration
        -- @description: A test migration
        -- @rollbackSafe: true
        -- @performanceImpact: low
        CREATE TABLE test (id INTEGER);
      `
      
      const metadata = (migrationManager as any).parseMigrationMetadata(content)
      
      expect(metadata.name).toBe('Test Migration')
      expect(metadata.description).toBe('A test migration')
      expect(metadata.rollbackSafe).toBe('true')
      expect(metadata.performanceImpact).toBe('low')
    })

    it('should split migration content into up and down parts', async () => {
      const content = `
        CREATE TABLE test (id INTEGER);
        -- DOWN MIGRATION
        DROP TABLE test;
      `
      
      const { up, down } = (migrationManager as any).splitMigrationContent(content)
      
      expect(up).toContain('CREATE TABLE test')
      expect(down).toContain('DROP TABLE test')
    })
  })

  describe('RollbackManager', () => {
    it('should create rollback plan with risk assessment', async () => {
      // First apply a migration
      const testMigration = {
        id: 'test_001',
        name: 'Test Migration',
        version: 1,
        timestamp: new Date(),
        up: 'CREATE TABLE test_rollback (id INTEGER);',
        down: 'DROP TABLE test_rollback;',
        checksum: 'test-checksum',
        rollbackSafe: true,
        performanceImpact: 'low' as const
      }
      
      // Mock applied migration
      await (migrationManager as any).recordMigration({
        id: testMigration.id,
        name: testMigration.name,
        version: testMigration.version,
        appliedAt: new Date(),
        checksum: testMigration.checksum,
        executionTime: 100,
        rollbackSafe: true
      })
      
      const plan = await rollbackManager.createRollbackPlan({ steps: 1 })
      
      expect(plan).toHaveProperty('migrations')
      expect(plan).toHaveProperty('estimatedTime')
      expect(plan).toHaveProperty('riskLevel')
      expect(plan).toHaveProperty('warnings')
      expect(plan).toHaveProperty('dataLossRisk')
      expect(Array.isArray(plan.migrations)).toBe(true)
      expect(Array.isArray(plan.warnings)).toBe(true)
    })

    it('should detect destructive operations', async () => {
      const destructiveSql = 'DROP TABLE users; DELETE FROM important_data;'
      const isDestructive = (rollbackManager as any).containsDestructiveOperations(destructiveSql)
      
      expect(isDestructive).toBe(true)
    })

    it('should not flag safe operations as destructive', async () => {
      const safeSql = 'CREATE INDEX idx_test ON test (id); ALTER TABLE test ADD COLUMN name TEXT;'
      const isDestructive = (rollbackManager as any).containsDestructiveOperations(safeSql)
      
      expect(isDestructive).toBe(false)
    })

    it('should create and list backups', async () => {
      // Create a test table with data
      db.exec('CREATE TABLE test_backup (id INTEGER, name TEXT);')
      db.exec('INSERT INTO test_backup VALUES (1, "test");')
      
      const backup = await rollbackManager.createBackup()
      
      expect(backup).toHaveProperty('timestamp')
      expect(backup).toHaveProperty('backupPath')
      expect(backup).toHaveProperty('size')
      expect(backup).toHaveProperty('checksum')
      expect(backup.size).toBeGreaterThan(0)
      
      const backups = await rollbackManager.listBackups()
      expect(Array.isArray(backups)).toBe(true)
    })
  })

  describe('PerformanceOptimizer', () => {
    it('should generate optimization plan', async () => {
      const plan = await optimizer.generateOptimizationPlan()
      
      expect(plan).toHaveProperty('indexes')
      expect(plan).toHaveProperty('constraints')
      expect(plan).toHaveProperty('partitions')
      expect(plan).toHaveProperty('estimatedImprovements')
      expect(plan).toHaveProperty('warnings')
      
      expect(Array.isArray(plan.indexes)).toBe(true)
      expect(Array.isArray(plan.constraints)).toBe(true)
      expect(Array.isArray(plan.partitions)).toBe(true)
      expect(Array.isArray(plan.estimatedImprovements)).toBe(true)
      expect(Array.isArray(plan.warnings)).toBe(true)
    })

    it('should generate index recommendations', async () => {
      const indexes = await optimizer.generateIndexRecommendations()
      
      expect(Array.isArray(indexes)).toBe(true)
      
      if (indexes.length > 0) {
        const index = indexes[0]
        expect(index).toHaveProperty('name')
        expect(index).toHaveProperty('table')
        expect(index).toHaveProperty('columns')
        expect(index).toHaveProperty('type')
        expect(index).toHaveProperty('description')
        expect(index).toHaveProperty('estimatedImpact')
        expect(index).toHaveProperty('maintenanceCost')
        
        expect(Array.isArray(index.columns)).toBe(true)
        expect(['low', 'medium', 'high']).toContain(index.estimatedImpact)
        expect(['low', 'medium', 'high']).toContain(index.maintenanceCost)
      }
    })

    it('should generate constraint recommendations', async () => {
      const constraints = await optimizer.generateConstraintRecommendations()
      
      expect(Array.isArray(constraints)).toBe(true)
      
      if (constraints.length > 0) {
        const constraint = constraints[0]
        expect(constraint).toHaveProperty('name')
        expect(constraint).toHaveProperty('table')
        expect(constraint).toHaveProperty('type')
        expect(constraint).toHaveProperty('columns')
        expect(constraint).toHaveProperty('description')
        
        expect(Array.isArray(constraint.columns)).toBe(true)
        expect(['primary_key', 'foreign_key', 'unique', 'check']).toContain(constraint.type)
      }
    })

    it('should analyze table performance', async () => {
      // Create test table
      db.exec('CREATE TABLE test_performance (id INTEGER, name TEXT);')
      db.exec('INSERT INTO test_performance VALUES (1, "test");')
      
      const metrics = await optimizer.analyzePerformance()
      
      expect(Array.isArray(metrics)).toBe(true)
      
      if (metrics.length > 0) {
        const metric = metrics[0]
        expect(metric).toHaveProperty('tableName')
        expect(metric).toHaveProperty('rowCount')
        expect(metric).toHaveProperty('indexCount')
        expect(metric).toHaveProperty('avgQueryTime')
        expect(metric).toHaveProperty('slowQueries')
        expect(metric).toHaveProperty('recommendations')
        
        expect(typeof metric.rowCount).toBe('number')
        expect(typeof metric.indexCount).toBe('number')
        expect(Array.isArray(metric.slowQueries)).toBe(true)
        expect(Array.isArray(metric.recommendations)).toBe(true)
      }
    })

    it('should apply optimizations in dry run mode', async () => {
      const plan = await optimizer.generateOptimizationPlan()
      
      // Should not throw error in dry run mode
      await expect(optimizer.applyOptimizations(plan, { dryRun: true })).resolves.not.toThrow()
    })
  })

  describe('Integration Tests', () => {
    it('should handle complete migration lifecycle', async () => {
      // 1. Check initial status
      const initialStatus = await migrationManager.getStatus()
      expect(initialStatus.applied).toHaveLength(0)
      
      // 2. Run migrations in dry run
      const dryRunResults = await migrationManager.migrate({ dryRun: true })
      expect(Array.isArray(dryRunResults)).toBe(true)
      
      // 3. Verify no changes after dry run
      const afterDryRunStatus = await migrationManager.getStatus()
      expect(afterDryRunStatus.applied).toHaveLength(0)
      
      // 4. Apply optimizations
      const plan = await optimizer.generateOptimizationPlan()
      await optimizer.applyOptimizations(plan, { dryRun: true })
    })

    it('should handle rollback scenarios safely', async () => {
      // Create rollback plan for non-existent migrations
      const plan = await rollbackManager.createRollbackPlan({ steps: 1 })
      expect(plan.migrations).toHaveLength(0)
      
      // Execute rollback (should handle gracefully)
      const result = await rollbackManager.rollback({ dryRun: true })
      expect(result.success).toBe(true)
      expect(result.rolledBackMigrations).toHaveLength(0)
    })

    it('should maintain data integrity during operations', async () => {
      // Create test data
      db.exec('CREATE TABLE integrity_test (id INTEGER PRIMARY KEY, data TEXT);')
      db.exec('INSERT INTO integrity_test (data) VALUES ("test1"), ("test2");')
      
      const beforeCount = db.prepare('SELECT COUNT(*) as count FROM integrity_test').get() as { count: number }
      
      // Run various operations
      await migrationManager.getStatus()
      await optimizer.analyzePerformance()
      
      const afterCount = db.prepare('SELECT COUNT(*) as count FROM integrity_test').get() as { count: number }
      
      // Data should remain unchanged
      expect(afterCount.count).toBe(beforeCount.count)
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid migration files gracefully', async () => {
      // Test with non-existent migration path
      const invalidManager = new MigrationManager(db, './non-existent-path', 'test')
      
      await expect(invalidManager.loadMigrations()).rejects.toThrow()
    })

    it('should handle database connection errors', async () => {
      // Close database connection
      db.close()
      
      // Operations should handle closed connection gracefully
      await expect(migrationManager.getStatus()).rejects.toThrow()
    })

    it('should validate migration checksums', async () => {
      const content1 = 'CREATE TABLE test1 (id INTEGER);'
      const content2 = 'CREATE TABLE test2 (id INTEGER);'
      
      const checksum1 = (migrationManager as any).calculateChecksum(content1)
      const checksum2 = (migrationManager as any).calculateChecksum(content2)
      
      expect(checksum1).not.toBe(checksum2)
    })
  })
})

#!/usr/bin/env node

import dotenv from 'dotenv'
import { dbManager } from './connection'
import { MigrationManager } from './migrations/migration-manager'
import { PerformanceOptimizer } from './migrations/performance-optimizer'
import { exit } from 'process'

// Load environment variables
dotenv.config()

/**
 * Enhanced migration runner utility with advanced features
 * Can be run directly: npx tsx src/db/migrate.ts
 */
async function runMigrations() {
  try {
    console.log('🚀 Starting enhanced database migrations...')
    console.log('📍 Database URL:', process.env.DATABASE_URL)
    console.log('🌍 Environment:', process.env.NODE_ENV || 'development')

    // Connect to database
    await dbManager.connect()
    console.log('✅ Database connected')

    // Initialize enhanced migration manager
    const migrationManager = new MigrationManager(
      dbManager.getConnection(),
      './src/db/migrations',
      process.env.NODE_ENV || 'development'
    )

    // Initialize migration tracking
    await migrationManager.initialize()
    console.log('✅ Migration tracking initialized')

    // Check migration status
    const status = await migrationManager.getStatus()
    console.log(`📊 Migration Status:`)
    console.log(`  - Applied: ${status.applied.length}`)
    console.log(`  - Pending: ${status.pending.length}`)
    console.log(`  - Failed: ${status.failed.length}`)

    if (status.pending.length === 0) {
      console.log('✅ No pending migrations')
    } else {
      console.log(`🔄 Running ${status.pending.length} pending migrations...`)

      // Run pending migrations
      const results = await migrationManager.migrate()
      console.log(`✅ Applied ${results.length} migrations successfully`)

      results.forEach(result => {
        console.log(`  - ${result.name} (${result.executionTime}ms)`)
      })
    }

    // Run legacy Drizzle migrations for compatibility
    console.log('🔄 Running legacy Drizzle migrations...')
    await dbManager.runMigrations()
    console.log('✅ Legacy migrations completed')

    // Apply performance optimizations
    console.log('⚡ Applying performance optimizations...')
    const isPostgres = process.env.DATABASE_URL?.startsWith('postgresql')
    const optimizer = new PerformanceOptimizer((migrationManager as any).db, isPostgres)

    const optimizationPlan = await optimizer.generateOptimizationPlan()
    console.log(`📈 Generated optimization plan:`)
    console.log(`  - Indexes: ${optimizationPlan.indexes.length}`)
    console.log(`  - Constraints: ${optimizationPlan.constraints.length}`)

    await optimizer.applyOptimizations(optimizationPlan)
    console.log('✅ Performance optimizations applied')

    // Final status check
    const finalStatus = await migrationManager.getStatus()
    console.log(`\n📊 Final Status:`)
    console.log(`  - Total Applied: ${finalStatus.applied.length}`)
    console.log(`  - Can Rollback: ${finalStatus.canRollback ? 'Yes' : 'No'}`)

    if (finalStatus.lastMigration) {
      console.log(`  - Last Migration: ${finalStatus.lastMigration.name}`)
    }

    // Disconnect
    await dbManager.disconnect()
    console.log('🔌 Database disconnected')

    console.log('\n✅ All migrations and optimizations completed successfully!')
    console.log('💡 Use "npm run migrate:status" to check migration status')
    console.log('💡 Use "npm run migrate:rollback" to rollback if needed')

    exit(0)
  } catch (error) {
    console.error('❌ Migration failed:', error)
    console.error('Error details:', error)

    // Attempt graceful cleanup
    try {
      await dbManager.disconnect()
    } catch (cleanupError) {
      console.error('❌ Cleanup failed:', cleanupError)
    }

    console.log('\n💡 Troubleshooting:')
    console.log('  - Check database connection and credentials')
    console.log('  - Review migration files for syntax errors')
    console.log('  - Use "npm run migrate:status" to check current state')
    console.log('  - Use "npm run migrate:rollback" to undo changes if needed')

    exit(1)
  }
}

// Run migrations if this file is executed directly
console.log('🔍 Checking if script is main module...')
console.log('import.meta.url:', import.meta.url)
console.log('process.argv[1]:', process.argv[1])

// Always run migrations when this script is executed
runMigrations()

export { runMigrations }

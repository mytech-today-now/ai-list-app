#!/usr/bin/env node

/**
 * SemanticType: MigrationCLI
 * Description: Command-line interface for advanced migration management with rollback, optimization, and monitoring capabilities
 * ExtensibleByAI: true
 * AIUseCases:
 *   - Add new CLI commands
 *   - Implement interactive migration wizards
 *   - Add migration scheduling
 *   - Extend reporting capabilities
 */

import { Command } from 'commander'
import { MigrationManager } from './migration-manager'
import { RollbackManager } from './rollback-manager'
import { PerformanceOptimizer } from './performance-optimizer'
import { dbManager } from '../connection'
import chalk from 'chalk'
import inquirer from 'inquirer'
import Table from 'cli-table3'

const program = new Command()

// Global options
program
  .name('migrate')
  .description('Advanced database migration management system')
  .version('1.0.0')
  .option('-e, --env <environment>', 'Environment (development|production|test)', 'development')
  .option('--dry-run', 'Show what would be done without executing')
  .option('--verbose', 'Show detailed output')

/**
 * Migration status command
 */
program
  .command('status')
  .description('Show migration status')
  .action(async (options) => {
    try {
      await dbManager.connect()
      const migrationManager = new MigrationManager(
        dbManager.getConnection(),
        './src/db/migrations',
        program.opts().env
      )
      
      await migrationManager.initialize()
      const status = await migrationManager.getStatus()
      
      console.log(chalk.blue('\n📊 Migration Status\n'))
      
      // Applied migrations
      if (status.applied.length > 0) {
        console.log(chalk.green('✅ Applied Migrations:'))
        const appliedTable = new Table({
          head: ['ID', 'Name', 'Version', 'Applied At', 'Execution Time'],
          colWidths: [20, 30, 10, 20, 15]
        })
        
        status.applied.forEach(m => {
          appliedTable.push([
            m.id.substring(0, 18),
            m.name.substring(0, 28),
            m.version,
            m.appliedAt.toISOString().substring(0, 19),
            `${m.executionTime}ms`
          ])
        })
        
        console.log(appliedTable.toString())
      }
      
      // Pending migrations
      if (status.pending.length > 0) {
        console.log(chalk.yellow('\n⏳ Pending Migrations:'))
        const pendingTable = new Table({
          head: ['ID', 'Name', 'Version', 'Performance Impact'],
          colWidths: [20, 30, 10, 20]
        })
        
        status.pending.forEach(m => {
          pendingTable.push([
            m.id.substring(0, 18),
            m.name.substring(0, 28),
            m.version,
            m.performanceImpact
          ])
        })
        
        console.log(pendingTable.toString())
      } else {
        console.log(chalk.green('\n✅ No pending migrations'))
      }
      
      // Failed migrations
      if (status.failed.length > 0) {
        console.log(chalk.red('\n❌ Failed Migrations:'))
        status.failed.forEach(m => {
          console.log(`  - ${m.name} (${m.id})`)
        })
      }
      
      // Summary
      console.log(chalk.blue('\n📈 Summary:'))
      console.log(`  Applied: ${status.applied.length}`)
      console.log(`  Pending: ${status.pending.length}`)
      console.log(`  Failed: ${status.failed.length}`)
      console.log(`  Can Rollback: ${status.canRollback ? 'Yes' : 'No'}`)
      
      if (status.lastMigration) {
        console.log(`  Last Migration: ${status.lastMigration.name}`)
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Error getting migration status:'), error)
      process.exit(1)
    } finally {
      await dbManager.disconnect()
    }
  })

/**
 * Run migrations command
 */
program
  .command('up')
  .description('Run pending migrations')
  .option('-t, --target <migration>', 'Run migrations up to specific target')
  .action(async (options) => {
    try {
      await dbManager.connect()
      const migrationManager = new MigrationManager(
        dbManager.getConnection(),
        './src/db/migrations',
        program.opts().env
      )
      
      await migrationManager.initialize()
      
      const migrationOptions = {
        dryRun: program.opts().dryRun,
        target: options.target
      }
      
      console.log(chalk.blue('🚀 Running migrations...\n'))
      
      const results = await migrationManager.migrate(migrationOptions)
      
      if (program.opts().dryRun) {
        console.log(chalk.yellow('✅ Dry run completed'))
      } else {
        console.log(chalk.green(`✅ Applied ${results.length} migrations`))
        results.forEach(result => {
          console.log(`  - ${result.name} (${result.executionTime}ms)`)
        })
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Migration failed:'), error)
      process.exit(1)
    } finally {
      await dbManager.disconnect()
    }
  })

/**
 * Rollback command
 */
program
  .command('rollback')
  .description('Rollback migrations')
  .option('-t, --target <migration>', 'Rollback to specific migration')
  .option('-s, --steps <number>', 'Number of migrations to rollback', '1')
  .option('--force', 'Force rollback even if risky')
  .option('--backup', 'Create backup before rollback')
  .option('--reason <reason>', 'Reason for rollback')
  .action(async (options) => {
    try {
      await dbManager.connect()
      const migrationManager = new MigrationManager(
        dbManager.getConnection(),
        './src/db/migrations',
        program.opts().env
      )
      
      const rollbackManager = new RollbackManager(migrationManager)
      await migrationManager.initialize()
      
      const rollbackOptions = {
        target: options.target,
        steps: options.steps ? parseInt(options.steps) : undefined,
        force: options.force,
        backup: options.backup,
        dryRun: program.opts().dryRun,
        reason: options.reason
      }
      
      // Create rollback plan
      const plan = await rollbackManager.createRollbackPlan(rollbackOptions)
      
      if (plan.migrations.length === 0) {
        console.log(chalk.yellow('No migrations to rollback'))
        return
      }
      
      // Show rollback plan
      console.log(chalk.blue('📋 Rollback Plan:\n'))
      console.log(`Risk Level: ${chalk[plan.riskLevel === 'high' ? 'red' : plan.riskLevel === 'medium' ? 'yellow' : 'green'](plan.riskLevel)}`)
      console.log(`Data Loss Risk: ${plan.dataLossRisk ? chalk.red('Yes') : chalk.green('No')}`)
      console.log(`Estimated Time: ${plan.estimatedTime}ms`)
      
      if (plan.warnings.length > 0) {
        console.log(chalk.yellow('\n⚠️  Warnings:'))
        plan.warnings.forEach(warning => console.log(`  - ${warning}`))
      }
      
      console.log(chalk.blue('\nMigrations to rollback:'))
      plan.migrations.forEach(m => {
        console.log(`  - ${m.name} (${m.id})`)
      })
      
      // Confirm rollback
      if (!program.opts().dryRun && !options.force) {
        const { confirm } = await inquirer.prompt([{
          type: 'confirm',
          name: 'confirm',
          message: 'Are you sure you want to proceed with this rollback?',
          default: false
        }])
        
        if (!confirm) {
          console.log(chalk.yellow('Rollback cancelled'))
          return
        }
      }
      
      // Execute rollback
      console.log(chalk.blue('\n🔄 Executing rollback...\n'))
      const result = await rollbackManager.rollback(rollbackOptions)
      
      if (result.success) {
        console.log(chalk.green(`✅ Rollback completed in ${result.executionTime}ms`))
        if (result.backupPath) {
          console.log(`📦 Backup created: ${result.backupPath}`)
        }
      } else {
        console.log(chalk.red('❌ Rollback completed with errors:'))
        result.errors.forEach(error => console.log(`  - ${error}`))
      }
      
      if (result.warnings.length > 0) {
        console.log(chalk.yellow('\n⚠️  Warnings:'))
        result.warnings.forEach(warning => console.log(`  - ${warning}`))
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Rollback failed:'), error)
      process.exit(1)
    } finally {
      await dbManager.disconnect()
    }
  })

/**
 * Performance optimization command
 */
program
  .command('optimize')
  .description('Optimize database performance')
  .option('--analyze', 'Analyze current performance')
  .action(async (options) => {
    try {
      await dbManager.connect()
      const db = dbManager.getDb()
      const isPostgres = process.env.DATABASE_URL?.startsWith('postgresql')
      
      const optimizer = new PerformanceOptimizer(db, isPostgres)
      
      if (options.analyze) {
        console.log(chalk.blue('📊 Analyzing database performance...\n'))
        const metrics = await optimizer.analyzePerformance()
        
        const metricsTable = new Table({
          head: ['Table', 'Rows', 'Indexes', 'Recommendations'],
          colWidths: [20, 10, 10, 50]
        })
        
        metrics.forEach(metric => {
          metricsTable.push([
            metric.tableName,
            metric.rowCount.toLocaleString(),
            metric.indexCount,
            metric.recommendations.slice(0, 2).join('; ')
          ])
        })
        
        console.log(metricsTable.toString())
      } else {
        console.log(chalk.blue('🚀 Generating optimization plan...\n'))
        const plan = await optimizer.generateOptimizationPlan()
        
        console.log(chalk.green(`📈 Optimization Plan:`))
        console.log(`  Indexes to create: ${plan.indexes.length}`)
        console.log(`  Constraints to add: ${plan.constraints.length}`)
        console.log(`  Partitions to create: ${plan.partitions.length}`)
        
        if (plan.warnings.length > 0) {
          console.log(chalk.yellow('\n⚠️  Warnings:'))
          plan.warnings.forEach(warning => console.log(`  - ${warning}`))
        }
        
        // Show high-impact indexes
        const highImpactIndexes = plan.indexes.filter(idx => idx.estimatedImpact === 'high')
        if (highImpactIndexes.length > 0) {
          console.log(chalk.blue('\n🎯 High-Impact Indexes:'))
          highImpactIndexes.forEach(idx => {
            console.log(`  - ${idx.name}: ${idx.description}`)
          })
        }
        
        // Confirm optimization
        if (!program.opts().dryRun) {
          const { confirm } = await inquirer.prompt([{
            type: 'confirm',
            name: 'confirm',
            message: 'Apply these optimizations?',
            default: false
          }])
          
          if (confirm) {
            console.log(chalk.blue('\n⚡ Applying optimizations...\n'))
            await optimizer.applyOptimizations(plan, { dryRun: false })
            console.log(chalk.green('✅ Optimizations applied successfully'))
          }
        } else {
          console.log(chalk.yellow('\n[DRY RUN] Optimizations would be applied'))
        }
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Optimization failed:'), error)
      process.exit(1)
    } finally {
      await dbManager.disconnect()
    }
  })

/**
 * Backup management command
 */
program
  .command('backup')
  .description('Manage database backups')
  .option('--create', 'Create a new backup')
  .option('--list', 'List available backups')
  .option('--restore <path>', 'Restore from backup file')
  .action(async (options) => {
    try {
      await dbManager.connect()
      const migrationManager = new MigrationManager(
        dbManager.getConnection(),
        './src/db/migrations',
        program.opts().env
      )
      
      const rollbackManager = new RollbackManager(migrationManager)
      
      if (options.create) {
        console.log(chalk.blue('📦 Creating database backup...\n'))
        const backup = await rollbackManager.createBackup()
        console.log(chalk.green('✅ Backup created successfully:'))
        console.log(`  Path: ${backup.backupPath}`)
        console.log(`  Size: ${(backup.size / 1024).toFixed(2)} KB`)
        console.log(`  Tables: ${backup.tables.length}`)
        console.log(`  Checksum: ${backup.checksum.substring(0, 16)}...`)
      } else if (options.list) {
        console.log(chalk.blue('📋 Available backups:\n'))
        const backups = await rollbackManager.listBackups()
        
        if (backups.length === 0) {
          console.log(chalk.yellow('No backups found'))
        } else {
          const backupTable = new Table({
            head: ['Timestamp', 'Size', 'Path'],
            colWidths: [25, 15, 50]
          })
          
          backups.forEach(backup => {
            backupTable.push([
              backup.timestamp.toISOString(),
              `${(backup.size / 1024).toFixed(2)} KB`,
              backup.backupPath
            ])
          })
          
          console.log(backupTable.toString())
        }
      } else if (options.restore) {
        console.log(chalk.blue(`🔄 Restoring from backup: ${options.restore}\n`))
        
        const { confirm } = await inquirer.prompt([{
          type: 'confirm',
          name: 'confirm',
          message: 'This will overwrite current data. Are you sure?',
          default: false
        }])
        
        if (confirm) {
          await rollbackManager.restoreFromBackup(options.restore)
          console.log(chalk.green('✅ Backup restored successfully'))
        } else {
          console.log(chalk.yellow('Restore cancelled'))
        }
      } else {
        console.log(chalk.yellow('Please specify --create, --list, or --restore <path>'))
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Backup operation failed:'), error)
      process.exit(1)
    } finally {
      await dbManager.disconnect()
    }
  })

// Parse command line arguments
program.parse()

// Export for programmatic use
export { program }

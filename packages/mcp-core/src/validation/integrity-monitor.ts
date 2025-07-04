import { ValidationResult, ValidationError, ValidationErrorCodes } from './model-validators'
import { ForeignKeyManager, IntegrityCheckResult } from './foreign-key-manager'
import { BusinessRuleEngine } from './business-rule-engine'

/**
 * Data integrity check configuration
 */
export interface IntegrityCheckConfig {
  checkForeignKeys: boolean
  checkBusinessRules: boolean
  checkConstraints: boolean
  checkOrphans: boolean
  checkCircularReferences: boolean
  checkDataConsistency: boolean
  tables?: string[]
  batchSize?: number
  maxErrors?: number
}

/**
 * Integrity monitoring result
 */
export interface IntegrityMonitorResult {
  success: boolean
  checksPerformed: number
  violationsFound: number
  errors: IntegrityViolation[]
  warnings: IntegrityWarning[]
  summary: IntegritySummary
  timestamp: Date
  duration: number
}

/**
 * Integrity violation
 */
export interface IntegrityViolation {
  type: 'FOREIGN_KEY' | 'BUSINESS_RULE' | 'CONSTRAINT' | 'ORPHAN' | 'CIRCULAR_REF' | 'DATA_CONSISTENCY'
  severity: 'critical' | 'high' | 'medium' | 'low'
  table: string
  recordId: string
  field?: string
  message: string
  details: Record<string, any>
  suggestedFix?: string
}

/**
 * Integrity warning
 */
export interface IntegrityWarning {
  type: string
  table: string
  recordId?: string
  message: string
  details: Record<string, any>
}

/**
 * Integrity summary
 */
export interface IntegritySummary {
  totalRecords: number
  tablesChecked: string[]
  violationsByType: Record<string, number>
  violationsBySeverity: Record<string, number>
  healthScore: number // 0-100
  recommendations: string[]
}

/**
 * Scheduled check configuration
 */
export interface ScheduledCheckConfig {
  id: string
  name: string
  schedule: string // cron expression
  config: IntegrityCheckConfig
  enabled: boolean
  lastRun?: Date
  nextRun?: Date
}

/**
 * Data integrity monitoring system
 */
export class IntegrityMonitor {
  private foreignKeyManager: ForeignKeyManager
  private businessRuleEngine: BusinessRuleEngine
  private scheduledChecks: Map<string, ScheduledCheckConfig> = new Map()
  private dbConnection: any

  constructor(
    foreignKeyManager: ForeignKeyManager,
    businessRuleEngine: BusinessRuleEngine,
    dbConnection?: any
  ) {
    this.foreignKeyManager = foreignKeyManager
    this.businessRuleEngine = businessRuleEngine
    this.dbConnection = dbConnection
  }

  /**
   * Perform comprehensive integrity check
   */
  async performIntegrityCheck(config: IntegrityCheckConfig): Promise<IntegrityMonitorResult> {
    const startTime = Date.now()
    const result: IntegrityMonitorResult = {
      success: true,
      checksPerformed: 0,
      violationsFound: 0,
      errors: [],
      warnings: [],
      summary: {
        totalRecords: 0,
        tablesChecked: [],
        violationsByType: {},
        violationsBySeverity: {},
        healthScore: 100,
        recommendations: []
      },
      timestamp: new Date(),
      duration: 0
    }

    try {
      // Check foreign key constraints
      if (config.checkForeignKeys) {
        const fkResults = await this.checkForeignKeyIntegrity(config)
        this.mergeResults(result, fkResults)
        result.checksPerformed++
      }

      // Check business rules
      if (config.checkBusinessRules) {
        const brResults = await this.checkBusinessRuleCompliance(config)
        this.mergeResults(result, brResults)
        result.checksPerformed++
      }

      // Check for orphaned records
      if (config.checkOrphans) {
        const orphanResults = await this.checkOrphanedRecords(config)
        this.mergeResults(result, orphanResults)
        result.checksPerformed++
      }

      // Check for circular references
      if (config.checkCircularReferences) {
        const circularResults = await this.checkCircularReferences(config)
        this.mergeResults(result, circularResults)
        result.checksPerformed++
      }

      // Check data consistency
      if (config.checkDataConsistency) {
        const consistencyResults = await this.checkDataConsistency(config)
        this.mergeResults(result, consistencyResults)
        result.checksPerformed++
      }

      // Calculate health score and recommendations
      result.summary.healthScore = this.calculateHealthScore(result)
      result.summary.recommendations = this.generateRecommendations(result)

    } catch (error) {
      result.success = false
      result.errors.push({
        type: 'DATA_CONSISTENCY',
        severity: 'critical',
        table: 'system',
        recordId: 'monitor',
        message: `Integrity check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { error: error instanceof Error ? error.stack : error }
      })
    }

    result.duration = Date.now() - startTime
    result.violationsFound = result.errors.length

    return result
  }

  /**
   * Check foreign key integrity
   */
  private async checkForeignKeyIntegrity(config: IntegrityCheckConfig): Promise<Partial<IntegrityMonitorResult>> {
    const result: Partial<IntegrityMonitorResult> = {
      errors: [],
      warnings: []
    }

    try {
      const integrityResults = await this.foreignKeyManager.checkReferentialIntegrity()
      
      for (const checkResult of integrityResults) {
        if (!checkResult.isValid) {
          for (const violation of checkResult.violations) {
            result.errors!.push({
              type: 'FOREIGN_KEY',
              severity: 'high',
              table: violation.sourceTable,
              recordId: violation.sourceId,
              message: violation.message,
              details: {
                constraint: checkResult.constraint,
                targetTable: violation.targetTable,
                targetId: violation.targetId,
                violationType: violation.violationType
              },
              suggestedFix: this.getSuggestedFix(violation.violationType, violation)
            })
          }
        }
      }
    } catch (error) {
      result.errors!.push({
        type: 'FOREIGN_KEY',
        severity: 'critical',
        table: 'system',
        recordId: 'fk_check',
        message: `Foreign key check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { error }
      })
    }

    return result
  }

  /**
   * Check business rule compliance
   */
  private async checkBusinessRuleCompliance(config: IntegrityCheckConfig): Promise<Partial<IntegrityMonitorResult>> {
    const result: Partial<IntegrityMonitorResult> = {
      errors: [],
      warnings: []
    }

    const tables = config.tables || ['lists', 'items', 'agents']
    
    for (const table of tables) {
      try {
        const records = await this.getTableRecords(table, config.batchSize || 1000)
        
        for (const record of records) {
          const validationResult = await this.businessRuleEngine.executeRules(table, record, {
            operation: 'update',
            currentModel: table,
            modelData: record
          })

          if (!validationResult.success) {
            for (const error of validationResult.errors) {
              result.errors!.push({
                type: 'BUSINESS_RULE',
                severity: 'medium',
                table,
                recordId: record.id,
                field: error.field,
                message: error.message,
                details: error.context || {},
                suggestedFix: this.getBusinessRuleFix(error.code)
              })
            }
          }

          for (const warning of validationResult.warnings) {
            result.warnings!.push({
              type: 'BUSINESS_RULE',
              table,
              recordId: record.id,
              message: warning.message,
              details: warning.context || {}
            })
          }
        }
      } catch (error) {
        result.errors!.push({
          type: 'BUSINESS_RULE',
          severity: 'high',
          table,
          recordId: 'batch_check',
          message: `Business rule check failed for table ${table}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          details: { error, table }
        })
      }
    }

    return result
  }

  /**
   * Check for orphaned records
   */
  private async checkOrphanedRecords(config: IntegrityCheckConfig): Promise<Partial<IntegrityMonitorResult>> {
    const result: Partial<IntegrityMonitorResult> = {
      errors: [],
      warnings: []
    }

    // Check for items without valid lists
    const orphanedItems = await this.findOrphanedItems()
    for (const item of orphanedItems) {
      result.errors!.push({
        type: 'ORPHAN',
        severity: 'high',
        table: 'items',
        recordId: item.id,
        message: `Item references non-existent list: ${item.listId}`,
        details: { listId: item.listId },
        suggestedFix: 'Delete orphaned item or create missing list'
      })
    }

    // Check for sessions without valid agents
    const orphanedSessions = await this.findOrphanedSessions()
    for (const session of orphanedSessions) {
      result.warnings!.push({
        type: 'ORPHAN',
        table: 'sessions',
        recordId: session.id,
        message: `Session references non-existent agent: ${session.agentId}`,
        details: { agentId: session.agentId }
      })
    }

    return result
  }

  /**
   * Check for circular references
   */
  private async checkCircularReferences(config: IntegrityCheckConfig): Promise<Partial<IntegrityMonitorResult>> {
    const result: Partial<IntegrityMonitorResult> = {
      errors: [],
      warnings: []
    }

    // Check for circular list hierarchies
    const circularLists = await this.findCircularListReferences()
    for (const list of circularLists) {
      result.errors!.push({
        type: 'CIRCULAR_REF',
        severity: 'high',
        table: 'lists',
        recordId: list.id,
        message: `List is part of circular hierarchy`,
        details: { parentListId: list.parentListId, path: list.path },
        suggestedFix: 'Break circular reference by updating parent relationship'
      })
    }

    // Check for circular item dependencies
    const circularItems = await this.findCircularItemDependencies()
    for (const item of circularItems) {
      result.errors!.push({
        type: 'CIRCULAR_REF',
        severity: 'medium',
        table: 'items',
        recordId: item.id,
        message: `Item is part of circular dependency`,
        details: { dependencies: item.dependencies, path: item.path },
        suggestedFix: 'Remove circular dependency from item'
      })
    }

    return result
  }

  /**
   * Check data consistency
   */
  private async checkDataConsistency(config: IntegrityCheckConfig): Promise<Partial<IntegrityMonitorResult>> {
    const result: Partial<IntegrityMonitorResult> = {
      errors: [],
      warnings: []
    }

    // Check for inconsistent timestamps
    const timestampIssues = await this.findTimestampInconsistencies()
    for (const issue of timestampIssues) {
      result.warnings!.push({
        type: 'DATA_CONSISTENCY',
        table: issue.table,
        recordId: issue.recordId,
        message: issue.message,
        details: issue.details
      })
    }

    // Check for status inconsistencies
    const statusIssues = await this.findStatusInconsistencies()
    for (const issue of statusIssues) {
      result.errors!.push({
        type: 'DATA_CONSISTENCY',
        severity: 'medium',
        table: issue.table,
        recordId: issue.recordId,
        message: issue.message,
        details: issue.details,
        suggestedFix: 'Update status or related fields to maintain consistency'
      })
    }

    return result
  }

  /**
   * Helper methods for data retrieval (these would be implemented with actual database queries)
   */
  private async getTableRecords(table: string, limit: number): Promise<any[]> {
    // This would execute: SELECT * FROM {table} LIMIT {limit}
    return [] // Placeholder
  }

  private async findOrphanedItems(): Promise<any[]> {
    // This would find items that reference non-existent lists
    return [] // Placeholder
  }

  private async findOrphanedSessions(): Promise<any[]> {
    // This would find sessions that reference non-existent agents
    return [] // Placeholder
  }

  private async findCircularListReferences(): Promise<any[]> {
    // This would use recursive CTE to find circular list hierarchies
    return [] // Placeholder
  }

  private async findCircularItemDependencies(): Promise<any[]> {
    // This would find circular dependencies in items
    return [] // Placeholder
  }

  private async findTimestampInconsistencies(): Promise<any[]> {
    // This would find records with inconsistent timestamps
    return [] // Placeholder
  }

  private async findStatusInconsistencies(): Promise<any[]> {
    // This would find records with inconsistent status fields
    return [] // Placeholder
  }

  /**
   * Utility methods
   */
  private mergeResults(target: IntegrityMonitorResult, source: Partial<IntegrityMonitorResult>): void {
    if (source.errors) {
      target.errors.push(...source.errors)
    }
    if (source.warnings) {
      target.warnings.push(...source.warnings)
    }
  }

  private calculateHealthScore(result: IntegrityMonitorResult): number {
    const totalIssues = result.errors.length + result.warnings.length
    if (totalIssues === 0) return 100

    const criticalWeight = 20
    const highWeight = 10
    const mediumWeight = 5
    const lowWeight = 1

    let weightedScore = 0
    for (const error of result.errors) {
      switch (error.severity) {
        case 'critical': weightedScore += criticalWeight; break
        case 'high': weightedScore += highWeight; break
        case 'medium': weightedScore += mediumWeight; break
        case 'low': weightedScore += lowWeight; break
      }
    }

    // Warnings count as low severity
    weightedScore += result.warnings.length * lowWeight

    // Calculate score (100 - penalty, minimum 0)
    const maxPossibleScore = 100
    const penalty = Math.min(weightedScore, maxPossibleScore)
    
    return Math.max(0, maxPossibleScore - penalty)
  }

  private generateRecommendations(result: IntegrityMonitorResult): string[] {
    const recommendations: string[] = []

    const criticalErrors = result.errors.filter(e => e.severity === 'critical')
    if (criticalErrors.length > 0) {
      recommendations.push('Address critical integrity violations immediately')
    }

    const fkErrors = result.errors.filter(e => e.type === 'FOREIGN_KEY')
    if (fkErrors.length > 0) {
      recommendations.push('Review and fix foreign key constraint violations')
    }

    const circularRefs = result.errors.filter(e => e.type === 'CIRCULAR_REF')
    if (circularRefs.length > 0) {
      recommendations.push('Resolve circular references in data relationships')
    }

    if (result.summary.healthScore < 80) {
      recommendations.push('Consider running integrity checks more frequently')
    }

    if (result.warnings.length > 10) {
      recommendations.push('Review data quality processes to reduce warnings')
    }

    return recommendations
  }

  private getSuggestedFix(violationType: string, violation: any): string {
    switch (violationType) {
      case 'MISSING_REFERENCE':
        return `Create missing ${violation.targetTable} record or update reference`
      case 'ORPHANED_RECORD':
        return `Delete orphaned record or restore missing reference`
      case 'CIRCULAR_REFERENCE':
        return 'Break circular reference by updating parent/child relationships'
      default:
        return 'Review and fix data integrity issue'
    }
  }

  private getBusinessRuleFix(errorCode: string): string {
    switch (errorCode) {
      case ValidationErrorCodes.BUSINESS_RULE_VIOLATION:
        return 'Review business rule requirements and update data accordingly'
      case ValidationErrorCodes.INVALID_STATE_TRANSITION:
        return 'Ensure status transitions follow valid business logic'
      case ValidationErrorCodes.CIRCULAR_DEPENDENCY:
        return 'Remove circular dependencies from item relationships'
      default:
        return 'Review business rule violation and correct data'
    }
  }

  /**
   * Schedule integrity checks
   */
  addScheduledCheck(config: ScheduledCheckConfig): void {
    this.scheduledChecks.set(config.id, config)
  }

  removeScheduledCheck(id: string): void {
    this.scheduledChecks.delete(id)
  }

  getScheduledChecks(): ScheduledCheckConfig[] {
    return Array.from(this.scheduledChecks.values())
  }
}

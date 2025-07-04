import { 
  BaseModelValidator, 
  ValidationContext, 
  ValidationResult, 
  validationRegistry 
} from './model-validators'
import { ListValidator } from './list-validator'
import { ItemValidator } from './item-validator'
import { ForeignKeyManager } from './foreign-key-manager'
import { BusinessRuleEngine } from './business-rule-engine'
import { IntegrityMonitor } from './integrity-monitor'
import { factoryRegistry } from './model-factories'

/**
 * Validation system configuration
 */
export interface ValidationSystemConfig {
  enableForeignKeyChecks: boolean
  enableBusinessRules: boolean
  enableIntegrityMonitoring: boolean
  enableFactories: boolean
  dbConnection?: any
  scheduledChecks?: boolean
}

/**
 * Integrated validation system result
 */
export interface ValidationSystemResult {
  success: boolean
  modelValidation: ValidationResult
  foreignKeyValidation?: ValidationResult
  businessRuleValidation?: ValidationResult
  integrityCheck?: any
  errors: string[]
  warnings: string[]
  metadata: Record<string, any>
}

/**
 * Comprehensive validation system that integrates all validation components
 */
export class ValidationSystem {
  private foreignKeyManager: ForeignKeyManager
  private businessRuleEngine: BusinessRuleEngine
  private integrityMonitor: IntegrityMonitor
  private config: ValidationSystemConfig
  private initialized: boolean = false

  constructor(config: ValidationSystemConfig) {
    this.config = config
    this.foreignKeyManager = new ForeignKeyManager(config.dbConnection)
    this.businessRuleEngine = new BusinessRuleEngine(config.dbConnection)
    this.integrityMonitor = new IntegrityMonitor(
      this.foreignKeyManager,
      this.businessRuleEngine,
      config.dbConnection
    )
  }

  /**
   * Initialize the validation system
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }

    try {
      // Register model validators
      this.registerModelValidators()

      // Initialize foreign key constraints
      if (this.config.enableForeignKeyChecks) {
        await this.initializeForeignKeyConstraints()
      }

      // Initialize business rules
      if (this.config.enableBusinessRules) {
        await this.initializeBusinessRules()
      }

      // Setup integrity monitoring
      if (this.config.enableIntegrityMonitoring) {
        await this.setupIntegrityMonitoring()
      }

      this.initialized = true
      console.log('✅ Validation system initialized successfully')

    } catch (error) {
      console.error('❌ Failed to initialize validation system:', error)
      throw error
    }
  }

  /**
   * Validate model data with comprehensive checks
   */
  async validateModel(
    modelName: string,
    data: unknown,
    context: ValidationContext
  ): Promise<ValidationSystemResult> {
    const result: ValidationSystemResult = {
      success: true,
      modelValidation: { success: true, errors: [], warnings: [] },
      errors: [],
      warnings: [],
      metadata: {
        modelName,
        operation: context.operation,
        timestamp: new Date().toISOString()
      }
    }

    try {
      // 1. Basic model validation (Zod schemas + constraints)
      result.modelValidation = await validationRegistry.validateCreate(modelName, data, context)
      
      if (!result.modelValidation.success) {
        result.success = false
        result.errors.push(...result.modelValidation.errors.map(e => e.message))
      }
      
      result.warnings.push(...result.modelValidation.warnings.map(w => w.message))

      // 2. Foreign key validation (if enabled and data is valid)
      if (this.config.enableForeignKeyChecks && result.modelValidation.success) {
        result.foreignKeyValidation = await this.foreignKeyManager.validateReferences(
          modelName, 
          result.modelValidation.data as Record<string, any>
        )
        
        if (!result.foreignKeyValidation.success) {
          result.success = false
          result.errors.push(...result.foreignKeyValidation.errors.map(e => e.message))
        }
      }

      // 3. Business rule validation (if enabled and data is valid)
      if (this.config.enableBusinessRules && result.modelValidation.success) {
        result.businessRuleValidation = await this.businessRuleEngine.executeRules(
          modelName,
          result.modelValidation.data,
          {
            ...context,
            currentModel: modelName,
            modelData: result.modelValidation.data
          }
        )
        
        if (!result.businessRuleValidation.success) {
          result.success = false
          result.errors.push(...result.businessRuleValidation.errors.map(e => e.message))
        }
        
        result.warnings.push(...result.businessRuleValidation.warnings.map(w => w.message))
      }

      // 4. Add metadata about validation process
      result.metadata.validationSteps = [
        'model_validation',
        ...(this.config.enableForeignKeyChecks ? ['foreign_key_validation'] : []),
        ...(this.config.enableBusinessRules ? ['business_rule_validation'] : [])
      ]

    } catch (error) {
      result.success = false
      result.errors.push(`Validation system error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    return result
  }

  /**
   * Validate deletion with cascade analysis
   */
  async validateDeletion(
    modelName: string,
    id: string,
    context: ValidationContext
  ): Promise<ValidationSystemResult> {
    const result: ValidationSystemResult = {
      success: true,
      modelValidation: { success: true, errors: [], warnings: [] },
      errors: [],
      warnings: [],
      metadata: {
        modelName,
        operation: 'delete',
        recordId: id,
        timestamp: new Date().toISOString()
      }
    }

    try {
      // 1. Model-specific deletion validation
      const validator = validationRegistry.get(modelName)
      if (validator) {
        result.modelValidation = await validator.validateDelete(id, context)
        
        if (!result.modelValidation.success) {
          result.success = false
          result.errors.push(...result.modelValidation.errors.map(e => e.message))
        }
      }

      // 2. Cascade analysis
      if (this.config.enableForeignKeyChecks) {
        const cascadeResult = await this.foreignKeyManager.handleCascadeDelete(modelName, id)
        
        if (!cascadeResult.success) {
          result.success = false
          result.errors.push(...cascadeResult.errors.map(e => e.message))
        }
        
        result.metadata.cascadeAnalysis = {
          affectedRecords: cascadeResult.affectedRecords.length,
          operations: cascadeResult.affectedRecords.map(r => ({
            table: r.table,
            operation: r.operation,
            recordId: r.id
          }))
        }
      }

    } catch (error) {
      result.success = false
      result.errors.push(`Deletion validation error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    return result
  }

  /**
   * Perform system-wide integrity check
   */
  async performIntegrityCheck(): Promise<any> {
    if (!this.config.enableIntegrityMonitoring) {
      throw new Error('Integrity monitoring is not enabled')
    }

    return await this.integrityMonitor.performIntegrityCheck({
      checkForeignKeys: this.config.enableForeignKeyChecks,
      checkBusinessRules: this.config.enableBusinessRules,
      checkConstraints: true,
      checkOrphans: true,
      checkCircularReferences: true,
      checkDataConsistency: true
    })
  }

  /**
   * Get validation statistics
   */
  getValidationStats(): Record<string, any> {
    return {
      registeredValidators: validationRegistry.getModelNames(),
      foreignKeyConstraints: this.foreignKeyManager.getAllConstraints().length,
      businessRules: this.businessRuleEngine.getAllRules().length,
      factoriesAvailable: factoryRegistry.getFactoryNames(),
      systemHealth: {
        initialized: this.initialized,
        foreignKeyChecksEnabled: this.config.enableForeignKeyChecks,
        businessRulesEnabled: this.config.enableBusinessRules,
        integrityMonitoringEnabled: this.config.enableIntegrityMonitoring
      }
    }
  }

  /**
   * Private initialization methods
   */
  private registerModelValidators(): void {
    // Register built-in validators
    validationRegistry.register('list', new ListValidator())
    validationRegistry.register('item', new ItemValidator())
    
    console.log('📝 Model validators registered:', validationRegistry.getModelNames())
  }

  private async initializeForeignKeyConstraints(): Promise<void> {
    // Foreign key constraints are initialized in the ForeignKeyManager constructor
    const constraints = this.foreignKeyManager.getAllConstraints()
    console.log(`🔗 Foreign key constraints initialized: ${constraints.length} constraints`)
  }

  private async initializeBusinessRules(): Promise<void> {
    // Business rules are initialized in the BusinessRuleEngine constructor
    const rules = this.businessRuleEngine.getAllRules()
    console.log(`📋 Business rules initialized: ${rules.length} rules`)
  }

  private async setupIntegrityMonitoring(): Promise<void> {
    // Setup scheduled integrity checks if enabled
    if (this.config.scheduledChecks) {
      this.integrityMonitor.addScheduledCheck({
        id: 'daily_integrity_check',
        name: 'Daily Integrity Check',
        schedule: '0 2 * * *', // 2 AM daily
        config: {
          checkForeignKeys: true,
          checkBusinessRules: true,
          checkConstraints: true,
          checkOrphans: true,
          checkCircularReferences: true,
          checkDataConsistency: true
        },
        enabled: true
      })
    }
    
    console.log('🔍 Integrity monitoring setup complete')
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    // Cleanup any resources, connections, etc.
    this.initialized = false
    console.log('🧹 Validation system cleanup complete')
  }
}

/**
 * Global validation system instance
 */
let globalValidationSystem: ValidationSystem | null = null

/**
 * Initialize global validation system
 */
export async function initializeValidationSystem(config: ValidationSystemConfig): Promise<ValidationSystem> {
  if (globalValidationSystem) {
    return globalValidationSystem
  }

  globalValidationSystem = new ValidationSystem(config)
  await globalValidationSystem.initialize()
  
  return globalValidationSystem
}

/**
 * Get global validation system instance
 */
export function getValidationSystem(): ValidationSystem {
  if (!globalValidationSystem) {
    throw new Error('Validation system not initialized. Call initializeValidationSystem() first.')
  }
  
  return globalValidationSystem
}

/**
 * Cleanup global validation system
 */
export async function cleanupValidationSystem(): Promise<void> {
  if (globalValidationSystem) {
    await globalValidationSystem.cleanup()
    globalValidationSystem = null
  }
}

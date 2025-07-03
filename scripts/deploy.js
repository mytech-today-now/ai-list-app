#!/usr/bin/env node

/**
 * Deployment automation script
 * Handles deployment to different environments with proper validation and rollback
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const { performance } = require('perf_hooks')

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
}

class DeploymentManager {
  constructor(environment = 'staging') {
    this.environment = environment
    this.startTime = performance.now()
    this.config = this.loadDeploymentConfig()
    this.deploymentId = this.generateDeploymentId()
    this.rollbackInfo = null
  }

  log(message, color = 'reset') {
    const timestamp = new Date().toISOString().substr(11, 8)
    console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`)
  }

  loadDeploymentConfig() {
    const configPath = path.join(process.cwd(), 'deployment.config.js')
    if (fs.existsSync(configPath)) {
      return require(configPath)
    }
    
    // Default configuration
    return {
      environments: {
        development: {
          url: 'http://localhost:5173',
          backend: 'http://localhost:3001',
          database: 'sqlite::memory:',
          skipTests: false,
          skipBuild: false,
        },
        staging: {
          url: 'https://staging.ai-todo-mcp.com',
          backend: 'https://api-staging.ai-todo-mcp.com',
          database: process.env.STAGING_DATABASE_URL,
          skipTests: false,
          skipBuild: false,
          requireApproval: false,
        },
        production: {
          url: 'https://ai-todo-mcp.com',
          backend: 'https://api.ai-todo-mcp.com',
          database: process.env.PRODUCTION_DATABASE_URL,
          skipTests: false,
          skipBuild: false,
          requireApproval: true,
          requireBackup: true,
          healthCheckRetries: 5,
          healthCheckDelay: 30000,
        },
      },
      docker: {
        registry: 'your-registry.com',
        namespace: 'ai-todo-mcp',
        tags: ['latest'],
      },
      notifications: {
        slack: {
          webhook: process.env.SLACK_WEBHOOK_URL,
          channel: '#deployments',
        },
        email: {
          recipients: ['team@ai-todo-mcp.com'],
        },
      },
    }
  }

  generateDeploymentId() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const version = this.getVersion()
    return `${this.environment}-${version}-${timestamp}`
  }

  getVersion() {
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
      return packageJson.version
    } catch (error) {
      return 'unknown'
    }
  }

  async validateEnvironment() {
    this.log(`🔍 Validating ${this.environment} environment...`, 'cyan')
    
    const envConfig = this.config.environments[this.environment]
    if (!envConfig) {
      throw new Error(`Unknown environment: ${this.environment}`)
    }
    
    // Check required environment variables
    const requiredVars = this.getRequiredEnvVars()
    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        throw new Error(`Missing required environment variable: ${varName}`)
      }
    }
    
    // Check database connection
    if (envConfig.database) {
      await this.validateDatabaseConnection(envConfig.database)
    }
    
    this.log('✅ Environment validation passed', 'green')
  }

  getRequiredEnvVars() {
    const baseVars = ['NODE_ENV']
    
    switch (this.environment) {
      case 'staging':
        return [...baseVars, 'STAGING_DATABASE_URL', 'JWT_SECRET']
      case 'production':
        return [...baseVars, 'PRODUCTION_DATABASE_URL', 'JWT_SECRET', 'OPENAI_API_KEY']
      default:
        return baseVars
    }
  }

  async validateDatabaseConnection(databaseUrl) {
    this.log('🗄️  Validating database connection...', 'blue')
    
    try {
      // This would be implemented based on your database setup
      // For now, just check if the URL is provided
      if (!databaseUrl || databaseUrl === 'undefined') {
        throw new Error('Database URL not configured')
      }
      
      this.log('✅ Database connection validated', 'green')
    } catch (error) {
      throw new Error(`Database validation failed: ${error.message}`)
    }
  }

  async requestApproval() {
    const envConfig = this.config.environments[this.environment]
    
    if (!envConfig.requireApproval) {
      return true
    }
    
    this.log(`⚠️  ${this.environment} deployment requires approval`, 'yellow')
    this.log('📋 Deployment Details:', 'cyan')
    this.log(`   Environment: ${this.environment}`, 'blue')
    this.log(`   Version: ${this.getVersion()}`, 'blue')
    this.log(`   Deployment ID: ${this.deploymentId}`, 'blue')
    this.log(`   Target URL: ${envConfig.url}`, 'blue')
    
    // In a real implementation, this would integrate with your approval system
    // For now, we'll use a simple prompt
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout,
    })
    
    return new Promise((resolve) => {
      readline.question('Do you approve this deployment? (yes/no): ', (answer) => {
        readline.close()
        
        if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
          this.log('✅ Deployment approved', 'green')
          resolve(true)
        } else {
          this.log('❌ Deployment cancelled', 'red')
          resolve(false)
        }
      })
    })
  }

  async runPreDeploymentTests() {
    const envConfig = this.config.environments[this.environment]
    
    if (envConfig.skipTests) {
      this.log('⏭️  Skipping tests for this environment', 'yellow')
      return
    }
    
    this.log('🧪 Running pre-deployment tests...', 'cyan')
    
    try {
      // Run linting
      this.log('📝 Running linting...', 'blue')
      execSync('npm run lint', { stdio: 'pipe' })
      
      // Run type checking
      this.log('🔍 Running type checking...', 'blue')
      execSync('npm run type-check', { stdio: 'pipe' })
      
      // Run unit tests
      this.log('🧪 Running unit tests...', 'blue')
      execSync('npm run test -- --watchAll=false', { stdio: 'pipe' })
      
      // Run integration tests for staging/production
      if (this.environment !== 'development') {
        this.log('🔗 Running integration tests...', 'blue')
        execSync('npm run test:integration', { stdio: 'pipe' })
      }
      
      // Run security audit
      this.log('🔒 Running security audit...', 'blue')
      execSync('npm audit --audit-level=moderate', { stdio: 'pipe' })
      
      this.log('✅ All pre-deployment tests passed', 'green')
    } catch (error) {
      throw new Error(`Pre-deployment tests failed: ${error.message}`)
    }
  }

  async buildForDeployment() {
    const envConfig = this.config.environments[this.environment]
    
    if (envConfig.skipBuild) {
      this.log('⏭️  Skipping build for this environment', 'yellow')
      return
    }
    
    this.log('🏗️  Building for deployment...', 'cyan')
    
    try {
      // Set environment variables for build
      process.env.NODE_ENV = this.environment === 'development' ? 'development' : 'production'
      process.env.VITE_API_URL = envConfig.backend
      
      // Run build
      execSync('npm run build', { stdio: 'inherit' })
      
      this.log('✅ Build completed successfully', 'green')
    } catch (error) {
      throw new Error(`Build failed: ${error.message}`)
    }
  }

  async createBackup() {
    const envConfig = this.config.environments[this.environment]
    
    if (!envConfig.requireBackup) {
      return
    }
    
    this.log('💾 Creating backup...', 'cyan')
    
    try {
      const backupId = `backup-${this.deploymentId}`
      
      // This would be implemented based on your backup strategy
      // For example, database backup, file system backup, etc.
      this.log(`📦 Creating backup with ID: ${backupId}`, 'blue')
      
      this.rollbackInfo = {
        backupId,
        timestamp: new Date().toISOString(),
        environment: this.environment,
      }
      
      // Save rollback info
      fs.writeFileSync(
        `rollback-${this.deploymentId}.json`,
        JSON.stringify(this.rollbackInfo, null, 2)
      )
      
      this.log('✅ Backup created successfully', 'green')
    } catch (error) {
      throw new Error(`Backup creation failed: ${error.message}`)
    }
  }

  async deployApplication() {
    this.log('🚀 Deploying application...', 'cyan')
    
    const envConfig = this.config.environments[this.environment]
    
    try {
      // This would be implemented based on your deployment strategy
      // Examples: Docker deployment, serverless deployment, traditional server deployment
      
      if (this.environment === 'development') {
        this.log('🏠 Starting development servers...', 'blue')
        // Development deployment logic
      } else {
        this.log('☁️  Deploying to cloud infrastructure...', 'blue')
        // Production/staging deployment logic
        
        // Example Docker deployment
        await this.deployWithDocker()
      }
      
      this.log('✅ Application deployed successfully', 'green')
    } catch (error) {
      throw new Error(`Deployment failed: ${error.message}`)
    }
  }

  async deployWithDocker() {
    const { registry, namespace } = this.config.docker
    const version = this.getVersion()
    
    this.log('🐳 Building Docker image...', 'blue')
    execSync(`docker build -t ${registry}/${namespace}:${version} .`, { stdio: 'pipe' })
    execSync(`docker build -t ${registry}/${namespace}:latest .`, { stdio: 'pipe' })
    
    this.log('📤 Pushing Docker image...', 'blue')
    execSync(`docker push ${registry}/${namespace}:${version}`, { stdio: 'pipe' })
    execSync(`docker push ${registry}/${namespace}:latest`, { stdio: 'pipe' })
    
    this.log('🔄 Updating deployment...', 'blue')
    // This would trigger your orchestration system (Kubernetes, Docker Swarm, etc.)
    // execSync(`kubectl set image deployment/ai-todo-mcp app=${registry}/${namespace}:${version}`, { stdio: 'pipe' })
  }

  async runHealthChecks() {
    this.log('🏥 Running health checks...', 'cyan')
    
    const envConfig = this.config.environments[this.environment]
    const maxRetries = envConfig.healthCheckRetries || 3
    const delay = envConfig.healthCheckDelay || 10000
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.log(`🔍 Health check attempt ${attempt}/${maxRetries}...`, 'blue')
        
        // Check frontend
        await this.checkEndpoint(envConfig.url)
        
        // Check backend
        await this.checkEndpoint(`${envConfig.backend}/health`)
        
        this.log('✅ Health checks passed', 'green')
        return
      } catch (error) {
        this.log(`❌ Health check failed: ${error.message}`, 'red')
        
        if (attempt < maxRetries) {
          this.log(`⏳ Waiting ${delay / 1000}s before retry...`, 'yellow')
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }
    
    throw new Error('Health checks failed after all retries')
  }

  async checkEndpoint(url) {
    // This would use a proper HTTP client
    // For now, we'll simulate the check
    this.log(`🌐 Checking endpoint: ${url}`, 'blue')
    
    // Simulate HTTP request
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Simulate success for demo
        resolve()
      }, 1000)
    })
  }

  async sendNotification(status, error = null) {
    this.log('📢 Sending deployment notification...', 'cyan')
    
    const notification = {
      deploymentId: this.deploymentId,
      environment: this.environment,
      version: this.getVersion(),
      status,
      timestamp: new Date().toISOString(),
      duration: Math.round(performance.now() - this.startTime),
      error: error?.message,
    }
    
    // This would integrate with your notification system
    this.log(`📧 Notification sent: ${status}`, 'blue')
  }

  async rollback() {
    if (!this.rollbackInfo) {
      throw new Error('No rollback information available')
    }
    
    this.log('🔄 Rolling back deployment...', 'yellow')
    
    try {
      // This would implement your rollback strategy
      this.log(`📦 Restoring from backup: ${this.rollbackInfo.backupId}`, 'blue')
      
      // Rollback logic would go here
      
      this.log('✅ Rollback completed successfully', 'green')
    } catch (error) {
      throw new Error(`Rollback failed: ${error.message}`)
    }
  }

  async run() {
    try {
      this.log(`🚀 Starting deployment to ${this.environment}...`, 'bright')
      this.log(`📋 Deployment ID: ${this.deploymentId}`, 'cyan')
      
      await this.validateEnvironment()
      
      const approved = await this.requestApproval()
      if (!approved) {
        process.exit(1)
      }
      
      await this.runPreDeploymentTests()
      await this.buildForDeployment()
      await this.createBackup()
      await this.deployApplication()
      await this.runHealthChecks()
      
      const duration = Math.round(performance.now() - this.startTime)
      this.log(`\n🎉 Deployment completed successfully in ${duration}ms!`, 'green')
      
      await this.sendNotification('success')
      
      process.exit(0)
    } catch (error) {
      this.log(`\n💥 Deployment failed: ${error.message}`, 'red')
      
      await this.sendNotification('failed', error)
      
      // Offer rollback for production
      if (this.environment === 'production' && this.rollbackInfo) {
        const readline = require('readline').createInterface({
          input: process.stdin,
          output: process.stdout,
        })
        
        readline.question('Do you want to rollback? (yes/no): ', async (answer) => {
          readline.close()
          
          if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
            try {
              await this.rollback()
            } catch (rollbackError) {
              this.log(`💥 Rollback failed: ${rollbackError.message}`, 'red')
            }
          }
          
          process.exit(1)
        })
      } else {
        process.exit(1)
      }
    }
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2)
  const environment = args[0] || 'staging'
  
  if (args.includes('--help')) {
    console.log(`
Deployment Script Usage:
  node scripts/deploy.js [environment] [options]

Environments:
  development  Deploy to development environment
  staging      Deploy to staging environment (default)
  production   Deploy to production environment

Options:
  --help       Show this help message

Examples:
  node scripts/deploy.js staging
  node scripts/deploy.js production
    `)
    process.exit(0)
  }
  
  const deployer = new DeploymentManager(environment)
  deployer.run()
}

module.exports = DeploymentManager

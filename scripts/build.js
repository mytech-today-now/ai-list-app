#!/usr/bin/env node

/**
 * Comprehensive build script
 * Handles building all packages and applications with proper dependency management
 */

const fs = require('fs')
const path = require('path')
const { execSync, spawn } = require('child_process')
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

class BuildManager {
  constructor() {
    this.startTime = performance.now()
    this.buildResults = {}
    this.config = this.loadBuildConfig()
    this.workspaces = this.discoverWorkspaces()
  }

  log(message, color = 'reset') {
    const timestamp = new Date().toISOString().substr(11, 8)
    console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`)
  }

  loadBuildConfig() {
    const configPath = path.join(process.cwd(), 'build.config.js')
    if (fs.existsSync(configPath)) {
      return require(configPath)
    }
    
    // Default configuration
    return {
      parallel: true,
      maxConcurrency: 4,
      timeout: 300000, // 5 minutes
      environments: {
        development: {
          minify: false,
          sourceMaps: true,
          optimization: false,
        },
        production: {
          minify: true,
          sourceMaps: false,
          optimization: true,
        },
      },
      workspaces: {
        'shared-types': { order: 1, dependencies: [] },
        'mcp-core': { order: 2, dependencies: ['shared-types'] },
        'storage': { order: 3, dependencies: ['shared-types', 'mcp-core'] },
        'backend': { order: 4, dependencies: ['shared-types', 'mcp-core', 'storage'] },
        'frontend': { order: 5, dependencies: ['shared-types', 'mcp-core'] },
      },
    }
  }

  discoverWorkspaces() {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
    const workspaces = []
    
    if (packageJson.workspaces) {
      packageJson.workspaces.forEach(workspace => {
        const workspacePath = workspace.replace('/*', '')
        if (fs.existsSync(workspacePath)) {
          const dirs = fs.readdirSync(workspacePath, { withFileTypes: true })
          dirs.forEach(dir => {
            if (dir.isDirectory()) {
              const pkgPath = path.join(workspacePath, dir.name, 'package.json')
              if (fs.existsSync(pkgPath)) {
                workspaces.push({
                  name: dir.name,
                  path: path.join(workspacePath, dir.name),
                  type: workspacePath.includes('apps') ? 'app' : 'package',
                })
              }
            }
          })
        }
      })
    }
    
    return workspaces
  }

  async checkPrerequisites() {
    this.log('🔍 Checking build prerequisites...', 'cyan')
    
    // Check Node.js version
    const nodeVersion = process.version
    this.log(`Node.js version: ${nodeVersion}`, 'blue')
    
    // Check npm version
    try {
      const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim()
      this.log(`npm version: ${npmVersion}`, 'blue')
    } catch (error) {
      this.log('❌ npm not found', 'red')
      throw new Error('npm is required for building')
    }
    
    // Check if dependencies are installed
    if (!fs.existsSync('node_modules')) {
      this.log('❌ Dependencies not installed', 'red')
      throw new Error('Run npm install first')
    }
    
    // Check TypeScript
    try {
      execSync('npx tsc --version', { encoding: 'utf8', stdio: 'pipe' })
      this.log('✅ TypeScript available', 'green')
    } catch (error) {
      this.log('❌ TypeScript not available', 'red')
      throw new Error('TypeScript is required for building')
    }
    
    this.log('✅ Prerequisites check passed', 'green')
  }

  async cleanBuildArtifacts() {
    this.log('🧹 Cleaning build artifacts...', 'cyan')
    
    const cleanPaths = [
      'dist',
      'build',
      'apps/*/dist',
      'apps/*/build',
      'packages/*/dist',
      'packages/*/build',
      '*.tsbuildinfo',
      'apps/*/*.tsbuildinfo',
      'packages/*/*.tsbuildinfo',
    ]
    
    for (const cleanPath of cleanPaths) {
      try {
        execSync(`rm -rf ${cleanPath}`, { stdio: 'pipe' })
      } catch (error) {
        // Ignore errors for non-existent paths
      }
    }
    
    this.log('✅ Build artifacts cleaned', 'green')
  }

  async buildWorkspace(workspace) {
    const startTime = performance.now()
    this.log(`🏗️  Building ${workspace.name}...`, 'cyan')
    
    try {
      const workspacePackage = JSON.parse(
        fs.readFileSync(path.join(workspace.path, 'package.json'), 'utf8')
      )
      
      // Check if workspace has build script
      if (!workspacePackage.scripts || !workspacePackage.scripts.build) {
        this.log(`⚠️  No build script found for ${workspace.name}`, 'yellow')
        return { success: true, duration: 0, skipped: true }
      }
      
      // Run build command
      const buildCommand = 'npm run build'
      execSync(buildCommand, {
        cwd: workspace.path,
        stdio: 'pipe',
        timeout: this.config.timeout,
      })
      
      const duration = performance.now() - startTime
      this.log(`✅ ${workspace.name} built successfully (${Math.round(duration)}ms)`, 'green')
      
      return { success: true, duration, skipped: false }
    } catch (error) {
      const duration = performance.now() - startTime
      this.log(`❌ ${workspace.name} build failed: ${error.message}`, 'red')
      
      return { success: false, duration, error: error.message, skipped: false }
    }
  }

  async buildWorkspacesSequentially() {
    this.log('🔄 Building workspaces sequentially...', 'cyan')
    
    // Sort workspaces by build order
    const sortedWorkspaces = this.workspaces.sort((a, b) => {
      const orderA = this.config.workspaces[a.name]?.order || 999
      const orderB = this.config.workspaces[b.name]?.order || 999
      return orderA - orderB
    })
    
    for (const workspace of sortedWorkspaces) {
      const result = await this.buildWorkspace(workspace)
      this.buildResults[workspace.name] = result
      
      if (!result.success && !result.skipped) {
        throw new Error(`Build failed for ${workspace.name}`)
      }
    }
  }

  async buildWorkspacesParallel() {
    this.log('⚡ Building workspaces in parallel...', 'cyan')
    
    // Group workspaces by dependency levels
    const levels = this.groupWorkspacesByDependencyLevel()
    
    for (const level of levels) {
      this.log(`📦 Building level ${level.level}: ${level.workspaces.map(w => w.name).join(', ')}`, 'blue')
      
      const promises = level.workspaces.map(workspace => this.buildWorkspace(workspace))
      const results = await Promise.all(promises)
      
      level.workspaces.forEach((workspace, index) => {
        this.buildResults[workspace.name] = results[index]
        
        if (!results[index].success && !results[index].skipped) {
          throw new Error(`Build failed for ${workspace.name}`)
        }
      })
    }
  }

  groupWorkspacesByDependencyLevel() {
    const levels = []
    const processed = new Set()
    
    let currentLevel = 1
    
    while (processed.size < this.workspaces.length) {
      const levelWorkspaces = []
      
      for (const workspace of this.workspaces) {
        if (processed.has(workspace.name)) continue
        
        const config = this.config.workspaces[workspace.name]
        const dependencies = config?.dependencies || []
        
        // Check if all dependencies are already processed
        const canBuild = dependencies.every(dep => processed.has(dep))
        
        if (canBuild) {
          levelWorkspaces.push(workspace)
          processed.add(workspace.name)
        }
      }
      
      if (levelWorkspaces.length === 0) {
        // Circular dependency or missing dependency
        const remaining = this.workspaces.filter(w => !processed.has(w.name))
        throw new Error(`Circular dependency detected or missing dependencies: ${remaining.map(w => w.name).join(', ')}`)
      }
      
      levels.push({
        level: currentLevel,
        workspaces: levelWorkspaces,
      })
      
      currentLevel++
    }
    
    return levels
  }

  async validateBuilds() {
    this.log('🔍 Validating builds...', 'cyan')
    
    for (const workspace of this.workspaces) {
      const result = this.buildResults[workspace.name]
      
      if (!result || result.skipped) continue
      
      // Check if build artifacts exist
      const distPath = path.join(workspace.path, 'dist')
      if (!fs.existsSync(distPath)) {
        this.log(`❌ Build artifacts missing for ${workspace.name}`, 'red')
        throw new Error(`Build validation failed for ${workspace.name}`)
      }
      
      // Check if main entry point exists
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(workspace.path, 'package.json'), 'utf8')
      )
      
      if (packageJson.main) {
        const mainPath = path.join(workspace.path, packageJson.main)
        if (!fs.existsSync(mainPath)) {
          this.log(`❌ Main entry point missing for ${workspace.name}: ${packageJson.main}`, 'red')
          throw new Error(`Main entry point validation failed for ${workspace.name}`)
        }
      }
    }
    
    this.log('✅ Build validation passed', 'green')
  }

  generateBuildReport() {
    const totalDuration = performance.now() - this.startTime
    const successfulBuilds = Object.values(this.buildResults).filter(r => r.success).length
    const failedBuilds = Object.values(this.buildResults).filter(r => !r.success).length
    const skippedBuilds = Object.values(this.buildResults).filter(r => r.skipped).length
    
    this.log('\n📊 Build Report:', 'bright')
    this.log(`   Total duration: ${Math.round(totalDuration)}ms`, 'blue')
    this.log(`   Successful builds: ${successfulBuilds}`, 'green')
    this.log(`   Failed builds: ${failedBuilds}`, failedBuilds > 0 ? 'red' : 'blue')
    this.log(`   Skipped builds: ${skippedBuilds}`, 'yellow')
    
    // Detailed results
    this.log('\n📋 Detailed Results:', 'bright')
    for (const [workspace, result] of Object.entries(this.buildResults)) {
      const status = result.skipped ? '⏭️ ' : result.success ? '✅' : '❌'
      const duration = result.skipped ? 'skipped' : `${Math.round(result.duration)}ms`
      this.log(`   ${status} ${workspace}: ${duration}`, result.success ? 'green' : result.skipped ? 'yellow' : 'red')
    }
    
    // Save report to file
    const report = {
      timestamp: new Date().toISOString(),
      totalDuration: Math.round(totalDuration),
      summary: {
        successful: successfulBuilds,
        failed: failedBuilds,
        skipped: skippedBuilds,
      },
      results: this.buildResults,
    }
    
    fs.writeFileSync('build-report.json', JSON.stringify(report, null, 2))
    this.log('\n📄 Build report saved to build-report.json', 'cyan')
  }

  async run() {
    try {
      this.log('🚀 Starting build process...', 'bright')
      
      await this.checkPrerequisites()
      await this.cleanBuildArtifacts()
      
      if (this.config.parallel) {
        await this.buildWorkspacesParallel()
      } else {
        await this.buildWorkspacesSequentially()
      }
      
      await this.validateBuilds()
      this.generateBuildReport()
      
      this.log('\n🎉 Build completed successfully!', 'green')
      process.exit(0)
    } catch (error) {
      this.log(`\n💥 Build failed: ${error.message}`, 'red')
      this.generateBuildReport()
      process.exit(1)
    }
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2)
  const options = {}
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--parallel':
        options.parallel = true
        break
      case '--sequential':
        options.parallel = false
        break
      case '--clean':
        options.clean = true
        break
      case '--validate':
        options.validate = true
        break
      case '--help':
        console.log(`
Build Script Usage:
  node scripts/build.js [options]

Options:
  --parallel     Build workspaces in parallel (default)
  --sequential   Build workspaces sequentially
  --clean        Clean build artifacts before building
  --validate     Validate builds after completion
  --help         Show this help message

Examples:
  node scripts/build.js
  node scripts/build.js --sequential
  node scripts/build.js --clean --validate
        `)
        process.exit(0)
    }
  }
  
  const builder = new BuildManager()
  
  // Override config with CLI options
  if (options.parallel !== undefined) {
    builder.config.parallel = options.parallel
  }
  
  builder.run()
}

module.exports = BuildManager

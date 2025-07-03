#!/usr/bin/env node

/**
 * Coverage enforcement script
 * Validates coverage thresholds and generates reports
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const coverageConfig = require('../coverage.config.js')

// ANSI color codes for console output
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

class CoverageChecker {
  constructor() {
    this.workspaces = Object.keys(coverageConfig.workspaceConfigs)
    this.results = {}
    this.overallPassed = true
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`)
  }

  async checkWorkspaceCoverage(workspace) {
    this.log(`\n📊 Checking coverage for ${workspace}...`, 'cyan')
    
    try {
      const config = coverageConfig.getWorkspaceConfig(workspace)
      const coveragePath = path.join(process.cwd(), config.coverageDirectory, 'coverage-summary.json')
      
      if (!fs.existsSync(coveragePath)) {
        this.log(`❌ Coverage file not found: ${coveragePath}`, 'red')
        this.log(`💡 Run tests with coverage first: npm run test:${workspace} -- --coverage`, 'yellow')
        return false
      }

      const coverageData = JSON.parse(fs.readFileSync(coveragePath, 'utf8'))
      const totalCoverage = coverageData.total

      this.results[workspace] = {
        coverage: totalCoverage,
        passed: true,
        violations: [],
      }

      // Check global thresholds
      const validation = coverageConfig.validateCoverage(totalCoverage, workspace)
      
      if (!validation.passed) {
        this.results[workspace].passed = false
        this.results[workspace].violations = validation.violations
        this.overallPassed = false
        
        this.log(`❌ Coverage thresholds not met for ${workspace}:`, 'red')
        validation.violations.forEach(violation => {
          this.log(`   ${violation.metric}: ${violation.actual.toFixed(2)}% (required: ${violation.expected}%)`, 'red')
        })
      } else {
        this.log(`✅ Coverage thresholds met for ${workspace}`, 'green')
        this.log(`   Branches: ${totalCoverage.branches.pct}%`, 'green')
        this.log(`   Functions: ${totalCoverage.functions.pct}%`, 'green')
        this.log(`   Lines: ${totalCoverage.lines.pct}%`, 'green')
        this.log(`   Statements: ${totalCoverage.statements.pct}%`, 'green')
      }

      // Check for critical files
      await this.checkCriticalFiles(workspace, coverageData)
      
      return validation.passed
    } catch (error) {
      this.log(`❌ Error checking coverage for ${workspace}: ${error.message}`, 'red')
      return false
    }
  }

  async checkCriticalFiles(workspace, coverageData) {
    const criticalFiles = coverageConfig.enforcementRules.criticalFiles
    
    for (const file of criticalFiles) {
      const fileCoverage = this.findFileCoverage(coverageData, file)
      
      if (fileCoverage) {
        const hasFullCoverage = this.checkFullCoverage(fileCoverage)
        
        if (!hasFullCoverage) {
          this.log(`⚠️  Critical file ${file} does not have 100% coverage`, 'yellow')
          this.results[workspace].violations.push({
            type: 'critical-file',
            file,
            coverage: fileCoverage,
          })
        }
      }
    }
  }

  findFileCoverage(coverageData, targetFile) {
    for (const [filePath, coverage] of Object.entries(coverageData)) {
      if (filePath.includes(targetFile)) {
        return coverage
      }
    }
    return null
  }

  checkFullCoverage(fileCoverage) {
    return (
      fileCoverage.branches.pct === 100 &&
      fileCoverage.functions.pct === 100 &&
      fileCoverage.lines.pct === 100 &&
      fileCoverage.statements.pct === 100
    )
  }

  async generateBadges() {
    this.log('\n🏆 Generating coverage badges...', 'cyan')
    
    try {
      const badgeDir = path.join(process.cwd(), coverageConfig.badgeConfig.outputPath)
      
      if (!fs.existsSync(badgeDir)) {
        fs.mkdirSync(badgeDir, { recursive: true })
      }

      for (const [workspace, result] of Object.entries(this.results)) {
        if (result.coverage) {
          const overallPct = Math.round(
            (result.coverage.branches.pct + 
             result.coverage.functions.pct + 
             result.coverage.lines.pct + 
             result.coverage.statements.pct) / 4
          )

          const color = this.getBadgeColor(overallPct)
          const badgeUrl = `https://img.shields.io/badge/coverage-${overallPct}%25-${color}`
          
          // Save badge URL to file
          fs.writeFileSync(
            path.join(badgeDir, `${workspace}-coverage.txt`),
            badgeUrl
          )
          
          this.log(`   Generated badge for ${workspace}: ${overallPct}%`, 'green')
        }
      }
    } catch (error) {
      this.log(`❌ Error generating badges: ${error.message}`, 'red')
    }
  }

  getBadgeColor(percentage) {
    const { thresholds, colors } = coverageConfig.badgeConfig
    
    if (percentage >= thresholds.excellent) return colors.excellent
    if (percentage >= thresholds.good) return colors.good
    if (percentage >= thresholds.acceptable) return colors.acceptable
    return colors.poor
  }

  async generateReport() {
    this.log('\n📋 Generating coverage report...', 'cyan')
    
    const report = {
      timestamp: new Date().toISOString(),
      overallPassed: this.overallPassed,
      workspaces: this.results,
      summary: {
        totalWorkspaces: this.workspaces.length,
        passedWorkspaces: Object.values(this.results).filter(r => r.passed).length,
        failedWorkspaces: Object.values(this.results).filter(r => !r.passed).length,
      },
    }

    // Save detailed report
    const reportPath = path.join(process.cwd(), 'coverage', 'coverage-report.json')
    const reportDir = path.dirname(reportPath)
    
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true })
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
    
    // Generate markdown report
    await this.generateMarkdownReport(report)
    
    this.log(`📄 Coverage report saved to: ${reportPath}`, 'green')
    
    return report
  }

  async generateMarkdownReport(report) {
    const markdownPath = path.join(process.cwd(), 'coverage', 'coverage-report.md')
    
    let markdown = `# Coverage Report\n\n`
    markdown += `Generated: ${new Date(report.timestamp).toLocaleString()}\n\n`
    markdown += `## Summary\n\n`
    markdown += `- Total Workspaces: ${report.summary.totalWorkspaces}\n`
    markdown += `- Passed: ${report.summary.passedWorkspaces}\n`
    markdown += `- Failed: ${report.summary.failedWorkspaces}\n`
    markdown += `- Overall Status: ${report.overallPassed ? '✅ PASSED' : '❌ FAILED'}\n\n`
    
    markdown += `## Workspace Details\n\n`
    
    for (const [workspace, result] of Object.entries(report.workspaces)) {
      markdown += `### ${workspace}\n\n`
      markdown += `Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}\n\n`
      
      if (result.coverage) {
        markdown += `| Metric | Coverage |\n`
        markdown += `|--------|----------|\n`
        markdown += `| Branches | ${result.coverage.branches.pct}% |\n`
        markdown += `| Functions | ${result.coverage.functions.pct}% |\n`
        markdown += `| Lines | ${result.coverage.lines.pct}% |\n`
        markdown += `| Statements | ${result.coverage.statements.pct}% |\n\n`
      }
      
      if (result.violations.length > 0) {
        markdown += `#### Violations\n\n`
        result.violations.forEach(violation => {
          if (violation.type === 'critical-file') {
            markdown += `- Critical file ${violation.file} missing full coverage\n`
          } else {
            markdown += `- ${violation.metric}: ${violation.actual.toFixed(2)}% (required: ${violation.expected}%)\n`
          }
        })
        markdown += `\n`
      }
    }
    
    fs.writeFileSync(markdownPath, markdown)
  }

  async run() {
    this.log('🚀 Starting coverage validation...', 'bright')
    
    // Check coverage for each workspace
    for (const workspace of this.workspaces) {
      await this.checkWorkspaceCoverage(workspace)
    }
    
    // Generate badges and reports
    await this.generateBadges()
    const report = await this.generateReport()
    
    // Final summary
    this.log('\n📊 Coverage Check Summary:', 'bright')
    this.log(`   Total workspaces: ${this.workspaces.length}`, 'blue')
    this.log(`   Passed: ${report.summary.passedWorkspaces}`, 'green')
    this.log(`   Failed: ${report.summary.failedWorkspaces}`, 'red')
    
    if (this.overallPassed) {
      this.log('\n🎉 All coverage thresholds met!', 'green')
      process.exit(0)
    } else {
      this.log('\n💥 Coverage thresholds not met!', 'red')
      this.log('💡 Run tests with coverage and fix the issues above.', 'yellow')
      process.exit(1)
    }
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2)
  const workspace = args[0]
  
  const checker = new CoverageChecker()
  
  if (workspace && workspace !== 'all') {
    // Check specific workspace
    if (!coverageConfig.workspaceConfigs[workspace]) {
      console.error(`❌ Unknown workspace: ${workspace}`)
      console.error(`Available workspaces: ${Object.keys(coverageConfig.workspaceConfigs).join(', ')}`)
      process.exit(1)
    }
    
    checker.workspaces = [workspace]
  }
  
  checker.run().catch(error => {
    console.error(`❌ Coverage check failed: ${error.message}`)
    process.exit(1)
  })
}

module.exports = CoverageChecker

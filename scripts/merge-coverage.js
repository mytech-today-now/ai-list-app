#!/usr/bin/env node

/**
 * Coverage merge script
 * Merges coverage reports from all workspaces into a unified report
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const coverageConfig = require('../coverage.config.js')

class CoverageMerger {
  constructor() {
    this.workspaces = Object.keys(coverageConfig.workspaceConfigs)
    this.mergedCoverage = {
      total: {
        lines: { total: 0, covered: 0, skipped: 0, pct: 0 },
        functions: { total: 0, covered: 0, skipped: 0, pct: 0 },
        statements: { total: 0, covered: 0, skipped: 0, pct: 0 },
        branches: { total: 0, covered: 0, skipped: 0, pct: 0 },
      },
      files: {},
    }
  }

  log(message, color = '\x1b[0m') {
    console.log(`${color}${message}\x1b[0m`)
  }

  async loadWorkspaceCoverage(workspace) {
    try {
      const config = coverageConfig.getWorkspaceConfig(workspace)
      const coveragePath = path.join(process.cwd(), config.coverageDirectory, 'coverage-summary.json')
      
      if (!fs.existsSync(coveragePath)) {
        this.log(`⚠️  Coverage file not found for ${workspace}: ${coveragePath}`, '\x1b[33m')
        return null
      }

      const coverageData = JSON.parse(fs.readFileSync(coveragePath, 'utf8'))
      this.log(`✅ Loaded coverage for ${workspace}`, '\x1b[32m')
      
      return coverageData
    } catch (error) {
      this.log(`❌ Error loading coverage for ${workspace}: ${error.message}`, '\x1b[31m')
      return null
    }
  }

  mergeCoverageMetrics(target, source) {
    target.total += source.total
    target.covered += source.covered
    target.skipped += source.skipped
    target.pct = target.total > 0 ? (target.covered / target.total) * 100 : 0
  }

  async mergeAllCoverage() {
    this.log('🔄 Merging coverage reports from all workspaces...', '\x1b[36m')
    
    const workspaceCoverages = {}
    
    // Load coverage from each workspace
    for (const workspace of this.workspaces) {
      const coverage = await this.loadWorkspaceCoverage(workspace)
      if (coverage) {
        workspaceCoverages[workspace] = coverage
      }
    }
    
    // Merge coverage data
    for (const [workspace, coverage] of Object.entries(workspaceCoverages)) {
      // Merge total metrics
      this.mergeCoverageMetrics(this.mergedCoverage.total.lines, coverage.total.lines)
      this.mergeCoverageMetrics(this.mergedCoverage.total.functions, coverage.total.functions)
      this.mergeCoverageMetrics(this.mergedCoverage.total.statements, coverage.total.statements)
      this.mergeCoverageMetrics(this.mergedCoverage.total.branches, coverage.total.branches)
      
      // Merge file-level coverage
      for (const [filePath, fileCoverage] of Object.entries(coverage)) {
        if (filePath !== 'total') {
          // Prefix file path with workspace for uniqueness
          const prefixedPath = `${workspace}/${filePath}`
          this.mergedCoverage.files[prefixedPath] = fileCoverage
        }
      }
    }
    
    // Recalculate percentages
    this.recalculatePercentages()
    
    return this.mergedCoverage
  }

  recalculatePercentages() {
    const metrics = ['lines', 'functions', 'statements', 'branches']
    
    metrics.forEach(metric => {
      const data = this.mergedCoverage.total[metric]
      data.pct = data.total > 0 ? (data.covered / data.total) * 100 : 0
    })
  }

  async generateMergedReport() {
    const outputDir = path.join(process.cwd(), 'coverage', 'merged')
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }
    
    // Save merged coverage summary
    const summaryPath = path.join(outputDir, 'coverage-summary.json')
    fs.writeFileSync(summaryPath, JSON.stringify(this.mergedCoverage, null, 2))
    
    // Generate merged HTML report
    await this.generateHtmlReport(outputDir)
    
    // Generate merged LCOV report
    await this.generateLcovReport(outputDir)
    
    // Generate workspace comparison report
    await this.generateComparisonReport(outputDir)
    
    this.log(`📄 Merged coverage reports saved to: ${outputDir}`, '\x1b[32m')
    
    return outputDir
  }

  async generateHtmlReport(outputDir) {
    try {
      // Create a simple HTML report
      const htmlContent = this.generateHtmlContent()
      const htmlPath = path.join(outputDir, 'index.html')
      fs.writeFileSync(htmlPath, htmlContent)
      
      this.log(`📊 HTML report generated: ${htmlPath}`, '\x1b[32m')
    } catch (error) {
      this.log(`❌ Error generating HTML report: ${error.message}`, '\x1b[31m')
    }
  }

  generateHtmlContent() {
    const total = this.mergedCoverage.total
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Merged Coverage Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric { background: white; border: 1px solid #ddd; padding: 15px; border-radius: 5px; text-align: center; }
        .metric h3 { margin: 0 0 10px 0; color: #333; }
        .percentage { font-size: 2em; font-weight: bold; }
        .good { color: #28a745; }
        .warning { color: #ffc107; }
        .danger { color: #dc3545; }
        .details { font-size: 0.9em; color: #666; margin-top: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f5f5f5; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Merged Coverage Report</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
        <p>Workspaces: ${this.workspaces.join(', ')}</p>
    </div>
    
    <div class="metrics">
        <div class="metric">
            <h3>Lines</h3>
            <div class="percentage ${this.getCoverageClass(total.lines.pct)}">${total.lines.pct.toFixed(1)}%</div>
            <div class="details">${total.lines.covered}/${total.lines.total}</div>
        </div>
        <div class="metric">
            <h3>Functions</h3>
            <div class="percentage ${this.getCoverageClass(total.functions.pct)}">${total.functions.pct.toFixed(1)}%</div>
            <div class="details">${total.functions.covered}/${total.functions.total}</div>
        </div>
        <div class="metric">
            <h3>Statements</h3>
            <div class="percentage ${this.getCoverageClass(total.statements.pct)}">${total.statements.pct.toFixed(1)}%</div>
            <div class="details">${total.statements.covered}/${total.statements.total}</div>
        </div>
        <div class="metric">
            <h3>Branches</h3>
            <div class="percentage ${this.getCoverageClass(total.branches.pct)}">${total.branches.pct.toFixed(1)}%</div>
            <div class="details">${total.branches.covered}/${total.branches.total}</div>
        </div>
    </div>
    
    <h2>File Coverage</h2>
    <table>
        <thead>
            <tr>
                <th>File</th>
                <th>Lines</th>
                <th>Functions</th>
                <th>Statements</th>
                <th>Branches</th>
            </tr>
        </thead>
        <tbody>
            ${Object.entries(this.mergedCoverage.files)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([file, coverage]) => `
                <tr>
                    <td>${file}</td>
                    <td class="${this.getCoverageClass(coverage.lines.pct)}">${coverage.lines.pct.toFixed(1)}%</td>
                    <td class="${this.getCoverageClass(coverage.functions.pct)}">${coverage.functions.pct.toFixed(1)}%</td>
                    <td class="${this.getCoverageClass(coverage.statements.pct)}">${coverage.statements.pct.toFixed(1)}%</td>
                    <td class="${this.getCoverageClass(coverage.branches.pct)}">${coverage.branches.pct.toFixed(1)}%</td>
                </tr>
              `).join('')}
        </tbody>
    </table>
</body>
</html>
    `.trim()
  }

  getCoverageClass(percentage) {
    if (percentage >= 85) return 'good'
    if (percentage >= 70) return 'warning'
    return 'danger'
  }

  async generateLcovReport(outputDir) {
    try {
      // Merge LCOV files from all workspaces
      const lcovFiles = []
      
      for (const workspace of this.workspaces) {
        const config = coverageConfig.getWorkspaceConfig(workspace)
        const lcovPath = path.join(process.cwd(), config.coverageDirectory, 'lcov.info')
        
        if (fs.existsSync(lcovPath)) {
          lcovFiles.push(lcovPath)
        }
      }
      
      if (lcovFiles.length > 0) {
        const mergedLcovPath = path.join(outputDir, 'lcov.info')
        
        // Simple concatenation of LCOV files
        let mergedContent = ''
        lcovFiles.forEach(file => {
          mergedContent += fs.readFileSync(file, 'utf8') + '\n'
        })
        
        fs.writeFileSync(mergedLcovPath, mergedContent)
        this.log(`📄 Merged LCOV report: ${mergedLcovPath}`, '\x1b[32m')
      }
    } catch (error) {
      this.log(`❌ Error generating LCOV report: ${error.message}`, '\x1b[31m')
    }
  }

  async generateComparisonReport(outputDir) {
    const comparisonData = {
      timestamp: new Date().toISOString(),
      workspaces: {},
      merged: this.mergedCoverage.total,
    }
    
    // Load individual workspace coverage for comparison
    for (const workspace of this.workspaces) {
      const coverage = await this.loadWorkspaceCoverage(workspace)
      if (coverage) {
        comparisonData.workspaces[workspace] = coverage.total
      }
    }
    
    const comparisonPath = path.join(outputDir, 'workspace-comparison.json')
    fs.writeFileSync(comparisonPath, JSON.stringify(comparisonData, null, 2))
    
    this.log(`📊 Workspace comparison report: ${comparisonPath}`, '\x1b[32m')
  }

  async run() {
    this.log('🚀 Starting coverage merge process...', '\x1b[1m')
    
    try {
      await this.mergeAllCoverage()
      const outputDir = await this.generateMergedReport()
      
      // Display summary
      const total = this.mergedCoverage.total
      this.log('\n📊 Merged Coverage Summary:', '\x1b[1m')
      this.log(`   Lines: ${total.lines.pct.toFixed(1)}% (${total.lines.covered}/${total.lines.total})`, '\x1b[32m')
      this.log(`   Functions: ${total.functions.pct.toFixed(1)}% (${total.functions.covered}/${total.functions.total})`, '\x1b[32m')
      this.log(`   Statements: ${total.statements.pct.toFixed(1)}% (${total.statements.covered}/${total.statements.total})`, '\x1b[32m')
      this.log(`   Branches: ${total.branches.pct.toFixed(1)}% (${total.branches.covered}/${total.branches.total})`, '\x1b[32m')
      
      this.log(`\n🎉 Coverage merge completed successfully!`, '\x1b[32m')
      this.log(`📁 Reports available in: ${outputDir}`, '\x1b[36m')
      
    } catch (error) {
      this.log(`❌ Coverage merge failed: ${error.message}`, '\x1b[31m')
      process.exit(1)
    }
  }
}

// CLI interface
if (require.main === module) {
  const merger = new CoverageMerger()
  merger.run()
}

module.exports = CoverageMerger

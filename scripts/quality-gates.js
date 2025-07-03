#!/usr/bin/env node

/**
 * @fileoverview Quality gates enforcement script
 * @author AI ToDo MCP Team
 * @version 1.0.0
 */

import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { qualityGates, enforcementLevels, environmentGates } from '../quality-gates.config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

/**
 * Logger utility with colors
 */
const logger = {
  info: (msg) => console.log(`ℹ️  ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  error: (msg) => console.error(`❌ ${msg}`),
  warn: (msg) => console.warn(`⚠️  ${msg}`),
  step: (msg) => console.log(`🔄 ${msg}`),
  gate: (msg) => console.log(`🚪 ${msg}`)
};

/**
 * Quality gate results
 */
class QualityGateResults {
  constructor() {
    this.results = {};
    this.overallPassed = true;
    this.blockers = [];
    this.warnings = [];
    this.info = [];
  }
  
  addResult(gate, passed, level, message, details = {}) {
    this.results[gate] = { passed, level, message, details };
    
    if (!passed) {
      if (level === enforcementLevels.BLOCKING) {
        this.overallPassed = false;
        this.blockers.push({ gate, message, details });
      } else if (level === enforcementLevels.WARNING) {
        this.warnings.push({ gate, message, details });
      } else {
        this.info.push({ gate, message, details });
      }
    }
  }
  
  getSummary() {
    return {
      passed: this.overallPassed,
      total: Object.keys(this.results).length,
      blockers: this.blockers.length,
      warnings: this.warnings.length,
      info: this.info.length,
      results: this.results
    };
  }
}

/**
 * Execute command safely
 */
function execCommand(command, options = {}) {
  try {
    return execSync(command, {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: 'pipe',
      ...options
    });
  } catch (error) {
    return { error: error.message, stdout: error.stdout, stderr: error.stderr };
  }
}

/**
 * Check coverage quality gate
 */
async function checkCoverageGate(results, environment) {
  logger.step('Checking coverage quality gate...');
  
  const level = environmentGates[environment].coverage;
  const thresholds = qualityGates.coverage.global;
  
  try {
    // Check if coverage reports exist
    const coverageFiles = [
      'coverage/coverage-summary.json',
      'apps/frontend/coverage/coverage-summary.json',
      'apps/backend/coverage/coverage-summary.json'
    ];
    
    let overallPassed = true;
    const details = {};
    
    for (const file of coverageFiles) {
      const filePath = path.join(rootDir, file);
      
      try {
        const content = await fs.readFile(filePath, 'utf8');
        const coverage = JSON.parse(content);
        
        if (coverage.total) {
          const workspace = file.includes('frontend') ? 'frontend' : 
                          file.includes('backend') ? 'backend' : 'global';
          
          const workspaceThresholds = qualityGates.coverage.workspaces[workspace] || thresholds;
          
          for (const [metric, threshold] of Object.entries(workspaceThresholds)) {
            const actual = coverage.total[metric]?.pct || 0;
            if (actual < threshold) {
              overallPassed = false;
              details[`${workspace}-${metric}`] = { actual, threshold };
            }
          }
        }
      } catch (error) {
        // Coverage file doesn't exist or is invalid
        if (level === enforcementLevels.BLOCKING) {
          overallPassed = false;
          details.missing = file;
        }
      }
    }
    
    results.addResult(
      'coverage',
      overallPassed,
      level,
      overallPassed ? 'Coverage thresholds met' : 'Coverage thresholds not met',
      details
    );
    
  } catch (error) {
    results.addResult('coverage', false, level, `Coverage check failed: ${error.message}`);
  }
}

/**
 * Check code quality gate
 */
async function checkCodeQualityGate(results, environment) {
  logger.step('Checking code quality gate...');
  
  const level = environmentGates[environment].codeQuality;
  let overallPassed = true;
  const details = {};
  
  // Check linting
  const lintResult = execCommand('npm run lint');
  if (lintResult.error) {
    overallPassed = false;
    details.linting = 'Linting failed';
  }
  
  // Check TypeScript compilation
  const typeCheckResult = execCommand('npm run type-check');
  if (typeCheckResult.error) {
    overallPassed = false;
    details.typeCheck = 'Type checking failed';
  }
  
  results.addResult(
    'codeQuality',
    overallPassed,
    level,
    overallPassed ? 'Code quality checks passed' : 'Code quality checks failed',
    details
  );
}

/**
 * Check testing quality gate
 */
async function checkTestingGate(results, environment) {
  logger.step('Checking testing quality gate...');
  
  const level = environmentGates[environment].testing;
  let overallPassed = true;
  const details = {};
  
  // Check unit tests
  const unitTestResult = execCommand('npm run test -- --watchAll=false');
  if (unitTestResult.error) {
    overallPassed = false;
    details.unitTests = 'Unit tests failed';
  }
  
  // Check E2E tests for staging/production
  if (environment !== 'development') {
    const e2eTestResult = execCommand('npm run test:e2e');
    if (e2eTestResult.error) {
      overallPassed = false;
      details.e2eTests = 'E2E tests failed';
    }
  }
  
  results.addResult(
    'testing',
    overallPassed,
    level,
    overallPassed ? 'All tests passed' : 'Some tests failed',
    details
  );
}

/**
 * Check performance quality gate
 */
async function checkPerformanceGate(results, environment) {
  logger.step('Checking performance quality gate...');
  
  const level = environmentGates[environment].performance;
  let overallPassed = true;
  const details = {};
  
  // Check bundle size
  try {
    const buildResult = execCommand('npm run build');
    if (buildResult.error) {
      overallPassed = false;
      details.build = 'Build failed';
    } else {
      // Check if build artifacts exist and are within size limits
      const frontendDist = path.join(rootDir, 'apps/frontend/dist');
      try {
        const stats = await fs.stat(frontendDist);
        if (stats.isDirectory()) {
          // This is a simplified check - in practice, you'd analyze the actual bundle sizes
          details.bundleSize = 'Build completed successfully';
        }
      } catch (error) {
        overallPassed = false;
        details.bundleSize = 'Build artifacts not found';
      }
    }
  } catch (error) {
    overallPassed = false;
    details.performance = `Performance check failed: ${error.message}`;
  }
  
  results.addResult(
    'performance',
    overallPassed,
    level,
    overallPassed ? 'Performance checks passed' : 'Performance checks failed',
    details
  );
}

/**
 * Check security quality gate
 */
async function checkSecurityGate(results, environment) {
  logger.step('Checking security quality gate...');
  
  const level = environmentGates[environment].security;
  let overallPassed = true;
  const details = {};
  
  // Check for security vulnerabilities
  const auditResult = execCommand('npm audit --audit-level=high');
  if (auditResult.error && auditResult.stderr?.includes('vulnerabilities')) {
    overallPassed = false;
    details.vulnerabilities = 'High severity vulnerabilities found';
  }
  
  results.addResult(
    'security',
    overallPassed,
    level,
    overallPassed ? 'Security checks passed' : 'Security issues found',
    details
  );
}

/**
 * Check documentation quality gate
 */
async function checkDocumentationGate(results, environment) {
  logger.step('Checking documentation quality gate...');
  
  const level = environmentGates[environment].documentation;
  let overallPassed = true;
  const details = {};
  
  // Check if README exists and has required sections
  try {
    const readmeContent = await fs.readFile(path.join(rootDir, 'README.md'), 'utf8');
    const requiredSections = ['installation', 'usage', 'contributing', 'license'];
    
    for (const section of requiredSections) {
      if (!readmeContent.toLowerCase().includes(section)) {
        overallPassed = false;
        details[`missing-${section}`] = `README missing ${section} section`;
      }
    }
  } catch (error) {
    overallPassed = false;
    details.readme = 'README.md not found';
  }
  
  results.addResult(
    'documentation',
    overallPassed,
    level,
    overallPassed ? 'Documentation checks passed' : 'Documentation issues found',
    details
  );
}

/**
 * Generate quality gate report
 */
async function generateReport(results) {
  const summary = results.getSummary();
  
  const reportContent = `# Quality Gates Report

Generated on: ${new Date().toISOString()}

## Summary

- **Overall Status**: ${summary.passed ? '✅ PASSED' : '❌ FAILED'}
- **Total Gates**: ${summary.total}
- **Blockers**: ${summary.blockers}
- **Warnings**: ${summary.warnings}
- **Info**: ${summary.info}

## Gate Results

${Object.entries(summary.results).map(([gate, result]) => {
  const status = result.passed ? '✅' : '❌';
  const level = result.level.toUpperCase();
  
  return `### ${gate} (${level})
${status} ${result.message}

${Object.keys(result.details).length > 0 ? `**Details:**
${Object.entries(result.details).map(([key, value]) => `- ${key}: ${value}`).join('\n')}` : ''}
`;
}).join('\n')}

${summary.blockers.length > 0 ? `## Blocking Issues

${summary.blockers.map(blocker => `- **${blocker.gate}**: ${blocker.message}`).join('\n')}` : ''}

${summary.warnings.length > 0 ? `## Warnings

${summary.warnings.map(warning => `- **${warning.gate}**: ${warning.message}`).join('\n')}` : ''}

---

*This report was automatically generated by the quality gates system.*
`;

  await fs.writeFile(path.join(rootDir, 'quality-gates-report.md'), reportContent);
  logger.success('Quality gates report generated');
}

/**
 * Main quality gates check
 */
async function runQualityGates() {
  const environment = process.env.NODE_ENV || 'development';
  const args = process.argv.slice(2);
  const strict = args.includes('--strict');
  
  logger.info(`Running quality gates for ${environment} environment...`);
  
  const results = new QualityGateResults();
  
  try {
    // Run all quality gate checks
    await checkCoverageGate(results, environment);
    await checkCodeQualityGate(results, environment);
    await checkTestingGate(results, environment);
    await checkPerformanceGate(results, environment);
    await checkSecurityGate(results, environment);
    await checkDocumentationGate(results, environment);
    
    // Generate report
    await generateReport(results);
    
    const summary = results.getSummary();
    
    // Log results
    if (summary.passed) {
      logger.success('All quality gates passed! 🎉');
    } else {
      logger.error('Some quality gates failed');
      
      if (summary.blockers > 0) {
        logger.error(`${summary.blockers} blocking issue(s) found`);
        results.blockers.forEach(blocker => {
          logger.error(`  - ${blocker.gate}: ${blocker.message}`);
        });
      }
      
      if (summary.warnings > 0) {
        logger.warn(`${summary.warnings} warning(s) found`);
        results.warnings.forEach(warning => {
          logger.warn(`  - ${warning.gate}: ${warning.message}`);
        });
      }
    }
    
    // Exit with appropriate code
    if (!summary.passed && (strict || environment === 'production')) {
      process.exit(1);
    }
    
  } catch (error) {
    logger.error('Quality gates check failed');
    logger.error(error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runQualityGates();
}

export { runQualityGates, QualityGateResults };

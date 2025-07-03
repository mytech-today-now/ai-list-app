#!/usr/bin/env node

/**
 * @fileoverview Comprehensive test runner for AI ToDo MCP
 * @author AI ToDo MCP Team
 * @version 1.0.0
 */

import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

/**
 * Test configuration
 */
const testConfig = {
  // Test suites to run
  suites: {
    unit: {
      name: 'Unit Tests',
      command: 'npm run test:packages && npm run test:frontend -- --watchAll=false && npm run test:backend -- --watchAll=false',
      timeout: 300000, // 5 minutes
      required: true
    },
    integration: {
      name: 'Integration Tests',
      command: 'npm run test:integration',
      timeout: 600000, // 10 minutes
      required: true
    },
    e2e: {
      name: 'End-to-End Tests',
      command: 'npm run test:e2e',
      timeout: 900000, // 15 minutes
      required: true
    },
    visual: {
      name: 'Visual Regression Tests',
      command: 'npm run test:visual',
      timeout: 600000, // 10 minutes
      required: false
    },
    performance: {
      name: 'Performance Tests',
      command: 'npm run test:performance',
      timeout: 300000, // 5 minutes
      required: false
    },
    accessibility: {
      name: 'Accessibility Tests',
      command: 'npm run test:accessibility',
      timeout: 300000, // 5 minutes
      required: false
    }
  },
  
  // Quality checks
  quality: {
    linting: {
      name: 'Code Linting',
      command: 'npm run lint',
      timeout: 120000, // 2 minutes
      required: true
    },
    typeCheck: {
      name: 'TypeScript Type Checking',
      command: 'npm run type-check',
      timeout: 180000, // 3 minutes
      required: true
    },
    coverage: {
      name: 'Coverage Analysis',
      command: 'npm run test:coverage:report',
      timeout: 600000, // 10 minutes
      required: true
    },
    security: {
      name: 'Security Audit',
      command: 'npm audit --audit-level=high',
      timeout: 120000, // 2 minutes
      required: true
    }
  },
  
  // Reporting
  reporting: {
    outputDir: path.join(rootDir, 'test-results'),
    formats: ['json', 'html', 'junit'],
    includeTimings: true,
    includeCoverage: true
  }
};

/**
 * Logger utility
 */
const logger = {
  info: (msg) => console.log(`ℹ️  ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  error: (msg) => console.error(`❌ ${msg}`),
  warn: (msg) => console.warn(`⚠️  ${msg}`),
  step: (msg) => console.log(`🔄 ${msg}`),
  suite: (msg) => console.log(`🧪 ${msg}`),
  time: (msg) => console.log(`⏱️  ${msg}`)
};

/**
 * Test results tracker
 */
class TestResults {
  constructor() {
    this.results = {};
    this.startTime = Date.now();
    this.overallPassed = true;
    this.summary = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0
    };
  }
  
  addResult(suite, passed, duration, output = '', error = '') {
    this.results[suite] = {
      passed,
      duration,
      output,
      error,
      timestamp: new Date().toISOString()
    };
    
    this.summary.total++;
    if (passed) {
      this.summary.passed++;
    } else {
      this.summary.failed++;
      this.overallPassed = false;
    }
  }
  
  addSkipped(suite, reason) {
    this.results[suite] = {
      passed: null,
      skipped: true,
      reason,
      timestamp: new Date().toISOString()
    };
    this.summary.skipped++;
  }
  
  finalize() {
    this.summary.duration = Date.now() - this.startTime;
    return this.summary;
  }
  
  getResults() {
    return {
      summary: this.summary,
      results: this.results,
      overallPassed: this.overallPassed
    };
  }
}

/**
 * Execute command with timeout and logging
 */
async function executeCommand(command, timeout = 300000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    try {
      const result = execSync(command, {
        cwd: rootDir,
        encoding: 'utf8',
        stdio: 'pipe',
        timeout
      });
      
      const duration = Date.now() - startTime;
      resolve({ success: true, output: result, duration });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      resolve({
        success: false,
        output: error.stdout || '',
        error: error.stderr || error.message,
        duration
      });
    }
  });
}

/**
 * Run a test suite
 */
async function runTestSuite(suiteName, suiteConfig, results) {
  logger.suite(`Running ${suiteConfig.name}...`);
  
  const startTime = Date.now();
  
  try {
    const result = await executeCommand(suiteConfig.command, suiteConfig.timeout);
    const duration = Date.now() - startTime;
    
    if (result.success) {
      logger.success(`${suiteConfig.name} completed in ${duration}ms`);
      results.addResult(suiteName, true, duration, result.output);
    } else {
      logger.error(`${suiteConfig.name} failed after ${duration}ms`);
      logger.error(result.error);
      results.addResult(suiteName, false, duration, result.output, result.error);
    }
    
    return result.success;
    
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`${suiteConfig.name} failed with error: ${error.message}`);
    results.addResult(suiteName, false, duration, '', error.message);
    return false;
  }
}

/**
 * Run quality checks
 */
async function runQualityChecks(results) {
  logger.step('Running quality checks...');
  
  let allPassed = true;
  
  for (const [checkName, checkConfig] of Object.entries(testConfig.quality)) {
    const passed = await runTestSuite(checkName, checkConfig, results);
    if (!passed && checkConfig.required) {
      allPassed = false;
    }
  }
  
  return allPassed;
}

/**
 * Run test suites
 */
async function runTestSuites(results, suiteFilter = null) {
  logger.step('Running test suites...');
  
  let allPassed = true;
  
  for (const [suiteName, suiteConfig] of Object.entries(testConfig.suites)) {
    // Skip if filter is specified and doesn't match
    if (suiteFilter && !suiteFilter.includes(suiteName)) {
      results.addSkipped(suiteName, 'Filtered out');
      continue;
    }
    
    const passed = await runTestSuite(suiteName, suiteConfig, results);
    if (!passed && suiteConfig.required) {
      allPassed = false;
    }
  }
  
  return allPassed;
}

/**
 * Generate test report
 */
async function generateTestReport(results) {
  logger.step('Generating test report...');
  
  const testResults = results.getResults();
  const summary = testResults.summary;
  
  // Ensure output directory exists
  await fs.mkdir(testConfig.reporting.outputDir, { recursive: true });
  
  // Generate JSON report
  const jsonReport = {
    timestamp: new Date().toISOString(),
    summary,
    results: testResults.results,
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      cwd: process.cwd()
    }
  };
  
  await fs.writeFile(
    path.join(testConfig.reporting.outputDir, 'test-results.json'),
    JSON.stringify(jsonReport, null, 2)
  );
  
  // Generate HTML report
  const htmlReport = generateHTMLReport(testResults);
  await fs.writeFile(
    path.join(testConfig.reporting.outputDir, 'test-results.html'),
    htmlReport
  );
  
  // Generate JUnit XML report
  const junitReport = generateJUnitReport(testResults);
  await fs.writeFile(
    path.join(testConfig.reporting.outputDir, 'test-results.xml'),
    junitReport
  );
  
  logger.success(`Test report generated at ${testConfig.reporting.outputDir}`);
}

/**
 * Generate HTML report
 */
function generateHTMLReport(testResults) {
  const { summary, results } = testResults;
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI ToDo MCP - Test Results</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .skipped { color: #ffc107; }
        .test-suite { border: 1px solid #ddd; margin: 10px 0; padding: 15px; border-radius: 5px; }
        .test-suite.passed { border-left: 5px solid #28a745; }
        .test-suite.failed { border-left: 5px solid #dc3545; }
        .test-suite.skipped { border-left: 5px solid #ffc107; }
        pre { background: #f8f9fa; padding: 10px; border-radius: 3px; overflow-x: auto; }
    </style>
</head>
<body>
    <h1>AI ToDo MCP - Test Results</h1>
    
    <div class="summary">
        <h2>Summary</h2>
        <p><strong>Overall Status:</strong> <span class="${testResults.overallPassed ? 'passed' : 'failed'}">${testResults.overallPassed ? 'PASSED' : 'FAILED'}</span></p>
        <p><strong>Total:</strong> ${summary.total}</p>
        <p><strong>Passed:</strong> <span class="passed">${summary.passed}</span></p>
        <p><strong>Failed:</strong> <span class="failed">${summary.failed}</span></p>
        <p><strong>Skipped:</strong> <span class="skipped">${summary.skipped}</span></p>
        <p><strong>Duration:</strong> ${(summary.duration / 1000).toFixed(2)}s</p>
        <p><strong>Generated:</strong> ${new Date().toISOString()}</p>
    </div>
    
    <h2>Test Results</h2>
    ${Object.entries(results).map(([suite, result]) => {
      const status = result.skipped ? 'skipped' : (result.passed ? 'passed' : 'failed');
      const statusText = result.skipped ? `SKIPPED (${result.reason})` : (result.passed ? 'PASSED' : 'FAILED');
      
      return `
        <div class="test-suite ${status}">
            <h3>${suite} - <span class="${status}">${statusText}</span></h3>
            ${result.duration ? `<p><strong>Duration:</strong> ${(result.duration / 1000).toFixed(2)}s</p>` : ''}
            ${result.error ? `<h4>Error:</h4><pre>${result.error}</pre>` : ''}
            ${result.output ? `<h4>Output:</h4><pre>${result.output.slice(0, 1000)}${result.output.length > 1000 ? '...' : ''}</pre>` : ''}
        </div>
      `;
    }).join('')}
    
</body>
</html>`;
}

/**
 * Generate JUnit XML report
 */
function generateJUnitReport(testResults) {
  const { summary, results } = testResults;
  
  const testCases = Object.entries(results).map(([suite, result]) => {
    if (result.skipped) {
      return `    <testcase name="${suite}" classname="TestSuite">
      <skipped message="${result.reason}"/>
    </testcase>`;
    }
    
    if (result.passed) {
      return `    <testcase name="${suite}" classname="TestSuite" time="${(result.duration / 1000).toFixed(3)}"/>`;
    } else {
      return `    <testcase name="${suite}" classname="TestSuite" time="${(result.duration / 1000).toFixed(3)}">
      <failure message="Test failed">${result.error}</failure>
    </testcase>`;
    }
  }).join('\n');
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="AI ToDo MCP Tests" tests="${summary.total}" failures="${summary.failed}" skipped="${summary.skipped}" time="${(summary.duration / 1000).toFixed(3)}">
${testCases}
</testsuite>`;
}

/**
 * Main test runner function
 */
async function runTests() {
  const args = process.argv.slice(2);
  const qualityOnly = args.includes('--quality');
  const suiteFilter = args.find(arg => arg.startsWith('--suites='))?.split('=')[1]?.split(',');
  const skipReport = args.includes('--no-report');
  
  logger.info('Starting comprehensive test run...');
  
  const results = new TestResults();
  
  try {
    let allPassed = true;
    
    // Run quality checks
    if (qualityOnly || !suiteFilter) {
      const qualityPassed = await runQualityChecks(results);
      if (!qualityPassed) allPassed = false;
    }
    
    // Run test suites (unless quality-only mode)
    if (!qualityOnly) {
      const suitesPassed = await runTestSuites(results, suiteFilter);
      if (!suitesPassed) allPassed = false;
    }
    
    // Finalize results
    const summary = results.finalize();
    
    // Generate report
    if (!skipReport) {
      await generateTestReport(results);
    }
    
    // Log final results
    logger.info('\n' + '='.repeat(50));
    logger.info('TEST RUN COMPLETE');
    logger.info('='.repeat(50));
    
    if (allPassed && results.overallPassed) {
      logger.success(`All tests passed! 🎉`);
      logger.time(`Total time: ${(summary.duration / 1000).toFixed(2)}s`);
    } else {
      logger.error('Some tests failed');
      logger.error(`Failed: ${summary.failed}, Passed: ${summary.passed}, Skipped: ${summary.skipped}`);
      logger.time(`Total time: ${(summary.duration / 1000).toFixed(2)}s`);
    }
    
    // Exit with appropriate code
    process.exit(allPassed && results.overallPassed ? 0 : 1);
    
  } catch (error) {
    logger.error('Test run failed with error:');
    logger.error(error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}

export { runTests, TestResults, testConfig };

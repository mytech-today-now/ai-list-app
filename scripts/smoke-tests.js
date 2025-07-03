#!/usr/bin/env node

/**
 * @fileoverview Smoke tests for post-deployment validation
 * @author AI ToDo MCP Team
 * @version 1.0.0
 */

import fetch from 'node-fetch';
import { performance } from 'perf_hooks';

/**
 * Smoke test configuration
 */
const smokeTestConfig = {
  // Default URLs (can be overridden by command line)
  baseUrl: process.env.SMOKE_TEST_URL || 'http://localhost:5173',
  apiUrl: process.env.SMOKE_TEST_API_URL || 'http://localhost:3001',
  
  // Test timeouts
  timeout: 30000, // 30 seconds
  retries: 3,
  retryDelay: 5000, // 5 seconds
  
  // Performance thresholds
  thresholds: {
    responseTime: 5000, // 5 seconds
    apiResponseTime: 2000, // 2 seconds
    healthCheckTime: 1000 // 1 second
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
  test: (msg) => console.log(`🧪 ${msg}`)
};

/**
 * Smoke test results tracker
 */
class SmokeTestResults {
  constructor() {
    this.tests = [];
    this.startTime = Date.now();
    this.passed = 0;
    this.failed = 0;
    this.warnings = 0;
  }
  
  addTest(name, passed, duration, details = {}) {
    const test = {
      name,
      passed,
      duration,
      details,
      timestamp: new Date().toISOString()
    };
    
    this.tests.push(test);
    
    if (passed) {
      this.passed++;
      logger.success(`${name} - ${duration}ms`);
    } else {
      this.failed++;
      logger.error(`${name} - FAILED after ${duration}ms`);
      if (details.error) {
        logger.error(`  Error: ${details.error}`);
      }
    }
  }
  
  addWarning(name, message) {
    this.warnings++;
    logger.warn(`${name} - ${message}`);
  }
  
  getSummary() {
    const totalTime = Date.now() - this.startTime;
    return {
      total: this.tests.length,
      passed: this.passed,
      failed: this.failed,
      warnings: this.warnings,
      duration: totalTime,
      success: this.failed === 0
    };
  }
  
  getReport() {
    return {
      summary: this.getSummary(),
      tests: this.tests
    };
  }
}

/**
 * HTTP client with timeout and retries
 */
class HttpClient {
  constructor(timeout = 30000) {
    this.timeout = timeout;
  }
  
  async request(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }
  
  async get(url, options = {}) {
    return this.request(url, { method: 'GET', ...options });
  }
  
  async post(url, data, options = {}) {
    return this.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: JSON.stringify(data),
      ...options
    });
  }
}

/**
 * Smoke test runner
 */
class SmokeTestRunner {
  constructor(config) {
    this.config = config;
    this.results = new SmokeTestResults();
    this.httpClient = new HttpClient(config.timeout);
  }
  
  /**
   * Run a single test with retries
   */
  async runTest(testName, testFn) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.config.retries; attempt++) {
      try {
        const startTime = performance.now();
        const result = await testFn();
        const duration = Math.round(performance.now() - startTime);
        
        this.results.addTest(testName, true, duration, result);
        return true;
        
      } catch (error) {
        lastError = error;
        
        if (attempt < this.config.retries) {
          logger.warn(`${testName} failed (attempt ${attempt}/${this.config.retries}), retrying in ${this.config.retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
        }
      }
    }
    
    const duration = Math.round(performance.now() - performance.now());
    this.results.addTest(testName, false, duration, { error: lastError.message });
    return false;
  }
  
  /**
   * Test frontend availability
   */
  async testFrontendAvailability() {
    return this.runTest('Frontend Availability', async () => {
      const response = await this.httpClient.get(this.config.baseUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const html = await response.text();
      
      if (!html.includes('<title>') || html.includes('Error')) {
        throw new Error('Frontend returned invalid HTML');
      }
      
      return {
        status: response.status,
        contentLength: html.length,
        hasTitle: html.includes('<title>')
      };
    });
  }
  
  /**
   * Test API health endpoint
   */
  async testApiHealth() {
    return this.runTest('API Health Check', async () => {
      const response = await this.httpClient.get(`${this.config.apiUrl}/api/health`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const health = await response.json();
      
      if (health.status !== 'ok' && health.status !== 'healthy') {
        throw new Error(`API health status: ${health.status}`);
      }
      
      return {
        status: health.status,
        timestamp: health.timestamp,
        version: health.version
      };
    });
  }
  
  /**
   * Test API endpoints
   */
  async testApiEndpoints() {
    const endpoints = [
      { path: '/api/status', method: 'GET' },
      { path: '/api/tasks', method: 'GET' },
      { path: '/api/lists', method: 'GET' }
    ];
    
    for (const endpoint of endpoints) {
      await this.runTest(`API ${endpoint.method} ${endpoint.path}`, async () => {
        const url = `${this.config.apiUrl}${endpoint.path}`;
        const response = await this.httpClient.request(url, { method: endpoint.method });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        return {
          status: response.status,
          dataType: Array.isArray(data) ? 'array' : typeof data,
          hasData: data !== null && data !== undefined
        };
      });
    }
  }
  
  /**
   * Test database connectivity
   */
  async testDatabaseConnectivity() {
    return this.runTest('Database Connectivity', async () => {
      const response = await this.httpClient.get(`${this.config.apiUrl}/api/health/db`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const dbHealth = await response.json();
      
      if (!dbHealth.connected) {
        throw new Error('Database not connected');
      }
      
      return {
        connected: dbHealth.connected,
        responseTime: dbHealth.responseTime,
        database: dbHealth.database
      };
    });
  }
  
  /**
   * Test performance metrics
   */
  async testPerformanceMetrics() {
    return this.runTest('Performance Metrics', async () => {
      const startTime = performance.now();
      const response = await this.httpClient.get(this.config.baseUrl);
      const responseTime = Math.round(performance.now() - startTime);
      
      if (responseTime > this.config.thresholds.responseTime) {
        this.results.addWarning(
          'Performance Warning',
          `Response time ${responseTime}ms exceeds threshold ${this.config.thresholds.responseTime}ms`
        );
      }
      
      return {
        responseTime,
        threshold: this.config.thresholds.responseTime,
        withinThreshold: responseTime <= this.config.thresholds.responseTime
      };
    });
  }
  
  /**
   * Test security headers
   */
  async testSecurityHeaders() {
    return this.runTest('Security Headers', async () => {
      const response = await this.httpClient.get(this.config.baseUrl);
      
      const requiredHeaders = [
        'x-content-type-options',
        'x-frame-options',
        'x-xss-protection'
      ];
      
      const missingHeaders = [];
      const presentHeaders = {};
      
      for (const header of requiredHeaders) {
        const value = response.headers.get(header);
        if (value) {
          presentHeaders[header] = value;
        } else {
          missingHeaders.push(header);
        }
      }
      
      if (missingHeaders.length > 0) {
        this.results.addWarning(
          'Security Headers Warning',
          `Missing headers: ${missingHeaders.join(', ')}`
        );
      }
      
      return {
        presentHeaders,
        missingHeaders,
        allPresent: missingHeaders.length === 0
      };
    });
  }
  
  /**
   * Run all smoke tests
   */
  async runAllTests() {
    logger.info('Starting smoke tests...');
    logger.info(`Frontend URL: ${this.config.baseUrl}`);
    logger.info(`API URL: ${this.config.apiUrl}`);
    
    // Run tests in sequence
    await this.testFrontendAvailability();
    await this.testApiHealth();
    await this.testDatabaseConnectivity();
    await this.testApiEndpoints();
    await this.testPerformanceMetrics();
    await this.testSecurityHeaders();
    
    const summary = this.results.getSummary();
    
    logger.info('\n' + '='.repeat(50));
    logger.info('SMOKE TEST RESULTS');
    logger.info('='.repeat(50));
    
    if (summary.success) {
      logger.success(`All ${summary.total} tests passed! 🎉`);
    } else {
      logger.error(`${summary.failed} out of ${summary.total} tests failed`);
    }
    
    if (summary.warnings > 0) {
      logger.warn(`${summary.warnings} warnings found`);
    }
    
    logger.info(`Total time: ${(summary.duration / 1000).toFixed(2)}s`);
    
    return this.results.getReport();
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  
  // Parse command line arguments
  const config = { ...smokeTestConfig };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--url' && args[i + 1]) {
      config.baseUrl = args[i + 1];
      i++;
    } else if (arg === '--api-url' && args[i + 1]) {
      config.apiUrl = args[i + 1];
      i++;
    } else if (arg === '--timeout' && args[i + 1]) {
      config.timeout = parseInt(args[i + 1]);
      i++;
    }
  }
  
  try {
    const runner = new SmokeTestRunner(config);
    const report = await runner.runAllTests();
    
    // Write report to file
    const reportPath = `smoke-test-report-${Date.now()}.json`;
    await import('fs/promises').then(fs => 
      fs.writeFile(reportPath, JSON.stringify(report, null, 2))
    );
    
    logger.info(`Report saved to: ${reportPath}`);
    
    // Exit with appropriate code
    process.exit(report.summary.success ? 0 : 1);
    
  } catch (error) {
    logger.error('Smoke tests failed with error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { SmokeTestRunner, smokeTestConfig };

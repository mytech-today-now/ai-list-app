/**
 * Comprehensive code coverage configuration for the entire monorepo
 * This file defines coverage thresholds, reporting, and enforcement rules
 */

// Global coverage thresholds
const globalThresholds = {
  branches: 85,
  functions: 85,
  lines: 85,
  statements: 85,
}

// Critical component thresholds (higher standards)
const criticalThresholds = {
  branches: 95,
  functions: 95,
  lines: 95,
  statements: 95,
}

// Standard component thresholds
const standardThresholds = {
  branches: 90,
  functions: 90,
  lines: 90,
  statements: 90,
}

// Coverage configuration for different workspaces
const workspaceConfigs = {
  frontend: {
    coverageDirectory: './apps/frontend/coverage',
    collectCoverageFrom: [
      'apps/frontend/src/**/*.{ts,tsx}',
      '!apps/frontend/src/**/*.d.ts',
      '!apps/frontend/src/**/*.test.{ts,tsx}',
      '!apps/frontend/src/**/*.spec.{ts,tsx}',
      '!apps/frontend/src/**/*.stories.{ts,tsx}',
      '!apps/frontend/src/__tests__/**',
      '!apps/frontend/src/main.tsx',
      '!apps/frontend/src/vite-env.d.ts',
      '!apps/frontend/src/setupTests.ts',
      '!apps/frontend/src/test-utils.tsx',
      '!apps/frontend/src/**/__mocks__/**',
      '!apps/frontend/src/**/mocks/**',
      '!apps/frontend/src/types/**',
      '!apps/frontend/src/constants/**',
    ],
    coverageThreshold: {
      global: globalThresholds,
      './apps/frontend/src/components/': standardThresholds,
      './apps/frontend/src/hooks/': criticalThresholds,
      './apps/frontend/src/utils/': criticalThresholds,
      './apps/frontend/src/services/': standardThresholds,
      './apps/frontend/src/stores/': standardThresholds,
    },
  },
  
  backend: {
    coverageDirectory: './apps/backend/coverage',
    collectCoverageFrom: [
      'apps/backend/src/**/*.ts',
      '!apps/backend/src/**/*.d.ts',
      '!apps/backend/src/**/*.test.ts',
      '!apps/backend/src/**/*.spec.ts',
      '!apps/backend/src/__tests__/**',
      '!apps/backend/src/index.ts',
      '!apps/backend/src/types/**',
      '!apps/backend/src/constants/**',
      '!apps/backend/src/**/__mocks__/**',
      '!apps/backend/src/**/mocks/**',
      '!apps/backend/src/db/migrations/**',
      '!apps/backend/src/db/seeds/**',
    ],
    coverageThreshold: {
      global: globalThresholds,
      './apps/backend/src/routes/': standardThresholds,
      './apps/backend/src/services/': criticalThresholds,
      './apps/backend/src/utils/': criticalThresholds,
      './apps/backend/src/middleware/': standardThresholds,
      './apps/backend/src/controllers/': standardThresholds,
    },
  },
  
  'mcp-core': {
    coverageDirectory: './packages/mcp-core/coverage',
    collectCoverageFrom: [
      'packages/mcp-core/src/**/*.ts',
      '!packages/mcp-core/src/**/*.d.ts',
      '!packages/mcp-core/src/**/*.test.ts',
      '!packages/mcp-core/src/**/*.spec.ts',
      '!packages/mcp-core/src/__tests__/**',
    ],
    coverageThreshold: {
      global: criticalThresholds, // Core package needs highest coverage
    },
  },
  
  'shared-types': {
    coverageDirectory: './packages/shared-types/coverage',
    collectCoverageFrom: [
      'packages/shared-types/src/**/*.ts',
      '!packages/shared-types/src/**/*.d.ts',
      '!packages/shared-types/src/**/*.test.ts',
      '!packages/shared-types/src/**/*.spec.ts',
    ],
    coverageThreshold: {
      global: {
        branches: 70, // Types may have fewer branches
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
  },
  
  storage: {
    coverageDirectory: './packages/storage/coverage',
    collectCoverageFrom: [
      'packages/storage/src/**/*.ts',
      '!packages/storage/src/**/*.d.ts',
      '!packages/storage/src/**/*.test.ts',
      '!packages/storage/src/**/*.spec.ts',
      '!packages/storage/src/__tests__/**',
    ],
    coverageThreshold: {
      global: criticalThresholds, // Storage is critical
    },
  },
}

// Coverage reporters configuration
const coverageReporters = [
  'text',
  'text-summary',
  'lcov',
  'html',
  'json',
  'cobertura', // For CI/CD integration
  'json-summary',
]

// Coverage watermarks for color coding in reports
const coverageWatermarks = {
  statements: [70, 85],
  functions: [70, 85],
  branches: [70, 85],
  lines: [70, 85],
}

// Files to exclude from all coverage reports
const globalExcludes = [
  'node_modules/',
  'dist/',
  'build/',
  'coverage/',
  'public/',
  '**/*.config.{js,ts}',
  '**/*.d.ts',
  '**/__mocks__/**',
  '**/mocks/**',
  '**/*.test.{js,ts,tsx}',
  '**/*.spec.{js,ts,tsx}',
  '**/*.stories.{js,ts,tsx}',
  '**/test-utils.{js,ts,tsx}',
  '**/setupTests.{js,ts}',
]

// Coverage enforcement rules
const enforcementRules = {
  // Fail build if coverage drops below these thresholds
  failOnCoverageDecrease: true,
  
  // Maximum allowed coverage decrease (percentage points)
  maxCoverageDecrease: 2,
  
  // Minimum coverage for new files
  newFileThreshold: {
    branches: 90,
    functions: 90,
    lines: 90,
    statements: 90,
  },
  
  // Files that must have 100% coverage
  criticalFiles: [
    'src/utils/security.ts',
    'src/utils/validation.ts',
    'src/services/auth.ts',
    'src/middleware/auth.ts',
  ],
}

// Coverage badge configuration
const badgeConfig = {
  outputPath: './coverage/badges',
  thresholds: {
    excellent: 95,
    good: 85,
    acceptable: 70,
  },
  colors: {
    excellent: 'brightgreen',
    good: 'green',
    acceptable: 'yellow',
    poor: 'red',
  },
}

// Integration configurations
const integrations = {
  codecov: {
    token: process.env.CODECOV_TOKEN,
    flags: ['frontend', 'backend', 'packages'],
    failCiIfError: false,
  },
  
  sonarqube: {
    projectKey: 'ai-todo-mcp',
    sources: 'src',
    exclusions: globalExcludes.join(','),
    testExecutionReportPaths: 'coverage/test-results.xml',
    javascriptLcovReportPaths: 'coverage/lcov.info',
  },
  
  coveralls: {
    serviceName: 'github-actions',
    repoToken: process.env.COVERALLS_REPO_TOKEN,
  },
}

// Export configuration
module.exports = {
  globalThresholds,
  criticalThresholds,
  standardThresholds,
  workspaceConfigs,
  coverageReporters,
  coverageWatermarks,
  globalExcludes,
  enforcementRules,
  badgeConfig,
  integrations,
  
  // Helper functions
  getWorkspaceConfig: (workspace) => workspaceConfigs[workspace],
  
  getCoverageCommand: (workspace, options = {}) => {
    const config = workspaceConfigs[workspace]
    if (!config) {
      throw new Error(`Unknown workspace: ${workspace}`)
    }
    
    const baseCommand = workspace === 'frontend' ? 'vitest' : 'jest'
    const coverageFlag = workspace === 'frontend' ? '--coverage' : '--coverage'
    const watchFlag = options.watch ? '--watch' : '--watchAll=false'
    
    return `${baseCommand} ${coverageFlag} ${watchFlag}`
  },
  
  validateCoverage: (coverageData, workspace) => {
    const config = workspaceConfigs[workspace]
    const thresholds = config.coverageThreshold.global
    
    const violations = []
    
    Object.entries(thresholds).forEach(([metric, threshold]) => {
      if (coverageData[metric] < threshold) {
        violations.push({
          metric,
          actual: coverageData[metric],
          expected: threshold,
          workspace,
        })
      }
    })
    
    return {
      passed: violations.length === 0,
      violations,
    }
  },
  
  generateCoverageReport: (workspaces = Object.keys(workspaceConfigs)) => {
    const report = {
      timestamp: new Date().toISOString(),
      workspaces: {},
      overall: {
        branches: 0,
        functions: 0,
        lines: 0,
        statements: 0,
      },
    }
    
    // This would be implemented to aggregate coverage from all workspaces
    return report
  },
}

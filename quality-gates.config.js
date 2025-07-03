/**
 * @fileoverview Quality gates configuration for AI ToDo MCP
 * @author AI ToDo MCP Team
 * @version 1.0.0
 */

/**
 * Quality gates configuration
 * These gates must pass before code can be merged or deployed
 */
export const qualityGates = {
  // Code coverage requirements
  coverage: {
    global: {
      lines: 85,
      functions: 85,
      branches: 85,
      statements: 85
    },
    critical: {
      lines: 95,
      functions: 95,
      branches: 95,
      statements: 95
    },
    // Per-workspace thresholds
    workspaces: {
      'mcp-core': {
        lines: 95,
        functions: 95,
        branches: 95,
        statements: 95
      },
      'shared-types': {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90
      },
      'storage': {
        lines: 85,
        functions: 85,
        branches: 85,
        statements: 85
      },
      'frontend': {
        lines: 85,
        functions: 85,
        branches: 85,
        statements: 85
      },
      'backend': {
        lines: 85,
        functions: 85,
        branches: 85,
        statements: 85
      }
    }
  },

  // Code quality requirements
  codeQuality: {
    // ESLint rules that must pass
    linting: {
      maxWarnings: 0,
      maxErrors: 0,
      rules: {
        'no-console': 'warn',
        'no-debugger': 'error',
        'no-unused-vars': 'error',
        '@typescript-eslint/no-unused-vars': 'error',
        '@typescript-eslint/no-explicit-any': 'warn'
      }
    },
    
    // TypeScript compilation
    typeCheck: {
      strict: true,
      noImplicitAny: true,
      noImplicitReturns: true,
      noUnusedLocals: true,
      noUnusedParameters: true
    },
    
    // Code complexity
    complexity: {
      maxCyclomaticComplexity: 10,
      maxCognitiveComplexity: 15,
      maxLinesPerFunction: 50,
      maxParametersPerFunction: 5
    }
  },

  // Performance requirements
  performance: {
    // Bundle size limits
    bundleSize: {
      maxTotalSize: 2 * 1024 * 1024, // 2MB
      maxChunkSize: 512 * 1024,      // 512KB
      maxAssetSize: 1024 * 1024      // 1MB
    },
    
    // Lighthouse scores (minimum)
    lighthouse: {
      performance: 90,
      accessibility: 95,
      bestPractices: 90,
      seo: 90,
      pwa: 90
    },
    
    // Load time requirements
    loadTime: {
      firstContentfulPaint: 1500,  // 1.5s
      largestContentfulPaint: 2500, // 2.5s
      firstInputDelay: 100,         // 100ms
      cumulativeLayoutShift: 0.1    // 0.1
    }
  },

  // Security requirements
  security: {
    // Dependency vulnerabilities
    vulnerabilities: {
      maxHigh: 0,
      maxMedium: 2,
      maxLow: 10
    },
    
    // Security headers
    headers: {
      contentSecurityPolicy: true,
      strictTransportSecurity: true,
      xFrameOptions: true,
      xContentTypeOptions: true,
      referrerPolicy: true
    },
    
    // Authentication requirements
    authentication: {
      jwtExpiration: 24 * 60 * 60, // 24 hours
      passwordMinLength: 8,
      requireMFA: false // Set to true for production
    }
  },

  // Testing requirements
  testing: {
    // Test coverage by type
    testTypes: {
      unit: {
        required: true,
        minCoverage: 85
      },
      integration: {
        required: true,
        minCoverage: 70
      },
      e2e: {
        required: true,
        minTests: 10
      },
      visual: {
        required: true,
        maxDifference: 0.1 // 0.1% pixel difference
      },
      accessibility: {
        required: true,
        wcagLevel: 'AA',
        maxViolations: 0
      },
      performance: {
        required: true,
        maxRenderTime: 16 // 16ms for 60fps
      }
    },
    
    // Test execution requirements
    execution: {
      maxTestTime: 300000, // 5 minutes
      maxRetries: 2,
      parallelExecution: true
    }
  },

  // Documentation requirements
  documentation: {
    // API documentation coverage
    apiDocs: {
      minCoverage: 90,
      requireExamples: true,
      requireSchemas: true
    },
    
    // Code documentation
    codeDocs: {
      requireJSDoc: true,
      requireTypeDoc: true,
      minFunctionDocumentation: 80
    },
    
    // README requirements
    readme: {
      requireInstallation: true,
      requireUsage: true,
      requireContributing: true,
      requireLicense: true
    }
  },

  // Deployment requirements
  deployment: {
    // Environment checks
    environments: {
      development: {
        requireTests: true,
        requireLinting: true,
        requireTypeCheck: true
      },
      staging: {
        requireTests: true,
        requireLinting: true,
        requireTypeCheck: true,
        requireE2E: true,
        requirePerformance: true
      },
      production: {
        requireTests: true,
        requireLinting: true,
        requireTypeCheck: true,
        requireE2E: true,
        requirePerformance: true,
        requireSecurity: true,
        requireDocumentation: true
      }
    },
    
    // Rollback requirements
    rollback: {
      maxDowntime: 30000, // 30 seconds
      requireBackup: true,
      requireHealthCheck: true
    }
  }
};

/**
 * Quality gate enforcement levels
 */
export const enforcementLevels = {
  BLOCKING: 'blocking',     // Must pass to proceed
  WARNING: 'warning',       // Shows warning but allows proceed
  INFORMATIONAL: 'info'     // Shows info only
};

/**
 * Quality gate configuration by environment
 */
export const environmentGates = {
  development: {
    coverage: enforcementLevels.WARNING,
    codeQuality: enforcementLevels.WARNING,
    performance: enforcementLevels.INFORMATIONAL,
    security: enforcementLevels.WARNING,
    testing: enforcementLevels.WARNING,
    documentation: enforcementLevels.INFORMATIONAL
  },
  
  staging: {
    coverage: enforcementLevels.BLOCKING,
    codeQuality: enforcementLevels.BLOCKING,
    performance: enforcementLevels.WARNING,
    security: enforcementLevels.BLOCKING,
    testing: enforcementLevels.BLOCKING,
    documentation: enforcementLevels.WARNING
  },
  
  production: {
    coverage: enforcementLevels.BLOCKING,
    codeQuality: enforcementLevels.BLOCKING,
    performance: enforcementLevels.BLOCKING,
    security: enforcementLevels.BLOCKING,
    testing: enforcementLevels.BLOCKING,
    documentation: enforcementLevels.BLOCKING
  }
};

/**
 * Quality metrics tracking
 */
export const qualityMetrics = {
  // Technical debt tracking
  technicalDebt: {
    maxDebtRatio: 0.05, // 5% of codebase
    maxDebtIndex: 'A',  // SonarQube debt index
    trackTrends: true
  },
  
  // Code maintainability
  maintainability: {
    minMaintainabilityIndex: 70,
    maxDuplication: 3, // 3% code duplication
    maxComplexity: 10
  },
  
  // Team productivity
  productivity: {
    maxBuildTime: 600000,    // 10 minutes
    maxDeploymentTime: 300000, // 5 minutes
    minDeploymentFrequency: 'daily'
  }
};

/**
 * Integration configurations
 */
export const integrations = {
  // CI/CD platforms
  cicd: {
    github: {
      requireStatusChecks: true,
      requireReviews: 2,
      dismissStaleReviews: true,
      requireCodeOwnerReviews: true
    },
    
    jenkins: {
      requireBuildSuccess: true,
      requireTestSuccess: true,
      requireQualityGate: true
    }
  },
  
  // Quality tools
  qualityTools: {
    sonarqube: {
      enabled: false, // Enable when SonarQube is set up
      qualityGateId: 'default',
      failOnQualityGate: true
    },
    
    codeClimate: {
      enabled: false, // Enable when CodeClimate is set up
      maintainabilityThreshold: 'A'
    }
  },
  
  // Monitoring
  monitoring: {
    sentry: {
      enabled: false, // Enable when Sentry is set up
      errorThreshold: 0.01 // 1% error rate
    },
    
    lighthouse: {
      enabled: true,
      budgets: qualityGates.performance.lighthouse
    }
  }
};

export default {
  qualityGates,
  enforcementLevels,
  environmentGates,
  qualityMetrics,
  integrations
};

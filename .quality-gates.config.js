/**
 * Quality Gates Configuration
 * Defines all quality standards and enforcement rules for the project
 */

module.exports = {
  // Code quality thresholds
  quality: {
    // ESLint configuration
    eslint: {
      maxWarnings: 0,
      maxErrors: 0,
      rules: {
        // Critical rules that must pass
        critical: [
          'no-console',
          'no-debugger',
          'no-alert',
          'no-eval',
          'no-implied-eval',
          'no-new-func',
          'no-script-url',
          'no-unsafe-innerHTML',
        ],
        // Important rules with warnings
        important: [
          'prefer-const',
          'no-var',
          'no-unused-vars',
          'no-undef',
          'eqeqeq',
          'curly',
        ],
      },
    },

    // TypeScript configuration
    typescript: {
      strict: true,
      noImplicitAny: true,
      noImplicitReturns: true,
      noUnusedLocals: true,
      noUnusedParameters: true,
      exactOptionalPropertyTypes: true,
    },

    // Prettier configuration
    prettier: {
      enforceFormatting: true,
      checkOnCommit: true,
    },

    // Code complexity thresholds
    complexity: {
      maxCyclomaticComplexity: 10,
      maxCognitiveComplexity: 15,
      maxLinesPerFunction: 50,
      maxParametersPerFunction: 5,
      maxNestingDepth: 4,
    },

    // File size limits
    fileSize: {
      maxLinesPerFile: 500,
      maxFileSizeBytes: 1048576, // 1MB
      warnAtLines: 300,
      warnAtBytes: 524288, // 512KB
    },

    // Dependency management
    dependencies: {
      allowedLicenses: [
        'MIT',
        'Apache-2.0',
        'BSD-2-Clause',
        'BSD-3-Clause',
        'ISC',
        'CC0-1.0',
      ],
      blockedPackages: [
        'lodash', // Prefer individual lodash functions
        'moment', // Prefer date-fns or dayjs
      ],
      maxDependencies: 100,
      maxDevDependencies: 150,
    },
  },

  // Security requirements
  security: {
    // Sensitive data patterns to detect
    sensitivePatterns: [
      {
        name: 'API Keys',
        pattern: /api[_-]?key\s*[:=]\s*['"][^'"]*['"]/gi,
        severity: 'error',
      },
      {
        name: 'Passwords',
        pattern: /password\s*[:=]\s*['"][^'"]*['"]/gi,
        severity: 'error',
      },
      {
        name: 'Secrets',
        pattern: /secret\s*[:=]\s*['"][^'"]*['"]/gi,
        severity: 'error',
      },
      {
        name: 'Tokens',
        pattern: /token\s*[:=]\s*['"][^'"]*['"]/gi,
        severity: 'error',
      },
      {
        name: 'Private Keys',
        pattern: /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/gi,
        severity: 'error',
      },
      {
        name: 'AWS Access Keys',
        pattern: /AKIA[0-9A-Z]{16}/g,
        severity: 'error',
      },
      {
        name: 'Stripe Keys',
        pattern: /(sk|pk)_live_[0-9a-zA-Z]{24,}/g,
        severity: 'error',
      },
    ],

    // Files that should never be committed
    blockedFiles: [
      '.env',
      '.env.local',
      '.env.production',
      '.env.staging',
      '*.pem',
      '*.key',
      '*.p12',
      '*.pfx',
      'id_rsa',
      'id_dsa',
      '.aws/credentials',
      '.docker/config.json',
    ],

    // Security audit configuration
    audit: {
      level: 'moderate', // minimum, low, moderate, high, critical
      allowedVulnerabilities: 0,
      autoFix: true,
    },
  },

  // Testing requirements
  testing: {
    // Coverage thresholds
    coverage: {
      global: {
        branches: 85,
        functions: 85,
        lines: 85,
        statements: 85,
      },
      perFile: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },

    // Test file requirements
    testFiles: {
      requiredForNewFiles: true,
      testFilePatterns: [
        '**/*.test.{js,ts,jsx,tsx}',
        '**/*.spec.{js,ts,jsx,tsx}',
        '**/__tests__/**/*.{js,ts,jsx,tsx}',
      ],
      excludePatterns: [
        '**/*.d.ts',
        '**/*.config.{js,ts}',
        '**/types/**',
        '**/constants/**',
      ],
    },

    // Performance testing
    performance: {
      maxLoadTime: 3000, // ms
      maxBundleSize: 2097152, // 2MB
      maxChunkSize: 524288, // 512KB
    },
  },

  // Git workflow requirements
  git: {
    // Commit message format
    commitMessage: {
      enforceConventionalCommits: true,
      maxSubjectLength: 72,
      minSubjectLength: 10,
      allowedTypes: [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'test',
        'chore',
        'perf',
        'ci',
        'build',
        'revert',
      ],
      requireScope: false,
      requireDescription: true,
      allowBreakingChanges: true,
    },

    // Branch protection
    branches: {
      protected: ['main', 'develop'],
      requirePullRequest: true,
      requireReviews: 2,
      requireStatusChecks: true,
      requireUpToDate: true,
    },

    // File restrictions
    fileRestrictions: {
      maxFilesPerCommit: 50,
      maxLinesPerCommit: 1000,
      blockedExtensions: ['.exe', '.dll', '.so', '.dylib'],
    },
  },

  // Build requirements
  build: {
    // Build performance
    performance: {
      maxBuildTime: 300000, // 5 minutes
      maxBundleSize: 2097152, // 2MB
      maxAssets: 100,
    },

    // Build validation
    validation: {
      requireTypeCheck: true,
      requireLinting: true,
      requireTests: true,
      requireSecurity: true,
    },

    // Environment-specific requirements
    environments: {
      development: {
        allowConsoleLog: true,
        allowDebugger: true,
        requireMinification: false,
      },
      staging: {
        allowConsoleLog: false,
        allowDebugger: false,
        requireMinification: true,
        requireSourceMaps: true,
      },
      production: {
        allowConsoleLog: false,
        allowDebugger: false,
        requireMinification: true,
        requireSourceMaps: false,
        requireOptimization: true,
      },
    },
  },

  // Documentation requirements
  documentation: {
    // Code documentation
    code: {
      requireJSDoc: true,
      requireTypeAnnotations: true,
      requireExamples: false,
    },

    // API documentation
    api: {
      requireOpenAPI: true,
      requireExamples: true,
      requireSchemas: true,
    },

    // README requirements
    readme: {
      requiredSections: [
        'Installation',
        'Usage',
        'API',
        'Contributing',
        'License',
      ],
      maxLength: 10000,
      requireBadges: true,
    },
  },

  // Accessibility requirements
  accessibility: {
    // WCAG compliance level
    wcagLevel: 'AA', // A, AA, AAA

    // Required checks
    checks: {
      colorContrast: true,
      keyboardNavigation: true,
      screenReader: true,
      focusManagement: true,
      semanticHTML: true,
    },

    // Testing requirements
    testing: {
      requireAxeTests: true,
      requireManualTesting: false,
    },
  },

  // Performance requirements
  performance: {
    // Web vitals thresholds
    webVitals: {
      firstContentfulPaint: 1800, // ms
      largestContentfulPaint: 2500, // ms
      firstInputDelay: 100, // ms
      cumulativeLayoutShift: 0.1, // score
      timeToFirstByte: 600, // ms
    },

    // Lighthouse scores
    lighthouse: {
      performance: 90,
      accessibility: 95,
      bestPractices: 95,
      seo: 90,
      pwa: 80,
    },

    // Bundle analysis
    bundle: {
      maxSize: 2097152, // 2MB
      maxChunks: 20,
      maxDuplicates: 5,
    },
  },

  // Enforcement levels
  enforcement: {
    // When to fail builds
    failOn: {
      lintErrors: true,
      typeErrors: true,
      testFailures: true,
      securityVulnerabilities: true,
      coverageBelow: true,
      buildErrors: true,
    },

    // When to show warnings
    warnOn: {
      lintWarnings: true,
      performanceIssues: true,
      accessibilityIssues: true,
      documentationMissing: true,
      dependencyIssues: true,
    },

    // Bypass mechanisms
    bypass: {
      allowSkipHooks: false,
      allowForceCommit: false,
      requireApproval: true,
    },
  },

  // Integration settings
  integrations: {
    // CI/CD platforms
    github: {
      requireStatusChecks: true,
      requireReviews: true,
      dismissStaleReviews: true,
      requireCodeOwnerReviews: false,
    },

    // Code quality tools
    sonarqube: {
      qualityGate: 'Sonar way',
      newCodePeriod: '30',
      failOnQualityGate: true,
    },

    // Security tools
    snyk: {
      severity: 'high',
      failOnIssues: true,
      autoFix: true,
    },
  },
}

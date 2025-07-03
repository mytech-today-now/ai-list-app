/**
 * @fileoverview Build configuration for AI ToDo MCP
 * @author AI ToDo MCP Team
 * @version 1.0.0
 */

const path = require('path');

module.exports = {
  // Build settings
  parallel: true,
  maxConcurrency: 4,
  timeout: 300000, // 5 minutes
  
  // Environment configurations
  environments: {
    development: {
      NODE_ENV: 'development',
      sourceMaps: true,
      minify: false,
      optimization: false,
      bundleAnalyzer: false,
      hotReload: true,
      typeCheck: true,
      linting: true
    },
    
    staging: {
      NODE_ENV: 'production',
      sourceMaps: true,
      minify: true,
      optimization: true,
      bundleAnalyzer: true,
      hotReload: false,
      typeCheck: true,
      linting: true,
      performanceHints: true
    },
    
    production: {
      NODE_ENV: 'production',
      sourceMaps: false,
      minify: true,
      optimization: true,
      bundleAnalyzer: true,
      hotReload: false,
      typeCheck: true,
      linting: true,
      performanceHints: true,
      compressionGzip: true,
      compressionBrotli: true
    }
  },
  
  // Workspace build order (dependencies first)
  buildOrder: [
    'packages/shared-types',
    'packages/mcp-core',
    'packages/storage',
    'apps/backend',
    'apps/frontend'
  ],
  
  // Build commands for each workspace
  commands: {
    'packages/shared-types': {
      build: 'npm run build',
      test: 'npm run test',
      lint: 'npm run lint',
      typeCheck: 'npm run type-check'
    },
    
    'packages/mcp-core': {
      build: 'npm run build',
      test: 'npm run test',
      lint: 'npm run lint',
      typeCheck: 'npm run type-check'
    },
    
    'packages/storage': {
      build: 'npm run build',
      test: 'npm run test',
      lint: 'npm run lint',
      typeCheck: 'npm run type-check'
    },
    
    'apps/backend': {
      build: 'npm run build',
      test: 'npm run test',
      lint: 'npm run lint',
      typeCheck: 'npm run type-check',
      migrate: 'npm run db:migrate'
    },
    
    'apps/frontend': {
      build: 'npm run build',
      test: 'npm run test',
      lint: 'npm run lint',
      typeCheck: 'npm run type-check',
      preview: 'npm run preview'
    }
  },
  
  // Output directories
  outputDirs: {
    'packages/shared-types': 'dist',
    'packages/mcp-core': 'dist',
    'packages/storage': 'dist',
    'apps/backend': 'dist',
    'apps/frontend': 'dist'
  },
  
  // Bundle analysis configuration
  bundleAnalysis: {
    enabled: true,
    outputDir: 'bundle-analysis',
    formats: ['json', 'html'],
    thresholds: {
      maxBundleSize: 2 * 1024 * 1024, // 2MB
      maxChunkSize: 512 * 1024,       // 512KB
      maxAssetSize: 1024 * 1024       // 1MB
    }
  },
  
  // Performance budgets
  performanceBudgets: {
    frontend: {
      maxBundleSize: 2 * 1024 * 1024,
      maxInitialChunkSize: 512 * 1024,
      maxAssetSize: 1024 * 1024,
      maxCssSize: 100 * 1024,
      maxJsSize: 500 * 1024
    }
  },
  
  // Build optimization settings
  optimization: {
    // Tree shaking
    treeShaking: true,
    
    // Code splitting
    codeSplitting: {
      chunks: 'all',
      minSize: 20000,
      maxSize: 244000,
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: 10
        },
        common: {
          name: 'common',
          minChunks: 2,
          chunks: 'all',
          priority: 5,
          reuseExistingChunk: true
        }
      }
    },
    
    // Minification
    minification: {
      removeComments: true,
      removeConsoleLog: true,
      removeDebugger: true,
      mangleProps: false
    },
    
    // Image optimization
    images: {
      formats: ['webp', 'avif'],
      quality: 80,
      progressive: true,
      optimizeImages: true
    }
  },
  
  // Build hooks
  hooks: {
    preBuild: [
      'npm run clean',
      'npm run lint',
      'npm run type-check'
    ],
    
    postBuild: [
      'npm run test:build',
      'npm run analyze:bundle'
    ],
    
    prePackage: [
      'npm run docs:generate'
    ],
    
    postPackage: [
      'npm run test:package'
    ]
  },
  
  // Cache configuration
  cache: {
    enabled: true,
    directory: '.build-cache',
    hashAlgorithm: 'sha256',
    invalidateOn: [
      'package.json',
      'package-lock.json',
      'tsconfig.json',
      'vite.config.ts',
      'build.config.js'
    ]
  },
  
  // Watch mode settings
  watch: {
    enabled: false,
    ignored: [
      'node_modules/**',
      'dist/**',
      'build/**',
      '**/*.test.{ts,tsx,js,jsx}',
      '**/*.spec.{ts,tsx,js,jsx}'
    ],
    aggregateTimeout: 300,
    poll: false
  },
  
  // Error handling
  errorHandling: {
    continueOnError: false,
    maxRetries: 3,
    retryDelay: 1000,
    failFast: true
  },
  
  // Logging configuration
  logging: {
    level: 'info', // 'silent', 'error', 'warn', 'info', 'verbose'
    colors: true,
    timestamps: true,
    progress: true,
    stats: true
  },
  
  // Docker build settings
  docker: {
    enabled: false,
    baseImage: 'node:18-alpine',
    workdir: '/app',
    port: 3000,
    healthcheck: {
      test: ['CMD', 'curl', '-f', 'http://localhost:3000/health'],
      interval: '30s',
      timeout: '10s',
      retries: 3,
      startPeriod: '40s'
    }
  },
  
  // Deployment artifacts
  artifacts: {
    include: [
      'dist/**/*',
      'package.json',
      'README.md',
      'CHANGELOG.md'
    ],
    exclude: [
      '**/*.map',
      '**/*.test.*',
      '**/*.spec.*',
      '**/node_modules/**'
    ],
    compression: {
      enabled: true,
      format: 'tar.gz',
      level: 9
    }
  },
  
  // Build notifications
  notifications: {
    enabled: false,
    onSuccess: {
      title: 'Build Successful',
      message: 'All packages built successfully'
    },
    onError: {
      title: 'Build Failed',
      message: 'Build failed with errors'
    },
    channels: {
      slack: {
        webhook: process.env.SLACK_WEBHOOK_URL,
        channel: '#builds'
      },
      email: {
        enabled: false,
        recipients: []
      }
    }
  }
};

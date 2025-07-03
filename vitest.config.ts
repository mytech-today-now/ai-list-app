/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

/**
 * Vitest configuration for comprehensive testing
 * Supports unit, integration, visual, performance, and accessibility testing
 */
export default defineConfig({
  plugins: [react()],
  
  test: {
    // Test environment
    globals: true,
    environment: 'jsdom',
    setupFiles: [
      './apps/frontend/src/__tests__/setup.ts',
      './apps/frontend/src/__tests__/visual/visual.config.ts',
      './apps/frontend/src/__tests__/performance/performance-setup.ts',
      './apps/frontend/src/__tests__/accessibility/a11y-setup.ts'
    ],
    
    // Test execution
    testTimeout: 30000,
    hookTimeout: 10000,
    teardownTimeout: 5000,
    isolate: true,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: 4,
        minThreads: 1
      }
    },
    
    // Test file patterns
    include: [
      'apps/*/src/**/*.{test,spec}.{ts,tsx}',
      'packages/*/src/**/*.{test,spec}.{ts,tsx}',
      'apps/*/src/__tests__/**/*.{ts,tsx}',
      'packages/*/src/__tests__/**/*.{ts,tsx}'
    ],
    exclude: [
      'node_modules/',
      'dist/',
      'build/',
      'coverage/',
      'storybook-static/',
      '.storybook/',
      '**/*.d.ts',
      '**/*.stories.{ts,tsx}',
      '**/e2e/**'
    ],
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: [
        'text',
        'text-summary',
        'json',
        'json-summary',
        'html',
        'lcov',
        'cobertura',
        'clover'
      ],
      reportsDirectory: './coverage',
      all: true,
      
      include: [
        'apps/*/src/**/*.{ts,tsx}',
        'packages/*/src/**/*.{ts,tsx}'
      ],
      
      exclude: [
        'node_modules/',
        'dist/',
        'build/',
        'coverage/',
        'storybook-static/',
        '.storybook/',
        '**/*.d.ts',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        '**/*.stories.{ts,tsx}',
        '**/__tests__/**',
        '**/__mocks__/**',
        '**/mocks/**',
        '**/test-utils/**',
        '**/setup.ts',
        '**/main.tsx',
        '**/index.ts',
        '**/vite-env.d.ts',
        '**/types/**',
        '**/constants/**',
        '*.config.{js,ts}',
        '**/migrations/**',
        '**/seeds/**'
      ],
      
      // Global thresholds
      thresholds: {
        global: {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85
        }
      },
      
      // Per-file thresholds for critical components
      perFile: true,
      skipFull: false,
      clean: true,
      cleanOnRerun: true,
      
      // Watermarks for coverage reporting
      watermarks: {
        statements: [70, 85],
        functions: [70, 85],
        branches: [70, 85],
        lines: [70, 85]
      }
    },
    
    // Mock configuration
    deps: {
      inline: [
        '@testing-library/jest-dom',
        'jest-axe',
        'jest-image-snapshot'
      ]
    },
    
    // Environment variables for tests
    env: {
      NODE_ENV: 'test',
      VITE_API_URL: 'http://localhost:3001',
      VITE_ENABLE_PWA: 'false',
      VITE_ENABLE_ANALYTICS: 'false'
    },
    
    // Reporter configuration
    reporter: [
      'verbose',
      'json',
      'html',
      'junit'
    ],
    
    outputFile: {
      json: './test-results/results.json',
      html: './test-results/index.html',
      junit: './test-results/junit.xml'
    },
    
    // Watch configuration
    watch: {
      exclude: [
        'node_modules/**',
        'dist/**',
        'build/**',
        'coverage/**',
        'test-results/**'
      ]
    },
    
    // Workspace configuration
    workspace: [
      {
        test: {
          name: 'unit',
          include: ['**/*.test.{ts,tsx}'],
          exclude: [
            '**/*.integration.test.{ts,tsx}',
            '**/*.e2e.test.{ts,tsx}',
            '**/*.visual.test.{ts,tsx}',
            '**/*.performance.test.{ts,tsx}',
            '**/*.a11y.test.{ts,tsx}'
          ]
        }
      },
      {
        test: {
          name: 'integration',
          include: ['**/*.integration.test.{ts,tsx}'],
          testTimeout: 60000
        }
      },
      {
        test: {
          name: 'visual',
          include: ['**/*.visual.test.{ts,tsx}'],
          testTimeout: 30000,
          setupFiles: ['./apps/frontend/src/__tests__/visual/visual-setup.ts']
        }
      },
      {
        test: {
          name: 'performance',
          include: ['**/*.performance.test.{ts,tsx}'],
          testTimeout: 60000,
          setupFiles: ['./apps/frontend/src/__tests__/performance/performance-setup.ts']
        }
      },
      {
        test: {
          name: 'accessibility',
          include: ['**/*.a11y.test.{ts,tsx}'],
          testTimeout: 30000,
          setupFiles: ['./apps/frontend/src/__tests__/accessibility/a11y-setup.ts']
        }
      }
    ]
  },
  
  // Resolve configuration
  resolve: {
    alias: {
      '@': resolve(__dirname, './apps/frontend/src'),
      '@backend': resolve(__dirname, './apps/backend/src'),
      '@ai-todo/mcp-core': resolve(__dirname, './packages/mcp-core/src'),
      '@ai-todo/shared-types': resolve(__dirname, './packages/shared-types/src'),
      '@ai-todo/storage': resolve(__dirname, './packages/storage/src'),
      '@test-utils': resolve(__dirname, './apps/frontend/src/__tests__/utils'),
      '@visual-utils': resolve(__dirname, './apps/frontend/src/__tests__/visual'),
      '@performance-utils': resolve(__dirname, './apps/frontend/src/__tests__/performance'),
      '@a11y-utils': resolve(__dirname, './apps/frontend/src/__tests__/accessibility')
    }
  },
  
  // Define configuration
  define: {
    __TEST__: true,
    __DEV__: false,
    __PROD__: false
  }
});

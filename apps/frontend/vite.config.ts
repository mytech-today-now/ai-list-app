/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      },
      manifest: {
        name: 'AI ToDo MCP',
        short_name: 'AI ToDo',
        description: 'AI-Driven PWA Task Manager with MCP',
        theme_color: '#000000',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  server: {
    port: 5173,
    host: true
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    css: true,
    testTimeout: 10000,
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
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov', 'text-summary', 'cobertura', 'json-summary'],
      reportsDirectory: './coverage',
      all: true,
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'node_modules/',
        'src/__tests__/',
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'src/**/*.stories.{ts,tsx}',
        '**/*.d.ts',
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/setupTests.ts',
        'src/test-utils.tsx',
        'src/**/__mocks__/**',
        'src/**/mocks/**',
        'dist/',
        'build/',
        'storybook-static/',
        '.storybook/',
        'coverage/',
        'public/',
        '*.config.{js,ts}',
        'src/types/',
        'src/constants/',
      ],
      include: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.d.ts'
      ],
      thresholds: {
        global: {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85
        },
        // Per-file thresholds for critical files
        'src/components/**/*.{ts,tsx}': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90
        },
        'src/hooks/**/*.{ts,tsx}': {
          branches: 95,
          functions: 95,
          lines: 95,
          statements: 95
        },
        'src/utils/**/*.{ts,tsx}': {
          branches: 95,
          functions: 95,
          lines: 95,
          statements: 95
        }
      },
      // Watermarks for coverage reporting
      watermarks: {
        statements: [70, 85],
        functions: [70, 85],
        branches: [70, 85],
        lines: [70, 85]
      },
      // Additional coverage options
      all: true,
      skipFull: false,
      perFile: true,
      clean: true,
      cleanOnRerun: true
    }
  },
  resolve: {
    alias: {
      '@': '/src',
      '@ai-todo/mcp-core': '/../../packages/mcp-core/src',
      '@ai-todo/shared-types': '/../../packages/shared-types/src',
      '@ai-todo/storage': '/../../packages/storage/src'
    }
  }
})

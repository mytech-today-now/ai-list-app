/**
 * @fileoverview Lighthouse CI configuration for performance monitoring
 * @author AI ToDo MCP Team
 * @version 1.0.0
 */

module.exports = {
  ci: {
    collect: {
      // URLs to test
      url: [
        'http://localhost:5173',
        'http://localhost:5173/tasks',
        'http://localhost:5173/lists',
        'http://localhost:5173/settings'
      ],
      
      // Collection settings
      numberOfRuns: 3,
      startServerCommand: 'npm run preview',
      startServerReadyPattern: 'Local:',
      startServerReadyTimeout: 30000,
      
      // Chrome settings
      settings: {
        chromeFlags: [
          '--no-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--headless'
        ],
        preset: 'desktop',
        throttling: {
          rttMs: 40,
          throughputKbps: 10240,
          cpuSlowdownMultiplier: 1,
          requestLatencyMs: 0,
          downloadThroughputKbps: 0,
          uploadThroughputKbps: 0
        },
        screenEmulation: {
          mobile: false,
          width: 1920,
          height: 1080,
          deviceScaleFactor: 1,
          disabled: false
        },
        formFactor: 'desktop',
        throttlingMethod: 'simulate',
        auditMode: false,
        gatherMode: false,
        disableStorageReset: false,
        emulatedUserAgent: false,
        locale: 'en-US',
        blockedUrlPatterns: null,
        additionalTraceCategories: null,
        extraHeaders: null,
        precomputedLanternData: null,
        onlyAudits: null,
        onlyCategories: null,
        skipAudits: null
      }
    },
    
    assert: {
      // Performance budgets
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
        'categories:pwa': ['warn', { minScore: 0.8 }],
        
        // Core Web Vitals
        'first-contentful-paint': ['warn', { maxNumericValue: 1500 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'first-input-delay': ['error', { maxNumericValue: 100 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'speed-index': ['warn', { maxNumericValue: 3000 }],
        'interactive': ['warn', { maxNumericValue: 3000 }],
        
        // Resource budgets
        'resource-summary:document:size': ['error', { maxNumericValue: 50000 }],
        'resource-summary:script:size': ['error', { maxNumericValue: 500000 }],
        'resource-summary:stylesheet:size': ['error', { maxNumericValue: 100000 }],
        'resource-summary:image:size': ['warn', { maxNumericValue: 1000000 }],
        'resource-summary:font:size': ['warn', { maxNumericValue: 200000 }],
        'resource-summary:other:size': ['warn', { maxNumericValue: 200000 }],
        'resource-summary:total:size': ['error', { maxNumericValue: 2000000 }],
        
        // Network requests
        'resource-summary:total:count': ['warn', { maxNumericValue: 50 }],
        'resource-summary:third-party:count': ['warn', { maxNumericValue: 10 }],
        
        // Specific audits
        'unused-css-rules': ['warn', { maxNumericValue: 50000 }],
        'unused-javascript': ['warn', { maxNumericValue: 100000 }],
        'modern-image-formats': ['warn', { minScore: 0.8 }],
        'offscreen-images': ['warn', { minScore: 0.8 }],
        'render-blocking-resources': ['warn', { maxNumericValue: 500 }],
        'unminified-css': ['error', { minScore: 1 }],
        'unminified-javascript': ['error', { minScore: 1 }],
        'efficient-animated-content': ['warn', { minScore: 0.8 }],
        'duplicated-javascript': ['warn', { minScore: 1 }],
        'legacy-javascript': ['warn', { minScore: 0.8 }],
        
        // Accessibility
        'color-contrast': ['error', { minScore: 1 }],
        'heading-order': ['error', { minScore: 1 }],
        'html-has-lang': ['error', { minScore: 1 }],
        'image-alt': ['error', { minScore: 1 }],
        'label': ['error', { minScore: 1 }],
        'link-name': ['error', { minScore: 1 }],
        
        // Best practices
        'is-on-https': ['error', { minScore: 1 }],
        'uses-http2': ['warn', { minScore: 1 }],
        'no-vulnerable-libraries': ['error', { minScore: 1 }],
        'csp-xss': ['warn', { minScore: 1 }],
        
        // PWA
        'service-worker': ['warn', { minScore: 1 }],
        'installable-manifest': ['warn', { minScore: 1 }],
        'splash-screen': ['warn', { minScore: 1 }],
        'themed-omnibox': ['warn', { minScore: 1 }],
        'content-width': ['error', { minScore: 1 }],
        'viewport': ['error', { minScore: 1 }]
      }
    },
    
    upload: {
      // GitHub integration
      target: 'temporary-public-storage',
      githubAppToken: process.env.LHCI_GITHUB_APP_TOKEN,
      githubToken: process.env.GITHUB_TOKEN,
      githubApiHost: 'api.github.com',
      githubStatusContextSuffix: '',
      
      // Custom server (if using LHCI server)
      serverBaseUrl: process.env.LHCI_SERVER_BASE_URL,
      token: process.env.LHCI_TOKEN,
      
      // File output
      outputDir: './lighthouse-reports',
      reportFilenamePattern: '%%PATHNAME%%-%%DATETIME%%-report.%%EXTENSION%%'
    },
    
    server: {
      // LHCI server configuration (if self-hosting)
      port: 9001,
      storage: {
        storageMethod: 'sql',
        sqlDialect: 'sqlite3',
        sqlDatabasePath: './lhci.db'
      }
    },
    
    wizard: {
      // Configuration wizard settings
      skipGithubStatusCheck: false
    }
  },
  
  // Custom budgets for different page types
  budgets: [
    {
      path: '/',
      resourceSizes: [
        { resourceType: 'document', budget: 50 },
        { resourceType: 'script', budget: 500 },
        { resourceType: 'stylesheet', budget: 100 },
        { resourceType: 'image', budget: 1000 },
        { resourceType: 'font', budget: 200 },
        { resourceType: 'other', budget: 200 },
        { resourceType: 'total', budget: 2000 }
      ],
      resourceCounts: [
        { resourceType: 'total', budget: 50 },
        { resourceType: 'third-party', budget: 10 }
      ],
      timings: [
        { metric: 'first-contentful-paint', budget: 1500 },
        { metric: 'largest-contentful-paint', budget: 2500 },
        { metric: 'speed-index', budget: 3000 },
        { metric: 'interactive', budget: 3000 }
      ]
    },
    {
      path: '/tasks',
      resourceSizes: [
        { resourceType: 'total', budget: 2500 }
      ],
      timings: [
        { metric: 'first-contentful-paint', budget: 1200 },
        { metric: 'largest-contentful-paint', budget: 2000 }
      ]
    },
    {
      path: '/lists',
      resourceSizes: [
        { resourceType: 'total', budget: 2200 }
      ],
      timings: [
        { metric: 'first-contentful-paint', budget: 1300 },
        { metric: 'largest-contentful-paint', budget: 2200 }
      ]
    }
  ]
};

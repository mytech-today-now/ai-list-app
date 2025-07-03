/**
 * @fileoverview Deployment configuration for AI ToDo MCP
 * @author AI ToDo MCP Team
 * @version 1.0.0
 */

module.exports = {
  // Environment configurations
  environments: {
    development: {
      name: 'Development',
      url: 'http://localhost:5173',
      backend: 'http://localhost:3001',
      database: 'sqlite:./data/ai-todo-dev.db',
      
      // Build settings
      buildCommand: 'npm run build',
      startCommand: 'npm run dev',
      
      // Health check
      healthCheck: {
        endpoint: '/api/health',
        timeout: 5000,
        retries: 3,
        interval: 2000
      },
      
      // Environment variables
      env: {
        NODE_ENV: 'development',
        VITE_API_URL: 'http://localhost:3001',
        VITE_ENABLE_PWA: 'false',
        VITE_ENABLE_ANALYTICS: 'false'
      }
    },
    
    staging: {
      name: 'Staging',
      url: process.env.STAGING_URL || 'https://staging.ai-todo-mcp.com',
      backend: process.env.STAGING_BACKEND_URL || 'https://api-staging.ai-todo-mcp.com',
      database: process.env.STAGING_DATABASE_URL,
      
      // Build settings
      buildCommand: 'npm run build:production',
      
      // Deployment strategy
      strategy: 'rolling',
      instances: 2,
      maxUnavailable: 1,
      
      // Health check
      healthCheck: {
        endpoint: '/api/health',
        timeout: 10000,
        retries: 5,
        interval: 5000,
        warmupTime: 30000
      },
      
      // Environment variables
      env: {
        NODE_ENV: 'production',
        VITE_API_URL: process.env.STAGING_BACKEND_URL,
        VITE_ENABLE_PWA: 'true',
        VITE_ENABLE_ANALYTICS: 'false'
      },
      
      // Monitoring
      monitoring: {
        enabled: true,
        alerting: false,
        metrics: ['response_time', 'error_rate', 'throughput']
      }
    },
    
    production: {
      name: 'Production',
      url: process.env.PRODUCTION_URL || 'https://ai-todo-mcp.com',
      backend: process.env.PRODUCTION_BACKEND_URL || 'https://api.ai-todo-mcp.com',
      database: process.env.PRODUCTION_DATABASE_URL,
      
      // Build settings
      buildCommand: 'npm run build:production',
      
      // Deployment strategy
      strategy: 'blue-green',
      instances: 4,
      maxUnavailable: 0,
      
      // Health check
      healthCheck: {
        endpoint: '/api/health',
        timeout: 15000,
        retries: 10,
        interval: 10000,
        warmupTime: 60000
      },
      
      // Environment variables
      env: {
        NODE_ENV: 'production',
        VITE_API_URL: process.env.PRODUCTION_BACKEND_URL,
        VITE_ENABLE_PWA: 'true',
        VITE_ENABLE_ANALYTICS: 'true'
      },
      
      // Monitoring
      monitoring: {
        enabled: true,
        alerting: true,
        metrics: ['response_time', 'error_rate', 'throughput', 'memory_usage', 'cpu_usage']
      },
      
      // Backup
      backup: {
        enabled: true,
        schedule: '0 2 * * *', // Daily at 2 AM
        retention: 30 // days
      }
    }
  },
  
  // Deployment strategies
  strategies: {
    rolling: {
      name: 'Rolling Deployment',
      description: 'Gradually replace instances one by one',
      maxUnavailable: 1,
      maxSurge: 1,
      progressDeadlineSeconds: 600
    },
    
    'blue-green': {
      name: 'Blue-Green Deployment',
      description: 'Deploy to inactive environment, then switch traffic',
      testTrafficPercent: 10,
      switchDelay: 300, // 5 minutes
      rollbackTimeout: 900 // 15 minutes
    },
    
    canary: {
      name: 'Canary Deployment',
      description: 'Deploy to small subset, gradually increase traffic',
      initialTrafficPercent: 5,
      incrementPercent: 10,
      incrementInterval: 300, // 5 minutes
      maxTrafficPercent: 100
    }
  },
  
  // Pre-deployment checks
  preDeploymentChecks: {
    required: [
      'build-success',
      'tests-passed',
      'security-scan',
      'performance-budget'
    ],
    
    optional: [
      'visual-regression',
      'accessibility-audit',
      'lighthouse-score'
    ],
    
    thresholds: {
      testCoverage: 85,
      performanceScore: 90,
      accessibilityScore: 95,
      securityScore: 90
    }
  },
  
  // Post-deployment tasks
  postDeploymentTasks: {
    required: [
      'health-check',
      'smoke-tests',
      'metrics-validation'
    ],
    
    optional: [
      'performance-monitoring',
      'error-tracking',
      'user-analytics'
    ],
    
    notifications: {
      slack: {
        enabled: true,
        webhook: process.env.SLACK_WEBHOOK_URL,
        channel: '#deployments'
      },
      
      email: {
        enabled: false,
        recipients: process.env.DEPLOYMENT_EMAIL_RECIPIENTS?.split(',') || []
      }
    }
  },
  
  // Rollback configuration
  rollback: {
    automatic: {
      enabled: true,
      triggers: [
        'health-check-failure',
        'error-rate-threshold',
        'response-time-threshold'
      ],
      thresholds: {
        errorRate: 5, // percent
        responseTime: 5000, // milliseconds
        healthCheckFailures: 3
      }
    },
    
    manual: {
      enabled: true,
      confirmationRequired: true,
      maxRollbackTime: 1800 // 30 minutes
    }
  },
  
  // Infrastructure configuration
  infrastructure: {
    // Container settings
    containers: {
      frontend: {
        image: 'ai-todo-mcp/frontend',
        port: 3000,
        resources: {
          requests: {
            memory: '256Mi',
            cpu: '100m'
          },
          limits: {
            memory: '512Mi',
            cpu: '500m'
          }
        }
      },
      
      backend: {
        image: 'ai-todo-mcp/backend',
        port: 3001,
        resources: {
          requests: {
            memory: '512Mi',
            cpu: '200m'
          },
          limits: {
            memory: '1Gi',
            cpu: '1000m'
          }
        }
      }
    },
    
    // Load balancer
    loadBalancer: {
      enabled: true,
      algorithm: 'round-robin',
      healthCheck: {
        path: '/health',
        interval: 30,
        timeout: 5,
        healthyThreshold: 2,
        unhealthyThreshold: 3
      }
    },
    
    // Auto-scaling
    autoScaling: {
      enabled: true,
      minReplicas: 2,
      maxReplicas: 10,
      targetCPUUtilization: 70,
      targetMemoryUtilization: 80
    }
  },
  
  // Security configuration
  security: {
    // SSL/TLS
    ssl: {
      enabled: true,
      certificateProvider: 'letsencrypt',
      forceHttps: true
    },
    
    // Security headers
    headers: {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    },
    
    // Content Security Policy
    csp: {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
      'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      'font-src': ["'self'", 'https://fonts.gstatic.com'],
      'img-src': ["'self'", 'data:', 'https:'],
      'connect-src': ["'self'", 'https://api.openai.com']
    }
  },
  
  // Monitoring and observability
  monitoring: {
    // Metrics
    metrics: {
      enabled: true,
      provider: 'prometheus',
      scrapeInterval: '15s',
      retention: '30d'
    },
    
    // Logging
    logging: {
      enabled: true,
      level: 'info',
      format: 'json',
      aggregation: 'elasticsearch'
    },
    
    // Tracing
    tracing: {
      enabled: true,
      provider: 'jaeger',
      samplingRate: 0.1
    },
    
    // Alerting
    alerting: {
      enabled: true,
      rules: [
        {
          name: 'HighErrorRate',
          condition: 'error_rate > 5',
          duration: '5m',
          severity: 'critical'
        },
        {
          name: 'HighResponseTime',
          condition: 'response_time_p95 > 2000',
          duration: '10m',
          severity: 'warning'
        },
        {
          name: 'LowAvailability',
          condition: 'availability < 99',
          duration: '5m',
          severity: 'critical'
        }
      ]
    }
  }
};

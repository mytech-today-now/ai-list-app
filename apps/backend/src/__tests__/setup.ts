import { jest } from '@jest/globals'
import dotenv from 'dotenv'
import { performance } from 'perf_hooks'

// Load test environment variables
dotenv.config({ path: '.env.test' })

// Set test environment
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = 'sqlite::memory:'
process.env.JWT_SECRET = 'test-jwt-secret'
process.env.OPENAI_API_KEY = 'test-openai-key'
process.env.PORT = '3001'
process.env.CORS_ORIGIN = 'http://localhost:5173'
process.env.LOG_LEVEL = 'error' // Reduce log noise in tests

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}

// Mock timers
jest.useFakeTimers()

// Global test timeout
jest.setTimeout(10000)

// Mock external services
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{
            message: {
              content: 'Mock AI response'
            }
          }]
        })
      }
    }
  }))
}))

// Mock database connection for tests
jest.mock('../db/connection', () => ({
  dbManager: {
    getDb: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue([]),
      get: jest.fn().mockResolvedValue(null),
      all: jest.fn().mockResolvedValue([]),
      run: jest.fn().mockResolvedValue({ changes: 1, lastInsertRowid: 1 })
    })
  },
  gracefulShutdown: jest.fn()
}))

// Performance tracking
global.performance = performance

// Setup and teardown hooks
beforeEach(() => {
  jest.clearAllMocks()
  // Reset performance marks
  performance.clearMarks?.()
  performance.clearMeasures?.()
})

afterEach(() => {
  jest.clearAllTimers()
  // Clean up any open handles
  jest.clearAllMocks()
})

afterAll(async () => {
  jest.useRealTimers()
  // Ensure all async operations complete
  await new Promise(resolve => setTimeout(resolve, 100))
})

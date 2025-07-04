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

// Create a comprehensive mock database instance
const createMockDb = () => ({
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
  run: jest.fn().mockResolvedValue({ changes: 1, lastInsertRowid: 1 }),
  returning: jest.fn().mockReturnThis(),
  leftJoin: jest.fn().mockReturnThis(),
  innerJoin: jest.fn().mockReturnThis(),
  rightJoin: jest.fn().mockReturnThis(),
  groupBy: jest.fn().mockReturnThis(),
  having: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  offset: jest.fn().mockReturnThis(),
  transaction: jest.fn().mockImplementation((fn) => fn(createMockDb())),
  $with: jest.fn().mockReturnThis(),
  with: jest.fn().mockReturnThis()
})

// Mock database connection for tests
jest.mock('../db/connection', () => {
  const mockDb = createMockDb()

  return {
    dbManager: {
      getDb: jest.fn().mockReturnValue(mockDb),
      connect: jest.fn().mockResolvedValue(mockDb),
      disconnect: jest.fn().mockResolvedValue(undefined),
      isConnected: jest.fn().mockReturnValue(true)
    },
    getDb: jest.fn().mockResolvedValue(mockDb),
    gracefulShutdown: jest.fn().mockResolvedValue(undefined),
    withDbTransaction: jest.fn().mockImplementation((fn) => fn(mockDb)),
    getDatabaseConfig: jest.fn().mockReturnValue({
      url: 'sqlite::memory:',
      maxConnections: 10,
      idleTimeout: 30000,
      connectionTimeout: 5000,
      ssl: false
    })
  }
})

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

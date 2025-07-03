import { jest } from '@jest/globals'
import request from 'supertest'
import { Express } from 'express'
import { performance } from 'perf_hooks'

// Mock data generators
export const mockUser = {
  id: '1',
  email: 'test@example.com',
  name: 'Test User',
  passwordHash: '$2b$10$test.hash.value',
  createdAt: new Date(),
  updatedAt: new Date(),
}

export const mockTask = {
  id: '1',
  title: 'Test Task',
  description: 'Test Description',
  completed: false,
  priority: 'medium' as const,
  dueDate: null,
  listId: '1',
  userId: '1',
  createdAt: new Date(),
  updatedAt: new Date(),
}

export const mockList = {
  id: '1',
  name: 'Test List',
  description: 'Test List Description',
  color: '#3B82F6',
  userId: '1',
  createdAt: new Date(),
  updatedAt: new Date(),
}

export const mockAgent = {
  id: '1',
  name: 'Test Agent',
  description: 'Test AI Agent',
  systemPrompt: 'You are a helpful assistant',
  model: 'gpt-3.5-turbo',
  userId: '1',
  createdAt: new Date(),
  updatedAt: new Date(),
}

// Database testing utilities
export const createTestDatabase = () => {
  const mockDb = {
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
    transaction: jest.fn().mockImplementation((fn) => fn(mockDb)),
  }
  
  return mockDb
}

// API testing utilities
export const createTestRequest = (app: Express) => {
  return {
    get: (url: string) => request(app).get(url),
    post: (url: string) => request(app).post(url),
    put: (url: string) => request(app).put(url),
    patch: (url: string) => request(app).patch(url),
    delete: (url: string) => request(app).delete(url),
  }
}

// Authentication testing utilities
export const mockAuthToken = (userId: string = '1') => {
  return `Bearer mock-jwt-token-${userId}`
}

export const mockAuthMiddleware = (userId: string = '1') => {
  return jest.fn((req: any, res: any, next: any) => {
    req.user = { id: userId, email: 'test@example.com' }
    next()
  })
}

// Performance testing utilities
export interface PerformanceMetrics {
  duration: number
  memoryUsage: number
  cpuUsage?: number
}

export const measureApiPerformance = async <T>(
  testFn: () => Promise<T>,
  name: string = 'api-test'
): Promise<{ result: T; metrics: PerformanceMetrics }> => {
  const startMark = `${name}-start`
  const endMark = `${name}-end`
  
  const memoryBefore = process.memoryUsage()
  performance.mark(startMark)
  
  const result = await testFn()
  
  performance.mark(endMark)
  const memoryAfter = process.memoryUsage()
  
  const measure = performance.measure(`${name}-duration`, startMark, endMark)
  
  const metrics: PerformanceMetrics = {
    duration: measure.duration,
    memoryUsage: memoryAfter.heapUsed - memoryBefore.heapUsed,
  }
  
  return { result, metrics }
}

// Load testing utilities
export const simulateLoad = async (
  testFn: () => Promise<any>,
  concurrency: number = 10,
  iterations: number = 100
) => {
  const results: any[] = []
  const errors: any[] = []
  const durations: number[] = []
  
  const batches = Math.ceil(iterations / concurrency)
  
  for (let batch = 0; batch < batches; batch++) {
    const batchPromises = []
    const batchSize = Math.min(concurrency, iterations - batch * concurrency)
    
    for (let i = 0; i < batchSize; i++) {
      batchPromises.push(
        measureApiPerformance(testFn, `load-test-${batch}-${i}`)
          .then(({ result, metrics }) => {
            results.push(result)
            durations.push(metrics.duration)
            return { result, metrics }
          })
          .catch((error) => {
            errors.push(error)
            return { error }
          })
      )
    }
    
    await Promise.all(batchPromises)
  }
  
  return {
    results,
    errors,
    durations,
    stats: {
      totalRequests: iterations,
      successfulRequests: results.length,
      failedRequests: errors.length,
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      p95Duration: durations.sort((a, b) => a - b)[Math.floor(durations.length * 0.95)],
    },
  }
}

// Error simulation utilities
export const simulateError = (type: 'database' | 'network' | 'validation' | 'auth') => {
  switch (type) {
    case 'database':
      return new Error('Database connection failed')
    case 'network':
      return new Error('Network timeout')
    case 'validation':
      return new Error('Validation failed')
    case 'auth':
      return new Error('Authentication failed')
    default:
      return new Error('Unknown error')
  }
}

// Mock external services
export const mockOpenAI = () => ({
  chat: {
    completions: {
      create: jest.fn().mockResolvedValue({
        choices: [{
          message: {
            content: 'Mock AI response',
            role: 'assistant',
          },
        }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
      }),
    },
  },
})

// Rate limiting testing
export const testRateLimit = async (
  testFn: () => Promise<any>,
  limit: number,
  windowMs: number
) => {
  const requests = []
  
  // Send requests up to the limit
  for (let i = 0; i < limit; i++) {
    requests.push(testFn())
  }
  
  const results = await Promise.all(requests)
  
  // Try one more request that should be rate limited
  const rateLimitedRequest = await testFn().catch(err => err)
  
  return {
    successfulRequests: results.filter(r => !r.error).length,
    rateLimitedRequest,
  }
}

// Memory leak detection
export const detectMemoryLeaks = () => {
  const initialMemory = process.memoryUsage()
  
  return {
    check: () => {
      const currentMemory = process.memoryUsage()
      const memoryIncrease = currentMemory.heapUsed - initialMemory.heapUsed
      
      return {
        initialMemory: initialMemory.heapUsed,
        currentMemory: currentMemory.heapUsed,
        memoryIncrease,
        hasLeak: memoryIncrease > 10 * 1024 * 1024, // 10MB threshold
      }
    },
  }
}

// Database transaction testing
export const testTransaction = async (
  db: any,
  operations: Array<() => Promise<any>>
) => {
  const transaction = db.transaction(async (tx: any) => {
    const results = []
    for (const operation of operations) {
      results.push(await operation())
    }
    return results
  })
  
  return transaction
}

// Validation testing utilities
export const testValidation = (
  validator: (data: any) => any,
  validData: any,
  invalidCases: Array<{ data: any; expectedError: string }>
) => {
  // Test valid data
  expect(() => validator(validData)).not.toThrow()
  
  // Test invalid cases
  invalidCases.forEach(({ data, expectedError }) => {
    expect(() => validator(data)).toThrow(expectedError)
  })
}

// Cleanup utilities
export const cleanup = async () => {
  // Clear all timers
  jest.clearAllTimers()
  
  // Clear all mocks
  jest.clearAllMocks()
  
  // Force garbage collection if available
  if (global.gc) {
    global.gc()
  }
  
  // Wait for any pending operations
  await new Promise(resolve => setTimeout(resolve, 10))
}

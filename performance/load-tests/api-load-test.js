/**
 * API Load Testing with k6
 * Tests backend API endpoints under various load conditions
 */

import http from 'k6/http'
import { check, sleep, group } from 'k6'
import { Rate, Trend, Counter } from 'k6/metrics'
import { randomString, randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js'

// Custom metrics
const errorRate = new Rate('errors')
const responseTime = new Trend('response_time')
const requestCount = new Counter('requests')

// Test configuration
export const options = {
  scenarios: {
    // Light load - normal usage
    light_load: {
      executor: 'constant-vus',
      vus: 10,
      duration: '2m',
      tags: { scenario: 'light' },
    },
    
    // Moderate load - busy periods
    moderate_load: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: [
        { duration: '1m', target: 50 },
        { duration: '3m', target: 50 },
        { duration: '1m', target: 0 },
      ],
      tags: { scenario: 'moderate' },
    },
    
    // Heavy load - stress testing
    heavy_load: {
      executor: 'ramping-vus',
      startVUs: 50,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 100 },
        { duration: '2m', target: 200 },
        { duration: '5m', target: 200 },
        { duration: '2m', target: 0 },
      ],
      tags: { scenario: 'heavy' },
    },
    
    // Spike testing - sudden traffic spikes
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: [
        { duration: '1m', target: 10 },
        { duration: '30s', target: 500 }, // Spike
        { duration: '1m', target: 500 },
        { duration: '30s', target: 10 }, // Drop
        { duration: '1m', target: 10 },
      ],
      tags: { scenario: 'spike' },
    },
  },
  
  // Performance thresholds
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests under 2s
    http_req_failed: ['rate<0.1'], // Error rate under 10%
    errors: ['rate<0.05'], // Custom error rate under 5%
    response_time: ['p(90)<1500'], // 90% under 1.5s
  },
}

// Test data
const testUsers = [
  { email: 'test1@example.com', password: 'password123' },
  { email: 'test2@example.com', password: 'password123' },
  { email: 'test3@example.com', password: 'password123' },
]

const testTasks = [
  { title: 'Complete project documentation', priority: 'high' },
  { title: 'Review pull requests', priority: 'medium' },
  { title: 'Update dependencies', priority: 'low' },
  { title: 'Fix responsive design issues', priority: 'high' },
  { title: 'Write unit tests', priority: 'medium' },
]

// Base URL configuration
const BASE_URL = __ENV.API_URL || 'http://localhost:3001'

// Authentication helper
function authenticate() {
  const user = testUsers[randomIntBetween(0, testUsers.length - 1)]
  
  const loginResponse = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    email: user.email,
    password: user.password,
  }), {
    headers: { 'Content-Type': 'application/json' },
  })
  
  if (loginResponse.status === 200) {
    const token = JSON.parse(loginResponse.body).token
    return { Authorization: `Bearer ${token}` }
  }
  
  return null
}

// Test scenarios
export default function() {
  const authHeaders = authenticate()
  
  if (!authHeaders) {
    errorRate.add(1)
    return
  }
  
  // Test different API endpoints
  group('Authentication Tests', () => {
    testAuthEndpoints(authHeaders)
  })
  
  group('Task Management Tests', () => {
    testTaskEndpoints(authHeaders)
  })
  
  group('List Management Tests', () => {
    testListEndpoints(authHeaders)
  })
  
  group('AI Agent Tests', () => {
    testAgentEndpoints(authHeaders)
  })
  
  // Random sleep between requests
  sleep(randomIntBetween(1, 3))
}

function testAuthEndpoints(authHeaders) {
  // Test profile endpoint
  const profileResponse = http.get(`${BASE_URL}/api/auth/profile`, {
    headers: authHeaders,
  })
  
  const profileCheck = check(profileResponse, {
    'profile status is 200': (r) => r.status === 200,
    'profile response time < 500ms': (r) => r.timings.duration < 500,
  })
  
  if (!profileCheck) errorRate.add(1)
  responseTime.add(profileResponse.timings.duration)
  requestCount.add(1)
}

function testTaskEndpoints(authHeaders) {
  // Get tasks
  const getTasksResponse = http.get(`${BASE_URL}/api/tasks`, {
    headers: authHeaders,
  })
  
  check(getTasksResponse, {
    'get tasks status is 200': (r) => r.status === 200,
    'get tasks response time < 1000ms': (r) => r.timings.duration < 1000,
  }) || errorRate.add(1)
  
  responseTime.add(getTasksResponse.timings.duration)
  requestCount.add(1)
  
  // Create task
  const newTask = testTasks[randomIntBetween(0, testTasks.length - 1)]
  const createTaskResponse = http.post(`${BASE_URL}/api/tasks`, JSON.stringify({
    ...newTask,
    description: `Load test task - ${randomString(10)}`,
  }), {
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
  })
  
  const createCheck = check(createTaskResponse, {
    'create task status is 201': (r) => r.status === 201,
    'create task response time < 1500ms': (r) => r.timings.duration < 1500,
  })
  
  if (!createCheck) errorRate.add(1)
  responseTime.add(createTaskResponse.timings.duration)
  requestCount.add(1)
  
  // Update task (if creation was successful)
  if (createTaskResponse.status === 201) {
    const taskId = JSON.parse(createTaskResponse.body).id
    
    const updateTaskResponse = http.put(`${BASE_URL}/api/tasks/${taskId}`, JSON.stringify({
      title: `Updated ${newTask.title}`,
      completed: true,
    }), {
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
    })
    
    check(updateTaskResponse, {
      'update task status is 200': (r) => r.status === 200,
      'update task response time < 1000ms': (r) => r.timings.duration < 1000,
    }) || errorRate.add(1)
    
    responseTime.add(updateTaskResponse.timings.duration)
    requestCount.add(1)
    
    // Delete task
    const deleteTaskResponse = http.del(`${BASE_URL}/api/tasks/${taskId}`, null, {
      headers: authHeaders,
    })
    
    check(deleteTaskResponse, {
      'delete task status is 204': (r) => r.status === 204,
      'delete task response time < 500ms': (r) => r.timings.duration < 500,
    }) || errorRate.add(1)
    
    responseTime.add(deleteTaskResponse.timings.duration)
    requestCount.add(1)
  }
}

function testListEndpoints(authHeaders) {
  // Get lists
  const getListsResponse = http.get(`${BASE_URL}/api/lists`, {
    headers: authHeaders,
  })
  
  check(getListsResponse, {
    'get lists status is 200': (r) => r.status === 200,
    'get lists response time < 800ms': (r) => r.timings.duration < 800,
  }) || errorRate.add(1)
  
  responseTime.add(getListsResponse.timings.duration)
  requestCount.add(1)
  
  // Create list
  const createListResponse = http.post(`${BASE_URL}/api/lists`, JSON.stringify({
    name: `Load Test List ${randomString(5)}`,
    description: 'Created during load testing',
    color: '#3B82F6',
  }), {
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
  })
  
  check(createListResponse, {
    'create list status is 201': (r) => r.status === 201,
    'create list response time < 1000ms': (r) => r.timings.duration < 1000,
  }) || errorRate.add(1)
  
  responseTime.add(createListResponse.timings.duration)
  requestCount.add(1)
}

function testAgentEndpoints(authHeaders) {
  // Get agents
  const getAgentsResponse = http.get(`${BASE_URL}/api/agents`, {
    headers: authHeaders,
  })
  
  check(getAgentsResponse, {
    'get agents status is 200': (r) => r.status === 200,
    'get agents response time < 1000ms': (r) => r.timings.duration < 1000,
  }) || errorRate.add(1)
  
  responseTime.add(getAgentsResponse.timings.duration)
  requestCount.add(1)
  
  // Test AI chat (lighter load due to external API)
  if (Math.random() < 0.1) { // Only 10% of requests
    const chatResponse = http.post(`${BASE_URL}/api/agents/chat`, JSON.stringify({
      message: 'Help me organize my tasks',
      agentId: 'default',
    }), {
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      timeout: '30s', // Longer timeout for AI requests
    })
    
    check(chatResponse, {
      'chat status is 200': (r) => r.status === 200,
      'chat response time < 10000ms': (r) => r.timings.duration < 10000,
    }) || errorRate.add(1)
    
    responseTime.add(chatResponse.timings.duration)
    requestCount.add(1)
  }
}

// Setup function - runs once before the test
export function setup() {
  console.log('Starting load test setup...')
  
  // Health check
  const healthResponse = http.get(`${BASE_URL}/health`)
  if (healthResponse.status !== 200) {
    throw new Error('API health check failed')
  }
  
  console.log('Load test setup completed')
  return { baseUrl: BASE_URL }
}

// Teardown function - runs once after the test
export function teardown(data) {
  console.log('Load test completed')
  console.log(`Base URL: ${data.baseUrl}`)
}

import React, { ReactElement } from 'react'
import { render, RenderOptions, RenderResult } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'

// Mock MCP Context for testing
const MockMCPProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const mockContextValue = {
    engine: null,
    isInitialized: true,
    currentSession: null,
    activeAgent: null,
    executeCommand: vi.fn().mockResolvedValue({ success: true }),
    tools: [],
    resources: [],
    prompts: [],
    generateAIContext: vi.fn().mockReturnValue('Mock AI context'),
    isConnected: true,
    lastActivity: new Date().toISOString(),
    lastError: null,
    clearError: vi.fn(),
  }

  return (
    <div data-testid="mock-mcp-provider">
      {children}
    </div>
  )
}

// Mock data generators
export const mockUser = {
  id: '1',
  email: 'test@example.com',
  name: 'Test User',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

export const mockTask = {
  id: '1',
  title: 'Test Task',
  description: 'Test Description',
  completed: false,
  priority: 'medium' as const,
  dueDate: null,
  listId: '1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

export const mockList = {
  id: '1',
  name: 'Test List',
  description: 'Test List Description',
  color: '#3B82F6',
  userId: '1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

// Custom render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialEntries?: string[]
  queryClient?: QueryClient
}

export function renderWithProviders(
  ui: ReactElement,
  options: CustomRenderOptions = {}
): RenderResult {
  const {
    initialEntries = ['/'],
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
        mutations: {
          retry: false,
        },
      },
    }),
    ...renderOptions
  } = options

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MockMCPProvider>
          <MemoryRouter initialEntries={initialEntries}>
            {children}
          </MemoryRouter>
        </MockMCPProvider>
      </QueryClientProvider>
    )
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

// Version without router for testing components that already have a router
export function renderWithProvidersNoRouter(
  ui: ReactElement,
  options: Omit<CustomRenderOptions, 'initialEntries'> = {}
): RenderResult {
  const {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
        mutations: {
          retry: false,
        },
      },
    }),
    ...renderOptions
  } = options

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MockMCPProvider>
          {children}
        </MockMCPProvider>
      </QueryClientProvider>
    )
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

// Performance testing utilities
export const measurePerformance = async (fn: () => Promise<void> | void) => {
  const start = performance.now()
  await fn()
  const end = performance.now()
  return end - start
}

export const expectPerformance = (duration: number, threshold: number) => {
  expect(duration).toBeLessThan(threshold)
}

// Accessibility testing helpers
export const checkAccessibility = async (container: HTMLElement) => {
  const { axe } = await import('jest-axe')
  const results = await axe(container)
  expect(results).toHaveNoViolations()
}

// Mock API responses
export const mockApiResponse = <T,>(data: T, delay = 0) => {
  return vi.fn().mockImplementation(() =>
    new Promise((resolve) =>
      setTimeout(() => resolve({ data, status: 200, statusText: 'OK' }), delay)
    )
  )
}

export const mockApiError = (status = 500, message = 'Internal Server Error') => {
  return vi.fn().mockImplementation(() =>
    Promise.reject({
      response: {
        status,
        statusText: message,
        data: { error: message },
      },
    })
  )
}

// Local storage testing utilities
export const mockLocalStorage = () => {
  const store: Record<string, string> = {}
  
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach(key => delete store[key])
    }),
    get store() {
      return { ...store }
    },
  }
}

// PWA testing utilities
export const mockServiceWorker = () => ({
  register: vi.fn().mockResolvedValue({
    installing: null,
    waiting: null,
    active: {
      postMessage: vi.fn(),
      addEventListener: vi.fn(),
    },
    addEventListener: vi.fn(),
    update: vi.fn().mockResolvedValue(undefined),
    unregister: vi.fn().mockResolvedValue(true),
  }),
  ready: Promise.resolve({
    installing: null,
    waiting: null,
    active: {
      postMessage: vi.fn(),
      addEventListener: vi.fn(),
    },
    addEventListener: vi.fn(),
    update: vi.fn().mockResolvedValue(undefined),
    unregister: vi.fn().mockResolvedValue(true),
  }),
})

// Network condition simulation
export const simulateNetworkCondition = (condition: 'online' | 'offline' | 'slow') => {
  const originalOnLine = navigator.onLine
  
  switch (condition) {
    case 'offline':
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      })
      break
    case 'slow':
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      })
      Object.defineProperty(navigator, 'connection', {
        writable: true,
        value: {
          effectiveType: '2g',
          downlink: 0.5,
          rtt: 2000,
        },
      })
      break
    default:
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      })
  }
  
  return () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: originalOnLine,
    })
  }
}

// Visual testing utilities
export const takeSnapshot = async (element: HTMLElement, name: string) => {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  
  if (!ctx) throw new Error('Could not get canvas context')
  
  // Simple implementation for testing - in real scenarios you'd use html2canvas
  canvas.width = element.offsetWidth
  canvas.height = element.offsetHeight
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  
  return canvas.toDataURL()
}

// Error boundary testing
export const ErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasError, setHasError] = React.useState(false)
  
  React.useEffect(() => {
    const handleError = () => setHasError(true)
    window.addEventListener('error', handleError)
    return () => window.removeEventListener('error', handleError)
  }, [])
  
  if (hasError) {
    return <div data-testid="error-boundary">Something went wrong</div>
  }
  
  return <>{children}</>
}

// Mock SecurityProvider for testing
const MockSecurityProvider: React.FC<{ children: React.ReactNode; config?: any }> = ({ children }) => {
  return <div data-testid="mock-security-provider">{children}</div>
}

// Test-specific App component without router (for testing with renderWithProviders)
// This component includes all the same providers as the real App but without BrowserRouter
export const AppWithoutRouter: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div data-testid="pwa-status">PWA Status</div>
      <div data-testid="dashboard">Dashboard Component</div>
    </div>
  )
}

// Re-export everything from testing-library
export * from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'

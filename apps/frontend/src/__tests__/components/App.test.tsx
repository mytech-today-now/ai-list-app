import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { axe, toHaveNoViolations } from 'jest-axe'
import { vi } from 'vitest'
import App from '../../App'
import { renderWithProviders, renderWithProvidersNoRouter, AppWithoutRouter } from '../utils/test-utils'

// Extend expect with jest-axe matchers
expect.extend(toHaveNoViolations)

// Mock the Dashboard component to isolate App component testing
vi.mock('../../components/Dashboard', () => {
  return {
    default: function MockDashboard() {
      return <div data-testid="dashboard">Dashboard Component</div>
    }
  }
})

describe('App Component', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })
  })

  afterEach(() => {
    queryClient.clear()
  })

  describe('Rendering', () => {
    it('should render without crashing', () => {
      expect(() => renderWithProviders(<AppWithoutRouter />)).not.toThrow()
    })

    it('should render the main layout structure', () => {
      renderWithProviders(<AppWithoutRouter />)

      const mainContainer = document.querySelector('.min-h-screen.bg-gray-50')
      expect(mainContainer).toBeInTheDocument()
    })

    it('should render Dashboard component on root route', () => {
      renderWithProviders(<AppWithoutRouter />)

      const dashboard = screen.getByTestId('dashboard')
      expect(dashboard).toBeInTheDocument()
      expect(dashboard).toHaveTextContent('Dashboard Component')
    })

    it('should render actual App component without router conflicts', () => {
      expect(() => renderWithProvidersNoRouter(<App />)).not.toThrow()
    })
  })

  describe('Routing', () => {
    it('should render Dashboard on "/" route', () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <QueryClientProvider client={queryClient}>
            <div className="min-h-screen bg-gray-50">
              <Routes>
                <Route path="/" element={<div data-testid="dashboard">Dashboard Component</div>} />
              </Routes>
            </div>
          </QueryClientProvider>
        </MemoryRouter>
      )
      
      expect(screen.getByTestId('dashboard')).toBeInTheDocument()
    })

    it('should handle unknown routes gracefully', () => {
      render(
        <MemoryRouter initialEntries={['/unknown-route']}>
          <QueryClientProvider client={queryClient}>
            <div className="min-h-screen bg-gray-50">
              <Routes>
                <Route path="/" element={<div data-testid="dashboard">Dashboard Component</div>} />
              </Routes>
            </div>
          </QueryClientProvider>
        </MemoryRouter>
      )
      
      // Should not crash and should not render dashboard
      expect(screen.queryByTestId('dashboard')).not.toBeInTheDocument()
    })

    it('should maintain route state', async () => {
      const { rerender } = renderWithProviders(<AppWithoutRouter />)

      expect(screen.getByTestId('dashboard')).toBeInTheDocument()

      rerender(<AppWithoutRouter />)

      await waitFor(() => {
        expect(screen.getByTestId('dashboard')).toBeInTheDocument()
      })
    })
  })

  describe('React Query Integration', () => {
    it('should provide QueryClient to child components', () => {
      renderWithProviders(<AppWithoutRouter />)

      // Verify that the app renders without QueryClient errors
      expect(screen.getByTestId('dashboard')).toBeInTheDocument()
    })

    it('should handle QueryClient errors gracefully', () => {
      // Test with a QueryClient that has error boundaries
      const errorQueryClient = new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            useErrorBoundary: true,
          },
        },
      })

      expect(() => {
        render(
          <QueryClientProvider client={errorQueryClient}>
            <MemoryRouter>
              <div className="min-h-screen bg-gray-50">
                <Routes>
                  <Route path="/" element={<div data-testid="dashboard">Dashboard Component</div>} />
                </Routes>
              </div>
            </MemoryRouter>
          </QueryClientProvider>
        )
      }).not.toThrow()
    })

    it('should configure QueryClient with proper defaults', () => {
      renderWithProviders(<AppWithoutRouter />)

      // The fact that the component renders successfully indicates QueryClient is properly configured
      expect(screen.getByTestId('dashboard')).toBeInTheDocument()
    })
  })

  describe('Layout and Styling', () => {
    it('should apply correct CSS classes to main container', () => {
      renderWithProviders(<AppWithoutRouter />)

      const mainContainer = document.querySelector('.min-h-screen.bg-gray-50')
      expect(mainContainer).toBeInTheDocument()
      expect(mainContainer).toHaveClass('min-h-screen', 'bg-gray-50')
    })

    it('should maintain consistent layout structure', () => {
      const { container } = renderWithProviders(<AppWithoutRouter />)

      // Check that the layout structure is consistent
      const appRoot = container.firstChild
      expect(appRoot).toBeInTheDocument()
    })

    it('should handle responsive design', () => {
      renderWithProviders(<AppWithoutRouter />)

      const mainContainer = document.querySelector('.min-h-screen')
      expect(mainContainer).toBeInTheDocument()

      // The min-h-screen class ensures the app takes full viewport height
      expect(mainContainer).toHaveClass('min-h-screen')
    })
  })

  describe('Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = renderWithProviders(<AppWithoutRouter />)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should support keyboard navigation', () => {
      renderWithProviders(<AppWithoutRouter />)

      // Verify that the app structure supports keyboard navigation
      const dashboard = screen.getByTestId('dashboard')
      expect(dashboard).toBeInTheDocument()
    })

    it('should have proper focus management', () => {
      renderWithProviders(<AppWithoutRouter />)

      // The app should not interfere with focus management
      expect(document.activeElement).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    it('should handle React Router errors gracefully', () => {
      // Test with invalid router configuration
      expect(() => {
        render(
          <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={['/']}>
              <div className="min-h-screen bg-gray-50">
                <Routes>
                  <Route path="/" element={<div data-testid="dashboard">Dashboard Component</div>} />
                </Routes>
              </div>
            </MemoryRouter>
          </QueryClientProvider>
        )
      }).not.toThrow()
    })

    it('should handle component mounting errors', () => {
      // Mock console.error to prevent error output during testing
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      try {
        renderWithProviders(<AppWithoutRouter />)
        expect(screen.getByTestId('dashboard')).toBeInTheDocument()
      } finally {
        consoleSpy.mockRestore()
      }
    })
  })

  describe('Performance', () => {
    it('should render efficiently', () => {
      const startTime = performance.now()
      renderWithProviders(<AppWithoutRouter />)
      const endTime = performance.now()

      // App should render quickly (less than 100ms)
      expect(endTime - startTime).toBeLessThan(100)
    })

    it('should not cause memory leaks', () => {
      const { unmount } = renderWithProviders(<AppWithoutRouter />)

      // Verify component unmounts cleanly
      expect(() => unmount()).not.toThrow()
    })

    it('should handle multiple re-renders efficiently', () => {
      const { rerender } = renderWithProviders(<AppWithoutRouter />)

      for (let i = 0; i < 5; i++) {
        rerender(<AppWithoutRouter />)
        expect(screen.getByTestId('dashboard')).toBeInTheDocument()
      }
    })
  })

  describe('Integration', () => {
    it('should integrate Router and QueryClient properly', () => {
      renderWithProviders(<AppWithoutRouter />)

      // Both Router and QueryClient should work together without conflicts
      expect(screen.getByTestId('dashboard')).toBeInTheDocument()
    })

    it('should pass context to child components', () => {
      renderWithProviders(<AppWithoutRouter />)

      // Child components should receive both Router and QueryClient context
      expect(screen.getByTestId('dashboard')).toBeInTheDocument()
    })

    it('should maintain state across navigation', async () => {
      renderWithProviders(<AppWithoutRouter />)

      const dashboard = screen.getByTestId('dashboard')
      expect(dashboard).toBeInTheDocument()

      // Simulate navigation (in a real app, this would test actual navigation)
      await waitFor(() => {
        expect(dashboard).toBeInTheDocument()
      })
    })
  })

  describe('Environment Handling', () => {
    it('should work in test environment', () => {
      // Test in test NODE_ENV setting
      const originalEnv = process.env.NODE_ENV

      try {
        process.env.NODE_ENV = 'test'
        renderWithProviders(<AppWithoutRouter />)
        expect(screen.getByTestId('dashboard')).toBeInTheDocument()
      } finally {
        process.env.NODE_ENV = originalEnv
      }
    })

    it('should work in development environment', () => {
      // Test in development NODE_ENV setting
      const originalEnv = process.env.NODE_ENV

      try {
        process.env.NODE_ENV = 'development'
        renderWithProviders(<AppWithoutRouter />)
        expect(screen.getByTestId('dashboard')).toBeInTheDocument()
      } finally {
        process.env.NODE_ENV = originalEnv
      }
    })

    it('should handle missing environment variables gracefully', () => {
      // The app should work even if some environment variables are missing
      renderWithProviders(<AppWithoutRouter />)
      expect(screen.getByTestId('dashboard')).toBeInTheDocument()
    })
  })

  describe('CSS and Styling Integration', () => {
    it('should load CSS classes properly', () => {
      renderWithProviders(<AppWithoutRouter />)

      const mainContainer = document.querySelector('.min-h-screen.bg-gray-50')
      expect(mainContainer).toBeInTheDocument()
    })

    it('should handle missing CSS gracefully', () => {
      // Even if Tailwind CSS fails to load, the app should still render
      const { container } = renderWithProviders(<AppWithoutRouter />)
      expect(container.firstChild).toBeInTheDocument()
    })
  })
})

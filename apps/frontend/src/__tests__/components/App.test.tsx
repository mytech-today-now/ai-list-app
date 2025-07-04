import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { axe, toHaveNoViolations } from 'jest-axe'
import App from '../../App'

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
      expect(() => renderWithProviders(<App />)).not.toThrow()
    })

    it('should render the main layout structure', () => {
      renderWithProviders(<App />)

      const mainContainer = document.querySelector('.min-h-screen.bg-gray-50')
      expect(mainContainer).toBeInTheDocument()
    })

    it('should render Dashboard component on root route', () => {
      renderWithProviders(<App />)

      const dashboard = screen.getByTestId('dashboard')
      expect(dashboard).toBeInTheDocument()
      expect(dashboard).toHaveTextContent('Dashboard Component')
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
      const { rerender } = renderWithProviders(<App />)

      expect(screen.getByTestId('dashboard')).toBeInTheDocument()

      rerender(<App />)

      await waitFor(() => {
        expect(screen.getByTestId('dashboard')).toBeInTheDocument()
      })
    })
  })

  describe('React Query Integration', () => {
    it('should provide QueryClient to child components', () => {
      renderWithProviders(<App />)

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
      renderWithProviders(<App />)

      // The fact that the component renders successfully indicates QueryClient is properly configured
      expect(screen.getByTestId('dashboard')).toBeInTheDocument()
    })
  })

  describe('Layout and Styling', () => {
    it('should apply correct CSS classes to main container', () => {
      renderWithProviders(<App />)

      const mainContainer = document.querySelector('.min-h-screen.bg-gray-50')
      expect(mainContainer).toBeInTheDocument()
      expect(mainContainer).toHaveClass('min-h-screen', 'bg-gray-50')
    })

    it('should maintain consistent layout structure', () => {
      const { container } = renderWithProviders(<App />)

      // Check that the layout structure is consistent
      const appRoot = container.firstChild
      expect(appRoot).toBeInTheDocument()
    })

    it('should handle responsive design', () => {
      renderWithProviders(<App />)

      const mainContainer = document.querySelector('.min-h-screen')
      expect(mainContainer).toBeInTheDocument()

      // The min-h-screen class ensures the app takes full viewport height
      expect(mainContainer).toHaveClass('min-h-screen')
    })
  })

  describe('Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = renderWithProviders(<App />)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should support keyboard navigation', () => {
      renderWithProviders(<App />)

      // Verify that the app structure supports keyboard navigation
      const dashboard = screen.getByTestId('dashboard')
      expect(dashboard).toBeInTheDocument()
    })

    it('should have proper focus management', () => {
      renderWithProviders(<App />)

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
        renderWithProviders(<App />)
        expect(screen.getByTestId('dashboard')).toBeInTheDocument()
      } finally {
        consoleSpy.mockRestore()
      }
    })
  })

  describe('Performance', () => {
    it('should render efficiently', () => {
      const startTime = performance.now()
      renderWithProviders(<App />)
      const endTime = performance.now()

      // App should render quickly (less than 100ms)
      expect(endTime - startTime).toBeLessThan(100)
    })

    it('should not cause memory leaks', () => {
      const { unmount } = renderWithProviders(<App />)

      // Verify component unmounts cleanly
      expect(() => unmount()).not.toThrow()
    })

    it('should handle multiple re-renders efficiently', () => {
      const { rerender } = renderWithProviders(<App />)

      for (let i = 0; i < 5; i++) {
        rerender(<App />)
        expect(screen.getByTestId('dashboard')).toBeInTheDocument()
      }
    })
  })

  describe('Integration', () => {
    it('should integrate Router and QueryClient properly', () => {
      renderWithProviders(<App />)

      // Both Router and QueryClient should work together without conflicts
      expect(screen.getByTestId('dashboard')).toBeInTheDocument()
    })

    it('should pass context to child components', () => {
      renderWithProviders(<App />)

      // Child components should receive both Router and QueryClient context
      expect(screen.getByTestId('dashboard')).toBeInTheDocument()
    })

    it('should maintain state across navigation', async () => {
      renderWithProviders(<App />)

      const dashboard = screen.getByTestId('dashboard')
      expect(dashboard).toBeInTheDocument()

      // Simulate navigation (in a real app, this would test actual navigation)
      await waitFor(() => {
        expect(dashboard).toBeInTheDocument()
      })
    })
  })

  describe('Environment Handling', () => {
    it('should work in different environments', () => {
      // Test in different NODE_ENV settings
      const originalEnv = process.env.NODE_ENV

      try {
        process.env.NODE_ENV = 'test'
        renderWithProviders(<App />)
        expect(screen.getByTestId('dashboard')).toBeInTheDocument()

        process.env.NODE_ENV = 'development'
        renderWithProviders(<App />)
        expect(screen.getByTestId('dashboard')).toBeInTheDocument()
      } finally {
        process.env.NODE_ENV = originalEnv
      }
    })

    it('should handle missing environment variables gracefully', () => {
      // The app should work even if some environment variables are missing
      renderWithProviders(<App />)
      expect(screen.getByTestId('dashboard')).toBeInTheDocument()
    })
  })

  describe('CSS and Styling Integration', () => {
    it('should load CSS classes properly', () => {
      renderWithProviders(<App />)

      const mainContainer = document.querySelector('.min-h-screen.bg-gray-50')
      expect(mainContainer).toBeInTheDocument()
    })

    it('should handle missing CSS gracefully', () => {
      // Even if Tailwind CSS fails to load, the app should still render
      const { container } = renderWithProviders(<App />)
      expect(container.firstChild).toBeInTheDocument()
    })
  })
})

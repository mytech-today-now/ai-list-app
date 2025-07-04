/**
 * Sidebar Component Tests - Comprehensive testing for AI-First Sidebar layout component
 * @author AI ToDo MCP Team
 * @version 1.0.0
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { vi } from 'vitest'
import {
  Sidebar,
  CollapsibleSidebar,
  NavigationSidebar,
  FilterSidebar
} from './Sidebar'
import { renderWithProviders } from '../../__tests__/utils/test-utils'

// Extend expect matchers
expect.extend(toHaveNoViolations)

describe('Sidebar Component', () => {
  const mockToggle = vi.fn()
  const mockClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Functionality', () => {
    it('renders with default props', () => {
      render(
        <Sidebar>
          <nav>
            <ul>
              <li><a href="/">Home</a></li>
              <li><a href="/about">About</a></li>
            </ul>
          </nav>
        </Sidebar>
      )
      
      const sidebar = screen.getByTestId('ai-sidebar')
      expect(sidebar).toBeInTheDocument()
      expect(sidebar).toHaveClass('w-64', 'h-full', 'bg-white', 'border-r')
      expect(screen.getByText('Home')).toBeInTheDocument()
      expect(screen.getByText('About')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      render(
        <Sidebar className="custom-sidebar">
          <div>Sidebar content</div>
        </Sidebar>
      )
      
      const sidebar = screen.getByTestId('ai-sidebar')
      expect(sidebar).toHaveClass('custom-sidebar')
    })

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>()
      render(
        <Sidebar ref={ref}>
          <div>Sidebar content</div>
        </Sidebar>
      )
      
      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })
  })

  describe('Width Configuration', () => {
    it('applies width classes correctly', () => {
      const { rerender } = render(
        <Sidebar width="sm">
          <div>Small sidebar</div>
        </Sidebar>
      )
      
      let sidebar = screen.getByTestId('ai-sidebar')
      expect(sidebar).toHaveClass('w-48')

      rerender(
        <Sidebar width="md">
          <div>Medium sidebar</div>
        </Sidebar>
      )
      sidebar = screen.getByTestId('ai-sidebar')
      expect(sidebar).toHaveClass('w-64')

      rerender(
        <Sidebar width="lg">
          <div>Large sidebar</div>
        </Sidebar>
      )
      sidebar = screen.getByTestId('ai-sidebar')
      expect(sidebar).toHaveClass('w-80')

      rerender(
        <Sidebar width="xl">
          <div>Extra large sidebar</div>
        </Sidebar>
      )
      sidebar = screen.getByTestId('ai-sidebar')
      expect(sidebar).toHaveClass('w-96')

      rerender(
        <Sidebar width="auto">
          <div>Auto width sidebar</div>
        </Sidebar>
      )
      sidebar = screen.getByTestId('ai-sidebar')
      expect(sidebar).toHaveClass('w-auto')

      rerender(
        <Sidebar width="full">
          <div>Full width sidebar</div>
        </Sidebar>
      )
      sidebar = screen.getByTestId('ai-sidebar')
      expect(sidebar).toHaveClass('w-full')
    })
  })

  describe('Position Configuration', () => {
    it('applies position classes correctly', () => {
      const { rerender } = render(
        <Sidebar position="left">
          <div>Left sidebar</div>
        </Sidebar>
      )
      
      let sidebar = screen.getByTestId('ai-sidebar')
      expect(sidebar).toHaveClass('left-0')

      rerender(
        <Sidebar position="right">
          <div>Right sidebar</div>
        </Sidebar>
      )
      sidebar = screen.getByTestId('ai-sidebar')
      expect(sidebar).toHaveClass('right-0')
    })
  })

  describe('Variant Styling', () => {
    it('applies variant classes correctly', () => {
      const { rerender } = render(
        <Sidebar variant="default">
          <div>Default sidebar</div>
        </Sidebar>
      )
      
      let sidebar = screen.getByTestId('ai-sidebar')
      expect(sidebar).toHaveClass('bg-white', 'border-neutral-200')

      rerender(
        <Sidebar variant="dark">
          <div>Dark sidebar</div>
        </Sidebar>
      )
      sidebar = screen.getByTestId('ai-sidebar')
      expect(sidebar).toHaveClass('bg-neutral-900', 'border-neutral-700', 'text-white')

      rerender(
        <Sidebar variant="primary">
          <div>Primary sidebar</div>
        </Sidebar>
      )
      sidebar = screen.getByTestId('ai-sidebar')
      expect(sidebar).toHaveClass('bg-primary-50', 'border-primary-200')

      rerender(
        <Sidebar variant="transparent">
          <div>Transparent sidebar</div>
        </Sidebar>
      )
      sidebar = screen.getByTestId('ai-sidebar')
      expect(sidebar).toHaveClass('bg-transparent', 'border-transparent')
    })
  })

  describe('Collapsible Functionality', () => {
    it('shows and hides content based on collapsed state', () => {
      const { rerender } = render(
        <Sidebar collapsible collapsed={false}>
          <div>Expanded content</div>
        </Sidebar>
      )
      
      expect(screen.getByText('Expanded content')).toBeInTheDocument()
      
      rerender(
        <Sidebar collapsible collapsed={true}>
          <div>Collapsed content</div>
        </Sidebar>
      )
      
      const sidebar = screen.getByTestId('ai-sidebar')
      expect(sidebar).toHaveClass('w-16') // Collapsed width
      expect(screen.queryByText('Collapsed content')).not.toBeInTheDocument()
    })

    it('renders toggle button when collapsible', () => {
      render(
        <Sidebar collapsible onToggle={mockToggle}>
          <div>Collapsible sidebar</div>
        </Sidebar>
      )
      
      const toggleButton = screen.getByRole('button', { name: /toggle sidebar/i })
      expect(toggleButton).toBeInTheDocument()
    })

    it('calls onToggle when toggle button is clicked', async () => {
      render(
        <Sidebar collapsible onToggle={mockToggle}>
          <div>Collapsible sidebar</div>
        </Sidebar>
      )
      
      const toggleButton = screen.getByRole('button', { name: /toggle sidebar/i })
      await userEvent.click(toggleButton)
      
      expect(mockToggle).toHaveBeenCalledTimes(1)
    })

    it('handles keyboard navigation for toggle button', async () => {
      render(
        <Sidebar collapsible onToggle={mockToggle}>
          <div>Collapsible sidebar</div>
        </Sidebar>
      )
      
      const toggleButton = screen.getByRole('button', { name: /toggle sidebar/i })
      
      // Test Enter key
      fireEvent.keyDown(toggleButton, { key: 'Enter' })
      expect(mockToggle).toHaveBeenCalledTimes(1)
      
      // Test Space key
      fireEvent.keyDown(toggleButton, { key: ' ' })
      expect(mockToggle).toHaveBeenCalledTimes(2)
    })
  })

  describe('Overlay and Mobile Behavior', () => {
    it('renders overlay when showOverlay is true', () => {
      render(
        <Sidebar showOverlay onClose={mockClose}>
          <div>Overlay sidebar</div>
        </Sidebar>
      )
      
      const overlay = screen.getByTestId('sidebar-overlay')
      expect(overlay).toBeInTheDocument()
      expect(overlay).toHaveClass('fixed', 'inset-0', 'bg-black', 'bg-opacity-50', 'z-40')
    })

    it('calls onClose when overlay is clicked', async () => {
      render(
        <Sidebar showOverlay onClose={mockClose}>
          <div>Overlay sidebar</div>
        </Sidebar>
      )
      
      const overlay = screen.getByTestId('sidebar-overlay')
      await userEvent.click(overlay)
      
      expect(mockClose).toHaveBeenCalledTimes(1)
    })

    it('does not close when clicking sidebar content', async () => {
      render(
        <Sidebar showOverlay onClose={mockClose}>
          <div>Sidebar content</div>
        </Sidebar>
      )
      
      const content = screen.getByText('Sidebar content')
      await userEvent.click(content)
      
      expect(mockClose).not.toHaveBeenCalled()
    })

    it('closes on Escape key when overlay is shown', () => {
      render(
        <Sidebar showOverlay onClose={mockClose}>
          <div>Overlay sidebar</div>
        </Sidebar>
      )
      
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(mockClose).toHaveBeenCalledTimes(1)
    })

    it('applies mobile-specific classes', () => {
      render(
        <Sidebar mobile>
          <div>Mobile sidebar</div>
        </Sidebar>
      )
      
      const sidebar = screen.getByTestId('ai-sidebar')
      expect(sidebar).toHaveClass('fixed', 'top-0', 'h-full', 'z-50')
    })
  })

  describe('Semantic HTML Elements', () => {
    it('renders as aside by default', () => {
      render(
        <Sidebar>
          <div>Default element</div>
        </Sidebar>
      )
      
      const sidebar = screen.getByTestId('ai-sidebar')
      expect(sidebar.tagName).toBe('ASIDE')
    })

    it('renders as specified semantic element', () => {
      const { rerender } = render(
        <Sidebar as="nav">
          <div>Nav sidebar</div>
        </Sidebar>
      )
      
      let sidebar = screen.getByTestId('ai-sidebar')
      expect(sidebar.tagName).toBe('NAV')

      rerender(
        <Sidebar as="section">
          <div>Section sidebar</div>
        </Sidebar>
      )
      sidebar = screen.getByTestId('ai-sidebar')
      expect(sidebar.tagName).toBe('SECTION')

      rerender(
        <Sidebar as="div">
          <div>Div sidebar</div>
        </Sidebar>
      )
      sidebar = screen.getByTestId('ai-sidebar')
      expect(sidebar.tagName).toBe('DIV')
    })
  })

  describe('Accessibility', () => {
    it('has no accessibility violations', async () => {
      const { container } = render(
        <Sidebar 
          semanticMeaning="Main navigation sidebar"
          collapsible
        >
          <nav>
            <ul>
              <li><a href="/">Home</a></li>
              <li><a href="/about">About</a></li>
            </ul>
          </nav>
        </Sidebar>
      )
      
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('provides proper ARIA attributes', () => {
      render(
        <Sidebar 
          semanticMeaning="Navigation sidebar"
          collapsible
          collapsed={false}
        >
          <nav>Navigation content</nav>
        </Sidebar>
      )
      
      const sidebar = screen.getByTestId('ai-sidebar')
      expect(sidebar).toHaveAttribute('role', 'complementary')
      expect(sidebar).toHaveAttribute('aria-label', 'Navigation sidebar')
      expect(sidebar).toHaveAttribute('aria-expanded', 'true')
    })

    it('updates aria-expanded when collapsed state changes', () => {
      const { rerender } = render(
        <Sidebar collapsible collapsed={false}>
          <div>Sidebar content</div>
        </Sidebar>
      )
      
      let sidebar = screen.getByTestId('ai-sidebar')
      expect(sidebar).toHaveAttribute('aria-expanded', 'true')
      
      rerender(
        <Sidebar collapsible collapsed={true}>
          <div>Sidebar content</div>
        </Sidebar>
      )
      
      sidebar = screen.getByTestId('ai-sidebar')
      expect(sidebar).toHaveAttribute('aria-expanded', 'false')
    })

    it('includes AI-first semantic attributes', () => {
      render(
        <Sidebar 
          semanticMeaning="AI-enhanced sidebar"
          capabilities={['navigation', 'collapsible', 'responsive']}
        >
          <div>Sidebar content</div>
        </Sidebar>
      )
      
      const sidebar = screen.getByTestId('ai-sidebar')
      expect(sidebar).toHaveAttribute('data-semantic-type', 'ai-first-sidebar')
      expect(sidebar).toHaveAttribute('data-ai-extensible', 'true')
      
      const capabilitiesText = screen.getByText(/Sidebar capabilities: navigation, collapsible, responsive/)
      expect(capabilitiesText).toBeInTheDocument()
      expect(capabilitiesText).toHaveClass('sr-only')
    })
  })

  describe('Sidebar Variants', () => {
    describe('CollapsibleSidebar', () => {
      it('is collapsible by default', () => {
        render(
          <CollapsibleSidebar onToggle={mockToggle}>
            <nav>Collapsible navigation</nav>
          </CollapsibleSidebar>
        )

        const sidebar = screen.getByTestId('ai-sidebar')
        expect(sidebar).toHaveAttribute('aria-label', 'Collapsible sidebar')

        const toggleButton = screen.getByRole('button', { name: /toggle sidebar/i })
        expect(toggleButton).toBeInTheDocument()
      })
    })

    describe('NavigationSidebar', () => {
      it('renders as nav element by default', () => {
        render(
          <NavigationSidebar>
            <ul>
              <li><a href="/">Home</a></li>
              <li><a href="/about">About</a></li>
            </ul>
          </NavigationSidebar>
        )

        const sidebar = screen.getByTestId('ai-sidebar')
        expect(sidebar.tagName).toBe('NAV')
        expect(sidebar).toHaveAttribute('role', 'navigation')
        expect(sidebar).toHaveAttribute('aria-label', 'Main navigation')

        const capabilitiesText = screen.getByText(/Sidebar capabilities: navigation, links, semantic-structure/)
        expect(capabilitiesText).toBeInTheDocument()
        expect(capabilitiesText).toHaveClass('sr-only')
      })
    })

    describe('FilterSidebar', () => {
      it('renders with filter-specific configuration', () => {
        render(
          <FilterSidebar>
            <div>
              <h3>Filters</h3>
              <label>
                <input type="checkbox" /> Option 1
              </label>
              <label>
                <input type="checkbox" /> Option 2
              </label>
            </div>
          </FilterSidebar>
        )

        const sidebar = screen.getByTestId('ai-sidebar')
        expect(sidebar).toHaveAttribute('aria-label', 'Filter options')

        const capabilitiesText = screen.getByText(/Sidebar capabilities: filtering, form-controls, collapsible/)
        expect(capabilitiesText).toBeInTheDocument()
        expect(capabilitiesText).toHaveClass('sr-only')
      })
    })
  })

  describe('Performance', () => {
    it('renders within performance thresholds', () => {
      const startTime = performance.now()

      render(
        <Sidebar collapsible width="lg" variant="dark">
          <nav>
            <ul>
              {Array.from({ length: 20 }, (_, i) => (
                <li key={i}>
                  <a href={`/item-${i}`}>Navigation Item {i + 1}</a>
                </li>
              ))}
            </ul>
          </nav>
        </Sidebar>
      )

      const endTime = performance.now()
      const renderTime = endTime - startTime

      expect(renderTime).toBeLessThan(100) // Should render quickly even with many items
    })

    it('handles rapid state changes efficiently', () => {
      const { rerender } = render(
        <Sidebar collapsible collapsed={false}>
          <div>Initial content</div>
        </Sidebar>
      )

      const startTime = performance.now()

      // Simulate rapid collapse/expand
      for (let i = 0; i < 10; i++) {
        rerender(
          <Sidebar collapsible collapsed={i % 2 === 0}>
            <div>Content {i}</div>
          </Sidebar>
        )
      }

      const endTime = performance.now()
      const updateTime = endTime - startTime

      expect(updateTime).toBeLessThan(100) // Should handle rapid state changes
    })
  })

  describe('Error Handling', () => {
    it('handles missing children gracefully', () => {
      expect(() => render(<Sidebar />)).not.toThrow()

      const sidebar = screen.getByTestId('ai-sidebar')
      expect(sidebar).toBeInTheDocument()
    })

    it('handles invalid props gracefully', () => {
      expect(() =>
        render(
          <Sidebar
            width={'invalid' as any}
            position={'invalid' as any}
            variant={'invalid' as any}
          >
            <div>Content</div>
          </Sidebar>
        )
      ).not.toThrow()
    })

    it('handles missing event handlers gracefully', () => {
      expect(() =>
        render(
          <Sidebar
            collapsible
            onToggle={undefined}
            showOverlay
            onClose={undefined}
          >
            <div>Content</div>
          </Sidebar>
        )
      ).not.toThrow()
    })
  })

  describe('Integration Tests', () => {
    it('works with complex navigation structures', () => {
      render(
        <NavigationSidebar collapsible>
          <nav>
            <ul>
              <li>
                <a href="/">Home</a>
              </li>
              <li>
                <details>
                  <summary>Products</summary>
                  <ul>
                    <li><a href="/products/web">Web Apps</a></li>
                    <li><a href="/products/mobile">Mobile Apps</a></li>
                  </ul>
                </details>
              </li>
              <li>
                <a href="/about">About</a>
              </li>
            </ul>
          </nav>
        </NavigationSidebar>
      )

      expect(screen.getByText('Home')).toBeInTheDocument()
      expect(screen.getByText('Products')).toBeInTheDocument()
      expect(screen.getByText('Web Apps')).toBeInTheDocument()
      expect(screen.getByText('Mobile Apps')).toBeInTheDocument()
      expect(screen.getByText('About')).toBeInTheDocument()
    })
  })
})

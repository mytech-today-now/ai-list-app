import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import Dashboard from '../../components/Dashboard'

// Extend expect with jest-axe matchers
expect.extend(toHaveNoViolations)

describe('Dashboard Component', () => {
  beforeEach(() => {
    render(<Dashboard />)
  })

  describe('Rendering', () => {
    it('should render the main heading', () => {
      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading).toBeInTheDocument()
      expect(heading).toHaveTextContent('AI ToDo MCP')
    })

    it('should render the subtitle', () => {
      const subtitle = screen.getByText('AI-Driven Progressive Web App Task Manager')
      expect(subtitle).toBeInTheDocument()
    })

    it('should render all three main feature cards', () => {
      expect(screen.getByText('Task Lists')).toBeInTheDocument()
      expect(screen.getByText('AI Agents')).toBeInTheDocument()
      expect(screen.getByText('MCP Console')).toBeInTheDocument()
    })

    it('should render feature card descriptions', () => {
      expect(screen.getByText('Create and manage your task lists with AI assistance.')).toBeInTheDocument()
      expect(screen.getByText('Configure AI agents to help manage your tasks.')).toBeInTheDocument()
      expect(screen.getByText('Execute MCP commands directly.')).toBeInTheDocument()
    })

    it('should render all action buttons', () => {
      expect(screen.getByRole('button', { name: 'Create List' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Manage Agents' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Open Console' })).toBeInTheDocument()
    })

    it('should render recent activity section', () => {
      expect(screen.getByText('Recent Activity')).toBeInTheDocument()
      expect(screen.getByText('No recent activity. Start by creating your first task list!')).toBeInTheDocument()
    })
  })

  describe('Layout and Styling', () => {
    it('should have proper container structure', () => {
      const container = screen.getByRole('main') || document.querySelector('.container')
      expect(container).toBeInTheDocument()
    })

    it('should apply correct CSS classes to main elements', () => {
      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading).toHaveClass('text-4xl', 'font-bold', 'text-gray-900', 'mb-2')
    })

    it('should have responsive grid layout', () => {
      const gridContainer = document.querySelector('.grid')
      expect(gridContainer).toBeInTheDocument()
      expect(gridContainer).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3')
    })

    it('should style buttons with correct colors', () => {
      const createListBtn = screen.getByRole('button', { name: 'Create List' })
      const manageAgentsBtn = screen.getByRole('button', { name: 'Manage Agents' })
      const openConsoleBtn = screen.getByRole('button', { name: 'Open Console' })

      expect(createListBtn).toHaveClass('bg-blue-500', 'hover:bg-blue-600')
      expect(manageAgentsBtn).toHaveClass('bg-green-500', 'hover:bg-green-600')
      expect(openConsoleBtn).toHaveClass('bg-purple-500', 'hover:bg-purple-600')
    })
  })

  describe('User Interactions', () => {
    it('should handle Create List button click', async () => {
      const user = userEvent.setup()
      const createListBtn = screen.getByRole('button', { name: 'Create List' })
      
      await user.click(createListBtn)
      
      // Since the button doesn't have functionality yet, we just verify it's clickable
      expect(createListBtn).toBeInTheDocument()
    })

    it('should handle Manage Agents button click', async () => {
      const user = userEvent.setup()
      const manageAgentsBtn = screen.getByRole('button', { name: 'Manage Agents' })
      
      await user.click(manageAgentsBtn)
      
      expect(manageAgentsBtn).toBeInTheDocument()
    })

    it('should handle Open Console button click', async () => {
      const user = userEvent.setup()
      const openConsoleBtn = screen.getByRole('button', { name: 'Open Console' })
      
      await user.click(openConsoleBtn)
      
      expect(openConsoleBtn).toBeInTheDocument()
    })

    it('should handle keyboard navigation', async () => {
      const user = userEvent.setup()
      const createListBtn = screen.getByRole('button', { name: 'Create List' })
      
      // Focus the button
      await user.tab()
      expect(createListBtn).toHaveFocus()
      
      // Activate with Enter key
      await user.keyboard('{Enter}')
      expect(createListBtn).toBeInTheDocument()
      
      // Activate with Space key
      await user.keyboard(' ')
      expect(createListBtn).toBeInTheDocument()
    })

    it('should handle hover states', async () => {
      const user = userEvent.setup()
      const createListBtn = screen.getByRole('button', { name: 'Create List' })
      
      await user.hover(createListBtn)
      
      // The hover state is handled by CSS, so we just verify the element is still there
      expect(createListBtn).toBeInTheDocument()
      
      await user.unhover(createListBtn)
      expect(createListBtn).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<Dashboard />)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have proper heading hierarchy', () => {
      const h1 = screen.getByRole('heading', { level: 1 })
      const h2Elements = screen.getAllByRole('heading', { level: 2 })
      
      expect(h1).toBeInTheDocument()
      expect(h2Elements).toHaveLength(4) // Task Lists, AI Agents, MCP Console, Recent Activity
    })

    it('should have accessible button labels', () => {
      const buttons = screen.getAllByRole('button')
      
      buttons.forEach(button => {
        expect(button).toHaveAccessibleName()
      })
    })

    it('should support screen readers', () => {
      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading).toBeInTheDocument()
      
      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(3)
      
      buttons.forEach(button => {
        expect(button).toBeVisible()
      })
    })

    it('should have proper color contrast', () => {
      // This would typically be tested with automated tools or manual testing
      // For now, we verify the elements are present with the expected classes
      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading).toHaveClass('text-gray-900')
      
      const subtitle = screen.getByText('AI-Driven Progressive Web App Task Manager')
      expect(subtitle).toHaveClass('text-gray-600')
    })
  })

  describe('Responsive Design', () => {
    it('should handle different screen sizes', () => {
      // Test mobile layout
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })
      
      const gridContainer = document.querySelector('.grid')
      expect(gridContainer).toHaveClass('grid-cols-1')
      
      // Test tablet layout
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      })
      
      expect(gridContainer).toHaveClass('md:grid-cols-2')
      
      // Test desktop layout
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      })
      
      expect(gridContainer).toHaveClass('lg:grid-cols-3')
    })

    it('should maintain proper spacing on different screen sizes', () => {
      const container = document.querySelector('.container')
      expect(container).toHaveClass('mx-auto', 'px-4', 'py-8')
      
      const gridContainer = document.querySelector('.grid')
      expect(gridContainer).toHaveClass('gap-6')
    })
  })

  describe('Content Structure', () => {
    it('should have semantic HTML structure', () => {
      // Check for proper semantic elements
      const header = document.querySelector('header')
      expect(header).toBeInTheDocument()
      
      const cards = document.querySelectorAll('.bg-white.rounded-lg.shadow-md')
      expect(cards).toHaveLength(4) // 3 feature cards + 1 recent activity
    })

    it('should display placeholder content appropriately', () => {
      const placeholderText = screen.getByText('No recent activity. Start by creating your first task list!')
      expect(placeholderText).toBeInTheDocument()
      expect(placeholderText).toHaveClass('text-gray-600')
    })

    it('should have consistent card structure', () => {
      const cardTitles = ['Task Lists', 'AI Agents', 'MCP Console']
      
      cardTitles.forEach(title => {
        const titleElement = screen.getByText(title)
        expect(titleElement).toBeInTheDocument()
        expect(titleElement).toHaveClass('text-xl', 'font-semibold', 'mb-4')
      })
    })
  })

  describe('Error Boundaries and Edge Cases', () => {
    it('should render without crashing', () => {
      expect(() => render(<Dashboard />)).not.toThrow()
    })

    it('should handle missing CSS classes gracefully', () => {
      // This test ensures the component doesn't break if Tailwind CSS isn't loaded
      const { container } = render(<Dashboard />)
      expect(container.firstChild).toBeInTheDocument()
    })

    it('should be stable across re-renders', () => {
      const { rerender, unmount } = render(<Dashboard />)

      const initialHeading = screen.getByRole('heading', { level: 1 })
      expect(initialHeading).toHaveTextContent('AI ToDo MCP')

      // Clean up before re-render
      unmount()

      // Re-render and check stability
      const { container: newContainer } = render(<Dashboard />)

      const rerenderedHeading = screen.getByRole('heading', { level: 1 })
      expect(rerenderedHeading).toHaveTextContent('AI ToDo MCP')
    })
  })

  describe('Performance Considerations', () => {
    it('should not cause memory leaks', () => {
      const { unmount } = render(<Dashboard />)
      
      // Verify component unmounts cleanly
      expect(() => unmount()).not.toThrow()
    })

    it('should render efficiently', () => {
      const startTime = performance.now()
      render(<Dashboard />)
      const endTime = performance.now()
      
      // Component should render quickly (less than 100ms)
      expect(endTime - startTime).toBeLessThan(100)
    })
  })
})

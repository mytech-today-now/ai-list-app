/**
 * Button Component Tests
 * Comprehensive testing for AI-First Button component including accessibility, performance, and AI integration
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { vi } from 'vitest'
import { Button } from '../ui/Button'
import { renderWithProviders } from '../../__tests__/utils/test-utils'

expect.extend(toHaveNoViolations)

describe('Button Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Functionality', () => {
    it('renders with default props', () => {
      render(<Button>Click me</Button>)

      const button = screen.getByRole('button', { name: /click me/i })
      expect(button).toBeInTheDocument()
      expect(button).toHaveClass('bg-primary-600', 'text-white')
    })

    it('handles click events', async () => {
      const handleClick = vi.fn()
      render(<Button onClick={handleClick}>Click me</Button>)
      
      const button = screen.getByRole('button')
      await userEvent.click(button)
      
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('supports all variants', () => {
      const variants = ['primary', 'secondary', 'success', 'warning', 'error', 'info', 'neutral'] as const
      
      variants.forEach(variant => {
        const { unmount } = render(<Button variant={variant}>Test</Button>)
        const button = screen.getByRole('button')
        expect(button).toHaveAttribute('data-variant', variant)
        unmount()
      })
    })

    it('supports all sizes', () => {
      const sizes = ['sm', 'md', 'lg'] as const
      
      sizes.forEach(size => {
        const { unmount } = render(<Button size={size}>Test</Button>)
        const button = screen.getByRole('button')
        expect(button).toHaveClass(size === 'sm' ? 'px-3' : size === 'lg' ? 'px-8' : 'px-6')
        unmount()
      })
    })

    it('renders with icons', () => {
      const TestIcon = () => <span data-testid="test-icon">Icon</span>
      
      render(
        <Button leftIcon={<TestIcon />} rightIcon={<TestIcon />}>
          With Icons
        </Button>
      )
      
      expect(screen.getAllByTestId('test-icon')).toHaveLength(2)
    })

    it('shows loading state', () => {
      render(<Button loading>Loading</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
      expect(button).toHaveAttribute('aria-busy', 'true')
      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    it('handles disabled state', () => {
      render(<Button disabled>Disabled</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
      expect(button).toHaveAttribute('aria-disabled', 'true')
    })
  })

  describe('Accessibility', () => {
    it('meets WCAG accessibility standards', async () => {
      const { container } = render(<Button>Accessible Button</Button>)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('supports keyboard navigation', async () => {
      const handleClick = jest.fn()
      render(<Button onClick={handleClick}>Keyboard Test</Button>)
      
      const button = screen.getByRole('button')
      button.focus()
      
      await userEvent.keyboard('{Enter}')
      expect(handleClick).toHaveBeenCalledTimes(1)
      
      await userEvent.keyboard('{Space}')
      expect(handleClick).toHaveBeenCalledTimes(2)
    })

    it('provides proper ARIA attributes', () => {
      render(
        <Button
          aria-label="Custom label"
          aria-describedby="description"
          semanticMeaning="Primary action button"
        >
          Test
        </Button>
      )
      
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', 'Custom label')
      expect(button).toHaveAttribute('aria-describedby', 'description')
      expect(button).toHaveAttribute('data-semantic-type', 'ai-first-button')
    })

    it('announces loading state to screen readers', () => {
      render(<Button loading>Loading Button</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-busy', 'true')
      expect(button).toHaveAttribute('aria-live', 'polite')
    })

    it('has sufficient color contrast', async () => {
      const { container } = render(<Button variant="primary">Test</Button>)
      const button = container.querySelector('button')!
      
      // Mock color contrast check
      const contrastRatio = await testUtils.checkColorContrast?.(button, 4.5)
      expect(contrastRatio).toBeGreaterThanOrEqual(4.5)
    })
  })

  describe('AI Integration', () => {
    it('supports semantic meaning annotation', () => {
      render(
        <Button semanticMeaning="Primary action button">
          AI Button
        </Button>
      )
      
      const button = screen.getByRole('button')
      testUtils.validateSemanticMeaning(button, 'ai-first-button')
    })

    it('integrates with MCP commands', async () => {
      const handleMCPCommand = jest.fn().mockResolvedValue({ success: true })
      
      render(
        <Button
          mcpType="command"
          onMCPCommand={handleMCPCommand}
          semanticMeaning="MCP action button"
        >
          MCP Button
        </Button>
      )
      
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-mcp-type', 'command')
      
      await userEvent.click(button)
      
      await waitFor(() => {
        expect(handleMCPCommand).toHaveBeenCalledWith('button:click', expect.objectContaining({
          semanticMeaning: 'MCP action button',
          timestamp: expect.any(String),
        }))
      })
    })

    it('supports AI interaction callbacks', async () => {
      const handleAIInteraction = jest.fn()
      
      render(
        <Button
          onAIInteraction={handleAIInteraction}
          aiContext={{ userId: '123', action: 'test' }}
        >
          AI Interactive Button
        </Button>
      )
      
      const button = screen.getByRole('button')
      await userEvent.click(button)
      
      expect(handleAIInteraction).toHaveBeenCalledWith({
        type: 'button:click',
        data: expect.any(Object),
        context: { userId: '123', action: 'test' },
      })
    })

    it('validates component capabilities', () => {
      render(<Button>Capability Test</Button>)
      
      const button = screen.getByRole('button')
      testUtils.validateCapabilities(button, ['click', 'focus', 'keyboard-navigation'])
    })
  })

  describe('Performance', () => {
    it('renders within performance budget', async () => {
      const renderButton = () => render(<Button>Performance Test</Button>)
      
      const { averageTime } = await performanceUtils.benchmarkRender(renderButton, 16)
      expect(averageTime).toBeLessThan(16) // 60fps budget
    })

    it('does not cause memory leaks', async () => {
      const renderButton = () => {
        const { unmount } = render(<Button>Memory Test</Button>)
        unmount()
      }
      
      await performanceUtils.checkMemoryLeaks(renderButton, 50)
    })

    it('optimizes re-renders with React.memo', () => {
      const renderSpy = jest.fn()
      
      const TestButton = React.memo(() => {
        renderSpy()
        return <Button>Memo Test</Button>
      })
      
      const { rerender } = render(<TestButton />)
      expect(renderSpy).toHaveBeenCalledTimes(1)
      
      // Re-render with same props should not trigger render
      rerender(<TestButton />)
      expect(renderSpy).toHaveBeenCalledTimes(1)
    })
  })

  describe('Edge Cases', () => {
    it('handles rapid clicks gracefully', async () => {
      const handleClick = jest.fn()
      render(<Button onClick={handleClick}>Rapid Click Test</Button>)
      
      const button = screen.getByRole('button')
      
      // Simulate rapid clicks
      for (let i = 0; i < 10; i++) {
        await userEvent.click(button)
      }
      
      expect(handleClick).toHaveBeenCalledTimes(10)
    })

    it('handles async click handlers', async () => {
      const asyncHandler = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      )
      
      render(<Button onClick={asyncHandler}>Async Test</Button>)
      
      const button = screen.getByRole('button')
      await userEvent.click(button)
      
      await waitFor(() => {
        expect(asyncHandler).toHaveBeenCalledTimes(1)
      })
    })

    it('prevents double submission when loading', async () => {
      const handleClick = jest.fn()
      const { rerender } = render(
        <Button onClick={handleClick} loading={false}>
          Submit
        </Button>
      )
      
      const button = screen.getByRole('button')
      await userEvent.click(button)
      
      // Set loading state
      rerender(
        <Button onClick={handleClick} loading={true}>
          Submit
        </Button>
      )
      
      // Try to click while loading
      await userEvent.click(button)
      
      // Should only be called once (before loading state)
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('handles missing props gracefully', () => {
      // Test with minimal props
      render(<Button />)
      
      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
      expect(button).not.toBeDisabled()
    })
  })

  describe('Visual Regression', () => {
    it('matches visual snapshot for all variants', async () => {
      const variants = ['primary', 'secondary', 'success', 'warning', 'error'] as const
      
      for (const variant of variants) {
        const { container } = render(<Button variant={variant}>Test</Button>)
        
        // In a real implementation, you'd use visual regression tools
        // await expect(container).toMatchImageSnapshot()
        expect(container.firstChild).toMatchSnapshot(`button-${variant}`)
      }
    })

    it('maintains consistent styling across themes', () => {
      const themes = ['light', 'dark'] as const
      
      themes.forEach(theme => {
        const { container, unmount } = render(
          <Button>Theme Test</Button>,
          { theme }
        )
        
        const button = container.querySelector('button')!
        expect(button).toHaveClass('transition-colors')
        unmount()
      })
    })
  })
})

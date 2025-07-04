/**
 * Card Component Tests - Comprehensive testing for AI-First Card component
 * @author AI ToDo MCP Team
 * @version 1.0.0
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { vi } from 'vitest'
import { Card, MCPResourceCard, MCPCommandCard } from './Card'
import { renderWithProviders } from '../../__tests__/utils/test-utils'

// Extend expect matchers
expect.extend(toHaveNoViolations)

describe('Card Component', () => {
  const mockMCPCommand = vi.fn()
  const mockAIInteraction = vi.fn()
  const mockCardClick = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Functionality', () => {
    it('renders with default props', () => {
      render(<Card>Card content</Card>)
      
      const card = screen.getByTestId('ai-card')
      expect(card).toBeInTheDocument()
      expect(card).toHaveTextContent('Card content')
      expect(card).toHaveClass('rounded-lg', 'border')
    })

    it('renders with custom content', () => {
      render(
        <Card>
          <h2>Card Title</h2>
          <p>Card description</p>
        </Card>
      )
      
      expect(screen.getByText('Card Title')).toBeInTheDocument()
      expect(screen.getByText('Card description')).toBeInTheDocument()
    })

    it('renders with header and footer', () => {
      render(
        <Card 
          header={<h3>Card Header</h3>}
          footer={<button>Action</button>}
        >
          Card body content
        </Card>
      )
      
      expect(screen.getByText('Card Header')).toBeInTheDocument()
      expect(screen.getByText('Card body content')).toBeInTheDocument()
      expect(screen.getByText('Action')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      render(<Card className="custom-class">Content</Card>)
      
      const card = screen.getByTestId('ai-card')
      expect(card).toHaveClass('custom-class')
    })

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>()
      render(<Card ref={ref}>Content</Card>)
      
      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })
  })

  describe('Variants and Styling', () => {
    it('applies variant classes correctly', () => {
      const { rerender } = render(<Card variant="primary">Content</Card>)
      let card = screen.getByTestId('ai-card')
      expect(card).toHaveClass('border-primary-200', 'bg-primary-50')

      rerender(<Card variant="error">Content</Card>)
      card = screen.getByTestId('ai-card')
      expect(card).toHaveClass('border-error-200', 'bg-error-50')

      rerender(<Card variant="success">Content</Card>)
      card = screen.getByTestId('ai-card')
      expect(card).toHaveClass('border-success-200', 'bg-success-50')
    })

    it('applies size classes correctly', () => {
      const { rerender } = render(<Card size="sm">Content</Card>)
      let card = screen.getByTestId('ai-card')
      expect(card).toHaveClass('p-3')

      rerender(<Card size="lg">Content</Card>)
      card = screen.getByTestId('ai-card')
      expect(card).toHaveClass('p-6')
    })

    it('applies elevation classes correctly', () => {
      const { rerender } = render(<Card elevation="none">Content</Card>)
      let card = screen.getByTestId('ai-card')
      expect(card).toHaveClass('shadow-none')

      rerender(<Card elevation="lg">Content</Card>)
      card = screen.getByTestId('ai-card')
      expect(card).toHaveClass('shadow-lg')

      rerender(<Card elevation="xl">Content</Card>)
      card = screen.getByTestId('ai-card')
      expect(card).toHaveClass('shadow-xl')
    })
  })

  describe('Interactive States', () => {
    it('handles interactive card clicks', async () => {
      render(
        <Card 
          interactive 
          onCardClick={mockCardClick}
        >
          Interactive card
        </Card>
      )
      
      const card = screen.getByTestId('ai-card')
      expect(card).toHaveAttribute('role', 'button')
      expect(card).toHaveAttribute('tabIndex', '0')
      
      await userEvent.click(card)
      expect(mockCardClick).toHaveBeenCalledTimes(1)
    })

    it('handles keyboard navigation for interactive cards', async () => {
      render(
        <Card 
          interactive 
          onCardClick={mockCardClick}
        >
          Interactive card
        </Card>
      )
      
      const card = screen.getByTestId('ai-card')
      
      // Test Enter key
      fireEvent.keyDown(card, { key: 'Enter' })
      expect(mockCardClick).toHaveBeenCalledTimes(1)
      
      // Test Space key
      fireEvent.keyDown(card, { key: ' ' })
      expect(mockCardClick).toHaveBeenCalledTimes(2)
    })

    it('shows selected state correctly', () => {
      render(
        <Card 
          interactive 
          selected
        >
          Selected card
        </Card>
      )
      
      const card = screen.getByTestId('ai-card')
      expect(card).toHaveClass('ring-2', 'ring-primary-500')
      expect(card).toHaveAttribute('aria-selected', 'true')
    })

    it('shows loading state correctly', () => {
      render(<Card loading>Loading card</Card>)
      
      const card = screen.getByTestId('ai-card')
      expect(card).toHaveClass('opacity-75', 'cursor-wait')
      
      const loadingSpinner = screen.getByRole('status', { hidden: true })
      expect(loadingSpinner).toBeInTheDocument()
      
      const loadingText = screen.getByText('Loading card content...')
      expect(loadingText).toBeInTheDocument()
      expect(loadingText).toHaveClass('sr-only')
    })

    it('prevents clicks when loading', async () => {
      render(
        <Card 
          interactive 
          loading 
          onCardClick={mockCardClick}
        >
          Loading card
        </Card>
      )
      
      const card = screen.getByTestId('ai-card')
      await userEvent.click(card)
      
      expect(mockCardClick).not.toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('has no accessibility violations', async () => {
      const { container } = render(
        <Card 
          interactive 
          semanticMeaning="Test card for accessibility"
        >
          Accessible card content
        </Card>
      )
      
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('provides proper ARIA attributes', () => {
      render(
        <Card 
          interactive 
          selected 
          semanticMeaning="Interactive test card"
          aria-label="Custom card label"
        >
          Card content
        </Card>
      )
      
      const card = screen.getByTestId('ai-card')
      expect(card).toHaveAttribute('aria-label', 'Custom card label')
      expect(card).toHaveAttribute('aria-selected', 'true')
      expect(card).toHaveAttribute('data-semantic-type', 'ai-first-card')
    })

    it('supports keyboard navigation', async () => {
      render(
        <Card interactive>
          Keyboard accessible card
        </Card>
      )
      
      const card = screen.getByTestId('ai-card')
      
      // Test focus
      card.focus()
      expect(card).toHaveFocus()
      
      // Test tab navigation
      await userEvent.tab()
      expect(card).not.toHaveFocus()
    })

    it('announces loading state to screen readers', () => {
      render(<Card loading>Loading content</Card>)
      
      const card = screen.getByTestId('ai-card')
      expect(card).toHaveAttribute('aria-busy', 'true')
      
      const announcement = screen.getByText('Loading card content...')
      expect(announcement).toHaveClass('sr-only')
    })
  })

  describe('MCP Integration', () => {
    it('triggers MCP commands on interaction', async () => {
      render(
        <Card 
          interactive 
          mcpType="resource"
          onMCPCommand={mockMCPCommand}
          semanticMeaning="MCP test card"
        >
          MCP Card
        </Card>
      )
      
      const card = screen.getByTestId('ai-card')
      expect(card).toHaveAttribute('data-mcp-type', 'resource')
      
      await userEvent.click(card)
      
      expect(mockMCPCommand).toHaveBeenCalledWith('card:click', expect.objectContaining({
        semanticMeaning: 'MCP test card',
        timestamp: expect.any(String)
      }))
    })

    it('integrates with AI interaction patterns', async () => {
      render(
        <Card 
          interactive 
          onAIInteraction={mockAIInteraction}
          aiContext={{ userId: 'test-user' }}
          capabilities={['display', 'click', 'ai-extensible']}
        >
          AI Card
        </Card>
      )
      
      const card = screen.getByTestId('ai-card')
      await userEvent.click(card)
      
      expect(mockAIInteraction).toHaveBeenCalledWith(expect.objectContaining({
        type: 'card:click',
        data: expect.objectContaining({
          context: { userId: 'test-user' }
        }),
        context: expect.objectContaining({
          capabilities: ['display', 'click', 'ai-extensible']
        })
      }))
    })
  })

  describe('Visual Testing', () => {
    it('renders consistently across devices', async () => {
      const cardComponent = (
        <Card variant="primary" size="md" elevation="md">
          <h3>Visual Test Card</h3>
          <p>This card should render consistently across all devices</p>
        </Card>
      )

      await testAcrossDevices(cardComponent, 'card-responsive')
    })

    it('renders consistently across themes', async () => {
      const cardComponent = (
        <Card variant="neutral" interactive>
          <h3>Theme Test Card</h3>
          <p>This card should work in both light and dark themes</p>
        </Card>
      )

      await testAcrossThemes(cardComponent, 'card-themes')
    })

    it('renders all component states correctly', async () => {
      const cardStates = [
        { props: { variant: 'primary' }, name: 'primary' },
        { props: { variant: 'error' }, name: 'error' },
        { props: { interactive: true, selected: true }, name: 'selected' },
        { props: { loading: true }, name: 'loading' },
        { props: { elevation: 'xl' }, name: 'elevated' }
      ]

      await testComponentStates(Card, cardStates, 'card-states', 'Card content')
    })
  })

  describe('Performance', () => {
    it('renders within performance thresholds', async () => {
      const startTime = performance.now()

      render(
        <Card variant="primary" size="lg" interactive>
          <h2>Performance Test Card</h2>
          <p>This card should render quickly</p>
          <button type="button">Action Button</button>
        </Card>
      )

      const endTime = performance.now()
      const renderTime = endTime - startTime

      expect(renderTime).toBeLessThan(100) // Should render in under 100ms
    })

    it('handles rapid state changes efficiently', async () => {
      const { rerender } = render(<Card>Initial content</Card>)

      const startTime = performance.now()

      // Simulate rapid state changes
      for (let i = 0; i < 10; i++) {
        rerender(<Card selected={i % 2 === 0}>Content {i}</Card>)
      }

      const endTime = performance.now()
      const updateTime = endTime - startTime

      expect(updateTime).toBeLessThan(50) // Should handle updates quickly
    })
  })

  describe('Error Handling', () => {
    it('handles missing children gracefully', () => {
      expect(() => render(<Card />)).not.toThrow()

      const card = screen.getByTestId('ai-card')
      expect(card).toBeInTheDocument()
    })

    it('handles invalid props gracefully', () => {
      expect(() =>
        render(
          <Card
            variant={'invalid' as any}
            size={'invalid' as any}
            elevation={'invalid' as any}
          >
            Content
          </Card>
        )
      ).not.toThrow()
    })

    it('handles MCP command errors gracefully', async () => {
      const errorMCPCommand = jest.fn().mockImplementation(() => {
        throw new Error('MCP command failed')
      })

      // Should not crash the component
      expect(() =>
        render(
          <Card
            interactive
            mcpType="command"
            onMCPCommand={errorMCPCommand}
          >
            Error test card
          </Card>
        )
      ).not.toThrow()

      const card = screen.getByTestId('ai-card')
      await userEvent.click(card)

      expect(errorMCPCommand).toHaveBeenCalled()
    })
  })

  describe('MCP Variants', () => {
    describe('MCPResourceCard', () => {
      it('renders with correct MCP resource configuration', () => {
        render(
          <MCPResourceCard>
            Resource card content
          </MCPResourceCard>
        )

        const card = screen.getByTestId('ai-card')
        expect(card).toHaveAttribute('data-mcp-type', 'resource')
        expect(card).toHaveAttribute('aria-label', 'MCP Resource Display')
      })

      it('includes resource-specific capabilities', () => {
        render(<MCPResourceCard>Resource content</MCPResourceCard>)

        const capabilitiesText = screen.getByText(/display, mcp-resource, focus/)
        expect(capabilitiesText).toBeInTheDocument()
        expect(capabilitiesText).toHaveClass('sr-only')
      })
    })

    describe('MCPCommandCard', () => {
      it('renders with correct MCP command configuration', () => {
        render(
          <MCPCommandCard onCardClick={mockCardClick}>
            Command card content
          </MCPCommandCard>
        )

        const card = screen.getByTestId('ai-card')
        expect(card).toHaveAttribute('data-mcp-type', 'command')
        expect(card).toHaveAttribute('aria-label', 'MCP Command Interface')
        expect(card).toHaveAttribute('role', 'button')
      })

      it('is interactive by default', async () => {
        render(
          <MCPCommandCard onCardClick={mockCardClick}>
            Interactive command card
          </MCPCommandCard>
        )

        const card = screen.getByTestId('ai-card')
        await userEvent.click(card)

        expect(mockCardClick).toHaveBeenCalledTimes(1)
      })

      it('includes command-specific capabilities', () => {
        render(<MCPCommandCard>Command content</MCPCommandCard>)

        const capabilitiesText = screen.getByText(/display, mcp-command, click, keyboard-navigation/)
        expect(capabilitiesText).toBeInTheDocument()
        expect(capabilitiesText).toHaveClass('sr-only')
      })
    })
  })

  describe('Integration Tests', () => {
    it('works with form elements', () => {
      render(
        <Card>
          <form>
            <label htmlFor="test-input">Test Input</label>
            <input id="test-input" type="text" />
            <button type="submit">Submit</button>
          </form>
        </Card>
      )

      expect(screen.getByLabelText('Test Input')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument()
    })

    it('works with nested interactive elements', async () => {
      const buttonClick = jest.fn()

      render(
        <Card interactive onCardClick={mockCardClick}>
          <h3>Card with button</h3>
          <button type="button" onClick={buttonClick}>Nested Button</button>
        </Card>
      )

      // Clicking the button should not trigger card click
      const button = screen.getByRole('button', { name: 'Nested Button' })
      await userEvent.click(button)

      expect(buttonClick).toHaveBeenCalledTimes(1)
      expect(mockCardClick).not.toHaveBeenCalled()
    })

    it('maintains focus management with nested focusable elements', async () => {
      render(
        <Card interactive>
          <input type="text" placeholder="Test input" />
          <button type="button">Test button</button>
        </Card>
      )

      const input = screen.getByPlaceholderText('Test input')
      const button = screen.getByRole('button', { name: 'Test button' })

      // Test tab order
      await userEvent.tab()
      expect(input).toHaveFocus()

      await userEvent.tab()
      expect(button).toHaveFocus()
    })
  })
})

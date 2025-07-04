/**
 * Input Component Tests - Comprehensive testing for AI-First Input component
 * @author AI ToDo MCP Team
 * @version 1.0.0
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { vi } from 'vitest'
import { Input } from './Input'
import { renderWithProviders } from '../../__tests__/utils/test-utils'

// Extend expect matchers
expect.extend(toHaveNoViolations)

describe('Input Component', () => {
  const mockChange = vi.fn()
  const mockFocus = vi.fn()
  const mockBlur = vi.fn()
  const mockMCPCommand = vi.fn()
  const mockAIInteraction = vi.fn()
  const mockSuggestionSelect = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Functionality', () => {
    it('renders with default props', () => {
      render(<Input />)
      
      const input = screen.getByRole('textbox')
      expect(input).toBeInTheDocument()
      expect(input).toHaveAttribute('type', 'text')
    })

    it('renders with label', () => {
      render(<Input label="Test Label" />)
      
      const label = screen.getByText('Test Label')
      const input = screen.getByRole('textbox')
      
      expect(label).toBeInTheDocument()
      expect(input).toHaveAccessibleName('Test Label')
    })

    it('renders with helper text', () => {
      render(<Input helperText="This is helper text" />)
      
      const helperText = screen.getByText('This is helper text')
      expect(helperText).toBeInTheDocument()
      expect(helperText).toHaveClass('text-neutral-600')
    })

    it('handles value changes', async () => {
      render(<Input onChange={mockChange} />)
      
      const input = screen.getByRole('textbox')
      await userEvent.type(input, 'test value')
      
      expect(mockChange).toHaveBeenCalledTimes(10) // 'test value' = 10 characters
      expect(input).toHaveValue('test value')
    })

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLInputElement>()
      render(<Input ref={ref} />)
      
      expect(ref.current).toBeInstanceOf(HTMLInputElement)
    })

    it('applies custom className', () => {
      render(<Input className="custom-input" />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('custom-input')
    })
  })

  describe('Input Types and Variants', () => {
    it('renders different input types correctly', () => {
      const { rerender } = render(<Input type="email" />)
      let input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('type', 'email')

      rerender(<Input type="password" />)
      input = screen.getByDisplayValue('') // password inputs don't have textbox role
      expect(input).toHaveAttribute('type', 'password')

      rerender(<Input type="number" />)
      input = screen.getByRole('spinbutton')
      expect(input).toHaveAttribute('type', 'number')
    })

    it('applies variant styles correctly', () => {
      const { rerender } = render(<Input variant="primary" />)
      let input = screen.getByRole('textbox')
      expect(input).toHaveClass('border-primary-300', 'focus:border-primary-500')

      rerender(<Input variant="error" />)
      input = screen.getByRole('textbox')
      expect(input).toHaveClass('border-error-300', 'focus:border-error-500')
    })

    it('applies size classes correctly', () => {
      const { rerender } = render(<Input size="sm" />)
      let input = screen.getByRole('textbox')
      expect(input).toHaveClass('px-3', 'py-2', 'text-sm')

      rerender(<Input size="lg" />)
      input = screen.getByRole('textbox')
      expect(input).toHaveClass('px-4', 'py-3', 'text-lg')
    })

    it('applies full width correctly', () => {
      render(<Input fullWidth />)
      
      const wrapper = screen.getByRole('textbox').closest('div')
      expect(wrapper).toHaveClass('w-full')
    })
  })

  describe('Validation States', () => {
    it('shows error state correctly', () => {
      render(<Input error="This field is required" />)
      
      const input = screen.getByRole('textbox')
      const errorMessage = screen.getByText('This field is required')
      
      expect(input).toHaveClass('border-error-300')
      expect(input).toHaveAttribute('aria-invalid', 'true')
      expect(errorMessage).toBeInTheDocument()
      expect(errorMessage).toHaveClass('text-error-600')
    })

    it('shows success state correctly', () => {
      render(<Input success="Input is valid" />)
      
      const input = screen.getByRole('textbox')
      const successMessage = screen.getByText('Input is valid')
      
      expect(input).toHaveClass('border-success-300')
      expect(successMessage).toBeInTheDocument()
      expect(successMessage).toHaveClass('text-success-600')
    })

    it('prioritizes error over success', () => {
      render(
        <Input 
          error="Error message" 
          success="Success message" 
        />
      )
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('border-error-300')
      expect(screen.getByText('Error message')).toBeInTheDocument()
      expect(screen.queryByText('Success message')).not.toBeInTheDocument()
    })

    it('handles disabled state correctly', () => {
      render(<Input disabled />)
      
      const input = screen.getByRole('textbox')
      expect(input).toBeDisabled()
      expect(input).toHaveClass('opacity-50', 'cursor-not-allowed')
    })
  })

  describe('Icons and Visual Elements', () => {
    it('renders left icon correctly', () => {
      const LeftIcon = () => <span data-testid="left-icon">🔍</span>
      render(<Input leftIcon={<LeftIcon />} />)
      
      const icon = screen.getByTestId('left-icon')
      expect(icon).toBeInTheDocument()
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('pl-10') // Space for left icon
    })

    it('renders right icon correctly', () => {
      const RightIcon = () => <span data-testid="right-icon">✓</span>
      render(<Input rightIcon={<RightIcon />} />)
      
      const icon = screen.getByTestId('right-icon')
      expect(icon).toBeInTheDocument()
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('pr-10') // Space for right icon
    })

    it('handles both left and right icons', () => {
      const LeftIcon = () => <span data-testid="left-icon">🔍</span>
      const RightIcon = () => <span data-testid="right-icon">✓</span>
      
      render(
        <Input 
          leftIcon={<LeftIcon />} 
          rightIcon={<RightIcon />} 
        />
      )
      
      expect(screen.getByTestId('left-icon')).toBeInTheDocument()
      expect(screen.getByTestId('right-icon')).toBeInTheDocument()
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('pl-10', 'pr-10')
    })
  })

  describe('Password Toggle', () => {
    it('shows password toggle for password inputs', () => {
      render(<Input type="password" showPasswordToggle />)
      
      const toggleButton = screen.getByRole('button', { name: /show password/i })
      expect(toggleButton).toBeInTheDocument()
    })

    it('toggles password visibility', async () => {
      render(<Input type="password" showPasswordToggle />)
      
      const input = screen.getByDisplayValue('')
      const toggleButton = screen.getByRole('button', { name: /show password/i })
      
      expect(input).toHaveAttribute('type', 'password')
      
      await userEvent.click(toggleButton)
      expect(input).toHaveAttribute('type', 'text')
      
      await userEvent.click(toggleButton)
      expect(input).toHaveAttribute('type', 'password')
    })

    it('updates toggle button label correctly', async () => {
      render(<Input type="password" showPasswordToggle />)
      
      const toggleButton = screen.getByRole('button', { name: /show password/i })
      
      await userEvent.click(toggleButton)
      expect(screen.getByRole('button', { name: /hide password/i })).toBeInTheDocument()
    })

    it('does not show toggle for non-password inputs', () => {
      render(<Input type="text" showPasswordToggle />)
      
      const toggleButton = screen.queryByRole('button', { name: /password/i })
      expect(toggleButton).not.toBeInTheDocument()
    })
  })

  describe('Focus and Blur Handling', () => {
    it('handles focus events correctly', async () => {
      render(<Input onFocus={mockFocus} />)
      
      const input = screen.getByRole('textbox')
      await userEvent.click(input)
      
      expect(mockFocus).toHaveBeenCalledTimes(1)
      expect(input).toHaveFocus()
    })

    it('handles blur events correctly', async () => {
      render(<Input onBlur={mockBlur} />)
      
      const input = screen.getByRole('textbox')
      await userEvent.click(input)
      await userEvent.tab()
      
      expect(mockBlur).toHaveBeenCalledTimes(1)
      expect(input).not.toHaveFocus()
    })

    it('shows focus styles correctly', async () => {
      render(<Input />)
      
      const input = screen.getByRole('textbox')
      await userEvent.click(input)
      
      // Focus styles are applied via CSS classes
      expect(input).toHaveClass('focus:ring-2')
    })
  })

  describe('AI Suggestions', () => {
    it('renders AI suggestions when provided', () => {
      const suggestions = ['suggestion 1', 'suggestion 2', 'suggestion 3']

      render(
        <Input
          aiSuggestions={suggestions}
          onSuggestionSelect={mockSuggestionSelect}
        />
      )

      const input = screen.getByRole('textbox')
      fireEvent.focus(input)

      suggestions.forEach(suggestion => {
        expect(screen.getByText(suggestion)).toBeInTheDocument()
      })
    })

    it('handles suggestion selection', async () => {
      const suggestions = ['suggestion 1', 'suggestion 2']

      render(
        <Input
          aiSuggestions={suggestions}
          onSuggestionSelect={mockSuggestionSelect}
        />
      )

      const input = screen.getByRole('textbox')
      fireEvent.focus(input)

      const suggestion = screen.getByText('suggestion 1')
      await userEvent.click(suggestion)

      expect(mockSuggestionSelect).toHaveBeenCalledWith('suggestion 1')
    })

    it('navigates suggestions with keyboard', async () => {
      const suggestions = ['suggestion 1', 'suggestion 2', 'suggestion 3']

      render(
        <Input
          aiSuggestions={suggestions}
          onSuggestionSelect={mockSuggestionSelect}
        />
      )

      const input = screen.getByRole('textbox')
      fireEvent.focus(input)

      // Navigate down
      fireEvent.keyDown(input, { key: 'ArrowDown' })
      fireEvent.keyDown(input, { key: 'ArrowDown' })

      // Select with Enter
      fireEvent.keyDown(input, { key: 'Enter' })

      expect(mockSuggestionSelect).toHaveBeenCalledWith('suggestion 2')
    })

    it('hides suggestions when input loses focus', async () => {
      const suggestions = ['suggestion 1', 'suggestion 2']

      render(
        <Input
          aiSuggestions={suggestions}
          onSuggestionSelect={mockSuggestionSelect}
        />
      )

      const input = screen.getByRole('textbox')
      fireEvent.focus(input)

      expect(screen.getByText('suggestion 1')).toBeInTheDocument()

      fireEvent.blur(input)

      await waitFor(() => {
        expect(screen.queryByText('suggestion 1')).not.toBeInTheDocument()
      })
    })
  })

  describe('MCP Integration', () => {
    it('validates MCP prompts correctly', async () => {
      const mockValidator = jest.fn().mockReturnValue(true)

      render(
        <Input
          mcpPromptEnabled
          mcpPromptValidator={mockValidator}
          onMCPCommand={mockMCPCommand}
        />
      )

      const input = screen.getByRole('textbox')
      await userEvent.type(input, 'test prompt')

      expect(mockValidator).toHaveBeenCalledWith('test prompt')
      expect(mockMCPCommand).toHaveBeenCalledWith('prompt:validate', expect.objectContaining({
        value: 'test prompt',
        valid: true
      }))
    })

    it('handles invalid MCP prompts', async () => {
      const mockValidator = jest.fn().mockReturnValue(false)

      render(
        <Input
          mcpPromptEnabled
          mcpPromptValidator={mockValidator}
          onMCPCommand={mockMCPCommand}
        />
      )

      const input = screen.getByRole('textbox')
      await userEvent.type(input, 'invalid')

      expect(mockValidator).toHaveBeenCalledWith('invalid')
      // Should not trigger MCP command for invalid prompts
      expect(mockMCPCommand).not.toHaveBeenCalled()
    })

    it('integrates with AI interaction patterns', async () => {
      render(
        <Input
          onAIInteraction={mockAIInteraction}
          aiContext={{ userId: 'test-user' }}
          mcpPromptEnabled
        />
      )

      const input = screen.getByRole('textbox')
      await userEvent.type(input, 'test')

      expect(mockAIInteraction).toHaveBeenCalledWith(expect.objectContaining({
        type: 'input:change',
        data: expect.objectContaining({
          value: 'test',
          mcpPromptEnabled: true
        }),
        context: { userId: 'test-user' }
      }))
    })
  })

  describe('Accessibility', () => {
    it('has no accessibility violations', async () => {
      const { container } = render(
        <Input
          label="Accessible input"
          helperText="This input is accessible"
        />
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('provides proper ARIA attributes', () => {
      render(
        <Input
          label="Test input"
          error="Error message"
          aria-describedby="custom-description"
        />
      )

      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('aria-invalid', 'true')
      expect(input).toHaveAttribute('aria-describedby')
    })

    it('supports screen reader announcements', () => {
      render(
        <Input
          label="Screen reader test"
          helperText="Helper text for screen readers"
          error="Error for screen readers"
        />
      )

      const input = screen.getByRole('textbox')
      const helperText = screen.getByText('Helper text for screen readers')
      const errorText = screen.getByText('Error for screen readers')

      expect(input).toHaveAccessibleName('Screen reader test')
      expect(helperText).toBeInTheDocument()
      expect(errorText).toBeInTheDocument()
    })
  })

  describe('Visual Testing', () => {
    it('renders consistently across devices', async () => {
      const inputComponent = (
        <Input
          label="Responsive Input"
          placeholder="Enter text here"
          helperText="This input should work on all devices"
        />
      )

      await testAcrossDevices(inputComponent, 'input-responsive')
    })

    it('renders consistently across themes', async () => {
      const inputComponent = (
        <Input
          label="Theme Test Input"
          variant="primary"
          leftIcon={<span>🔍</span>}
        />
      )

      await testAcrossThemes(inputComponent, 'input-themes')
    })

    it('renders all component states correctly', async () => {
      const inputStates = [
        { props: { variant: 'primary' }, name: 'primary' },
        { props: { variant: 'error', error: 'Error state' }, name: 'error' },
        { props: { variant: 'success', success: 'Success state' }, name: 'success' },
        { props: { disabled: true }, name: 'disabled' },
        { props: { size: 'lg' }, name: 'large' }
      ]

      await testComponentStates(Input, inputStates, 'input-states')
    })
  })

  describe('Performance', () => {
    it('renders within performance thresholds', async () => {
      const startTime = performance.now()

      render(
        <Input
          label="Performance Test"
          placeholder="Type here..."
          helperText="Performance test input"
        />
      )

      const endTime = performance.now()
      const renderTime = endTime - startTime

      expect(renderTime).toBeLessThan(50) // Should render quickly
    })

    it('handles rapid typing efficiently', async () => {
      render(<Input onChange={mockChange} />)

      const input = screen.getByRole('textbox')
      const startTime = performance.now()

      // Simulate rapid typing
      await userEvent.type(input, 'rapid typing test', { delay: 1 })

      const endTime = performance.now()
      const typingTime = endTime - startTime

      expect(typingTime).toBeLessThan(1000) // Should handle rapid typing
      expect(mockChange).toHaveBeenCalledTimes(18) // Length of 'rapid typing test'
    })
  })

  describe('Error Handling', () => {
    it('handles missing props gracefully', () => {
      expect(() => render(<Input />)).not.toThrow()
    })

    it('handles invalid suggestion data gracefully', () => {
      expect(() =>
        render(
          <Input
            aiSuggestions={null as any}
            onSuggestionSelect={mockSuggestionSelect}
          />
        )
      ).not.toThrow()
    })

    it('handles MCP validation errors gracefully', async () => {
      const errorValidator = jest.fn().mockImplementation(() => {
        throw new Error('Validation failed')
      })

      expect(() =>
        render(
          <Input
            mcpPromptEnabled
            mcpPromptValidator={errorValidator}
          />
        )
      ).not.toThrow()

      const input = screen.getByRole('textbox')
      await userEvent.type(input, 'test')

      expect(errorValidator).toHaveBeenCalled()
    })
  })

  describe('Integration Tests', () => {
    it('works within forms', async () => {
      const mockSubmit = jest.fn()

      render(
        <form onSubmit={mockSubmit}>
          <Input
            label="Form Input"
            name="testInput"
            required
          />
          <button type="submit">Submit</button>
        </form>
      )

      const input = screen.getByRole('textbox')
      const submitButton = screen.getByRole('button', { name: 'Submit' })

      await userEvent.type(input, 'test value')
      await userEvent.click(submitButton)

      expect(input).toHaveValue('test value')
    })

    it('maintains state across re-renders', () => {
      const { rerender } = render(<Input defaultValue="initial" />)

      const input = screen.getByRole('textbox')
      expect(input).toHaveValue('initial')

      rerender(<Input defaultValue="initial" placeholder="Updated placeholder" />)
      expect(input).toHaveValue('initial')
    })
  })
})

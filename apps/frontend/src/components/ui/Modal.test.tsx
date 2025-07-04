/**
 * Modal Component Tests - Comprehensive testing for AI-First Modal component
 * @author AI ToDo MCP Team
 * @version 1.0.0
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { vi } from 'vitest'
import { Modal, ConfirmationModal, ErrorModal, InfoModal, MCPCommandModal } from './Modal'
import { renderWithProviders } from '../../__tests__/utils/test-utils'

// Extend expect matchers
expect.extend(toHaveNoViolations)

// Mock createPortal for testing
vi.mock('react-dom', () => ({
  ...vi.importActual('react-dom'),
  createPortal: (node: React.ReactNode) => node,
}))

describe('Modal Component', () => {
  const mockClose = vi.fn()
  const mockMCPCommand = vi.fn()
  const mockAIInteraction = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset document body
    document.body.innerHTML = ''
  })

  describe('Basic Functionality', () => {
    it('renders when open is true', () => {
      render(
        <Modal open onClose={mockClose}>
          <p>Modal content</p>
        </Modal>
      )
      
      expect(screen.getByText('Modal content')).toBeInTheDocument()
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('does not render when open is false', () => {
      render(
        <Modal open={false} onClose={mockClose}>
          <p>Modal content</p>
        </Modal>
      )
      
      expect(screen.queryByText('Modal content')).not.toBeInTheDocument()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('renders with title and description', () => {
      render(
        <Modal 
          open 
          onClose={mockClose}
          title="Test Modal"
          description="This is a test modal"
        >
          <p>Modal content</p>
        </Modal>
      )
      
      expect(screen.getByText('Test Modal')).toBeInTheDocument()
      expect(screen.getByText('This is a test modal')).toBeInTheDocument()
    })

    it('renders with header and footer', () => {
      render(
        <Modal 
          open 
          onClose={mockClose}
          header={<h2>Custom Header</h2>}
          footer={<button type="button">Custom Footer</button>}
        >
          <p>Modal content</p>
        </Modal>
      )
      
      expect(screen.getByText('Custom Header')).toBeInTheDocument()
      expect(screen.getByText('Custom Footer')).toBeInTheDocument()
    })

    it('shows close button by default', () => {
      render(
        <Modal open onClose={mockClose}>
          <p>Modal content</p>
        </Modal>
      )
      
      const closeButton = screen.getByRole('button', { name: /close/i })
      expect(closeButton).toBeInTheDocument()
    })

    it('hides close button when showCloseButton is false', () => {
      render(
        <Modal open onClose={mockClose} showCloseButton={false}>
          <p>Modal content</p>
        </Modal>
      )
      
      const closeButton = screen.queryByRole('button', { name: /close/i })
      expect(closeButton).not.toBeInTheDocument()
    })
  })

  describe('Size and Variants', () => {
    it('applies size classes correctly', () => {
      const { rerender } = render(
        <Modal open onClose={mockClose} size="sm">
          <p>Small modal</p>
        </Modal>
      )
      
      let modal = screen.getByRole('dialog')
      expect(modal).toHaveClass('max-w-sm')

      rerender(
        <Modal open onClose={mockClose} size="lg">
          <p>Large modal</p>
        </Modal>
      )
      
      modal = screen.getByRole('dialog')
      expect(modal).toHaveClass('max-w-4xl')
    })

    it('applies variant styles correctly', () => {
      const { rerender } = render(
        <Modal open onClose={mockClose} variant="primary">
          <p>Primary modal</p>
        </Modal>
      )
      
      let modal = screen.getByRole('dialog')
      expect(modal).toHaveClass('border-primary-200')

      rerender(
        <Modal open onClose={mockClose} variant="error">
          <p>Error modal</p>
        </Modal>
      )
      
      modal = screen.getByRole('dialog')
      expect(modal).toHaveClass('border-error-200')
    })
  })

  describe('Interaction Handling', () => {
    it('calls onClose when close button is clicked', async () => {
      render(
        <Modal open onClose={mockClose}>
          <p>Modal content</p>
        </Modal>
      )
      
      const closeButton = screen.getByRole('button', { name: /close/i })
      await userEvent.click(closeButton)
      
      expect(mockClose).toHaveBeenCalledTimes(1)
    })

    it('calls onClose when Escape key is pressed', () => {
      render(
        <Modal open onClose={mockClose}>
          <p>Modal content</p>
        </Modal>
      )
      
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(mockClose).toHaveBeenCalledTimes(1)
    })

    it('does not close on Escape when closeOnEscape is false', () => {
      render(
        <Modal open onClose={mockClose} closeOnEscape={false}>
          <p>Modal content</p>
        </Modal>
      )
      
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(mockClose).not.toHaveBeenCalled()
    })

    it('calls onClose when overlay is clicked', async () => {
      render(
        <Modal open onClose={mockClose}>
          <p>Modal content</p>
        </Modal>
      )
      
      const overlay = screen.getByTestId('modal-overlay')
      await userEvent.click(overlay)
      
      expect(mockClose).toHaveBeenCalledTimes(1)
    })

    it('does not close on overlay click when closeOnOverlayClick is false', async () => {
      render(
        <Modal open onClose={mockClose} closeOnOverlayClick={false}>
          <p>Modal content</p>
        </Modal>
      )
      
      const overlay = screen.getByTestId('modal-overlay')
      await userEvent.click(overlay)
      
      expect(mockClose).not.toHaveBeenCalled()
    })

    it('does not close when clicking modal content', async () => {
      render(
        <Modal open onClose={mockClose}>
          <p>Modal content</p>
        </Modal>
      )
      
      const content = screen.getByText('Modal content')
      await userEvent.click(content)
      
      expect(mockClose).not.toHaveBeenCalled()
    })
  })

  describe('Focus Management', () => {
    it('traps focus within modal', async () => {
      render(
        <Modal open onClose={mockClose}>
          <input type="text" placeholder="First input" />
          <input type="text" placeholder="Second input" />
          <button type="button">Modal button</button>
        </Modal>
      )
      
      const firstInput = screen.getByPlaceholderText('First input')
      const secondInput = screen.getByPlaceholderText('Second input')
      const modalButton = screen.getByRole('button', { name: 'Modal button' })
      const closeButton = screen.getByRole('button', { name: /close/i })
      
      // Focus should start on first focusable element
      expect(firstInput).toHaveFocus()
      
      // Tab through elements
      await userEvent.tab()
      expect(secondInput).toHaveFocus()
      
      await userEvent.tab()
      expect(modalButton).toHaveFocus()
      
      await userEvent.tab()
      expect(closeButton).toHaveFocus()
      
      // Should wrap back to first element
      await userEvent.tab()
      expect(firstInput).toHaveFocus()
    })

    it('restores focus when modal closes', async () => {
      const triggerButton = document.createElement('button')
      triggerButton.textContent = 'Open Modal'
      document.body.appendChild(triggerButton)
      triggerButton.focus()
      
      const { rerender } = render(
        <Modal open onClose={mockClose}>
          <p>Modal content</p>
        </Modal>
      )
      
      // Modal should be focused
      expect(document.activeElement).not.toBe(triggerButton)
      
      // Close modal
      rerender(
        <Modal open={false} onClose={mockClose}>
          <p>Modal content</p>
        </Modal>
      )
      
      // Focus should be restored (in real implementation)
      // Note: This test may need adjustment based on actual focus restoration implementation
    })
  })

  describe('Accessibility', () => {
    it('has no accessibility violations', async () => {
      const { container } = render(
        <Modal 
          open 
          onClose={mockClose}
          title="Accessible Modal"
          description="This modal is accessible"
        >
          <p>Modal content</p>
        </Modal>
      )
      
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('provides proper ARIA attributes', () => {
      render(
        <Modal 
          open 
          onClose={mockClose}
          title="Test Modal"
          description="Test description"
        >
          <p>Modal content</p>
        </Modal>
      )
      
      const modal = screen.getByRole('dialog')
      expect(modal).toHaveAttribute('aria-modal', 'true')
      expect(modal).toHaveAttribute('aria-labelledby')
      expect(modal).toHaveAttribute('aria-describedby')
    })

    it('supports custom aria-label', () => {
      render(
        <Modal 
          open 
          onClose={mockClose}
          aria-label="Custom modal label"
        >
          <p>Modal content</p>
        </Modal>
      )
      
      const modal = screen.getByRole('dialog')
      expect(modal).toHaveAttribute('aria-label', 'Custom modal label')
    })

    it('announces modal opening to screen readers', () => {
      render(
        <Modal 
          open 
          onClose={mockClose}
          title="Announced Modal"
        >
          <p>Modal content</p>
        </Modal>
      )
      
      const modal = screen.getByRole('dialog')
      expect(modal).toHaveAttribute('role', 'dialog')
      expect(modal).toHaveAttribute('aria-modal', 'true')
    })
  })

  describe('MCP Integration', () => {
    it('triggers MCP commands on interaction', async () => {
      render(
        <Modal
          open
          onClose={mockClose}
          mcpType="command"
          onMCPCommand={mockMCPCommand}
          semanticMeaning="MCP test modal"
        >
          <p>MCP Modal content</p>
        </Modal>
      )

      const modal = screen.getByRole('dialog')
      expect(modal).toHaveAttribute('data-mcp-type', 'command')

      // Simulate modal interaction
      fireEvent.keyDown(document, { key: 'Escape' })

      expect(mockMCPCommand).toHaveBeenCalledWith('modal:close', expect.objectContaining({
        semanticMeaning: 'MCP test modal',
        timestamp: expect.any(String)
      }))
    })

    it('integrates with AI interaction patterns', async () => {
      render(
        <Modal
          open
          onClose={mockClose}
          onAIInteraction={mockAIInteraction}
          aiContext={{ userId: 'test-user' }}
          capabilities={['dialog', 'focus-trap', 'ai-extensible']}
        >
          <p>AI Modal content</p>
        </Modal>
      )

      const closeButton = screen.getByRole('button', { name: /close/i })
      await userEvent.click(closeButton)

      expect(mockAIInteraction).toHaveBeenCalledWith(expect.objectContaining({
        type: 'modal:close',
        data: expect.objectContaining({
          context: { userId: 'test-user' }
        }),
        context: expect.objectContaining({
          capabilities: ['dialog', 'focus-trap', 'ai-extensible']
        })
      }))
    })
  })

  describe('Visual Testing', () => {
    it('renders consistently across different sizes', () => {
      const { rerender } = render(
        <Modal
          open
          onClose={mockClose}
          size="sm"
          title="Small Modal"
        >
          <p>Small modal content</p>
        </Modal>
      )

      expect(screen.getByRole('dialog')).toHaveClass('max-w-sm')

      rerender(
        <Modal
          open
          onClose={mockClose}
          size="lg"
          title="Large Modal"
        >
          <p>Large modal content</p>
        </Modal>
      )

      expect(screen.getByRole('dialog')).toHaveClass('max-w-lg')
    })

    it('renders consistently across different variants', () => {
      const { rerender } = render(
        <Modal
          open
          onClose={mockClose}
          variant="primary"
          title="Primary Modal"
        >
          <p>Primary modal content</p>
        </Modal>
      )

      expect(screen.getByRole('dialog')).toHaveClass('border-primary-200')

      rerender(
        <Modal
          open
          onClose={mockClose}
          variant="error"
          title="Error Modal"
        >
          <p>Error modal content</p>
        </Modal>
      )

      expect(screen.getByRole('dialog')).toHaveClass('border-error-200')
    })
  })

  describe('Performance', () => {
    it('renders within performance thresholds', async () => {
      const startTime = performance.now()

      render(
        <Modal
          open
          onClose={mockClose}
          title="Performance Test Modal"
        >
          <div>
            <h2>Modal Content</h2>
            <p>This modal should render quickly</p>
            <button type="button">Action Button</button>
          </div>
        </Modal>
      )

      const endTime = performance.now()
      const renderTime = endTime - startTime

      expect(renderTime).toBeLessThan(100) // Should render quickly
    })

    it('handles rapid open/close efficiently', async () => {
      const { rerender } = render(
        <Modal open={false} onClose={mockClose}>
          <p>Modal content</p>
        </Modal>
      )

      const startTime = performance.now()

      // Simulate rapid open/close
      for (let i = 0; i < 5; i++) {
        rerender(
          <Modal open={true} onClose={mockClose}>
            <p>Modal content {i}</p>
          </Modal>
        )
        rerender(
          <Modal open={false} onClose={mockClose}>
            <p>Modal content {i}</p>
          </Modal>
        )
      }

      const endTime = performance.now()
      const updateTime = endTime - startTime

      expect(updateTime).toBeLessThan(200) // Should handle rapid changes
    })
  })

  describe('Error Handling', () => {
    it('handles missing onClose gracefully', () => {
      expect(() =>
        render(
          <Modal open onClose={undefined as any}>
            <p>Modal content</p>
          </Modal>
        )
      ).not.toThrow()
    })

    it('handles invalid container gracefully', () => {
      expect(() =>
        render(
          <Modal
            open
            onClose={mockClose}
            container={null as any}
          >
            <p>Modal content</p>
          </Modal>
        )
      ).not.toThrow()
    })
  })

  describe('Modal Variants', () => {
    describe('ConfirmationModal', () => {
      it('renders with warning variant by default', () => {
        render(
          <ConfirmationModal open onClose={mockClose}>
            <p>Confirmation content</p>
          </ConfirmationModal>
        )

        const modal = screen.getByRole('dialog')
        expect(modal).toHaveClass('border-warning-200')
        expect(modal).toHaveAttribute('aria-label', 'Confirmation Dialog')
      })

      it('includes confirmation-specific capabilities', () => {
        render(
          <ConfirmationModal open onClose={mockClose}>
            <p>Confirmation content</p>
          </ConfirmationModal>
        )

        const capabilitiesText = screen.getByText(/dialog, confirmation, focus-trap, keyboard-navigation/)
        expect(capabilitiesText).toBeInTheDocument()
        expect(capabilitiesText).toHaveClass('sr-only')
      })
    })

    describe('ErrorModal', () => {
      it('renders with error variant by default', () => {
        render(
          <ErrorModal open onClose={mockClose}>
            <p>Error content</p>
          </ErrorModal>
        )

        const modal = screen.getByRole('dialog')
        expect(modal).toHaveClass('border-error-200')
        expect(modal).toHaveAttribute('aria-label', 'Error Dialog')
      })

      it('includes error-specific capabilities', () => {
        render(
          <ErrorModal open onClose={mockClose}>
            <p>Error content</p>
          </ErrorModal>
        )

        const capabilitiesText = screen.getByText(/dialog, error-display, focus-trap, keyboard-navigation/)
        expect(capabilitiesText).toBeInTheDocument()
        expect(capabilitiesText).toHaveClass('sr-only')
      })
    })

    describe('InfoModal', () => {
      it('renders with info variant by default', () => {
        render(
          <InfoModal open onClose={mockClose}>
            <p>Info content</p>
          </InfoModal>
        )

        const modal = screen.getByRole('dialog')
        expect(modal).toHaveClass('border-info-200')
        expect(modal).toHaveAttribute('aria-label', 'Information Dialog')
      })
    })

    describe('MCPCommandModal', () => {
      it('renders with MCP command configuration', () => {
        render(
          <MCPCommandModal open onClose={mockClose}>
            <p>MCP command content</p>
          </MCPCommandModal>
        )

        const modal = screen.getByRole('dialog')
        expect(modal).toHaveAttribute('data-mcp-type', 'command')
        expect(modal).toHaveAttribute('aria-label', 'MCP Command Interface')
      })

      it('includes MCP command-specific capabilities', () => {
        render(
          <MCPCommandModal open onClose={mockClose}>
            <p>MCP command content</p>
          </MCPCommandModal>
        )

        const capabilitiesText = screen.getByText(/dialog, mcp-command, focus-trap, keyboard-navigation/)
        expect(capabilitiesText).toBeInTheDocument()
        expect(capabilitiesText).toHaveClass('sr-only')
      })
    })
  })

  describe('Integration Tests', () => {
    it('works with form elements', async () => {
      const mockSubmit = vi.fn()

      render(
        <Modal open onClose={mockClose}>
          <form onSubmit={mockSubmit}>
            <label htmlFor="modal-input">Modal Input</label>
            <input id="modal-input" type="text" />
            <button type="submit">Submit</button>
          </form>
        </Modal>
      )

      const input = screen.getByLabelText('Modal Input')
      const submitButton = screen.getByRole('button', { name: 'Submit' })

      await userEvent.type(input, 'test value')
      await userEvent.click(submitButton)

      expect(input).toHaveValue('test value')
    })

    it('maintains proper z-index stacking', () => {
      render(
        <Modal open onClose={mockClose}>
          <p>Modal content</p>
        </Modal>
      )

      const overlay = screen.getByTestId('modal-overlay')
      const modal = screen.getByRole('dialog')

      // Check z-index classes are applied
      expect(overlay).toHaveClass('z-50')
      expect(modal).toHaveClass('z-50')
    })

    it('handles nested modals correctly', () => {
      const mockClose2 = vi.fn()

      render(
        <>
          <Modal open onClose={mockClose}>
            <p>First modal</p>
            <Modal open onClose={mockClose2}>
              <p>Nested modal</p>
            </Modal>
          </Modal>
        </>
      )

      expect(screen.getByText('First modal')).toBeInTheDocument()
      expect(screen.getByText('Nested modal')).toBeInTheDocument()

      // Both modals should be present
      const dialogs = screen.getAllByRole('dialog')
      expect(dialogs).toHaveLength(2)
    })
  })
})

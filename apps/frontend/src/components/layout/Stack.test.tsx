/**
 * Stack Component Tests - Comprehensive testing for AI-First Stack layout component
 * @author AI ToDo MCP Team
 * @version 1.0.0
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import {
  Stack,
  HStack,
  VStack,
  ResponsiveStack,
  DividedStack
} from './Stack'
import { renderWithProviders } from '../../__tests__/utils/test-utils'

// Extend expect matchers
expect.extend(toHaveNoViolations)

describe('Stack Component', () => {
  describe('Basic Functionality', () => {
    it('renders with default props', () => {
      render(
        <Stack>
          <div>Stack item 1</div>
          <div>Stack item 2</div>
          <div>Stack item 3</div>
        </Stack>
      )
      
      const stack = screen.getByTestId('ai-stack')
      expect(stack).toBeInTheDocument()
      expect(stack).toHaveClass('flex', 'flex-col', 'gap-4')
      expect(screen.getByText('Stack item 1')).toBeInTheDocument()
      expect(screen.getByText('Stack item 2')).toBeInTheDocument()
      expect(screen.getByText('Stack item 3')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      render(
        <Stack className="custom-stack">
          <div>Stack content</div>
        </Stack>
      )
      
      const stack = screen.getByTestId('ai-stack')
      expect(stack).toHaveClass('custom-stack')
    })

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>()
      render(
        <Stack ref={ref}>
          <div>Stack content</div>
        </Stack>
      )
      
      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })
  })

  describe('Direction Configuration', () => {
    it('applies direction classes correctly', () => {
      const { rerender } = render(
        <Stack direction="column">
          <div>Column stack</div>
        </Stack>
      )
      
      let stack = screen.getByTestId('ai-stack')
      expect(stack).toHaveClass('flex-col')

      rerender(
        <Stack direction="row">
          <div>Row stack</div>
        </Stack>
      )
      stack = screen.getByTestId('ai-stack')
      expect(stack).toHaveClass('flex-row')

      rerender(
        <Stack direction="column-reverse">
          <div>Column reverse stack</div>
        </Stack>
      )
      stack = screen.getByTestId('ai-stack')
      expect(stack).toHaveClass('flex-col-reverse')

      rerender(
        <Stack direction="row-reverse">
          <div>Row reverse stack</div>
        </Stack>
      )
      stack = screen.getByTestId('ai-stack')
      expect(stack).toHaveClass('flex-row-reverse')
    })
  })

  describe('Spacing Configuration', () => {
    it('applies spacing classes correctly', () => {
      const { rerender } = render(
        <Stack spacing="none">
          <div>No spacing</div>
        </Stack>
      )
      
      let stack = screen.getByTestId('ai-stack')
      expect(stack).toHaveClass('gap-0')

      rerender(
        <Stack spacing="xs">
          <div>Extra small spacing</div>
        </Stack>
      )
      stack = screen.getByTestId('ai-stack')
      expect(stack).toHaveClass('gap-1')

      rerender(
        <Stack spacing="sm">
          <div>Small spacing</div>
        </Stack>
      )
      stack = screen.getByTestId('ai-stack')
      expect(stack).toHaveClass('gap-2')

      rerender(
        <Stack spacing="md">
          <div>Medium spacing</div>
        </Stack>
      )
      stack = screen.getByTestId('ai-stack')
      expect(stack).toHaveClass('gap-4')

      rerender(
        <Stack spacing="lg">
          <div>Large spacing</div>
        </Stack>
      )
      stack = screen.getByTestId('ai-stack')
      expect(stack).toHaveClass('gap-6')

      rerender(
        <Stack spacing="xl">
          <div>Extra large spacing</div>
        </Stack>
      )
      stack = screen.getByTestId('ai-stack')
      expect(stack).toHaveClass('gap-8')

      rerender(
        <Stack spacing="2xl">
          <div>2XL spacing</div>
        </Stack>
      )
      stack = screen.getByTestId('ai-stack')
      expect(stack).toHaveClass('gap-10')

      rerender(
        <Stack spacing="3xl">
          <div>3XL spacing</div>
        </Stack>
      )
      stack = screen.getByTestId('ai-stack')
      expect(stack).toHaveClass('gap-12')
    })
  })

  describe('Alignment Configuration', () => {
    it('applies justify classes correctly', () => {
      const { rerender } = render(
        <Stack justify="start">
          <div>Justify start</div>
        </Stack>
      )
      
      let stack = screen.getByTestId('ai-stack')
      expect(stack).toHaveClass('justify-start')

      rerender(
        <Stack justify="center">
          <div>Justify center</div>
        </Stack>
      )
      stack = screen.getByTestId('ai-stack')
      expect(stack).toHaveClass('justify-center')

      rerender(
        <Stack justify="end">
          <div>Justify end</div>
        </Stack>
      )
      stack = screen.getByTestId('ai-stack')
      expect(stack).toHaveClass('justify-end')

      rerender(
        <Stack justify="between">
          <div>Justify between</div>
        </Stack>
      )
      stack = screen.getByTestId('ai-stack')
      expect(stack).toHaveClass('justify-between')

      rerender(
        <Stack justify="around">
          <div>Justify around</div>
        </Stack>
      )
      stack = screen.getByTestId('ai-stack')
      expect(stack).toHaveClass('justify-around')

      rerender(
        <Stack justify="evenly">
          <div>Justify evenly</div>
        </Stack>
      )
      stack = screen.getByTestId('ai-stack')
      expect(stack).toHaveClass('justify-evenly')
    })

    it('applies align classes correctly', () => {
      const { rerender } = render(
        <Stack align="start">
          <div>Align start</div>
        </Stack>
      )
      
      let stack = screen.getByTestId('ai-stack')
      expect(stack).toHaveClass('items-start')

      rerender(
        <Stack align="center">
          <div>Align center</div>
        </Stack>
      )
      stack = screen.getByTestId('ai-stack')
      expect(stack).toHaveClass('items-center')

      rerender(
        <Stack align="end">
          <div>Align end</div>
        </Stack>
      )
      stack = screen.getByTestId('ai-stack')
      expect(stack).toHaveClass('items-end')

      rerender(
        <Stack align="baseline">
          <div>Align baseline</div>
        </Stack>
      )
      stack = screen.getByTestId('ai-stack')
      expect(stack).toHaveClass('items-baseline')

      rerender(
        <Stack align="stretch">
          <div>Align stretch</div>
        </Stack>
      )
      stack = screen.getByTestId('ai-stack')
      expect(stack).toHaveClass('items-stretch')
    })
  })

  describe('Wrap Configuration', () => {
    it('applies wrap classes correctly', () => {
      const { rerender } = render(
        <Stack wrap>
          <div>Wrap enabled</div>
        </Stack>
      )
      
      let stack = screen.getByTestId('ai-stack')
      expect(stack).toHaveClass('flex-wrap')

      rerender(
        <Stack wrap={false}>
          <div>Wrap disabled</div>
        </Stack>
      )
      stack = screen.getByTestId('ai-stack')
      expect(stack).not.toHaveClass('flex-wrap')
    })
  })

  describe('Responsive Configuration', () => {
    it('applies responsive direction classes', () => {
      render(
        <Stack 
          direction="column"
          responsive
          responsiveBreakpoint="md"
          mobileDirection="column"
        >
          <div>Responsive stack</div>
        </Stack>
      )
      
      const stack = screen.getByTestId('ai-stack')
      expect(stack).toHaveClass('flex-col', 'md:flex-row')
    })

    it('handles different responsive breakpoints', () => {
      const { rerender } = render(
        <Stack 
          direction="row"
          responsive
          responsiveBreakpoint="sm"
          mobileDirection="column"
        >
          <div>SM breakpoint</div>
        </Stack>
      )
      
      let stack = screen.getByTestId('ai-stack')
      expect(stack).toHaveClass('flex-col', 'sm:flex-row')

      rerender(
        <Stack 
          direction="row"
          responsive
          responsiveBreakpoint="lg"
          mobileDirection="column"
        >
          <div>LG breakpoint</div>
        </Stack>
      )
      stack = screen.getByTestId('ai-stack')
      expect(stack).toHaveClass('flex-col', 'lg:flex-row')

      rerender(
        <Stack 
          direction="row"
          responsive
          responsiveBreakpoint="xl"
          mobileDirection="column"
        >
          <div>XL breakpoint</div>
        </Stack>
      )
      stack = screen.getByTestId('ai-stack')
      expect(stack).toHaveClass('flex-col', 'xl:flex-row')
    })
  })

  describe('Divider Configuration', () => {
    it('renders dividers between items when enabled', () => {
      render(
        <Stack divider>
          <div>Item 1</div>
          <div>Item 2</div>
          <div>Item 3</div>
        </Stack>
      )

      expect(screen.getByText('Item 1')).toBeInTheDocument()
      expect(screen.getByText('Item 2')).toBeInTheDocument()
      expect(screen.getByText('Item 3')).toBeInTheDocument()

      // Should have dividers between items (2 dividers for 3 items)
      const dividers = screen.getAllByRole('separator', { hidden: true })
      expect(dividers).toHaveLength(2)
    })

    it('renders custom divider elements', () => {
      const CustomDivider = () => <hr data-testid="custom-divider" />

      render(
        <Stack divider dividerElement={<CustomDivider />}>
          <div>Item 1</div>
          <div>Item 2</div>
        </Stack>
      )

      const customDividers = screen.getAllByTestId('custom-divider')
      expect(customDividers).toHaveLength(1)
    })

    it('does not render dividers when disabled', () => {
      render(
        <Stack divider={false}>
          <div>Item 1</div>
          <div>Item 2</div>
          <div>Item 3</div>
        </Stack>
      )

      const dividers = screen.queryAllByRole('separator', { hidden: true })
      expect(dividers).toHaveLength(0)
    })
  })

  describe('Semantic HTML Elements', () => {
    it('renders as div by default', () => {
      render(
        <Stack>
          <div>Default element</div>
        </Stack>
      )

      const stack = screen.getByTestId('ai-stack')
      expect(stack.tagName).toBe('DIV')
    })

    it('renders as specified semantic element', () => {
      const { rerender } = render(
        <Stack as="section">
          <div>Section stack</div>
        </Stack>
      )

      let stack = screen.getByTestId('ai-stack')
      expect(stack.tagName).toBe('SECTION')

      rerender(
        <Stack as="nav">
          <div>Nav stack</div>
        </Stack>
      )
      stack = screen.getByTestId('ai-stack')
      expect(stack.tagName).toBe('NAV')

      rerender(
        <Stack as="ul">
          <div>List stack</div>
        </Stack>
      )
      stack = screen.getByTestId('ai-stack')
      expect(stack.tagName).toBe('UL')
    })
  })

  describe('Stack Variants', () => {
    describe('HStack', () => {
      it('renders as horizontal stack by default', () => {
        render(
          <HStack spacing="lg" align="center">
            <div>Horizontal item 1</div>
            <div>Horizontal item 2</div>
          </HStack>
        )

        const stack = screen.getByTestId('ai-stack')
        expect(stack).toHaveClass('flex-row', 'gap-6', 'items-center')
        expect(stack).toHaveAttribute('aria-label', 'Horizontal stack layout')
      })
    })

    describe('VStack', () => {
      it('renders as vertical stack by default', () => {
        render(
          <VStack spacing="md" align="start">
            <div>Vertical item 1</div>
            <div>Vertical item 2</div>
          </VStack>
        )

        const stack = screen.getByTestId('ai-stack')
        expect(stack).toHaveClass('flex-col', 'gap-4', 'items-start')
        expect(stack).toHaveAttribute('aria-label', 'Vertical stack layout')
      })
    })

    describe('ResponsiveStack', () => {
      it('applies responsive configuration by default', () => {
        render(
          <ResponsiveStack>
            <div>Responsive item 1</div>
            <div>Responsive item 2</div>
          </ResponsiveStack>
        )

        const stack = screen.getByTestId('ai-stack')
        expect(stack).toHaveClass('flex-col', 'md:flex-row')
        expect(stack).toHaveAttribute('aria-label', 'Responsive stack layout')
      })
    })

    describe('DividedStack', () => {
      it('enables dividers by default', () => {
        render(
          <DividedStack spacing="md">
            <div>Divided item 1</div>
            <div>Divided item 2</div>
            <div>Divided item 3</div>
          </DividedStack>
        )

        const stack = screen.getByTestId('ai-stack')
        expect(stack).toHaveAttribute('aria-label', 'Divided stack layout')

        const dividers = screen.getAllByRole('separator', { hidden: true })
        expect(dividers).toHaveLength(2)
      })
    })
  })

  describe('Accessibility', () => {
    it('has no accessibility violations', async () => {
      const { container } = render(
        <Stack
          spacing="md"
          align="center"
          semanticMeaning="Navigation stack"
        >
          <button type="button">Button 1</button>
          <button type="button">Button 2</button>
          <button type="button">Button 3</button>
        </Stack>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('includes AI-first semantic attributes', () => {
      render(
        <Stack
          semanticMeaning="AI-enhanced stack"
          capabilities={['layout', 'spacing', 'alignment', 'responsive']}
        >
          <div>Stack item</div>
        </Stack>
      )

      const stack = screen.getByTestId('ai-stack')
      expect(stack).toHaveAttribute('data-semantic-type', 'ai-first-stack')
      expect(stack).toHaveAttribute('data-ai-extensible', 'true')

      const capabilitiesText = screen.getByText(/Stack capabilities: layout, spacing, alignment, responsive/)
      expect(capabilitiesText).toBeInTheDocument()
      expect(capabilitiesText).toHaveClass('sr-only')
    })
  })

  describe('Performance', () => {
    it('renders within performance thresholds', () => {
      const startTime = performance.now()

      render(
        <Stack spacing="md" direction="column" align="center">
          {Array.from({ length: 20 }, (_, i) => (
            <div key={i}>Stack item {i + 1}</div>
          ))}
        </Stack>
      )

      const endTime = performance.now()
      const renderTime = endTime - startTime

      expect(renderTime).toBeLessThan(100) // Should render quickly even with many items
    })
  })

  describe('Integration Tests', () => {
    it('works with complex nested layouts', () => {
      render(
        <VStack spacing="lg">
          <div>Header</div>
          <HStack spacing="md" align="center">
            <div>Left sidebar</div>
            <VStack spacing="sm">
              <div>Main content 1</div>
              <div>Main content 2</div>
            </VStack>
            <div>Right sidebar</div>
          </HStack>
          <div>Footer</div>
        </VStack>
      )

      expect(screen.getByText('Header')).toBeInTheDocument()
      expect(screen.getByText('Left sidebar')).toBeInTheDocument()
      expect(screen.getByText('Main content 1')).toBeInTheDocument()
      expect(screen.getByText('Main content 2')).toBeInTheDocument()
      expect(screen.getByText('Right sidebar')).toBeInTheDocument()
      expect(screen.getByText('Footer')).toBeInTheDocument()
    })

    it('maintains responsive behavior with complex content', () => {
      render(
        <ResponsiveStack spacing="md">
          <div className="flex-1">Flexible content 1</div>
          <div className="flex-1">Flexible content 2</div>
          <div className="flex-shrink-0">Fixed content</div>
        </ResponsiveStack>
      )

      const stack = screen.getByTestId('ai-stack')
      expect(stack).toHaveClass('flex-col', 'md:flex-row', 'gap-4')

      expect(screen.getByText('Flexible content 1')).toBeInTheDocument()
      expect(screen.getByText('Flexible content 2')).toBeInTheDocument()
      expect(screen.getByText('Fixed content')).toBeInTheDocument()
    })
  })
})

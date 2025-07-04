/**
 * Grid Component Tests - Comprehensive testing for AI-First Grid layout component
 * @author AI ToDo MCP Team
 * @version 1.0.0
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import {
  Grid,
  GridItem,
  ResponsiveGrid,
  AutoFitGrid,
  CardGrid
} from './Grid'
import { renderWithProviders } from '../../__tests__/utils/test-utils'

// Extend expect matchers
expect.extend(toHaveNoViolations)

describe('Grid Component', () => {
  describe('Basic Functionality', () => {
    it('renders with default props', () => {
      render(
        <Grid>
          <div>Grid item 1</div>
          <div>Grid item 2</div>
          <div>Grid item 3</div>
        </Grid>
      )
      
      const grid = screen.getByTestId('ai-grid')
      expect(grid).toBeInTheDocument()
      expect(grid).toHaveClass('grid')
      expect(screen.getByText('Grid item 1')).toBeInTheDocument()
      expect(screen.getByText('Grid item 2')).toBeInTheDocument()
      expect(screen.getByText('Grid item 3')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      render(
        <Grid className="custom-grid">
          <div>Grid content</div>
        </Grid>
      )
      
      const grid = screen.getByTestId('ai-grid')
      expect(grid).toHaveClass('custom-grid')
    })

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>()
      render(
        <Grid ref={ref}>
          <div>Grid content</div>
        </Grid>
      )
      
      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })
  })

  describe('Column Configuration', () => {
    it('applies column classes correctly', () => {
      const { rerender } = render(
        <Grid cols={1}>
          <div>Single column</div>
        </Grid>
      )
      
      let grid = screen.getByTestId('ai-grid')
      expect(grid).toHaveClass('grid-cols-1')

      rerender(
        <Grid cols={3}>
          <div>Three columns</div>
        </Grid>
      )
      grid = screen.getByTestId('ai-grid')
      expect(grid).toHaveClass('grid-cols-3')

      rerender(
        <Grid cols={12}>
          <div>Twelve columns</div>
        </Grid>
      )
      grid = screen.getByTestId('ai-grid')
      expect(grid).toHaveClass('grid-cols-12')

      rerender(
        <Grid cols="auto">
          <div>Auto columns</div>
        </Grid>
      )
      grid = screen.getByTestId('ai-grid')
      expect(grid).toHaveClass('grid-cols-auto')

      rerender(
        <Grid cols="none">
          <div>No columns</div>
        </Grid>
      )
      grid = screen.getByTestId('ai-grid')
      expect(grid).toHaveClass('grid-cols-none')
    })
  })

  describe('Row Configuration', () => {
    it('applies row classes correctly', () => {
      const { rerender } = render(
        <Grid rows={1}>
          <div>Single row</div>
        </Grid>
      )
      
      let grid = screen.getByTestId('ai-grid')
      expect(grid).toHaveClass('grid-rows-1')

      rerender(
        <Grid rows={3}>
          <div>Three rows</div>
        </Grid>
      )
      grid = screen.getByTestId('ai-grid')
      expect(grid).toHaveClass('grid-rows-3')

      rerender(
        <Grid rows={6}>
          <div>Six rows</div>
        </Grid>
      )
      grid = screen.getByTestId('ai-grid')
      expect(grid).toHaveClass('grid-rows-6')

      rerender(
        <Grid rows="auto">
          <div>Auto rows</div>
        </Grid>
      )
      grid = screen.getByTestId('ai-grid')
      expect(grid).toHaveClass('grid-rows-auto')

      rerender(
        <Grid rows="none">
          <div>No rows</div>
        </Grid>
      )
      grid = screen.getByTestId('ai-grid')
      expect(grid).toHaveClass('grid-rows-none')
    })
  })

  describe('Gap Configuration', () => {
    it('applies gap classes correctly', () => {
      const { rerender } = render(
        <Grid gap="none">
          <div>No gap</div>
        </Grid>
      )
      
      let grid = screen.getByTestId('ai-grid')
      expect(grid).toHaveClass('gap-0')

      rerender(
        <Grid gap="sm">
          <div>Small gap</div>
        </Grid>
      )
      grid = screen.getByTestId('ai-grid')
      expect(grid).toHaveClass('gap-2')

      rerender(
        <Grid gap="md">
          <div>Medium gap</div>
        </Grid>
      )
      grid = screen.getByTestId('ai-grid')
      expect(grid).toHaveClass('gap-4')

      rerender(
        <Grid gap="lg">
          <div>Large gap</div>
        </Grid>
      )
      grid = screen.getByTestId('ai-grid')
      expect(grid).toHaveClass('gap-6')

      rerender(
        <Grid gap="2xl">
          <div>Extra large gap</div>
        </Grid>
      )
      grid = screen.getByTestId('ai-grid')
      expect(grid).toHaveClass('gap-8')
    })

    it('applies separate column and row gaps', () => {
      render(
        <Grid colGap="lg" rowGap="sm">
          <div>Custom gaps</div>
        </Grid>
      )
      
      const grid = screen.getByTestId('ai-grid')
      expect(grid).toHaveClass('gap-x-6', 'gap-y-2')
    })

    it('prioritizes specific gaps over general gap', () => {
      render(
        <Grid gap="md" colGap="lg" rowGap="sm">
          <div>Specific gaps override</div>
        </Grid>
      )
      
      const grid = screen.getByTestId('ai-grid')
      expect(grid).toHaveClass('gap-x-6', 'gap-y-2')
      expect(grid).not.toHaveClass('gap-4')
    })
  })

  describe('Responsive Configuration', () => {
    it('applies responsive column classes', () => {
      render(
        <Grid 
          responsive={{
            sm: 1,
            md: 2,
            lg: 3,
            xl: 4
          }}
        >
          <div>Responsive grid</div>
        </Grid>
      )
      
      const grid = screen.getByTestId('ai-grid')
      expect(grid).toHaveClass('sm:grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3', 'xl:grid-cols-4')
    })

    it('handles partial responsive configuration', () => {
      render(
        <Grid 
          cols={1}
          responsive={{
            md: 2,
            lg: 3
          }}
        >
          <div>Partial responsive</div>
        </Grid>
      )
      
      const grid = screen.getByTestId('ai-grid')
      expect(grid).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3')
    })
  })

  describe('Auto-fit and Auto-fill', () => {
    it('applies auto-fit classes correctly', () => {
      const { rerender } = render(
        <Grid autoFit="sm">
          <div>Auto-fit small</div>
        </Grid>
      )
      
      let grid = screen.getByTestId('ai-grid')
      expect(grid).toHaveClass('grid-cols-[repeat(auto-fit,minmax(16rem,1fr))]')

      rerender(
        <Grid autoFit="md">
          <div>Auto-fit medium</div>
        </Grid>
      )
      grid = screen.getByTestId('ai-grid')
      expect(grid).toHaveClass('grid-cols-[repeat(auto-fit,minmax(20rem,1fr))]')

      rerender(
        <Grid autoFit="lg">
          <div>Auto-fit large</div>
        </Grid>
      )
      grid = screen.getByTestId('ai-grid')
      expect(grid).toHaveClass('grid-cols-[repeat(auto-fit,minmax(24rem,1fr))]')
    })

    it('applies auto-fill classes correctly', () => {
      const { rerender } = render(
        <Grid autoFill="sm">
          <div>Auto-fill small</div>
        </Grid>
      )
      
      let grid = screen.getByTestId('ai-grid')
      expect(grid).toHaveClass('grid-cols-[repeat(auto-fill,minmax(16rem,1fr))]')

      rerender(
        <Grid autoFill="md">
          <div>Auto-fill medium</div>
        </Grid>
      )
      grid = screen.getByTestId('ai-grid')
      expect(grid).toHaveClass('grid-cols-[repeat(auto-fill,minmax(20rem,1fr))]')

      rerender(
        <Grid autoFill="lg">
          <div>Auto-fill large</div>
        </Grid>
      )
      grid = screen.getByTestId('ai-grid')
      expect(grid).toHaveClass('grid-cols-[repeat(auto-fill,minmax(24rem,1fr))]')
    })

    it('prioritizes auto-fit over auto-fill', () => {
      render(
        <Grid autoFit="md" autoFill="lg">
          <div>Auto-fit priority</div>
        </Grid>
      )
      
      const grid = screen.getByTestId('ai-grid')
      expect(grid).toHaveClass('grid-cols-[repeat(auto-fit,minmax(20rem,1fr))]')
      expect(grid).not.toHaveClass('grid-cols-[repeat(auto-fill,minmax(24rem,1fr))]')
    })
  })

  describe('Alignment Options', () => {
    it('applies justify-items classes correctly', () => {
      const { rerender } = render(
        <Grid justifyItems="start">
          <div>Justify start</div>
        </Grid>
      )
      
      let grid = screen.getByTestId('ai-grid')
      expect(grid).toHaveClass('justify-items-start')

      rerender(
        <Grid justifyItems="center">
          <div>Justify center</div>
        </Grid>
      )
      grid = screen.getByTestId('ai-grid')
      expect(grid).toHaveClass('justify-items-center')

      rerender(
        <Grid justifyItems="end">
          <div>Justify end</div>
        </Grid>
      )
      grid = screen.getByTestId('ai-grid')
      expect(grid).toHaveClass('justify-items-end')

      rerender(
        <Grid justifyItems="stretch">
          <div>Justify stretch</div>
        </Grid>
      )
      grid = screen.getByTestId('ai-grid')
      expect(grid).toHaveClass('justify-items-stretch')
    })

    it('applies align-items classes correctly', () => {
      const { rerender } = render(
        <Grid alignItems="start">
          <div>Align start</div>
        </Grid>
      )
      
      let grid = screen.getByTestId('ai-grid')
      expect(grid).toHaveClass('items-start')

      rerender(
        <Grid alignItems="center">
          <div>Align center</div>
        </Grid>
      )
      grid = screen.getByTestId('ai-grid')
      expect(grid).toHaveClass('items-center')

      rerender(
        <Grid alignItems="end">
          <div>Align end</div>
        </Grid>
      )
      grid = screen.getByTestId('ai-grid')
      expect(grid).toHaveClass('items-end')

      rerender(
        <Grid alignItems="stretch">
          <div>Align stretch</div>
        </Grid>
      )
      grid = screen.getByTestId('ai-grid')
      expect(grid).toHaveClass('items-stretch')
    })

    it('applies justify-content classes correctly', () => {
      const { rerender } = render(
        <Grid justifyContent="start">
          <div>Content start</div>
        </Grid>
      )
      
      let grid = screen.getByTestId('ai-grid')
      expect(grid).toHaveClass('justify-start')

      rerender(
        <Grid justifyContent="center">
          <div>Content center</div>
        </Grid>
      )
      grid = screen.getByTestId('ai-grid')
      expect(grid).toHaveClass('justify-center')

      rerender(
        <Grid justifyContent="between">
          <div>Content between</div>
        </Grid>
      )
      grid = screen.getByTestId('ai-grid')
      expect(grid).toHaveClass('justify-between')

      rerender(
        <Grid justifyContent="around">
          <div>Content around</div>
        </Grid>
      )
      grid = screen.getByTestId('ai-grid')
      expect(grid).toHaveClass('justify-around')

      rerender(
        <Grid justifyContent="evenly">
          <div>Content evenly</div>
        </Grid>
      )
      grid = screen.getByTestId('ai-grid')
      expect(grid).toHaveClass('justify-evenly')
    })

    it('applies align-content classes correctly', () => {
      const { rerender } = render(
        <Grid alignContent="start">
          <div>Content start</div>
        </Grid>
      )
      
      let grid = screen.getByTestId('ai-grid')
      expect(grid).toHaveClass('content-start')

      rerender(
        <Grid alignContent="center">
          <div>Content center</div>
        </Grid>
      )
      grid = screen.getByTestId('ai-grid')
      expect(grid).toHaveClass('content-center')

      rerender(
        <Grid alignContent="between">
          <div>Content between</div>
        </Grid>
      )
      grid = screen.getByTestId('ai-grid')
      expect(grid).toHaveClass('content-between')

      rerender(
        <Grid alignContent="around">
          <div>Content around</div>
        </Grid>
      )
      grid = screen.getByTestId('ai-grid')
      expect(grid).toHaveClass('content-around')

      rerender(
        <Grid alignContent="evenly">
          <div>Content evenly</div>
        </Grid>
      )
      grid = screen.getByTestId('ai-grid')
      expect(grid).toHaveClass('content-evenly')
    })
  })

  describe('GridItem Component', () => {
    it('renders with default props', () => {
      render(
        <Grid>
          <GridItem>
            <div>Grid item content</div>
          </GridItem>
        </Grid>
      )

      const gridItem = screen.getByTestId('ai-grid-item')
      expect(gridItem).toBeInTheDocument()
      expect(gridItem).toHaveTextContent('Grid item content')
    })

    it('applies column span classes correctly', () => {
      const { rerender } = render(
        <Grid>
          <GridItem colSpan={2}>
            <div>Span 2 columns</div>
          </GridItem>
        </Grid>
      )

      let gridItem = screen.getByTestId('ai-grid-item')
      expect(gridItem).toHaveClass('col-span-2')

      rerender(
        <Grid>
          <GridItem colSpan="full">
            <div>Span full width</div>
          </GridItem>
        </Grid>
      )
      gridItem = screen.getByTestId('ai-grid-item')
      expect(gridItem).toHaveClass('col-span-full')

      rerender(
        <Grid>
          <GridItem colSpan="auto">
            <div>Auto span</div>
          </GridItem>
        </Grid>
      )
      gridItem = screen.getByTestId('ai-grid-item')
      expect(gridItem).toHaveClass('col-auto')
    })

    it('applies row span classes correctly', () => {
      const { rerender } = render(
        <Grid>
          <GridItem rowSpan={3}>
            <div>Span 3 rows</div>
          </GridItem>
        </Grid>
      )

      let gridItem = screen.getByTestId('ai-grid-item')
      expect(gridItem).toHaveClass('row-span-3')

      rerender(
        <Grid>
          <GridItem rowSpan="full">
            <div>Span full height</div>
          </GridItem>
        </Grid>
      )
      gridItem = screen.getByTestId('ai-grid-item')
      expect(gridItem).toHaveClass('row-span-full')
    })

    it('applies positioning classes correctly', () => {
      render(
        <Grid>
          <GridItem colStart={2} colEnd={4} rowStart={1} rowEnd={3}>
            <div>Positioned item</div>
          </GridItem>
        </Grid>
      )

      const gridItem = screen.getByTestId('ai-grid-item')
      expect(gridItem).toHaveClass('col-start-2', 'col-end-4', 'row-start-1', 'row-end-3')
    })

    it('applies self-alignment classes correctly', () => {
      const { rerender } = render(
        <Grid>
          <GridItem justifySelf="center" alignSelf="start">
            <div>Self-aligned item</div>
          </GridItem>
        </Grid>
      )

      let gridItem = screen.getByTestId('ai-grid-item')
      expect(gridItem).toHaveClass('justify-self-center', 'self-start')

      rerender(
        <Grid>
          <GridItem justifySelf="end" alignSelf="center">
            <div>Different alignment</div>
          </GridItem>
        </Grid>
      )
      gridItem = screen.getByTestId('ai-grid-item')
      expect(gridItem).toHaveClass('justify-self-end', 'self-center')
    })
  })

  describe('Grid Variants', () => {
    describe('ResponsiveGrid', () => {
      it('applies responsive configuration by default', () => {
        render(
          <ResponsiveGrid>
            <div>Responsive item 1</div>
            <div>Responsive item 2</div>
            <div>Responsive item 3</div>
          </ResponsiveGrid>
        )

        const grid = screen.getByTestId('ai-grid')
        expect(grid).toHaveClass('sm:grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3', 'xl:grid-cols-4')
        expect(grid).toHaveAttribute('aria-label', 'Responsive grid layout')
      })
    })

    describe('AutoFitGrid', () => {
      it('applies auto-fit configuration by default', () => {
        render(
          <AutoFitGrid>
            <div>Auto-fit item 1</div>
            <div>Auto-fit item 2</div>
          </AutoFitGrid>
        )

        const grid = screen.getByTestId('ai-grid')
        expect(grid).toHaveClass('grid-cols-[repeat(auto-fit,minmax(20rem,1fr))]')
        expect(grid).toHaveAttribute('aria-label', 'Auto-fit grid layout')
      })
    })

    describe('CardGrid', () => {
      it('applies card-specific configuration', () => {
        render(
          <CardGrid>
            <div>Card 1</div>
            <div>Card 2</div>
            <div>Card 3</div>
          </CardGrid>
        )

        const grid = screen.getByTestId('ai-grid')
        expect(grid).toHaveClass('grid-cols-[repeat(auto-fit,minmax(16rem,1fr))]', 'gap-6')
        expect(grid).toHaveAttribute('aria-label', 'Card grid layout')

        const capabilitiesText = screen.getByText(/Grid capabilities: grid-layout, card-display, responsive/)
        expect(capabilitiesText).toBeInTheDocument()
        expect(capabilitiesText).toHaveClass('sr-only')
      })
    })
  })

  describe('Accessibility', () => {
    it('has no accessibility violations', async () => {
      const { container } = render(
        <Grid
          cols={3}
          gap="md"
          semanticMeaning="Product grid layout"
        >
          <div>Item 1</div>
          <div>Item 2</div>
          <div>Item 3</div>
        </Grid>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('includes AI-first semantic attributes', () => {
      render(
        <Grid
          semanticMeaning="AI-enhanced grid"
          capabilities={['grid-layout', 'responsive', 'alignment']}
        >
          <div>Grid item</div>
        </Grid>
      )

      const grid = screen.getByTestId('ai-grid')
      expect(grid).toHaveAttribute('data-semantic-type', 'ai-first-grid')
      expect(grid).toHaveAttribute('data-ai-extensible', 'true')

      const capabilitiesText = screen.getByText(/Grid capabilities: grid-layout, responsive, alignment/)
      expect(capabilitiesText).toBeInTheDocument()
      expect(capabilitiesText).toHaveClass('sr-only')
    })
  })

  describe('Performance', () => {
    it('renders within performance thresholds', () => {
      const startTime = performance.now()

      render(
        <Grid cols={4} gap="md" autoFit="md">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i}>Grid item {i + 1}</div>
          ))}
        </Grid>
      )

      const endTime = performance.now()
      const renderTime = endTime - startTime

      expect(renderTime).toBeLessThan(100) // Should render quickly even with many items
    })
  })

  describe('Integration Tests', () => {
    it('works with complex nested layouts', () => {
      render(
        <Grid cols={3} gap="lg">
          <GridItem colSpan={2}>
            <Grid cols={2} gap="sm">
              <div>Nested 1</div>
              <div>Nested 2</div>
            </Grid>
          </GridItem>
          <GridItem>
            <div>Sidebar</div>
          </GridItem>
          <GridItem colSpan="full">
            <div>Footer</div>
          </GridItem>
        </Grid>
      )

      expect(screen.getByText('Nested 1')).toBeInTheDocument()
      expect(screen.getByText('Nested 2')).toBeInTheDocument()
      expect(screen.getByText('Sidebar')).toBeInTheDocument()
      expect(screen.getByText('Footer')).toBeInTheDocument()
    })
  })
})

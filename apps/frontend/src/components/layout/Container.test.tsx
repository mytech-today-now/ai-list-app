/**
 * Container Component Tests - Comprehensive testing for AI-First Container layout component
 * @author AI ToDo MCP Team
 * @version 1.0.0
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import {
  Container,
  MainContainer,
  SectionContainer,
  ArticleContainer,
  HeaderContainer,
  FooterContainer,
  NavContainer
} from './Container'
import { renderWithProviders } from '../../__tests__/utils/test-utils'

// Extend expect matchers
expect.extend(toHaveNoViolations)

describe('Container Component', () => {
  describe('Basic Functionality', () => {
    it('renders with default props', () => {
      render(
        <Container>
          <p>Container content</p>
        </Container>
      )
      
      const container = screen.getByTestId('ai-container')
      expect(container).toBeInTheDocument()
      expect(container).toHaveTextContent('Container content')
      expect(container).toHaveClass('max-w-4xl', 'mx-auto', 'px-4')
    })

    it('renders with custom content', () => {
      render(
        <Container>
          <h1>Main Title</h1>
          <p>Container description</p>
          <button type="button">Action</button>
        </Container>
      )
      
      expect(screen.getByText('Main Title')).toBeInTheDocument()
      expect(screen.getByText('Container description')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument()
    })

    it('applies custom className', () => {
      render(
        <Container className="custom-container">
          <p>Content</p>
        </Container>
      )
      
      const container = screen.getByTestId('ai-container')
      expect(container).toHaveClass('custom-container')
    })

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>()
      render(
        <Container ref={ref}>
          <p>Content</p>
        </Container>
      )
      
      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })
  })

  describe('Size Variants', () => {
    it('applies size classes correctly', () => {
      const { rerender } = render(
        <Container size="sm">
          <p>Small container</p>
        </Container>
      )
      
      let container = screen.getByTestId('ai-container')
      expect(container).toHaveClass('max-w-sm')

      rerender(
        <Container size="md">
          <p>Medium container</p>
        </Container>
      )
      container = screen.getByTestId('ai-container')
      expect(container).toHaveClass('max-w-md')

      rerender(
        <Container size="lg">
          <p>Large container</p>
        </Container>
      )
      container = screen.getByTestId('ai-container')
      expect(container).toHaveClass('max-w-4xl')

      rerender(
        <Container size="xl">
          <p>Extra large container</p>
        </Container>
      )
      container = screen.getByTestId('ai-container')
      expect(container).toHaveClass('max-w-6xl')

      rerender(
        <Container size="2xl">
          <p>2XL container</p>
        </Container>
      )
      container = screen.getByTestId('ai-container')
      expect(container).toHaveClass('max-w-7xl')

      rerender(
        <Container size="full">
          <p>Full width container</p>
        </Container>
      )
      container = screen.getByTestId('ai-container')
      expect(container).toHaveClass('max-w-full')
    })
  })

  describe('Padding Options', () => {
    it('applies padding classes correctly', () => {
      const { rerender } = render(
        <Container padding="none">
          <p>No padding</p>
        </Container>
      )
      
      let container = screen.getByTestId('ai-container')
      expect(container).toHaveClass('p-0')

      rerender(
        <Container padding="sm">
          <p>Small padding</p>
        </Container>
      )
      container = screen.getByTestId('ai-container')
      expect(container).toHaveClass('px-2', 'py-2')

      rerender(
        <Container padding="md">
          <p>Medium padding</p>
        </Container>
      )
      container = screen.getByTestId('ai-container')
      expect(container).toHaveClass('px-4', 'py-4')

      rerender(
        <Container padding="lg">
          <p>Large padding</p>
        </Container>
      )
      container = screen.getByTestId('ai-container')
      expect(container).toHaveClass('px-6', 'py-6')

      rerender(
        <Container padding="xl">
          <p>Extra large padding</p>
        </Container>
      )
      container = screen.getByTestId('ai-container')
      expect(container).toHaveClass('px-8', 'py-8')
    })

    it('applies responsive padding correctly', () => {
      render(
        <Container responsivePadding>
          <p>Responsive padding</p>
        </Container>
      )
      
      const container = screen.getByTestId('ai-container')
      expect(container).toHaveClass('px-4', 'sm:px-6', 'lg:px-8')
    })

    it('disables responsive padding when set to false', () => {
      render(
        <Container responsivePadding={false} padding="md">
          <p>Fixed padding</p>
        </Container>
      )
      
      const container = screen.getByTestId('ai-container')
      expect(container).toHaveClass('px-4', 'py-4')
      expect(container).not.toHaveClass('sm:px-6', 'lg:px-8')
    })
  })

  describe('Centering Options', () => {
    it('centers container by default', () => {
      render(
        <Container>
          <p>Centered content</p>
        </Container>
      )
      
      const container = screen.getByTestId('ai-container')
      expect(container).toHaveClass('mx-auto')
    })

    it('disables centering when centered is false', () => {
      render(
        <Container centered={false}>
          <p>Not centered content</p>
        </Container>
      )
      
      const container = screen.getByTestId('ai-container')
      expect(container).not.toHaveClass('mx-auto')
    })
  })

  describe('Semantic HTML Elements', () => {
    it('renders as div by default', () => {
      render(
        <Container>
          <p>Default element</p>
        </Container>
      )
      
      const container = screen.getByTestId('ai-container')
      expect(container.tagName).toBe('DIV')
    })

    it('renders as specified semantic element', () => {
      const { rerender } = render(
        <Container as="main">
          <p>Main content</p>
        </Container>
      )
      
      let container = screen.getByTestId('ai-container')
      expect(container.tagName).toBe('MAIN')

      rerender(
        <Container as="section">
          <p>Section content</p>
        </Container>
      )
      container = screen.getByTestId('ai-container')
      expect(container.tagName).toBe('SECTION')

      rerender(
        <Container as="article">
          <p>Article content</p>
        </Container>
      )
      container = screen.getByTestId('ai-container')
      expect(container.tagName).toBe('ARTICLE')

      rerender(
        <Container as="header">
          <p>Header content</p>
        </Container>
      )
      container = screen.getByTestId('ai-container')
      expect(container.tagName).toBe('HEADER')

      rerender(
        <Container as="footer">
          <p>Footer content</p>
        </Container>
      )
      container = screen.getByTestId('ai-container')
      expect(container.tagName).toBe('FOOTER')

      rerender(
        <Container as="nav">
          <p>Navigation content</p>
        </Container>
      )
      container = screen.getByTestId('ai-container')
      expect(container.tagName).toBe('NAV')

      rerender(
        <Container as="aside">
          <p>Aside content</p>
        </Container>
      )
      container = screen.getByTestId('ai-container')
      expect(container.tagName).toBe('ASIDE')
    })
  })

  describe('Accessibility', () => {
    it('has no accessibility violations', async () => {
      const { container } = render(
        <Container 
          as="main"
          semanticMeaning="Main content container"
        >
          <h1>Page Title</h1>
          <p>Page content</p>
        </Container>
      )
      
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('provides proper ARIA attributes for semantic elements', () => {
      const { rerender } = render(
        <Container as="main" semanticMeaning="Main content area">
          <p>Main content</p>
        </Container>
      )
      
      let container = screen.getByTestId('ai-container')
      expect(container).toHaveAttribute('role', 'main')
      expect(container).toHaveAttribute('aria-label', 'Main content area')

      rerender(
        <Container as="nav" semanticMeaning="Primary navigation">
          <p>Navigation content</p>
        </Container>
      )
      container = screen.getByTestId('ai-container')
      expect(container).toHaveAttribute('role', 'navigation')
      expect(container).toHaveAttribute('aria-label', 'Primary navigation')

      rerender(
        <Container as="aside" semanticMeaning="Sidebar content">
          <p>Aside content</p>
        </Container>
      )
      container = screen.getByTestId('ai-container')
      expect(container).toHaveAttribute('role', 'complementary')
      expect(container).toHaveAttribute('aria-label', 'Sidebar content')
    })

    it('includes AI-first semantic attributes', () => {
      render(
        <Container 
          semanticMeaning="AI-enhanced container"
          capabilities={['layout', 'responsive', 'semantic-structure']}
        >
          <p>AI-enhanced content</p>
        </Container>
      )
      
      const container = screen.getByTestId('ai-container')
      expect(container).toHaveAttribute('data-semantic-type', 'ai-first-container')
      expect(container).toHaveAttribute('data-ai-extensible', 'true')
      
      const capabilitiesText = screen.getByText(/Container capabilities: layout, responsive, semantic-structure/)
      expect(capabilitiesText).toBeInTheDocument()
      expect(capabilitiesText).toHaveClass('sr-only')
    })
  })

  describe('Visual Testing', () => {
    it('renders consistently across devices', async () => {
      const containerComponent = (
        <Container size="lg" padding="md">
          <h2>Responsive Container</h2>
          <p>This container should work on all devices</p>
        </Container>
      )

      await testAcrossDevices(containerComponent, 'container-responsive')
    })

    it('renders consistently across themes', async () => {
      const containerComponent = (
        <Container as="main" size="xl">
          <h1>Theme Test Container</h1>
          <p>This container should work in both light and dark themes</p>
        </Container>
      )

      await testAcrossThemes(containerComponent, 'container-themes')
    })

    it('renders all component states correctly', async () => {
      const containerStates = [
        { props: { size: 'sm' }, name: 'small' },
        { props: { size: 'lg' }, name: 'large' },
        { props: { size: 'full' }, name: 'full-width' },
        { props: { padding: 'none' }, name: 'no-padding' },
        { props: { padding: 'xl' }, name: 'large-padding' },
        { props: { as: 'main' }, name: 'main-element' }
      ]

      await testComponentStates(
        (props: any) => (
          <Container {...props}>
            Container content
          </Container>
        ),
        containerStates,
        'container-states'
      )
    })
  })

  describe('Performance', () => {
    it('renders within performance thresholds', () => {
      const startTime = performance.now()

      render(
        <Container size="lg" padding="md" responsivePadding>
          <div>
            <h1>Performance Test</h1>
            <p>This container should render quickly</p>
            <div>
              <button type="button">Action 1</button>
              <button type="button">Action 2</button>
            </div>
          </div>
        </Container>
      )

      const endTime = performance.now()
      const renderTime = endTime - startTime

      expect(renderTime).toBeLessThan(50) // Should render very quickly
    })

    it('handles rapid prop changes efficiently', () => {
      const { rerender } = render(
        <Container size="sm">
          <p>Initial content</p>
        </Container>
      )

      const startTime = performance.now()

      // Simulate rapid prop changes
      const sizes = ['sm', 'md', 'lg', 'xl', '2xl', 'full'] as const
      for (let i = 0; i < 20; i++) {
        const size = sizes[i % sizes.length]
        rerender(
          <Container size={size} padding={i % 2 === 0 ? 'sm' : 'lg'}>
            <p>Content {i}</p>
          </Container>
        )
      }

      const endTime = performance.now()
      const updateTime = endTime - startTime

      expect(updateTime).toBeLessThan(100) // Should handle rapid updates
    })
  })

  describe('Error Handling', () => {
    it('handles missing children gracefully', () => {
      expect(() => render(<Container />)).not.toThrow()

      const container = screen.getByTestId('ai-container')
      expect(container).toBeInTheDocument()
    })

    it('handles invalid props gracefully', () => {
      expect(() =>
        render(
          <Container
            size={'invalid' as any}
            padding={'invalid' as any}
            as={'invalid' as any}
          >
            <p>Content</p>
          </Container>
        )
      ).not.toThrow()
    })
  })

  describe('Container Variants', () => {
    describe('MainContainer', () => {
      it('renders as main element by default', () => {
        render(
          <MainContainer>
            <h1>Main content</h1>
          </MainContainer>
        )

        const container = screen.getByTestId('ai-container')
        expect(container.tagName).toBe('MAIN')
        expect(container).toHaveAttribute('role', 'main')
        expect(container).toHaveAttribute('aria-label', 'Main content container')
      })
    })

    describe('SectionContainer', () => {
      it('renders as section element by default', () => {
        render(
          <SectionContainer>
            <h2>Section content</h2>
          </SectionContainer>
        )

        const container = screen.getByTestId('ai-container')
        expect(container.tagName).toBe('SECTION')
        expect(container).toHaveAttribute('aria-label', 'Section content container')
      })
    })

    describe('ArticleContainer', () => {
      it('renders as article element by default', () => {
        render(
          <ArticleContainer>
            <h2>Article content</h2>
          </ArticleContainer>
        )

        const container = screen.getByTestId('ai-container')
        expect(container.tagName).toBe('ARTICLE')
        expect(container).toHaveAttribute('aria-label', 'Article content container')
      })
    })

    describe('HeaderContainer', () => {
      it('renders as header element by default', () => {
        render(
          <HeaderContainer>
            <h1>Header content</h1>
          </HeaderContainer>
        )

        const container = screen.getByTestId('ai-container')
        expect(container.tagName).toBe('HEADER')
        expect(container).toHaveAttribute('role', 'banner')
        expect(container).toHaveAttribute('aria-label', 'Header content container')
      })
    })

    describe('FooterContainer', () => {
      it('renders as footer element by default', () => {
        render(
          <FooterContainer>
            <p>Footer content</p>
          </FooterContainer>
        )

        const container = screen.getByTestId('ai-container')
        expect(container.tagName).toBe('FOOTER')
        expect(container).toHaveAttribute('role', 'contentinfo')
        expect(container).toHaveAttribute('aria-label', 'Footer content container')
      })
    })

    describe('NavContainer', () => {
      it('renders as nav element by default', () => {
        render(
          <NavContainer>
            <ul>
              <li><a href="/">Home</a></li>
              <li><a href="/about">About</a></li>
            </ul>
          </NavContainer>
        )

        const container = screen.getByTestId('ai-container')
        expect(container.tagName).toBe('NAV')
        expect(container).toHaveAttribute('role', 'navigation')
        expect(container).toHaveAttribute('aria-label', 'Navigation content container')
      })
    })
  })
})

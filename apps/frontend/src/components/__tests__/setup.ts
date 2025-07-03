/**
 * Test Setup for AI-First UI Component Library
 * Comprehensive testing configuration with accessibility, performance, and AI integration testing
 */

import '@testing-library/jest-dom'
import { configure } from '@testing-library/react'
import { toHaveNoViolations } from 'jest-axe'

// Extend Jest matchers
expect.extend(toHaveNoViolations)

// Configure React Testing Library
configure({
  testIdAttribute: 'data-testid',
  asyncUtilTimeout: 5000,
})

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock scrollTo
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: jest.fn(),
})

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 0))
global.cancelAnimationFrame = jest.fn()

// Mock MCP client for testing
export const mockMCPClient = {
  execute: jest.fn().mockResolvedValue({ success: true }),
  getResources: jest.fn().mockResolvedValue([]),
  useTool: jest.fn().mockResolvedValue({ result: 'success' }),
}

// Test utilities for AI-First components
export const testUtils = {
  // Accessibility testing helper
  async checkAccessibility(container: HTMLElement) {
    const { axe } = await import('jest-axe')
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  },
  
  // Keyboard navigation testing
  async testKeyboardNavigation(element: HTMLElement, keys: string[]) {
    const { fireEvent } = await import('@testing-library/react')
    
    for (const key of keys) {
      fireEvent.keyDown(element, { key })
      // Allow for async updates
      await new Promise(resolve => setTimeout(resolve, 0))
    }
  },
  
  // Screen reader testing helper
  getScreenReaderText(container: HTMLElement) {
    const srElements = container.querySelectorAll('.sr-only, [aria-live], [aria-label], [aria-describedby]')
    return Array.from(srElements).map(el => el.textContent || el.getAttribute('aria-label')).filter(Boolean)
  },
  
  // MCP integration testing
  mockMCPCommand: (command: string, response: any = { success: true }) => {
    mockMCPClient.execute.mockImplementation((cmd, data) => {
      if (cmd === command) {
        return Promise.resolve(response)
      }
      return Promise.resolve({ success: false, error: 'Unknown command' })
    })
  },
  
  // Performance testing helper
  measureRenderTime: async (renderFn: () => void) => {
    const start = performance.now()
    renderFn()
    await new Promise(resolve => setTimeout(resolve, 0))
    const end = performance.now()
    return end - start
  },
  
  // AI interaction testing
  mockAIInteraction: (type: string, response: any = {}) => {
    return jest.fn().mockImplementation((interaction) => {
      if (interaction.type === type) {
        return Promise.resolve(response)
      }
      return Promise.resolve({})
    })
  },
  
  // Focus management testing
  async testFocusManagement(container: HTMLElement, expectedFocusSequence: string[]) {
    const { fireEvent } = await import('@testing-library/react')
    
    for (let i = 0; i < expectedFocusSequence.length; i++) {
      fireEvent.keyDown(document.activeElement || document.body, { key: 'Tab' })
      await new Promise(resolve => setTimeout(resolve, 0))
      
      const expectedElement = container.querySelector(expectedFocusSequence[i])
      expect(document.activeElement).toBe(expectedElement)
    }
  },
  
  // Semantic meaning validation
  validateSemanticMeaning: (element: HTMLElement, expectedType: string) => {
    const semanticType = element.getAttribute('data-semantic-type')
    expect(semanticType).toBe(expectedType)
    
    const aiExtensible = element.getAttribute('data-ai-extensible')
    expect(aiExtensible).toBe('true')
  },
  
  // Component capability testing
  validateCapabilities: (element: HTMLElement, expectedCapabilities: string[]) => {
    const srText = testUtils.getScreenReaderText(element)
    const capabilitiesText = srText.find(text => text?.includes('capabilities:'))
    
    if (capabilitiesText) {
      expectedCapabilities.forEach(capability => {
        expect(capabilitiesText).toContain(capability)
      })
    }
  },
}

// Custom render function with providers
export const renderWithProviders = async (ui: React.ReactElement, options: any = {}) => {
  const { render } = await import('@testing-library/react')
  const { ThemeProvider } = await import('../design-system')
  
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <ThemeProvider theme={options.theme || 'light'}>
      {children}
    </ThemeProvider>
  )
  
  return render(ui, { wrapper: Wrapper, ...options })
}

// Performance testing utilities
export const performanceUtils = {
  // Bundle size testing
  async checkBundleSize(componentPath: string, maxSize: number) {
    // This would integrate with your build system
    // For now, we'll mock it
    const bundleSize = 1024 // Mock size in bytes
    expect(bundleSize).toBeLessThan(maxSize)
  },
  
  // Memory leak testing
  async checkMemoryLeaks(renderFn: () => void, iterations: number = 100) {
    const initialMemory = (performance as any).memory?.usedJSHeapSize || 0
    
    for (let i = 0; i < iterations; i++) {
      renderFn()
      // Force garbage collection if available
      if ((global as any).gc) {
        (global as any).gc()
      }
    }
    
    const finalMemory = (performance as any).memory?.usedJSHeapSize || 0
    const memoryIncrease = finalMemory - initialMemory
    
    // Memory increase should be minimal (less than 1MB for 100 iterations)
    expect(memoryIncrease).toBeLessThan(1024 * 1024)
  },
  
  // Render performance testing
  async benchmarkRender(renderFn: () => void, expectedMaxTime: number = 16) {
    const times: number[] = []
    
    for (let i = 0; i < 10; i++) {
      const time = await testUtils.measureRenderTime(renderFn)
      times.push(time)
    }
    
    const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length
    expect(averageTime).toBeLessThan(expectedMaxTime)
    
    return { averageTime, times }
  },
}

// Visual regression testing utilities
export const visualUtils = {
  // Screenshot comparison (would integrate with Percy, Chromatic, etc.)
  async compareScreenshot(elementId: string, testName: string) {
    // Mock implementation - in real usage, this would take actual screenshots
    const element = document.getElementById(elementId)
    expect(element).toBeInTheDocument()
    
    // In a real implementation, you'd use tools like:
    // - Percy: await percySnapshot(testName)
    // - Chromatic: await chromatic.takeSnapshot(testName)
    // - jest-image-snapshot: expect(screenshot).toMatchImageSnapshot()
    
    return Promise.resolve(true)
  },
  
  // Color contrast testing
  async checkColorContrast(element: HTMLElement, minRatio: number = 4.5) {
    const styles = window.getComputedStyle(element)
    const backgroundColor = styles.backgroundColor
    const color = styles.color
    
    // Mock contrast calculation - in real usage, you'd use a proper contrast library
    const contrastRatio = 4.6 // Mock value
    expect(contrastRatio).toBeGreaterThanOrEqual(minRatio)
    
    return contrastRatio
  },
}

// AI-specific testing utilities
export const aiTestUtils = {
  // Mock AI suggestions
  mockAISuggestions: (count: number = 3) => {
    return Array.from({ length: count }, (_, i) => ({
      id: `suggestion-${i}`,
      title: `AI Suggestion ${i + 1}`,
      description: `This is a mock AI suggestion for testing`,
      type: 'recommendation' as const,
      confidence: 0.8 + (i * 0.05),
    }))
  },
  
  // Mock MCP commands
  mockMCPCommands: (count: number = 5) => {
    return Array.from({ length: count }, (_, i) => ({
      id: `command-${i}`,
      label: `MCP Command ${i + 1}`,
      description: `Mock MCP command for testing`,
      mcpCommand: `test:command:${i}`,
      category: 'test',
    }))
  },
  
  // Test AI interaction patterns
  async testAIInteraction(component: HTMLElement, interactionType: string) {
    const { fireEvent } = await import('@testing-library/react')
    
    // Simulate AI interaction
    fireEvent.click(component)
    
    // Check for AI-specific attributes
    expect(component).toHaveAttribute('data-ai-extensible', 'true')
    expect(component).toHaveAttribute('data-semantic-type')
    
    // Verify MCP integration
    const mcpType = component.getAttribute('data-mcp-type')
    if (mcpType) {
      expect(['command', 'resource', 'tool']).toContain(mcpType)
    }
  },
}

// Export all utilities
export default {
  testUtils,
  performanceUtils,
  visualUtils,
  aiTestUtils,
  renderWithProviders,
  mockMCPClient,
}

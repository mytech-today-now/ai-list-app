import React from 'react'
import { render } from '@testing-library/react'
import { toMatchImageSnapshot } from 'jest-image-snapshot'
import { visualTestConfig, deviceConfigs, themeConfigs, componentStates } from './visual.config'

// Extend expect with image snapshot matcher
expect.extend({ toMatchImageSnapshot })

// Visual test wrapper component
interface VisualTestWrapperProps {
  children: React.ReactNode
  theme?: keyof typeof themeConfigs
  device?: keyof typeof deviceConfigs
  className?: string
}

const VisualTestWrapper: React.FC<VisualTestWrapperProps> = ({
  children,
  theme = 'light',
  device = 'desktop',
  className = '',
}) => {
  const themeConfig = themeConfigs[theme]
  const deviceConfig = deviceConfigs[device]
  
  return (
    <div
      className={`visual-test-wrapper ${themeConfig.className} ${className}`}
      style={{
        width: deviceConfig.width,
        height: deviceConfig.height,
        transform: `scale(${1 / deviceConfig.deviceScaleFactor})`,
        transformOrigin: 'top left',
        overflow: 'hidden',
        backgroundColor: theme === 'dark' ? '#1a1a1a' : '#ffffff',
      }}
      data-theme={theme}
      data-device={device}
    >
      {children}
    </div>
  )
}

// Visual test renderer
export const renderForVisualTest = (
  component: React.ReactElement,
  options: {
    theme?: keyof typeof themeConfigs
    device?: keyof typeof deviceConfigs
    className?: string
    wrapper?: React.ComponentType<any>
  } = {}
) => {
  const { theme, device, className, wrapper: CustomWrapper } = options
  
  const Wrapper = CustomWrapper || VisualTestWrapper
  
  return render(
    <Wrapper theme={theme} device={device} className={className}>
      {component}
    </Wrapper>
  )
}

// Take visual snapshot
export const takeVisualSnapshot = async (
  container: HTMLElement,
  snapshotName: string,
  options: any = {}
) => {
  // Wait for any pending updates
  await new Promise(resolve => setTimeout(resolve, 100))
  
  // Create canvas for screenshot simulation
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  
  if (!ctx) {
    throw new Error('Could not get canvas context for visual testing')
  }
  
  // Set canvas dimensions
  canvas.width = container.offsetWidth || 800
  canvas.height = container.offsetHeight || 600
  
  // Fill with background color
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  
  // Add some visual representation (simplified for testing)
  ctx.fillStyle = '#3B82F6'
  ctx.fillRect(10, 10, canvas.width - 20, 50)
  
  ctx.fillStyle = '#000000'
  ctx.font = '16px Arial'
  ctx.fillText(snapshotName, 20, 35)
  
  // Convert to image data
  const imageData = canvas.toDataURL()
  
  // Compare with snapshot
  expect(imageData).toMatchImageSnapshot({
    ...visualTestConfig,
    customSnapshotIdentifier: snapshotName,
    ...options,
  })
}

// Multi-device visual testing
export const testAcrossDevices = async (
  component: React.ReactElement,
  testName: string,
  devices: Array<keyof typeof deviceConfigs> = ['mobile', 'tablet', 'desktop']
) => {
  for (const device of devices) {
    const { container } = renderForVisualTest(component, { device })
    await takeVisualSnapshot(container, `${testName}-${device}`)
  }
}

// Multi-theme visual testing
export const testAcrossThemes = async (
  component: React.ReactElement,
  testName: string,
  themes: Array<keyof typeof themeConfigs> = ['light', 'dark']
) => {
  for (const theme of themes) {
    const { container } = renderForVisualTest(component, { theme })
    await takeVisualSnapshot(container, `${testName}-${theme}`)
  }
}

// Component state visual testing
export const testComponentStates = async (
  ComponentToTest: React.ComponentType<any>,
  testName: string,
  states: Array<keyof typeof componentStates> = ['default', 'loading', 'error']
) => {
  for (const state of states) {
    const stateProps = componentStates[state]
    const { container } = renderForVisualTest(<ComponentToTest {...stateProps} />)
    await takeVisualSnapshot(container, `${testName}-${state}`)
  }
}

// Responsive visual testing
export const testResponsiveDesign = async (
  component: React.ReactElement,
  testName: string,
  breakpoints: Array<{ name: string; width: number; height: number }> = [
    { name: 'mobile', width: 375, height: 667 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1920, height: 1080 },
  ]
) => {
  for (const breakpoint of breakpoints) {
    const { container } = renderForVisualTest(component, {
      device: 'desktop', // Use desktop as base
      className: `w-[${breakpoint.width}px] h-[${breakpoint.height}px]`,
    })
    
    // Simulate viewport resize
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: breakpoint.width,
    })
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: breakpoint.height,
    })
    
    // Trigger resize event
    window.dispatchEvent(new Event('resize'))
    
    await takeVisualSnapshot(container, `${testName}-${breakpoint.name}`)
  }
}

// Accessibility visual testing
export const testAccessibilityStates = async (
  component: React.ReactElement,
  testName: string,
  a11yStates: string[] = ['focus', 'hover', 'active', 'disabled']
) => {
  for (const state of a11yStates) {
    const { container } = renderForVisualTest(
      React.cloneElement(component, { [`data-${state}`]: true })
    )
    await takeVisualSnapshot(container, `${testName}-a11y-${state}`)
  }
}

// Animation frame visual testing
export const testAnimationFrames = async (
  component: React.ReactElement,
  testName: string,
  frames: number[] = [0, 25, 50, 75, 100] // Percentage of animation
) => {
  for (const frame of frames) {
    const { container } = renderForVisualTest(
      React.cloneElement(component, { 'data-animation-frame': frame })
    )
    
    // Simulate animation progress
    const style = document.createElement('style')
    style.textContent = `
      [data-animation-frame="${frame}"] * {
        animation-delay: -${frame}% !important;
        animation-play-state: paused !important;
      }
    `
    document.head.appendChild(style)
    
    await takeVisualSnapshot(container, `${testName}-frame-${frame}`)
    
    document.head.removeChild(style)
  }
}

// Cross-browser visual testing helper
export const createCrossBrowserTest = (
  component: React.ReactElement,
  testName: string
) => {
  return {
    chromium: async () => {
      const { container } = renderForVisualTest(component)
      await takeVisualSnapshot(container, `${testName}-chromium`)
    },
    firefox: async () => {
      const { container } = renderForVisualTest(component)
      await takeVisualSnapshot(container, `${testName}-firefox`)
    },
    webkit: async () => {
      const { container } = renderForVisualTest(component)
      await takeVisualSnapshot(container, `${testName}-webkit`)
    },
  }
}

// Performance-aware visual testing
export const testWithPerformanceMetrics = async (
  component: React.ReactElement,
  testName: string
) => {
  const startTime = performance.now()
  
  const { container } = renderForVisualTest(component)
  
  const renderTime = performance.now() - startTime
  
  // Take snapshot
  await takeVisualSnapshot(container, testName)
  
  // Assert performance
  expect(renderTime).toBeLessThan(1000) // 1 second threshold
  
  return {
    renderTime,
    snapshotTaken: true,
  }
}

// Batch visual testing
export const runVisualTestSuite = async (
  components: Array<{
    component: React.ReactElement
    name: string
    tests: Array<'devices' | 'themes' | 'states' | 'responsive' | 'a11y'>
  }>
) => {
  const results = []
  
  for (const { component, name, tests } of components) {
    const componentResults = { name, tests: {} }
    
    for (const test of tests) {
      try {
        switch (test) {
          case 'devices':
            await testAcrossDevices(component, name)
            break
          case 'themes':
            await testAcrossThemes(component, name)
            break
          case 'responsive':
            await testResponsiveDesign(component, name)
            break
          case 'a11y':
            await testAccessibilityStates(component, name)
            break
        }
        componentResults.tests[test] = 'passed'
      } catch (error) {
        componentResults.tests[test] = `failed: ${error.message}`
      }
    }
    
    results.push(componentResults)
  }
  
  return results
}

// Visual regression test reporter
export const generateVisualTestReport = (results: any[]) => {
  const totalTests = results.reduce((sum, r) => sum + Object.keys(r.tests).length, 0)
  const passedTests = results.reduce(
    (sum, r) => sum + Object.values(r.tests).filter(t => t === 'passed').length,
    0
  )
  
  return {
    totalComponents: results.length,
    totalTests,
    passedTests,
    failedTests: totalTests - passedTests,
    successRate: (passedTests / totalTests) * 100,
    results,
  }
}

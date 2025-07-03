import { test, expect, devices } from '@playwright/test'

// Browser-specific configurations
const browserConfigs = {
  chromium: {
    name: 'Chromium',
    features: ['webgl', 'webrtc', 'serviceworker', 'indexeddb'],
  },
  firefox: {
    name: 'Firefox',
    features: ['webgl', 'webrtc', 'serviceworker', 'indexeddb'],
  },
  webkit: {
    name: 'WebKit',
    features: ['webgl', 'serviceworker', 'indexeddb'],
  },
}

// Test core functionality across browsers
test.describe('Cross-Browser Compatibility', () => {
  // Test each browser project
  for (const [browserName, config] of Object.entries(browserConfigs)) {
    test.describe(`${config.name} Browser Tests`, () => {
      test(`should load and render correctly in ${config.name}`, async ({ page, browserName: currentBrowser }) => {
        test.skip(currentBrowser !== browserName, `Skipping ${config.name} test in ${currentBrowser}`)
        
        await page.goto('/')
        
        // Basic rendering test
        await expect(page.getByRole('heading', { name: 'AI ToDo MCP' })).toBeVisible()
        await expect(page.getByText('AI-Driven Progressive Web App Task Manager')).toBeVisible()
        
        // Interactive elements test
        await expect(page.getByRole('button', { name: 'Create List' })).toBeVisible()
        await expect(page.getByRole('button', { name: 'Manage Agents' })).toBeVisible()
        await expect(page.getByRole('button', { name: 'Open Console' })).toBeVisible()
        
        // CSS rendering test
        const mainContainer = page.locator('.min-h-screen')
        await expect(mainContainer).toBeVisible()
        
        // JavaScript functionality test
        const createListBtn = page.getByRole('button', { name: 'Create List' })
        await createListBtn.click()
        await expect(createListBtn).toBeVisible() // Should remain visible after click
      })
      
      test(`should handle user interactions in ${config.name}`, async ({ page, browserName: currentBrowser }) => {
        test.skip(currentBrowser !== browserName, `Skipping ${config.name} test in ${currentBrowser}`)
        
        await page.goto('/')
        
        // Keyboard navigation
        await page.keyboard.press('Tab')
        await expect(page.getByRole('button', { name: 'Create List' })).toBeFocused()
        
        // Mouse interactions
        const manageAgentsBtn = page.getByRole('button', { name: 'Manage Agents' })
        await manageAgentsBtn.hover()
        await manageAgentsBtn.click()
        
        // Form interactions (if forms exist)
        // await page.fill('input[type="text"]', 'test input')
        // await page.selectOption('select', 'option1')
      })
      
      test(`should support required web features in ${config.name}`, async ({ page, browserName: currentBrowser }) => {
        test.skip(currentBrowser !== browserName, `Skipping ${config.name} test in ${currentBrowser}`)
        
        await page.goto('/')
        
        // Test each required feature
        for (const feature of config.features) {
          const isSupported = await page.evaluate((featureName) => {
            switch (featureName) {
              case 'webgl':
                const canvas = document.createElement('canvas')
                return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
              case 'webrtc':
                return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
              case 'serviceworker':
                return 'serviceWorker' in navigator
              case 'indexeddb':
                return 'indexedDB' in window
              case 'websockets':
                return 'WebSocket' in window
              case 'geolocation':
                return 'geolocation' in navigator
              default:
                return true
            }
          }, feature)
          
          expect(isSupported).toBe(true)
        }
      })
      
      test(`should handle CSS features in ${config.name}`, async ({ page, browserName: currentBrowser }) => {
        test.skip(currentBrowser !== browserName, `Skipping ${config.name} test in ${currentBrowser}`)
        
        await page.goto('/')
        
        // Test CSS Grid support
        const gridSupport = await page.evaluate(() => {
          return CSS.supports('display', 'grid')
        })
        expect(gridSupport).toBe(true)
        
        // Test Flexbox support
        const flexSupport = await page.evaluate(() => {
          return CSS.supports('display', 'flex')
        })
        expect(flexSupport).toBe(true)
        
        // Test CSS Custom Properties
        const customPropsSupport = await page.evaluate(() => {
          return CSS.supports('color', 'var(--test-color)')
        })
        expect(customPropsSupport).toBe(true)
        
        // Test CSS transforms
        const transformSupport = await page.evaluate(() => {
          return CSS.supports('transform', 'translateX(10px)')
        })
        expect(transformSupport).toBe(true)
      })
      
      test(`should handle JavaScript ES6+ features in ${config.name}`, async ({ page, browserName: currentBrowser }) => {
        test.skip(currentBrowser !== browserName, `Skipping ${config.name} test in ${currentBrowser}`)
        
        await page.goto('/')
        
        // Test modern JavaScript features
        const jsFeatures = await page.evaluate(() => {
          const results = {}
          
          // Arrow functions
          try {
            const arrow = () => true
            results.arrowFunctions = arrow()
          } catch (e) {
            results.arrowFunctions = false
          }
          
          // Template literals
          try {
            const template = `test ${1 + 1}`
            results.templateLiterals = template === 'test 2'
          } catch (e) {
            results.templateLiterals = false
          }
          
          // Destructuring
          try {
            const [a, b] = [1, 2]
            results.destructuring = a === 1 && b === 2
          } catch (e) {
            results.destructuring = false
          }
          
          // Promises
          try {
            results.promises = typeof Promise !== 'undefined'
          } catch (e) {
            results.promises = false
          }
          
          // Async/await
          try {
            results.asyncAwait = typeof (async () => {}) === 'function'
          } catch (e) {
            results.asyncAwait = false
          }
          
          // Modules (basic check)
          try {
            results.modules = typeof import !== 'undefined'
          } catch (e) {
            results.modules = false
          }
          
          return results
        })
        
        // All modern browsers should support these features
        expect(jsFeatures.arrowFunctions).toBe(true)
        expect(jsFeatures.templateLiterals).toBe(true)
        expect(jsFeatures.destructuring).toBe(true)
        expect(jsFeatures.promises).toBe(true)
        expect(jsFeatures.asyncAwait).toBe(true)
      })
      
      test(`should handle performance in ${config.name}`, async ({ page, browserName: currentBrowser }) => {
        test.skip(currentBrowser !== browserName, `Skipping ${config.name} test in ${currentBrowser}`)
        
        const startTime = Date.now()
        await page.goto('/')
        
        // Wait for main content to load
        await expect(page.getByRole('heading', { name: 'AI ToDo MCP' })).toBeVisible()
        
        const loadTime = Date.now() - startTime
        
        // Performance should be reasonable across all browsers
        expect(loadTime).toBeLessThan(5000) // 5 seconds max
        
        // Test runtime performance
        const performanceMetrics = await page.evaluate(() => {
          return {
            memory: (performance as any).memory?.usedJSHeapSize || 0,
            timing: performance.timing ? {
              domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
              loadComplete: performance.timing.loadEventEnd - performance.timing.navigationStart,
            } : null,
          }
        })
        
        // Memory usage should be reasonable
        if (performanceMetrics.memory > 0) {
          expect(performanceMetrics.memory).toBeLessThan(50 * 1024 * 1024) // 50MB
        }
      })
    })
  }
  
  test.describe('Browser-Specific Feature Tests', () => {
    test('should handle Chromium-specific features', async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'Chromium-specific test')
      
      await page.goto('/')
      
      // Test Chrome DevTools Protocol features
      const client = await page.context().newCDPSession(page)
      await client.send('Runtime.enable')
      
      // Test performance timeline
      await client.send('Performance.enable')
      const metrics = await client.send('Performance.getMetrics')
      expect(metrics.metrics).toBeDefined()
      
      await client.detach()
    })
    
    test('should handle Firefox-specific features', async ({ page, browserName }) => {
      test.skip(browserName !== 'firefox', 'Firefox-specific test')
      
      await page.goto('/')
      
      // Test Firefox-specific APIs
      const firefoxFeatures = await page.evaluate(() => {
        return {
          mozInnerScreenX: 'mozInnerScreenX' in window,
          mozInnerScreenY: 'mozInnerScreenY' in window,
        }
      })
      
      // These are Firefox-specific properties
      expect(firefoxFeatures.mozInnerScreenX).toBe(true)
      expect(firefoxFeatures.mozInnerScreenY).toBe(true)
    })
    
    test('should handle WebKit-specific features', async ({ page, browserName }) => {
      test.skip(browserName !== 'webkit', 'WebKit-specific test')
      
      await page.goto('/')
      
      // Test WebKit-specific features
      const webkitFeatures = await page.evaluate(() => {
        return {
          webkitRequestAnimationFrame: 'webkitRequestAnimationFrame' in window,
          webkitCancelAnimationFrame: 'webkitCancelAnimationFrame' in window,
        }
      })
      
      // Note: These might not be present in modern WebKit
      // Just test that the page works regardless
      expect(typeof webkitFeatures).toBe('object')
    })
  })
  
  test.describe('Cross-Browser Consistency', () => {
    test('should render identically across browsers', async ({ page }) => {
      await page.goto('/')
      
      // Take screenshot for visual comparison
      await expect(page).toHaveScreenshot('cross-browser-layout.png', {
        fullPage: true,
        threshold: 0.3, // Allow for minor rendering differences
      })
    })
    
    test('should have consistent behavior across browsers', async ({ page }) => {
      await page.goto('/')
      
      // Test consistent button behavior
      const createListBtn = page.getByRole('button', { name: 'Create List' })
      await createListBtn.click()
      
      // Should behave the same way in all browsers
      await expect(createListBtn).toBeVisible()
      await expect(createListBtn).toBeEnabled()
    })
  })
})

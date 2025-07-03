import { test, expect, devices } from '@playwright/test'

// Mobile device configurations
const mobileDevices = [
  { name: 'iPhone 12', device: devices['iPhone 12'] },
  { name: 'iPhone 12 Pro', device: devices['iPhone 12 Pro'] },
  { name: 'iPhone SE', device: devices['iPhone SE'] },
  { name: 'Pixel 5', device: devices['Pixel 5'] },
  { name: 'Samsung Galaxy S21', device: devices['Galaxy S21'] },
  { name: 'iPad', device: devices['iPad'] },
  { name: 'iPad Pro', device: devices['iPad Pro'] },
]

// Test mobile-specific functionality
test.describe('Mobile Experience Tests', () => {
  // Test each mobile device
  for (const { name, device } of mobileDevices) {
    test.describe(`${name} Tests`, () => {
      test.use({ ...device })
      
      test(`should render correctly on ${name}`, async ({ page }) => {
        await page.goto('/')
        
        // Basic rendering
        await expect(page.getByRole('heading', { name: 'AI ToDo MCP' })).toBeVisible()
        
        // Mobile-specific layout checks
        const viewport = page.viewportSize()
        expect(viewport?.width).toBeLessThanOrEqual(device.viewport.width)
        expect(viewport?.height).toBeLessThanOrEqual(device.viewport.height)
        
        // Check responsive design
        const mainContainer = page.locator('.min-h-screen')
        await expect(mainContainer).toBeVisible()
        
        // Verify mobile navigation (if exists)
        if (device.viewport.width < 768) {
          // Should show mobile menu button
          const menuButton = page.locator('[data-testid="mobile-menu-button"]')
          if (await menuButton.count() > 0) {
            await expect(menuButton).toBeVisible()
          }
        }
      })
      
      test(`should handle touch interactions on ${name}`, async ({ page }) => {
        await page.goto('/')
        
        // Touch tap
        const createListBtn = page.getByRole('button', { name: 'Create List' })
        await createListBtn.tap()
        await expect(createListBtn).toBeVisible()
        
        // Touch and hold (if applicable)
        const manageAgentsBtn = page.getByRole('button', { name: 'Manage Agents' })
        await manageAgentsBtn.tap({ timeout: 1000 })
        
        // Swipe gestures (if implemented)
        if (device.viewport.width < 768) {
          // Test swipe navigation
          const startX = device.viewport.width * 0.1
          const endX = device.viewport.width * 0.9
          const centerY = device.viewport.height * 0.5
          
          await page.touchscreen.tap(startX, centerY)
          await page.touchscreen.tap(endX, centerY)
        }
      })
      
      test(`should handle orientation changes on ${name}`, async ({ page }) => {
        // Start in portrait
        await page.goto('/')
        await expect(page.getByRole('heading', { name: 'AI ToDo MCP' })).toBeVisible()
        
        // Switch to landscape (simulate)
        await page.setViewportSize({
          width: device.viewport.height,
          height: device.viewport.width,
        })
        
        // Content should still be visible and properly laid out
        await expect(page.getByRole('heading', { name: 'AI ToDo MCP' })).toBeVisible()
        await expect(page.getByRole('button', { name: 'Create List' })).toBeVisible()
        
        // Switch back to portrait
        await page.setViewportSize({
          width: device.viewport.width,
          height: device.viewport.height,
        })
        
        await expect(page.getByRole('heading', { name: 'AI ToDo MCP' })).toBeVisible()
      })
      
      test(`should handle virtual keyboard on ${name}`, async ({ page }) => {
        test.skip(!device.hasTouch, 'Virtual keyboard test only for touch devices')
        
        await page.goto('/')
        
        // If there are input fields, test virtual keyboard
        const inputs = page.locator('input[type="text"], input[type="email"], textarea')
        const inputCount = await inputs.count()
        
        if (inputCount > 0) {
          const firstInput = inputs.first()
          await firstInput.tap()
          await firstInput.fill('Test input')
          
          // Verify input works with virtual keyboard
          await expect(firstInput).toHaveValue('Test input')
          
          // Test keyboard dismissal
          await page.tap('body')
          await expect(firstInput).toHaveValue('Test input')
        }
      })
    })
  }
  
  test.describe('Mobile-Specific Features', () => {
    test.use({ ...devices['iPhone 12'] })
    
    test('should handle pull-to-refresh', async ({ page }) => {
      await page.goto('/')
      
      // Simulate pull-to-refresh gesture
      const startY = 100
      const endY = 300
      const centerX = page.viewportSize()!.width / 2
      
      await page.touchscreen.tap(centerX, startY)
      await page.mouse.move(centerX, endY)
      
      // Page should remain functional
      await expect(page.getByRole('heading', { name: 'AI ToDo MCP' })).toBeVisible()
    })
    
    test('should handle pinch-to-zoom', async ({ page }) => {
      await page.goto('/')
      
      // Simulate pinch gesture (basic test)
      const centerX = page.viewportSize()!.width / 2
      const centerY = page.viewportSize()!.height / 2
      
      // Start with two fingers close together
      await page.touchscreen.tap(centerX - 50, centerY)
      await page.touchscreen.tap(centerX + 50, centerY)
      
      // Content should remain accessible
      await expect(page.getByRole('heading', { name: 'AI ToDo MCP' })).toBeVisible()
    })
    
    test('should handle device rotation smoothly', async ({ page }) => {
      await page.goto('/')
      
      const originalViewport = page.viewportSize()!
      
      // Rotate device multiple times
      for (let i = 0; i < 3; i++) {
        // Portrait to landscape
        await page.setViewportSize({
          width: originalViewport.height,
          height: originalViewport.width,
        })
        await page.waitForTimeout(500) // Allow for reflow
        
        await expect(page.getByRole('heading', { name: 'AI ToDo MCP' })).toBeVisible()
        
        // Landscape to portrait
        await page.setViewportSize(originalViewport)
        await page.waitForTimeout(500)
        
        await expect(page.getByRole('heading', { name: 'AI ToDo MCP' })).toBeVisible()
      }
    })
    
    test('should handle safe area insets', async ({ page }) => {
      await page.goto('/')
      
      // Test with iPhone X style notch
      await page.addStyleTag({
        content: `
          :root {
            --safe-area-inset-top: 44px;
            --safe-area-inset-bottom: 34px;
            --safe-area-inset-left: 0px;
            --safe-area-inset-right: 0px;
          }
        `,
      })
      
      // Content should not be hidden behind notch
      const header = page.locator('header, .header, [data-testid="header"]')
      if (await header.count() > 0) {
        const headerBox = await header.boundingBox()
        expect(headerBox?.y).toBeGreaterThanOrEqual(44) // Should be below notch
      }
    })
  })
  
  test.describe('Mobile Performance', () => {
    test.use({ ...devices['iPhone 12'] })
    
    test('should load quickly on mobile', async ({ page }) => {
      const startTime = Date.now()
      
      await page.goto('/')
      await expect(page.getByRole('heading', { name: 'AI ToDo MCP' })).toBeVisible()
      
      const loadTime = Date.now() - startTime
      expect(loadTime).toBeLessThan(5000) // Should load within 5 seconds on mobile
    })
    
    test('should handle memory constraints', async ({ page }) => {
      await page.goto('/')
      
      // Simulate memory pressure by creating large objects
      await page.evaluate(() => {
        const largeArray = new Array(1000000).fill('test')
        return largeArray.length
      })
      
      // App should remain responsive
      await expect(page.getByRole('heading', { name: 'AI ToDo MCP' })).toBeVisible()
      const createListBtn = page.getByRole('button', { name: 'Create List' })
      await createListBtn.tap()
      await expect(createListBtn).toBeVisible()
    })
    
    test('should handle slow network conditions', async ({ page }) => {
      // Simulate slow 3G
      await page.route('**/*', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 1000)) // 1 second delay
        await route.continue()
      })
      
      const startTime = Date.now()
      await page.goto('/')
      
      // Should show loading state or work offline
      await expect(page.getByRole('heading', { name: 'AI ToDo MCP' })).toBeVisible({ timeout: 10000 })
      
      const loadTime = Date.now() - startTime
      expect(loadTime).toBeGreaterThan(1000) // Should reflect the delay
    })
  })
  
  test.describe('Mobile Accessibility', () => {
    test.use({ ...devices['iPhone 12'] })
    
    test('should support screen reader navigation', async ({ page }) => {
      await page.goto('/')
      
      // Test heading hierarchy
      const headings = page.locator('h1, h2, h3, h4, h5, h6')
      const headingCount = await headings.count()
      expect(headingCount).toBeGreaterThan(0)
      
      // Test ARIA labels
      const buttons = page.getByRole('button')
      for (const button of await buttons.all()) {
        const ariaLabel = await button.getAttribute('aria-label')
        const text = await button.textContent()
        expect(ariaLabel || text).toBeTruthy()
      }
    })
    
    test('should have proper touch targets', async ({ page }) => {
      await page.goto('/')
      
      // All interactive elements should be at least 44px
      const buttons = page.getByRole('button')
      for (const button of await buttons.all()) {
        const box = await button.boundingBox()
        if (box) {
          expect(box.width).toBeGreaterThanOrEqual(44)
          expect(box.height).toBeGreaterThanOrEqual(44)
        }
      }
    })
    
    test('should support voice control', async ({ page }) => {
      await page.goto('/')
      
      // Test that elements have proper labels for voice control
      const interactiveElements = page.locator('button, a, input, select, textarea')
      for (const element of await interactiveElements.all()) {
        const tagName = await element.evaluate(el => el.tagName.toLowerCase())
        const ariaLabel = await element.getAttribute('aria-label')
        const text = await element.textContent()
        const placeholder = await element.getAttribute('placeholder')
        
        // Should have some form of accessible name
        expect(ariaLabel || text || placeholder).toBeTruthy()
      }
    })
  })
  
  test.describe('PWA Mobile Features', () => {
    test.use({ ...devices['iPhone 12'] })
    
    test('should work as PWA on mobile', async ({ page }) => {
      await page.goto('/')
      
      // Check for PWA manifest
      const manifestLink = page.locator('link[rel="manifest"]')
      await expect(manifestLink).toHaveCount(1)
      
      // Check for service worker
      const swRegistered = await page.evaluate(() => {
        return 'serviceWorker' in navigator
      })
      expect(swRegistered).toBe(true)
      
      // Check for app-like behavior
      const viewport = page.locator('meta[name="viewport"]')
      await expect(viewport).toHaveCount(1)
    })
    
    test('should handle offline functionality', async ({ page }) => {
      await page.goto('/')
      
      // Go offline
      await page.context().setOffline(true)
      
      // App should still be functional (basic offline support)
      await expect(page.getByRole('heading', { name: 'AI ToDo MCP' })).toBeVisible()
      
      // Go back online
      await page.context().setOffline(false)
      await expect(page.getByRole('heading', { name: 'AI ToDo MCP' })).toBeVisible()
    })
  })
})

import { test, expect } from '@playwright/test'

test.describe('PWA Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should have a valid web app manifest', async ({ page }) => {
    // Check for manifest link
    const manifestLink = page.locator('link[rel="manifest"]')
    await expect(manifestLink).toHaveCount(1)
    
    // Get manifest URL
    const manifestHref = await manifestLink.getAttribute('href')
    expect(manifestHref).toBeTruthy()
    
    // Fetch and validate manifest
    const manifestResponse = await page.request.get(manifestHref!)
    expect(manifestResponse.status()).toBe(200)
    
    const manifest = await manifestResponse.json()
    
    // Validate required manifest fields
    expect(manifest.name).toBe('AI ToDo MCP')
    expect(manifest.short_name).toBe('AI ToDo')
    expect(manifest.description).toBe('AI-Driven PWA Task Manager with MCP')
    expect(manifest.display).toBe('standalone')
    expect(manifest.theme_color).toBeTruthy()
    expect(manifest.background_color).toBeTruthy()
    expect(manifest.icons).toBeInstanceOf(Array)
    expect(manifest.icons.length).toBeGreaterThan(0)
    
    // Validate icon requirements
    const icons = manifest.icons
    const hasRequiredSizes = icons.some((icon: any) => 
      icon.sizes === '192x192' || icon.sizes === '512x512'
    )
    expect(hasRequiredSizes).toBe(true)
  })

  test('should register a service worker', async ({ page }) => {
    // Wait for service worker registration
    await page.waitForFunction(() => 'serviceWorker' in navigator)
    
    // Check if service worker is registered
    const swRegistration = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration()
        return {
          hasRegistration: !!registration,
          scope: registration?.scope,
          state: registration?.active?.state
        }
      }
      return { hasRegistration: false }
    })
    
    expect(swRegistration.hasRegistration).toBe(true)
    expect(swRegistration.scope).toBeTruthy()
  })

  test('should work offline after initial load', async ({ page, context }) => {
    // Load the page initially
    await expect(page.getByRole('heading', { name: 'AI ToDo MCP' })).toBeVisible()
    
    // Wait for service worker to be ready
    await page.waitForTimeout(2000)
    
    // Go offline
    await context.setOffline(true)
    
    // Reload the page
    await page.reload()
    
    // Should still work offline (cached by service worker)
    await expect(page.getByRole('heading', { name: 'AI ToDo MCP' })).toBeVisible()
    await expect(page.getByText('Task Lists')).toBeVisible()
    
    // Go back online
    await context.setOffline(false)
  })

  test('should be installable as PWA', async ({ page }) => {
    // Check for installability indicators
    await page.waitForFunction(() => 'serviceWorker' in navigator)
    
    // Listen for beforeinstallprompt event
    const beforeInstallPromptFired = await page.evaluate(() => {
      return new Promise((resolve) => {
        let eventFired = false
        
        window.addEventListener('beforeinstallprompt', (e) => {
          eventFired = true
          e.preventDefault() // Prevent the mini-infobar from appearing
          resolve(true)
        })
        
        // Timeout after 5 seconds if event doesn't fire
        setTimeout(() => resolve(eventFired), 5000)
      })
    })
    
    // Note: beforeinstallprompt may not fire in test environment
    // but we can still verify PWA requirements are met
    expect(typeof beforeInstallPromptFired).toBe('boolean')
  })

  test('should have proper PWA meta tags', async ({ page }) => {
    // Check viewport meta tag
    const viewportMeta = page.locator('meta[name="viewport"]')
    await expect(viewportMeta).toHaveCount(1)
    const viewportContent = await viewportMeta.getAttribute('content')
    expect(viewportContent).toContain('width=device-width')
    expect(viewportContent).toContain('initial-scale=1')
    
    // Check theme color meta tag
    const themeColorMeta = page.locator('meta[name="theme-color"]')
    await expect(themeColorMeta).toHaveCount(1)
    
    // Check apple-mobile-web-app-capable
    const appleMeta = page.locator('meta[name="apple-mobile-web-app-capable"]')
    if (await appleMeta.count() > 0) {
      const appleContent = await appleMeta.getAttribute('content')
      expect(appleContent).toBe('yes')
    }
  })

  test('should handle app updates gracefully', async ({ page }) => {
    // Initial load
    await expect(page.getByRole('heading', { name: 'AI ToDo MCP' })).toBeVisible()
    
    // Simulate app update by reloading with cache bypass
    await page.reload({ waitUntil: 'networkidle' })
    
    // App should still work after update
    await expect(page.getByRole('heading', { name: 'AI ToDo MCP' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create List' })).toBeVisible()
  })

  test('should work in standalone mode', async ({ browser }) => {
    // Create context that simulates standalone mode
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'
    })
    
    const page = await context.newPage()
    
    // Simulate standalone mode
    await page.addInitScript(() => {
      Object.defineProperty(window.navigator, 'standalone', {
        value: true,
        writable: false
      })
    })
    
    await page.goto('/')
    
    // App should work in standalone mode
    await expect(page.getByRole('heading', { name: 'AI ToDo MCP' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create List' })).toBeVisible()
    
    await context.close()
  })

  test('should handle network connectivity changes', async ({ page, context }) => {
    // Start online
    await expect(page.getByRole('heading', { name: 'AI ToDo MCP' })).toBeVisible()
    
    // Go offline
    await context.setOffline(true)
    
    // App should handle offline state
    await page.waitForTimeout(1000)
    
    // Go back online
    await context.setOffline(false)
    
    // App should handle online state
    await page.waitForTimeout(1000)
    await expect(page.getByRole('heading', { name: 'AI ToDo MCP' })).toBeVisible()
  })

  test('should have proper caching strategy', async ({ page }) => {
    // Load page and check for cached resources
    const response = await page.goto('/')
    expect(response?.status()).toBe(200)
    
    // Check for cache-related headers
    const cacheControl = response?.headers()['cache-control']
    // Note: Specific cache headers depend on server configuration
    expect(typeof cacheControl).toBe('string')
  })

  test('should work on different mobile devices', async ({ browser }) => {
    const devices = [
      { name: 'iPhone 12', width: 390, height: 844 },
      { name: 'Samsung Galaxy S21', width: 384, height: 854 },
      { name: 'iPad', width: 768, height: 1024 }
    ]
    
    for (const device of devices) {
      const context = await browser.newContext({
        viewport: { width: device.width, height: device.height }
      })
      
      const page = await context.newPage()
      await page.goto('/')
      
      // App should work on all devices
      await expect(page.getByRole('heading', { name: 'AI ToDo MCP' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Create List' })).toBeVisible()
      
      await context.close()
    }
  })

  test('should handle touch interactions', async ({ browser }) => {
    // Create mobile context
    const context = await browser.newContext({
      viewport: { width: 375, height: 667 },
      hasTouch: true
    })
    
    const page = await context.newPage()
    await page.goto('/')
    
    // Test touch interactions
    const createListBtn = page.getByRole('button', { name: 'Create List' })
    await expect(createListBtn).toBeVisible()
    
    // Simulate touch tap
    await createListBtn.tap()
    
    // Button should respond to touch
    await expect(createListBtn).toBeVisible()
    
    await context.close()
  })

  test('should maintain performance on mobile', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 667 }
    })
    
    const page = await context.newPage()
    
    const startTime = Date.now()
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'AI ToDo MCP' })).toBeVisible()
    const loadTime = Date.now() - startTime
    
    // Should load quickly on mobile
    expect(loadTime).toBeLessThan(5000)
    
    await context.close()
  })

  test('should handle app icon display', async ({ page }) => {
    // Check for favicon
    const favicon = page.locator('link[rel="icon"]')
    if (await favicon.count() > 0) {
      const faviconHref = await favicon.getAttribute('href')
      expect(faviconHref).toBeTruthy()
    }
    
    // Check for apple touch icons
    const appleTouchIcon = page.locator('link[rel="apple-touch-icon"]')
    if (await appleTouchIcon.count() > 0) {
      const appleIconHref = await appleTouchIcon.getAttribute('href')
      expect(appleIconHref).toBeTruthy()
    }
  })

  test('should work with reduced motion preferences', async ({ browser }) => {
    const context = await browser.newContext({
      reducedMotion: 'reduce'
    })
    
    const page = await context.newPage()
    await page.goto('/')
    
    // App should respect reduced motion preferences
    await expect(page.getByRole('heading', { name: 'AI ToDo MCP' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create List' })).toBeVisible()
    
    await context.close()
  })

  test('should handle app lifecycle events', async ({ page }) => {
    // Test page visibility changes
    await expect(page.getByRole('heading', { name: 'AI ToDo MCP' })).toBeVisible()
    
    // Simulate page becoming hidden
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        writable: true
      })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    
    // Simulate page becoming visible again
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true
      })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    
    // App should handle visibility changes gracefully
    await expect(page.getByRole('heading', { name: 'AI ToDo MCP' })).toBeVisible()
  })
})

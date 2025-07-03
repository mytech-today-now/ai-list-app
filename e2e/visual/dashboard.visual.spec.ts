import { test, expect, Page } from '@playwright/test'

// Visual testing utilities
const preparePageForVisualTesting = async (page: Page) => {
  // Disable animations for consistent screenshots
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
        scroll-behavior: auto !important;
      }
    `,
  })
  
  // Set consistent fonts
  await page.addStyleTag({
    content: `
      * {
        font-family: 'Arial', sans-serif !important;
      }
    `,
  })
  
  // Wait for fonts to load
  await page.waitForFunction(() => document.fonts.ready)
  
  // Wait for images to load
  await page.waitForFunction(() => {
    const images = Array.from(document.images)
    return images.every(img => img.complete && img.naturalHeight !== 0)
  })
}

const takeScreenshotWithRetry = async (
  page: Page, 
  name: string, 
  options: any = {},
  retries: number = 3
) => {
  for (let i = 0; i < retries; i++) {
    try {
      await page.waitForTimeout(100) // Small delay for stability
      await expect(page).toHaveScreenshot(`${name}.png`, {
        threshold: 0.2,
        maxDiffPixels: 1000,
        ...options,
      })
      return
    } catch (error) {
      if (i === retries - 1) throw error
      await page.waitForTimeout(500) // Wait before retry
    }
  }
}

test.describe('Dashboard Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await preparePageForVisualTesting(page)
  })

  test.describe('Layout and Structure', () => {
    test('should render dashboard layout correctly', async ({ page }) => {
      await page.waitForSelector('[data-testid="dashboard"]')
      await takeScreenshotWithRetry(page, 'dashboard-layout')
    })

    test('should render navigation correctly', async ({ page }) => {
      const navigation = page.locator('[data-testid="navigation"]')
      await expect(navigation).toBeVisible()
      await takeScreenshotWithRetry(page, 'dashboard-navigation', {
        clip: await navigation.boundingBox(),
      })
    })

    test('should render sidebar correctly', async ({ page }) => {
      const sidebar = page.locator('[data-testid="sidebar"]')
      await expect(sidebar).toBeVisible()
      await takeScreenshotWithRetry(page, 'dashboard-sidebar', {
        clip: await sidebar.boundingBox(),
      })
    })

    test('should render main content area correctly', async ({ page }) => {
      const mainContent = page.locator('[data-testid="main-content"]')
      await expect(mainContent).toBeVisible()
      await takeScreenshotWithRetry(page, 'dashboard-main-content', {
        clip: await mainContent.boundingBox(),
      })
    })
  })

  test.describe('Responsive Design', () => {
    test('should render correctly on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.reload()
      await preparePageForVisualTesting(page)
      await page.waitForSelector('[data-testid="dashboard"]')
      await takeScreenshotWithRetry(page, 'dashboard-mobile')
    })

    test('should render correctly on tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 })
      await page.reload()
      await preparePageForVisualTesting(page)
      await page.waitForSelector('[data-testid="dashboard"]')
      await takeScreenshotWithRetry(page, 'dashboard-tablet')
    })

    test('should render correctly on desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 })
      await page.reload()
      await preparePageForVisualTesting(page)
      await page.waitForSelector('[data-testid="dashboard"]')
      await takeScreenshotWithRetry(page, 'dashboard-desktop')
    })

    test('should handle sidebar collapse on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.reload()
      await preparePageForVisualTesting(page)
      
      // Toggle sidebar
      const menuButton = page.locator('[data-testid="menu-toggle"]')
      await menuButton.click()
      await page.waitForTimeout(300) // Wait for animation
      
      await takeScreenshotWithRetry(page, 'dashboard-mobile-sidebar-open')
    })
  })

  test.describe('Theme Variations', () => {
    test('should render light theme correctly', async ({ page }) => {
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'light')
      })
      await page.waitForTimeout(100)
      await takeScreenshotWithRetry(page, 'dashboard-light-theme')
    })

    test('should render dark theme correctly', async ({ page }) => {
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark')
      })
      await page.waitForTimeout(100)
      await takeScreenshotWithRetry(page, 'dashboard-dark-theme')
    })

    test('should render high contrast theme correctly', async ({ page }) => {
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'high-contrast')
      })
      await page.waitForTimeout(100)
      await takeScreenshotWithRetry(page, 'dashboard-high-contrast-theme')
    })
  })

  test.describe('Interactive States', () => {
    test('should render loading state correctly', async ({ page }) => {
      // Simulate loading state
      await page.evaluate(() => {
        const dashboard = document.querySelector('[data-testid="dashboard"]')
        if (dashboard) {
          dashboard.setAttribute('data-loading', 'true')
        }
      })
      await takeScreenshotWithRetry(page, 'dashboard-loading-state')
    })

    test('should render error state correctly', async ({ page }) => {
      // Simulate error state
      await page.evaluate(() => {
        const dashboard = document.querySelector('[data-testid="dashboard"]')
        if (dashboard) {
          dashboard.setAttribute('data-error', 'true')
        }
      })
      await takeScreenshotWithRetry(page, 'dashboard-error-state')
    })

    test('should render empty state correctly', async ({ page }) => {
      // Simulate empty state
      await page.evaluate(() => {
        const dashboard = document.querySelector('[data-testid="dashboard"]')
        if (dashboard) {
          dashboard.setAttribute('data-empty', 'true')
        }
      })
      await takeScreenshotWithRetry(page, 'dashboard-empty-state')
    })
  })

  test.describe('Accessibility States', () => {
    test('should render focus states correctly', async ({ page }) => {
      // Focus on first interactive element
      await page.keyboard.press('Tab')
      await takeScreenshotWithRetry(page, 'dashboard-focus-state')
    })

    test('should render with reduced motion', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.reload()
      await preparePageForVisualTesting(page)
      await takeScreenshotWithRetry(page, 'dashboard-reduced-motion')
    })

    test('should render with high contrast mode', async ({ page }) => {
      await page.emulateMedia({ forcedColors: 'active' })
      await page.reload()
      await preparePageForVisualTesting(page)
      await takeScreenshotWithRetry(page, 'dashboard-forced-colors')
    })
  })

  test.describe('Content Variations', () => {
    test('should render with many tasks', async ({ page }) => {
      // Mock API to return many tasks
      await page.route('**/api/tasks', async route => {
        const tasks = Array.from({ length: 50 }, (_, i) => ({
          id: `task-${i}`,
          title: `Task ${i + 1}`,
          completed: i % 3 === 0,
          priority: ['low', 'medium', 'high'][i % 3],
        }))
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(tasks),
        })
      })
      
      await page.reload()
      await preparePageForVisualTesting(page)
      await page.waitForSelector('[data-testid="task-list"]')
      await takeScreenshotWithRetry(page, 'dashboard-many-tasks')
    })

    test('should render with no tasks', async ({ page }) => {
      // Mock API to return empty array
      await page.route('**/api/tasks', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        })
      })
      
      await page.reload()
      await preparePageForVisualTesting(page)
      await takeScreenshotWithRetry(page, 'dashboard-no-tasks')
    })
  })

  test.describe('Performance Visual Tests', () => {
    test('should render quickly with large dataset', async ({ page }) => {
      const startTime = Date.now()
      
      // Mock large dataset
      await page.route('**/api/**', async route => {
        const largeData = Array.from({ length: 1000 }, (_, i) => ({
          id: `item-${i}`,
          title: `Item ${i + 1}`,
          data: 'x'.repeat(100), // Add some data size
        }))
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(largeData),
        })
      })
      
      await page.reload()
      await preparePageForVisualTesting(page)
      await page.waitForSelector('[data-testid="dashboard"]')
      
      const renderTime = Date.now() - startTime
      expect(renderTime).toBeLessThan(5000) // Should render in less than 5 seconds
      
      await takeScreenshotWithRetry(page, 'dashboard-performance-large-dataset')
    })
  })
})

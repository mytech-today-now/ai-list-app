import { test, expect } from '@playwright/test'

test.describe('Dashboard Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display the main dashboard elements', async ({ page }) => {
    // Check main heading
    await expect(page.getByRole('heading', { name: 'AI ToDo MCP' })).toBeVisible()
    
    // Check subtitle
    await expect(page.getByText('AI-Driven Progressive Web App Task Manager')).toBeVisible()
    
    // Check feature cards
    await expect(page.getByText('Task Lists')).toBeVisible()
    await expect(page.getByText('AI Agents')).toBeVisible()
    await expect(page.getByText('MCP Console')).toBeVisible()
    
    // Check action buttons
    await expect(page.getByRole('button', { name: 'Create List' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Manage Agents' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Open Console' })).toBeVisible()
    
    // Check recent activity section
    await expect(page.getByText('Recent Activity')).toBeVisible()
    await expect(page.getByText('No recent activity. Start by creating your first task list!')).toBeVisible()
  })

  test('should have proper responsive layout', async ({ page }) => {
    // Test desktop layout
    await page.setViewportSize({ width: 1200, height: 800 })
    const gridContainer = page.locator('.grid')
    await expect(gridContainer).toBeVisible()
    
    // Test tablet layout
    await page.setViewportSize({ width: 768, height: 1024 })
    await expect(gridContainer).toBeVisible()
    
    // Test mobile layout
    await page.setViewportSize({ width: 375, height: 667 })
    await expect(gridContainer).toBeVisible()
  })

  test('should handle button interactions', async ({ page }) => {
    // Test Create List button
    const createListBtn = page.getByRole('button', { name: 'Create List' })
    await expect(createListBtn).toBeVisible()
    await createListBtn.click()
    // Note: Since buttons don't have functionality yet, we just verify they're clickable
    
    // Test Manage Agents button
    const manageAgentsBtn = page.getByRole('button', { name: 'Manage Agents' })
    await expect(manageAgentsBtn).toBeVisible()
    await manageAgentsBtn.click()
    
    // Test Open Console button
    const openConsoleBtn = page.getByRole('button', { name: 'Open Console' })
    await expect(openConsoleBtn).toBeVisible()
    await openConsoleBtn.click()
  })

  test('should support keyboard navigation', async ({ page }) => {
    // Tab through interactive elements
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Create List' })).toBeFocused()
    
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Manage Agents' })).toBeFocused()
    
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Open Console' })).toBeFocused()
    
    // Test Enter key activation
    await page.keyboard.press('Enter')
    // Button should remain focused after activation
    await expect(page.getByRole('button', { name: 'Open Console' })).toBeFocused()
  })

  test('should have proper accessibility attributes', async ({ page }) => {
    // Check heading hierarchy
    const h1 = page.getByRole('heading', { level: 1 })
    await expect(h1).toBeVisible()
    await expect(h1).toHaveText('AI ToDo MCP')
    
    const h2Elements = page.getByRole('heading', { level: 2 })
    await expect(h2Elements).toHaveCount(4) // Task Lists, AI Agents, MCP Console, Recent Activity
    
    // Check button accessibility
    const buttons = page.getByRole('button')
    await expect(buttons).toHaveCount(3)
    
    for (const button of await buttons.all()) {
      await expect(button).toBeVisible()
      await expect(button).toBeEnabled()
    }
  })

  test('should load quickly and be performant', async ({ page }) => {
    const startTime = Date.now()
    
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'AI ToDo MCP' })).toBeVisible()
    
    const loadTime = Date.now() - startTime
    expect(loadTime).toBeLessThan(3000) // Should load within 3 seconds
  })

  test('should handle different screen orientations on mobile', async ({ page }) => {
    // Portrait mode
    await page.setViewportSize({ width: 375, height: 667 })
    await expect(page.getByRole('heading', { name: 'AI ToDo MCP' })).toBeVisible()
    
    // Landscape mode
    await page.setViewportSize({ width: 667, height: 375 })
    await expect(page.getByRole('heading', { name: 'AI ToDo MCP' })).toBeVisible()
  })

  test('should maintain state during page interactions', async ({ page }) => {
    // Verify initial state
    await expect(page.getByRole('heading', { name: 'AI ToDo MCP' })).toBeVisible()
    
    // Interact with buttons
    await page.getByRole('button', { name: 'Create List' }).click()
    await page.getByRole('button', { name: 'Manage Agents' }).click()
    
    // Verify state is maintained
    await expect(page.getByRole('heading', { name: 'AI ToDo MCP' })).toBeVisible()
    await expect(page.getByText('Recent Activity')).toBeVisible()
  })

  test('should work with browser back/forward navigation', async ({ page }) => {
    // Start on dashboard
    await expect(page.getByRole('heading', { name: 'AI ToDo MCP' })).toBeVisible()
    
    // Navigate to a different page (if routes existed)
    // For now, just test that back/forward don't break the page
    await page.goBack()
    await page.goForward()
    
    // Should still be on dashboard and functional
    await expect(page.getByRole('heading', { name: 'AI ToDo MCP' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create List' })).toBeVisible()
  })

  test('should handle page refresh gracefully', async ({ page }) => {
    // Verify initial load
    await expect(page.getByRole('heading', { name: 'AI ToDo MCP' })).toBeVisible()
    
    // Refresh the page
    await page.reload()
    
    // Should load correctly after refresh
    await expect(page.getByRole('heading', { name: 'AI ToDo MCP' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create List' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Manage Agents' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Open Console' })).toBeVisible()
  })

  test('should display proper visual styling', async ({ page }) => {
    // Check that Tailwind CSS classes are applied
    const mainContainer = page.locator('.min-h-screen.bg-gray-50')
    await expect(mainContainer).toBeVisible()
    
    // Check card styling
    const cards = page.locator('.bg-white.rounded-lg.shadow-md')
    await expect(cards).toHaveCount(4) // 3 feature cards + 1 recent activity
    
    // Check button styling
    const createListBtn = page.getByRole('button', { name: 'Create List' })
    await expect(createListBtn).toHaveClass(/bg-blue-500/)
    
    const manageAgentsBtn = page.getByRole('button', { name: 'Manage Agents' })
    await expect(manageAgentsBtn).toHaveClass(/bg-green-500/)
    
    const openConsoleBtn = page.getByRole('button', { name: 'Open Console' })
    await expect(openConsoleBtn).toHaveClass(/bg-purple-500/)
  })

  test('should handle hover states', async ({ page }) => {
    const createListBtn = page.getByRole('button', { name: 'Create List' })
    
    // Hover over button
    await createListBtn.hover()
    
    // Button should still be visible and functional
    await expect(createListBtn).toBeVisible()
    await expect(createListBtn).toBeEnabled()
    
    // Move away from button
    await page.mouse.move(0, 0)
    await expect(createListBtn).toBeVisible()
  })

  test('should work with different browser zoom levels', async ({ page }) => {
    // Test different zoom levels
    const zoomLevels = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0]
    
    for (const zoom of zoomLevels) {
      await page.evaluate((zoomLevel) => {
        document.body.style.zoom = zoomLevel.toString()
      }, zoom)
      
      // Verify main elements are still visible
      await expect(page.getByRole('heading', { name: 'AI ToDo MCP' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Create List' })).toBeVisible()
    }
    
    // Reset zoom
    await page.evaluate(() => {
      document.body.style.zoom = '1'
    })
  })

  test('should handle rapid user interactions', async ({ page }) => {
    // Rapidly click buttons
    const createListBtn = page.getByRole('button', { name: 'Create List' })
    const manageAgentsBtn = page.getByRole('button', { name: 'Manage Agents' })
    const openConsoleBtn = page.getByRole('button', { name: 'Open Console' })
    
    // Click buttons rapidly
    await createListBtn.click()
    await manageAgentsBtn.click()
    await openConsoleBtn.click()
    await createListBtn.click()
    await manageAgentsBtn.click()
    
    // Page should remain stable
    await expect(page.getByRole('heading', { name: 'AI ToDo MCP' })).toBeVisible()
    await expect(createListBtn).toBeVisible()
    await expect(manageAgentsBtn).toBeVisible()
    await expect(openConsoleBtn).toBeVisible()
  })

  test('should work with JavaScript disabled', async ({ browser }) => {
    // Create a new context with JavaScript disabled
    const context = await browser.newContext({
      javaScriptEnabled: false
    })
    const page = await context.newPage()
    
    await page.goto('/')
    
    // Basic content should still be visible
    await expect(page.getByText('AI ToDo MCP')).toBeVisible()
    await expect(page.getByText('Task Lists')).toBeVisible()
    await expect(page.getByText('AI Agents')).toBeVisible()
    await expect(page.getByText('MCP Console')).toBeVisible()
    
    await context.close()
  })
})

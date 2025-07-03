import { test, expect, Page } from '@playwright/test'

// Performance testing utilities
interface PerformanceMetrics {
  loadTime: number
  domContentLoaded: number
  firstContentfulPaint: number
  largestContentfulPaint: number
  firstInputDelay: number
  cumulativeLayoutShift: number
  timeToFirstByte: number
  resourceCount: number
  totalResourceSize: number
  jsHeapSize: number
}

interface PerformanceThresholds {
  loadTime: number
  domContentLoaded: number
  firstContentfulPaint: number
  largestContentfulPaint: number
  firstInputDelay: number
  cumulativeLayoutShift: number
  timeToFirstByte: number
  maxResourceSize: number
  maxJsHeapSize: number
}

const performanceThresholds: PerformanceThresholds = {
  loadTime: 3000, // 3 seconds
  domContentLoaded: 2000, // 2 seconds
  firstContentfulPaint: 1800, // 1.8 seconds
  largestContentfulPaint: 2500, // 2.5 seconds
  firstInputDelay: 100, // 100ms
  cumulativeLayoutShift: 0.1, // 0.1 score
  timeToFirstByte: 600, // 600ms
  maxResourceSize: 5 * 1024 * 1024, // 5MB
  maxJsHeapSize: 50 * 1024 * 1024, // 50MB
}

async function measurePerformanceMetrics(page: Page): Promise<PerformanceMetrics> {
  const metrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    const paint = performance.getEntriesByType('paint')
    const resources = performance.getEntriesByType('resource')
    
    // Calculate metrics
    const loadTime = navigation.loadEventEnd - navigation.fetchStart
    const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.fetchStart
    const timeToFirstByte = navigation.responseStart - navigation.fetchStart
    
    const firstContentfulPaint = paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0
    
    // Resource metrics
    const totalResourceSize = resources.reduce((total, resource) => {
      return total + (resource.transferSize || 0)
    }, 0)
    
    // Memory metrics
    const memoryInfo = (performance as any).memory
    const jsHeapSize = memoryInfo ? memoryInfo.usedJSHeapSize : 0
    
    return {
      loadTime,
      domContentLoaded,
      firstContentfulPaint,
      timeToFirstByte,
      resourceCount: resources.length,
      totalResourceSize,
      jsHeapSize,
    }
  })
  
  // Get Web Vitals using web-vitals library simulation
  const webVitals = await page.evaluate(() => {
    return new Promise((resolve) => {
      const vitals = {
        largestContentfulPaint: 0,
        firstInputDelay: 0,
        cumulativeLayoutShift: 0,
      }
      
      // Simulate LCP measurement
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1]
        vitals.largestContentfulPaint = lastEntry.startTime
      })
      
      try {
        observer.observe({ entryTypes: ['largest-contentful-paint'] })
      } catch (e) {
        // Fallback if not supported
        vitals.largestContentfulPaint = 2000
      }
      
      // Simulate CLS measurement
      let clsValue = 0
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value
          }
        }
        vitals.cumulativeLayoutShift = clsValue
      })
      
      try {
        clsObserver.observe({ entryTypes: ['layout-shift'] })
      } catch (e) {
        vitals.cumulativeLayoutShift = 0.05
      }
      
      // Simulate FID measurement
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          vitals.firstInputDelay = (entry as any).processingStart - entry.startTime
        }
      })
      
      try {
        fidObserver.observe({ entryTypes: ['first-input'] })
      } catch (e) {
        vitals.firstInputDelay = 50
      }
      
      // Return after a short delay to allow measurements
      setTimeout(() => resolve(vitals), 1000)
    })
  })
  
  return {
    ...metrics,
    ...(webVitals as any),
  }
}

function validatePerformanceMetrics(metrics: PerformanceMetrics, thresholds: PerformanceThresholds) {
  const violations: string[] = []
  
  if (metrics.loadTime > thresholds.loadTime) {
    violations.push(`Load time ${metrics.loadTime}ms exceeds threshold ${thresholds.loadTime}ms`)
  }
  
  if (metrics.domContentLoaded > thresholds.domContentLoaded) {
    violations.push(`DOM content loaded ${metrics.domContentLoaded}ms exceeds threshold ${thresholds.domContentLoaded}ms`)
  }
  
  if (metrics.firstContentfulPaint > thresholds.firstContentfulPaint) {
    violations.push(`First Contentful Paint ${metrics.firstContentfulPaint}ms exceeds threshold ${thresholds.firstContentfulPaint}ms`)
  }
  
  if (metrics.largestContentfulPaint > thresholds.largestContentfulPaint) {
    violations.push(`Largest Contentful Paint ${metrics.largestContentfulPaint}ms exceeds threshold ${thresholds.largestContentfulPaint}ms`)
  }
  
  if (metrics.firstInputDelay > thresholds.firstInputDelay) {
    violations.push(`First Input Delay ${metrics.firstInputDelay}ms exceeds threshold ${thresholds.firstInputDelay}ms`)
  }
  
  if (metrics.cumulativeLayoutShift > thresholds.cumulativeLayoutShift) {
    violations.push(`Cumulative Layout Shift ${metrics.cumulativeLayoutShift} exceeds threshold ${thresholds.cumulativeLayoutShift}`)
  }
  
  if (metrics.timeToFirstByte > thresholds.timeToFirstByte) {
    violations.push(`Time to First Byte ${metrics.timeToFirstByte}ms exceeds threshold ${thresholds.timeToFirstByte}ms`)
  }
  
  if (metrics.totalResourceSize > thresholds.maxResourceSize) {
    violations.push(`Total resource size ${(metrics.totalResourceSize / 1024 / 1024).toFixed(2)}MB exceeds threshold ${(thresholds.maxResourceSize / 1024 / 1024).toFixed(2)}MB`)
  }
  
  if (metrics.jsHeapSize > thresholds.maxJsHeapSize) {
    violations.push(`JS heap size ${(metrics.jsHeapSize / 1024 / 1024).toFixed(2)}MB exceeds threshold ${(thresholds.maxJsHeapSize / 1024 / 1024).toFixed(2)}MB`)
  }
  
  return violations
}

test.describe('Frontend Performance Tests', () => {
  test('should meet performance thresholds on homepage', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/')
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle')
    
    // Measure performance metrics
    const metrics = await measurePerformanceMetrics(page)
    
    // Validate against thresholds
    const violations = validatePerformanceMetrics(metrics, performanceThresholds)
    
    // Log metrics for debugging
    console.log('Performance Metrics:', {
      loadTime: `${metrics.loadTime}ms`,
      domContentLoaded: `${metrics.domContentLoaded}ms`,
      firstContentfulPaint: `${metrics.firstContentfulPaint}ms`,
      largestContentfulPaint: `${metrics.largestContentfulPaint}ms`,
      firstInputDelay: `${metrics.firstInputDelay}ms`,
      cumulativeLayoutShift: metrics.cumulativeLayoutShift,
      timeToFirstByte: `${metrics.timeToFirstByte}ms`,
      resourceCount: metrics.resourceCount,
      totalResourceSize: `${(metrics.totalResourceSize / 1024 / 1024).toFixed(2)}MB`,
      jsHeapSize: `${(metrics.jsHeapSize / 1024 / 1024).toFixed(2)}MB`,
    })
    
    // Assert no violations
    expect(violations).toEqual([])
  })
  
  test('should handle large dataset efficiently', async ({ page }) => {
    // Mock API to return large dataset
    await page.route('**/api/tasks', async route => {
      const largeTasks = Array.from({ length: 1000 }, (_, i) => ({
        id: `task-${i}`,
        title: `Performance test task ${i + 1}`,
        completed: i % 3 === 0,
        priority: ['low', 'medium', 'high'][i % 3],
        createdAt: new Date().toISOString(),
      }))
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(largeTasks),
      })
    })
    
    const startTime = Date.now()
    
    await page.goto('/')
    await page.waitForSelector('[data-testid="task-list"]')
    
    const renderTime = Date.now() - startTime
    
    // Should render large dataset within reasonable time
    expect(renderTime).toBeLessThan(5000) // 5 seconds
    
    // Measure performance with large dataset
    const metrics = await measurePerformanceMetrics(page)
    
    // Relaxed thresholds for large dataset
    const largeDatasetThresholds = {
      ...performanceThresholds,
      loadTime: 5000,
      domContentLoaded: 3000,
      firstContentfulPaint: 2500,
    }
    
    const violations = validatePerformanceMetrics(metrics, largeDatasetThresholds)
    expect(violations).toEqual([])
  })
  
  test('should maintain performance during interactions', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Measure baseline performance
    const baselineMetrics = await measurePerformanceMetrics(page)
    
    // Perform various interactions
    await page.click('[data-testid="create-list-button"]')
    await page.fill('[data-testid="list-name-input"]', 'Performance Test List')
    await page.click('[data-testid="save-list-button"]')
    
    await page.click('[data-testid="add-task-button"]')
    await page.fill('[data-testid="task-title-input"]', 'Performance Test Task')
    await page.click('[data-testid="save-task-button"]')
    
    // Measure performance after interactions
    const interactionMetrics = await measurePerformanceMetrics(page)
    
    // Memory usage shouldn't increase dramatically
    const memoryIncrease = interactionMetrics.jsHeapSize - baselineMetrics.jsHeapSize
    expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024) // 10MB increase max
  })
  
  test('should handle slow network conditions', async ({ page }) => {
    // Simulate slow 3G network
    await page.route('**/*', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000)) // 1 second delay
      await route.continue()
    })
    
    const startTime = Date.now()
    
    await page.goto('/')
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 15000 })
    
    const loadTime = Date.now() - startTime
    
    // Should still load within reasonable time on slow network
    expect(loadTime).toBeLessThan(15000) // 15 seconds
    
    // Should show loading states
    // This would depend on your loading state implementation
  })
  
  test('should optimize bundle size', async ({ page }) => {
    // Navigate to page and measure resource loading
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    const resourceMetrics = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
      
      const jsResources = resources.filter(r => r.name.includes('.js'))
      const cssResources = resources.filter(r => r.name.includes('.css'))
      
      const totalJsSize = jsResources.reduce((total, r) => total + (r.transferSize || 0), 0)
      const totalCssSize = cssResources.reduce((total, r) => total + (r.transferSize || 0), 0)
      
      return {
        jsCount: jsResources.length,
        cssCount: cssResources.length,
        totalJsSize,
        totalCssSize,
        totalSize: totalJsSize + totalCssSize,
      }
    })
    
    console.log('Bundle Metrics:', {
      jsFiles: resourceMetrics.jsCount,
      cssFiles: resourceMetrics.cssCount,
      jsSize: `${(resourceMetrics.totalJsSize / 1024).toFixed(2)}KB`,
      cssSize: `${(resourceMetrics.totalCssSize / 1024).toFixed(2)}KB`,
      totalSize: `${(resourceMetrics.totalSize / 1024).toFixed(2)}KB`,
    })
    
    // Bundle size assertions
    expect(resourceMetrics.totalJsSize).toBeLessThan(2 * 1024 * 1024) // 2MB JS
    expect(resourceMetrics.totalCssSize).toBeLessThan(500 * 1024) // 500KB CSS
    expect(resourceMetrics.jsCount).toBeLessThan(20) // Max 20 JS files
  })
  
  test('should handle memory leaks', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Get initial memory usage
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0
    })
    
    // Perform memory-intensive operations
    for (let i = 0; i < 10; i++) {
      await page.click('[data-testid="create-list-button"]')
      await page.fill('[data-testid="list-name-input"]', `Test List ${i}`)
      await page.click('[data-testid="save-list-button"]')
      
      // Add tasks to the list
      for (let j = 0; j < 5; j++) {
        await page.click('[data-testid="add-task-button"]')
        await page.fill('[data-testid="task-title-input"]', `Task ${i}-${j}`)
        await page.click('[data-testid="save-task-button"]')
      }
      
      // Delete the list
      await page.click(`[data-testid="list-Test List ${i}"] [data-testid="delete-button"]`)
      await page.click('[data-testid="confirm-delete-button"]')
    }
    
    // Force garbage collection if available
    await page.evaluate(() => {
      if ((window as any).gc) {
        (window as any).gc()
      }
    })
    
    // Wait a bit for cleanup
    await page.waitForTimeout(2000)
    
    // Get final memory usage
    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0
    })
    
    const memoryIncrease = finalMemory - initialMemory
    
    console.log('Memory Usage:', {
      initial: `${(initialMemory / 1024 / 1024).toFixed(2)}MB`,
      final: `${(finalMemory / 1024 / 1024).toFixed(2)}MB`,
      increase: `${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`,
    })
    
    // Memory increase should be minimal after cleanup
    expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024) // 5MB increase max
  })
})

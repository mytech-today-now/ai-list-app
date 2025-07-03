import { vi } from 'vitest'

// Performance measurement utilities
export interface PerformanceMetrics {
  duration: number
  memoryUsage?: number
  renderCount?: number
  reRenderCount?: number
}

export interface PerformanceThresholds {
  maxDuration: number
  maxMemoryUsage?: number
  maxRenderCount?: number
  maxReRenderCount?: number
}

// Performance measurement wrapper
export const measureComponentPerformance = async <T>(
  testFn: () => Promise<T> | T,
  name: string = 'test'
): Promise<{ result: T; metrics: PerformanceMetrics }> => {
  // Clear any existing marks
  performance.clearMarks()
  performance.clearMeasures()
  
  const startMark = `${name}-start`
  const endMark = `${name}-end`
  const measureName = `${name}-duration`
  
  // Memory usage before (if available)
  const memoryBefore = (performance as any).memory?.usedJSHeapSize || 0
  
  // Start measurement
  performance.mark(startMark)
  
  const result = await testFn()
  
  // End measurement
  performance.mark(endMark)
  performance.measure(measureName, startMark, endMark)
  
  const measure = performance.getEntriesByName(measureName)[0]
  const memoryAfter = (performance as any).memory?.usedJSHeapSize || 0
  
  const metrics: PerformanceMetrics = {
    duration: measure.duration,
    memoryUsage: memoryAfter - memoryBefore,
  }
  
  return { result, metrics }
}

// Performance assertion helpers
export const expectPerformanceWithin = (
  metrics: PerformanceMetrics,
  thresholds: PerformanceThresholds
) => {
  expect(metrics.duration).toBeLessThan(thresholds.maxDuration)
  
  if (thresholds.maxMemoryUsage && metrics.memoryUsage) {
    expect(metrics.memoryUsage).toBeLessThan(thresholds.maxMemoryUsage)
  }
  
  if (thresholds.maxRenderCount && metrics.renderCount) {
    expect(metrics.renderCount).toBeLessThan(thresholds.maxRenderCount)
  }
  
  if (thresholds.maxReRenderCount && metrics.reRenderCount) {
    expect(metrics.reRenderCount).toBeLessThan(thresholds.maxReRenderCount)
  }
}

// React render counting utilities
let renderCount = 0
let reRenderCount = 0

export const resetRenderCounts = () => {
  renderCount = 0
  reRenderCount = 0
}

export const getRenderCounts = () => ({
  renderCount,
  reRenderCount,
})

// Mock performance observer for testing
export const mockPerformanceObserver = () => {
  const entries: PerformanceEntry[] = []
  
  const observer = vi.fn().mockImplementation((callback: PerformanceObserverCallback) => ({
    observe: vi.fn((options: PerformanceObserverInit) => {
      // Simulate performance entries
      setTimeout(() => {
        callback(
          {
            getEntries: () => entries,
            getEntriesByName: (name: string) => entries.filter(e => e.name === name),
            getEntriesByType: (type: string) => entries.filter(e => e.entryType === type),
          } as PerformanceObserverEntryList,
          observer
        )
      }, 0)
    }),
    disconnect: vi.fn(),
    takeRecords: vi.fn(() => entries),
  }))
  
  global.PerformanceObserver = observer
  
  return {
    observer,
    addEntry: (entry: Partial<PerformanceEntry>) => {
      entries.push({
        name: 'test-entry',
        entryType: 'measure',
        startTime: 0,
        duration: 100,
        ...entry,
      } as PerformanceEntry)
    },
    clearEntries: () => {
      entries.length = 0
    },
  }
}

// Bundle size analysis utilities
export const analyzeBundleSize = (bundleStats: any) => {
  const totalSize = bundleStats.assets?.reduce(
    (total: number, asset: any) => total + asset.size,
    0
  ) || 0
  
  const jsSize = bundleStats.assets?.filter((asset: any) => 
    asset.name.endsWith('.js')
  ).reduce((total: number, asset: any) => total + asset.size, 0) || 0
  
  const cssSize = bundleStats.assets?.filter((asset: any) => 
    asset.name.endsWith('.css')
  ).reduce((total: number, asset: any) => total + asset.size, 0) || 0
  
  return {
    totalSize,
    jsSize,
    cssSize,
    assetCount: bundleStats.assets?.length || 0,
  }
}

// Network performance simulation
export const simulateSlowNetwork = (delay: number = 1000) => {
  const originalFetch = global.fetch
  
  global.fetch = vi.fn().mockImplementation(async (...args) => {
    await new Promise(resolve => setTimeout(resolve, delay))
    return originalFetch(...args)
  })
  
  return () => {
    global.fetch = originalFetch
  }
}

// Memory leak detection utilities
export const detectMemoryLeaks = () => {
  const initialMemory = (performance as any).memory?.usedJSHeapSize || 0
  
  return {
    check: () => {
      const currentMemory = (performance as any).memory?.usedJSHeapSize || 0
      const memoryIncrease = currentMemory - initialMemory
      
      return {
        initialMemory,
        currentMemory,
        memoryIncrease,
        hasLeak: memoryIncrease > 1024 * 1024, // 1MB threshold
      }
    },
  }
}

// Core Web Vitals simulation
export const simulateWebVitals = () => {
  const vitals = {
    FCP: Math.random() * 2000 + 500, // First Contentful Paint
    LCP: Math.random() * 3000 + 1000, // Largest Contentful Paint
    FID: Math.random() * 100 + 10, // First Input Delay
    CLS: Math.random() * 0.1, // Cumulative Layout Shift
    TTFB: Math.random() * 500 + 100, // Time to First Byte
  }
  
  return vitals
}

// Performance budget validation
export interface PerformanceBudget {
  maxBundleSize: number // in bytes
  maxLoadTime: number // in ms
  maxFCP: number // in ms
  maxLCP: number // in ms
  maxFID: number // in ms
  maxCLS: number // score
}

export const validatePerformanceBudget = (
  metrics: any,
  budget: PerformanceBudget
) => {
  const violations: string[] = []
  
  if (metrics.bundleSize > budget.maxBundleSize) {
    violations.push(`Bundle size ${metrics.bundleSize} exceeds budget ${budget.maxBundleSize}`)
  }
  
  if (metrics.loadTime > budget.maxLoadTime) {
    violations.push(`Load time ${metrics.loadTime}ms exceeds budget ${budget.maxLoadTime}ms`)
  }
  
  if (metrics.FCP > budget.maxFCP) {
    violations.push(`FCP ${metrics.FCP}ms exceeds budget ${budget.maxFCP}ms`)
  }
  
  if (metrics.LCP > budget.maxLCP) {
    violations.push(`LCP ${metrics.LCP}ms exceeds budget ${budget.maxLCP}ms`)
  }
  
  if (metrics.FID > budget.maxFID) {
    violations.push(`FID ${metrics.FID}ms exceeds budget ${budget.maxFID}ms`)
  }
  
  if (metrics.CLS > budget.maxCLS) {
    violations.push(`CLS ${metrics.CLS} exceeds budget ${budget.maxCLS}`)
  }
  
  return {
    passed: violations.length === 0,
    violations,
  }
}

// Lighthouse score simulation
export const simulateLighthouseScore = () => ({
  performance: Math.floor(Math.random() * 20) + 80, // 80-100
  accessibility: Math.floor(Math.random() * 10) + 90, // 90-100
  bestPractices: Math.floor(Math.random() * 15) + 85, // 85-100
  seo: Math.floor(Math.random() * 10) + 90, // 90-100
  pwa: Math.floor(Math.random() * 20) + 80, // 80-100
})

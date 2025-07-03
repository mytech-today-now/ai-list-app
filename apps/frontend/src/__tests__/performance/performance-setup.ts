/**
 * @fileoverview Performance testing setup and configuration
 * @author AI ToDo MCP Team
 * @version 1.0.0
 */

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

// Mock performance API if not available
if (typeof performance === 'undefined') {
  global.performance = {
    now: () => Date.now(),
    mark: () => {},
    measure: () => {},
    getEntriesByName: () => [],
    getEntriesByType: () => [],
    clearMarks: () => {},
    clearMeasures: () => {},
    memory: {
      usedJSHeapSize: 1024 * 1024, // 1MB
      totalJSHeapSize: 2 * 1024 * 1024, // 2MB
      jsHeapSizeLimit: 4 * 1024 * 1024 // 4MB
    }
  } as any;
}

// Mock requestIdleCallback if not available
if (typeof requestIdleCallback === 'undefined') {
  global.requestIdleCallback = (callback: IdleRequestCallback) => {
    return setTimeout(() => callback({ 
      didTimeout: false, 
      timeRemaining: () => 50 
    } as IdleDeadline), 1);
  };
  
  global.cancelIdleCallback = (id: number) => {
    clearTimeout(id);
  };
}

// Performance monitoring setup
let performanceObserver: PerformanceObserver | null = null;
let performanceEntries: PerformanceEntry[] = [];

beforeAll(() => {
  // Set up performance monitoring
  if (typeof PerformanceObserver !== 'undefined') {
    performanceObserver = new PerformanceObserver((list) => {
      performanceEntries.push(...list.getEntries());
    });
    
    performanceObserver.observe({ 
      entryTypes: ['measure', 'navigation', 'resource', 'paint'] 
    });
  }
  
  // Disable animations for consistent performance testing
  const style = document.createElement('style');
  style.innerHTML = `
    *, *::before, *::after {
      animation-duration: 0s !important;
      animation-delay: 0s !important;
      transition-duration: 0s !important;
      transition-delay: 0s !important;
    }
  `;
  document.head.appendChild(style);
  
  // Set up consistent viewport
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: 1920
  });
  
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: 1080
  });
});

afterAll(() => {
  // Clean up performance monitoring
  if (performanceObserver) {
    performanceObserver.disconnect();
  }
  
  // Clean up performance entries
  performanceEntries = [];
});

beforeEach(() => {
  // Clear performance marks and measures
  if (performance.clearMarks) {
    performance.clearMarks();
  }
  if (performance.clearMeasures) {
    performance.clearMeasures();
  }
  
  // Reset performance entries for each test
  performanceEntries = [];
});

afterEach(() => {
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
});

// Export performance utilities for tests
export const performanceTestUtils = {
  getPerformanceEntries: () => performanceEntries,
  
  measurePerformance: async (name: string, fn: () => Promise<void> | void) => {
    const startTime = performance.now();
    performance.mark(`${name}-start`);
    
    await fn();
    
    performance.mark(`${name}-end`);
    const endTime = performance.now();
    
    performance.measure(name, `${name}-start`, `${name}-end`);
    
    return {
      duration: endTime - startTime,
      name
    };
  },
  
  waitForIdle: () => new Promise<void>(resolve => {
    requestIdleCallback(() => resolve());
  }),
  
  simulateSlowDevice: () => {
    // Simulate slower device by adding artificial delays
    const originalSetTimeout = window.setTimeout;
    window.setTimeout = ((fn: Function, delay: number = 0) => {
      return originalSetTimeout(fn, delay * 2); // Double all timeouts
    }) as any;
    
    return () => {
      window.setTimeout = originalSetTimeout;
    };
  }
};

export default performanceTestUtils;

/**
 * @fileoverview Performance testing utilities for React components and applications
 * @author AI ToDo MCP Team
 * @version 1.0.0
 */

import React from 'react';
import { render, RenderResult } from '@testing-library/react';
import { act } from 'react-dom/test-utils';

/**
 * Performance metrics interface
 */
export interface PerformanceMetrics {
  renderTime: number;
  updateTime: number;
  memoryUsage: number;
  componentCount: number;
  reRenderCount: number;
  bundleSize?: number;
}

/**
 * Performance thresholds for different component types
 */
export const PERFORMANCE_THRESHOLDS = {
  component: {
    renderTime: 16, // 16ms for 60fps
    updateTime: 8,  // 8ms for updates
    memoryUsage: 1024 * 1024, // 1MB
    reRenderCount: 5
  },
  page: {
    renderTime: 100, // 100ms for initial page load
    updateTime: 50,  // 50ms for page updates
    memoryUsage: 5 * 1024 * 1024, // 5MB
    reRenderCount: 10
  },
  app: {
    renderTime: 1000, // 1s for full app load
    updateTime: 200,  // 200ms for app-wide updates
    memoryUsage: 10 * 1024 * 1024, // 10MB
    reRenderCount: 20
  }
} as const;

/**
 * Memory usage tracker
 */
class MemoryTracker {
  private initialMemory: number;
  
  constructor() {
    this.initialMemory = this.getCurrentMemoryUsage();
  }
  
  private getCurrentMemoryUsage(): number {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }
  
  getMemoryDelta(): number {
    return this.getCurrentMemoryUsage() - this.initialMemory;
  }
  
  reset(): void {
    this.initialMemory = this.getCurrentMemoryUsage();
  }
}

/**
 * Render performance tracker
 */
class RenderTracker {
  private renderCount = 0;
  private renderTimes: number[] = [];
  
  startRender(): () => number {
    const startTime = performance.now();
    this.renderCount++;
    
    return () => {
      const renderTime = performance.now() - startTime;
      this.renderTimes.push(renderTime);
      return renderTime;
    };
  }
  
  getMetrics() {
    return {
      renderCount: this.renderCount,
      averageRenderTime: this.renderTimes.reduce((a, b) => a + b, 0) / this.renderTimes.length,
      maxRenderTime: Math.max(...this.renderTimes),
      minRenderTime: Math.min(...this.renderTimes),
      totalRenderTime: this.renderTimes.reduce((a, b) => a + b, 0)
    };
  }
  
  reset(): void {
    this.renderCount = 0;
    this.renderTimes = [];
  }
}

/**
 * Performance test wrapper
 */
export class PerformanceTester {
  private memoryTracker = new MemoryTracker();
  private renderTracker = new RenderTracker();
  
  /**
   * Measure component render performance
   */
  async measureRenderPerformance<T extends React.ComponentType<any>>(
    Component: T,
    props: React.ComponentProps<T> = {} as React.ComponentProps<T>,
    iterations = 10
  ): Promise<PerformanceMetrics> {
    const results: number[] = [];
    let renderResult: RenderResult;
    
    this.memoryTracker.reset();
    this.renderTracker.reset();
    
    for (let i = 0; i < iterations; i++) {
      const endRender = this.renderTracker.startRender();
      
      await act(async () => {
        renderResult = render(React.createElement(Component, props));
      });
      
      const renderTime = endRender();
      results.push(renderTime);
      
      // Cleanup between iterations
      if (renderResult!) {
        renderResult.unmount();
      }
    }
    
    const renderMetrics = this.renderTracker.getMetrics();
    const memoryUsage = this.memoryTracker.getMemoryDelta();
    
    return {
      renderTime: renderMetrics.averageRenderTime,
      updateTime: 0, // Will be measured separately
      memoryUsage,
      componentCount: this.countComponents(renderResult!.container),
      reRenderCount: renderMetrics.renderCount,
    };
  }
  
  /**
   * Measure component update performance
   */
  async measureUpdatePerformance<T extends React.ComponentType<any>>(
    Component: T,
    initialProps: React.ComponentProps<T>,
    updatedProps: React.ComponentProps<T>,
    iterations = 10
  ): Promise<number> {
    const results: number[] = [];
    
    const renderResult = render(<Component {...initialProps} />);
    
    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      
      await act(async () => {
        renderResult.rerender(<Component {...updatedProps} />);
      });
      
      const updateTime = performance.now() - startTime;
      results.push(updateTime);
    }
    
    renderResult.unmount();
    
    return results.reduce((a, b) => a + b, 0) / results.length;
  }
  
  /**
   * Measure memory leaks
   */
  async measureMemoryLeaks<T extends React.ComponentType<any>>(
    Component: T,
    props: React.ComponentProps<T>,
    mountUnmountCycles = 100
  ): Promise<{ initialMemory: number; finalMemory: number; leaked: number }> {
    const initialMemory = this.memoryTracker.getCurrentMemoryUsage();
    
    for (let i = 0; i < mountUnmountCycles; i++) {
      const renderResult = render(<Component {...props} />);
      renderResult.unmount();
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
    }
    
    // Wait for cleanup
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const finalMemory = this.memoryTracker.getCurrentMemoryUsage();
    
    return {
      initialMemory,
      finalMemory,
      leaked: finalMemory - initialMemory
    };
  }
  
  /**
   * Count DOM nodes in container
   */
  private countComponents(container: Element): number {
    return container.querySelectorAll('*').length;
  }
  
  /**
   * Benchmark component against thresholds
   */
  async benchmarkComponent<T extends React.ComponentType<any>>(
    Component: T,
    props: React.ComponentProps<T>,
    thresholds = PERFORMANCE_THRESHOLDS.component
  ): Promise<{
    metrics: PerformanceMetrics;
    passed: boolean;
    failures: string[];
  }> {
    const metrics = await this.measureRenderPerformance(Component, props);
    const updateTime = await this.measureUpdatePerformance(Component, props, props);
    
    metrics.updateTime = updateTime;
    
    const failures: string[] = [];
    
    if (metrics.renderTime > thresholds.renderTime) {
      failures.push(`Render time ${metrics.renderTime}ms exceeds threshold ${thresholds.renderTime}ms`);
    }
    
    if (metrics.updateTime > thresholds.updateTime) {
      failures.push(`Update time ${metrics.updateTime}ms exceeds threshold ${thresholds.updateTime}ms`);
    }
    
    if (metrics.memoryUsage > thresholds.memoryUsage) {
      failures.push(`Memory usage ${metrics.memoryUsage} bytes exceeds threshold ${thresholds.memoryUsage} bytes`);
    }
    
    return {
      metrics,
      passed: failures.length === 0,
      failures
    };
  }
}

/**
 * Bundle size analyzer
 */
export class BundleAnalyzer {
  /**
   * Estimate component bundle impact
   */
  static estimateComponentSize(componentCode: string): number {
    // Simple estimation based on code length
    // In real implementation, this would use webpack-bundle-analyzer
    return new Blob([componentCode]).size;
  }
  
  /**
   * Check for heavy dependencies
   */
  static analyzeImports(componentCode: string): {
    imports: string[];
    heavyImports: string[];
    recommendations: string[];
  } {
    const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
    const imports: string[] = [];
    let match;
    
    while ((match = importRegex.exec(componentCode)) !== null) {
      imports.push(match[1]);
    }
    
    const heavyLibraries = ['lodash', 'moment', 'rxjs', 'three'];
    const heavyImports = imports.filter(imp => 
      heavyLibraries.some(heavy => imp.includes(heavy))
    );
    
    const recommendations: string[] = [];
    if (heavyImports.includes('lodash')) {
      recommendations.push('Consider using lodash-es or individual lodash functions');
    }
    if (heavyImports.includes('moment')) {
      recommendations.push('Consider using date-fns or dayjs instead of moment');
    }
    
    return { imports, heavyImports, recommendations };
  }
}

/**
 * Performance test utilities
 */
export const performanceUtils = {
  /**
   * Create a performance test suite
   */
  createTestSuite: (name: string) => ({
    name,
    tests: [] as Array<() => Promise<any>>,
    
    add(testName: string, testFn: () => Promise<any>) {
      this.tests.push(async () => {
        console.log(`Running performance test: ${testName}`);
        const result = await testFn();
        console.log(`Completed: ${testName}`, result);
        return { testName, ...result };
      });
      return this;
    },
    
    async run() {
      const results = [];
      for (const test of this.tests) {
        results.push(await test());
      }
      return results;
    }
  }),
  
  /**
   * Mock heavy operations for testing
   */
  mockHeavyOperation: (duration: number) => {
    return new Promise(resolve => setTimeout(resolve, duration));
  },
  
  /**
   * Simulate network delay
   */
  simulateNetworkDelay: (min = 100, max = 500) => {
    const delay = Math.random() * (max - min) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  },
  
  /**
   * Create performance assertions
   */
  expectPerformance: (metrics: PerformanceMetrics, thresholds = PERFORMANCE_THRESHOLDS.component) => ({
    toBeWithinThresholds() {
      expect(metrics.renderTime).toBeLessThanOrEqual(thresholds.renderTime);
      expect(metrics.updateTime).toBeLessThanOrEqual(thresholds.updateTime);
      expect(metrics.memoryUsage).toBeLessThanOrEqual(thresholds.memoryUsage);
    },
    
    toHaveRenderTime(maxTime: number) {
      expect(metrics.renderTime).toBeLessThanOrEqual(maxTime);
    },
    
    toHaveUpdateTime(maxTime: number) {
      expect(metrics.updateTime).toBeLessThanOrEqual(maxTime);
    },
    
    toUseMemory(maxMemory: number) {
      expect(metrics.memoryUsage).toBeLessThanOrEqual(maxMemory);
    }
  })
};

// Export singleton instance
export const performanceTester = new PerformanceTester();

export default {
  PerformanceTester,
  BundleAnalyzer,
  performanceUtils,
  performanceTester,
  PERFORMANCE_THRESHOLDS
};

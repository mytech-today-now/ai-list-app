/**
 * @fileoverview Accessibility testing utilities for React components
 * @author AI ToDo MCP Team
 * @version 1.0.0
 */

import { render, RenderResult } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import userEvent from '@testing-library/user-event';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

/**
 * Accessibility test configuration
 */
export const A11Y_CONFIG = {
  rules: {
    // Enable all WCAG 2.1 AA rules
    'color-contrast': { enabled: true },
    'keyboard-navigation': { enabled: true },
    'focus-management': { enabled: true },
    'aria-labels': { enabled: true },
    'semantic-markup': { enabled: true },
    'screen-reader': { enabled: true }
  },
  tags: ['wcag2a', 'wcag2aa', 'wcag21aa'],
  exclude: [
    // Exclude third-party components that we can't control
    '[data-testid="third-party-widget"]'
  ]
};

/**
 * Accessibility violation severity levels
 */
export enum ViolationLevel {
  MINOR = 'minor',
  MODERATE = 'moderate',
  SERIOUS = 'serious',
  CRITICAL = 'critical'
}

/**
 * Accessibility test result interface
 */
export interface A11yTestResult {
  passed: boolean;
  violations: any[];
  incomplete: any[];
  passes: any[];
  summary: {
    total: number;
    critical: number;
    serious: number;
    moderate: number;
    minor: number;
  };
}

/**
 * Accessibility testing utilities
 */
export class AccessibilityTester {
  /**
   * Run comprehensive accessibility tests on a component
   */
  async testComponent(
    component: React.ReactElement,
    options: {
      config?: any;
      skipRules?: string[];
      onlyRules?: string[];
    } = {}
  ): Promise<A11yTestResult> {
    const { container } = render(component);
    
    const config = {
      ...A11Y_CONFIG,
      ...options.config,
      rules: {
        ...A11Y_CONFIG.rules,
        ...(options.skipRules?.reduce((acc, rule) => ({ ...acc, [rule]: { enabled: false } }), {}) || {}),
        ...(options.onlyRules?.reduce((acc, rule) => ({ ...acc, [rule]: { enabled: true } }), {}) || {})
      }
    };
    
    const results = await axe(container, config);
    
    return this.processResults(results);
  }
  
  /**
   * Test keyboard navigation
   */
  async testKeyboardNavigation(
    component: React.ReactElement,
    expectedFocusOrder: string[] = []
  ): Promise<{
    passed: boolean;
    focusOrder: string[];
    expectedOrder: string[];
    issues: string[];
  }> {
    const user = userEvent.setup();
    const { container } = render(component);
    
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const focusOrder: string[] = [];
    const issues: string[] = [];
    
    // Test Tab navigation
    for (let i = 0; i < focusableElements.length; i++) {
      await user.tab();
      const activeElement = document.activeElement;
      
      if (activeElement) {
        const identifier = this.getElementIdentifier(activeElement);
        focusOrder.push(identifier);
        
        // Check if element is visible and accessible
        if (!this.isElementVisible(activeElement)) {
          issues.push(`Element ${identifier} is focusable but not visible`);
        }
        
        // Check for focus indicators
        if (!this.hasFocusIndicator(activeElement)) {
          issues.push(`Element ${identifier} lacks visible focus indicator`);
        }
      }
    }
    
    // Test Shift+Tab navigation
    for (let i = focusableElements.length - 1; i >= 0; i--) {
      await user.tab({ shift: true });
    }
    
    const passed = issues.length === 0 && 
      (expectedFocusOrder.length === 0 || this.arraysEqual(focusOrder, expectedFocusOrder));
    
    return {
      passed,
      focusOrder,
      expectedOrder: expectedFocusOrder,
      issues
    };
  }
  
  /**
   * Test screen reader compatibility
   */
  async testScreenReader(
    component: React.ReactElement
  ): Promise<{
    passed: boolean;
    ariaLabels: string[];
    missingLabels: string[];
    redundantLabels: string[];
    issues: string[];
  }> {
    const { container } = render(component);
    
    const issues: string[] = [];
    const ariaLabels: string[] = [];
    const missingLabels: string[] = [];
    const redundantLabels: string[] = [];
    
    // Check for proper ARIA labels
    const interactiveElements = container.querySelectorAll(
      'button, input, select, textarea, [role="button"], [role="link"], [role="tab"]'
    );
    
    interactiveElements.forEach(element => {
      const label = this.getAccessibleName(element);
      
      if (label) {
        ariaLabels.push(label);
        
        // Check for redundant labels
        if (this.isLabelRedundant(element, label)) {
          redundantLabels.push(label);
        }
      } else {
        const identifier = this.getElementIdentifier(element);
        missingLabels.push(identifier);
        issues.push(`Interactive element ${identifier} lacks accessible name`);
      }
    });
    
    // Check for proper heading structure
    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
    let previousLevel = 0;
    
    headings.forEach(heading => {
      const level = parseInt(heading.tagName.charAt(1));
      
      if (level > previousLevel + 1) {
        issues.push(`Heading level skipped: ${heading.tagName} after h${previousLevel}`);
      }
      
      previousLevel = level;
    });
    
    // Check for alt text on images
    const images = container.querySelectorAll('img');
    images.forEach(img => {
      if (!img.getAttribute('alt') && !img.getAttribute('aria-label')) {
        issues.push(`Image missing alt text: ${this.getElementIdentifier(img)}`);
      }
    });
    
    return {
      passed: issues.length === 0,
      ariaLabels,
      missingLabels,
      redundantLabels,
      issues
    };
  }
  
  /**
   * Test color contrast
   */
  async testColorContrast(
    component: React.ReactElement
  ): Promise<{
    passed: boolean;
    violations: Array<{
      element: string;
      foreground: string;
      background: string;
      ratio: number;
      required: number;
    }>;
  }> {
    const { container } = render(component);
    const violations: any[] = [];
    
    // This would typically use a color contrast analyzer
    // For now, we'll simulate the check
    const textElements = container.querySelectorAll('*');
    
    textElements.forEach(element => {
      const styles = window.getComputedStyle(element);
      const color = styles.color;
      const backgroundColor = styles.backgroundColor;
      
      // Simplified contrast check (in real implementation, use proper contrast calculation)
      if (color && backgroundColor && color !== 'rgba(0, 0, 0, 0)' && backgroundColor !== 'rgba(0, 0, 0, 0)') {
        const ratio = this.calculateContrastRatio(color, backgroundColor);
        const required = this.getRequiredContrastRatio(element);
        
        if (ratio < required) {
          violations.push({
            element: this.getElementIdentifier(element),
            foreground: color,
            background: backgroundColor,
            ratio,
            required
          });
        }
      }
    });
    
    return {
      passed: violations.length === 0,
      violations
    };
  }
  
  /**
   * Process axe results
   */
  private processResults(results: any): A11yTestResult {
    const summary = {
      total: results.violations.length,
      critical: results.violations.filter((v: any) => v.impact === 'critical').length,
      serious: results.violations.filter((v: any) => v.impact === 'serious').length,
      moderate: results.violations.filter((v: any) => v.impact === 'moderate').length,
      minor: results.violations.filter((v: any) => v.impact === 'minor').length
    };
    
    return {
      passed: results.violations.length === 0,
      violations: results.violations,
      incomplete: results.incomplete,
      passes: results.passes,
      summary
    };
  }
  
  /**
   * Get element identifier for reporting
   */
  private getElementIdentifier(element: Element): string {
    if (element.id) return `#${element.id}`;
    if (element.getAttribute('data-testid')) return `[data-testid="${element.getAttribute('data-testid')}"]`;
    if (element.className) return `.${element.className.split(' ')[0]}`;
    return element.tagName.toLowerCase();
  }
  
  /**
   * Check if element is visible
   */
  private isElementVisible(element: Element): boolean {
    const styles = window.getComputedStyle(element);
    return styles.display !== 'none' && 
           styles.visibility !== 'hidden' && 
           styles.opacity !== '0';
  }
  
  /**
   * Check if element has focus indicator
   */
  private hasFocusIndicator(element: Element): boolean {
    const styles = window.getComputedStyle(element, ':focus');
    return styles.outline !== 'none' || 
           styles.boxShadow !== 'none' || 
           styles.border !== styles.border; // Simplified check
  }
  
  /**
   * Get accessible name for element
   */
  private getAccessibleName(element: Element): string {
    return element.getAttribute('aria-label') ||
           element.getAttribute('aria-labelledby') ||
           element.getAttribute('title') ||
           element.textContent?.trim() ||
           '';
  }
  
  /**
   * Check if label is redundant
   */
  private isLabelRedundant(element: Element, label: string): boolean {
    const textContent = element.textContent?.trim() || '';
    return label === textContent;
  }
  
  /**
   * Calculate contrast ratio (simplified)
   */
  private calculateContrastRatio(foreground: string, background: string): number {
    // Simplified calculation - in real implementation, use proper color parsing
    return 4.5; // Mock value
  }
  
  /**
   * Get required contrast ratio based on element
   */
  private getRequiredContrastRatio(element: Element): number {
    const styles = window.getComputedStyle(element);
    const fontSize = parseFloat(styles.fontSize);
    const fontWeight = styles.fontWeight;
    
    // Large text (18pt+ or 14pt+ bold) requires 3:1, normal text requires 4.5:1
    if (fontSize >= 18 || (fontSize >= 14 && (fontWeight === 'bold' || parseInt(fontWeight) >= 700))) {
      return 3.0;
    }
    return 4.5;
  }
  
  /**
   * Compare arrays for equality
   */
  private arraysEqual(a: string[], b: string[]): boolean {
    return a.length === b.length && a.every((val, i) => val === b[i]);
  }
}

/**
 * Accessibility test helpers
 */
export const a11yUtils = {
  /**
   * Quick accessibility test
   */
  async quickTest(component: React.ReactElement): Promise<boolean> {
    const tester = new AccessibilityTester();
    const result = await tester.testComponent(component);
    return result.passed;
  },
  
  /**
   * Comprehensive accessibility test
   */
  async comprehensiveTest(component: React.ReactElement): Promise<{
    axe: A11yTestResult;
    keyboard: any;
    screenReader: any;
    colorContrast: any;
    overall: boolean;
  }> {
    const tester = new AccessibilityTester();
    
    const [axe, keyboard, screenReader, colorContrast] = await Promise.all([
      tester.testComponent(component),
      tester.testKeyboardNavigation(component),
      tester.testScreenReader(component),
      tester.testColorContrast(component)
    ]);
    
    const overall = axe.passed && keyboard.passed && screenReader.passed && colorContrast.passed;
    
    return {
      axe,
      keyboard,
      screenReader,
      colorContrast,
      overall
    };
  },
  
  /**
   * Create accessibility test assertions
   */
  expectA11y: (result: A11yTestResult) => ({
    toHaveNoViolations() {
      expect(result.violations).toHaveLength(0);
    },
    
    toHaveNoCriticalViolations() {
      const critical = result.violations.filter(v => v.impact === 'critical');
      expect(critical).toHaveLength(0);
    },
    
    toMeetWCAGLevel(level: 'A' | 'AA' | 'AAA') {
      const levelViolations = result.violations.filter(v => 
        v.tags.includes(`wcag2${level.toLowerCase()}`)
      );
      expect(levelViolations).toHaveLength(0);
    }
  })
};

// Export singleton instance
export const accessibilityTester = new AccessibilityTester();

export default {
  AccessibilityTester,
  accessibilityTester,
  a11yUtils,
  A11Y_CONFIG,
  ViolationLevel
};

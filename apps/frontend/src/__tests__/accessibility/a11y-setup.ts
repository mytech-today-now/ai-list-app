/**
 * @fileoverview Accessibility testing setup and configuration
 * @author AI ToDo MCP Team
 * @version 1.0.0
 */

import { beforeAll, afterAll, beforeEach } from 'vitest';
import { toHaveNoViolations } from 'jest-axe';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock screen reader APIs
const mockScreenReader = {
  speak: vi.fn(),
  stop: vi.fn(),
  getVoices: vi.fn(() => []),
  speaking: false,
  pending: false,
  paused: false,
  volume: 1,
  rate: 1,
  pitch: 1,
  voice: null,
  onvoiceschanged: null,
  onboundary: null,
  onend: null,
  onerror: null,
  onmark: null,
  onpause: null,
  onresume: null,
  onstart: null,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn()
};

// Mock Web Speech API
if (typeof speechSynthesis === 'undefined') {
  global.speechSynthesis = mockScreenReader as any;
  global.SpeechSynthesisUtterance = class MockSpeechSynthesisUtterance {
    text = '';
    lang = 'en-US';
    voice = null;
    volume = 1;
    rate = 1;
    pitch = 1;
    onstart = null;
    onend = null;
    onerror = null;
    onpause = null;
    onresume = null;
    onmark = null;
    onboundary = null;
    
    constructor(text?: string) {
      if (text) this.text = text;
    }
    
    addEventListener = vi.fn();
    removeEventListener = vi.fn();
    dispatchEvent = vi.fn();
  } as any;
}

// Mock media query for reduced motion
const mockMatchMedia = (query: string) => ({
  matches: query.includes('prefers-reduced-motion'),
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn()
});

if (typeof window.matchMedia === 'undefined') {
  window.matchMedia = mockMatchMedia;
}

// Mock focus management
let focusedElement: Element | null = null;

Object.defineProperty(document, 'activeElement', {
  get: () => focusedElement,
  configurable: true
});

// Enhanced focus method that tracks focus
const originalFocus = HTMLElement.prototype.focus;
HTMLElement.prototype.focus = function(options?: FocusOptions) {
  focusedElement = this;
  this.setAttribute('data-focused', 'true');
  
  // Trigger focus event
  const focusEvent = new FocusEvent('focus', {
    bubbles: true,
    cancelable: true,
    relatedTarget: null
  });
  this.dispatchEvent(focusEvent);
  
  return originalFocus.call(this, options);
};

// Enhanced blur method
const originalBlur = HTMLElement.prototype.blur;
HTMLElement.prototype.blur = function() {
  if (focusedElement === this) {
    focusedElement = null;
  }
  this.removeAttribute('data-focused');
  
  // Trigger blur event
  const blurEvent = new FocusEvent('blur', {
    bubbles: true,
    cancelable: true,
    relatedTarget: null
  });
  this.dispatchEvent(blurEvent);
  
  return originalBlur.call(this);
};

// Mock IntersectionObserver for visibility testing
if (typeof IntersectionObserver === 'undefined') {
  global.IntersectionObserver = class MockIntersectionObserver {
    constructor(callback: IntersectionObserverCallback) {
      this.callback = callback;
    }
    
    callback: IntersectionObserverCallback;
    root = null;
    rootMargin = '';
    thresholds = [];
    
    observe = vi.fn((target: Element) => {
      // Simulate element being visible
      setTimeout(() => {
        this.callback([{
          target,
          isIntersecting: true,
          intersectionRatio: 1,
          boundingClientRect: target.getBoundingClientRect(),
          intersectionRect: target.getBoundingClientRect(),
          rootBounds: null,
          time: Date.now()
        }], this);
      }, 0);
    });
    
    unobserve = vi.fn();
    disconnect = vi.fn();
  };
}

// Mock ResizeObserver for responsive testing
if (typeof ResizeObserver === 'undefined') {
  global.ResizeObserver = class MockResizeObserver {
    constructor(callback: ResizeObserverCallback) {
      this.callback = callback;
    }
    
    callback: ResizeObserverCallback;
    
    observe = vi.fn((target: Element) => {
      // Simulate resize
      setTimeout(() => {
        this.callback([{
          target,
          contentRect: target.getBoundingClientRect(),
          borderBoxSize: [{ blockSize: 100, inlineSize: 100 }],
          contentBoxSize: [{ blockSize: 100, inlineSize: 100 }],
          devicePixelContentBoxSize: [{ blockSize: 100, inlineSize: 100 }]
        }], this);
      }, 0);
    });
    
    unobserve = vi.fn();
    disconnect = vi.fn();
  };
}

beforeAll(() => {
  // Set up accessibility testing environment
  document.documentElement.lang = 'en';
  
  // Add high contrast mode detection
  const style = document.createElement('style');
  style.innerHTML = `
    @media (prefers-contrast: high) {
      :root {
        --high-contrast: true;
      }
    }
    
    @media (prefers-reduced-motion: reduce) {
      :root {
        --reduced-motion: true;
      }
    }
    
    @media (prefers-color-scheme: dark) {
      :root {
        --dark-mode: true;
      }
    }
  `;
  document.head.appendChild(style);
  
  // Set up ARIA live regions for testing
  const liveRegion = document.createElement('div');
  liveRegion.setAttribute('aria-live', 'polite');
  liveRegion.setAttribute('aria-atomic', 'true');
  liveRegion.setAttribute('data-testid', 'live-region');
  liveRegion.style.position = 'absolute';
  liveRegion.style.left = '-10000px';
  liveRegion.style.width = '1px';
  liveRegion.style.height = '1px';
  liveRegion.style.overflow = 'hidden';
  document.body.appendChild(liveRegion);
});

afterAll(() => {
  // Clean up accessibility testing environment
  const liveRegion = document.querySelector('[data-testid="live-region"]');
  if (liveRegion) {
    liveRegion.remove();
  }
});

beforeEach(() => {
  // Reset focus state
  focusedElement = null;
  
  // Clear any focused elements
  document.querySelectorAll('[data-focused]').forEach(el => {
    el.removeAttribute('data-focused');
  });
  
  // Reset screen reader mock
  mockScreenReader.speak.mockClear();
  mockScreenReader.stop.mockClear();
});

// Export accessibility test utilities
export const a11yTestUtils = {
  getFocusedElement: () => focusedElement,
  
  simulateKeyboardNavigation: async (element: Element, key: string) => {
    const keyEvent = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true
    });
    element.dispatchEvent(keyEvent);
    
    // Simulate focus change for Tab key
    if (key === 'Tab') {
      const focusableElements = Array.from(
        document.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      );
      
      const currentIndex = focusableElements.indexOf(element);
      const nextElement = focusableElements[currentIndex + 1];
      
      if (nextElement && 'focus' in nextElement) {
        (nextElement as HTMLElement).focus();
      }
    }
  },
  
  announceToScreenReader: (message: string) => {
    const liveRegion = document.querySelector('[data-testid="live-region"]');
    if (liveRegion) {
      liveRegion.textContent = message;
    }
    mockScreenReader.speak(message);
  },
  
  getScreenReaderAnnouncements: () => {
    return mockScreenReader.speak.mock.calls.map(call => call[0]);
  },
  
  simulateHighContrast: () => {
    document.documentElement.setAttribute('data-high-contrast', 'true');
    return () => {
      document.documentElement.removeAttribute('data-high-contrast');
    };
  },
  
  simulateReducedMotion: () => {
    document.documentElement.setAttribute('data-reduced-motion', 'true');
    return () => {
      document.documentElement.removeAttribute('data-reduced-motion');
    };
  },
  
  simulateDarkMode: () => {
    document.documentElement.setAttribute('data-dark-mode', 'true');
    return () => {
      document.documentElement.removeAttribute('data-dark-mode');
    };
  }
};

export default a11yTestUtils;

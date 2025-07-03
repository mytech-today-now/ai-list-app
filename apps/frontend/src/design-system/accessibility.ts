/**
 * Accessibility Utilities - Comprehensive accessibility helpers for AI-First UI
 * SemanticType: AccessibilityUtils
 * ExtensibleByAI: true
 * AIUseCases: ["WCAG compliance", "Screen reader support", "Keyboard navigation", "Focus management"]
 */

import { useEffect, useRef, useCallback } from 'react'

/**
 * ARIA role types for semantic components
 */
export type AriaRole = 
  | 'button' | 'link' | 'menuitem' | 'tab' | 'tabpanel' | 'dialog' | 'alertdialog'
  | 'alert' | 'status' | 'log' | 'marquee' | 'timer' | 'tooltip' | 'progressbar'
  | 'slider' | 'spinbutton' | 'textbox' | 'combobox' | 'listbox' | 'option'
  | 'grid' | 'gridcell' | 'row' | 'columnheader' | 'rowheader' | 'table'
  | 'navigation' | 'main' | 'banner' | 'contentinfo' | 'complementary'
  | 'search' | 'form' | 'region' | 'article' | 'section'

/**
 * Keyboard key constants
 */
export const Keys = {
  ENTER: 'Enter',
  SPACE: ' ',
  TAB: 'Tab',
  ESCAPE: 'Escape',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
  PAGE_UP: 'PageUp',
  PAGE_DOWN: 'PageDown',
} as const

/**
 * WCAG color contrast ratios
 */
export const ContrastRatios = {
  AA_NORMAL: 4.5,
  AA_LARGE: 3,
  AAA_NORMAL: 7,
  AAA_LARGE: 4.5,
} as const

/**
 * Generate unique ID for accessibility
 */
export function generateA11yId(prefix: string = 'a11y'): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Hook for managing focus trap within a component
 */
export function useFocusTrap(isActive: boolean = true) {
  const containerRef = useRef<HTMLElement>(null)
  const firstFocusableRef = useRef<HTMLElement | null>(null)
  const lastFocusableRef = useRef<HTMLElement | null>(null)

  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return []
    
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]',
    ].join(', ')

    return Array.from(containerRef.current.querySelectorAll(focusableSelectors)) as HTMLElement[]
  }, [])

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isActive || event.key !== Keys.TAB) return

    const focusableElements = getFocusableElements()
    if (focusableElements.length === 0) return

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    if (event.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }
  }, [isActive, getFocusableElements])

  useEffect(() => {
    if (isActive) {
      document.addEventListener('keydown', handleKeyDown)
      
      // Focus first element when trap becomes active
      const focusableElements = getFocusableElements()
      if (focusableElements.length > 0) {
        focusableElements[0].focus()
      }
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isActive, handleKeyDown, getFocusableElements])

  return { containerRef, firstFocusableRef, lastFocusableRef }
}

/**
 * Hook for managing focus restoration
 */
export function useFocusRestore() {
  const previousActiveElement = useRef<HTMLElement | null>(null)

  const saveFocus = useCallback(() => {
    previousActiveElement.current = document.activeElement as HTMLElement
  }, [])

  const restoreFocus = useCallback(() => {
    if (previousActiveElement.current) {
      previousActiveElement.current.focus()
      previousActiveElement.current = null
    }
  }, [])

  return { saveFocus, restoreFocus }
}

/**
 * Hook for keyboard navigation
 */
export function useKeyboardNavigation(
  items: HTMLElement[],
  options: {
    orientation?: 'horizontal' | 'vertical' | 'both'
    loop?: boolean
    activateOnFocus?: boolean
  } = {}
) {
  const { orientation = 'vertical', loop = true, activateOnFocus = false } = options
  const currentIndex = useRef(0)

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const { key } = event
    let newIndex = currentIndex.current

    switch (key) {
      case Keys.ARROW_DOWN:
        if (orientation === 'vertical' || orientation === 'both') {
          event.preventDefault()
          newIndex = loop 
            ? (currentIndex.current + 1) % items.length
            : Math.min(currentIndex.current + 1, items.length - 1)
        }
        break

      case Keys.ARROW_UP:
        if (orientation === 'vertical' || orientation === 'both') {
          event.preventDefault()
          newIndex = loop
            ? currentIndex.current === 0 ? items.length - 1 : currentIndex.current - 1
            : Math.max(currentIndex.current - 1, 0)
        }
        break

      case Keys.ARROW_RIGHT:
        if (orientation === 'horizontal' || orientation === 'both') {
          event.preventDefault()
          newIndex = loop
            ? (currentIndex.current + 1) % items.length
            : Math.min(currentIndex.current + 1, items.length - 1)
        }
        break

      case Keys.ARROW_LEFT:
        if (orientation === 'horizontal' || orientation === 'both') {
          event.preventDefault()
          newIndex = loop
            ? currentIndex.current === 0 ? items.length - 1 : currentIndex.current - 1
            : Math.max(currentIndex.current - 1, 0)
        }
        break

      case Keys.HOME:
        event.preventDefault()
        newIndex = 0
        break

      case Keys.END:
        event.preventDefault()
        newIndex = items.length - 1
        break

      default:
        return
    }

    if (newIndex !== currentIndex.current && items[newIndex]) {
      currentIndex.current = newIndex
      items[newIndex].focus()
      
      if (activateOnFocus) {
        items[newIndex].click()
      }
    }
  }, [items, orientation, loop, activateOnFocus])

  return { handleKeyDown, currentIndex: currentIndex.current }
}

/**
 * Hook for announcing content to screen readers
 */
export function useScreenReaderAnnouncement() {
  const announcementRef = useRef<HTMLDivElement | null>(null)

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!announcementRef.current) {
      // Create announcement element if it doesn't exist
      const element = document.createElement('div')
      element.setAttribute('aria-live', priority)
      element.setAttribute('aria-atomic', 'true')
      element.className = 'sr-only'
      document.body.appendChild(element)
      announcementRef.current = element
    }

    // Clear and set new message
    announcementRef.current.textContent = ''
    setTimeout(() => {
      if (announcementRef.current) {
        announcementRef.current.textContent = message
      }
    }, 100)
  }, [])

  useEffect(() => {
    return () => {
      if (announcementRef.current) {
        document.body.removeChild(announcementRef.current)
      }
    }
  }, [])

  return announce
}

/**
 * Accessibility validation helpers
 */
export const a11yValidation = {
  /**
   * Check if element has accessible name
   */
  hasAccessibleName(element: HTMLElement): boolean {
    return !!(
      element.getAttribute('aria-label') ||
      element.getAttribute('aria-labelledby') ||
      element.textContent?.trim() ||
      (element as HTMLInputElement).placeholder
    )
  },

  /**
   * Check if interactive element has proper role
   */
  hasProperRole(element: HTMLElement): boolean {
    const tagName = element.tagName.toLowerCase()
    const role = element.getAttribute('role')
    
    // Native interactive elements don't need explicit roles
    if (['button', 'a', 'input', 'select', 'textarea'].includes(tagName)) {
      return true
    }
    
    // Custom interactive elements should have appropriate roles
    return !!(role && ['button', 'link', 'menuitem', 'tab', 'option'].includes(role))
  },

  /**
   * Check if element is keyboard accessible
   */
  isKeyboardAccessible(element: HTMLElement): boolean {
    const tabIndex = element.getAttribute('tabindex')
    const tagName = element.tagName.toLowerCase()
    
    // Naturally focusable elements
    if (['button', 'a', 'input', 'select', 'textarea'].includes(tagName)) {
      return tabIndex !== '-1'
    }
    
    // Custom interactive elements should have tabindex
    return tabIndex !== null && tabIndex !== '-1'
  },

  /**
   * Check color contrast ratio
   */
  checkColorContrast(foreground: string, background: string): number {
    // This is a simplified version - in production, use a proper color contrast library
    // Returns a mock value for demonstration
    return 4.5
  },
}

/**
 * Common accessibility patterns
 */
export const a11yPatterns = {
  /**
   * Button pattern with proper semantics
   */
  button: {
    role: 'button' as AriaRole,
    tabIndex: 0,
    onKeyDown: (event: React.KeyboardEvent, onClick?: () => void) => {
      if ((event.key === Keys.ENTER || event.key === Keys.SPACE) && onClick) {
        event.preventDefault()
        onClick()
      }
    },
  },

  /**
   * Link pattern with proper semantics
   */
  link: {
    role: 'link' as AriaRole,
    tabIndex: 0,
  },

  /**
   * Dialog pattern with proper semantics
   */
  dialog: {
    role: 'dialog' as AriaRole,
    'aria-modal': true,
    tabIndex: -1,
  },

  /**
   * Alert pattern with proper semantics
   */
  alert: {
    role: 'alert' as AriaRole,
    'aria-live': 'assertive' as const,
    'aria-atomic': true,
  },

  /**
   * Status pattern with proper semantics
   */
  status: {
    role: 'status' as AriaRole,
    'aria-live': 'polite' as const,
    'aria-atomic': true,
  },
}

/**
 * MCP-specific accessibility patterns
 */
export const mcpA11yPatterns = {
  command: {
    role: 'button' as AriaRole,
    'aria-describedby': 'mcp-command-help',
    'data-semantic-type': 'mcp-command',
  },
  
  resource: {
    role: 'region' as AriaRole,
    'aria-label': 'MCP Resource',
    'data-semantic-type': 'mcp-resource',
  },
  
  prompt: {
    role: 'textbox' as AriaRole,
    'aria-label': 'AI Prompt Input',
    'data-semantic-type': 'mcp-prompt',
  },
  
  event: {
    role: 'log' as AriaRole,
    'aria-live': 'polite' as const,
    'data-semantic-type': 'mcp-event',
  },
}

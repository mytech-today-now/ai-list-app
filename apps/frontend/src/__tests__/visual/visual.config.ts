import { MatchImageSnapshotOptions } from 'jest-image-snapshot'

// Visual regression testing configuration
export const visualTestConfig: MatchImageSnapshotOptions = {
  // Threshold for pixel differences (0-1, where 0 is exact match)
  threshold: 0.2,
  
  // Custom diff configuration
  customDiffConfig: {
    threshold: 0.2,
    includeAA: false, // Ignore anti-aliasing differences
  },
  
  // Failure threshold as percentage
  failureThreshold: 0.01,
  failureThresholdType: 'percent',
  
  // Blur to reduce noise
  blur: 1,
  
  // Allow for slight differences in rendering
  allowSizeMismatch: false,
  
  // Custom snapshot directory
  customSnapshotsDir: '__snapshots__',
  customDiffDir: '__snapshots__/__diff_output__',
  
  // Store diff images on failure
  storeReceivedOnFailure: true,
  
  // Update snapshots in CI
  updatePassedSnapshot: false,
  
  // Comparison method
  comparisonMethod: 'pixelmatch',
  
  // Pixel match options
  pixelmatchOptions: {
    threshold: 0.2,
    includeAA: false,
    alpha: 0.1,
    aaColor: [255, 255, 0],
    diffColor: [255, 0, 255],
    diffColorAlt: null,
  },
}

// Device configurations for responsive testing
export const deviceConfigs = {
  mobile: {
    width: 375,
    height: 667,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
  tablet: {
    width: 768,
    height: 1024,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
  desktop: {
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
  },
  desktopHD: {
    width: 2560,
    height: 1440,
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
  },
}

// Theme configurations for visual testing
export const themeConfigs = {
  light: {
    colorScheme: 'light',
    className: 'light-theme',
  },
  dark: {
    colorScheme: 'dark',
    className: 'dark-theme',
  },
  highContrast: {
    colorScheme: 'light',
    className: 'high-contrast-theme',
  },
}

// Component states for testing
export const componentStates = {
  default: {},
  loading: { loading: true },
  error: { error: 'Test error message' },
  empty: { data: [] },
  populated: { data: ['item1', 'item2', 'item3'] },
  disabled: { disabled: true },
  focused: { autoFocus: true },
  hover: { 'data-hover': true },
  active: { 'data-active': true },
}

// Animation configurations
export const animationConfigs = {
  disabled: {
    reducedMotion: 'reduce',
    animationDuration: '0s',
    transitionDuration: '0s',
  },
  enabled: {
    reducedMotion: 'no-preference',
    animationDuration: 'normal',
    transitionDuration: 'normal',
  },
}

// Viewport configurations for testing
export const viewportConfigs = {
  xs: { width: 320, height: 568 }, // iPhone SE
  sm: { width: 375, height: 667 }, // iPhone 8
  md: { width: 768, height: 1024 }, // iPad
  lg: { width: 1024, height: 768 }, // iPad Landscape
  xl: { width: 1280, height: 720 }, // Desktop
  '2xl': { width: 1920, height: 1080 }, // Full HD
  '4k': { width: 3840, height: 2160 }, // 4K
}

// Browser configurations
export const browserConfigs = {
  chromium: {
    name: 'chromium',
    channel: 'chrome',
  },
  firefox: {
    name: 'firefox',
  },
  webkit: {
    name: 'webkit',
  },
  edge: {
    name: 'msedge',
    channel: 'msedge',
  },
}

// Visual test scenarios
export const visualTestScenarios = [
  {
    name: 'default-state',
    description: 'Component in default state',
    props: componentStates.default,
  },
  {
    name: 'loading-state',
    description: 'Component in loading state',
    props: componentStates.loading,
  },
  {
    name: 'error-state',
    description: 'Component in error state',
    props: componentStates.error,
  },
  {
    name: 'empty-state',
    description: 'Component with no data',
    props: componentStates.empty,
  },
  {
    name: 'populated-state',
    description: 'Component with data',
    props: componentStates.populated,
  },
  {
    name: 'disabled-state',
    description: 'Component in disabled state',
    props: componentStates.disabled,
  },
]

// Accessibility configurations for visual testing
export const a11yConfigs = {
  default: {},
  highContrast: {
    forcedColors: 'active',
  },
  reducedMotion: {
    prefersReducedMotion: 'reduce',
  },
  largeText: {
    fontSize: '120%',
  },
  darkMode: {
    colorScheme: 'dark',
  },
}

// Performance thresholds for visual tests
export const performanceThresholds = {
  renderTime: 1000, // ms
  imageSize: 500 * 1024, // 500KB
  compressionRatio: 0.8,
}

// Test environment configurations
export const testEnvironments = {
  development: {
    baseURL: 'http://localhost:5173',
    timeout: 30000,
  },
  staging: {
    baseURL: 'https://staging.example.com',
    timeout: 60000,
  },
  production: {
    baseURL: 'https://app.example.com',
    timeout: 60000,
  },
}

// Snapshot naming conventions
export const snapshotNaming = {
  getSnapshotName: (
    componentName: string,
    scenario: string,
    device: string,
    theme: string,
    browser: string
  ) => {
    return `${componentName}-${scenario}-${device}-${theme}-${browser}`
  },
  
  getSnapshotPath: (
    componentName: string,
    scenario: string,
    device: string,
    theme: string,
    browser: string
  ) => {
    const name = snapshotNaming.getSnapshotName(componentName, scenario, device, theme, browser)
    return `__snapshots__/${componentName}/${name}.png`
  },
}

// Visual test utilities
export const visualTestUtils = {
  // Wait for animations to complete
  waitForAnimations: async (page: any) => {
    await page.waitForFunction(() => {
      const animations = document.getAnimations()
      return animations.every(animation => animation.playState === 'finished')
    })
  },
  
  // Wait for fonts to load
  waitForFonts: async (page: any) => {
    await page.waitForFunction(() => document.fonts.ready)
  },
  
  // Wait for images to load
  waitForImages: async (page: any) => {
    await page.waitForFunction(() => {
      const images = Array.from(document.images)
      return images.every(img => img.complete && img.naturalHeight !== 0)
    })
  },
  
  // Disable animations for consistent screenshots
  disableAnimations: async (page: any) => {
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `,
    })
  },
  
  // Set consistent fonts for cross-platform testing
  setConsistentFonts: async (page: any) => {
    await page.addStyleTag({
      content: `
        * {
          font-family: 'Arial', sans-serif !important;
        }
      `,
    })
  },
}

/**
 * Visual testing setup for jest-image-snapshot and canvas
 * This file configures the testing environment for visual regression tests
 */

import { toMatchImageSnapshot } from 'jest-image-snapshot'
import 'jest-canvas-mock'

// Extend Jest matchers with image snapshot functionality
expect.extend({ toMatchImageSnapshot })

// Configure canvas mock for testing environment
// This ensures canvas operations work in the jsdom environment
if (typeof HTMLCanvasElement !== 'undefined') {
  // Mock canvas methods that might not be available in jsdom
  HTMLCanvasElement.prototype.getContext = jest.fn((contextType: string) => {
    if (contextType === '2d') {
      return {
        fillStyle: '',
        strokeStyle: '',
        font: '',
        fillRect: jest.fn(),
        strokeRect: jest.fn(),
        fillText: jest.fn(),
        measureText: jest.fn(() => ({ width: 100 })),
        clearRect: jest.fn(),
        beginPath: jest.fn(),
        moveTo: jest.fn(),
        lineTo: jest.fn(),
        stroke: jest.fn(),
        fill: jest.fn(),
        arc: jest.fn(),
        save: jest.fn(),
        restore: jest.fn(),
        translate: jest.fn(),
        rotate: jest.fn(),
        scale: jest.fn(),
        drawImage: jest.fn(),
        createImageData: jest.fn(),
        getImageData: jest.fn(),
        putImageData: jest.fn(),
      }
    }
    return null
  })

  // Mock toBlob method for canvas
  HTMLCanvasElement.prototype.toBlob = jest.fn((callback: BlobCallback, type?: string, quality?: any) => {
    // Create a mock blob with minimal PNG data
    const mockPngData = new Uint8Array([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
      0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
      0x49, 0x48, 0x44, 0x52, // IHDR
      0x00, 0x00, 0x00, 0x01, // Width: 1
      0x00, 0x00, 0x00, 0x01, // Height: 1
      0x08, 0x02, 0x00, 0x00, 0x00, // Bit depth, color type, compression, filter, interlace
      0x90, 0x77, 0x53, 0xDE, // CRC
      0x00, 0x00, 0x00, 0x0C, // IDAT chunk length
      0x49, 0x44, 0x41, 0x54, // IDAT
      0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, // Minimal image data
      0x00, 0x00, 0x00, 0x00, // IEND chunk length
      0x49, 0x45, 0x4E, 0x44, // IEND
      0xAE, 0x42, 0x60, 0x82  // CRC
    ])
    
    const blob = new Blob([mockPngData], { type: 'image/png' })
    setTimeout(() => callback(blob), 0)
  })

  // Mock toDataURL method
  HTMLCanvasElement.prototype.toDataURL = jest.fn((type?: string, quality?: any) => {
    // Return a minimal valid PNG data URL
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
  })
}

// Mock File API for blob reading
if (typeof FileReader === 'undefined') {
  global.FileReader = class MockFileReader {
    result: string | ArrayBuffer | null = null
    error: any = null
    readyState: number = 0
    onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null
    onerror: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null
    onabort: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null
    onloadstart: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null
    onloadend: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null
    onprogress: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null

    readAsArrayBuffer(blob: Blob) {
      setTimeout(() => {
        this.result = new ArrayBuffer(8)
        this.readyState = 2
        if (this.onload) {
          this.onload({} as ProgressEvent<FileReader>)
        }
      }, 0)
    }

    readAsDataURL(blob: Blob) {
      setTimeout(() => {
        this.result = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
        this.readyState = 2
        if (this.onload) {
          this.onload({} as ProgressEvent<FileReader>)
        }
      }, 0)
    }

    readAsText(blob: Blob) {
      setTimeout(() => {
        this.result = 'mock text'
        this.readyState = 2
        if (this.onload) {
          this.onload({} as ProgressEvent<FileReader>)
        }
      }, 0)
    }

    abort() {
      this.readyState = 2
      if (this.onabort) {
        this.onabort({} as ProgressEvent<FileReader>)
      }
    }

    addEventListener() {}
    removeEventListener() {}
    dispatchEvent() { return true }
  } as any
}

// Mock Buffer for Node.js compatibility in browser environment
if (typeof Buffer === 'undefined') {
  global.Buffer = {
    from: (data: any) => new Uint8Array(data),
    isBuffer: () => false,
  } as any
}

// Setup global test environment variables
global.__VISUAL_TESTING__ = true

// Configure test timeouts for visual tests
jest.setTimeout(30000)

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
  } as any
}

// Mock ResizeObserver for responsive testing
if (typeof ResizeObserver === 'undefined') {
  global.ResizeObserver = class MockResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any
}

// Mock IntersectionObserver for visibility testing
if (typeof IntersectionObserver === 'undefined') {
  global.IntersectionObserver = class MockIntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any
}

// Setup console warnings for visual test issues
const originalWarn = console.warn
console.warn = (...args: any[]) => {
  // Filter out canvas-related warnings that are expected in test environment
  const message = args.join(' ')
  if (
    message.includes('canvas') ||
    message.includes('toBlob') ||
    message.includes('toDataURL') ||
    message.includes('getContext')
  ) {
    return
  }
  originalWarn.apply(console, args)
}

// Export setup confirmation
export const visualTestingSetup = {
  canvasSupport: true,
  imageSnapshotSupport: true,
  mockingEnabled: true,
  environment: 'test',
}

console.log('Visual testing setup completed successfully')

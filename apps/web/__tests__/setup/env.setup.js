/**
 * Zenith Test Environment Setup
 * Sets up environment variables and configurations for testing
 */

// Set test environment variables
process.env.NODE_ENV = 'test'
process.env.NEXTAUTH_SECRET = 'test-secret-key-for-testing'
process.env.NEXTAUTH_URL = 'http://localhost:3000'
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/astralfield_test'

// Suppress console warnings for clean test output
const originalWarn = console.warn
const originalError = console.error

console.warn = (...args) => {
  const message = args.join(' ')
  // Filter out common warnings during testing
  if (
    message.includes('React.createFactory is deprecated') ||
    message.includes('componentWillReceiveProps') ||
    message.includes('componentWillMount') ||
    message.includes('Warning: React.jsx')
  ) {
    return
  }
  originalWarn.apply(console, args)
}

console.error = (...args) => {
  const message = args.join(' ')
  // Filter out expected errors during testing
  if (
    message.includes('Warning: An invalid form control') ||
    message.includes('ResizeObserver loop limit exceeded')
  ) {
    return
  }
  originalError.apply(console, args)
}

// Global test configuration
global.IS_REACT_ACT_ENVIRONMENT = true

// Mock window.matchMedia for JSDOM
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock requestAnimationFrame
global.requestAnimationFrame = (callback) => {
  setTimeout(callback, 0)
}
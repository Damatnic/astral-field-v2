// Jest setup for Astral Field Fantasy Football Platform
// - Extends jest-dom matchers
// - Provides stable test environment defaults
// - Mocks external dependencies and browser APIs

import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// Ensure a predictable NODE_ENV
process.env.NODE_ENV = 'test';

// Test database URL for isolated testing
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/test_fantasy_db';
process.env.NEXTAUTH_SECRET = 'test-secret-key-for-comprehensive-testing';
process.env.NEXTAUTH_URL = 'http://localhost:3000';

// Polyfill TextEncoder/TextDecoder for Node.js environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// In Node 18+, fetch is available globally. Guard just in case.
if (typeof global.fetch === 'undefined') {
  // Lazy import to avoid bundling for environments that already have fetch
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fetchImpl = require('node-fetch');
  global.fetch = fetchImpl;
}

// Enhanced console handling for cleaner test output
const originalError = console.error;
const originalWarn = console.warn;

console.error = (...args) => {
  const msg = args?.[0] || '';
  // Allow React act warnings and explicit test failures to show
  const allowList = [
    'Warning: ',
    'act(...)',
    'Jest did not exit one second after the test run has completed.',
    'Error: ',
  ];
  if (allowList.some((s) => String(msg).includes(s))) return originalError(...args);
};

console.warn = (...args) => {
  const message = args[0]?.toString() || '';
  // Filter out React development warnings in tests
  if (
    message.includes('Warning: ReactDOM.render is deprecated') ||
    message.includes('Warning: React.createFactory is deprecated') ||
    message.includes('Warning: componentWillMount has been renamed')
  ) {
    return;
  }
  originalWarn(...args);
};

// Mock Next.js router for both Pages and App Router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(() => Promise.resolve(true)),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn(() => Promise.resolve()),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
    };
  },
}));

// Mock Next.js App Router navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return '/';
  },
  useParams() {
    return {};
  },
  notFound: jest.fn(),
  redirect: jest.fn(),
}));

// Mock Next.js headers for server components
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: jest.fn((name) => ({ name, value: 'mock-cookie-value' })),
    set: jest.fn(),
    delete: jest.fn(),
    has: jest.fn(() => true),
    getAll: jest.fn(() => []),
  })),
  headers: jest.fn(() => ({
    get: jest.fn((name) => 'mock-header-value'),
    has: jest.fn(() => true),
    entries: jest.fn(() => []),
  })),
}));

// Mock browser APIs
global.WebSocket = jest.fn(() => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  send: jest.fn(),
  close: jest.fn(),
  readyState: 1,
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
}));

global.IntersectionObserver = jest.fn(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  unobserve: jest.fn(),
}));

global.ResizeObserver = jest.fn(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  unobserve: jest.fn(),
}));

// Mock matchMedia for responsive design tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock Canvas API for chart components
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  fillRect: jest.fn(),
  clearRect: jest.fn(),
  getImageData: jest.fn(() => ({ data: new Uint8ClampedArray(4) })),
  putImageData: jest.fn(),
  createImageData: jest.fn(() => []),
  setTransform: jest.fn(),
  drawImage: jest.fn(),
  save: jest.fn(),
  fillText: jest.fn(),
  restore: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  closePath: jest.fn(),
  stroke: jest.fn(),
  translate: jest.fn(),
  scale: jest.fn(),
  rotate: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  measureText: jest.fn(() => ({ width: 0 })),
  transform: jest.fn(),
  rect: jest.fn(),
  clip: jest.fn(),
}));

// Mock scrollTo for smooth scrolling tests
window.scrollTo = jest.fn();

// Mock local and session storage
const createStorageMock = () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
});

global.localStorage = createStorageMock();
global.sessionStorage = createStorageMock();

// Mock URL.createObjectURL for file handling tests
global.URL.createObjectURL = jest.fn(() => 'mocked-object-url');
global.URL.revokeObjectURL = jest.fn();

// Mock Drag and Drop API for lineup management tests
global.DragEvent = jest.fn();
global.DataTransfer = jest.fn(() => ({
  setData: jest.fn(),
  getData: jest.fn(),
  clearData: jest.fn(),
  setDragImage: jest.fn(),
}));

// Clean up between tests
afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
  global.localStorage.clear();
  global.sessionStorage.clear();
  
  if (global.fetch && typeof global.fetch.mockClear === 'function') {
    global.fetch.mockClear();
  }
});

// Restore all mocks after test suite
afterAll(() => {
  jest.restoreAllMocks();
});


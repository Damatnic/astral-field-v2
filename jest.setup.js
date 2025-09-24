// Jest setup for Astral Field Fantasy Football Platform
// - Extends jest-dom matchers
// - Provides stable test environment defaults
// - Mocks external dependencies and browser APIs
// - Sets up test database and authentication helpers

require('@testing-library/jest-dom');
const { TextEncoder, TextDecoder } = require('util');

// Import test helpers (only in Node.js environment)
let TestDatabase, TestHelpers, AuthTestHelpers;
if (typeof window === 'undefined') {
  try {
    const testDb = require('./__tests__/setup/test-database');
    const testHelpers = require('./__tests__/setup/test-helpers');
    const authHelpers = require('./__tests__/setup/auth-helpers');
    
    TestDatabase = testDb.TestDatabase;
    TestHelpers = testHelpers.TestHelpers;
    AuthTestHelpers = authHelpers.AuthTestHelpers;
  } catch (error) {
    console.warn('Test helpers not found - some test features may not work');
  }
}

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
  try {
    // Try Node.js built-in fetch first (Node 18+)
    const { fetch, Request, Response, Headers } = require('undici');
    global.fetch = fetch;
    global.Request = Request;
    global.Response = Response;  
    global.Headers = Headers;
  } catch {
    // Fallback to mock implementations for testing
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
    }));
    
    global.Request = class MockRequest {
      constructor(url, init) {
        this.url = url;
        this.method = init?.method || 'GET';
        this.headers = new Map(Object.entries(init?.headers || {}));
        this.body = init?.body;
      }
    };
    
    global.Response = class MockResponse {
      constructor(body, init) {
        this.body = body;
        this.status = init?.status || 200;
        this.ok = this.status >= 200 && this.status < 300;
        this.headers = new Map(Object.entries(init?.headers || {}));
      }
      
      async json() { return JSON.parse(this.body || '{}'); }
      async text() { return this.body || ''; }
    };
    
    global.Headers = Map;
  }
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
const mockUseRouter = jest.fn();
const mockUsePathname = jest.fn();
const mockUseSearchParams = jest.fn();
const mockUseParams = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: mockUseRouter.mockReturnValue({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: mockUseSearchParams.mockReturnValue(new URLSearchParams()),
  usePathname: mockUsePathname.mockReturnValue('/'),
  useParams: mockUseParams.mockReturnValue({}),
  notFound: jest.fn(),
  redirect: jest.fn(),
}));

// Export mocks for use in tests
global.mockUseRouter = mockUseRouter;
global.mockUsePathname = mockUsePathname;
global.mockUseSearchParams = mockUseSearchParams;
global.mockUseParams = mockUseParams;

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

// Mock matchMedia for responsive design tests (only in browser environment)
if (typeof window !== 'undefined') {
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
}

// Mock Canvas API for chart components (only in browser environment)
if (typeof HTMLCanvasElement !== 'undefined') {
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
}

// Mock scrollTo for smooth scrolling tests (only in browser environment)
if (typeof window !== 'undefined') {
  window.scrollTo = jest.fn();
}

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

// Global test setup - runs once before all tests
beforeAll(async () => {
  // Skip database setup for now to focus on unit tests
  // if (TestDatabase && typeof TestDatabase.setup === 'function') {
  //   try {
  //     await TestDatabase.setup();
  //   } catch (error) {
  //     console.error('Failed to setup test database:', error);
  //   }
  // }
  
  if (TestHelpers) {
    TestHelpers.mockExternalAPIs();
  }
});

// Clean up between tests
afterEach(async () => {
  jest.clearAllMocks();
  jest.clearAllTimers();
  global.localStorage.clear();
  global.sessionStorage.clear();
  
  if (global.fetch && typeof global.fetch.mockClear === 'function') {
    global.fetch.mockClear();
  }
  
  // Skip database cleanup for unit tests
  // if (TestHelpers && typeof TestHelpers.cleanup === 'function') {
  //   try {
  //     await TestHelpers.cleanup();
  //   } catch (error) {
  //     // Ignore cleanup errors in tests
  //   }
  // }
});

// Restore all mocks after test suite
afterAll(async () => {
  jest.restoreAllMocks();
  
  // Skip database teardown for unit tests
  // if (TestDatabase && typeof TestDatabase.teardown === 'function') {
  //   try {
  //     await TestDatabase.teardown();
  //   } catch (error) {
  //     console.error('Failed to teardown test database:', error);
  //   }
  // }
});


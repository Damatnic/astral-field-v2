// Jest setup for Node.js environment (API tests)
// This setup file is for API tests that run in Node.js environment

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

// Mock Next.js App Router navigation for API tests
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

// Mock local and session storage for Node environment
const createStorageMock = () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
});

// Only add to global if not already defined
if (typeof global.localStorage === 'undefined') {
  global.localStorage = createStorageMock();
}
if (typeof global.sessionStorage === 'undefined') {
  global.sessionStorage = createStorageMock();
}

// Clean up between tests
afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
  
  if (global.fetch && typeof global.fetch.mockClear === 'function') {
    global.fetch.mockClear();
  }
});

// Restore all mocks after test suite
afterAll(() => {
  jest.restoreAllMocks();
});
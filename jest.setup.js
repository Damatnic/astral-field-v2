// Jest setup for Astral Field
// - Extends jest-dom matchers
// - Provides stable test environment defaults

import '@testing-library/jest-dom';

// Ensure a predictable NODE_ENV
process.env.NODE_ENV = process.env.NODE_ENV || 'test';

// In Node 18+, fetch is available globally. Guard just in case.
if (typeof (global as any).fetch === 'undefined') {
  // Lazy import to avoid bundling for environments that already have fetch
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fetchImpl = require('node-fetch');
  (global as any).fetch = fetchImpl;
}

// Silence noisy console.error logs in tests unless explicitly asserted
const originalError = console.error;
console.error = (...args: any[]) => {
  const msg = args?.[0] || '';
  // Allow React act warnings and explicit test failures to show
  const allowList = [
    'Warning: ',
    'act(...)',
    'Jest did not exit one second after the test run has completed.'
  ];
  if (allowList.some((s) => String(msg).includes(s))) return originalError(...args);
};


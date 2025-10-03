/**
 * Zenith Main Jest Setup
 * Primary test configuration and global mocks
 */

import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'util'
import { configure } from '@testing-library/react'

// Configure Testing Library
configure({
  testIdAttribute: 'data-testid',
  asyncUtilTimeout: 5000,
  computedStyleSupportsPseudoElements: true,
})

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    reload: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(),
    beforePopState: jest.fn(),
    events: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
    },
    isFallback: false,
    isLocaleDomain: false,
    pathname: '/',
    route: '/',
    asPath: '/',
    query: {},
    basePath: '',
    locale: 'en',
    locales: ['en'],
    defaultLocale: 'en',
  })),
}))

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(() => Promise.resolve()),
    replace: jest.fn(() => Promise.resolve()),
    refresh: jest.fn(() => Promise.resolve()),
    back: jest.fn(),
    forward: jest.fn(),
    prefetch: jest.fn(() => Promise.resolve()), // Fixed: Returns resolved promise
  })),
  usePathname: jest.fn(() => '/'),
  useSearchParams: jest.fn(() => ({
    get: jest.fn(),
    has: jest.fn(),
    getAll: jest.fn(),
    keys: jest.fn(),
    values: jest.fn(),
    entries: jest.fn(),
    forEach: jest.fn(),
    toString: jest.fn(),
  })),
  useParams: jest.fn(() => ({})),
  redirect: jest.fn(),
  notFound: jest.fn(),
}))

// Mock NextAuth v5 - Updated for proper v5 structure
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(() => Promise.resolve({
    user: {
      id: 'test-user-id',
      name: 'Test User',
      email: 'test@example.com',
      role: 'user',
      teamName: 'Test Team'
    },
    expires: new Date(Date.now() + 86400000).toISOString() // 24 hours from now
  })),
  signIn: jest.fn(),
  signOut: jest.fn(),
  handlers: {
    GET: jest.fn(),
    POST: jest.fn(),
  },
}))

// Mock NextAuth v5 core for legacy imports
jest.mock('next-auth', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    handlers: {
      GET: jest.fn(),
      POST: jest.fn(),
    },
    auth: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
  })),
}))

// Mock NextAuth v5 server functions for API route tests
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: {
      user: {
        id: 'test-user-id',
        name: 'Test User',
        email: 'test@example.com',
        role: 'user',
        teamName: 'Test Team'
      }
    },
    status: 'authenticated',
    update: jest.fn(),
  })),
  getSession: jest.fn(() => Promise.resolve({
    user: {
      id: 'test-user-id',
      name: 'Test User',
      email: 'test@example.com',
      role: 'user',
      teamName: 'Test Team'
    }
  })),
  signIn: jest.fn(),
  signOut: jest.fn(),
  SessionProvider: ({ children }) => children,
}))

// Mock getServerSession for API route tests
const mockGetServerSession = jest.fn(() => Promise.resolve({
  user: {
    id: 'test-user-id',
    name: 'Test User',
    email: 'test@example.com',
    role: 'user',
    teamName: 'Test Team'
  }
}))

jest.mock('next-auth/next', () => ({
  getServerSession: mockGetServerSession,
}))

// Export the mock for use in tests
global.mockGetServerSession = mockGetServerSession

// Mock Prisma client
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    team: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    league: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    player: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    matchup: {
      findMany: jest.fn(),
    },
    playerNews: {
      findMany: jest.fn(),
    },
    chatMessage: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    rosterPlayer: {
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    tradeProposal: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  },
}))

// Mock Socket.IO
jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    connected: true,
  })),
}))

// Mock fetch
global.fetch = jest.fn()

// Setup TextEncoder/TextDecoder for tests
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Mock window methods
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
})

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock document.fonts API
Object.defineProperty(document, 'fonts', {
  writable: true,
  value: {
    ready: Promise.resolve(),
    load: jest.fn().mockResolvedValue(),
    check: jest.fn().mockReturnValue(true),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    clear: jest.fn(),
    delete: jest.fn(),
    forEach: jest.fn(),
    has: jest.fn(),
    values: jest.fn(),
    status: 'loaded'
  },
})

// Mock getComputedStyle for CSS-related tests
Object.defineProperty(window, 'getComputedStyle', {
  writable: true,
  value: jest.fn().mockImplementation(() => ({
    pointerEvents: 'auto',
    getPropertyValue: jest.fn((prop) => {
      // Return common CSS property values
      if (prop === 'pointer-events') return 'auto'
      if (prop === 'display') return 'block'
      if (prop === 'visibility') return 'visible'
      if (prop === 'opacity') return '1'
      return ''
    }),
    setProperty: jest.fn(),
    removeProperty: jest.fn(),
  })),
})

// Mock Element.prototype methods for CSS interactions
Element.prototype.getComputedStyle = Element.prototype.getComputedStyle || function() {
  return {
    pointerEvents: 'auto',
    getPropertyValue: jest.fn((prop) => {
      if (prop === 'pointer-events') return 'auto'
      if (prop === 'display') return 'block'
      if (prop === 'visibility') return 'visible'
      if (prop === 'opacity') return '1'
      return ''
    })
  }
}

// Enhanced CSS declarations mock
Object.defineProperty(Element.prototype, 'style', {
  writable: true,
  value: {
    pointerEvents: 'auto',
    display: 'block',
    visibility: 'visible',
    opacity: '1',
    getPropertyValue: jest.fn((prop) => {
      if (prop === 'pointer-events') return 'auto'
      if (prop === 'display') return 'block'
      if (prop === 'visibility') return 'visible'
      if (prop === 'opacity') return '1'
      return ''
    }),
    setProperty: jest.fn(),
    removeProperty: jest.fn(),
  },
})

// Mock HTMLElement getPropertyValue for DOM Accessibility API
HTMLElement.prototype.getPropertyValue = HTMLElement.prototype.getPropertyValue || function(prop) {
  if (prop === 'pointer-events') return 'auto'
  if (prop === 'display') return 'block'
  if (prop === 'visibility') return 'visible'
  if (prop === 'opacity') return '1'
  return ''
}

// Suppress console errors during tests unless explicitly testing them
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning:') || args[0].includes('Error:'))
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})
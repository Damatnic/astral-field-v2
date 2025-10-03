/**
 * Auth Utilities Tests
 * 
 * Tests for lib/auth.ts
 */

import { auth, signIn, signOut, handlers } from '@/lib/auth'

jest.mock('next-auth', () => {
  return jest.fn(() => ({
    handlers: { GET: jest.fn(), POST: jest.fn() },
    auth: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn()
  }))
})

describe('Auth Utilities', () => {
  describe('auth', () => {
    it('should be defined', () => {
      expect(auth).toBeDefined()
    })

    it('should be a function', () => {
      expect(typeof auth).toBe('function')
    })
  })

  describe('signIn', () => {
    it('should be defined', () => {
      expect(signIn).toBeDefined()
    })

    it('should be a function', () => {
      expect(typeof signIn).toBe('function')
    })
  })

  describe('signOut', () => {
    it('should be defined', () => {
      expect(signOut).toBeDefined()
    })

    it('should be a function', () => {
      expect(typeof signOut).toBe('function')
    })
  })

  describe('handlers', () => {
    it('should be defined', () => {
      expect(handlers).toBeDefined()
    })

    it('should have GET handler', () => {
      expect(handlers.GET).toBeDefined()
    })

    it('should have POST handler', () => {
      expect(handlers.POST).toBeDefined()
    })
  })
})

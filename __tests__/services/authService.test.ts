import { describe, it, expect, beforeEach, jest } from '@jest/globals'
const vi = jest
import { AuthService } from '@/services/api/authService'
import { mockDb, setupTestDatabase, createTestUser, mockSupabaseClient } from '../utils/test-utils'

// Mock the database module
vi.mock('@/lib/database', () => ({
  db: mockDb
}))

// Mock the supabase client
vi.mock('@/lib/supabase', () => ({
  createClient: () => mockSupabaseClient()
}))

describe('AuthService', () => {
  let authService: AuthService

  beforeEach(() => {
    setupTestDatabase()
    authService = new AuthService()
  })

  describe('login', () => {
    it('should successfully log in a user', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'password123'
      }

      const testUser = createTestUser()
      mockDb.seed('users', [testUser])

      // Mock the auth client response
      const mockSupabase = mockSupabaseClient()
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: { id: testUser.id } },
        error: null
      })

      const result = await authService.login(credentials)

      expect(result.error).toBeNull()
      expect(result.user).toEqual(testUser)
    })

    it('should handle authentication errors', async () => {
      const credentials = {
        email: 'invalid@example.com',
        password: 'wrongpassword'
      }

      const mockSupabase = mockSupabaseClient()
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid login credentials' }
      })

      const result = await authService.login(credentials)

      expect(result.error).toBe('Invalid login credentials')
      expect(result.user).toBeNull()
    })
  })

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const registerData = {
        email: 'newuser@example.com',
        password: 'password123',
        username: 'newuser'
      }

      const mockSupabase = mockSupabaseClient()
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: { id: 'new-user-id' } },
        error: null
      })

      const result = await authService.register(registerData)

      expect(result.error).toBeNull()
      expect(result.user).toMatchObject({
        email: registerData.email,
        username: registerData.username
      })
    })

    it('should handle registration errors', async () => {
      const registerData = {
        email: 'existing@example.com',
        password: 'password123',
        username: 'existing'
      }

      const mockSupabase = mockSupabaseClient()
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: null },
        error: { message: 'User already exists' }
      })

      const result = await authService.register(registerData)

      expect(result.error).toBe('User already exists')
      expect(result.user).toBeNull()
    })
  })

  describe('getCurrentUser', () => {
    it('should return current user when authenticated', async () => {
      const testUser = createTestUser()
      mockDb.seed('users', [testUser])

      const mockSupabase = mockSupabaseClient()
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: testUser.id } },
        error: null
      })

      const result = await authService.getCurrentUser()

      expect(result).toEqual(testUser)
    })

    it('should return null when not authenticated', async () => {
      const mockSupabase = mockSupabaseClient()
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' }
      })

      const result = await authService.getCurrentUser()

      expect(result).toBeNull()
    })
  })

  describe('updateProfile', () => {
    it('should successfully update user profile', async () => {
      const testUser = createTestUser()
      mockDb.seed('users', [testUser])

      const updates = {
        username: 'updateduser',
        avatar_url: 'https://example.com/avatar.jpg'
      }

      const result = await authService.updateProfile(testUser.id, updates)

      expect(result.error).toBeNull()
      expect(result.user?.username).toBe('updateduser')
      expect(result.user?.avatar_url).toBe('https://example.com/avatar.jpg')
    })
  })

  describe('logout', () => {
    it('should successfully log out', async () => {
      const mockSupabase = mockSupabaseClient()
      mockSupabase.auth.signOut.mockResolvedValue({ error: null })

      const result = await authService.logout()

      expect(result.error).toBeNull()
    })

    it('should handle logout errors', async () => {
      const mockSupabase = mockSupabaseClient()
      mockSupabase.auth.signOut.mockResolvedValue({
        error: { message: 'Failed to sign out' }
      })

      const result = await authService.logout()

      expect(result.error).toBe('Failed to sign out')
    })
  })
})
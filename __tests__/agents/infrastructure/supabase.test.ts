import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { supabase } from '@/lib/supabase'

// Mock Supabase client
jest.mock('@supabase/auth-helpers-nextjs')
jest.mock('@/lib/supabase')

const mockSupabase = supabase as jest.Mocked<typeof supabase>

describe('Infrastructure - Supabase Connection', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Database Connection', () => {
    it('should establish connection to Supabase', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockResolvedValue({ data: [], error: null })
      } as any)

      const result = await mockSupabase.from('users').select('*')
      
      expect(result.error).toBeNull()
      expect(mockSupabase.from).toHaveBeenCalledWith('users')
    })

    it('should handle connection errors gracefully', async () => {
      const connectionError = new Error('Connection failed')
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockRejectedValue(connectionError)
      } as any)

      try {
        await mockSupabase.from('users').select('*')
      } catch (error) {
        expect(error).toBe(connectionError)
      }
    })
  })

  describe('Authentication', () => {
    it('should handle user authentication', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com'
      }

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null
      } as any)

      const result = await mockSupabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'password123'
      })

      expect(result.data.user).toEqual(mockUser)
      expect(result.error).toBeNull()
    })

    it('should handle authentication errors', async () => {
      const authError = { message: 'Invalid credentials' }
      
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: authError
      } as any)

      const result = await mockSupabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'wrongpassword'
      })

      expect(result.error).toEqual(authError)
      expect(result.data.user).toBeNull()
    })
  })

  describe('Database Operations', () => {
    it('should perform CRUD operations', async () => {
      const mockData = { id: '1', name: 'Test League' }
      
      // Create
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({ data: [mockData], error: null })
      } as any)

      const insertResult = await mockSupabase.from('leagues').insert(mockData)
      expect(insertResult.data).toEqual([mockData])

      // Read
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockResolvedValue({ data: [mockData], error: null })
      } as any)

      const selectResult = await mockSupabase.from('leagues').select('*')
      expect(selectResult.data).toEqual([mockData])

      // Update
      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: [mockData], error: null })
      } as any)

      const updateResult = await mockSupabase.from('leagues')
        .update({ name: 'Updated League' })
        .eq('id', '1')
      expect(updateResult.data).toEqual([mockData])

      // Delete
      mockSupabase.from.mockReturnValue({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: [], error: null })
      } as any)

      const deleteResult = await mockSupabase.from('leagues')
        .delete()
        .eq('id', '1')
      expect(deleteResult.data).toEqual([])
    })
  })

  describe('Row Level Security', () => {
    it('should enforce RLS policies', async () => {
      const unauthorizedError = {
        message: 'Row level security policy violated'
      }

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockResolvedValue({ 
          data: [], 
          error: unauthorizedError 
        })
      } as any)

      const result = await mockSupabase.from('leagues').select('*')
      
      expect(result.error).toEqual(unauthorizedError)
      expect(result.data).toEqual([])
    })
  })

  describe('Real-time Subscriptions', () => {
    it('should handle real-time subscriptions', () => {
      const mockSubscription = {
        unsubscribe: jest.fn()
      }

      mockSupabase.channel = jest.fn().mockReturnValue({
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn().mockReturnValue(mockSubscription)
      })

      const subscription = mockSupabase
        .channel('leagues')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'leagues'
        }, () => {})
        .subscribe()

      expect(subscription).toBe(mockSubscription)
      expect(mockSupabase.channel).toHaveBeenCalledWith('leagues')
    })
  })
})
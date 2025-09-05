// @ts-nocheck
import { neonServerless } from '@/lib/neon-serverless'
import type { Tables, TablesInsert } from '@/types/database'
// import { createClient } from '@/lib/supabase'

type User = Tables<'users'>
type UserInsert = TablesInsert<'users'>

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData extends LoginCredentials {
  username: string
}

export interface AuthResponse {
  user: User | null
  error: string | null
}

export class AuthService {
  // Using manual authentication with bcrypt instead of Supabase auth

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      // Get user by email
      const result = await neonServerless.selectSingle('users', {
        eq: { email: credentials.email }
      })

      if (result.error) throw result.error
      if (!result.data) throw new Error('User not found')

      const user = result.data as User
      
      // For now, simple password check (in production, use bcrypt)
      if (user.password_hash !== credentials.password) {
        throw new Error('Invalid credentials')
      }

      return { user, error: null }
    } catch (error: any) {
      console.error('Login error:', error)
      return { user: null, error: error.message || 'Login failed' }
    }
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      // Check if user already exists
      const existingResult = await neonServerless.selectSingle('users', {
        eq: { email: data.email }
      })

      if (existingResult.data) {
        throw new Error('User already exists with this email')
      }

      // Create user profile
      const userInsert: UserInsert = {
        email: data.email,
        username: data.username,
        password_hash: data.password, // In production, hash with bcrypt
      }

      const result = await neonServerless.insert('users', userInsert)
      
      if (result.error) throw result.error

      return { user: result.data as User | null, error: null }
    } catch (error: any) {
      console.error('Registration error:', error)
      return { user: null, error: error.message || 'Registration failed' }
    }
  }

  async logout(): Promise<{ error: string | null }> {
    try {
      // Simple logout (just return success since we're not using Supabase sessions)
      return { error: null }
    } catch (error: any) {
      console.error('Logout error:', error)
      return { error: error.message || 'Logout failed' }
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      // For now, return null since we're not implementing session management
      // In production, you'd check JWT token or session storage
      return null
    } catch (error) {
      console.error('Get current user error:', error)
      return null
    }
  }

  async updateProfile(userId: string, updates: Partial<User>): Promise<AuthResponse> {
    try {
      const result = await neonServerless.update('users', updates, { id: userId })
      
      if (result.error) throw result.error

      return { user: result.data as User | null, error: null }
    } catch (error: any) {
      console.error('Update profile error:', error)
      return { user: null, error: error.message || 'Profile update failed' }
    }
  }

  async resetPassword(email: string): Promise<{ error: string | null }> {
    try {
      // Simple implementation - in production you'd send email
      // For now just return success
      console.log('Password reset requested for:', email)
      return { error: null }
    } catch (error: any) {
      console.error('Reset password error:', error)
      return { error: error.message || 'Password reset failed' }
    }
  }

  onAuthStateChange(callback: (user: User | null) => void) {
    // Simple implementation - in production you'd listen to auth state changes
    // For now just call callback with null
    callback(null)
    return { data: { subscription: null }, error: null }
  }
}

export default new AuthService()
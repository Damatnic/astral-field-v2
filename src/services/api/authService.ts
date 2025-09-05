import { neonServerless } from '@/lib/neon-serverless'
import type { Tables, TablesInsert } from '@/types/database'
import { createClient } from '@/lib/supabase'

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
  private supabase = createClient()

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const { data: authData, error: authError } = await this.supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('Authentication failed')

      // Get user profile
      const result = await db.selectSingle('users', {
        eq: { id: authData.user.id }
      })

      if (result.error) throw result.error

      return { user: result.data, error: null }
    } catch (error: any) {
      console.error('Login error:', error)
      return { user: null, error: error.message || 'Login failed' }
    }
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      const { data: authData, error: authError } = await this.supabase.auth.signUp({
        email: data.email,
        password: data.password,
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('Failed to create user')

      // Create user profile
      const userInsert: UserInsert = {
        id: authData.user.id,
        email: data.email,
        username: data.username,
      }

      const result = await db.insert('users', userInsert)
      
      if (result.error) throw result.error

      return { user: result.data, error: null }
    } catch (error: any) {
      console.error('Registration error:', error)
      return { user: null, error: error.message || 'Registration failed' }
    }
  }

  async logout(): Promise<{ error: string | null }> {
    try {
      const { error } = await this.supabase.auth.signOut()
      if (error) throw error
      
      return { error: null }
    } catch (error: any) {
      console.error('Logout error:', error)
      return { error: error.message || 'Logout failed' }
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user: authUser }, error } = await this.supabase.auth.getUser()
      
      if (error || !authUser) return null

      const result = await db.selectSingle('users', {
        eq: { id: authUser.id }
      })

      return result.data
    } catch (error) {
      console.error('Get current user error:', error)
      return null
    }
  }

  async updateProfile(userId: string, updates: Partial<User>): Promise<AuthResponse> {
    try {
      const result = await db.update('users', updates, { id: userId })
      
      if (result.error) throw result.error

      return { user: result.data, error: null }
    } catch (error: any) {
      console.error('Update profile error:', error)
      return { user: null, error: error.message || 'Profile update failed' }
    }
  }

  async resetPassword(email: string): Promise<{ error: string | null }> {
    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(email)
      if (error) throw error
      
      return { error: null }
    } catch (error: any) {
      console.error('Reset password error:', error)
      return { error: error.message || 'Password reset failed' }
    }
  }

  onAuthStateChange(callback: (user: User | null) => void) {
    return this.supabase.auth.onAuthStateChange(async (event: any, session: any) => {
      if (session?.user) {
        const user = await this.getCurrentUser()
        callback(user)
      } else {
        callback(null)
      }
    })
  }
}

export default new AuthService()
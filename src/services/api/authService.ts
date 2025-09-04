import { createClient } from '@/lib/supabase'
import type { Database } from '@/types/database'

type User = Database['public']['Tables']['users']['Row']

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

class AuthService {
  private supabase = createClient()

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      })

      if (error) throw error

      // Fetch user profile
      const { data: userData, error: userError } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single()

      if (userError) throw userError

      return { user: userData, error: null }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred'
      return { user: null, error: message }
    }
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      // Create auth user
      const { data: authData, error: authError } = await this.supabase.auth.signUp({
        email: data.email,
        password: data.password,
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('Failed to create user')

      // Create user profile
      const userInsert: Database['public']['Tables']['users']['Insert'] = {
        id: authData.user.id,
        email: data.email,
        username: data.username,
      }
      
      const { data: userData, error: profileError } = await this.supabase
        .from('users')
        .insert(userInsert)
        .select()
        .single()

      if (profileError) throw profileError

      return { user: userData, error: null }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred'
      return { user: null, error: message }
    }
  }

  async logout(): Promise<void> {
    await this.supabase.auth.signOut()
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      
      if (!user) return null

      const { data: userData, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) throw error

      return userData
    } catch (error) {
      console.error('Error fetching current user:', error)
      return null
    }
  }

  async updateProfile(userId: string, updates: Partial<User>): Promise<AuthResponse> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single()

      if (error) throw error

      return { user: data, error: null }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred'
      return { user: null, error: message }
    }
  }

  async sendPasswordReset(email: string): Promise<{ error: string | null }> {
    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      if (error) throw error

      return { error: null }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred'
      return { error: message }
    }
  }

  async updatePassword(newPassword: string): Promise<{ error: string | null }> {
    try {
      const { error } = await this.supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) throw error

      return { error: null }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred'
      return { error: message }
    }
  }

  onAuthStateChange(callback: (user: User | null) => void) {
    return this.supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const { data } = await this.supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()
        
        callback(data)
      } else {
        callback(null)
      }
    })
  }
}

const authService = new AuthService()
export default authService
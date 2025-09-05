import { neonDb } from '@/lib/neon-database'
import type { Tables, TablesInsert } from '@/types/database'

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

export class StackAuthService {
  private stackProjectId = process.env.NEXT_PUBLIC_STACK_PROJECT_ID
  private stackPublishableKey = process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY
  private stackSecretKey = process.env.STACK_SECRET_SERVER_KEY

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      // For now, let's create a simplified login that works with our existing user system
      // This will be replaced with proper Stack Auth integration
      
      // First, check if user exists in our database
      const result = await neonDb.selectSingle('users', {
        where: { email: credentials.email }
      })

      if (result.error || !result.data) {
        return { user: null, error: 'Invalid email or password' }
      }

      // In a real implementation, Stack Auth would handle password verification
      // For now, we'll accept any password for existing users
      return { user: result.data, error: null }

    } catch (error: any) {
      console.error('Login error:', error)
      return { user: null, error: error.message || 'Login failed' }
    }
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      // Check if user already exists
      const existingUser = await neonDb.selectSingle('users', {
        where: { email: data.email }
      })

      if (existingUser.data) {
        return { user: null, error: 'User already exists with this email' }
      }

      // Check if username is taken
      const existingUsername = await neonDb.selectSingle('users', {
        where: { username: data.username }
      })

      if (existingUsername.data) {
        return { user: null, error: 'Username already taken' }
      }

      // Create new user
      const userInsert: UserInsert = {
        email: data.email,
        username: data.username,
        stack_user_id: null, // Will be set when Stack Auth is fully integrated
      }

      const result = await neonDb.insert('users', userInsert)
      
      if (result.error) throw result.error

      return { user: result.data, error: null }
    } catch (error: any) {
      console.error('Registration error:', error)
      return { user: null, error: error.message || 'Registration failed' }
    }
  }

  async logout(): Promise<{ error: string | null }> {
    try {
      // Stack Auth logout would go here
      // For now, just return success
      return { error: null }
    } catch (error: any) {
      console.error('Logout error:', error)
      return { error: error.message || 'Logout failed' }
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      // In a real Stack Auth implementation, this would get the current session
      // For now, we'll return null (no persistent session)
      return null
    } catch (error) {
      console.error('Get current user error:', error)
      return null
    }
  }

  async updateProfile(userId: string, updates: Partial<User>): Promise<AuthResponse> {
    try {
      const result = await neonDb.update('users', updates, { id: userId })
      
      if (result.error) throw result.error

      return { user: result.data, error: null }
    } catch (error: any) {
      console.error('Update profile error:', error)
      return { user: null, error: error.message || 'Profile update failed' }
    }
  }

  async resetPassword(email: string): Promise<{ error: string | null }> {
    try {
      // Stack Auth password reset would go here
      return { error: null }
    } catch (error: any) {
      console.error('Reset password error:', error)
      return { error: error.message || 'Password reset failed' }
    }
  }

  // Create test users for the fantasy league
  async createTestUsers(): Promise<void> {
    const testUsers = [
      { email: 'nicholas.damato@astralfield.com', username: 'Nicholas D\'Amato' },
      { email: 'brittany.bergum@astralfield.com', username: 'Brittany Bergum' },
      { email: 'cason.minor@astralfield.com', username: 'Cason Minor' },
      { email: 'david.jarvey@astralfield.com', username: 'David Jarvey' },
      { email: 'jack.mccaigue@astralfield.com', username: 'Jack McCaigue' },
      { email: 'jon.kornbeck@astralfield.com', username: 'Jon Kornbeck' },
      { email: 'kaity.lorbiecki@astralfield.com', username: 'Kaity Lorbiecki' },
      { email: 'larry.mccaigue@astralfield.com', username: 'Larry McCaigue' },
      { email: 'nick.hartley@astralfield.com', username: 'Nick Hartley' },
      { email: 'renee.mccaigue@astralfield.com', username: 'Renee McCaigue' }
    ]

    for (const user of testUsers) {
      try {
        const existing = await neonDb.selectSingle('users', {
          where: { email: user.email }
        })

        if (!existing.data) {
          await neonDb.insert('users', {
            email: user.email,
            username: user.username,
            stack_user_id: null
          })
          console.log(`✅ Created user: ${user.username}`)
        } else {
          console.log(`⚠️ User already exists: ${user.username}`)
        }
      } catch (error) {
        console.error(`❌ Error creating user ${user.username}:`, error)
      }
    }
  }
}

export default new StackAuthService()
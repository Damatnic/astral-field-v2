import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import authService from '@/services/api/authService'
import type { Database } from '@/types/database'

type User = Database['public']['Tables']['users']['Row']

interface AuthState {
  user: User | null
  isLoading: boolean
  error: string | null
  
  // Actions
  login: (email: string, password: string) => Promise<boolean>
  register: (email: string, password: string, username: string) => Promise<boolean>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
  updateProfile: (updates: Partial<User>) => Promise<boolean>
  clearError: () => void
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        user: null,
        isLoading: false,
        error: null,

        login: async (email, password) => {
          set({ isLoading: true, error: null })
          
          const { user, error } = await authService.login({ email, password })
          
          if (error) {
            set({ error, isLoading: false })
            return false
          }
          
          set({ user, isLoading: false })
          return true
        },

        register: async (email, password, username) => {
          set({ isLoading: true, error: null })
          
          const { user, error } = await authService.register({ 
            email, 
            password, 
            username 
          })
          
          if (error) {
            set({ error, isLoading: false })
            return false
          }
          
          set({ user, isLoading: false })
          return true
        },

        logout: async () => {
          set({ isLoading: true })
          await authService.logout()
          set({ user: null, isLoading: false, error: null })
        },

        checkAuth: async () => {
          set({ isLoading: true })
          const user = await authService.getCurrentUser()
          set({ user, isLoading: false })
        },

        updateProfile: async (updates) => {
          const { user } = get()
          if (!user) return false
          
          set({ isLoading: true, error: null })
          
          const { user: updatedUser, error } = await authService.updateProfile(
            user.id, 
            updates
          )
          
          if (error) {
            set({ error, isLoading: false })
            return false
          }
          
          set({ user: updatedUser, isLoading: false })
          return true
        },

        clearError: () => set({ error: null }),
      }),
      {
        name: 'auth-storage',
        partialize: (state) => ({ user: state.user }),
      }
    )
  )
)
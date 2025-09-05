import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

export function createClient() {
  // Return mock client in test environment or when Supabase vars don't exist (Neon mode)
  if (process.env.NODE_ENV === 'test' || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    // Mock client for compatibility
    return {
      auth: {
        signInWithPassword: async () => ({ data: { user: null }, error: { message: 'Using Neon/Stack Auth instead' } }),
        signUp: async () => ({ data: { user: null }, error: { message: 'Using Neon/Stack Auth instead' } }),
        signOut: async () => ({ error: { message: 'Using Neon/Stack Auth instead' } }),
        getUser: async () => ({ data: { user: null }, error: { message: 'Using Neon/Stack Auth instead' } }),
        onAuthStateChange: () => ({ data: { subscription: null } }),
        resetPasswordForEmail: async () => ({ error: { message: 'Using Neon/Stack Auth instead' } })
      },
      from: () => ({
        select: () => ({ error: { message: 'Using Neon database instead' } }),
        insert: () => ({ error: { message: 'Using Neon database instead' } }),
        update: () => ({ error: { message: 'Using Neon database instead' } }),
        delete: () => ({ error: { message: 'Using Neon database instead' } })
      })
    } as any
  }
  
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Export for test compatibility (will be mocked in tests)
export const supabase = createClient()
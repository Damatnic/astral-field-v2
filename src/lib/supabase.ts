import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

export function createClient() {
  // Return mock client in test environment
  if (process.env.NODE_ENV === 'test') {
    // This will be mocked in tests
    return {} as any
  }
  
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Export for test compatibility (will be mocked in tests)
export const supabase = createClient()
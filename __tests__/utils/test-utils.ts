import { jest } from '@jest/globals'
const vi = jest
import type { Database, Tables, TablesInsert, TablesUpdate } from '@/types/database'

// Mock database client for testing
export class MockDatabaseClient {
  private mockData: Map<string, any[]> = new Map()
  private nextId = 1

  // Initialize with test data
  seed(table: keyof Database['public']['Tables'], data: any[]) {
    this.mockData.set(table, data.map(item => ({
      ...item,
      id: item.id || `test-${this.nextId++}`,
      created_at: item.created_at || new Date().toISOString(),
      updated_at: item.updated_at || new Date().toISOString()
    })))
  }

  // Mock select operations
  async select<T extends keyof Database['public']['Tables']>(
    table: T,
    options?: {
      select?: string
      eq?: Record<string, any>
      order?: { column: string; ascending?: boolean }
      limit?: number
    }
  ): Promise<{ data: Tables<T>[] | null; error: any }> {
    const tableData = this.mockData.get(table) || []
    let results = [...tableData]

    // Apply filters
    if (options?.eq) {
      Object.entries(options.eq).forEach(([key, value]) => {
        results = results.filter(item => item[key] === value)
      })
    }

    // Apply ordering
    if (options?.order) {
      results.sort((a, b) => {
        const aVal = a[options.order!.column]
        const bVal = b[options.order!.column]
        if (options.order!.ascending !== false) {
          return aVal > bVal ? 1 : -1
        }
        return aVal < bVal ? 1 : -1
      })
    }

    // Apply limit
    if (options?.limit) {
      results = results.slice(0, options.limit)
    }

    return { data: results as Tables<T>[], error: null }
  }

  async selectSingle<T extends keyof Database['public']['Tables']>(
    table: T,
    options?: {
      select?: string
      eq?: Record<string, any>
    }
  ): Promise<{ data: Tables<T> | null; error: any }> {
    const result = await this.select(table, { ...options, limit: 1 })
    return {
      data: result.data?.[0] || null,
      error: result.error
    }
  }

  async insert<T extends keyof Database['public']['Tables']>(
    table: T,
    data: TablesInsert<T>
  ): Promise<{ data: Tables<T> | null; error: any }> {
    const tableData = this.mockData.get(table) || []
    const newItem = {
      ...data,
      id: `test-${this.nextId++}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    tableData.push(newItem)
    this.mockData.set(table, tableData)
    
    return { data: newItem as Tables<T>, error: null }
  }

  async update<T extends keyof Database['public']['Tables']>(
    table: T,
    data: TablesUpdate<T>,
    eq: Record<string, any>
  ): Promise<{ data: Tables<T> | null; error: any }> {
    const tableData = this.mockData.get(table) || []
    const index = tableData.findIndex(item => {
      return Object.entries(eq).every(([key, value]) => item[key] === value)
    })

    if (index === -1) {
      return { data: null, error: { message: 'Item not found' } }
    }

    const updatedItem = {
      ...tableData[index],
      ...data,
      updated_at: new Date().toISOString()
    }
    
    tableData[index] = updatedItem
    this.mockData.set(table, tableData)
    
    return { data: updatedItem as Tables<T>, error: null }
  }

  async delete<T extends keyof Database['public']['Tables']>(
    table: T,
    eq: Record<string, any>
  ): Promise<{ error: any }> {
    const tableData = this.mockData.get(table) || []
    const filteredData = tableData.filter(item => {
      return !Object.entries(eq).every(([key, value]) => item[key] === value)
    })
    
    this.mockData.set(table, filteredData)
    return { error: null }
  }

  async selectWithJoins<T extends keyof Database['public']['Tables']>(
    table: T,
    selectQuery: string,
    options?: any
  ): Promise<{ data: any[] | null; error: any }> {
    // Simplified mock for joins - just return base table data
    const result = await this.select(table, options)
    return result
  }

  clear() {
    this.mockData.clear()
    this.nextId = 1
  }

  get raw() {
    return {
      auth: {
        signInWithPassword: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
        getUser: vi.fn(),
        onAuthStateChange: vi.fn(),
        resetPasswordForEmail: vi.fn()
      },
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn()
    }
  }
}

// Test data factories
export const createTestUser = (overrides?: Partial<Tables<'users'>>): Tables<'users'> => ({
  id: 'test-user-1',
  stack_user_id: null,
  email: 'test@example.com',
  username: 'testuser',
  password_hash: null,
  avatar_url: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides
})

export const createTestPlayer = (overrides?: Partial<Tables<'players'>>): Tables<'players'> => ({
  id: 'test-player-1',
  name: 'Test Player',
  position: 'RB',
  nfl_team: 'KC',
  stats: null,
  projections: null,
  injury_status: null,
  bye_week: 7,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides
})

export const createTestLeague = (overrides?: Partial<Tables<'leagues'>>): Tables<'leagues'> => ({
  id: 'test-league-1',
  name: 'Test League',
  commissioner_id: 'test-user-1',
  settings: { maxTeams: 10, rounds: 16 },
  scoring_system: { passingTd: 6, rushingTd: 6 },
  draft_date: new Date().toISOString(),
  season_year: 2024,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides
})

export const createTestTeam = (overrides?: Partial<Tables<'teams'>>): Tables<'teams'> => ({
  id: 'test-team-1',
  league_id: 'test-league-1',
  user_id: 'test-user-1',
  team_name: 'Test Team',
  draft_position: 1,
  waiver_priority: 1,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides
})

// Mock the database instance for tests
export const mockDb = new MockDatabaseClient()

// Helper to setup common test scenarios
export const setupTestDatabase = () => {
  mockDb.clear()
  
  // Seed with common test data
  mockDb.seed('users', [createTestUser()])
  mockDb.seed('players', [
    createTestPlayer(),
    createTestPlayer({ id: 'test-player-2', name: 'Test QB', position: 'QB' })
  ])
  mockDb.seed('leagues', [createTestLeague()])
  mockDb.seed('teams', [createTestTeam()])
}

// Jest/Vitest setup helper
export const mockSupabaseClient = () => {
  return {
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-1' } },
        error: null
      }),
      signUp: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-1' } },
        error: null
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-1' } },
        error: null
      }),
      onAuthStateChange: vi.fn(),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null })
    },
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: createTestUser(),
      error: null
    })
  }
}
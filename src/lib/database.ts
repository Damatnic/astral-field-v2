import { createBrowserClient } from '@supabase/ssr'
import type { Database, Tables, TablesInsert, TablesUpdate } from '@/types/database'

export class DatabaseClient {
  private client = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Type-safe query methods
  async select<T extends keyof Database['public']['Tables']>(
    table: T,
    options?: {
      select?: string
      eq?: Record<string, any>
      order?: { column: string; ascending?: boolean }
      limit?: number
    }
  ): Promise<{ data: Tables<T>[] | null; error: any }> {
    let query = this.client.from(table).select(options?.select || '*')

    if (options?.eq) {
      Object.entries(options.eq).forEach(([key, value]) => {
        query = query.eq(key, value)
      })
    }

    if (options?.order) {
      query = query.order(options.order.column, { ascending: options.order.ascending ?? true })
    }

    if (options?.limit) {
      query = query.limit(options.limit)
    }

    return query as any
  }

  async selectSingle<T extends keyof Database['public']['Tables']>(
    table: T,
    options?: {
      select?: string
      eq?: Record<string, any>
    }
  ): Promise<{ data: Tables<T> | null; error: any }> {
    let query = this.client.from(table).select(options?.select || '*')

    if (options?.eq) {
      Object.entries(options.eq).forEach(([key, value]) => {
        query = query.eq(key, value)
      })
    }

    return (query as any).single()
  }

  async insert<T extends keyof Database['public']['Tables']>(
    table: T,
    data: any
  ): Promise<{ data: Tables<T> | null; error: any }> {
    return this.client.from(table).insert(data).select().single() as any
  }

  async update<T extends keyof Database['public']['Tables']>(
    table: T,
    data: any,
    eq: Record<string, any>
  ): Promise<{ data: Tables<T> | null; error: any }> {
    let query = this.client.from(table).update(data)

    Object.entries(eq).forEach(([key, value]) => {
      query = query.eq(key, value)
    })

    return (query as any).select().single()
  }

  async delete<T extends keyof Database['public']['Tables']>(
    table: T,
    eq: Record<string, any>
  ): Promise<{ error: any }> {
    let query = this.client.from(table).delete()

    Object.entries(eq).forEach(([key, value]) => {
      query = query.eq(key, value)
    })

    return query as any
  }

  // Complex queries with joins
  async selectWithJoins<T extends keyof Database['public']['Tables']>(
    table: T,
    selectQuery: string,
    options?: {
      eq?: Record<string, any>
      order?: { column: string; ascending?: boolean }
      limit?: number
    }
  ): Promise<{ data: any[] | null; error: any }> {
    let query = this.client.from(table).select(selectQuery)

    if (options?.eq) {
      Object.entries(options.eq).forEach(([key, value]) => {
        query = query.eq(key, value)
      })
    }

    if (options?.order) {
      query = query.order(options.order.column, { ascending: options.order.ascending ?? true })
    }

    if (options?.limit) {
      query = query.limit(options.limit)
    }

    return query as any
  }

  // Raw client access for complex operations
  get raw() {
    return this.client
  }
}

export const db = new DatabaseClient()

// Type-safe result handlers
export class DatabaseResult<T> {
  constructor(
    public data: T | null,
    public error: any
  ) {}

  isSuccess(): this is { data: T; error: null } {
    return this.error === null && this.data !== null
  }

  isError(): this is { data: null; error: any } {
    return this.error !== null
  }

  unwrap(): T {
    if (this.isError()) {
      throw new Error(this.error.message || 'Database operation failed')
    }
    return this.data!
  }

  unwrapOr(defaultValue: T): T {
    return this.isSuccess() ? this.data : defaultValue
  }
}

// Helper function to wrap database results
export function wrapResult<T>(result: { data: T | null; error: any }): DatabaseResult<T> {
  return new DatabaseResult(result.data, result.error)
}
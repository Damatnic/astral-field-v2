import { neonDb } from './neon-database'
import type { Database, Tables, TablesInsert, TablesUpdate } from '@/types/database'

export class DatabaseClient {
  private client = neonDb

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
    return this.client.select(table, {
      select: options?.select,
      where: options?.eq,
      orderBy: options?.order,
      limit: options?.limit
    })
  }

  async selectSingle<T extends keyof Database['public']['Tables']>(
    table: T,
    options?: {
      select?: string
      eq?: Record<string, any>
    }
  ): Promise<{ data: Tables<T> | null; error: any }> {
    return this.client.selectSingle(table, {
      select: options?.select,
      where: options?.eq
    })
  }

  async insert<T extends keyof Database['public']['Tables']>(
    table: T,
    data: any
  ): Promise<{ data: Tables<T> | null; error: any }> {
    return this.client.insert(table, data)
  }

  async update<T extends keyof Database['public']['Tables']>(
    table: T,
    data: any,
    eq: Record<string, any>
  ): Promise<{ data: Tables<T> | null; error: any }> {
    return this.client.update(table, data, eq)
  }

  async delete<T extends keyof Database['public']['Tables']>(
    table: T,
    eq: Record<string, any>
  ): Promise<{ error: any }> {
    return this.client.delete(table, eq)
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
    return this.client.selectWithJoins(table, selectQuery, {
      where: options?.eq,
      orderBy: options?.order,
      limit: options?.limit
    })
  }

  // Raw query access for complex operations
  async query(sql: string, params?: any[]): Promise<{ data: any[] | null; error: any }> {
    return this.client.query(sql, params)
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
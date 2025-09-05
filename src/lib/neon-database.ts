import type { Database, Tables, TablesInsert, TablesUpdate } from '@/types/database'

class NeonDatabaseClient {
  private pool: any

  constructor() {
    // Only initialize PostgreSQL connection on server side
    if (typeof window === 'undefined') {
      const { Pool } = require('pg')
      
      // Check for database URL in multiple environment variable names
      const connectionString = process.env.DATABASE_URL || 
                              process.env.NETLIFY_DATABASE_URL || 
                              process.env.NEON_DATABASE_URL
      
      if (!connectionString) {
        console.error('No database connection string found. Checked: DATABASE_URL, NETLIFY_DATABASE_URL, NEON_DATABASE_URL')
        throw new Error('Database connection string not found')
      }
      
      // Optimize for serverless environments like Vercel
      this.pool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false },
        max: 1, // Limit connections for serverless
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      })
    }
  }

  // Type-safe query methods
  async select<T extends keyof Database['public']['Tables']>(
    table: T,
    options?: {
      select?: string
      where?: Record<string, any>
      orderBy?: { column: string; ascending?: boolean }
      limit?: number
    }
  ): Promise<{ data: Tables<T>[] | null; error: any }> {
    // Browser fallback - database operations should be done via API routes
    if (typeof window !== 'undefined') {
      return { data: null, error: { message: 'Database operations must be performed server-side' } }
    }

    try {
      let query = `SELECT ${options?.select || '*'} FROM ${table}`
      const values: any[] = []
      let valueIndex = 1

      if (options?.where) {
        const whereClause = Object.entries(options.where)
          .map(([key, value]) => {
            values.push(value)
            return `${key} = $${valueIndex++}`
          })
          .join(' AND ')
        query += ` WHERE ${whereClause}`
      }

      if (options?.orderBy) {
        query += ` ORDER BY ${options.orderBy.column} ${options.orderBy.ascending !== false ? 'ASC' : 'DESC'}`
      }

      if (options?.limit) {
        query += ` LIMIT ${options.limit}`
      }

      const result = await this.pool.query(query, values)
      return { data: result.rows as Tables<T>[], error: null }
    } catch (error: any) {
      return { data: null, error }
    }
  }

  async selectSingle<T extends keyof Database['public']['Tables']>(
    table: T,
    options?: {
      select?: string
      where?: Record<string, any>
    }
  ): Promise<{ data: Tables<T> | null; error: any }> {
    // Browser fallback
    if (typeof window !== 'undefined') {
      return { data: null, error: { message: 'Database operations must be performed server-side' } }
    }

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
    // Browser fallback
    if (typeof window !== 'undefined') {
      return { data: null, error: { message: 'Database operations must be performed server-side' } }
    }

    try {
      const keys = Object.keys(data)
      const values = Object.values(data)
      const placeholders = values.map((_, index) => `$${index + 1}`).join(', ')
      
      const query = `
        INSERT INTO ${table} (${keys.join(', ')}) 
        VALUES (${placeholders}) 
        RETURNING *
      `
      
      const result = await this.pool.query(query, values)
      return { data: result.rows[0] as Tables<T>, error: null }
    } catch (error: any) {
      return { data: null, error }
    }
  }

  async update<T extends keyof Database['public']['Tables']>(
    table: T,
    data: TablesUpdate<T>,
    where: Record<string, any>
  ): Promise<{ data: Tables<T> | null; error: any }> {
    // Browser fallback
    if (typeof window !== 'undefined') {
      return { data: null, error: { message: 'Database operations must be performed server-side' } }
    }

    try {
      const updateKeys = Object.keys(data)
      const updateValues = Object.values(data)
      const whereKeys = Object.keys(where)
      const whereValues = Object.values(where)
      
      let valueIndex = 1
      const setClause = updateKeys
        .map(key => `${key} = $${valueIndex++}`)
        .join(', ')
      
      const whereClause = whereKeys
        .map(key => `${key} = $${valueIndex++}`)
        .join(' AND ')
      
      const query = `
        UPDATE ${table} 
        SET ${setClause}, updated_at = NOW()
        WHERE ${whereClause}
        RETURNING *
      `
      
      const result = await this.pool.query(query, [...updateValues, ...whereValues])
      return { data: result.rows[0] as Tables<T>, error: null }
    } catch (error: any) {
      return { data: null, error }
    }
  }

  async delete<T extends keyof Database['public']['Tables']>(
    table: T,
    where: Record<string, any>
  ): Promise<{ error: any }> {
    // Browser fallback
    if (typeof window !== 'undefined') {
      return { error: { message: 'Database operations must be performed server-side' } }
    }

    try {
      const keys = Object.keys(where)
      const values = Object.values(where)
      const whereClause = keys
        .map((key, index) => `${key} = $${index + 1}`)
        .join(' AND ')
      
      const query = `DELETE FROM ${table} WHERE ${whereClause}`
      await this.pool.query(query, values)
      return { error: null }
    } catch (error: any) {
      return { error }
    }
  }

  // Complex queries with joins
  async selectWithJoins<T extends keyof Database['public']['Tables']>(
    table: T,
    selectQuery: string,
    options?: {
      where?: Record<string, any>
      orderBy?: { column: string; ascending?: boolean }
      limit?: number
    }
  ): Promise<{ data: any[] | null; error: any }> {
    // Browser fallback
    if (typeof window !== 'undefined') {
      return { data: null, error: { message: 'Database operations must be performed server-side' } }
    }

    try {
      let query = `SELECT ${selectQuery} FROM ${table}`
      const values: any[] = []
      let valueIndex = 1

      if (options?.where) {
        const whereClause = Object.entries(options.where)
          .map(([key, value]) => {
            values.push(value)
            return `${key} = $${valueIndex++}`
          })
          .join(' AND ')
        query += ` WHERE ${whereClause}`
      }

      if (options?.orderBy) {
        query += ` ORDER BY ${options.orderBy.column} ${options.orderBy.ascending !== false ? 'ASC' : 'DESC'}`
      }

      if (options?.limit) {
        query += ` LIMIT ${options.limit}`
      }

      const result = await this.pool.query(query, values)
      return { data: result.rows, error: null }
    } catch (error: any) {
      return { data: null, error }
    }
  }

  // Raw query for complex operations
  async query(sql: string, params?: any[]): Promise<{ data: any[] | null; error: any }> {
    // Browser fallback
    if (typeof window !== 'undefined') {
      return { data: null, error: { message: 'Database operations must be performed server-side' } }
    }

    try {
      const result = await this.pool.query(sql, params)
      return { data: result.rows, error: null }
    } catch (error: any) {
      return { data: null, error }
    }
  }

  // Close the pool when done
  async end() {
    if (typeof window === 'undefined' && this.pool) {
      await this.pool.end()
    }
  }
}

export const neonDb = new NeonDatabaseClient()

// Type-safe result handlers (reusing from original)
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
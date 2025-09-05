import { neon } from '@neondatabase/serverless'

// Create the SQL client using Neon serverless driver
// This is the recommended approach for Vercel deployments
// Only initialize on server-side
export const sql = typeof window === 'undefined' ? neon(process.env.DATABASE_URL!) : null

// Simple query wrapper for compatibility with existing code
export class NeonServerless {
  async query(text: string, params: any[] = []) {
    // Browser fallback - database operations should be done via API routes
    if (typeof window !== 'undefined' || !sql) {
      return { 
        data: null, 
        error: 'Database operations must be performed server-side',
        count: 0 
      }
    }

    try {
      // Use sql.query for parameterized queries
      const result = params.length > 0 ? await sql.query(text, params) : await sql.query(text)
      return {
        data: result,
        error: null,
        count: Array.isArray(result) ? result.length : 0
      }
    } catch (error: any) {
      console.error('Neon serverless query error:', error)
      return {
        data: null,
        error: error.message || 'Database query failed',
        count: 0
      }
    }
  }

  async selectSingle(table: string, options: { where?: Record<string, any>, eq?: Record<string, any> } = {}) {
    // Browser fallback - database operations should be done via API routes
    if (typeof window !== 'undefined' || !sql) {
      return { 
        data: null, 
        error: 'Database operations must be performed server-side'
      }
    }

    try {
      const { where, eq } = options
      const conditions = where || eq

      if (conditions) {
        const keys = Object.keys(conditions)
        const values = Object.values(conditions)
        const whereClause = keys.map(key => `${key} = $${keys.indexOf(key) + 1}`).join(' AND ')
        
        const result = await sql.query(`SELECT * FROM ${table} WHERE ${whereClause} LIMIT 1`, values)
        const data = Array.isArray(result) && result.length > 0 ? result[0] : null

        return { data, error: null }
      } else {
        const result = await sql.query(`SELECT * FROM ${table} LIMIT 1`)
        const data = Array.isArray(result) && result.length > 0 ? result[0] : null
        return { data, error: null }
      }
    } catch (error: any) {
      console.error('Neon serverless selectSingle error:', error)
      return {
        data: null,
        error: error.message || 'Database query failed'
      }
    }
  }

  async insert(table: string, data: Record<string, any>) {
    // Browser fallback - database operations should be done via API routes
    if (typeof window !== 'undefined' || !sql) {
      return { 
        data: null, 
        error: 'Database operations must be performed server-side'
      }
    }

    try {
      const keys = Object.keys(data)
      const values = Object.values(data)
      const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ')
      
      const result = await sql.query(`INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`, values)
      
      return {
        data: Array.isArray(result) ? result[0] : result,
        error: null
      }
    } catch (error: any) {
      console.error('Neon serverless insert error:', error)
      return {
        data: null,
        error: error.message || 'Database insert failed'
      }
    }
  }

  async update(table: string, data: Record<string, any>, where: Record<string, any>) {
    // Browser fallback - database operations should be done via API routes
    if (typeof window !== 'undefined' || !sql) {
      return { 
        data: null, 
        error: 'Database operations must be performed server-side'
      }
    }

    try {
      const updateKeys = Object.keys(data)
      const updateValues = Object.values(data)
      const whereKeys = Object.keys(where)
      const whereValues = Object.values(where)
      
      let valueIndex = 1
      const setClause = updateKeys.map(key => `${key} = $${valueIndex++}`).join(', ')
      const whereClause = whereKeys.map(key => `${key} = $${valueIndex++}`).join(' AND ')
      
      const result = await sql.query(`UPDATE ${table} SET ${setClause} WHERE ${whereClause} RETURNING *`, [...updateValues, ...whereValues])
      
      return {
        data: Array.isArray(result) ? result[0] : result,
        error: null
      }
    } catch (error: any) {
      console.error('Neon serverless update error:', error)
      return {
        data: null,
        error: error.message || 'Database update failed'
      }
    }
  }

  async select(table: string, options: { where?: Record<string, any>, eq?: Record<string, any>, order?: { column: string, ascending?: boolean }, limit?: number } = {}) {
    // Browser fallback - database operations should be done via API routes
    if (typeof window !== 'undefined' || !sql) {
      return { 
        data: null, 
        error: 'Database operations must be performed server-side'
      }
    }

    try {
      const { where, eq, order, limit } = options
      const conditions = where || eq

      let query = `SELECT * FROM ${table}`
      const values: any[] = []

      if (conditions) {
        const keys = Object.keys(conditions)
        const whereClause = keys.map(key => {
          values.push(conditions[key])
          return `${key} = $${values.length}`
        }).join(' AND ')
        query += ` WHERE ${whereClause}`
      }

      if (order) {
        query += ` ORDER BY ${order.column} ${order.ascending !== false ? 'ASC' : 'DESC'}`
      }

      if (limit) {
        query += ` LIMIT ${limit}`
      }
      
      const result = values.length > 0 ? await sql.query(query, values) : await sql.query(query)
      return { data: result, error: null }
    } catch (error: any) {
      console.error('Neon serverless select error:', error)
      return {
        data: null,
        error: error.message || 'Database select failed'
      }
    }
  }

  async selectWithJoins(table: string, selectQuery: string, options: { eq?: Record<string, any>, where?: Record<string, any>, order?: { column: string, ascending?: boolean }, limit?: number } = {}) {
    // Browser fallback - database operations should be done via API routes
    if (typeof window !== 'undefined' || !sql) {
      return { 
        data: null, 
        error: 'Database operations must be performed server-side'
      }
    }

    try {
      const { where, eq, order, limit } = options
      const conditions = where || eq

      let query = `SELECT ${selectQuery} FROM ${table}`
      const values: any[] = []

      if (conditions) {
        const keys = Object.keys(conditions)
        const whereClause = keys.map(key => {
          values.push(conditions[key])
          return `${key} = $${values.length}`
        }).join(' AND ')
        query += ` WHERE ${whereClause}`
      }

      if (order) {
        query += ` ORDER BY ${order.column} ${order.ascending !== false ? 'ASC' : 'DESC'}`
      }

      if (limit) {
        query += ` LIMIT ${limit}`
      }
      
      const result = values.length > 0 ? await sql.query(query, values) : await sql.query(query)
      return { data: result, error: null }
    } catch (error: any) {
      console.error('Neon serverless selectWithJoins error:', error)
      return {
        data: null,
        error: error.message || 'Database selectWithJoins failed'
      }
    }
  }

  async delete(table: string, where: Record<string, any>) {
    // Browser fallback - database operations should be done via API routes
    if (typeof window !== 'undefined' || !sql) {
      return { 
        error: 'Database operations must be performed server-side'
      }
    }

    try {
      const keys = Object.keys(where)
      const values = Object.values(where)
      const whereClause = keys.map(key => `${key} = $${keys.indexOf(key) + 1}`).join(' AND ')
      
      const result = await sql.query(`DELETE FROM ${table} WHERE ${whereClause}`, values)
      return { error: null }
    } catch (error: any) {
      console.error('Neon serverless delete error:', error)
      return {
        error: error.message || 'Database delete failed'
      }
    }
  }
}

// Export singleton instance
export const neonServerless = new NeonServerless()

// Export for direct SQL usage (recommended for simple queries)
export { sql as neonSql }
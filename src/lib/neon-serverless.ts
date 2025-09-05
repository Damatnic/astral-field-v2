import { neon } from '@neondatabase/serverless'

// Create the SQL client using Neon serverless driver
// This is the recommended approach for Vercel deployments
export const sql = neon(process.env.DATABASE_URL!)

// Simple query wrapper for compatibility with existing code
export class NeonServerless {
  async query(text: string, params: any[] = []) {
    try {
      // Neon serverless uses template literals with array spread
      const result = await sql(text as any, ...params)
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

  async selectSingle(table: string, options: { where?: Record<string, any> } = {}) {
    try {
      const { where } = options

      if (where) {
        const keys = Object.keys(where)
        const values = Object.values(where)
        const conditions = keys.map(key => `${key} = $${keys.indexOf(key) + 1}`).join(' AND ')
        
        const result = await sql(`SELECT * FROM ${table} WHERE ${conditions} LIMIT 1` as any, ...values)
        const data = Array.isArray(result) && result.length > 0 ? result[0] : null

        return { data, error: null }
      } else {
        const result = await sql(`SELECT * FROM ${table} LIMIT 1` as any)
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
    try {
      const keys = Object.keys(data)
      const values = Object.values(data)
      const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ')
      
      const result = await sql(`INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *` as any, ...values)
      
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
    try {
      const updateKeys = Object.keys(data)
      const updateValues = Object.values(data)
      const whereKeys = Object.keys(where)
      const whereValues = Object.values(where)
      
      let valueIndex = 1
      const setClause = updateKeys.map(key => `${key} = $${valueIndex++}`).join(', ')
      const whereClause = whereKeys.map(key => `${key} = $${valueIndex++}`).join(' AND ')
      
      const result = await sql(`UPDATE ${table} SET ${setClause} WHERE ${whereClause} RETURNING *` as any, ...updateValues, ...whereValues)
      
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

  async select(table: string, options: { where?: Record<string, any> } = {}) {
    try {
      const { where } = options

      if (where) {
        const keys = Object.keys(where)
        const values = Object.values(where)
        const conditions = keys.map(key => `${key} = $${keys.indexOf(key) + 1}`).join(' AND ')
        
        const result = await sql(`SELECT * FROM ${table} WHERE ${conditions}` as any, ...values)
        return { data: result, error: null }
      } else {
        const result = await sql(`SELECT * FROM ${table}` as any)
        return { data: result, error: null }
      }
    } catch (error: any) {
      console.error('Neon serverless select error:', error)
      return {
        data: null,
        error: error.message || 'Database select failed'
      }
    }
  }
}

// Export singleton instance
export const neonServerless = new NeonServerless()

// Export for direct SQL usage (recommended for simple queries)
export { sql as neonSql }
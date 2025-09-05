import { NextResponse } from 'next/server'
import { neonServerless } from '@/lib/neon-serverless'

// Debug endpoint to check database connection and users
export async function GET() {
  try {
    // Only allow in development or with a special debug key
    const isDev = process.env.NODE_ENV === 'development'
    const hasDebugKey = process.env.DEBUG_KEY === 'astral2025'
    
    if (!isDev && !hasDebugKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Debug: Checking database connection...')
    
    // Test database connection by counting users
    const result = await neonServerless.select('users', {})
    
    if (result.error) {
      console.error('Database query error:', result.error)
      return NextResponse.json({ 
        error: 'Database query failed', 
        details: result.error.message 
      }, { status: 500 })
    }

    const users = result.data || []
    
    // Return sanitized user info (no password hashes)
    const sanitizedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      username: user.username,
      hasPasswordHash: !!user.password_hash,
      created_at: user.created_at
    }))

    console.log(`Debug: Found ${users.length} users in database`)

    return NextResponse.json({
      success: true,
      userCount: users.length,
      users: sanitizedUsers,
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        hasNetlifyDatabaseUrl: !!process.env.NETLIFY_DATABASE_URL,
        hasNeonDatabaseUrl: !!process.env.NEON_DATABASE_URL
      }
    })

  } catch (error: any) {
    console.error('Debug endpoint error:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      message: error.message 
    }, { status: 500 })
  }
}
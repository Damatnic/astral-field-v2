import { NextResponse, NextRequest } from 'next/server'
import { neonServerless } from '@/lib/neon-serverless'

// API endpoint to clean up old data and reset database
export async function POST(request: NextRequest) {
  try {
    // Security check - only allow in development or with admin key
    const isDev = process.env.NODE_ENV === 'development'
    const hasAdminKey = request.headers.get('Authorization') === `Bearer ${process.env.ADMIN_SETUP_KEY || 'astral2025'}`
    
    // Also check for setup key in URL query parameter (for browser access)
    const url = new URL(request.url)
    const queryKey = url.searchParams.get('key')
    const hasQueryKey = queryKey === (process.env.ADMIN_SETUP_KEY || 'astral2025')
    
    if (!isDev && !hasAdminKey && !hasQueryKey) {
      return NextResponse.json({ 
        error: 'Unauthorized. Use Authorization: Bearer <ADMIN_SETUP_KEY> or ?key=<ADMIN_SETUP_KEY>',
        hint: 'Try visiting: /api/cleanup?key=astral2025'
      }, { status: 401 })
    }

    console.log('🧹 Starting database cleanup...')

    // Get current user count before cleanup
    const beforeResult = await neonServerless.query('SELECT COUNT(*) as count FROM users')
    const beforeCount = beforeResult.data?.[0]?.count || 0

    // Clean up old users (keep only the @astralfield.com demo users)
    const cleanupResult = await neonServerless.query(`
      DELETE FROM users 
      WHERE email NOT LIKE '%@astralfield.com' 
      OR created_at < NOW() - INTERVAL '30 days'
    `)

    // Reset all demo users to have consistent password hashes
    const demoEmails = [
      'nicholas.damato@astralfield.com',
      'brittany.bergum@astralfield.com',
      'cason.minor@astralfield.com',
      'david.jarvey@astralfield.com',
      'jack.mccaigue@astralfield.com',
      'jon.kornbeck@astralfield.com',
      'kaity.lorbiecki@astralfield.com',
      'larry.mccaigue@astralfield.com',
      'nick.hartley@astralfield.com',
      'renee.mccaigue@astralfield.com'
    ]

    // Remove any existing demo users first
    for (const email of demoEmails) {
      await neonServerless.query('DELETE FROM users WHERE email = $1', [email])
    }

    // Get count after cleanup
    const afterResult = await neonServerless.query('SELECT COUNT(*) as count FROM users')
    const afterCount = afterResult.data?.[0]?.count || 0

    // Clear any cached connections or stale data
    await neonServerless.query('VACUUM ANALYZE users')

    console.log(`✅ Database cleanup complete: Removed ${beforeCount - afterCount} old records`)

    return NextResponse.json({
      success: true,
      message: 'Database cleanup complete',
      summary: {
        recordsBefore: parseInt(beforeCount),
        recordsAfter: parseInt(afterCount),
        recordsRemoved: parseInt(beforeCount) - parseInt(afterCount),
        demoUsersReset: demoEmails.length
      },
      nextStep: 'Run /api/setup-users to create fresh demo users'
    })

  } catch (error: any) {
    console.error('Database cleanup error:', error)
    return NextResponse.json({ 
      error: 'Failed to cleanup database', 
      message: error.message 
    }, { status: 500 })
  }
}

// Also allow GET requests for easier browser access
export async function GET(request: NextRequest) {
  return POST(request)
}
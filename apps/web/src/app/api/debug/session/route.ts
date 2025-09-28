import { NextRequest, NextResponse } from 'next/server'
import { SessionDebugManager } from '@/lib/debug/session-manager'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Debug endpoints only available in development' }, { status: 403 })
  }

  try {
    const report = await SessionDebugManager.generateDebugReport(request)
    const diagnostics = await SessionDebugManager.diagnoseSession(request)
    
    return NextResponse.json({
      success: true,
      report,
      diagnostics,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Session debug API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Debug endpoints only available in development' }, { status: 403 })
  }

  try {
    const { action } = await request.json()
    
    if (action === 'clear-session') {
      const clearCommands = SessionDebugManager.clearSessionCookies()
      
      // Create response with cleared cookies
      const response = NextResponse.json({
        success: true,
        message: 'Session cookies cleared',
        clearCommands,
        timestamp: new Date().toISOString()
      })

      // Actually clear the cookies in the response
      const cookiesToClear = [
        'next-auth.session-token',
        '__Secure-next-auth.session-token',
        'next-auth.callback-url',
        '__Secure-next-auth.callback-url',
        'next-auth.csrf-token',
        '__Host-next-auth.csrf-token'
      ]

      cookiesToClear.forEach(cookieName => {
        response.cookies.set(cookieName, '', {
          expires: new Date(0),
          path: '/',
          domain: process.env.NODE_ENV === 'development' ? 'localhost' : undefined
        })
      })

      return response
    } else if (action === 'test-persistence') {
      const persistenceTest = await SessionDebugManager.testSessionPersistence()
      
      return NextResponse.json({
        success: true,
        persistenceTest,
        timestamp: new Date().toISOString()
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Unknown action. Available actions: clear-session, test-persistence'
      }, { status: 400 })
    }
  } catch (error) {
    console.error('Session debug API POST error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  // Health check endpoint
  return NextResponse.json({ 
    status: 'ok',
    service: 'analytics',
    timestamp: new Date().toISOString()
  })
}

export async function POST(req: NextRequest) {
  try {
    // Catalyst Performance: High-speed analytics collection
    const body = await req.json()
    const { event, data } = body
    
    // Basic validation
    if (!event) {
      return NextResponse.json({ error: 'Event type required' }, { status: 400 })
    }
    
    // Get user session for attribution
    let userId = null
    try {
      const session = await auth()
      userId = session?.user?.id
    } catch {
      // Anonymous analytics are fine
    }
    
    // Catalyst: Log performance metrics
    const timestamp = new Date().toISOString()
    const clientInfo = {
      userAgent: req.headers.get('user-agent'),
      referer: req.headers.get('referer'),
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
      timestamp,
      userId
    }
    
    // Handle different event types with minimal logging in production
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Analytics] ${event}:`, { data, ...clientInfo })
    }
    
    // Return success response
    return NextResponse.json({ 
      success: true,
      timestamp,
      event
    })
    
  } catch (error) {
    console.error('[Analytics] Error processing event:', error)
    return NextResponse.json(
      { error: 'Failed to process analytics event' },
      { status: 500 }
    )
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
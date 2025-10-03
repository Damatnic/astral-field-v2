import { NextRequest, NextResponse } from 'next/server'
import { ZenithError } from '@/lib/monitoring/zenith-qa-monitor'

export const dynamic = 'force-dynamic'


/**
 * Zenith Error Monitoring API
 * Collects and stores client-side errors for analysis
 */

export async function POST(request: NextRequest) {
  try {
    const error: ZenithError = await request.json()
    
    // Validate error data
    if (!error.id || !error.type || !error.message) {
      return NextResponse.json(
        { error: 'Invalid error data' },
        { status: 400 }
      )
    }

    // Log error (in production, send to logging service)
    if (process.env.NODE_ENV === 'development') {

      console.error('[Zenith Monitor] Client error:', {
      id: error.id,
      type: error.type,
      message: error.message,
      severity: error.severity,
      url: error.url,
      userAgent: error.userAgent,
      timestamp: error.timestamp,
      metadata: error.metadata
    });

    }
    // Store in database (implement based on your needs)
    // await storeError(error)

    // Send alerts for critical errors
    if (error.severity === 'critical') {
      await sendCriticalErrorAlert(error)
    }

    return NextResponse.json({ success: true, errorId: error.id })
  } catch (e) {
    if (process.env.NODE_ENV === 'development') {

      console.error('[Zenith Monitor] Failed to process error:', e);

    }
    return NextResponse.json(
      { error: 'Failed to process error' },
      { status: 500 }
    )
  }
}

async function sendCriticalErrorAlert(error: ZenithError) {
  // Implement critical error alerting
  if (process.env.NODE_ENV === 'development') {

    console.error('[CRITICAL ERROR ALERT]', {
    type: error.type,
    message: error.message,
    url: error.url,
    timestamp: error.timestamp
  });

  }
  // Could send to Slack, Discord, email, etc.
}
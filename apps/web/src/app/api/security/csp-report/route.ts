import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    let body;
    const contentType = request.headers.get('content-type');
    
    // Handle different content types for CSP reports
    if (contentType?.includes('application/csp-report')) {
      body = await request.json();
    } else if (contentType?.includes('application/json')) {
      body = await request.json();
    } else {
      // Some browsers send CSP reports as text
      const text = await request.text();
      try {
        body = JSON.parse(text);
      } catch {
        body = { rawReport: text };
      }
    }
    
    // Enhanced CSP violation logging
    console.warn('🚨 CSP Violation Report:', {
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent'),
      referer: request.headers.get('referer'),
      contentType,
      violation: body,
      // Extract key violation details
      violatedDirective: body?.['csp-report']?.['violated-directive'] || body?.violatedDirective,
      blockedUri: body?.['csp-report']?.['blocked-uri'] || body?.blockedUri,
      sourceFile: body?.['csp-report']?.['source-file'] || body?.sourceFile
    })
    
    // In production, send to monitoring service
    if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_SENTRY_DSN) {
      // @ts-ignore - Optional dependency
      import('@sentry/nextjs').then(Sentry => {
        Sentry.captureMessage('CSP Violation', {
          level: 'warning',
          extra: {
            violation: body,
            violatedDirective: body?.['csp-report']?.['violated-directive'] || body?.violatedDirective,
            blockedUri: body?.['csp-report']?.['blocked-uri'] || body?.blockedUri,
            userAgent: request.headers.get('user-agent')
          }
        })
      }).catch(() => {})
    }
    
    return NextResponse.json({ status: 'received', timestamp: new Date().toISOString() }, { status: 200 })
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {

      console.error('❌ Error processing CSP report:', error);

    }
    return NextResponse.json({ error: 'Invalid report', details: error instanceof Error ? error.message : String(error) }, { status: 400 })
  }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
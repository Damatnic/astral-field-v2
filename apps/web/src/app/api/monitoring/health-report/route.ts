import { NextRequest, NextResponse } from 'next/server'
import { HealthReport } from '@/lib/qa/health-monitor'

/**
 * Health Report Storage API
 * Stores health reports from client-side monitoring
 */

export async function POST(request: NextRequest) {
  try {
    const report: HealthReport = await request.json()
    
    // Log the health report
    // Log any failed checks
    const failedChecks = report.checks.filter(c => c.status === 'fail')
    if (failedChecks.length > 0) {
      console.error('[Zenith Health Report] Failed checks:', 
        failedChecks.map(c => ({ name: c.name, message: c.message }))
      )
    }
    
    // Log warnings
    const warningChecks = report.checks.filter(c => c.status === 'warning')
    if (warningChecks.length > 0) {
      console.warn('[Zenith Health Report] Warnings:', 
        warningChecks.map(c => ({ name: c.name, message: c.message }))
      )
    }
    
    // In production, store in database and send alerts
    // await storeHealthReport(report)
    
    if (report.overall === 'critical') {
      await sendCriticalHealthAlert(report)
    }

    return NextResponse.json({ success: true, reportId: generateReportId() })
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {

      console.error('[Zenith Health Report] Failed to process report:', error);

    }
    return NextResponse.json(
      { error: 'Failed to process health report' },
      { status: 500 }
    )
  }
}

async function sendCriticalHealthAlert(report: HealthReport) {
  console.error('[CRITICAL HEALTH ALERT]', {
    overall: report.overall,
    failedChecks: report.checks.filter(c => c.status === 'fail').length,
    timestamp: report.timestamp
  })
  
  // In production, send to Slack, PagerDuty, etc.
}

function generateReportId(): string {
  return 'health_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
}
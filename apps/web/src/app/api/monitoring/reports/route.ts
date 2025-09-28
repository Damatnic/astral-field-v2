import { NextRequest, NextResponse } from 'next/server'
import { QAReport } from '@/lib/monitoring/zenith-qa-monitor'

/**
 * Zenith QA Report API
 * Collects periodic QA reports from clients
 */

export async function POST(request: NextRequest) {
  try {
    const report: QAReport = await request.json()
    
    // Log report summary
    console.log('[Zenith QA Report]', {
      totalErrors: report.summary.totalErrors,
      criticalErrors: report.summary.criticalErrors,
      avgResponseTime: report.summary.avgResponseTime,
      errorRate: report.summary.errorRate,
      uptime: report.summary.uptime
    })

    // Analyze report for issues
    await analyzeReport(report)

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[Zenith Monitor] Failed to process report:', e)
    return NextResponse.json(
      { error: 'Failed to process report' },
      { status: 500 }
    )
  }
}

async function analyzeReport(report: QAReport) {
  const { summary } = report
  
  // Check for concerning patterns
  const alerts = []
  
  if (summary.criticalErrors > 0) {
    alerts.push(`${summary.criticalErrors} critical errors detected`)
  }
  
  if (summary.errorRate > 5) { // More than 5 errors per minute
    alerts.push(`High error rate: ${summary.errorRate.toFixed(2)} errors/min`)
  }
  
  if (summary.avgResponseTime > 2000) {
    alerts.push(`Slow response time: ${summary.avgResponseTime.toFixed(0)}ms`)
  }
  
  // Look for hydration errors
  const hydrationErrors = report.errors.filter(e => e.type === 'hydration')
  if (hydrationErrors.length > 0) {
    alerts.push(`${hydrationErrors.length} hydration errors detected`)
  }
  
  // Look for import failures
  const importErrors = report.errors.filter(e => e.type === 'import')
  if (importErrors.length > 0) {
    alerts.push(`${importErrors.length} dynamic import failures`)
  }
  
  if (alerts.length > 0) {
    console.warn('[Zenith QA] Issues detected:', alerts.join(', '))
  }
}
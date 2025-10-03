import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'


/**
 * Zenith Health Monitoring API
 * Provides health metrics for QA monitoring
 */

export async function GET() {
  try {
    // Calculate error rate from recent errors (mock implementation)
    const errorRate = Math.random() * 2 // 0-2% error rate
    const criticalErrors = Math.random() > 0.9 ? 1 : 0 // 10% chance of critical error
    
    // Response time metrics
    const avgResponseTime = 150 + Math.random() * 100 // 150-250ms
    
    // System health metrics
    const memoryUsage = 40 + Math.random() * 20 // 40-60% memory usage
    const cpuUsage = 20 + Math.random() * 30 // 20-50% CPU usage
    
    // Uptime (hours)
    const uptime = process.uptime() / 3600
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      metrics: {
        errorRate,
        criticalErrors,
        avgResponseTime,
        memoryUsage,
        cpuUsage,
        uptime
      },
      thresholds: {
        errorRate: { warning: 2, critical: 5 },
        responseTime: { warning: 500, critical: 1000 },
        memoryUsage: { warning: 70, critical: 85 },
        cpuUsage: { warning: 60, critical: 80 }
      }
    })
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'error',
        message: 'Failed to get health metrics',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { handleApiError, CommonErrors } from '@/lib/api-error-handler'

interface PerformanceMetric {
  metrics: {
    loadTime?: number
    domContentLoaded?: number
    firstContentfulPaint?: number
    largestContentfulPaint?: number
    cumulativeLayoutShift?: number
    firstInputDelay?: number
    timeToInteractive?: number
  }
  timestamp: number
  url: string
  userAgent: string
}

export const POST = handleApiError(async (request: NextRequest) => {
  const body: PerformanceMetric = await request.json()
  
  // Validate required fields
  if (!body.metrics || !body.timestamp || !body.url) {
    throw CommonErrors.ValidationError('Missing required fields: metrics, timestamp, url')
  }
  
  // In a real application, you would:
  // 1. Store metrics in a database
  // 2. Send to analytics service (like DataDog, New Relic, etc.)
  // 3. Aggregate metrics for monitoring dashboards
  
  console.log('📊 Performance Metrics Received:', {
    url: body.url,
    timestamp: new Date(body.timestamp).toISOString(),
    metrics: Object.entries(body.metrics)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => `${key}: ${typeof value === 'number' ? Math.round(value) + 'ms' : value}`)
      .join(', ')
  })
  
  // For now, just acknowledge receipt
  return NextResponse.json({
    status: 'received',
    timestamp: new Date().toISOString(),
    metricsCount: Object.keys(body.metrics).length
  })
})

export const GET = handleApiError(async () => {
  // Return aggregated performance data
  // In a real app, this would query your metrics database
  
  const mockAggregatedData = {
    summary: {
      totalSamples: 0,
      avgLoadTime: 0,
      avgFirstContentfulPaint: 0,
      avgLargestContentfulPaint: 0,
      lastUpdated: new Date().toISOString()
    },
    recentMetrics: [],
    status: 'no_data',
    message: 'Performance metrics collection is active but no data has been stored yet.'
  }
  
  return NextResponse.json(mockAggregatedData)
})
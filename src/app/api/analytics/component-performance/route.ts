import { NextRequest, NextResponse } from 'next/server'
import { handleApiError, CommonErrors } from '@/lib/api-error-handler'

interface ComponentMetric {
  component: string
  renderTime: number
  timestamp: number
  url: string
}

export const POST = handleApiError(async (request: NextRequest) => {
  const body: ComponentMetric = await request.json()
  
  // Validate required fields
  if (!body.component || !body.renderTime || !body.timestamp) {
    throw CommonErrors.ValidationError('Missing required fields: component, renderTime, timestamp')
  }
  
  // Log slow component renders
  console.log('🐌 Slow Component Detected:', {
    component: body.component,
    renderTime: `${Math.round(body.renderTime)}ms`,
    url: body.url,
    timestamp: new Date(body.timestamp).toISOString()
  })
  
  // In a real application, you would:
  // 1. Store component metrics in a database
  // 2. Alert on consistently slow components
  // 3. Track performance regressions
  // 4. Generate component performance reports
  
  return NextResponse.json({
    status: 'logged',
    timestamp: new Date().toISOString(),
    component: body.component,
    renderTime: Math.round(body.renderTime)
  })
})

export const GET = handleApiError(async () => {
  // Return component performance data
  // In a real app, this would query your metrics database
  
  const mockComponentData = {
    slowComponents: [],
    averageRenderTimes: {},
    totalComponents: 0,
    lastUpdated: new Date().toISOString(),
    status: 'monitoring_active',
    message: 'Component performance monitoring is active.'
  }
  
  return NextResponse.json(mockComponentData)
})
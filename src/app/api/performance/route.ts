import { NextRequest, NextResponse } from 'next/server';
import { 
  generatePerformanceReport,
  getMetrics,
  recordMetric,
  PerformanceMetric
} from '@/lib/performance-monitor';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const metricName = searchParams.get('metric');
    const windowMs = parseInt(searchParams.get('window') || '60000');
    const since = searchParams.get('since');
    
    if (metricName) {
      const metrics = getMetrics(
        metricName,
        since ? parseInt(since) : Date.now() - windowMs
      );
      
      return NextResponse.json({
        metrics,
        count: metrics.length,
        window: windowMs
      });
    }
    
    const report = generatePerformanceReport(windowMs);
    
    return NextResponse.json(report);
  } catch (error) {
    console.error('Failed to generate performance report:', error);
    return NextResponse.json(
      { error: 'Failed to generate performance report' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const metrics: PerformanceMetric[] = await request.json();
    
    if (!Array.isArray(metrics)) {
      return NextResponse.json(
        { error: 'Invalid request: metrics must be an array' },
        { status: 400 }
      );
    }
    
    for (const metric of metrics) {
      recordMetric(
        metric.name,
        metric.value,
        metric.unit,
        metric.metadata
      );
    }
    
    return NextResponse.json({
      success: true,
      processed: metrics.length
    });
  } catch (error) {
    console.error('Failed to record metrics:', error);
    return NextResponse.json(
      { error: 'Failed to record metrics' },
      { status: 500 }
    );
  }
}
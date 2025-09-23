import { NextRequest, NextResponse } from 'next/server';
import { PerformanceMetric } from '@/lib/performance-monitor';

interface PerformanceAnomaly extends PerformanceMetric {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
  reportedAt: string;
}

const anomalies: PerformanceAnomaly[] = [];
const MAX_ANOMALIES = 1000;

function determineSeverity(metric: PerformanceMetric): PerformanceAnomaly['severity'] {
  const criticalThresholds: Record<string, number> = {
    'api_call_duration': 10000,
    'page_load_time': 15000,
    'js_heap_usage_percent': 95,
    'server_heap_usage_percent': 90
  };

  const highThresholds: Record<string, number> = {
    'api_call_duration': 5000,
    'page_load_time': 8000,
    'first_contentful_paint': 4000,
    'js_heap_usage_percent': 85,
    'server_heap_usage_percent': 80
  };

  const mediumThresholds: Record<string, number> = {
    'api_call_duration': 3000,
    'page_load_time': 5000,
    'first_contentful_paint': 2500,
    'long_task': 150,
    'js_heap_usage_percent': 75,
    'server_heap_usage_percent': 70
  };

  if (criticalThresholds[metric.name] && metric.value > criticalThresholds[metric.name]) {
    return 'critical';
  }
  if (highThresholds[metric.name] && metric.value > highThresholds[metric.name]) {
    return 'high';
  }
  if (mediumThresholds[metric.name] && metric.value > mediumThresholds[metric.name]) {
    return 'medium';
  }
  return 'low';
}

export async function POST(request: NextRequest) {
  try {
    const metric: PerformanceMetric = await request.json();
    
    const anomaly: PerformanceAnomaly = {
      ...metric,
      id: `anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      severity: determineSeverity(metric),
      resolved: false,
      reportedAt: new Date().toISOString()
    };

    anomalies.unshift(anomaly);
    
    if (anomalies.length > MAX_ANOMALIES) {
      anomalies.splice(MAX_ANOMALIES);
    }

    console.warn('[Performance Anomaly]', {
      id: anomaly.id,
      name: anomaly.name,
      value: anomaly.value,
      unit: anomaly.unit,
      severity: anomaly.severity,
      metadata: anomaly.metadata
    });

    if (anomaly.severity === 'critical') {
      console.error('CRITICAL PERFORMANCE ISSUE DETECTED!', anomaly);
    }

    return NextResponse.json({
      success: true,
      anomalyId: anomaly.id,
      severity: anomaly.severity
    });
  } catch (error) {
    console.error('Failed to process performance anomaly:', error);
    return NextResponse.json(
      { error: 'Failed to process anomaly' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const severity = searchParams.get('severity');
    const resolved = searchParams.get('resolved');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    let filtered = [...anomalies];
    
    if (severity) {
      filtered = filtered.filter(a => a.severity === severity);
    }
    
    if (resolved !== null) {
      filtered = filtered.filter(a => a.resolved === (resolved === 'true'));
    }
    
    const results = filtered.slice(0, limit);
    
    const summary = {
      total: anomalies.length,
      critical: anomalies.filter(a => a.severity === 'critical' && !a.resolved).length,
      high: anomalies.filter(a => a.severity === 'high' && !a.resolved).length,
      medium: anomalies.filter(a => a.severity === 'medium' && !a.resolved).length,
      low: anomalies.filter(a => a.severity === 'low' && !a.resolved).length
    };
    
    return NextResponse.json({
      anomalies: results,
      summary
    });
  } catch (error) {
    console.error('Failed to fetch anomalies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch anomalies' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { anomalyId, resolved } = await request.json();
    
    const anomaly = anomalies.find(a => a.id === anomalyId);
    if (!anomaly) {
      return NextResponse.json(
        { error: 'Anomaly not found' },
        { status: 404 }
      );
    }
    
    anomaly.resolved = resolved;
    
    return NextResponse.json({
      success: true,
      anomaly
    });
  } catch (error) {
    console.error('Failed to update anomaly:', error);
    return NextResponse.json(
      { error: 'Failed to update anomaly' },
      { status: 500 }
    );
  }
}
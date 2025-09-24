import { NextRequest, NextResponse } from 'next/server';
import { productionAlerts } from '@/lib/monitoring/production-alerts';

export async function GET(request: NextRequest) {
  try {
    // For now, skip auth check in development - add proper auth in production
    // TODO: Add proper authentication check

    const url = new URL(request.url);
    const hours = parseInt(url.searchParams.get('hours') || '24');
    const onlyActive = url.searchParams.get('active') === 'true';

    let alerts;
    if (onlyActive) {
      alerts = await productionAlerts.getActiveAlerts();
    } else {
      alerts = await productionAlerts.getAlertHistory(hours);
    }

    return NextResponse.json(alerts);

  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // For now, skip auth check in development - add proper auth in production
    // TODO: Add proper authentication check

    const body = await request.json();
    const { action, alertId } = body;

    switch (action) {
      case 'resolve':
        if (!alertId) {
          return NextResponse.json({ error: 'Alert ID required' }, { status: 400 });
        }
        await productionAlerts.resolveAlert(alertId);
        return NextResponse.json({ success: true, message: 'Alert resolved' });

      case 'test':
        // Trigger a test alert
        await fetch('/api/monitoring/health', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metric: 'test_alert',
            value: 1,
            timestamp: Date.now()
          })
        });
        return NextResponse.json({ success: true, message: 'Test alert triggered' });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error handling alert action:', error);
    return NextResponse.json(
      { error: 'Failed to process alert action' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // For now, skip auth check in development - add proper auth in production
    // TODO: Add proper authentication check

    const body = await request.json();
    const { alertType, config } = body;

    if (!alertType || !config) {
      return NextResponse.json(
        { error: 'Alert type and config required' },
        { status: 400 }
      );
    }

    await productionAlerts.updateAlertConfig(alertType, config);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Alert configuration updated' 
    });

  } catch (error) {
    console.error('Error updating alert config:', error);
    return NextResponse.json(
      { error: 'Failed to update alert configuration' },
      { status: 500 }
    );
  }
}
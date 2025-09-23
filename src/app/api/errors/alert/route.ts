import { NextRequest, NextResponse } from 'next/server';
import { ErrorSeverity } from '@/lib/error-tracking';

interface TrackedError {
  id: string;
  category: string;
  severity: ErrorSeverity;
  message: string;
  context?: any;
  timestamp: string;
  resolved: boolean;
}

interface AlertChannel {
  type: 'email' | 'slack' | 'webhook' | 'console';
  config: Record<string, any>;
}

const alertChannels: AlertChannel[] = [
  { type: 'console', config: {} }
];

const recentAlerts = new Map<string, number>();
const ALERT_COOLDOWN = 60000;

async function sendAlert(error: TrackedError, channel: AlertChannel) {
  switch (channel.type) {
    case 'console':
      console.error('\n🚨 CRITICAL ERROR ALERT 🚨');
      console.error('========================');
      console.error('Error ID:', error.id);
      console.error('Category:', error.category);
      console.error('Severity:', error.severity);
      console.error('Message:', error.message);
      console.error('Timestamp:', error.timestamp);
      console.error('User ID:', error.context?.userId || 'Unknown');
      console.error('Session ID:', error.context?.sessionId || 'Unknown');
      console.error('Component:', error.context?.component || 'Unknown');
      if (error.context?.stack) {
        console.error('Stack Trace:', error.context.stack);
      }
      console.error('========================\n');
      break;

    case 'slack':
      if (process.env.SLACK_WEBHOOK_URL) {
        await fetch(process.env.SLACK_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `🚨 Critical Error Alert`,
            attachments: [{
              color: 'danger',
              title: error.message,
              fields: [
                { title: 'Error ID', value: error.id, short: true },
                { title: 'Category', value: error.category, short: true },
                { title: 'Severity', value: error.severity, short: true },
                { title: 'Timestamp', value: error.timestamp, short: true },
                { title: 'Component', value: error.context?.component || 'Unknown', short: true },
                { title: 'User ID', value: error.context?.userId || 'Unknown', short: true }
              ],
              footer: 'Error Tracking System',
              ts: Math.floor(Date.now() / 1000)
            }]
          })
        });
      }
      break;

    case 'email':
      console.log('[Email Alert] Would send email for critical error:', error.id);
      break;

    case 'webhook':
      if (channel.config.url) {
        await fetch(channel.config.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(error)
        });
      }
      break;
  }
}

function shouldSendAlert(errorKey: string): boolean {
  const lastAlert = recentAlerts.get(errorKey);
  const now = Date.now();
  
  if (lastAlert && (now - lastAlert) < ALERT_COOLDOWN) {
    return false;
  }
  
  recentAlerts.set(errorKey, now);
  
  for (const [key, time] of recentAlerts.entries()) {
    if (now - time > ALERT_COOLDOWN * 10) {
      recentAlerts.delete(key);
    }
  }
  
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const error: TrackedError = await request.json();
    
    if (error.severity !== ErrorSeverity.CRITICAL && error.severity !== ErrorSeverity.HIGH) {
      return NextResponse.json({
        success: false,
        message: 'Only critical or high severity errors trigger alerts'
      }, { status: 400 });
    }

    const errorKey = `${error.category}_${error.message}`.substring(0, 100);
    
    if (!shouldSendAlert(errorKey)) {
      return NextResponse.json({
        success: false,
        message: 'Alert suppressed due to cooldown period'
      });
    }

    const alertPromises = alertChannels.map(channel => 
      sendAlert(error, channel).catch(err => {
        console.error(`Failed to send alert via ${channel.type}:`, err);
      })
    );

    await Promise.all(alertPromises);

    return NextResponse.json({
      success: true,
      message: 'Alert sent successfully',
      channels: alertChannels.map(c => c.type)
    });
  } catch (error) {
    console.error('Failed to send alert:', error);
    return NextResponse.json(
      { error: 'Failed to send alert' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const activeAlerts = Array.from(recentAlerts.entries()).map(([key, time]) => ({
      key,
      lastAlertTime: new Date(time).toISOString(),
      cooldownRemaining: Math.max(0, ALERT_COOLDOWN - (Date.now() - time))
    }));

    return NextResponse.json({
      channels: alertChannels.map(c => ({ type: c.type, configured: true })),
      activeAlerts,
      cooldownPeriod: ALERT_COOLDOWN
    });
  } catch (error) {
    console.error('Failed to fetch alert status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alert status' },
      { status: 500 }
    );
  }
}
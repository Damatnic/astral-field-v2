import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { ErrorCategory, ErrorSeverity } from '@/lib/error-tracking';

interface ErrorLogEntry {
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: string;
  userAgent?: string;
  url?: string;
  category?: ErrorCategory;
  severity?: ErrorSeverity;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

const errorStorage: ErrorLogEntry[] = [];
const MAX_STORED_ERRORS = 1000;

async function storeError(errorEntry: ErrorLogEntry) {
  errorStorage.push(errorEntry);
  if (errorStorage.length > MAX_STORED_ERRORS) {
    errorStorage.shift();
  }
}

async function notifyAdmins(errorEntry: ErrorLogEntry) {
  if (errorEntry.severity === ErrorSeverity.CRITICAL) {
    console.error('[CRITICAL ERROR ALERT]:', {
      message: errorEntry.message,
      url: errorEntry.url,
      timestamp: errorEntry.timestamp,
      stack: errorEntry.stack
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const headersList = headers();
    const errorEntry: ErrorLogEntry = await request.json();
    
    errorEntry.userAgent = errorEntry.userAgent || headersList.get('user-agent') || undefined;
    
    const clientIp = headersList.get('x-forwarded-for') || 
                    headersList.get('x-real-ip') || 
                    'unknown';

    console.error('[Client Error]', {
      message: errorEntry.message,
      url: errorEntry.url,
      stack: errorEntry.stack,
      timestamp: errorEntry.timestamp,
      ip: clientIp,
      userAgent: errorEntry.userAgent
    });

    await storeError(errorEntry);
    await notifyAdmins(errorEntry);

    return NextResponse.json({
      success: true,
      message: 'Error logged successfully',
      errorId: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });
  } catch (error) {
    console.error('Failed to process error log:', error);
    return NextResponse.json(
      { error: 'Failed to log error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') as ErrorCategory | null;
    const severity = searchParams.get('severity') as ErrorSeverity | null;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let filteredErrors = [...errorStorage];
    
    if (category) {
      filteredErrors = filteredErrors.filter(e => e.category === category);
    }
    if (severity) {
      filteredErrors = filteredErrors.filter(e => e.severity === severity);
    }

    const total = filteredErrors.length;
    const errors = filteredErrors
      .reverse()
      .slice(offset, offset + limit);

    return NextResponse.json({
      errors,
      total,
      limit,
      offset
    });
  } catch (error) {
    console.error('Failed to fetch error logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch error logs' },
      { status: 500 }
    );
  }
}
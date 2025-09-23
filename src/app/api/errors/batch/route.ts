import { NextRequest, NextResponse } from 'next/server';

interface TrackedError {
  id: string;
  category: string;
  severity: string;
  message: string;
  context?: any;
  timestamp: string;
  resolved: boolean;
}

const batchErrorStorage = new Map<string, TrackedError>();
const MAX_BATCH_ERRORS = 5000;

export async function POST(request: NextRequest) {
  try {
    const { errors } = await request.json() as { errors: TrackedError[] };
    
    if (!Array.isArray(errors)) {
      return NextResponse.json(
        { error: 'Invalid request: errors must be an array' },
        { status: 400 }
      );
    }

    const processedIds: string[] = [];
    const failedIds: string[] = [];

    for (const error of errors) {
      try {
        batchErrorStorage.set(error.id, {
          ...error,
          resolved: true
        });
        
        if (batchErrorStorage.size > MAX_BATCH_ERRORS) {
          const firstKey = batchErrorStorage.keys().next().value;
          if (firstKey) batchErrorStorage.delete(firstKey);
        }

        processedIds.push(error.id);

        console.log('[Batch Error Log]', {
          id: error.id,
          category: error.category,
          severity: error.severity,
          message: error.message,
          timestamp: error.timestamp
        });
      } catch (processError) {
        console.error('Failed to process error:', error.id, processError);
        failedIds.push(error.id);
      }
    }

    return NextResponse.json({
      success: true,
      processedCount: processedIds.length,
      failedCount: failedIds.length,
      processedIds,
      failedIds
    });
  } catch (error) {
    console.error('Failed to process batch errors:', error);
    return NextResponse.json(
      { error: 'Failed to process batch errors' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const errors = Array.from(batchErrorStorage.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 100);

    return NextResponse.json({
      errors,
      total: batchErrorStorage.size
    });
  } catch (error) {
    console.error('Failed to fetch batch errors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch batch errors' },
      { status: 500 }
    );
  }
}
import { NextResponse } from 'next/server';
import { ESPNService } from '@/lib/services/espn';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const espn = new ESPNService();
    const week = await espn.getCurrentWeek();
    
    return NextResponse.json(
      { week, season: 2024 },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=300',
        },
      }
    );
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('ESPN week API failed:', error);
    }
    return NextResponse.json(
      { error: 'Failed to fetch current week' },
      { status: 500 }
    );
  }
}



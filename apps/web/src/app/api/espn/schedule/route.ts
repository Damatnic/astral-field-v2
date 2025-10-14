import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { ESPNService } from '@/lib/services/espn';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const week = searchParams.get('week');
    
    const espn = new ESPNService();
    const weekNumber = week ? parseInt(week, 10) : undefined;
    
    if (week && isNaN(weekNumber!)) {
      return NextResponse.json(
        { error: 'Invalid week parameter' },
        { status: 400 }
      );
    }
    
    const data = await espn.getWeeklySchedule(weekNumber);
    
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('ESPN schedule API failed:', error);
    }
    return NextResponse.json(
      { error: 'Failed to fetch schedule' },
      { status: 500 }
    );
  }
}



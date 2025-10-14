import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { ESPNService } from '@/lib/services/espn';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    
    // The id parameter can be either a team abbreviation (e.g., "KC") or a team ID
    // getTeamSchedule accepts abbreviation, so we can pass it directly
    const data = await espn.getTeamSchedule(params.id, weekNumber);
    
    if (!data) {
      return NextResponse.json(
        { error: `Team ${params.id} not found` },
        { status: 404 }
      );
    }
    
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error(`ESPN team schedule API failed for ${params.id}:`, error);
    }
    return NextResponse.json(
      { error: 'Failed to fetch team schedule' },
      { status: 500 }
    );
  }
}


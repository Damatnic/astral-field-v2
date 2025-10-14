import { NextResponse } from 'next/server';
import { ESPNService } from '@/lib/services/espn';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const espn = new ESPNService();
    const data = await espn.getTeamRoster(params.id);
    
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error(`ESPN roster API failed for team ${params.id}:`, error);
    }
    return NextResponse.json(
      { error: 'Failed to fetch team roster' },
      { status: 500 }
    );
  }
}



import { NextResponse } from 'next/server';
import { ESPNService } from '@/lib/services/espn';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const espn = new ESPNService();
    const data = await espn.getLivePlayerStats(params.id);
    
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=15',
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error(`ESPN live player stats API failed for ${params.id}:`, error);
    }
    return NextResponse.json(
      { error: 'Failed to fetch live player stats' },
      { status: 500 }
    );
  }
}



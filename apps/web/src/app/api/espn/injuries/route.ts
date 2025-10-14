import { NextResponse } from 'next/server';
import { ESPNService } from '@/lib/services/espn';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const espn = new ESPNService();
    const data = await espn.getInjuries();
    
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=150',
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('ESPN injuries API failed:', error);
    }
    return NextResponse.json(
      { error: 'Failed to fetch injuries' },
      { status: 500 }
    );
  }
}



import { NextRequest, NextResponse } from 'next/server';
import { ESPNService } from '@/lib/services/espn';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    
    const espn = new ESPNService();
    
    if (search) {
      const players = await espn.searchPlayers(search);
      return NextResponse.json({
        success: true,
        data: players
      });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Search parameter required'
    }, { status: 400 });
  } catch (error) {
    console.error('ESPN players search error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to search players' 
      },
      { status: 500 }
    );
  }
}
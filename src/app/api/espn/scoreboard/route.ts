import { NextRequest, NextResponse } from 'next/server';
import { ESPNService } from '@/lib/services/espn';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const week = searchParams.get('week');
    
    const espn = new ESPNService();
    const data = await espn.getScoreboard(week ? parseInt(week) : undefined);
    
    return NextResponse.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('ESPN scoreboard error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch scoreboard data' 
      },
      { status: 500 }
    );
  }
}
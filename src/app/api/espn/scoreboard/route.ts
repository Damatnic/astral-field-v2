import { NextResponse } from 'next/server';
import { ESPNService } from '@/lib/services/espn';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
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
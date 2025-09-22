import { NextRequest, NextResponse } from 'next/server';
import { authenticateFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get current user from session
    const currentUser = await authenticateFromRequest(request);
    
    if (!currentUser) {
      return NextResponse.json({
        success: false,
        message: 'Authentication required'
      }, { status: 401 });
    }

    // Mock season trend data
    const mockTrends = [
      { week: 1, points: 98.5, projected: 105.2, leagueAverage: 102.3 },
      { week: 2, points: 118.7, projected: 110.5, leagueAverage: 108.1 },
      { week: 3, points: 134.2, projected: 125.8, leagueAverage: 115.6 },
      { week: 4, points: 108.9, projected: 118.3, leagueAverage: 112.4 },
      { week: 5, points: 142.6, projected: 128.7, leagueAverage: 119.8 },
      { week: 6, points: 125.3, projected: 122.1, leagueAverage: 116.7 },
      { week: 7, points: 156.8, projected: 135.4, leagueAverage: 124.2 },
      { week: 8, points: 111.4, projected: 119.8, leagueAverage: 113.5 },
      { week: 9, points: 138.9, projected: 131.2, leagueAverage: 121.6 },
      { week: 10, points: 149.7, projected: 140.3, leagueAverage: 127.8 },
      { week: 11, points: 132.1, projected: 128.9, leagueAverage: 120.4 }
    ];

    return NextResponse.json({
      success: true,
      data: mockTrends
    });

  } catch (error) {
    console.error('Error fetching season trends:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch trend data'
    }, { status: 500 });
  }
}
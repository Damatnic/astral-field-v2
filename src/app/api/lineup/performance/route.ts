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

    // Mock player performance data
    const mockPerformance = [
      {
        position: 'QB',
        actualPoints: 24.5,
        projectedPoints: 22.0
      },
      {
        position: 'RB1',
        actualPoints: 18.2,
        projectedPoints: 15.5
      },
      {
        position: 'RB2',
        actualPoints: 12.8,
        projectedPoints: 14.0
      },
      {
        position: 'WR1',
        actualPoints: 21.3,
        projectedPoints: 18.5
      },
      {
        position: 'WR2',
        actualPoints: 14.7,
        projectedPoints: 16.0
      },
      {
        position: 'TE',
        actualPoints: 8.9,
        projectedPoints: 10.5
      },
      {
        position: 'FLEX',
        actualPoints: 11.6,
        projectedPoints: 12.5
      },
      {
        position: 'K',
        actualPoints: 9.0,
        projectedPoints: 8.0
      },
      {
        position: 'DEF',
        actualPoints: 12.0,
        projectedPoints: 9.5
      }
    ];

    return NextResponse.json({
      success: true,
      data: mockPerformance
    });

  } catch (error) {
    console.error('Error fetching lineup performance:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch performance data'
    }, { status: 500 });
  }
}
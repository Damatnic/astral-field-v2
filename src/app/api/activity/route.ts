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

    // Mock activity data for now
    const mockActivity = [
      {
        id: 1,
        type: 'trade',
        description: 'Trade proposal received',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        impact: 'neutral'
      },
      {
        id: 2,
        type: 'waiver',
        description: 'Waiver claim processed',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
        impact: 'positive'
      },
      {
        id: 3,
        type: 'injury',
        description: 'Player status updated',
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
        impact: 'negative'
      },
      {
        id: 4,
        type: 'trade',
        description: 'Trade completed successfully',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        impact: 'positive'
      },
      {
        id: 5,
        type: 'waiver',
        description: 'Waiver budget updated',
        timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), // 2 days ago
        impact: 'neutral'
      }
    ];

    return NextResponse.json({
      success: true,
      data: mockActivity
    });

  } catch (error) {
    console.error('Error fetching activity:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch activity data'
    }, { status: 500 });
  }
}
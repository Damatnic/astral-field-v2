import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const leagueId = searchParams.get('leagueId');
    const week = searchParams.get('week');

    if (!leagueId) {
      return NextResponse.json({
        success: false,
        message: 'League ID is required'
      }, { status: 400 });
    }

    const whereClause: any = { leagueId };
    if (week) {
      whereClause.week = parseInt(week);
    }

    const matchups = await prisma.matchup.findMany({
      where: whereClause,
      include: {
        homeTeam: {
          select: {
            id: true,
            name: true,
            ownerId: true
          }
        },
        awayTeam: {
          select: {
            id: true,
            name: true,
            ownerId: true
          }
        }
      },
      orderBy: { week: 'desc' }
    });

    return NextResponse.json({
      success: true,
      data: matchups
    });

  } catch (error) {
    console.error('Error fetching matchups:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch matchups'
    }, { status: 500 });
  }
}
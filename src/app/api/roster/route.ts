import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/get-session';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    
    const team = teamId 
      ? await prisma.team.findUnique({
          where: { id: teamId },
          include: { owner: true }
        })
      : await prisma.team.findFirst({
          where: { ownerId: session.user.id }
        });
    
    if (!team || team.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Team not found or access denied' }, { status: 404 });
    }
    
    const roster = await prisma.rosterPlayer.findMany({
      where: { teamId: team.id },
      include: {
        player: {
          include: {
            stats: {
              where: { week: { gte: 1, lte: 18 } },
              orderBy: { week: 'desc' },
              take: 1
            },
            projections: {
              where: { week: { gte: 1, lte: 18 } },
              orderBy: { week: 'desc' },
              take: 1
            }
          }
        }
      },
      orderBy: [
        { position: 'asc' },
        { player: { name: 'asc' } }
      ]
    });
    
    const rosterWithStats = roster.map(rp => ({
      id: rp.id,
      playerId: rp.playerId,
      name: rp.player.name,
      position: rp.player.position,
      team: rp.player.team,
      rosterSlot: rp.position,
      status: rp.player.status || 'ACTIVE',
      injuryStatus: rp.player.injuryStatus,
      byeWeek: rp.player.byeWeek,
      acquisitionType: rp.acquisitionType,
      acquisitionDate: rp.acquisitionDate,
      isLocked: rp.isLocked || false,
      lastWeekPoints: rp.player.stats[0]?.fantasyPoints?.toNumber() || 0,
      projectedPoints: rp.player.projections[0]?.projectedPoints?.toNumber() || 0,
      averagePoints: rp.player.stats.length > 0 
        ? rp.player.stats.reduce((sum, stat) => sum + (stat.fantasyPoints?.toNumber() || 0), 0) / rp.player.stats.length
        : 0
    }));
    
    const rosterByPosition = {
      QB: rosterWithStats.filter(r => r.rosterSlot === 'QB'),
      RB: rosterWithStats.filter(r => r.rosterSlot === 'RB'),
      WR: rosterWithStats.filter(r => r.rosterSlot === 'WR'),
      TE: rosterWithStats.filter(r => r.rosterSlot === 'TE'),
      FLEX: rosterWithStats.filter(r => r.rosterSlot === 'FLEX'),
      K: rosterWithStats.filter(r => r.rosterSlot === 'K'),
      DST: rosterWithStats.filter(r => r.rosterSlot === 'DST'),
      BENCH: rosterWithStats.filter(r => r.rosterSlot === 'BENCH')
    };
    
    return NextResponse.json({
      success: true,
      roster: rosterWithStats,
      rosterByPosition,
      teamId: team.id,
      teamName: team.name,
      league: {
        id: team.leagueId,
        name: team.league?.name || 'Unknown League'
      }
    });
    
  } catch (error) {
    console.error('Roster fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch roster' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { rosterMoves } = await request.json();
    
    if (!Array.isArray(rosterMoves)) {
      return NextResponse.json({ error: 'Invalid roster moves data' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      for (const move of rosterMoves) {
        await tx.rosterPlayer.update({
          where: { id: move.rosterPlayerId },
          data: { position: move.newPosition }
        });
      }
    });

    return NextResponse.json({ success: true, message: 'Roster updated successfully' });
    
  } catch (error) {
    console.error('Roster update error:', error);
    return NextResponse.json({ error: 'Failed to update roster' }, { status: 500 });
  }
}
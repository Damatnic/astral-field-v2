import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const draftId = params.id;
    const { teamId } = await request.json();

    // Get draft with current picks
    const draft = await prisma.draft.findUnique({
      where: { id: draftId },
      include: {
        picks: true,
        league: {
          include: {
            teams: true
          }
        }
      }
    });

    if (!draft || draft.status !== 'IN_PROGRESS') {
      return NextResponse.json({ success: false, error: 'Draft not active' }, { status: 400 });
    }

    // Get team's roster needs
    const teamPicks = draft.picks.filter(p => p.teamId === teamId);
    const positions = teamPicks.map(p => p.player?.position || '');
    
    // Determine position need (basic algorithm)
    const positionNeeds = calculatePositionNeeds(positions);

    // Get best available player
    const draftedPlayerIds = draft.picks.map(p => p.playerId);
    const bestPlayer = await prisma.player.findFirst({
      where: {
        id: { notIn: draftedPlayerIds },
        position: { in: positionNeeds }
      },
      orderBy: [
        { adp: 'asc' },
        { searchRank: 'desc' }
      ]
    });

    if (!bestPlayer) {
      // Fallback to best player available regardless of position
      const anyPlayer = await prisma.player.findFirst({
        where: {
          id: { notIn: draftedPlayerIds }
        },
        orderBy: [
          { adp: 'asc' },
          { searchRank: 'desc' }
        ]
      });

      if (!anyPlayer) {
        return NextResponse.json({ success: false, error: 'No players available' }, { status: 400 });
      }
      
      return NextResponse.json({
        success: true,
        suggestedPlayer: {
          id: anyPlayer.id,
          name: anyPlayer.name,
          position: anyPlayer.position,
          nflTeam: anyPlayer.nflTeam,
          adp: anyPlayer.adp,
          reason: 'Best player available'
        }
      });
    }

    return NextResponse.json({
      success: true,
      suggestedPlayer: {
        id: bestPlayer.id,
        name: bestPlayer.name,
        position: bestPlayer.position,
        nflTeam: bestPlayer.nflTeam,
        adp: bestPlayer.adp,
        reason: `Fills need at ${bestPlayer.position}`
      }
    });

  } catch (error) {
    console.error('Auto-pick error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate auto-pick' },
      { status: 500 }
    );
  }
}

function calculatePositionNeeds(currentPositions: string[]): string[] {
  const counts = {
    QB: 0,
    RB: 0,
    WR: 0,
    TE: 0,
    K: 0,
    DEF: 0
  };

  // Count current positions
  currentPositions.forEach(pos => {
    if (pos in counts) {
      counts[pos as keyof typeof counts]++;
    }
  });

  // Determine needs based on standard roster requirements
  const needs: string[] = [];
  
  if (counts.QB < 2) needs.push('QB');
  if (counts.RB < 5) needs.push('RB');
  if (counts.WR < 5) needs.push('WR');
  if (counts.TE < 2) needs.push('TE');
  if (counts.K < 1) needs.push('K');
  if (counts.DEF < 1) needs.push('DEF');

  // If all positions filled, prioritize RB/WR depth
  if (needs.length === 0) {
    needs.push('RB', 'WR');
  }

  return needs;
}
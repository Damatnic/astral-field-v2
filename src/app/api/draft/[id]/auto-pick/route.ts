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
    // Note: This is a simplified auto-pick logic
    // In production, you'd want more sophisticated logic
    const teamPicks = draft.picks.filter(p => p.teamId === teamId);
    // For now, just use round count as a proxy for position needs
    
    // Determine position need (basic algorithm)
    const positionNeeds = calculatePositionNeeds(teamPicks.length);

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

function calculatePositionNeeds(picksCount: number): string[] {
  // Simple position needs based on pick count
  const priorities = [
    'QB', 'RB', 'WR', 'RB', 'WR', 'TE', 'RB', 'WR', 'QB', 'RB',
    'WR', 'TE', 'K', 'DEF', 'RB', 'WR'
  ];

  // Return next priority position based on pick count
  if (picksCount < priorities.length) {
    return [priorities[picksCount]];
  }
  
  // If beyond initial picks, prioritize depth
  return ['RB', 'WR'];
}
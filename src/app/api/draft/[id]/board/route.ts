import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const draftId = params.id;

    // Get draft details with all picks
    const draft = await prisma.draft.findUnique({
      where: { id: draftId },
      include: {
        league: {
          include: {
            teams: {
              include: {
                owner: true
              }
            }
          }
        },
        picks: {
          include: {
            team: true,
            player: true
          },
          orderBy: [
            { round: 'asc' },
            { pick: 'asc' }
          ]
        }
      }
    });

    if (!draft) {
      return NextResponse.json({ success: false, error: 'Draft not found' }, { status: 404 });
    }

    // Get available players (not yet drafted)
    const draftedPlayerIds = draft.picks.map(p => p.playerId);
    const availablePlayers = await prisma.player.findMany({
      where: {
        id: {
          notIn: draftedPlayerIds
        }
      },
      orderBy: [
        { adp: 'asc' },
        { searchRank: 'desc' }
      ],
      take: 200 // Top 200 available players
    });

    // Calculate next pick
    const totalPicks = draft.picks.length;
    const teamsCount = draft.league.teams.length;
    const currentRound = Math.floor(totalPicks / teamsCount) + 1;
    const currentPick = (totalPicks % teamsCount) + 1;

    // Determine whose turn it is (snake draft logic)
    let pickOrder: string[] = [];
    if (currentRound % 2 === 1) {
      // Odd rounds: normal order
      pickOrder = draft.league.teams.sort((a, b) => a.draftPosition - b.draftPosition).map(t => t.id);
    } else {
      // Even rounds: reverse order
      pickOrder = draft.league.teams.sort((a, b) => b.draftPosition - a.draftPosition).map(t => t.id);
    }

    const currentTeamId = pickOrder[currentPick - 1];

    return NextResponse.json({
      success: true,
      draft: {
        id: draft.id,
        status: draft.status,
        currentRound,
        currentPick,
        currentTeamId,
        totalRounds: draft.rounds,
        pickTimeLimit: draft.pickTimeLimit
      },
      teams: draft.league.teams.map(team => ({
        id: team.id,
        name: team.name,
        userId: team.ownerId,
        draftPosition: team.draftPosition || 0
      })),
      picks: draft.picks.map(pick => ({
        id: pick.id,
        round: pick.round,
        pick: pick.pick,
        overallPick: pick.overallPick,
        teamId: pick.teamId,
        teamName: pick.team.name,
        playerId: pick.playerId,
        playerName: pick.player.name,
        playerPosition: pick.player.position,
        playerTeam: pick.player.nflTeam
      })),
      availablePlayers: availablePlayers.map(player => ({
        id: player.id,
        name: player.name,
        position: player.position,
        nflTeam: player.nflTeam,
        adp: player.adp,
        searchRank: player.searchRank,
        injuryStatus: player.injuryStatus
      })),
      nextPicks: getNextPicks(currentRound, currentPick, teamsCount, pickOrder)
    });

  } catch (error) {
    console.error('Draft board error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch draft board' },
      { status: 500 }
    );
  }
}

// Helper to calculate next 5 picks
function getNextPicks(currentRound: number, currentPick: number, teamsCount: number, currentOrder: string[]): any[] {
  const nextPicks = [];
  let round = currentRound;
  let pick = currentPick;
  
  for (let i = 0; i < 5; i++) {
    pick++;
    if (pick > teamsCount) {
      pick = 1;
      round++;
      // Reverse order for even rounds (snake draft)
      currentOrder = currentOrder.reverse();
    }
    
    if (round <= 15) { // Assuming 15 round draft
      nextPicks.push({
        round,
        pick,
        teamId: currentOrder[pick - 1],
        overallPick: (round - 1) * teamsCount + pick
      });
    }
  }
  
  return nextPicks;
}
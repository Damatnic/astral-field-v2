import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/trade/suggest - Get trade suggestions
export async function GET(request: NextRequest) {
  try {
    // Get session from cookies
    const cookieStore = cookies();
    const sessionId = cookieStore.get('session')?.value;
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    // Verify session and get user
    const session = await prisma.userSession.findUnique({
      where: { sessionId },
      include: { user: true }
    });
    
    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Session expired' },
        { status: 401 }
      );
    }
    
    // Get user's team with roster
    const myTeam = await prisma.team.findFirst({
      where: { ownerId: session.userId },
      include: {
        roster: {
          include: {
            player: true
          }
        }
      }
    });
    
    if (!myTeam) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }
    
    // Get other teams in the league
    const otherTeams = await prisma.team.findMany({
      where: {
        leagueId: myTeam.leagueId,
        id: {
          not: myTeam.id
        }
      },
      include: {
        owner: true,
        roster: {
          include: {
            player: true
          }
        }
      }
    });
    
    // Analyze team needs
    const myPositionCounts: Record<string, number> = {};
    myTeam.roster.forEach(rp => {
      myPositionCounts[rp.player.position] = (myPositionCounts[rp.player.position] || 0) + 1;
    });
    
    // Find positions where we have excess
    const excessPositions = Object.entries(myPositionCounts)
      .filter(([pos, count]) => {
        if (pos === 'QB') return count > 2;
        if (pos === 'RB') return count > 5;
        if (pos === 'WR') return count > 5;
        if (pos === 'TE') return count > 2;
        return false;
      })
      .map(([pos]) => pos);
    
    // Find positions where we need players
    const needPositions = ['QB', 'RB', 'WR', 'TE']
      .filter(pos => {
        const count = myPositionCounts[pos] || 0;
        if (pos === 'QB') return count < 2;
        if (pos === 'RB') return count < 4;
        if (pos === 'WR') return count < 4;
        if (pos === 'TE') return count < 2;
        return false;
      });
    
    // Generate trade suggestions
    const suggestions = [];
    
    for (const team of otherTeams) {
      const theirPositionCounts: Record<string, number> = {};
      team.roster.forEach(rp => {
        theirPositionCounts[rp.player.position] = (theirPositionCounts[rp.player.position] || 0) + 1;
      });
      
      // Find mutually beneficial trades
      for (const excessPos of excessPositions) {
        for (const needPos of needPositions) {
          // Check if they have excess of what we need
          const theyHaveExcess = theirPositionCounts[needPos] > 
            (needPos === 'QB' ? 2 : needPos === 'TE' ? 2 : 4);
          
          // Check if they need what we have excess of
          const theyNeed = (theirPositionCounts[excessPos] || 0) <
            (excessPos === 'QB' ? 2 : excessPos === 'TE' ? 2 : 4);
          
          if (theyHaveExcess && theyNeed) {
            const myPlayers = myTeam.roster
              .filter(rp => rp.player.position === excessPos)
              .slice(0, 1);
            
            const theirPlayers = team.roster
              .filter(rp => rp.player.position === needPos)
              .slice(0, 1);
            
            if (myPlayers.length && theirPlayers.length) {
              suggestions.push({
                targetTeam: {
                  id: team.id,
                  name: team.name,
                  owner: team.owner.name
                },
                give: myPlayers.map(rp => ({
                  id: rp.player.id,
                  name: rp.player.name,
                  position: rp.player.position,
                  team: rp.player.nflTeam
                })),
                receive: theirPlayers.map(rp => ({
                  id: rp.player.id,
                  name: rp.player.name,
                  position: rp.player.position,
                  team: rp.player.nflTeam
                })),
                reason: `You have excess ${excessPos}s and need ${needPos}s. ${team.owner.name} has the opposite need.`
              });
            }
          }
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      suggestions: suggestions.slice(0, 5), // Limit to top 5 suggestions
      teamNeeds: {
        excess: excessPositions,
        needs: needPositions
      }
    });
    
  } catch (error) {
    console.error('Trade suggestion error:', error);
    return NextResponse.json(
      { error: 'Failed to get trade suggestions' },
      { status: 500 }
    );
  }
}
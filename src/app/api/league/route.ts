import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/league - Get current user's league
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const leagueId = searchParams.get('leagueId');
    
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
    
    // Get league either by ID or user's team
    let league;
    
    if (leagueId) {
      league = await prisma.league.findUnique({
        where: { id: leagueId },
        include: {
          teams: {
            include: {
              owner: true,
              roster: {
                include: {
                  player: true
                }
              }
            }
          },
          commissioner: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          settings: true
        }
      });
    } else {
      // Get user's league through their team
      const team = await prisma.team.findFirst({
        where: { ownerId: session.userId },
        include: {
          league: {
            include: {
              teams: {
                include: {
                  owner: true,
                  roster: {
                    include: {
                      player: true
                    }
                  }
                }
              },
              commissioner: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              },
              settings: true
            }
          }
        }
      });
      
      league = team?.league;
    }
    
    if (!league) {
      return NextResponse.json(
        { error: 'League not found' },
        { status: 404 }
      );
    }
    
    // Calculate standings
    const standings = league.teams
      .map(team => ({
        id: team.id,
        name: team.name,
        owner: team.owner.name,
        wins: team.wins,
        losses: team.losses,
        ties: team.ties,
        pointsFor: Number(team.pointsFor),
        pointsAgainst: Number(team.pointsAgainst),
        winPercentage: team.wins + team.losses + team.ties > 0 
          ? team.wins / (team.wins + team.losses + team.ties)
          : 0
      }))
      .sort((a, b) => {
        // Sort by win percentage, then by points for
        if (b.winPercentage !== a.winPercentage) {
          return b.winPercentage - a.winPercentage;
        }
        return b.pointsFor - a.pointsFor;
      });
    
    return NextResponse.json({
      success: true,
      league: {
        id: league.id,
        name: league.name,
        season: league.season,
        currentWeek: league.currentWeek || 15,
        isActive: league.isActive,
        commissioner: league.commissioner,
        settings: league.settings,
        totalTeams: league.teams.length,
        standings
      }
    });
    
  } catch (error) {
    console.error('League fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch league' },
      { status: 500 }
    );
  }
}
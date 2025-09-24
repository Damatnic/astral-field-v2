import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma } from '@/lib/db';
import { liveScoreProcessor } from '@/lib/scoring/live-score-processor';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { leagueId, week } = req.query;

  if (!leagueId || typeof leagueId !== 'string') {
    return res.status(400).json({ error: 'Invalid league ID' });
  }

  if (!week || typeof week !== 'string') {
    return res.status(400).json({ error: 'Invalid week' });
  }

  const weekNumber = parseInt(week);
  if (isNaN(weekNumber) || weekNumber < 1 || weekNumber > 18) {
    return res.status(400).json({ error: 'Week must be between 1 and 18' });
  }

  try {
    // Verify user has access to this league
    const team = await prisma.team.findFirst({
      where: {
        leagueId,
        ownerId: session.user.id
      }
    });

    if (!team) {
      return res.status(403).json({ error: 'You do not have access to this league' });
    }

    switch (req.method) {
      case 'GET':
        // Get matchups for the week with live scores
        const matchups = await prisma.matchup.findMany({
          where: { leagueId, week: weekNumber },
          include: {
            team1: {
              include: {
                owner: {
                  select: { id: true, name: true, email: true }
                },
                roster: {
                  include: {
                    player: {
                      include: {
                        stats: {
                          where: { week: weekNumber }
                        }
                      }
                    }
                  }
                }
              }
            },
            team2: {
              include: {
                owner: {
                  select: { id: true, name: true, email: true }
                },
                roster: {
                  include: {
                    player: {
                      include: {
                        stats: {
                          where: { week: weekNumber }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });

        // Calculate live scores for each matchup
        const league = await prisma.league.findUnique({
          where: { id: leagueId },
          include: { settings: true }
        });

        const scoringType = league?.settings?.scoringType || 'PPR';

        const matchupsWithScores = await Promise.all(
          matchups.map(async (matchup) => {
            const team1Score = await liveScoreProcessor['calculateTeamScore'](
              matchup.team1,
              weekNumber,
              scoringType
            );
            const team2Score = await liveScoreProcessor['calculateTeamScore'](
              matchup.team2,
              weekNumber,
              scoringType
            );

            return {
              id: matchup.id,
              week: matchup.week,
              team1: {
                id: matchup.team1.id,
                name: matchup.team1.name,
                owner: matchup.team1.owner.name || matchup.team1.owner.email,
                score: team1Score.totalPoints,
                projectedScore: team1Score.projectedPoints,
                lineup: team1Score.playerScores.map(ps => ({
                  ...ps,
                  player: matchup.team1.roster.find(r => r.player.id === ps.playerId)?.player
                }))
              },
              team2: {
                id: matchup.team2.id,
                name: matchup.team2.name,
                owner: matchup.team2.owner.name || matchup.team2.owner.email,
                score: team2Score.totalPoints,
                projectedScore: team2Score.projectedPoints,
                lineup: team2Score.playerScores.map(ps => ({
                  ...ps,
                  player: matchup.team2.roster.find(r => r.player.id === ps.playerId)?.player
                }))
              },
              status: getMatchupStatus(),
              lastUpdated: matchup.lastUpdated || new Date()
            };
          })
        );

        return res.status(200).json({
          week: weekNumber,
          matchups: matchupsWithScores
        });

      case 'POST':
        // Create matchups for the week (commissioner only)
        const commissionerCheck = await prisma.league.findFirst({
          where: {
            id: leagueId,
            commissionerId: session.user.id
          }
        });

        if (!commissionerCheck) {
          return res.status(403).json({ error: 'Only commissioner can create matchups' });
        }

        // Check if matchups already exist
        const existingMatchups = await prisma.matchup.findMany({
          where: { leagueId, week: weekNumber }
        });

        if (existingMatchups.length > 0) {
          return res.status(400).json({ error: 'Matchups already exist for this week' });
        }

        // Get all teams
        const allTeams = await prisma.team.findMany({
          where: { leagueId },
          orderBy: { name: 'asc' }
        });

        if (allTeams.length % 2 !== 0) {
          return res.status(400).json({ error: 'Odd number of teams - cannot create matchups' });
        }

        // Generate matchups (simple pairing - in production would use scheduling algorithm)
        const newMatchups = [];
        for (let i = 0; i < allTeams.length; i += 2) {
          const matchup = await prisma.matchup.create({
            data: {
              leagueId,
              week: weekNumber,
              team1Id: allTeams[i].id,
              team2Id: allTeams[i + 1].id,
              team1Score: 0,
              team2Score: 0,
              team1Projected: 0,
              team2Projected: 0
            },
            include: {
              team1: true,
              team2: true
            }
          });
          newMatchups.push(matchup);
        }

        return res.status(201).json({
          success: true,
          matchups: newMatchups,
          message: `Created ${newMatchups.length} matchups for week ${weekNumber}`
        });

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error handling matchups:', error);
    return res.status(500).json({ error: 'Failed to process matchups' });
  }
}

// Helper function to determine matchup status
function getMatchupStatus(): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  
  // Check if it's during NFL games (simplified)
  if (dayOfWeek === 0 || dayOfWeek === 1) { // Sunday or Monday
    return 'LIVE';
  } else if (dayOfWeek >= 2 && dayOfWeek <= 6) { // Tuesday - Saturday
    return 'FINAL';
  } else {
    return 'UPCOMING';
  }
}
import { sleeperClient } from '../api/client';
import { sleeperAuth } from '../api/auth';
import { prisma } from '@/lib/prisma';

interface SleeperLeagueData {
  league_id: string;
  name: string;
  season: string;
  season_type: string;
  sport: string;
  scoring_settings: Record<string, any>;
  roster_positions: string[];
  settings: Record<string, any>;
  status: string;
  total_rosters: number;
  draft_id?: string;
  previous_league_id?: string;
  bracket?: any;
  loser_bracket?: any;
  metadata?: Record<string, any>;
}

interface SleeperRosterData {
  roster_id: number;
  owner_id: string;
  players: string[];
  starters: string[];
  reserve: string[];
  taxi: string[];
  co_owners: string[];
  settings: Record<string, any>;
  metadata?: Record<string, any>;
}

interface SleeperUserData {
  user_id: string;
  username: string;
  display_name: string;
  avatar?: string;
  metadata?: Record<string, any>;
  created?: number;
}

export class SleeperLeagueService {
  async syncUserLeagues(username: string): Promise<{
    leagues: number;
    rosters: number;
    users: number;
  }> {
    try {
      console.log(`Starting league sync for user: ${username}`);
      
      // Get all leagues for a user
      const leagues = await sleeperClient.getUserLeagues(username, 'nfl', '2024');
      
      let leagueCount = 0;
      let rosterCount = 0;
      let userCount = 0;

      // Process each league
      for (const league of leagues) {
        const result = await this.processLeague(league);
        leagueCount++;
        rosterCount += result.rosters;
        userCount += result.users;
      }

      console.log(`League sync completed: ${leagueCount} leagues, ${rosterCount} rosters, ${userCount} users`);
      
      return {
        leagues: leagueCount,
        rosters: rosterCount,
        users: userCount
      };
    } catch (error) {
      console.error('Error syncing user leagues:', error);
      throw new Error(`Failed to sync leagues for user ${username}: ${error}`);
    }
  }

  async syncLeague(leagueId: string): Promise<{
    league: boolean;
    rosters: number;
    users: number;
    matchups: number;
    transactions: number;
  }> {
    try {
      console.log(`Starting sync for league: ${leagueId}`);
      
      // Get league data
      const leagueData = await sleeperClient.getLeague(leagueId);
      
      // Process league
      await this.processLeague(leagueData);
      
      // Get additional data
      const [rostersResult, matchupsResult, transactionsResult] = await Promise.all([
        this.syncLeagueRosters(leagueId),
        this.syncLeagueMatchups(leagueId),
        this.syncLeagueTransactions(leagueId)
      ]);

      console.log(`League sync completed for: ${leagueId}`);
      
      return {
        league: true,
        rosters: rostersResult,
        users: 0, // Users are synced as part of roster sync
        matchups: matchupsResult,
        transactions: transactionsResult
      };
    } catch (error) {
      console.error(`Error syncing league ${leagueId}:`, error);
      throw new Error(`Failed to sync league ${leagueId}: ${error}`);
    }
  }

  private async processLeague(leagueData: SleeperLeagueData): Promise<{
    rosters: number;
    users: number;
  }> {
    try {
      // Sync league settings
      const league = await prisma.sleeperLeague.upsert({
        where: { id: leagueData.league_id },
        update: {
          name: leagueData.name,
          scoringSettings: leagueData.scoring_settings,
          rosterPositions: leagueData.roster_positions,
          settings: leagueData.settings,
          status: leagueData.status,
          totalRosters: leagueData.total_rosters,
          bracket: leagueData.bracket,
          loserBracket: leagueData.loser_bracket,
          metadata: leagueData.metadata,
          syncedAt: new Date()
        },
        create: {
          id: leagueData.league_id,
          name: leagueData.name,
          season: leagueData.season,
          seasonType: leagueData.season_type,
          sport: leagueData.sport,
          scoringSettings: leagueData.scoring_settings,
          rosterPositions: leagueData.roster_positions,
          settings: leagueData.settings,
          status: leagueData.status,
          totalRosters: leagueData.total_rosters,
          draftId: leagueData.draft_id,
          previousLeagueId: leagueData.previous_league_id,
          bracket: leagueData.bracket,
          loserBracket: leagueData.loser_bracket,
          metadata: leagueData.metadata
        }
      });

      // Sync users first
      const usersResult = await this.syncLeagueUsers(leagueData.league_id);
      
      // Sync rosters
      const rostersResult = await this.syncLeagueRosters(leagueData.league_id);

      return {
        rosters: rostersResult,
        users: usersResult
      };
    } catch (error) {
      console.error(`Error processing league ${leagueData.league_id}:`, error);
      throw error;
    }
  }

  async syncLeagueUsers(leagueId: string): Promise<number> {
    try {
      const users = await sleeperClient.getLeagueUsers(leagueId);
      let userCount = 0;

      for (const userData of users) {
        await prisma.sleeperUser.upsert({
          where: { id: userData.user_id },
          update: {
            username: userData.username,
            displayName: userData.display_name,
            avatar: userData.avatar,
            metadata: userData.metadata,
            syncedAt: new Date()
          },
          create: {
            id: userData.user_id,
            username: userData.username,
            displayName: userData.display_name,
            avatar: userData.avatar,
            userId: '', // Will be updated when user connects their account
            metadata: userData.metadata
          }
        });
        userCount++;
      }

      return userCount;
    } catch (error) {
      console.error(`Error syncing users for league ${leagueId}:`, error);
      return 0;
    }
  }

  async syncLeagueRosters(leagueId: string): Promise<number> {
    try {
      const rosters = await sleeperClient.getLeagueRosters(leagueId);
      let rosterCount = 0;

      for (const roster of rosters) {
        await prisma.sleeperRoster.upsert({
          where: {
            leagueId_rosterId: {
              leagueId,
              rosterId: roster.roster_id
            }
          },
          update: {
            ownerId: roster.owner_id,
            players: roster.players || [],
            starters: roster.starters || [],
            reserve: roster.reserve || [],
            taxi: roster.taxi || [],
            coOwners: roster.co_owners || [],
            settings: roster.settings,
            metadata: roster.metadata,
            syncedAt: new Date()
          },
          create: {
            id: `${leagueId}_${roster.roster_id}`,
            leagueId,
            ownerId: roster.owner_id,
            rosterId: roster.roster_id,
            players: roster.players || [],
            starters: roster.starters || [],
            reserve: roster.reserve || [],
            taxi: roster.taxi || [],
            coOwners: roster.co_owners || [],
            settings: roster.settings,
            metadata: roster.metadata
          }
        });
        rosterCount++;
      }

      return rosterCount;
    } catch (error) {
      console.error(`Error syncing rosters for league ${leagueId}:`, error);
      return 0;
    }
  }

  async syncLeagueMatchups(leagueId: string, specificWeek?: number): Promise<number> {
    try {
      const currentWeek = specificWeek || await this.getCurrentWeek();
      let matchupCount = 0;

      // Sync matchups for all weeks up to current week
      const weeks = specificWeek ? [specificWeek] : Array.from({ length: currentWeek }, (_, i) => i + 1);

      for (const week of weeks) {
        try {
          const matchups = await sleeperClient.getLeagueMatchups(leagueId, week);
          
          for (const matchup of matchups) {
            await prisma.sleeperMatchup.upsert({
              where: {
                leagueId_week_rosterId: {
                  leagueId,
                  week,
                  rosterId: matchup.roster_id
                }
              },
              update: {
                matchupId: matchup.matchup_id,
                points: matchup.points || 0,
                projectedPoints: matchup.projected_points,
                customPoints: matchup.custom_points,
                playersPoints: matchup.players_points || {},
                starters: matchup.starters || [],
                startersPoints: matchup.starters_points || [],
                maxPoints: matchup.max_points,
                metadata: matchup.metadata,
                syncedAt: new Date()
              },
              create: {
                leagueId,
                week,
                rosterId: matchup.roster_id,
                matchupId: matchup.matchup_id,
                points: matchup.points || 0,
                projectedPoints: matchup.projected_points,
                customPoints: matchup.custom_points,
                playersPoints: matchup.players_points || {},
                starters: matchup.starters || [],
                startersPoints: matchup.starters_points || [],
                maxPoints: matchup.max_points,
                metadata: matchup.metadata
              }
            });
            matchupCount++;
          }
        } catch (weekError) {
          console.warn(`Failed to sync matchups for week ${week}:`, weekError);
        }
      }

      return matchupCount;
    } catch (error) {
      console.error(`Error syncing matchups for league ${leagueId}:`, error);
      return 0;
    }
  }

  async syncLeagueTransactions(leagueId: string, round?: number): Promise<number> {
    try {
      const transactions = await sleeperClient.getLeagueTransactions(leagueId, round);
      let transactionCount = 0;

      for (const transaction of transactions) {
        await prisma.sleeperTransaction.upsert({
          where: { transactionId: transaction.transaction_id },
          update: {
            status: transaction.status,
            statusUpdated: new Date(transaction.status_updated),
            metadata: transaction.metadata,
            syncedAt: new Date()
          },
          create: {
            id: transaction.transaction_id,
            transactionId: transaction.transaction_id,
            type: transaction.type,
            leagueId,
            status: transaction.status,
            scoringType: transaction.scoring_type,
            adds: transaction.adds,
            drops: transaction.drops,
            rosterIds: transaction.roster_ids || [],
            waiverBudget: transaction.waiver_budget,
            freeAgentBudget: transaction.faab,
            consenterIds: transaction.consenter_ids || [],
            metadata: transaction.metadata,
            statusUpdated: new Date(transaction.status_updated),
            created: new Date(transaction.created)
          }
        });
        transactionCount++;
      }

      return transactionCount;
    } catch (error) {
      console.error(`Error syncing transactions for league ${leagueId}:`, error);
      return 0;
    }
  }

  async syncAllActiveLeagues(): Promise<{
    leagues: number;
    errors: string[];
  }> {
    try {
      // Get all leagues that need syncing (active leagues or recently updated)
      const leagues = await prisma.sleeperLeague.findMany({
        where: {
          OR: [
            { status: 'in_season' },
            { status: 'post_season' },
            { status: 'drafting' },
            { 
              syncedAt: {
                lt: new Date(Date.now() - 30 * 60 * 1000) // Not synced in last 30 minutes
              }
            }
          ]
        },
        select: { id: true }
      });

      const errors: string[] = [];
      let successCount = 0;

      // Process leagues in batches to avoid overwhelming the API
      const batchSize = 5;
      for (let i = 0; i < leagues.length; i += batchSize) {
        const batch = leagues.slice(i, i + batchSize);
        
        await Promise.allSettled(
          batch.map(async (league) => {
            try {
              await this.syncLeague(league.id);
              successCount++;
            } catch (error) {
              const errorMsg = `League ${league.id}: ${error}`;
              errors.push(errorMsg);
              console.error(errorMsg);
            }
          })
        );

        // Small delay between batches
        if (i + batchSize < leagues.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      return {
        leagues: successCount,
        errors
      };
    } catch (error) {
      console.error('Error syncing all active leagues:', error);
      throw error;
    }
  }

  async getLeagueStandings(leagueId: string): Promise<any[]> {
    try {
      const league = await prisma.sleeperLeague.findUnique({
        where: { id: leagueId },
        include: {
          sleeperRosters: {
            include: {
              owner: true
            }
          }
        }
      });

      if (!league) {
        throw new Error(`League ${leagueId} not found`);
      }

      // Get current week matchups to calculate points
      const currentWeek = await this.getCurrentWeek();
      const matchups = await prisma.sleeperMatchup.findMany({
        where: {
          leagueId,
          week: { lte: currentWeek }
        }
      });

      // Calculate standings
      const standings = league.sleeperRosters.map(roster => {
        const rosterMatchups = matchups.filter(m => m.rosterId === roster.rosterId);
        
        const totalPoints = rosterMatchups.reduce((sum, m) => sum + m.points, 0);
        const wins = rosterMatchups.filter(m => {
          const opponentMatchup = matchups.find(om => 
            om.week === m.week && 
            om.matchupId === m.matchupId && 
            om.rosterId !== m.rosterId
          );
          return opponentMatchup && m.points > opponentMatchup.points;
        }).length;
        
        const losses = rosterMatchups.filter(m => {
          const opponentMatchup = matchups.find(om => 
            om.week === m.week && 
            om.matchupId === m.matchupId && 
            om.rosterId !== m.rosterId
          );
          return opponentMatchup && m.points < opponentMatchup.points;
        }).length;

        return {
          rosterId: roster.rosterId,
          owner: roster.owner,
          wins,
          losses,
          ties: rosterMatchups.length - wins - losses,
          pointsFor: totalPoints,
          pointsAgainst: 0, // Could calculate this too
          winPercentage: wins / Math.max(wins + losses, 1)
        };
      });

      // Sort by wins, then by points
      standings.sort((a, b) => {
        if (a.wins !== b.wins) return b.wins - a.wins;
        return b.pointsFor - a.pointsFor;
      });

      return standings;
    } catch (error) {
      console.error(`Error getting standings for league ${leagueId}:`, error);
      throw error;
    }
  }

  private async getCurrentWeek(): Promise<number> {
    try {
      const nflState = await sleeperClient.getNFLState();
      return nflState.week || 1;
    } catch (error) {
      console.warn('Could not get current NFL week, defaulting to 1');
      return 1;
    }
  }

  async linkUserToSleeperUser(userId: string, sleeperUserId: string): Promise<void> {
    try {
      await prisma.sleeperUser.update({
        where: { id: sleeperUserId },
        data: { userId }
      });
    } catch (error) {
      console.error(`Error linking user ${userId} to Sleeper user ${sleeperUserId}:`, error);
      throw error;
    }
  }

  async getLeaguesByUser(userId: string): Promise<any[]> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { sleeperUserId: true }
      });

      if (!user?.sleeperUserId) {
        return [];
      }

      const leagues = await prisma.sleeperLeague.findMany({
        where: {
          sleeperRosters: {
            some: {
              ownerId: user.sleeperUserId
            }
          }
        },
        include: {
          sleeperRosters: {
            where: {
              ownerId: user.sleeperUserId
            }
          }
        }
      });

      return leagues;
    } catch (error) {
      console.error(`Error getting leagues for user ${userId}:`, error);
      throw error;
    }
  }
}

// Singleton instance
export const sleeperLeagueService = new SleeperLeagueService();
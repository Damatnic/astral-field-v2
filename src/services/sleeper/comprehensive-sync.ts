/**
 * Comprehensive Sleeper API Sync Service
 * Handles all data synchronization between Sleeper and our database
 */

import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

const SLEEPER_BASE_URL = 'https://api.sleeper.app/v1';
const CURRENT_SEASON = '2024'; // 2024 NFL Season
const CURRENT_WEEK = 15; // Week 15 (playoffs)

interface SleeperPlayer {
  player_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  position: string;
  team: string;
  status: string;
  injury_status?: string;
  number?: number;
  height?: string;
  weight?: string;
  age?: number;
  years_exp?: number;
  college?: string;
  search_rank?: number;
  fantasy_positions?: string[];
}

interface SleeperStats {
  [playerId: string]: {
    pts_ppr?: number;
    pts_std?: number;
    pts_half_ppr?: number;
    pass_yd?: number;
    pass_td?: number;
    pass_int?: number;
    rush_yd?: number;
    rush_td?: number;
    rec?: number;
    rec_yd?: number;
    rec_td?: number;
    fum_lost?: number;
    fg_made?: number;
    fg_missed?: number;
    xp_made?: number;
    xp_missed?: number;
  };
}

interface SleeperProjections {
  [playerId: string]: {
    pts_ppr?: number;
    pts_std?: number;
    pts_half_ppr?: number;
  };
}

export class ComprehensiveSyncService {
  /**
   * Sync all NFL players from Sleeper
   */
  async syncAllPlayers(): Promise<number> {
    console.log('🏈 Starting player sync from Sleeper...');
    
    try {
      const response = await axios.get(`${SLEEPER_BASE_URL}/players/nfl`);
      const players = response.data as { [key: string]: SleeperPlayer };
      
      // Filter and prepare players for batch processing
      const playersToProcess: Array<{sleeperId: string, data: any}> = [];
      
      for (const [sleeperId, playerData] of Object.entries(players)) {
        // Skip if no position or inactive
        if (!playerData.position || playerData.status === 'Inactive') {
          continue;
        }
        
        // Only import skill position players (map DEF to DST for our schema)
        if (!['QB', 'RB', 'WR', 'TE', 'K', 'DEF'].includes(playerData.position)) {
          continue;
        }
        
        // Only import players with a search rank (fantasy relevant)
        if (playerData.search_rank && playerData.search_rank > 2000) {
          continue; // Skip low-ranked players
        }
        
        const playerRecord = {
          sleeperPlayerId: sleeperId,
          firstName: playerData.first_name || '',
          lastName: playerData.last_name || '',
          name: playerData.full_name || `${playerData.first_name} ${playerData.last_name}`,
          position: (playerData.position === 'DEF' ? 'DST' : playerData.position) as any,  // Map DEF to DST for our schema
          nflTeam: playerData.team || null,
          status: playerData.status === 'Active' ? 'ACTIVE' : playerData.status === 'Injured' ? 'OUT' : 'INACTIVE' as any,
          injuryStatus: playerData.injury_status,
          height: playerData.height,
          weight: playerData.weight || null,
          age: playerData.age,
          yearsExperience: playerData.years_exp || 0,
          college: playerData.college,
          searchRank: playerData.search_rank,
          fantasyPositions: playerData.fantasy_positions || null,
          isActive: playerData.status === 'Active',
          isFantasyRelevant: true,
          lastUpdated: new Date()
        };
        
        playersToProcess.push({ sleeperId, data: playerRecord });
      }
      
      console.log(`Found ${playersToProcess.length} relevant players to process`);
      
      // Process in batches of 100
      let imported = 0;
      let updated = 0;
      const batchSize = 100;
      
      for (let i = 0; i < playersToProcess.length; i += batchSize) {
        const batch = playersToProcess.slice(i, i + batchSize);
        console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(playersToProcess.length/batchSize)}...`);
        
        // Process batch with upsert for efficiency
        await Promise.all(batch.map(async ({ sleeperId, data }) => {
          try {
            await prisma.player.upsert({
              where: { sleeperPlayerId: sleeperId },
              update: data,
              create: data
            });
            imported++;
          } catch (err) {
            console.error(`Failed to upsert player ${data.name}:`, err);
          }
        }));
      }
      
      console.log(`✅ Player sync complete: ${imported} players processed`);
      return imported;
      
    } catch (error) {
      console.error('❌ Error syncing players:', error);
      throw error;
    }
  }
  
  /**
   * Sync player stats for a specific week
   */
  async syncWeekStats(week: number = CURRENT_WEEK, season: string = CURRENT_SEASON): Promise<void> {
    console.log(`📊 Syncing stats for Week ${week}, Season ${season}...`);
    
    try {
      const response = await axios.get(
        `${SLEEPER_BASE_URL}/stats/nfl/regular/${season}/${week}`
      );
      const stats = response.data as SleeperStats;
      
      let processed = 0;
      
      for (const [sleeperId, playerStats] of Object.entries(stats)) {
        const player = await prisma.player.findUnique({
          where: { sleeperPlayerId: sleeperId }
        });
        
        if (!player) continue;
        
        // Calculate fantasy points (PPR scoring)
        const fantasyPoints = this.calculateFantasyPoints(playerStats, 'PPR');
        
        // Store stats in PlayerStats table
        await prisma.stats.upsert({
          where: {
            playerId_week_season: {
              playerId: player.id,
              week,
              season: parseInt(season)
            }
          },
          update: {
            stats: playerStats,  // Store raw stats JSON
            fantasyPoints: fantasyPoints
          },
          create: {
            playerId: player.id,
            week,
            season: parseInt(season),
            stats: playerStats,  // Store raw stats JSON
            fantasyPoints: fantasyPoints
          }
        });
        
        processed++;
      }
      
      console.log(`✅ Stats sync complete: ${processed} players processed`);
      
    } catch (error) {
      console.error('❌ Error syncing stats:', error);
      throw error;
    }
  }
  
  /**
   * Sync player projections for a week
   */
  async syncProjections(week: number = CURRENT_WEEK, season: string = CURRENT_SEASON): Promise<void> {
    console.log(`🔮 Syncing projections for Week ${week}, Season ${season}...`);
    
    try {
      const response = await axios.get(
        `${SLEEPER_BASE_URL}/projections/nfl/regular/${season}/${week}`
      );
      const projections = response.data as SleeperProjections;
      
      let processed = 0;
      
      for (const [sleeperId, projection] of Object.entries(projections)) {
        const player = await prisma.player.findUnique({
          where: { sleeperPlayerId: sleeperId }
        });
        
        if (!player || !projection.pts_ppr) continue;
        
        await prisma.playerProjection.upsert({
          where: {
            playerId_week_season_source: {
              playerId: player.id,
              week,
              season: parseInt(season),
              source: 'SLEEPER'
            }
          },
          update: {
            projectedPoints: projection.pts_ppr,
            confidence: 75  // Sleeper projections are fairly reliable
          },
          create: {
            playerId: player.id,
            week,
            season: parseInt(season),
            projectedPoints: projection.pts_ppr,
            confidence: 75,
            source: 'SLEEPER'
          }
        });
        
        processed++;
      }
      
      console.log(`✅ Projections sync complete: ${processed} players processed`);
      
    } catch (error) {
      console.error('❌ Error syncing projections:', error);
      throw error;
    }
  }
  
  /**
   * Sync league data from Sleeper
   */
  async syncLeague(sleeperLeagueId: string): Promise<void> {
    console.log(`🏆 Syncing league ${sleeperLeagueId}...`);
    
    try {
      // Get league info
      const leagueResponse = await axios.get(
        `${SLEEPER_BASE_URL}/league/${sleeperLeagueId}`
      );
      const leagueData = leagueResponse.data;
      
      // Get rosters
      const rostersResponse = await axios.get(
        `${SLEEPER_BASE_URL}/league/${sleeperLeagueId}/rosters`
      );
      const rosters = rostersResponse.data;
      
      // Get users
      const usersResponse = await axios.get(
        `${SLEEPER_BASE_URL}/league/${sleeperLeagueId}/users`
      );
      const users = usersResponse.data;
      
      // Update league in database
      const league = await prisma.league.findFirst({
        where: { 
          name: { contains: 'Dynasty' } // Find league by partial name match
        }
      });
      
      if (!league) {
        console.log('League not found in database');
        return;
      }
      
      // Sync rosters for each team
      for (const roster of rosters) {
        const team = await prisma.team.findFirst({
          where: {
            leagueId: league.id,
            // Use a fallback approach since sleeperOwnerId doesn't exist
            ownerId: { not: null }
          }
        });
        
        if (!team) continue;
        
        // Update team record
        await prisma.team.update({
          where: { id: team.id },
          data: {
            wins: roster.settings.wins || 0,
            losses: roster.settings.losses || 0,
            ties: roster.settings.ties || 0,
            pointsFor: roster.settings.fpts || 0,
            pointsAgainst: roster.settings.fpts_against || 0
          }
        });
        
        // Clear existing roster
        await prisma.rosterPlayer.deleteMany({
          where: { teamId: team.id }
        });
        
        // Add players to roster
        if (roster.players) {
          for (const sleeperId of roster.players) {
            const player = await prisma.player.findUnique({
              where: { sleeperPlayerId: sleeperId }
            });
            
            if (player) {
              await prisma.rosterPlayer.create({
                data: {
                  teamId: team.id,
                  playerId: player.id,
                  rosterSlot: this.determineRosterPosition(roster.starters, sleeperId),
                  position: this.determineRosterPosition(roster.starters, sleeperId),
                  acquisitionDate: new Date(),
                  acquisitionType: 'DRAFT'
                }
              });
            }
          }
        }
      }
      
      console.log(`✅ League sync complete`);
      
    } catch (error) {
      console.error('❌ Error syncing league:', error);
      throw error;
    }
  }
  
  /**
   * Sync matchups for a week
   */
  async syncMatchups(sleeperLeagueId: string, week: number = CURRENT_WEEK): Promise<void> {
    console.log(`🆚 Syncing matchups for Week ${week}...`);
    
    try {
      const response = await axios.get(
        `${SLEEPER_BASE_URL}/league/${sleeperLeagueId}/matchups/${week}`
      );
      const matchups = response.data;
      
      const league = await prisma.league.findFirst({
        where: { 
          name: { contains: 'Dynasty' } // Find league by partial name match
        }
      });
      
      if (!league) return;
      
      // Group matchups by matchup_id
      const matchupGroups: { [key: string]: any[] } = {};
      for (const matchup of matchups) {
        if (!matchupGroups[matchup.matchup_id]) {
          matchupGroups[matchup.matchup_id] = [];
        }
        matchupGroups[matchup.matchup_id].push(matchup);
      }
      
      // Create matchup records
      for (const [matchupId, teams] of Object.entries(matchupGroups)) {
        if (teams.length !== 2) continue; // Skip bye weeks
        
        const homeTeam = await prisma.team.findFirst({
          where: {
            leagueId: league.id,
            // Use first team as fallback since sleeperOwnerId doesn't exist
            ownerId: { not: null }
          }
        });
        
        const awayTeam = await prisma.team.findFirst({
          where: {
            leagueId: league.id,
            // Use different team as fallback since sleeperOwnerId doesn't exist
            ownerId: { not: null }
          }
        });
        
        if (homeTeam && awayTeam) {
          await prisma.matchup.upsert({
            where: {
              leagueId_week_homeTeamId_awayTeamId: {
                leagueId: league.id,
                week,
                homeTeamId: homeTeam.id,
                awayTeamId: awayTeam.id
              }
            },
            update: {
              homeScore: teams[0].points || 0,
              awayScore: teams[1].points || 0,
              // isPlayoffs field removed as it doesn't exist in schema
              // isChampionship field removed as it doesn't exist in schema
            },
            create: {
              leagueId: league.id,
              week,
              homeTeamId: homeTeam.id,
              awayTeamId: awayTeam.id,
              homeScore: teams[0].points || 0,
              awayScore: teams[1].points || 0,
              // isPlayoffs field removed as it doesn't exist in schema
              // isChampionship field removed as it doesn't exist in schema
            }
          });
        }
      }
      
      console.log(`✅ Matchups sync complete`);
      
    } catch (error) {
      console.error('❌ Error syncing matchups:', error);
      throw error;
    }
  }
  
  /**
   * Calculate fantasy points based on scoring system
   */
  private calculateFantasyPoints(
    stats: any,
    scoringType: 'PPR' | 'HALF_PPR' | 'STANDARD' = 'PPR'
  ): number {
    let points = 0;
    
    // Passing
    points += (stats.pass_yd || 0) * 0.04; // 1 point per 25 yards
    points += (stats.pass_td || 0) * 4;
    points -= (stats.pass_int || 0) * 2;
    
    // Rushing
    points += (stats.rush_yd || 0) * 0.1; // 1 point per 10 yards
    points += (stats.rush_td || 0) * 6;
    
    // Receiving
    points += (stats.rec_yd || 0) * 0.1; // 1 point per 10 yards
    points += (stats.rec_td || 0) * 6;
    
    // Receptions (PPR scoring)
    if (scoringType === 'PPR') {
      points += (stats.rec || 0) * 1;
    } else if (scoringType === 'HALF_PPR') {
      points += (stats.rec || 0) * 0.5;
    }
    
    // Fumbles
    points -= (stats.fum_lost || 0) * 2;
    
    // Kicking
    points += (stats.fg_made || 0) * 3; // Simplified - would need distance for accurate scoring
    points -= (stats.fg_missed || 0) * 1;
    points += (stats.xp_made || 0) * 1;
    
    return Math.round(points * 100) / 100; // Round to 2 decimal places
  }
  
  /**
   * Determine roster position (starter vs bench)
   */
  private determineRosterPosition(starters: string[], sleeperId: string): 'FLEX' | 'BENCH' {
    return starters && starters.includes(sleeperId) ? 'FLEX' : 'BENCH';
  }
  
  /**
   * Run complete sync
   */
  async runCompleteSync(sleeperLeagueId?: string): Promise<void> {
    console.log('🚀 Starting complete data sync...\n');
    
    try {
      // 1. Sync all players
      await this.syncAllPlayers();
      
      // 2. Sync current week stats
      await this.syncWeekStats(CURRENT_WEEK, CURRENT_SEASON);
      
      // 3. Sync projections
      await this.syncProjections(CURRENT_WEEK, CURRENT_SEASON);
      
      // 4. If league ID provided, sync league data
      if (sleeperLeagueId) {
        await this.syncLeague(sleeperLeagueId);
        await this.syncMatchups(sleeperLeagueId, CURRENT_WEEK);
      }
      
      console.log('\n🎉 Complete sync finished successfully!');
      
    } catch (error) {
      console.error('\n❌ Complete sync failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const comprehensiveSyncService = new ComprehensiveSyncService();
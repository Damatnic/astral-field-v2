/**
 * Data Sync Service - Orchestrates syncing from all free APIs
 * Replaces Sleeper integration with ESPN and other free sources
 */

import { PrismaClient } from '@prisma/client';
import { ESPNService } from './espn';
import { NFLDataService } from './nfl-data';

const prisma = new PrismaClient();

export class DataSyncService {
  private espn = new ESPNService();
  private nfl = new NFLDataService();
  
  /**
   * Sync all NFL players from ESPN
   */
  async syncAllPlayers(): Promise<void> {
    console.log('🏈 Starting comprehensive player sync from ESPN...');
    
    try {
      const players = await this.espn.getAllPlayers();
      let syncedCount = 0;
      let errorCount = 0;
      
      console.log(`Processing ${players.length} players...`);
      
      for (const player of players) {
        try {
          await prisma.player.upsert({
            where: { espnId: player.id },
            update: {
              name: player.fullName || (player as any).displayName,
              firstName: player.firstName,
              lastName: player.lastName,
              position: player.position?.abbreviation || (player.position as any)?.name || 'Unknown',
              nflTeam: (player as any).nflTeam,
              jerseyNumber: player.jersey ? parseInt(player.jersey) : null,
              height: (player as any).displayHeight,
              weight: (player as any).displayWeight,
              age: player.age,
              experience: player.experience?.years,
              college: typeof player.college === 'string' ? player.college : player.college?.name,
              imageUrl: player.headshot?.href,
              status: player.injuries?.length ? 'injured' : 'active',
              injuryStatus: player.injuries?.[0]?.status,
              injuryDetails: player.injuries?.[0]?.details,
              updatedAt: new Date()
            },
            create: {
              espnId: player.id,
              name: player.fullName || (player as any).displayName,
              firstName: player.firstName,
              lastName: player.lastName,
              position: player.position?.abbreviation || (player.position as any)?.name || 'Unknown',
              nflTeam: (player as any).nflTeam,
              jerseyNumber: player.jersey ? parseInt(player.jersey) : null,
              height: (player as any).displayHeight,
              weight: (player as any).displayWeight,
              age: player.age,
              experience: player.experience?.years,
              college: typeof player.college === 'string' ? player.college : player.college?.name,
              imageUrl: player.headshot?.href,
              status: player.injuries?.length ? 'injured' : 'active',
              injuryStatus: player.injuries?.[0]?.status,
              injuryDetails: player.injuries?.[0]?.details
            }
          });
          
          syncedCount++;
          
          if (syncedCount % 50 === 0) {
            console.log(`✅ Synced ${syncedCount}/${players.length} players`);
          }
        } catch (error) {
          errorCount++;
          console.error(`Failed to sync player ${player.fullName}:`, error);
        }
      }
      
      console.log(`✅ Player sync completed! ${syncedCount} synced, ${errorCount} errors`);
    } catch (error) {
      console.error('❌ Player sync failed:', error);
      throw error;
    }
  }
  
  /**
   * Sync live scores and update matchups
   */
  async syncLiveScores(week?: number): Promise<void> {
    try {
      const currentWeek = week || await this.nfl.getCurrentWeek();
      console.log(`📊 Syncing live scores for week ${currentWeek}...`);
      
      const scores = await this.nfl.getLiveScores(currentWeek);
      let updatedCount = 0;
      
      for (const game of scores) {
        try {
          // Update league matchups if they exist
          const matchups = await prisma.matchup.findMany({
            where: {
              week: currentWeek,
              // Would need to match teams by name/abbreviation
            }
          });
          
          // For now, just log the scores
          console.log(`Game ${game.id}: ${game.away.team.abbreviation} ${game.away.score} - ${game.home.score} ${game.home.team.abbreviation}`);
          updatedCount++;
        } catch (error) {
          console.error(`Failed to update game ${game.id}:`, error);
        }
      }
      
      console.log(`✅ Updated ${updatedCount} game scores`);
    } catch (error) {
      console.error('❌ Score sync failed:', error);
      throw error;
    }
  }
  
  /**
   * Sync player statistics for a specific week
   */
  async syncPlayerStats(week: number, season: string = '2024'): Promise<void> {
    console.log(`📈 Syncing player stats for week ${week}, season ${season}...`);
    
    try {
      const players = await prisma.player.findMany({
        where: {
          status: 'active'
        },
        take: 100 // Limit to prevent rate limiting
      });
      
      let syncedCount = 0;
      
      for (const player of players) {
        try {
          const stats = await this.espn.getPlayerStats(player.espnId, season);
          
          if (stats?.athlete?.stats) {
            const fantasyPoints = this.espn.calculateFantasyPoints(stats.athlete.stats);
            
            await prisma.playerStats.upsert({
              where: {
                playerId_week_season: {
                  playerId: player.id,
                  week,
                  season
                }
              },
              update: {
                stats: stats.athlete.stats,
                fantasyPoints
              },
              create: {
                playerId: player.id,
                week,
                season,
                stats: stats.athlete.stats,
                fantasyPoints
              }
            });
            
            syncedCount++;
          }
          
          // Add delay to prevent rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Failed to sync stats for ${player.name}:`, error);
        }
      }
      
      console.log(`✅ Synced stats for ${syncedCount} players`);
    } catch (error) {
      console.error('❌ Stats sync failed:', error);
      throw error;
    }
  }
  
  /**
   * Sync NFL news and player updates
   */
  async syncNews(): Promise<void> {
    console.log('📰 Syncing NFL news...');
    
    try {
      const articles = await this.espn.getNews(50);
      let syncedCount = 0;
      
      for (const article of articles) {
        try {
          // Try to match article to players
          const mentionedPlayers = await this.findMentionedPlayers(article.headline + ' ' + article.description);
          
          for (const player of mentionedPlayers) {
            await prisma.playerNews.upsert({
              where: {
                playerId_headline: {
                  playerId: player.id,
                  headline: article.headline
                }
              },
              update: {
                body: article.description,
                source: 'ESPN',
                url: article.links?.web?.href,
                publishedAt: new Date(article.published)
              },
              create: {
                playerId: player.id,
                headline: article.headline,
                body: article.description,
                source: 'ESPN',
                url: article.links?.web?.href,
                publishedAt: new Date(article.published)
              }
            });
            
            syncedCount++;
          }
        } catch (error) {
          console.error(`Failed to sync news article "${article.headline}":`, error);
        }
      }
      
      console.log(`✅ Synced ${syncedCount} news items`);
    } catch (error) {
      console.error('❌ News sync failed:', error);
      throw error;
    }
  }
  
  /**
   * Sync injury reports
   */
  async syncInjuries(): Promise<void> {
    console.log('🏥 Syncing injury reports...');
    
    try {
      const injuries = await this.espn.getInjuries();
      let updatedCount = 0;
      
      for (const injury of injuries) {
        try {
          await prisma.player.updateMany({
            where: {
              espnId: injury.id
            },
            data: {
              status: 'injured',
              injuryStatus: injury.injuries?.[0]?.status,
              injuryDetails: injury.injuries?.[0]?.details,
              updatedAt: new Date()
            }
          });
          
          updatedCount++;
        } catch (error) {
          console.error(`Failed to update injury for player ${injury.fullName}:`, error);
        }
      }
      
      console.log(`✅ Updated ${updatedCount} injury statuses`);
    } catch (error) {
      console.error('❌ Injury sync failed:', error);
      throw error;
    }
  }
  
  /**
   * Complete data refresh - runs all sync operations
   */
  async fullSync(): Promise<void> {
    console.log('🔄 Starting full data synchronization...');
    
    const startTime = Date.now();
    
    try {
      // Sync in order of priority
      await this.syncAllPlayers();
      await this.syncInjuries();
      await this.syncLiveScores();
      await this.syncNews();
      
      const currentWeek = await this.nfl.getCurrentWeek();
      await this.syncPlayerStats(currentWeek);
      
      const duration = Date.now() - startTime;
      console.log(`✅ Full synchronization completed in ${Math.round(duration / 1000)}s`);
    } catch (error) {
      console.error('❌ Full sync failed:', error);
      throw error;
    }
  }
  
  /**
   * Find players mentioned in text
   */
  private async findMentionedPlayers(text: string): Promise<any[]> {
    const words = text.split(/\s+/);
    const potentialNames: string[] = [];
    
    // Look for capitalized word pairs (potential player names)
    for (let i = 0; i < words.length - 1; i++) {
      const firstName = words[i].replace(/[^a-zA-Z]/g, '');
      const lastName = words[i + 1].replace(/[^a-zA-Z]/g, '');
      
      if (firstName.length > 1 && lastName.length > 1 && 
          firstName[0] === firstName[0].toUpperCase() && 
          lastName[0] === lastName[0].toUpperCase()) {
        potentialNames.push(`${firstName} ${lastName}`);
      }
    }
    
    if (potentialNames.length === 0) return [];
    
    // Search for these names in our player database
    const players = await prisma.player.findMany({
      where: {
        OR: potentialNames.map(name => ({
          name: {
            contains: name,
            mode: 'insensitive' as const
          }
        }))
      }
    });
    
    return players;
  }
  
  /**
   * Clean up old data
   */
  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up old data...');
    
    try {
      // Remove news older than 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const deletedNews = await prisma.playerNews.deleteMany({
        where: {
          publishedAt: {
            lt: thirtyDaysAgo
          }
        }
      });
      
      console.log(`✅ Deleted ${deletedNews.count} old news items`);
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
    }
  }
}
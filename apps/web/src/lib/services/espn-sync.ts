/**
 * ESPN Data Synchronization Service
 * Syncs NFL player data, live scores, and news from ESPN APIs
 */

import { PrismaClient } from '@prisma/client';
import { ESPNService } from './espn';
import { NFLDataService } from './espn';

const prisma = new PrismaClient();

export class ESPNSyncService {
  private espn = new ESPNService();
  private nfl = new NFLDataService();
  
  async syncESPNPlayers(): Promise<{ synced: number; errors: number }> {
    console.log('🏈 Syncing NFL players from ESPN...');
    
    let syncedCount = 0;
    let errorCount = 0;
    
    try {
      const teams = await this.espn.getTeams();
      
      for (const team of teams.sports[0].leagues[0].teams) {
        try {
          const roster = await this.espn.getTeamRoster(team.team.id);
          
          if (!roster.team?.athletes) continue;
          
          for (const athlete of roster.team.athletes) {
            try {
              // Check if player already exists
              const playerName = athlete.fullName || `${athlete.firstName || ''} ${athlete.lastName || ''}`.trim();
              const existingPlayer = await prisma.player.findFirst({
                where: {
                  name: { contains: playerName, mode: 'insensitive' }
                }
              });
              
              if (existingPlayer) {
                // Update existing player with ESPN data
                await prisma.player.update({
                  where: { id: existingPlayer.id },
                  data: {
                    updatedAt: new Date()
                  }
                });
              } else {
                // Create new player with ESPN data
                await prisma.player.create({
                  data: {
                    name: playerName,
                    position: athlete.position?.abbreviation || 'Unknown',
                    nflTeam: team.team.abbreviation,
                    isFantasyRelevant: true
                  }
                });
              }
              
              syncedCount++;
            } catch (playerError) {
              console.error(`Failed to sync player ${athlete.fullName}:`, playerError);
              errorCount++;
            }
          }
        } catch (teamError) {
          console.error(`Failed to sync team ${team.team.displayName}:`, teamError);
          errorCount++;
        }
      }
      
      console.log(`✅ ESPN sync complete: ${syncedCount} synced, ${errorCount} errors`);
      return { synced: syncedCount, errors: errorCount };
      
    } catch (error) {
      console.error('ESPN player sync failed:', error);
      throw error;
    }
  }
  
  async syncLiveScores(week?: number): Promise<void> {
    try {
      const currentWeek = week || await this.espn.getCurrentWeek();
      const scoreboard = await this.espn.getScoreboard();
      
      console.log(`📊 Syncing ESPN scores for week ${currentWeek}...`);
      
      // Update any existing matchups with live scores
      for (const event of scoreboard.events || []) {
        const competition = event.competitions[0];
        const homeTeam = competition.competitors.find((c: any) => c.homeAway === 'home');
        const awayTeam = competition.competitors.find((c: any) => c.homeAway === 'away');
        
        if (homeTeam && awayTeam) {
          // Log live NFL game data for reference (no database storage for now)
          console.log(`NFL Game: ${awayTeam.team.abbreviation} @ ${homeTeam.team.abbreviation} - ${awayTeam.score}-${homeTeam.score}`);
        }
      }
    } catch (error) {
      console.error('ESPN score sync failed:', error);
      throw error;
    }
  }
  
  async syncPlayerNews(): Promise<void> {
    try {
      console.log('📰 Syncing player news from ESPN...');
      
      const news = await this.espn.getNews();
      const injuries = await this.espn.getInjuries();
      
      // Process news articles
      for (const article of news.articles || []) {
        await this.processNewsArticle(article);
      }
      
      // Process injury updates
      for (const injury of injuries) {
        await this.processInjuryUpdate(injury);
      }
      
    } catch (error) {
      console.error('ESPN news sync failed:', error);
      throw error;
    }
  }
  
  private async processNewsArticle(article: any): Promise<void> {
    // Extract player mentions and update relevant players
    const players = await prisma.player.findMany({
      where: {
        OR: [
          { name: { contains: article.headline?.toLowerCase() || '', mode: 'insensitive' } },
          { name: { contains: article.description?.toLowerCase() || '', mode: 'insensitive' } }
        ]
      }
    });
    
    for (const player of players) {
      // Create player news entry
      await prisma.playerNews.create({
        data: {
          playerId: player.id,
          title: article.headline || 'ESPN News',
          content: article.description || '',
          source: 'ESPN',
          publishedAt: new Date(article.published || Date.now())
        }
      });
    }
  }
  
  private async processInjuryUpdate(injury: any): Promise<void> {
    const player = await prisma.player.findFirst({
      where: {
        name: { contains: injury.fullName?.toLowerCase() || '', mode: 'insensitive' }
      }
    });
    
    if (player) {
      await prisma.player.update({
        where: { id: player.id },
        data: {
          updatedAt: new Date()
        }
      });
    }
  }
}
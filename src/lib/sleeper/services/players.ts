import { sleeperClient } from '../api/client';
import { prisma } from '@/lib/prisma';

interface SleeperPlayerData {
  player_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  search_full_name: string;
  position: string;
  team?: string;
  age?: number;
  years_exp?: number;
  college?: string;
  height?: string;
  weight?: string;
  number?: number;
  depth_chart_order?: number;
  status?: string;
  injury_status?: string;
  injury_notes?: string;
  birth_date?: string;
  hashtag?: string;
  search_rank?: number;
  fantasy_positions?: string[];
  metadata?: Record<string, any>;
}

interface TrendingData {
  [playerId: string]: {
    count: number;
    percentage: number;
  };
}

export class SleeperPlayerService {
  private playerCache: Map<string, SleeperPlayerData> = new Map();
  private lastFullSync: number = 0;
  private readonly FULL_SYNC_INTERVAL = 4 * 60 * 60 * 1000; // 4 hours

  async syncAllPlayers(): Promise<{
    total: number;
    updated: number;
    created: number;
    errors: number;
  }> {
    try {
      console.log('Starting full player database sync...');
      const startTime = Date.now();
      
      // Fetch all NFL players
      const players = await sleeperClient.getPlayers('nfl');
      
      if (!players || typeof players !== 'object') {
        throw new Error('Invalid player data received from Sleeper API');
      }

      const playerArray = Object.entries(players).map(([id, data]) => ({
        player_id: id,
        ...data as Omit<SleeperPlayerData, 'player_id'>
      }));

      console.log(`Fetched ${playerArray.length} players from Sleeper API`);

      // Batch upsert players
      const result = await this.batchUpsertPlayers(playerArray);
      
      // Update search rankings
      await this.updateSearchRankings();
      
      // Sync trending players
      await this.syncTrendingPlayers();
      
      // Update NFL state
      await this.syncNFLState();

      const duration = Date.now() - startTime;
      console.log(`Player sync completed in ${duration}ms`);
      
      this.lastFullSync = Date.now();
      
      // Log sync completion
      await this.logSyncCompletion('players', result.total, duration);

      return result;
    } catch (error) {
      console.error('Player sync failed:', error);
      await this.logSyncError('players', error);
      throw error;
    }
  }

  async syncPlayersByIds(playerIds: string[]): Promise<{
    updated: number;
    errors: string[];
  }> {
    try {
      const errors: string[] = [];
      let updated = 0;

      // Get all players first
      const allPlayers = await sleeperClient.getPlayers('nfl');
      
      // Filter to only requested players
      const playersToSync = playerIds
        .map(id => ({ player_id: id, ...allPlayers[id] }))
        .filter(player => player.player_id && allPlayers[player.player_id]);

      for (const player of playersToSync) {
        try {
          await this.upsertPlayer(player);
          updated++;
        } catch (error) {
          errors.push(`Player ${player.player_id}: ${error}`);
        }
      }

      return { updated, errors };
    } catch (error) {
      console.error('Error syncing specific players:', error);
      throw error;
    }
  }

  private async batchUpsertPlayers(players: SleeperPlayerData[]): Promise<{
    total: number;
    updated: number;
    created: number;
    errors: number;
  }> {
    const batchSize = 100;
    let created = 0;
    let updated = 0;
    let errors = 0;
    const total = players.length;

    console.log(`Processing ${total} players in batches of ${batchSize}`);

    for (let i = 0; i < players.length; i += batchSize) {
      const batch = players.slice(i, i + batchSize);
      
      try {
        const operations = batch.map(player => 
          prisma.sleeperPlayer.upsert({
            where: { id: player.player_id },
            update: {
              firstName: player.first_name || '',
              lastName: player.last_name || '',
              fullName: player.full_name || '',
              searchFullName: player.search_full_name || '',
              position: player.position || 'UNKNOWN',
              team: player.team,
              age: player.age,
              yearsExp: player.years_exp,
              college: player.college,
              height: player.height,
              weight: player.weight,
              number: player.number,
              depth: player.depth_chart_order,
              status: player.status,
              injuryStatus: player.injury_status,
              injuryNotes: player.injury_notes,
              birthDate: player.birth_date ? new Date(player.birth_date) : null,
              hashtag: player.hashtag,
              depthChartOrder: player.depth_chart_order,
              searchRank: player.search_rank,
              fantasyPositions: player.fantasy_positions || [],
              metadata: player.metadata,
              syncedAt: new Date()
            },
            create: {
              id: player.player_id,
              firstName: player.first_name || '',
              lastName: player.last_name || '',
              fullName: player.full_name || '',
              searchFullName: player.search_full_name || '',
              position: player.position || 'UNKNOWN',
              team: player.team,
              age: player.age,
              yearsExp: player.years_exp,
              college: player.college,
              height: player.height,
              weight: player.weight,
              number: player.number,
              depth: player.depth_chart_order,
              status: player.status,
              injuryStatus: player.injury_status,
              injuryNotes: player.injury_notes,
              birthDate: player.birth_date ? new Date(player.birth_date) : null,
              hashtag: player.hashtag,
              depthChartOrder: player.depth_chart_order,
              searchRank: player.search_rank,
              fantasyPositions: player.fantasy_positions || [],
              metadata: player.metadata
            }
          })
        );

        await prisma.$transaction(operations);
        
        // Rough estimation of created vs updated
        const existingCount = await prisma.sleeperPlayer.count({
          where: {
            id: { in: batch.map(p => p.player_id) }
          }
        });
        
        updated += existingCount;
        created += batch.length - existingCount;

        console.log(`Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(total / batchSize)}`);
      } catch (error) {
        console.error(`Error processing batch starting at index ${i}:`, error);
        errors += batch.length;
      }

      // Small delay to avoid overwhelming the database
      if (i + batchSize < players.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return { total, updated, created, errors };
  }

  private async upsertPlayer(player: SleeperPlayerData): Promise<void> {
    await prisma.sleeperPlayer.upsert({
      where: { id: player.player_id },
      update: {
        firstName: player.first_name || '',
        lastName: player.last_name || '',
        fullName: player.full_name || '',
        searchFullName: player.search_full_name || '',
        position: player.position || 'UNKNOWN',
        team: player.team,
        age: player.age,
        yearsExp: player.years_exp,
        college: player.college,
        height: player.height,
        weight: player.weight,
        number: player.number,
        depth: player.depth_chart_order,
        status: player.status,
        injuryStatus: player.injury_status,
        injuryNotes: player.injury_notes,
        birthDate: player.birth_date ? new Date(player.birth_date) : null,
        hashtag: player.hashtag,
        depthChartOrder: player.depth_chart_order,
        searchRank: player.search_rank,
        fantasyPositions: player.fantasy_positions || [],
        metadata: player.metadata,
        syncedAt: new Date()
      },
      create: {
        id: player.player_id,
        firstName: player.first_name || '',
        lastName: player.last_name || '',
        fullName: player.full_name || '',
        searchFullName: player.search_full_name || '',
        position: player.position || 'UNKNOWN',
        team: player.team,
        age: player.age,
        yearsExp: player.years_exp,
        college: player.college,
        height: player.height,
        weight: player.weight,
        number: player.number,
        depth: player.depth_chart_order,
        status: player.status,
        injuryStatus: player.injury_status,
        injuryNotes: player.injury_notes,
        birthDate: player.birth_date ? new Date(player.birth_date) : null,
        hashtag: player.hashtag,
        depthChartOrder: player.depth_chart_order,
        searchRank: player.search_rank,
        fantasyPositions: player.fantasy_positions || [],
        metadata: player.metadata
      }
    });
  }

  async syncTrendingPlayers(): Promise<{
    add: number;
    drop: number;
  }> {
    try {
      console.log('Syncing trending players...');
      
      const [trendingAdd, trendingDrop] = await Promise.all([
        sleeperClient.getTrendingPlayers('nfl', 'add', 24),
        sleeperClient.getTrendingPlayers('nfl', 'drop', 24)
      ]);

      // Store trending data with cache for quick access
      const trendingData = {
        add: trendingAdd,
        drop: trendingDrop,
        lastUpdated: new Date().toISOString()
      };

      // In a real application, you would store this in Redis
      // For now, we'll store in a simple cache
      this.playerCache.set('trending', trendingData as any);

      console.log(`Trending sync completed: ${Object.keys(trendingAdd || {}).length} adds, ${Object.keys(trendingDrop || {}).length} drops`);

      return {
        add: Object.keys(trendingAdd || {}).length,
        drop: Object.keys(trendingDrop || {}).length
      };
    } catch (error) {
      console.error('Error syncing trending players:', error);
      return { add: 0, drop: 0 };
    }
  }

  async syncNFLState(): Promise<void> {
    try {
      const nflState = await sleeperClient.getNFLState();
      
      await prisma.sleeperNFLState.upsert({
        where: { id: 'nfl_state' },
        update: {
          season: nflState.season,
          seasonType: nflState.season_type,
          week: nflState.week,
          leg: nflState.leg,
          seasonStartDate: nflState.season_start_date ? new Date(nflState.season_start_date) : null,
          seasonEndDate: nflState.season_end_date ? new Date(nflState.season_end_date) : null,
          previousSeason: nflState.previous_season,
          displayWeek: nflState.display_week,
          completedWeek: nflState.completed_week,
          metadata: nflState.metadata,
          syncedAt: new Date()
        },
        create: {
          season: nflState.season,
          seasonType: nflState.season_type,
          week: nflState.week,
          leg: nflState.leg,
          seasonStartDate: nflState.season_start_date ? new Date(nflState.season_start_date) : null,
          seasonEndDate: nflState.season_end_date ? new Date(nflState.season_end_date) : null,
          previousSeason: nflState.previous_season,
          displayWeek: nflState.display_week,
          completedWeek: nflState.completed_week,
          metadata: nflState.metadata
        }
      });

      console.log(`NFL State updated: Season ${nflState.season}, Week ${nflState.week}`);
    } catch (error) {
      console.error('Error syncing NFL state:', error);
    }
  }

  private async updateSearchRankings(): Promise<void> {
    try {
      console.log('Updating player search rankings...');
      
      // Update search rankings based on various factors
      await prisma.$executeRaw`
        UPDATE sleeper_players 
        SET search_rank = (
          CASE 
            WHEN position IN ('QB', 'RB', 'WR', 'TE') THEN
              (CASE position
                WHEN 'QB' THEN 1000
                WHEN 'RB' THEN 2000  
                WHEN 'WR' THEN 3000
                WHEN 'TE' THEN 4000
                ELSE 5000
              END) +
              COALESCE(depth_chart_order * 100, 1500) +
              CASE WHEN status = 'Active' THEN 0 ELSE 500 END +
              CASE WHEN injury_status IS NULL THEN 0 ELSE 200 END
            ELSE 9999
          END
        )
        WHERE search_rank IS NULL OR sync_at > NOW() - INTERVAL '1 day'
      `;

      console.log('Search rankings updated');
    } catch (error) {
      console.error('Error updating search rankings:', error);
    }
  }

  async getPlayersByPosition(position: string, limit = 50): Promise<any[]> {
    try {
      return await prisma.sleeperPlayer.findMany({
        where: {
          position: position.toUpperCase(),
          status: 'Active'
        },
        orderBy: [
          { searchRank: 'asc' },
          { depthChartOrder: 'asc' },
          { fullName: 'asc' }
        ],
        take: limit
      });
    } catch (error) {
      console.error(`Error getting players by position ${position}:`, error);
      return [];
    }
  }

  async searchPlayers(query: string, limit = 20): Promise<any[]> {
    try {
      return await prisma.sleeperPlayer.findMany({
        where: {
          OR: [
            { fullName: { contains: query, mode: 'insensitive' } },
            { searchFullName: { contains: query, mode: 'insensitive' } },
            { firstName: { contains: query, mode: 'insensitive' } },
            { lastName: { contains: query, mode: 'insensitive' } }
          ]
        },
        orderBy: [
          { searchRank: 'asc' },
          { fullName: 'asc' }
        ],
        take: limit
      });
    } catch (error) {
      console.error(`Error searching players with query "${query}":`, error);
      return [];
    }
  }

  async getPlayersByTeam(team: string): Promise<any[]> {
    try {
      return await prisma.sleeperPlayer.findMany({
        where: {
          team: team.toUpperCase(),
          status: 'Active'
        },
        orderBy: [
          { position: 'asc' },
          { depthChartOrder: 'asc' },
          { fullName: 'asc' }
        ]
      });
    } catch (error) {
      console.error(`Error getting players for team ${team}:`, error);
      return [];
    }
  }

  async getTrendingPlayers(): Promise<{
    add: any[];
    drop: any[];
  }> {
    try {
      // Check cache first
      const cached = this.playerCache.get('trending') as any;
      if (cached && Date.now() - new Date(cached.lastUpdated).getTime() < 15 * 60 * 1000) {
        return {
          add: await this.hydrateTrendingPlayers(cached.add),
          drop: await this.hydrateTrendingPlayers(cached.drop)
        };
      }

      // Refresh trending data
      await this.syncTrendingPlayers();
      const fresh = this.playerCache.get('trending') as any;
      
      return {
        add: await this.hydrateTrendingPlayers(fresh?.add || {}),
        drop: await this.hydrateTrendingPlayers(fresh?.drop || {})
      };
    } catch (error) {
      console.error('Error getting trending players:', error);
      return { add: [], drop: [] };
    }
  }

  private async hydrateTrendingPlayers(trendingData: TrendingData): Promise<any[]> {
    const playerIds = Object.keys(trendingData);
    if (playerIds.length === 0) return [];

    const players = await prisma.sleeperPlayer.findMany({
      where: { id: { in: playerIds } }
    });

    return players.map(player => ({
      ...player,
      trendingCount: trendingData[player.id]?.count || 0,
      trendingPercentage: trendingData[player.id]?.percentage || 0
    })).sort((a, b) => b.trendingCount - a.trendingCount);
  }

  async needsFullSync(): Promise<boolean> {
    if (this.lastFullSync === 0) {
      // Check database for last sync
      const lastSync = await prisma.sleeperSyncLog.findFirst({
        where: { type: 'players', status: 'success' },
        orderBy: { completedAt: 'desc' }
      });
      
      if (lastSync?.completedAt) {
        this.lastFullSync = lastSync.completedAt.getTime();
      }
    }

    return Date.now() - this.lastFullSync > this.FULL_SYNC_INTERVAL;
  }

  private async logSyncCompletion(type: string, recordsProcessed: number, duration: number): Promise<void> {
    try {
      await prisma.sleeperSyncLog.create({
        data: {
          type,
          status: 'success',
          completedAt: new Date(),
          duration,
          recordsProcessed,
          metadata: {
            fullSync: true,
            apiCalls: Math.ceil(recordsProcessed / 100)
          }
        }
      });
    } catch (error) {
      console.error('Error logging sync completion:', error);
    }
  }

  private async logSyncError(type: string, error: any): Promise<void> {
    try {
      await prisma.sleeperSyncLog.create({
        data: {
          type,
          status: 'error',
          completedAt: new Date(),
          errorMessage: error.message || String(error),
          errorDetails: {
            stack: error.stack,
            name: error.name
          }
        }
      });
    } catch (logError) {
      console.error('Error logging sync error:', logError);
    }
  }

  clearCache(): void {
    this.playerCache.clear();
  }

  getCacheStats(): {
    size: number;
    lastFullSync: Date | null;
  } {
    return {
      size: this.playerCache.size,
      lastFullSync: this.lastFullSync ? new Date(this.lastFullSync) : null
    };
  }
}

// Singleton instance
export const sleeperPlayerService = new SleeperPlayerService();
// src/lib/sleeper/services/players.ts
// STUB IMPLEMENTATION - ESPN API ONLY
import { EventEmitter } from 'events';

export interface SleeperPlayer {
  player_id: string;
  first_name: string;
  last_name: string;
  search_full_name: string;
  position: string;
  team: string;
  age: number;
  years_exp: number;
  college: string;
  injury_status: string | null;
  status: string;
  sport: string;
  number: number | null;
  search_rank: number | null;
}

export class SleeperPlayerService extends EventEmitter {
  private playerCache: Map<string, any> = new Map();
  
  async syncAllPlayers(): Promise<void> {
    console.log('Sleeper player sync disabled - using ESPN API');
    return Promise.resolve();
  }
  
  async syncTrendingPlayers(type: string = 'all', lookback?: string, limit?: number): Promise<void> {
    console.log('Sleeper trending sync disabled - using ESPN API');
    return Promise.resolve();
  }

  async syncNFLState(): Promise<void> {
    console.log('NFL state sync disabled');
    return Promise.resolve();
  }
  
  async getPlayer(playerId: string): Promise<any> {
    // Return empty player object or fetch from ESPN
    return {
      id: playerId,
      name: 'Player',
      position: 'Unknown',
      team: 'Unknown'
    };
  }

  async searchPlayers(query: string, options?: any): Promise<any[]> {
    console.log('Player search disabled - use ESPN search');
    return [];
  }

  async getPlayersByPosition(position: string): Promise<any[]> {
    console.log('Position search disabled - use ESPN data');
    return [];
  }

  async getPlayersByTeam(team: string): Promise<any[]> {
    console.log('Team search disabled - use ESPN data');
    return [];
  }

  async updatePlayerRankings(): Promise<void> {
    console.log('Player rankings update disabled');
    return Promise.resolve();
  }
  
  private async batchUpsertPlayers(players: any[]): Promise<void> {
    console.log('Sleeper batch upsert disabled');
    return Promise.resolve();
  }
  
  private async updateSearchRankings(): Promise<void> {
    console.log('Search rankings update disabled');
    return Promise.resolve();
  }

  private async syncPlayersWithESPN(): Promise<void> {
    console.log('ESPN sync placeholder');
    return Promise.resolve();
  }

  async getLastSyncTime(): Promise<Date | null> {
    return null;
  }

  async logSyncResult(result: any): Promise<void> {
    console.log('Sync logging disabled');
    return Promise.resolve();
  }
}

export const sleeperPlayerService = new SleeperPlayerService();
export default SleeperPlayerService;
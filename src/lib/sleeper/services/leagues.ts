// src/lib/sleeper/services/leagues.ts
// STUB IMPLEMENTATION - ESPN API ONLY
import { EventEmitter } from 'events';

export class SleeperLeagueService extends EventEmitter {
  // Stub implementation - ESPN API will be used instead
  async syncUserLeagues(username: string): Promise<void> {
    console.log('Sleeper sync disabled - using ESPN API');
    return Promise.resolve();
  }
  
  async syncLeague(leagueId: string): Promise<void> {
    console.log('Sleeper sync disabled - using ESPN API');
    return Promise.resolve();
  }
  
  async syncLeagueRosters(leagueId: string): Promise<void> {
    console.log('Sleeper sync disabled - using ESPN API');
    return Promise.resolve();
  }
  
  async syncLeagueMatchups(leagueId: string, week?: number): Promise<void> {
    console.log('Sleeper sync disabled - using ESPN API');
    return Promise.resolve();
  }
  
  async syncLeagueTransactions(leagueId: string, week?: number): Promise<void> {
    console.log('Sleeper sync disabled - using ESPN API');
    return Promise.resolve();
  }

  async getLeagueStandings(leagueId: string): Promise<any[]> {
    console.log('Sleeper standings disabled - using ESPN API');
    return [];
  }

  async getLeagueActivity(leagueId: string): Promise<any[]> {
    console.log('Sleeper activity disabled - using ESPN API');
    return [];
  }

  async getUserByUsername(username: string): Promise<any> {
    return { username, id: 'local-user' };
  }

  async getUserLeagues(userId: string, season?: string): Promise<any[]> {
    return [];
  }

  private async processLeagueData(leagueData: any): Promise<void> {
    console.log('League data processing disabled');
    return Promise.resolve();
  }
}

export const sleeperLeagueService = new SleeperLeagueService();
export default SleeperLeagueService;
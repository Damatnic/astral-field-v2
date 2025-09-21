/**
 * NFL Data Service - Real Player Data Integration
 * Integrates with SportsData.io or similar APIs for real NFL data
 */

import { handleComponentError } from '@/utils/errorHandling';

import { PrismaClient, Position } from '@prisma/client';
import { PlayerStatus } from '@/types/fantasy';
import axios from 'axios';
import { z } from 'zod';

const prisma = new PrismaClient();

// Environment variables for API keys
const SPORTSDATA_API_KEY = process.env.SPORTSDATA_API_KEY || '';
const SPORTSDATA_BASE_URL = 'https://api.sportsdata.io/v3/nfl';

// For development/demo - use ESPN API (free)
const ESPN_BASE_URL = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';

// Schema for NFL Player data
const NFLPlayerSchema = z.object({
  PlayerID: z.number(),
  Name: z.string(),
  Position: z.string(),
  Team: z.string(),
  Number: z.number().optional(),
  Status: z.string(),
  ByeWeek: z.number().nullable(),
  Experience: z.number(),
  PhotoUrl: z.string().nullable(),
  InjuryStatus: z.string().nullable(),
  InjuryBodyPart: z.string().nullable(),
  InjuryNotes: z.string().nullable(),
});

// Map API positions to our schema
const POSITION_MAP: Record<string, Position> = {
  'QB': Position.QB,
  'RB': Position.RB,
  'WR': Position.WR,
  'TE': Position.TE,
  'K': Position.K,
  'PK': Position.K,
  'DST': Position.DST,
  'DEF': Position.DST,
  'LB': Position.LB,
  'DB': Position.DB,
  'DL': Position.DL,
  'CB': Position.CB,
  'S': Position.S
};

// Map injury statuses
const STATUS_MAP: Record<string, PlayerStatus> = {
  'Active': PlayerStatus.ACTIVE,
  'Questionable': PlayerStatus.QUESTIONABLE,
  'Doubtful': PlayerStatus.DOUBTFUL,
  'Out': PlayerStatus.OUT,
  'Injured Reserve': PlayerStatus.INJURED_RESERVE,
  'Physically Unable to Perform': PlayerStatus.PUP,
  'Suspended': PlayerStatus.SUSPENDED,
  'Retired': PlayerStatus.RETIRED,
  'Practice Squad': PlayerStatus.PRACTICE_SQUAD,
  'Non Football Injury': PlayerStatus.NON_FOOTBALL_INJURY
};

export class NFLDataService {
  private apiKey: string;
  private useRealAPI: boolean;
  
  constructor() {
    this.apiKey = SPORTSDATA_API_KEY;
    this.useRealAPI = !!this.apiKey;
    
    if (!this.useRealAPI) {}
  }
  
  /**
   * Fetch all NFL players for fantasy football
   */
  async fetchAllPlayers(): Promise<void> {try {
      let players: any[] = [];
      
      if (this.useRealAPI) {
        // Fetch from SportsData.io
        const response = await axios.get(
          `${SPORTSDATA_BASE_URL}/scores/json/Players`,
          {
            headers: {
              'Ocp-Apim-Subscription-Key': this.apiKey
            }
          }
        );
        players = response.data;
      } else {
        // Use ESPN free API as fallback
        players = await this.fetchESPNPlayers();
      }
      
      // Filter for fantasy-relevant players
      const fantasyPlayers = players.filter(p => 
        POSITION_MAP[p.Position] && 
        p.Status !== 'Inactive' &&
        p.Status !== 'Retired'
      );// Upsert players to database
      for (const player of fantasyPlayers) {
        await this.upsertPlayer(player);
      }} catch (error) {
      handleComponentError(error as Error, 'nflDataService');
      // Fall back to static top players list
      await this.loadStaticPlayers();
    }
  }
  
  /**
   * Fetch players from ESPN API (free alternative)
   */
  private async fetchESPNPlayers() {
    const positions = ['qb', 'rb', 'wr', 'te', 'k'];
    const allPlayers: any[] = [];
    
    for (const pos of positions) {
      try {
        const response = await axios.get(
          `${ESPN_BASE_URL}/athletes?position=${pos}&limit=100`
        );
        
        if (response.data?.items) {
          allPlayers.push(...response.data.items.map((item: any) => ({
            PlayerID: parseInt(item.id),
            Name: item.displayName,
            Position: pos.toUpperCase(),
            Team: item.team?.abbreviation || 'FA',
            Status: 'Active',
            ByeWeek: null,
            Experience: 0,
            PhotoUrl: item.headshot?.href,
            InjuryStatus: item.injuries?.[0]?.status
          })));
        }
      } catch (err) {
        handleComponentError(err as Error, 'nflDataService');
      }
    }
    
    return allPlayers;
  }
  
  /**
   * Upsert a player to the database
   */
  private async upsertPlayer(playerData: any) {
    const position = POSITION_MAP[playerData.Position];
    if (!position) return;
    
    const status = STATUS_MAP[playerData.Status] || PlayerStatus.ACTIVE;
    
    try {
      await prisma.player.upsert({
        where: {
          nflId: `nfl_${playerData.PlayerID}`
        },
        update: {
          name: playerData.Name,
          position,
          nflTeam: playerData.Team || 'FA',
          byeWeek: playerData.ByeWeek,
          status,
          yearsExperience: playerData.Experience || 0,
          updatedAt: new Date()
        },
        create: {
          nflId: `nfl_${playerData.PlayerID}`,
          name: playerData.Name,
          position,
          nflTeam: playerData.Team || 'FA',
          byeWeek: playerData.ByeWeek,
          status,
          isRookie: playerData.Experience === 0,
          yearsExperience: playerData.Experience || 0
        }
      });
    } catch (error) {
      handleComponentError(error as Error, 'nflDataService');
    }
  }
  
  /**
   * Load static top fantasy players (fallback)
   */
  private async loadStaticPlayers() {const TOP_PLAYERS_2024 = [
      // Quarterbacks
      { name: 'Josh Allen', position: Position.QB, team: 'BUF', bye: 12 },
      { name: 'Jalen Hurts', position: Position.QB, team: 'PHI', bye: 10 },
      { name: 'Patrick Mahomes', position: Position.QB, team: 'KC', bye: 10 },
      { name: 'Lamar Jackson', position: Position.QB, team: 'BAL', bye: 14 },
      { name: 'Dak Prescott', position: Position.QB, team: 'DAL', bye: 7 },
      { name: 'Justin Herbert', position: Position.QB, team: 'LAC', bye: 8 },
      { name: 'Joe Burrow', position: Position.QB, team: 'CIN', bye: 12 },
      { name: 'Tua Tagovailoa', position: Position.QB, team: 'MIA', bye: 10 },
      { name: 'Trevor Lawrence', position: Position.QB, team: 'JAX', bye: 11 },
      { name: 'Justin Fields', position: Position.QB, team: 'CHI', bye: 13 },
      
      // Running Backs
      { name: 'Christian McCaffrey', position: Position.RB, team: 'SF', bye: 9 },
      { name: 'Austin Ekeler', position: Position.RB, team: 'LAC', bye: 8 },
      { name: 'Bijan Robinson', position: Position.RB, team: 'ATL', bye: 11 },
      { name: 'Saquon Barkley', position: Position.RB, team: 'NYG', bye: 13 },
      { name: 'Tony Pollard', position: Position.RB, team: 'DAL', bye: 7 },
      { name: 'Jonathan Taylor', position: Position.RB, team: 'IND', bye: 11 },
      { name: 'Derrick Henry', position: Position.RB, team: 'TEN', bye: 7 },
      { name: 'Josh Jacobs', position: Position.RB, team: 'LV', bye: 13 },
      { name: 'Nick Chubb', position: Position.RB, team: 'CLE', bye: 5 },
      { name: 'Breece Hall', position: Position.RB, team: 'NYJ', bye: 10 },
      { name: 'Rhamondre Stevenson', position: Position.RB, team: 'NE', bye: 11 },
      { name: 'Travis Etienne Jr.', position: Position.RB, team: 'JAX', bye: 11 },
      { name: 'Najee Harris', position: Position.RB, team: 'PIT', bye: 6 },
      { name: 'Aaron Jones', position: Position.RB, team: 'GB', bye: 14 },
      { name: 'Kenneth Walker III', position: Position.RB, team: 'SEA', bye: 9 },
      
      // Wide Receivers
      { name: 'Tyreek Hill', position: Position.WR, team: 'MIA', bye: 10 },
      { name: 'Ja\'Marr Chase', position: Position.WR, team: 'CIN', bye: 12 },
      { name: 'Justin Jefferson', position: Position.WR, team: 'MIN', bye: 13 },
      { name: 'Cooper Kupp', position: Position.WR, team: 'LAR', bye: 10 },
      { name: 'Stefon Diggs', position: Position.WR, team: 'BUF', bye: 12 },
      { name: 'A.J. Brown', position: Position.WR, team: 'PHI', bye: 10 },
      { name: 'CeeDee Lamb', position: Position.WR, team: 'DAL', bye: 7 },
      { name: 'Davante Adams', position: Position.WR, team: 'LV', bye: 13 },
      { name: 'Amon-Ra St. Brown', position: Position.WR, team: 'DET', bye: 6 },
      { name: 'Jaylen Waddle', position: Position.WR, team: 'MIA', bye: 10 },
      { name: 'Chris Olave', position: Position.WR, team: 'NO', bye: 14 },
      { name: 'Garrett Wilson', position: Position.WR, team: 'NYJ', bye: 10 },
      { name: 'DK Metcalf', position: Position.WR, team: 'SEA', bye: 9 },
      { name: 'Keenan Allen', position: Position.WR, team: 'LAC', bye: 8 },
      { name: 'Amari Cooper', position: Position.WR, team: 'CLE', bye: 5 },
      { name: 'Tee Higgins', position: Position.WR, team: 'CIN', bye: 12 },
      { name: 'DeVonta Smith', position: Position.WR, team: 'PHI', bye: 10 },
      { name: 'Mike Evans', position: Position.WR, team: 'TB', bye: 13 },
      { name: 'Calvin Ridley', position: Position.WR, team: 'JAX', bye: 11 },
      { name: 'Terry McLaurin', position: Position.WR, team: 'WAS', bye: 14 },
      
      // Tight Ends
      { name: 'Travis Kelce', position: Position.TE, team: 'KC', bye: 10 },
      { name: 'Mark Andrews', position: Position.TE, team: 'BAL', bye: 14 },
      { name: 'T.J. Hockenson', position: Position.TE, team: 'MIN', bye: 13 },
      { name: 'George Kittle', position: Position.TE, team: 'SF', bye: 9 },
      { name: 'Dallas Goedert', position: Position.TE, team: 'PHI', bye: 10 },
      { name: 'Darren Waller', position: Position.TE, team: 'NYG', bye: 13 },
      { name: 'Kyle Pitts', position: Position.TE, team: 'ATL', bye: 11 },
      { name: 'Pat Freiermuth', position: Position.TE, team: 'PIT', bye: 6 },
      { name: 'Evan Engram', position: Position.TE, team: 'JAX', bye: 11 },
      { name: 'David Njoku', position: Position.TE, team: 'CLE', bye: 5 },
      
      // Kickers
      { name: 'Justin Tucker', position: Position.K, team: 'BAL', bye: 14 },
      { name: 'Harrison Butker', position: Position.K, team: 'KC', bye: 10 },
      { name: 'Tyler Bass', position: Position.K, team: 'BUF', bye: 12 },
      { name: 'Daniel Carlson', position: Position.K, team: 'LV', bye: 13 },
      { name: 'Evan McPherson', position: Position.K, team: 'CIN', bye: 12 },
      { name: 'Jake Elliott', position: Position.K, team: 'PHI', bye: 10 },
      { name: 'Jason Sanders', position: Position.K, team: 'MIA', bye: 10 },
      { name: 'Younghoe Koo', position: Position.K, team: 'ATL', bye: 11 },
      
      // Defenses
      { name: 'Buffalo Bills', position: Position.DST, team: 'BUF', bye: 12 },
      { name: 'San Francisco 49ers', position: Position.DST, team: 'SF', bye: 9 },
      { name: 'Dallas Cowboys', position: Position.DST, team: 'DAL', bye: 7 },
      { name: 'New England Patriots', position: Position.DST, team: 'NE', bye: 11 },
      { name: 'Philadelphia Eagles', position: Position.DST, team: 'PHI', bye: 10 },
      { name: 'Pittsburgh Steelers', position: Position.DST, team: 'PIT', bye: 6 },
      { name: 'Baltimore Ravens', position: Position.DST, team: 'BAL', bye: 14 },
      { name: 'New York Jets', position: Position.DST, team: 'NYJ', bye: 10 }
    ];
    
    for (const [index, player] of TOP_PLAYERS_2024.entries()) {
      await prisma.player.upsert({
        where: {
          nflId: `static_${index + 1}`
        },
        update: {
          name: player.name,
          position: player.position,
          nflTeam: player.team,
          byeWeek: player.bye,
          status: PlayerStatus.ACTIVE,
          updatedAt: new Date()
        },
        create: {
          nflId: `static_${index + 1}`,
          name: player.name,
          position: player.position,
          nflTeam: player.team,
          byeWeek: player.bye,
          status: PlayerStatus.ACTIVE,
          isRookie: false,
          yearsExperience: 3 // Default value
        }
      });
    }}
  
  /**
   * Fetch current week scores
   */
  async fetchCurrentWeekScores(week: number = 17) {if (this.useRealAPI) {
      try {
        const response = await axios.get(
          `${SPORTSDATA_BASE_URL}/stats/json/PlayerGameStatsByWeek/2024/${week}`,
          {
            headers: {
              'Ocp-Apim-Subscription-Key': this.apiKey
            }
          }
        );
        
        const stats = response.data;
        
        // Process and store player stats
        for (const stat of stats) {
          await this.processPlayerStats(stat, week);
        }} catch (error) {
        handleComponentError(error as Error, 'nflDataService');
      }
    } else {
      // Generate random scores for demo
      await this.generateDemoScores(week);
    }
  }
  
  /**
   * Process player stats and calculate fantasy points
   */
  private async processPlayerStats(stat: any, week: number) {
    const playerId = await this.getPlayerIdByNflId(`nfl_${stat.PlayerID}`);
    if (!playerId) return;
    
    // Calculate fantasy points based on scoring system
    const fantasyPoints = this.calculateFantasyPoints(stat);
    
    await prisma.stats.upsert({
      where: {
        playerId_week_season: {
          playerId,
          week,
          season: 2024
        }
      },
      update: {
        stats: stat,
        fantasyPoints,
        updatedAt: new Date()
      },
      create: {
        playerId,
        week,
        season: 2024,
        gameId: stat.GameKey,
        team: stat.Team,
        opponent: stat.Opponent,
        stats: stat,
        fantasyPoints,
        isProjection: false
      }
    });
  }
  
  /**
   * Calculate fantasy points from stats
   */
  private calculateFantasyPoints(stats: any): number {
    let points = 0;
    
    // Passing
    points += (stats.PassingYards || 0) * 0.04;
    points += (stats.PassingTouchdowns || 0) * 4;
    points += (stats.PassingInterceptions || 0) * -2;
    
    // Rushing
    points += (stats.RushingYards || 0) * 0.1;
    points += (stats.RushingTouchdowns || 0) * 6;
    
    // Receiving
    points += (stats.ReceivingYards || 0) * 0.1;
    points += (stats.ReceivingTouchdowns || 0) * 6;
    points += (stats.Receptions || 0) * 0.5; // PPR
    
    // Kicking
    points += (stats.FieldGoalsMade || 0) * 3;
    points += (stats.ExtraPointsMade || 0) * 1;
    
    return Math.round(points * 100) / 100;
  }
  
  /**
   * Get player ID by NFL ID
   */
  private async getPlayerIdByNflId(nflId: string): Promise<string | null> {
    const player = await prisma.player.findUnique({
      where: { nflId },
      select: { id: true }
    });
    return player?.id || null;
  }
  
  /**
   * Generate demo scores for testing
   */
  private async generateDemoScores(week: number) {const players = await prisma.player.findMany({
      where: {
        status: PlayerStatus.ACTIVE
      }
    });
    
    for (const player of players) {
      // Generate random but realistic scores
      let fantasyPoints = 0;
      
      switch (player.position) {
        case Position.QB:
          fantasyPoints = Math.random() * 25 + 10; // 10-35 points
          break;
        case Position.RB:
        case Position.WR:
          fantasyPoints = Math.random() * 20 + 5; // 5-25 points
          break;
        case Position.TE:
          fantasyPoints = Math.random() * 15 + 3; // 3-18 points
          break;
        case Position.K:
          fantasyPoints = Math.random() * 12 + 3; // 3-15 points
          break;
        case Position.DST:
          fantasyPoints = Math.random() * 15 - 2; // -2 to 13 points
          break;
      }
      
      await prisma.stats.upsert({
        where: {
          playerId_week_season: {
            playerId: player.id,
            week,
            season: 2024
          }
        },
        update: {
          fantasyPoints: Math.round(fantasyPoints * 100) / 100,
          updatedAt: new Date()
        },
        create: {
          playerId: player.id,
          week,
          season: 2024,
          stats: {},
          fantasyPoints: Math.round(fantasyPoints * 100) / 100,
          isProjection: false
        }
      });
    }}
}

// Export singleton instance
export const nflDataService = new NFLDataService();
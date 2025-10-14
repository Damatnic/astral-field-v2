/**
 * ESPN to Prisma Data Mapper
 * Maps ESPN API data structures to our Prisma schema
 */

import { Position, PlayerStatus } from '@prisma/client';

export class ESPNMapper {
  /**
   * Map ESPN position to our Position enum
   */
  static mapPosition(espnPosition: string): Position {
    const positionMap: Record<string, Position> = {
      'QB': 'QB',
      'RB': 'RB',
      'WR': 'WR',
      'TE': 'TE',
      'K': 'K',
      'DEF': 'DST',
      'D/ST': 'DST',
      'DST': 'DST',
      'DE': 'DST',
      'DT': 'DST',
      'LB': 'DST',
      'CB': 'DST',
      'S': 'DST',
      'DB': 'DST',
    };

    return positionMap[espnPosition?.toUpperCase()] || 'BENCH';
  }

  /**
   * Map ESPN player data to our Player model format
   */
  static mapPlayer(espnPlayer: any, teamAbbr?: string) {
    return {
      nflId: espnPlayer.id?.toString(),
      name: espnPlayer.fullName || espnPlayer.displayName || 'Unknown Player',
      firstName: espnPlayer.firstName || null,
      lastName: espnPlayer.lastName || null,
      position: this.mapPosition(espnPlayer.position?.abbreviation || espnPlayer.position),
      nflTeam: teamAbbr || espnPlayer.team?.abbreviation || null,
      byeWeek: espnPlayer.byeWeek || null,
      status: this.mapPlayerStatus(espnPlayer.status),
      injuryStatus: espnPlayer.injuries?.[0]?.status || null,
      isRookie: espnPlayer.experience?.years === 0 || false,
      yearsExperience: espnPlayer.experience?.years || 0,
      age: espnPlayer.age || null,
      height: espnPlayer.displayHeight || null,
      weight: espnPlayer.displayWeight || null,
      college: espnPlayer.college?.name || null,
      isFantasyRelevant: this.isFantasyRelevant(espnPlayer.position?.abbreviation),
      isActive: espnPlayer.status?.type !== 'injured' && espnPlayer.status?.type !== 'out',
      lastUpdated: new Date(),
    };
  }

  /**
   * Map ESPN player status to our PlayerStatus enum
   */
  static mapPlayerStatus(espnStatus: any): PlayerStatus {
    if (!espnStatus) return 'ACTIVE';
    
    const statusType = espnStatus.type?.toLowerCase();
    
    if (statusType === 'active') return 'ACTIVE';
    if (statusType === 'injured' || statusType === 'out') return 'INJURED';
    if (statusType === 'suspended') return 'SUSPENDED';
    if (statusType === 'inactive') return 'INACTIVE';
    
    return 'ACTIVE';
  }

  /**
   * Check if a position is fantasy relevant
   */
  static isFantasyRelevant(position: string): boolean {
    const relevantPositions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF', 'D/ST', 'DST'];
    return relevantPositions.includes(position?.toUpperCase());
  }

  /**
   * Map ESPN stats to PlayerStats format
   */
  static mapPlayerStats(espnStats: any, playerId: string, week: number, season: number) {
    const stats: any = {};
    let fantasyPoints = 0;

    // Extract stats from ESPN format
    if (espnStats.splits?.categories) {
      for (const category of espnStats.splits.categories) {
        for (const type of category.types) {
          if (type.statistics) {
            for (const stat of type.statistics) {
              stats[stat.name] = parseFloat(stat.value) || 0;
            }
          }
        }
      }
    }

    // Calculate fantasy points (standard scoring)
    fantasyPoints += this.calculateFantasyPoints(stats);

    return {
      playerId,
      week,
      season,
      fantasyPoints: Math.round(fantasyPoints * 100) / 100,
      stats: JSON.stringify(stats),
    };
  }

  /**
   * Calculate fantasy points from stats
   */
  static calculateFantasyPoints(stats: any): number {
    let points = 0;

    // Passing
    points += (stats.passingYards || 0) * 0.04; // 1 pt per 25 yards
    points += (stats.passingTouchdowns || 0) * 4;
    points += (stats.interceptions || 0) * -2;
    points += (stats.passing2PtConversions || 0) * 2;

    // Rushing
    points += (stats.rushingYards || 0) * 0.1; // 1 pt per 10 yards
    points += (stats.rushingTouchdowns || 0) * 6;
    points += (stats.rushing2PtConversions || 0) * 2;

    // Receiving (0.5 PPR)
    points += (stats.receptions || 0) * 0.5;
    points += (stats.receivingYards || 0) * 0.1; // 1 pt per 10 yards
    points += (stats.receivingTouchdowns || 0) * 6;
    points += (stats.receiving2PtConversions || 0) * 2;

    // Fumbles
    points += (stats.fumblesLost || 0) * -2;

    // Kicking
    points += (stats.madeFieldGoals || 0) * 3;
    points += (stats.madeExtraPoints || 0) * 1;
    points += (stats.missedFieldGoals || 0) * -1;

    // Defense/Special Teams
    points += (stats.defensiveTouchdowns || 0) * 6;
    points += (stats.interceptions || 0) * 2;
    points += (stats.fumblesRecovered || 0) * 2;
    points += (stats.sacks || 0) * 1;
    points += (stats.safeties || 0) * 2;
    points += (stats.kickoffReturnTouchdowns || 0) * 6;
    points += (stats.puntReturnTouchdowns || 0) * 6;

    return points;
  }

  /**
   * Map ESPN injury data to PlayerInjuryReport format
   */
  static mapInjuryReport(espnInjury: any, playerId: string, week: number, season: number) {
    return {
      playerId,
      status: espnInjury.status?.toUpperCase() || 'QUESTIONABLE',
      injury: espnInjury.type || espnInjury.details?.type || 'Unknown',
      description: espnInjury.details?.detail || espnInjury.longComment || '',
      week,
      season,
    };
  }

  /**
   * Map ESPN game data to LiveGame format
   */
  static mapLiveGame(espnEvent: any, week: number, season: number) {
    const competition = espnEvent.competitions[0];
    const homeTeam = competition.competitors.find((c: any) => c.homeAway === 'home');
    const awayTeam = competition.competitors.find((c: any) => c.homeAway === 'away');

    return {
      nflGameId: espnEvent.id,
      homeTeam: homeTeam?.team?.abbreviation || 'Unknown',
      awayTeam: awayTeam?.team?.abbreviation || 'Unknown',
      week,
      season,
      gameTime: new Date(espnEvent.date),
      status: espnEvent.status?.type?.name || 'SCHEDULED',
      quarter: espnEvent.status?.period || 0,
      timeRemaining: espnEvent.status?.displayClock || '',
      homeScore: parseInt(homeTeam?.score) || 0,
      awayScore: parseInt(awayTeam?.score) || 0,
    };
  }

  /**
   * Map ESPN news article to PlayerNews format
   */
  static mapPlayerNews(espnArticle: any, playerId: string) {
    return {
      playerId,
      title: espnArticle.headline || 'ESPN News',
      content: espnArticle.description || espnArticle.story || '',
      source: 'ESPN',
      url: espnArticle.links?.web?.href || null,
      publishedAt: new Date(espnArticle.published || Date.now()),
    };
  }

  /**
   * Extract player mentions from news article text
   */
  static extractPlayerNames(text: string): string[] {
    // Simple extraction - could be enhanced with NLP
    const words = text.split(/\s+/);
    const names: string[] = [];
    
    for (let i = 0; i < words.length - 1; i++) {
      const word1 = words[i].replace(/[^a-zA-Z]/g, '');
      const word2 = words[i + 1].replace(/[^a-zA-Z]/g, '');
      
      // If both words start with capital letters, might be a name
      if (word1[0] === word1[0]?.toUpperCase() && 
          word2[0] === word2[0]?.toUpperCase() &&
          word1.length > 1 && word2.length > 1) {
        names.push(`${word1} ${word2}`);
      }
    }
    
    return [...new Set(names)]; // Remove duplicates
  }

  /**
   * Map ESPN team roster to multiple players
   */
  static mapTeamRoster(espnRoster: any, teamAbbr: string) {
    const players = [];
    
    if (espnRoster.team?.athletes) {
      for (const athlete of espnRoster.team.athletes) {
        players.push(this.mapPlayer(athlete, teamAbbr));
      }
    }
    
    return players;
  }

  /**
   * Map ESPN scoreboard to live game data
   */
  static mapScoreboard(espnScoreboard: any, week?: number) {
    const games = [];
    const season = espnScoreboard.season?.year || 2024;
    const currentWeek = week || espnScoreboard.week?.number || 1;
    
    if (espnScoreboard.events) {
      for (const event of espnScoreboard.events) {
        games.push(this.mapLiveGame(event, currentWeek, season));
      }
    }
    
    return games;
  }
}


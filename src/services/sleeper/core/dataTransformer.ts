// Data Transformer for Sleeper API
// Converts Sleeper API responses to our internal data format

interface SleeperPlayer {
  player_id: string;
  first_name: string;
  last_name: string;
  position: string;
  team: string | null;
  age: number | null;
  fantasy_positions: string[];
  status: string;
  injury_status: string | null;
  years_exp: number | null;
  height: string | null;
  weight: string | null;
  birth_date: string | null;
  college: string | null;
  hashtag: string | null;
  depth_chart_position: number | null;
  depth_chart_order: number | null;
  search_rank: number | null;
  injury_start_date: string | null;
  injury_body_part: string | null;
  injury_notes: string | null;
  news_updated: number | null;
  active: boolean;
}

interface SleeperNFLState {
  week: number;
  season: string;
  season_type: string;
  leg: number;
  league_season: string;
  previous_season: string;
  season_start_date: string;
  display_week: number;
  league_create_season: string;
  season_has_scores: boolean;
}

interface SleeperMatchup {
  starters: string[];
  roster_id: number;
  players: string[];
  matchup_id: number;
  points: number;
  custom_points: number | null;
}

interface SleeperRoster {
  starters: string[];
  settings: {
    wins: number;
    waiver_position: number;
    waiver_budget_used: number;
    total_moves: number;
    ties: number;
    losses: number;
    fpts: number;
    fpts_decimal: number;
    fpts_against: number;
    fpts_against_decimal: number;
  };
  roster_id: number;
  reserve: string[] | null;
  players: string[];
  owner_id: string;
  league_id: string;
}

export class SleeperDataTransformer {
  /**
   * Transform Sleeper player data to our internal Player format
   */
  static transformPlayer(sleeperPlayer: SleeperPlayer) {
    return {
      id: sleeperPlayer.player_id,
      name: `${sleeperPlayer.first_name || ''} ${sleeperPlayer.last_name || ''}`.trim(),
      firstName: sleeperPlayer.first_name || '',
      lastName: sleeperPlayer.last_name || '',
      position: sleeperPlayer.position,
      nflTeam: sleeperPlayer.team || null,
      age: sleeperPlayer.age,
      fantasyPositions: sleeperPlayer.fantasy_positions || [],
      status: this.mapPlayerStatus(sleeperPlayer.status),
      injuryStatus: sleeperPlayer.injury_status,
      yearsExperience: sleeperPlayer.years_exp,
      height: sleeperPlayer.height,
      weight: sleeperPlayer.weight,
      birthDate: sleeperPlayer.birth_date,
      college: sleeperPlayer.college,
      hashtag: sleeperPlayer.hashtag,
      depthChartPosition: this.parseDepthChartPosition(sleeperPlayer.depth_chart_position),
      depthChartOrder: sleeperPlayer.depth_chart_order,
      searchRank: sleeperPlayer.search_rank,
      injuryStartDate: sleeperPlayer.injury_start_date,
      injuryBodyPart: sleeperPlayer.injury_body_part,
      injuryNotes: sleeperPlayer.injury_notes,
      newsUpdated: sleeperPlayer.news_updated,
      isActive: sleeperPlayer.active === true,
      isFantasyRelevant: this.isFantasyRelevant(sleeperPlayer),
      sleeperData: sleeperPlayer, // Keep original for reference
    };
  }

  /**
   * Transform Sleeper NFL state to our internal format
   */
  static transformNFLState(sleeperState: SleeperNFLState) {
    return {
      currentWeek: sleeperState.week,
      season: parseInt(sleeperState.season),
      seasonType: sleeperState.season_type, // 'pre', 'regular', 'post'
      leg: sleeperState.leg,
      leagueSeason: sleeperState.league_season,
      previousSeason: sleeperState.previous_season,
      seasonStartDate: new Date(sleeperState.season_start_date),
      displayWeek: sleeperState.display_week,
      leagueCreateSeason: sleeperState.league_create_season,
      hasScores: sleeperState.season_has_scores,
      isRegularSeason: sleeperState.season_type === 'regular',
      isPlayoffs: sleeperState.season_type === 'post',
      sleeperData: sleeperState,
    };
  }

  /**
   * Transform Sleeper matchup data
   */
  static transformMatchup(sleeperMatchup: SleeperMatchup) {
    return {
      rosterId: sleeperMatchup.roster_id,
      matchupId: sleeperMatchup.matchup_id,
      starters: sleeperMatchup.starters,
      players: sleeperMatchup.players,
      points: sleeperMatchup.points,
      customPoints: sleeperMatchup.custom_points,
      sleeperData: sleeperMatchup,
    };
  }

  /**
   * Transform Sleeper roster data
   */
  static transformRoster(sleeperRoster: SleeperRoster) {
    return {
      rosterId: sleeperRoster.roster_id,
      ownerId: sleeperRoster.owner_id,
      leagueId: sleeperRoster.league_id,
      starters: sleeperRoster.starters,
      players: sleeperRoster.players,
      reserve: sleeperRoster.reserve || [],
      settings: {
        wins: sleeperRoster.settings.wins,
        losses: sleeperRoster.settings.losses,
        ties: sleeperRoster.settings.ties,
        fantasyPoints: sleeperRoster.settings.fpts + (sleeperRoster.settings.fpts_decimal / 100),
        fantasyPointsAgainst: sleeperRoster.settings.fpts_against + (sleeperRoster.settings.fpts_against_decimal / 100),
        waiverPosition: sleeperRoster.settings.waiver_position,
        waiverBudgetUsed: sleeperRoster.settings.waiver_budget_used,
        totalMoves: sleeperRoster.settings.total_moves,
      },
      sleeperData: sleeperRoster,
    };
  }

  /**
   * Parse depth chart position (handle both strings and numbers)
   */
  private static parseDepthChartPosition(position: any): number | null {
    // If it's already a number or null, return as-is
    if (typeof position === 'number' || position === null || position === undefined) {
      return position;
    }
    
    // If it's a string, try to parse as number first
    if (typeof position === 'string') {
      const parsed = parseInt(position, 10);
      if (!isNaN(parsed)) {
        return parsed;
      }
      
      // If it's a position string like "QB", "RB", return null
      // since we can't meaningfully convert these to depth chart positions
      return null;
    }
    
    return null;
  }

  /**
   * Map Sleeper player status to our internal status
   */
  private static mapPlayerStatus(status: string): string {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'ACTIVE';
      case 'inactive':
        return 'INACTIVE';
      case 'ir':
      case 'injured_reserve':
        return 'INJURED_RESERVE';
      case 'pup':
        return 'PUP';
      case 'suspended':
        return 'SUSPENDED';
      case 'retired':
        return 'RETIRED';
      case 'practice_squad':
        return 'PRACTICE_SQUAD';
      case 'reserve_covid':
        return 'INJURED_RESERVE'; // Map to existing enum value
      default:
        return 'UNKNOWN';
    }
  }

  /**
   * Determine if a player is fantasy relevant
   */
  private static isFantasyRelevant(player: SleeperPlayer): boolean {
    // Must have fantasy positions
    if (!player.fantasy_positions || player.fantasy_positions.length === 0) {
      return false;
    }

    // Must be active
    if (!player.active) {
      return false;
    }

    // Must have a position we care about
    const relevantPositions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
    if (!relevantPositions.includes(player.position)) {
      return false;
    }

    // Must have some search rank (fantasy relevance indicator)
    if (player.search_rank === null || player.search_rank === undefined) {
      return false;
    }

    return true;
  }

  /**
   * Filter players for fantasy relevance
   */
  static filterFantasyPlayers(players: SleeperPlayer[]): SleeperPlayer[] {
    return players.filter(player => this.isFantasyRelevant(player));
  }

  /**
   * Sort players by fantasy relevance
   */
  static sortPlayersByRelevance(players: SleeperPlayer[]): SleeperPlayer[] {
    return players.sort((a, b) => {
      // Sort by search rank (lower is better)
      const aRank = a.search_rank || 999999;
      const bRank = b.search_rank || 999999;
      return aRank - bRank;
    });
  }

  /**
   * Group players by position
   */
  static groupPlayersByPosition(players: SleeperPlayer[]): Record<string, SleeperPlayer[]> {
    return players.reduce((groups, player) => {
      const position = player.position;
      if (!groups[position]) {
        groups[position] = [];
      }
      groups[position].push(player);
      return groups;
    }, {} as Record<string, SleeperPlayer[]>);
  }

  /**
   * Calculate fantasy points from stats (basic implementation)
   */
  static calculateFantasyPoints(stats: any, scoringSystem = 'ppr'): number {
    if (!stats) return 0;

    let points = 0;

    // Passing
    points += (stats.pass_yd || 0) * 0.04; // 4 points per 100 yards
    points += (stats.pass_td || 0) * 4;
    points -= (stats.pass_int || 0) * 2;

    // Rushing
    points += (stats.rush_yd || 0) * 0.1; // 10 points per 100 yards
    points += (stats.rush_td || 0) * 6;

    // Receiving
    points += (stats.rec_yd || 0) * 0.1; // 10 points per 100 yards
    points += (stats.rec_td || 0) * 6;
    
    // PPR scoring
    if (scoringSystem === 'ppr') {
      points += (stats.rec || 0) * 1; // 1 point per reception
    } else if (scoringSystem === 'half_ppr') {
      points += (stats.rec || 0) * 0.5; // 0.5 points per reception
    }

    // Kicking
    points += (stats.fgm || 0) * 3;
    points += (stats.xpm || 0) * 1;

    // Defense
    points += (stats.def_int || 0) * 2;
    points += (stats.def_fumble_rec || 0) * 2;
    points += (stats.def_sack || 0) * 1;
    points += (stats.def_safety || 0) * 2;
    points += (stats.def_td || 0) * 6;

    return Math.round(points * 100) / 100; // Round to 2 decimal places
  }
}

export default SleeperDataTransformer;
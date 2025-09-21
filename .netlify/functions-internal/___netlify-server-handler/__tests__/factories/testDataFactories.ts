/**
 * Test Data Factories
 * 
 * Comprehensive factory system for generating realistic test data for Sleeper API
 * testing, including players, leagues, rosters, transactions, and game scenarios.
 * 
 * Features:
 * - Realistic player data generation with proper constraints
 * - League and roster factory with dynasty-specific configurations
 * - Transaction history generation for various scenarios
 * - Game state and scoring event factories
 * - Customizable data generation with seed support for reproducibility
 */

import { 
  SleeperPlayer, 
  SleeperLeague, 
  SleeperRoster, 
  SleeperUser, 
  SleeperTransaction, 
  SleeperMatchup, 
  PlayerStats,
  TrendingPlayers,
  NFLState 
} from '@/types/sleeper';

export interface TestDataConfig {
  seed?: number;
  season?: string;
  week?: number;
  playerCount?: number;
  teamCount?: number;
  includeInjuries?: boolean;
  includeTrades?: boolean;
  dynastySettings?: boolean;
}

export class TestDataFactories {
  private static seed: number = 12345;
  private static playerIdCounter: number = 1;
  private static transactionIdCounter: number = 1;

  /**
   * Set seed for reproducible test data
   */
  static setSeed(seed: number): void {
    this.seed = seed;
    this.playerIdCounter = 1;
    this.transactionIdCounter = 1;
  }

  /**
   * Simple seeded random number generator
   */
  private static seededRandom(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  /**
   * Random integer between min and max (inclusive)
   */
  private static randomInt(min: number, max: number): number {
    return Math.floor(this.seededRandom() * (max - min + 1)) + min;
  }

  /**
   * Random element from array
   */
  private static randomChoice<T>(array: T[]): T {
    return array[this.randomInt(0, array.length - 1)];
  }

  /**
   * Generate realistic NFL player data
   */
  static createPlayer(overrides: Partial<SleeperPlayer> = {}): SleeperPlayer {
    const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
    const teams = [
      'ARI', 'ATL', 'BAL', 'BUF', 'CAR', 'CHI', 'CIN', 'CLE', 'DAL', 'DEN',
      'DET', 'GB', 'HOU', 'IND', 'JAX', 'KC', 'LV', 'LAC', 'LAR', 'MIA',
      'MIN', 'NE', 'NO', 'NYG', 'NYJ', 'PHI', 'PIT', 'SF', 'SEA', 'TB',
      'TEN', 'WAS'
    ];
    
    const firstNames = [
      'Josh', 'Patrick', 'Aaron', 'Tom', 'Lamar', 'Dak', 'Russell', 'Kyler',
      'Derrick', 'Christian', 'Alvin', 'Ezekiel', 'Saquon', 'Nick', 'Dalvin',
      'Cooper', 'Stefon', 'DeAndre', 'Julio', 'Mike', 'Keenan', 'DK',
      'Travis', 'George', 'Mark', 'Darren', 'Rob', 'Tyler'
    ];
    
    const lastNames = [
      'Allen', 'Mahomes', 'Rodgers', 'Brady', 'Jackson', 'Prescott', 'Wilson',
      'Henry', 'McCaffrey', 'Kamara', 'Elliott', 'Barkley', 'Chubb', 'Cook',
      'Kupp', 'Diggs', 'Hopkins', 'Jones', 'Evans', 'Allen', 'Metcalf',
      'Kelce', 'Kittle', 'Andrews', 'Waller', 'Lockett', 'Gronkowski'
    ];

    const injuryStatuses = ['Questionable', 'Doubtful', 'Out', null, null, null]; // Bias toward healthy
    const playerStatuses = ['Active', 'Inactive', 'Injured Reserve', 'Practice Squad'];

    const playerId = (this.playerIdCounter++).toString();
    const firstName = this.randomChoice(firstNames);
    const lastName = this.randomChoice(lastNames);
    const position = this.randomChoice(positions);
    const team = this.randomChoice(teams);
    const age = this.randomInt(22, 35);
    const yearsExp = Math.max(0, age - 22);

    const hasInjury = this.seededRandom() < 0.15; // 15% chance of injury

    return {
      player_id: playerId,
      first_name: firstName,
      last_name: lastName,
      full_name: `${firstName} ${lastName}`,
      position,
      team,
      age,
      height: `${this.randomInt(5, 6)}'${this.randomInt(8, 11)}"`,
      weight: `${this.randomInt(180, 280)}`,
      years_exp: yearsExp,
      college: this.randomChoice(['Alabama', 'LSU', 'Georgia', 'Ohio State', 'Clemson', 'Oklahoma']),
      status: this.randomChoice(playerStatuses),
      injury_status: hasInjury ? this.randomChoice(injuryStatuses.filter(s => s !== null)) : null,
      injury_body_part: hasInjury ? this.randomChoice(['Shoulder', 'Knee', 'Ankle', 'Hamstring', 'Concussion']) : null,
      injury_notes: hasInjury ? 'Limited participation in practice' : null,
      news_updated: hasInjury ? Date.now() - this.randomInt(0, 86400000) : null, // Within last day
      fantasy_data_id: this.randomInt(10000, 99999),
      stats_id: playerId,
      rotowire_id: this.randomInt(10000, 99999),
      sportradar_id: `sr:player:${playerId}`,
      yahoo_id: this.randomInt(10000, 99999),
      search_full_name: `${firstName} ${lastName}`.toLowerCase(),
      birth_date: `${2024 - age}-${this.randomInt(1, 12).toString().padStart(2, '0')}-${this.randomInt(1, 28).toString().padStart(2, '0')}`,
      ...overrides
    };
  }

  /**
   * Generate multiple players
   */
  static createPlayers(count: number, config: Partial<TestDataConfig> = {}): Record<string, SleeperPlayer> {
    const players: Record<string, SleeperPlayer> = {};
    
    for (let i = 0; i < count; i++) {
      const player = this.createPlayer();
      players[player.player_id] = player;
    }
    
    return players;
  }

  /**
   * Generate player statistics
   */
  static createPlayerStats(playerId: string, position: string = 'RB', overrides: Partial<PlayerStats> = {}): PlayerStats {
    const baseStats: PlayerStats = {};

    switch (position) {
      case 'QB':
        baseStats.pass_yd = this.randomInt(200, 400);
        baseStats.pass_td = this.randomInt(0, 4);
        baseStats.pass_int = this.randomInt(0, 2);
        baseStats.pass_cmp = this.randomInt(15, 35);
        baseStats.pass_att = this.randomInt(25, 50);
        baseStats.rush_yd = this.randomInt(0, 50);
        baseStats.rush_td = this.randomInt(0, 1);
        break;
      
      case 'RB':
        baseStats.rush_yd = this.randomInt(50, 200);
        baseStats.rush_td = this.randomInt(0, 3);
        baseStats.rush_att = this.randomInt(10, 30);
        baseStats.rec = this.randomInt(2, 8);
        baseStats.rec_yd = this.randomInt(20, 80);
        baseStats.rec_td = this.randomInt(0, 1);
        break;
      
      case 'WR':
        baseStats.rec = this.randomInt(3, 12);
        baseStats.rec_yd = this.randomInt(40, 150);
        baseStats.rec_td = this.randomInt(0, 2);
        baseStats.rec_tgt = this.randomInt(5, 15);
        baseStats.rush_yd = this.randomInt(0, 20);
        break;
      
      case 'TE':
        baseStats.rec = this.randomInt(2, 8);
        baseStats.rec_yd = this.randomInt(20, 100);
        baseStats.rec_td = this.randomInt(0, 1);
        baseStats.rec_tgt = this.randomInt(3, 10);
        break;
      
      case 'K':
        baseStats.fgm = this.randomInt(0, 4);
        baseStats.fga = this.randomInt(1, 5);
        baseStats.fgm_20_29 = this.randomInt(0, 2);
        baseStats.fgm_30_39 = this.randomInt(0, 2);
        baseStats.fgm_40_49 = this.randomInt(0, 1);
        baseStats.fgm_50p = this.randomInt(0, 1);
        baseStats.xpm = this.randomInt(0, 5);
        baseStats.xpa = this.randomInt(0, 5);
        break;
      
      case 'DEF':
        baseStats.def_int = this.randomInt(0, 2);
        baseStats.def_fr = this.randomInt(0, 1);
        baseStats.def_sack = this.randomInt(0, 4);
        baseStats.def_safe = this.randomInt(0, 1);
        baseStats.def_td = this.randomInt(0, 1);
        baseStats.def_pa = this.randomInt(7, 35);
        baseStats.def_yds_allowed = this.randomInt(200, 500);
        break;
    }

    // Calculate fantasy points (PPR)
    let ptsStd = 0;
    let ptsPpr = 0;
    let ptsHalfPpr = 0;

    // Passing points
    if (baseStats.pass_yd) ptsStd += baseStats.pass_yd * 0.04;
    if (baseStats.pass_td) ptsStd += baseStats.pass_td * 4;
    if (baseStats.pass_int) ptsStd += baseStats.pass_int * -2;

    // Rushing points
    if (baseStats.rush_yd) ptsStd += baseStats.rush_yd * 0.1;
    if (baseStats.rush_td) ptsStd += baseStats.rush_td * 6;

    // Receiving points
    if (baseStats.rec_yd) ptsStd += baseStats.rec_yd * 0.1;
    if (baseStats.rec_td) ptsStd += baseStats.rec_td * 6;
    if (baseStats.rec) {
      ptsPpr += baseStats.rec * 1; // Full PPR
      ptsHalfPpr += baseStats.rec * 0.5; // Half PPR
    }

    // Kicking points
    if (baseStats.xpm) ptsStd += baseStats.xpm * 1;
    if (baseStats.fgm_20_29) ptsStd += baseStats.fgm_20_29 * 3;
    if (baseStats.fgm_30_39) ptsStd += baseStats.fgm_30_39 * 3;
    if (baseStats.fgm_40_49) ptsStd += baseStats.fgm_40_49 * 4;
    if (baseStats.fgm_50p) ptsStd += baseStats.fgm_50p * 5;

    // Defense points
    if (baseStats.def_int) ptsStd += baseStats.def_int * 2;
    if (baseStats.def_fr) ptsStd += baseStats.def_fr * 2;
    if (baseStats.def_sack) ptsStd += baseStats.def_sack * 1;
    if (baseStats.def_safe) ptsStd += baseStats.def_safe * 2;
    if (baseStats.def_td) ptsStd += baseStats.def_td * 6;

    // Add fumble penalties
    if (this.seededRandom() < 0.1) { // 10% chance of fumble
      baseStats.fum_lost = 1;
      ptsStd -= 2;
    }

    baseStats.pts_std = Math.round(ptsStd * 100) / 100;
    baseStats.pts_ppr = Math.round((ptsStd + ptsPpr) * 100) / 100;
    baseStats.pts_half_ppr = Math.round((ptsStd + ptsHalfPpr) * 100) / 100;
    baseStats.gms_active = 1;

    return { ...baseStats, ...overrides };
  }

  /**
   * Generate league data
   */
  static createLeague(overrides: Partial<SleeperLeague> = {}): SleeperLeague {
    const currentYear = new Date().getFullYear();
    const leagueId = `league_${this.randomInt(100000, 999999)}`;
    
    return {
      total_rosters: 12,
      status: this.randomChoice(['pre_draft', 'drafting', 'in_season', 'complete']),
      sport: 'nfl',
      settings: {
        num_teams: 12,
        playoff_teams: 6,
        playoff_week_start: 15,
        draft_rounds: 25, // Dynasty league
        leg: 1,
        start_week: 1,
        trade_deadline: 13,
        waiver_type: 2, // FAAB
        waiver_clear_days: 1,
        playoff_type: 0,
        playoff_round_type: 0,
        playoff_seed_type: 0,
        reserve_slots: 3,
        offseason_adds: 0,
        total_budget: 100,
        waiver_budget: 100
      },
      season_type: 'regular',
      season: currentYear.toString(),
      scoring_settings: {
        pass_yd: 0.04,
        pass_td: 4,
        pass_int: -2,
        rush_yd: 0.1,
        rush_td: 6,
        rec: 1, // PPR
        rec_yd: 0.1,
        rec_td: 6,
        fum_lost: -2,
        xpm: 1,
        fgm_0_19: 3,
        fgm_20_29: 3,
        fgm_30_39: 3,
        fgm_40_49: 4,
        fgm_50p: 5
      },
      roster_positions: [
        'QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'K', 'DEF',
        'BN', 'BN', 'BN', 'BN', 'BN', 'BN', 'BN', 'BN', 'BN', 'BN',
        'BN', 'BN', 'BN', 'BN', 'BN', 'IR'
      ],
      previous_league_id: null,
      name: `Dynasty League ${this.randomInt(1, 100)}`,
      league_id: leagueId,
      draft_id: `draft_${this.randomInt(100000, 999999)}`,
      avatar: null,
      ...overrides
    };
  }

  /**
   * Generate roster data
   */
  static createRoster(
    rosterId: number, 
    ownerId: string, 
    leagueId: string, 
    playerPool: Record<string, SleeperPlayer>,
    overrides: Partial<SleeperRoster> = {}
  ): SleeperRoster {
    const allPlayerIds = Object.keys(playerPool);
    const rosterSize = 25;
    const starterCount = 9;
    
    // Randomly select players for this roster
    const shuffled = [...allPlayerIds].sort(() => this.seededRandom() - 0.5);
    const rosterPlayers = shuffled.slice(0, rosterSize);
    const starters = rosterPlayers.slice(0, starterCount);
    const bench = rosterPlayers.slice(starterCount, 22);
    const reserve = rosterPlayers.slice(22, 25);

    return {
      roster_id: rosterId,
      owner_id: ownerId,
      league_id: leagueId,
      players: rosterPlayers,
      starters: starters,
      reserve: reserve,
      taxi: [], // Dynasty taxi squad
      settings: {
        wins: this.randomInt(0, 12),
        losses: this.randomInt(0, 12),
        ties: 0,
        fpts: this.randomInt(1200, 1800),
        fpts_against: this.randomInt(1200, 1800),
        fpts_decimal: Math.round(this.seededRandom() * 100) / 100,
        fpts_against_decimal: Math.round(this.seededRandom() * 100) / 100,
        total_budget: 100,
        budget: this.randomInt(60, 100),
        waiver_position: this.randomInt(1, 12),
        waiver_budget_used: this.randomInt(0, 40)
      },
      ...overrides
    };
  }

  /**
   * Generate user data
   */
  static createUser(userId: string, overrides: Partial<SleeperUser> = {}): SleeperUser {
    const usernames = [
      'dynasty_king', 'fantasy_guru', 'champion_23', 'rookie_hunter', 'trade_master',
      'waiver_wire_hero', 'draft_genius', 'sleeper_pick', 'playoff_bound', 'title_town',
      'fantasy_legend', 'dynasty_builder'
    ];

    const teamNames = [
      'Dynasty Destroyers', 'Championship Chasers', 'Rookie Wranglers', 'Trade Titans',
      'Waiver Warriors', 'Draft Demons', 'Sleeper Slayers', 'Playoff Predators',
      'Title Hunters', 'Fantasy Phenoms', 'Dynasty Dominators', 'Victory Vultures'
    ];

    return {
      user_id: userId,
      username: this.randomChoice(usernames) + '_' + this.randomInt(1, 999),
      display_name: `Manager ${this.randomInt(1, 999)}`,
      avatar: null,
      metadata: {
        team_name: this.randomChoice(teamNames),
        mascot_name: `Mascot ${this.randomInt(1, 100)}`,
        mascot_message: 'Ready to dominate!',
        mention_pn: 'on',
        allow_pn: 'on'
      },
      ...overrides
    };
  }

  /**
   * Generate transaction data
   */
  static createTransaction(
    leagueId: string,
    participantIds: string[],
    type: 'trade' | 'waiver' | 'free_agent' = 'trade',
    overrides: Partial<SleeperTransaction> = {}
  ): SleeperTransaction {
    const transactionId = `txn_${this.transactionIdCounter++}`;
    const now = Date.now();
    const createdTime = now - this.randomInt(0, 7 * 24 * 60 * 60 * 1000); // Within last week

    const rosterIds = participantIds.map((_, index) => index + 1);
    
    let adds: Record<string, number> = {};
    let drops: Record<string, number> = {};

    if (type === 'trade') {
      // Generate trade scenario
      adds[`player_${this.randomInt(1, 100)}`] = rosterIds[0];
      adds[`player_${this.randomInt(101, 200)}`] = rosterIds[1];
      drops[`player_${this.randomInt(201, 300)}`] = rosterIds[1];
      drops[`player_${this.randomInt(301, 400)}`] = rosterIds[0];
    } else {
      // Generate waiver/free agent scenario
      adds[`player_${this.randomInt(1, 100)}`] = rosterIds[0];
      if (this.seededRandom() > 0.5) {
        drops[`player_${this.randomInt(201, 300)}`] = rosterIds[0];
      }
    }

    return {
      transaction_id: transactionId,
      type,
      status: this.randomChoice(['complete', 'processing']),
      creator: participantIds[0],
      created: createdTime,
      roster_ids: rosterIds,
      adds,
      drops,
      settings: type === 'waiver' ? { waiver_budget: this.randomInt(1, 20) } : {},
      draft_picks: type === 'trade' && this.seededRandom() > 0.7 ? [{
        season: '2025',
        round: this.randomInt(1, 5),
        roster_id: rosterIds[0],
        previous_owner_id: rosterIds[1],
        owner_id: rosterIds[0]
      }] : undefined,
      ...overrides
    };
  }

  /**
   * Generate matchup data
   */
  static createMatchup(
    rosterId: number,
    matchupId: number,
    playerPool: Record<string, SleeperPlayer>,
    overrides: Partial<SleeperMatchup> = {}
  ): SleeperMatchup {
    const starters = Object.keys(playerPool).slice(0, 9);
    const starterPoints = starters.map(() => this.randomInt(0, 30));
    const totalPoints = starterPoints.reduce((sum, points) => sum + points, 0);
    
    const playersPoints: Record<string, number> = {};
    starters.forEach((playerId, index) => {
      playersPoints[playerId] = starterPoints[index];
    });

    return {
      roster_id: rosterId,
      matchup_id: matchupId,
      points: totalPoints,
      points_decimal: Math.round(this.seededRandom() * 100) / 100,
      starters: starters,
      starters_points: starterPoints,
      players: starters,
      players_points: playersPoints,
      custom_points: null,
      ...overrides
    };
  }

  /**
   * Generate trending players data
   */
  static createTrendingPlayers(count: number = 25): TrendingPlayers[] {
    const trending: TrendingPlayers[] = [];
    
    for (let i = 0; i < count; i++) {
      trending.push({
        count: this.randomInt(50, 500),
        player_id: `player_${this.randomInt(1, 1000)}`
      } as TrendingPlayers);
    }
    
    return trending.sort((a, b) => b.count - a.count);
  }

  /**
   * Generate NFL state data
   */
  static createNFLState(overrides: Partial<NFLState> = {}): NFLState {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    
    // Determine season type based on month
    let seasonType: 'pre' | 'regular' | 'post' = 'regular';
    let week = this.randomInt(1, 18);
    
    if (currentMonth <= 8) {
      seasonType = 'pre';
      week = this.randomInt(1, 4);
    } else if (currentMonth >= 12 || currentMonth <= 1) {
      seasonType = 'post';
      week = this.randomInt(19, 22);
    }

    return {
      week,
      season_type: seasonType,
      season: currentYear.toString(),
      previous_season: (currentYear - 1).toString(),
      leg: 1,
      season_start_date: `${currentYear}-09-07`,
      season_end_date: `${currentYear + 1}-02-12`,
      week_start_date: `${currentYear}-${(currentMonth).toString().padStart(2, '0')}-01`,
      week_end_date: `${currentYear}-${(currentMonth).toString().padStart(2, '0')}-07`,
      ...overrides
    };
  }

  /**
   * Generate complete test scenario for D'Amato Dynasty League
   */
  static createDamatoDynastyScenario(): {
    players: Record<string, SleeperPlayer>;
    league: SleeperLeague;
    users: SleeperUser[];
    rosters: SleeperRoster[];
    transactions: SleeperTransaction[];
    matchups: SleeperMatchup[];
    nflState: NFLState;
  } {
    // Set reproducible seed for consistent test data
    this.setSeed(42);

    // Generate players
    const players = this.createPlayers(300);

    // Generate D'Amato Dynasty League
    const league = this.createLeague({
      name: "D'Amato Dynasty League",
      total_rosters: 12,
      settings: {
        ...this.createLeague().settings,
        draft_rounds: 25,
        reserve_slots: 3,
        playoff_teams: 6,
        playoff_week_start: 15
      }
    });

    // Generate users
    const users: SleeperUser[] = [];
    for (let i = 1; i <= 12; i++) {
      users.push(this.createUser(`user_${i}`, {
        username: `damato_member_${i}`,
        display_name: `Dynasty Manager ${i}`,
        metadata: {
          team_name: `Dynasty Team ${i}`,
          mascot_name: `Mascot ${i}`
        }
      }));
    }

    // Generate rosters
    const rosters: SleeperRoster[] = [];
    for (let i = 1; i <= 12; i++) {
      rosters.push(this.createRoster(i, `user_${i}`, league.league_id, players));
    }

    // Generate transactions
    const transactions: SleeperTransaction[] = [];
    for (let i = 0; i < 20; i++) {
      const participantCount = this.randomInt(2, 4);
      const participants: string[] = [];
      for (let j = 0; j < participantCount; j++) {
        participants.push(`user_${this.randomInt(1, 12)}`);
      }
      
      const transactionType = this.randomChoice(['trade', 'waiver', 'free_agent']) as 'trade' | 'waiver' | 'free_agent';
      transactions.push(this.createTransaction(league.league_id, participants, transactionType));
    }

    // Generate matchups for current week
    const matchups: SleeperMatchup[] = [];
    for (let i = 1; i <= 12; i++) {
      const matchupId = Math.ceil(i / 2); // Pair teams
      matchups.push(this.createMatchup(i, matchupId, players));
    }

    // Generate NFL state
    const nflState = this.createNFLState();

    return {
      players,
      league,
      users,
      rosters,
      transactions,
      matchups,
      nflState
    };
  }

  /**
   * Generate edge case scenarios for testing
   */
  static createEdgeCaseScenarios(): {
    injuredPlayers: Record<string, SleeperPlayer>;
    tradeScenarios: SleeperTransaction[];
    byeWeekPlayers: Record<string, SleeperPlayer>;
    rookiePlayers: Record<string, SleeperPlayer>;
  } {
    this.setSeed(999);

    // Injured players
    const injuredPlayers: Record<string, SleeperPlayer> = {};
    for (let i = 0; i < 10; i++) {
      const player = this.createPlayer({
        injury_status: this.randomChoice(['Questionable', 'Doubtful', 'Out']),
        injury_body_part: this.randomChoice(['Knee', 'Shoulder', 'Ankle', 'Hamstring']),
        status: this.randomChoice(['Active', 'Injured Reserve'])
      });
      injuredPlayers[player.player_id] = player;
    }

    // Complex trade scenarios
    const tradeScenarios: SleeperTransaction[] = [];
    
    // Multi-team trade
    tradeScenarios.push(this.createTransaction('league_test', ['user_1', 'user_2', 'user_3'], 'trade', {
      adds: {
        'player_1': 1,
        'player_2': 2,
        'player_3': 3
      },
      drops: {
        'player_4': 2,
        'player_5': 3,
        'player_6': 1
      },
      draft_picks: [
        {
          season: '2025',
          round: 1,
          roster_id: 1,
          previous_owner_id: 2,
          owner_id: 1
        },
        {
          season: '2025',
          round: 2,
          roster_id: 3,
          previous_owner_id: 1,
          owner_id: 3
        }
      ]
    }));

    // Bye week players (simulate week where certain teams are on bye)
    const byeWeekTeams = ['KC', 'PHI', 'SF', 'DAL'];
    const byeWeekPlayers: Record<string, SleeperPlayer> = {};
    for (let i = 0; i < 20; i++) {
      const player = this.createPlayer({
        team: this.randomChoice(byeWeekTeams)
      });
      byeWeekPlayers[player.player_id] = player;
    }

    // Rookie players
    const rookiePlayers: Record<string, SleeperPlayer> = {};
    for (let i = 0; i < 15; i++) {
      const player = this.createPlayer({
        years_exp: 0,
        age: 22
      });
      rookiePlayers[player.player_id] = player;
    }

    return {
      injuredPlayers,
      tradeScenarios,
      byeWeekPlayers,
      rookiePlayers
    };
  }
}
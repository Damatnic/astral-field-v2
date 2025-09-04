// Comprehensive mock data for all Astral Field agents

export const mockUsers = [
  {
    id: 'user-1',
    username: 'commissioner',
    email: 'commissioner@example.com',
    full_name: 'League Commissioner',
    avatar_url: 'https://example.com/avatar1.jpg',
    created_at: '2025-09-01T10:00:00Z',
    updated_at: '2025-09-01T10:00:00Z'
  },
  {
    id: 'user-2',
    username: 'player1',
    email: 'player1@example.com',
    full_name: 'Player One',
    avatar_url: 'https://example.com/avatar2.jpg',
    created_at: '2025-09-01T11:00:00Z',
    updated_at: '2025-09-01T11:00:00Z'
  },
  {
    id: 'user-3',
    username: 'player2',
    email: 'player2@example.com',
    full_name: 'Player Two',
    avatar_url: 'https://example.com/avatar3.jpg',
    created_at: '2025-09-01T12:00:00Z',
    updated_at: '2025-09-01T12:00:00Z'
  },
  {
    id: 'user-4',
    username: 'player3',
    email: 'player3@example.com',
    full_name: 'Player Three',
    avatar_url: 'https://example.com/avatar4.jpg',
    created_at: '2025-09-01T13:00:00Z',
    updated_at: '2025-09-01T13:00:00Z'
  }
]

export const mockLeagues = [
  {
    id: 'league-1',
    name: 'The Championship League',
    description: 'A competitive 12-team PPR league',
    commissioner_id: 'user-1',
    max_teams: 12,
    draft_date: '2025-09-15T14:00:00Z',
    season_year: 2025,
    league_type: 'ppr',
    scoring_settings: {
      passing_yards: 0.04,
      passing_touchdowns: 4,
      passing_interceptions: -2,
      rushing_yards: 0.1,
      rushing_touchdowns: 6,
      receiving_yards: 0.1,
      receiving_touchdowns: 6,
      receptions: 1, // PPR
      fumbles_lost: -2,
      two_point_conversions: 2,
      defensive_touchdowns: 6,
      kicking_extra_points: 1,
      kicking_field_goals_0_39: 3,
      kicking_field_goals_40_49: 4,
      kicking_field_goals_50_plus: 5
    },
    league_settings: {
      roster_size: 16,
      starting_lineup: {
        QB: 1,
        RB: 2,
        WR: 2,
        TE: 1,
        FLEX: 1,
        DST: 1,
        K: 1
      },
      bench_size: 7,
      waiver_period: 2,
      trade_deadline: '2025-11-15T23:59:59Z',
      playoff_teams: 6,
      playoff_weeks: [15, 16, 17]
    },
    status: 'draft',
    created_at: '2025-09-01T10:00:00Z',
    updated_at: '2025-09-01T10:00:00Z'
  },
  {
    id: 'league-2',
    name: 'Standard Scoring League',
    description: 'A casual standard scoring league',
    commissioner_id: 'user-2',
    max_teams: 10,
    draft_date: '2025-09-20T19:00:00Z',
    season_year: 2025,
    league_type: 'standard',
    scoring_settings: {
      passing_yards: 0.04,
      passing_touchdowns: 4,
      passing_interceptions: -2,
      rushing_yards: 0.1,
      rushing_touchdowns: 6,
      receiving_yards: 0.1,
      receiving_touchdowns: 6,
      receptions: 0, // Standard
      fumbles_lost: -2
    },
    league_settings: {
      roster_size: 15,
      starting_lineup: {
        QB: 1,
        RB: 2,
        WR: 3,
        TE: 1,
        FLEX: 1,
        DST: 1,
        K: 1
      },
      bench_size: 6,
      waiver_period: 1,
      trade_deadline: '2025-11-20T23:59:59Z'
    },
    status: 'active',
    created_at: '2025-09-02T10:00:00Z',
    updated_at: '2025-09-02T10:00:00Z'
  }
]

export const mockNFLPlayers = [
  {
    id: 'player-1',
    name: 'Christian McCaffrey',
    position: 'RB',
    team: 'SF',
    jersey_number: 23,
    height: '5-11',
    weight: 205,
    age: 28,
    experience: 7,
    adp: 1.2,
    projected_points: 285.5,
    bye_week: 9,
    injury_status: 'healthy',
    last_season_stats: {
      games_played: 16,
      rushing_yards: 1459,
      rushing_touchdowns: 14,
      receiving_yards: 564,
      receiving_touchdowns: 7,
      receptions: 67,
      fantasy_points: 276.8
    }
  },
  {
    id: 'player-2',
    name: 'Josh Allen',
    position: 'QB',
    team: 'BUF',
    jersey_number: 17,
    height: '6-5',
    weight: 237,
    age: 27,
    experience: 6,
    adp: 2.8,
    projected_points: 275.2,
    bye_week: 12,
    injury_status: 'healthy',
    last_season_stats: {
      games_played: 17,
      passing_yards: 4306,
      passing_touchdowns: 29,
      passing_interceptions: 18,
      rushing_yards: 523,
      rushing_touchdowns: 15,
      fantasy_points: 268.4
    }
  },
  {
    id: 'player-3',
    name: 'Tyreek Hill',
    position: 'WR',
    team: 'MIA',
    jersey_number: 10,
    height: '5-10',
    weight: 185,
    age: 30,
    experience: 8,
    adp: 3.1,
    projected_points: 265.8,
    bye_week: 6,
    injury_status: 'healthy',
    last_season_stats: {
      games_played: 16,
      receiving_yards: 1799,
      receiving_touchdowns: 13,
      receptions: 119,
      rushing_yards: 33,
      rushing_touchdowns: 1,
      fantasy_points: 261.2
    }
  },
  {
    id: 'player-4',
    name: 'Travis Kelce',
    position: 'TE',
    team: 'KC',
    jersey_number: 87,
    height: '6-5',
    weight: 260,
    age: 34,
    experience: 11,
    adp: 4.5,
    projected_points: 245.7,
    bye_week: 10,
    injury_status: 'healthy',
    last_season_stats: {
      games_played: 16,
      receiving_yards: 984,
      receiving_touchdowns: 5,
      receptions: 93,
      fantasy_points: 198.4
    }
  },
  {
    id: 'player-5',
    name: 'Stefon Diggs',
    position: 'WR',
    team: 'HOU',
    jersey_number: 1,
    height: '6-0',
    weight: 191,
    age: 30,
    experience: 9,
    adp: 12.3,
    projected_points: 235.4,
    bye_week: 14,
    injury_status: 'healthy',
    last_season_stats: {
      games_played: 16,
      receiving_yards: 1183,
      receiving_touchdowns: 8,
      receptions: 107,
      fantasy_points: 218.3
    }
  }
]

export const mockTeams = [
  {
    id: 'team-1',
    league_id: 'league-1',
    owner_id: 'user-1',
    name: 'The Champions',
    logo_url: 'https://example.com/logo1.png',
    wins: 0,
    losses: 0,
    ties: 0,
    points_for: 0,
    points_against: 0,
    draft_position: 1,
    created_at: '2025-09-01T10:00:00Z',
    updated_at: '2025-09-01T10:00:00Z'
  },
  {
    id: 'team-2',
    league_id: 'league-1',
    owner_id: 'user-2',
    name: 'Fantasy Legends',
    logo_url: 'https://example.com/logo2.png',
    wins: 0,
    losses: 0,
    ties: 0,
    points_for: 0,
    points_against: 0,
    draft_position: 2,
    created_at: '2025-09-01T11:00:00Z',
    updated_at: '2025-09-01T11:00:00Z'
  },
  {
    id: 'team-3',
    league_id: 'league-1',
    owner_id: 'user-3',
    name: 'Touchdown Titans',
    logo_url: 'https://example.com/logo3.png',
    wins: 0,
    losses: 0,
    ties: 0,
    points_for: 0,
    points_against: 0,
    draft_position: 3,
    created_at: '2025-09-01T12:00:00Z',
    updated_at: '2025-09-01T12:00:00Z'
  },
  {
    id: 'team-4',
    league_id: 'league-1',
    owner_id: 'user-4',
    name: 'Gridiron Gods',
    logo_url: 'https://example.com/logo4.png',
    wins: 0,
    losses: 0,
    ties: 0,
    points_for: 0,
    points_against: 0,
    draft_position: 4,
    created_at: '2025-09-01T13:00:00Z',
    updated_at: '2025-09-01T13:00:00Z'
  }
]

export const mockRosters = [
  {
    id: 'roster-1',
    team_id: 'team-1',
    league_id: 'league-1',
    players: [],
    starting_lineup: {},
    bench: [],
    created_at: '2025-09-01T10:00:00Z',
    updated_at: '2025-09-01T10:00:00Z'
  }
]

export const mockDraftPicks = [
  {
    id: 'pick-1',
    league_id: 'league-1',
    team_id: 'team-1',
    player_id: 'player-1',
    round: 1,
    pick_number: 1,
    draft_position: 1,
    timestamp: '2025-09-15T14:00:30Z'
  },
  {
    id: 'pick-2',
    league_id: 'league-1',
    team_id: 'team-2',
    player_id: 'player-2',
    round: 1,
    pick_number: 2,
    draft_position: 2,
    timestamp: '2025-09-15T14:02:15Z'
  }
]

export const mockMatchups = [
  {
    id: 'matchup-1',
    league_id: 'league-1',
    week: 1,
    team1_id: 'team-1',
    team2_id: 'team-2',
    team1_score: 0,
    team2_score: 0,
    status: 'pending',
    created_at: '2025-09-01T10:00:00Z'
  },
  {
    id: 'matchup-2',
    league_id: 'league-1',
    week: 1,
    team1_id: 'team-3',
    team2_id: 'team-4',
    team1_score: 0,
    team2_score: 0,
    status: 'pending',
    created_at: '2025-09-01T10:00:00Z'
  }
]

export const mockTrades = [
  {
    id: 'trade-1',
    league_id: 'league-1',
    proposing_team_id: 'team-1',
    receiving_team_id: 'team-2',
    proposed_players: ['player-1'],
    requested_players: ['player-2'],
    status: 'pending',
    proposed_at: '2025-09-10T15:30:00Z',
    expires_at: '2025-09-12T15:30:00Z'
  }
]

export const mockWaivers = [
  {
    id: 'waiver-1',
    league_id: 'league-1',
    team_id: 'team-1',
    player_id: 'player-5',
    waiver_priority: 1,
    status: 'pending',
    submitted_at: '2025-09-10T08:00:00Z',
    processes_at: '2025-09-11T12:00:00Z'
  }
]

export const mockPlayerStats = [
  {
    id: 'stats-1',
    player_id: 'player-1',
    week: 1,
    season: 2025,
    game_stats: {
      rushing_yards: 89,
      rushing_touchdowns: 1,
      receiving_yards: 45,
      receiving_touchdowns: 0,
      receptions: 4,
      fumbles_lost: 0
    },
    fantasy_points: 17.4,
    updated_at: '2025-09-08T22:00:00Z'
  }
]

// Utility functions for test data
export const createMockUser = (overrides: Partial<typeof mockUsers[0]> = {}) => ({
  ...mockUsers[0],
  ...overrides,
  id: `user-${Date.now()}`,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
})

export const createMockLeague = (overrides: Partial<typeof mockLeagues[0]> = {}) => ({
  ...mockLeagues[0],
  ...overrides,
  id: `league-${Date.now()}`,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
})

export const createMockTeam = (overrides: Partial<typeof mockTeams[0]> = {}) => ({
  ...mockTeams[0],
  ...overrides,
  id: `team-${Date.now()}`,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
})

export const createMockPlayer = (overrides: Partial<typeof mockNFLPlayers[0]> = {}) => ({
  ...mockNFLPlayers[0],
  ...overrides,
  id: `player-${Date.now()}`
})

// Mock API responses
export const mockAPIResponses = {
  getLeagues: {
    data: mockLeagues,
    error: null
  },
  getLeague: {
    data: mockLeagues[0],
    error: null
  },
  createLeague: {
    data: mockLeagues[0],
    error: null
  },
  updateLeague: {
    data: { ...mockLeagues[0], name: 'Updated League Name' },
    error: null
  },
  deleteLeague: {
    data: null,
    error: null
  },
  joinLeague: {
    data: { id: 'member-1', league_id: 'league-1', user_id: 'user-2' },
    error: null
  }
}

// WebSocket mock events
export const mockWebSocketEvents = {
  draftPick: {
    type: 'draft_pick',
    data: mockDraftPicks[0]
  },
  playerUpdate: {
    type: 'player_update',
    data: {
      player_id: 'player-1',
      field: 'injury_status',
      old_value: 'healthy',
      new_value: 'questionable'
    }
  },
  tradeProposal: {
    type: 'trade_proposal',
    data: mockTrades[0]
  },
  waiverClaim: {
    type: 'waiver_claim',
    data: mockWaivers[0]
  }
}
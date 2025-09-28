/**
 * Zenith Test Fixtures - League Data
 * Comprehensive test data for league-related tests
 */

export const createMockLeague = () => ({
  id: 'test-league-1',
  name: 'Test Fantasy League',
  sport: 'nfl',
  season: '2024',
  seasonType: 'regular',
  totalRosters: 12,
  status: 'in_season',
  settings: {
    maxKeepers: 2,
    draftSettings: {
      type: 'snake',
      order: null,
      rounds: 16
    },
    rosterPositions: ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'K', 'DEF'],
    waiver: {
      type: 'rolling',
      clearDays: 2
    },
    trade: {
      deadline: 12,
      reviewDays: 2
    }
  },
  scoring: {
    passingYards: 0.04,
    passingTouchdowns: 4,
    interceptions: -2,
    rushingYards: 0.1,
    rushingTouchdowns: 6,
    receivingYards: 0.1,
    receivingTouchdowns: 6,
    fumbles: -2
  },
  createdBy: 'test-user-1',
  createdAt: new Date('2024-08-01'),
  updatedAt: new Date('2024-09-01'),
  draftId: 'test-draft-1',
  currentWeek: 4
})

export const createMockTeam = (overrides = {}) => ({
  id: 'test-team-1',
  leagueId: 'test-league-1',
  userId: 'test-user-1',
  rosterId: 1,
  displayName: 'Test Team',
  avatar: null,
  settings: {
    wins: 2,
    losses: 1,
    ties: 0,
    fpts: 342.5,
    fptsAgainst: 298.2,
    totalMoves: 5,
    totalTrades: 1
  },
  roster: {
    starters: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
    bench: ['10', '11', '12', '13', '14', '15'],
    ir: [],
    taxi: []
  },
  metadata: {
    record: '2-1-0',
    streak: 'W2',
    pointsFor: 342.5,
    pointsAgainst: 298.2,
    divisionRank: 1,
    playoffSeed: 2
  },
  coOwners: [],
  createdAt: new Date('2024-08-01'),
  updatedAt: new Date('2024-09-27'),
  ...overrides
})

export const createMockRoster = (teamId = 'test-team-1', overrides = {}) => ({
  teamId,
  starters: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
  bench: ['10', '11', '12', '13', '14', '15'],
  ir: [],
  taxi: [],
  reserve: [],
  keepers: [],
  metadata: {
    totalValue: 85.5,
    weeklyProjection: 112.3,
    injuryCount: 1,
    byeWeekCount: 2
  },
  ...overrides
})

export const createMockMatchup = (week = 4, overrides = {}) => ({
  id: `matchup-${week}-1`,
  leagueId: 'test-league-1',
  week,
  matchupId: 1,
  rosterId: 1,
  points: 112.5,
  pointsDecimal: 112.54,
  projectedPoints: 108.2,
  starters: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
  starterPoints: [24.5, 12.8, 8.2, 15.6, 18.9, 6.4, 11.2, 8.0, 6.9],
  bench: ['10', '11', '12', '13', '14', '15'],
  benchPoints: [3.2, 0, 8.4, 12.1, 0, 4.7],
  playersPoints: {
    '1': 24.5,
    '2': 12.8,
    '3': 8.2,
    '4': 15.6,
    '5': 18.9,
    '6': 6.4,
    '7': 11.2,
    '8': 8.0,
    '9': 6.9,
    '10': 3.2,
    '11': 0,
    '12': 8.4,
    '13': 12.1,
    '14': 0,
    '15': 4.7
  },
  ...overrides
})

export const createMockLeagueTransaction = (overrides = {}) => ({
  id: 'transaction-1',
  leagueId: 'test-league-1',
  type: 'trade',
  status: 'complete',
  creator: 'test-user-1',
  created: Date.now(),
  leg: 1,
  consenter_ids: ['test-user-1', 'test-user-2'],
  roster_ids: [1, 2],
  draft_picks: [],
  waiver_budget: [],
  adds: {
    '1': 2
  },
  drops: {
    '2': 1
  },
  metadata: {
    notes: 'Fair trade for both teams',
    trade_id: 'trade-1'
  },
  settings: {
    waiver_type: 0,
    trade_review_days: 2,
    commissioner_direct_invite: 0
  },
  ...overrides
})

export const createMockDraft = (overrides = {}) => ({
  id: 'test-draft-1',
  leagueId: 'test-league-1',
  type: 'snake',
  status: 'complete',
  sport: 'nfl',
  season: '2024',
  seasonType: 'regular',
  settings: {
    teams: 12,
    rounds: 16,
    reversal_round: 2,
    nomination_timer: 120,
    pick_timer: 60,
    cpu_autopick: true,
    alpha_sort: false,
    enforce_position_limits: true
  },
  slot_to_roster_id: {
    1: 1,
    2: 2,
    3: 3,
    4: 4,
    5: 5,
    6: 6,
    7: 7,
    8: 8,
    9: 9,
    10: 10,
    11: 11,
    12: 12
  },
  draft_order: {
    1: 1,
    2: 2,
    3: 3,
    4: 4,
    5: 5,
    6: 6,
    7: 7,
    8: 8,
    9: 9,
    10: 10,
    11: 11,
    12: 12
  },
  start_time: Date.now() - 86400000, // 24 hours ago
  created: Date.now() - 604800000, // 1 week ago
  last_picked: Date.now() - 86400000,
  last_message_id: 'msg-123',
  last_message_time: Date.now() - 86400000,
  ...overrides
})

export const createMockPlayoffMatchup = (overrides = {}) => ({
  id: 'playoff-1',
  leagueId: 'test-league-1',
  bracket: 'winner',
  round: 1,
  team1_id: 'test-team-1',
  team2_id: 'test-team-2',
  team1_points: 142.5,
  team2_points: 128.7,
  week: 15,
  winner_id: 'test-team-1',
  loser_id: 'test-team-2',
  status: 'complete',
  ...overrides
})

// Factory functions for bulk test data creation
export const createMockLeagueRosters = (count = 12) => {
  return Array.from({ length: count }, (_, index) => 
    createMockTeam({
      id: `test-team-${index + 1}`,
      rosterId: index + 1,
      userId: `test-user-${index + 1}`,
      displayName: `Team ${index + 1}`
    })
  )
}

export const createMockWeekMatchups = (week = 4, teamCount = 12) => {
  const matchups = []
  for (let i = 0; i < teamCount; i++) {
    matchups.push(createMockMatchup(week, {
      rosterId: i + 1,
      matchupId: Math.floor(i / 2) + 1,
      points: Math.random() * 40 + 80 // Random points between 80-120
    }))
  }
  return matchups
}

export const createMockDraftPicks = (draftId = 'test-draft-1') => {
  const picks = []
  const playerIds = Array.from({ length: 192 }, (_, i) => `${i + 1}`)
  
  for (let round = 1; round <= 16; round++) {
    for (let pick = 1; pick <= 12; pick++) {
      const pickNumber = (round - 1) * 12 + pick
      const rosterId = round % 2 === 1 ? pick : 13 - pick // Snake draft logic
      
      picks.push({
        draft_id: draftId,
        round,
        draft_slot: pick,
        pick_no: pickNumber,
        player_id: playerIds[pickNumber - 1],
        picked_by: `test-user-${rosterId}`,
        roster_id: rosterId,
        is_keeper: false,
        metadata: {
          team: 'NFL',
          status: 'Healthy',
          sport: 'nfl',
          position: ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'][Math.floor(Math.random() * 6)],
          player_id: playerIds[pickNumber - 1],
          amount: null
        }
      })
    }
  }
  
  return picks
}
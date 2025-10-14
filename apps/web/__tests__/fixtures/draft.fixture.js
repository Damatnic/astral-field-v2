/**
 * Zenith Draft Test Fixtures
 * Standardized draft data for consistent testing
 */

export const createMockDraft = (overrides = {}) => ({
  id: 'draft-1',
  leagueId: 'league-1',
  status: 'SCHEDULED',
  type: 'SNAKE',
  settings: {
    timePerPick: 90,
    totalRounds: 16,
    randomizeOrder: false,
  },
  currentRound: 1,
  currentPick: 1,
  currentTeamId: 'team-1',
  timeRemaining: 90,
  totalRounds: 16,
  timePerPick: 90,
  startedAt: null,
  pausedAt: null,
  completedAt: null,
  createdAt: new Date('2024-08-01'),
  updatedAt: new Date('2024-08-01'),
  ...overrides,
})

export const createMockDraftOrder = (teamCount = 12) => {
  return Array.from({ length: teamCount }, (_, index) => ({
    id: `order-${index + 1}`,
    draftId: 'draft-1',
    teamId: `team-${index + 1}`,
    pickOrder: index + 1,
  }))
}

export const createMockDraftPick = (overrides = {}) => ({
  id: 'pick-1',
  draftId: 'draft-1',
  pickNumber: 1,
  round: 1,
  pickInRound: 1,
  teamId: 'team-1',
  playerId: 'player-1',
  timeUsed: 30,
  isAutoPick: false,
  autoPickReason: null,
  pickMadeAt: new Date(),
  ...overrides,
})

export const createMockDraftPicks = (rounds = 2, teamsPerRound = 12) => {
  const picks = []
  let pickNumber = 1
  
  for (let round = 1; round <= rounds; round++) {
    const isSnakeRound = round % 2 === 0
    
    for (let pickInRound = 1; pickInRound <= teamsPerRound; pickInRound++) {
      const teamIndex = isSnakeRound 
        ? teamsPerRound - pickInRound + 1 
        : pickInRound
      
      picks.push(createMockDraftPick({
        id: `pick-${pickNumber}`,
        pickNumber,
        round,
        pickInRound,
        teamId: `team-${teamIndex}`,
        playerId: pickNumber <= 24 ? `player-${pickNumber}` : null, // First 2 rounds have picks
        isAutoPick: pickNumber % 10 === 0, // Every 10th pick is auto
        timeUsed: pickNumber <= 24 ? Math.floor(Math.random() * 90) + 10 : 0,
      }))
      
      pickNumber++
    }
  }
  
  return picks
}

export const createMockDraftState = (overrides = {}) => ({
  currentPick: 3,
  currentRound: 1,
  currentTeamId: 'team-3',
  timeRemaining: 75,
  draftOrder: ['team-1', 'team-2', 'team-3', 'team-4'],
  picks: [
    {
      pick: 1,
      round: 1,
      teamId: 'team-1',
      playerId: 'qb-1',
      playerName: 'Josh Allen',
      position: 'QB',
      isAutoPick: false,
    },
    {
      pick: 2,
      round: 1,
      teamId: 'team-2',
      playerId: 'rb-1',
      playerName: 'Christian McCaffrey',
      position: 'RB',
      isAutoPick: false,
    },
  ],
  status: 'IN_PROGRESS',
  totalPicks: 192,
  completedPicks: 2,
  ...overrides,
})

export const mockDraftSettings = {
  snake: {
    type: 'SNAKE',
    timePerPick: 90,
    totalRounds: 16,
    randomizeOrder: false,
  },
  auction: {
    type: 'AUCTION',
    timePerNomination: 60,
    timePerBid: 30,
    budget: 200,
    minBid: 1,
  },
  linear: {
    type: 'LINEAR',
    timePerPick: 120,
    totalRounds: 16,
    randomizeOrder: true,
  },
}

export const createMockDraftEvent = (overrides = {}) => ({
  type: 'PICK_MADE',
  draftId: 'draft-1',
  teamId: 'team-1',
  playerId: 'player-1',
  pickNumber: 1,
  round: 1,
  timeUsed: 45,
  isAutoPick: false,
  timestamp: new Date(),
  ...overrides,
})

export const mockDraftWebSocketEvents = {
  pickMade: {
    type: 'pick_made',
    data: {
      pickNumber: 3,
      round: 1,
      teamId: 'team-3',
      playerId: 'wr-1',
      playerName: 'Tyreek Hill',
      position: 'WR',
      timeUsed: 62,
      isAutoPick: false,
    },
  },
  timeUpdate: {
    type: 'time_update',
    data: {
      timeRemaining: 45,
      currentTeamId: 'team-3',
    },
  },
  draftPaused: {
    type: 'draft_paused',
    data: {
      reason: 'Commissioner paused draft',
      pausedBy: 'user-1',
    },
  },
  draftResumed: {
    type: 'draft_resumed',
    data: {
      resumedBy: 'user-1',
    },
  },
  autoPick: {
    type: 'auto_pick',
    data: {
      pickNumber: 10,
      round: 1,
      teamId: 'team-10',
      playerId: 'te-1',
      playerName: 'Travis Kelce',
      position: 'TE',
      reason: 'Time expired',
      isAutoPick: true,
    },
  },
}

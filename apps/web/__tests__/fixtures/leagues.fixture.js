/**
 * Zenith League Test Fixtures
 * Standardized league and team data for consistent testing
 */

export const createMockLeague = (overrides = {}) => ({
  id: 'league-1',
  name: 'Test Championship League',
  commissionerId: 'user-1',
  settings: {
    teamCount: 12,
    rosterSize: 16,
    startingLineup: {
      QB: 1,
      RB: 2,
      WR: 2,
      TE: 1,
      FLEX: 1,
      K: 1,
      DEF: 1,
      BENCH: 7,
    },
  },
  scoringSettings: {
    passingYards: 0.04,
    passingTds: 4,
    interceptions: -2,
    rushingYards: 0.1,
    rushingTds: 6,
    receivingYards: 0.1,
    receivingTds: 6,
    receptions: 1,
  },
  rosterSettings: {
    maxRoster: 16,
    maxIR: 2,
    waiverBudget: 1000,
  },
  draftSettings: {
    type: 'SNAKE',
    timePerPick: 90,
    date: new Date('2024-08-15'),
  },
  currentWeek: 1,
  season: '2024',
  isActive: true,
  draftDate: new Date('2024-08-15'),
  playoffs: false,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
})

export const createMockTeam = (overrides = {}) => ({
  id: 'team-1',
  name: 'Fire Breathing Rubber Ducks',
  logo: null,
  ownerId: 'user-1',
  leagueId: 'league-1',
  wins: 0,
  losses: 0,
  ties: 0,
  pointsFor: 0,
  pointsAgainst: 0,
  standing: 1,
  playoffSeed: null,
  waiverPriority: 10,
  faabBudget: 1000,
  faabSpent: 0,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
})

export const createMockLeagueWithTeams = (teamCount = 12) => {
  const league = createMockLeague()
  const teams = Array.from({ length: teamCount }, (_, index) => 
    createMockTeam({
      id: `team-${index + 1}`,
      name: `Team ${index + 1}`,
      ownerId: `user-${index + 1}`,
      standing: index + 1,
      waiverPriority: teamCount - index,
    })
  )
  
  return {
    ...league,
    teams,
  }
}

export const createMockMatchup = (overrides = {}) => ({
  id: 'matchup-1',
  leagueId: 'league-1',
  week: 1,
  season: '2024',
  homeTeamId: 'team-1',
  awayTeamId: 'team-2',
  homeScore: 0,
  awayScore: 0,
  isComplete: false,
  isPlayoff: false,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
})

export const createMockWeeklyMatchups = (week = 1, teamCount = 12) => {
  const matchups = []
  const teamsPerMatchup = 2
  const matchupCount = teamCount / teamsPerMatchup
  
  for (let i = 0; i < matchupCount; i++) {
    const homeTeamIndex = i * 2 + 1
    const awayTeamIndex = i * 2 + 2
    
    matchups.push(createMockMatchup({
      id: `matchup-${week}-${i + 1}`,
      week,
      homeTeamId: `team-${homeTeamIndex}`,
      awayTeamId: `team-${awayTeamIndex}`,
    }))
  }
  
  return matchups
}

export const mockLeagueSettings = {
  standard: {
    teamCount: 12,
    rosterSize: 16,
    waiverBudget: 1000,
    tradeDeadline: 'week-10',
  },
  dynasty: {
    teamCount: 12,
    rosterSize: 25,
    rookieDraft: true,
    waiverBudget: 1000,
  },
  superflex: {
    teamCount: 12,
    rosterSize: 16,
    superflexPosition: true,
    waiverBudget: 1000,
  },
}

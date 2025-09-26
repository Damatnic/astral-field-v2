/**
 * Zenith Player Test Fixtures
 * Standardized player data for consistent testing
 */

export const createMockPlayer = (overrides = {}) => ({
  id: 'player-1',
  espnId: '12345',
  yahooId: '67890',
  sleeperPlayerId: 'sleeper-123',
  name: 'Josh Allen',
  firstName: 'Josh',
  lastName: 'Allen',
  position: 'QB',
  nflTeam: 'BUF',
  team: 'BUF',
  jerseyNumber: 17,
  height: '6-5',
  weight: '237',
  age: 28,
  experience: 6,
  college: 'Wyoming',
  imageUrl: 'https://example.com/player.jpg',
  status: 'active',
  injuryStatus: null,
  injuryDetails: null,
  byeWeek: 12,
  adp: 1.2,
  rank: 1,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  dynastyRank: 1,
  isActive: true,
  isDynastyTarget: true,
  isFantasyRelevant: true,
  isRookie: false,
  lastUpdated: new Date(),
  ...overrides,
})

export const createMockPlayersByPosition = () => ({
  QB: [
    createMockPlayer({
      id: 'qb-1',
      name: 'Josh Allen',
      position: 'QB',
      nflTeam: 'BUF',
      adp: 1.2,
      rank: 1,
    }),
    createMockPlayer({
      id: 'qb-2',
      name: 'Lamar Jackson',
      position: 'QB',
      nflTeam: 'BAL',
      adp: 2.1,
      rank: 2,
    }),
    createMockPlayer({
      id: 'qb-3',
      name: 'Jalen Hurts',
      position: 'QB',
      nflTeam: 'PHI',
      adp: 3.5,
      rank: 3,
    }),
  ],
  RB: [
    createMockPlayer({
      id: 'rb-1',
      name: 'Christian McCaffrey',
      position: 'RB',
      nflTeam: 'SF',
      adp: 1.8,
      rank: 1,
    }),
    createMockPlayer({
      id: 'rb-2',
      name: 'Derrick Henry',
      position: 'RB',
      nflTeam: 'BAL',
      adp: 4.2,
      rank: 2,
    }),
    createMockPlayer({
      id: 'rb-3',
      name: 'Saquon Barkley',
      position: 'RB',
      nflTeam: 'PHI',
      adp: 5.1,
      rank: 3,
    }),
  ],
  WR: [
    createMockPlayer({
      id: 'wr-1',
      name: 'Tyreek Hill',
      position: 'WR',
      nflTeam: 'MIA',
      adp: 3.2,
      rank: 1,
    }),
    createMockPlayer({
      id: 'wr-2',
      name: 'Cooper Kupp',
      position: 'WR',
      nflTeam: 'LAR',
      adp: 5.3,
      rank: 2,
    }),
    createMockPlayer({
      id: 'wr-3',
      name: 'Davante Adams',
      position: 'WR',
      nflTeam: 'LV',
      adp: 6.8,
      rank: 3,
    }),
  ],
  TE: [
    createMockPlayer({
      id: 'te-1',
      name: 'Travis Kelce',
      position: 'TE',
      nflTeam: 'KC',
      adp: 8.5,
      rank: 1,
    }),
    createMockPlayer({
      id: 'te-2',
      name: 'Mark Andrews',
      position: 'TE',
      nflTeam: 'BAL',
      adp: 12.3,
      rank: 2,
    }),
  ],
  K: [
    createMockPlayer({
      id: 'k-1',
      name: 'Justin Tucker',
      position: 'K',
      nflTeam: 'BAL',
      adp: 180.5,
      rank: 1,
    }),
  ],
  DEF: [
    createMockPlayer({
      id: 'def-1',
      name: 'San Francisco 49ers',
      position: 'DEF',
      nflTeam: 'SF',
      adp: 165.2,
      rank: 1,
    }),
  ],
})

export const createMockProjection = (overrides = {}) => ({
  id: 'projection-1',
  playerId: 'player-1',
  week: 1,
  season: '2024',
  source: 'espn',
  projectedPoints: 18.5,
  confidence: 0.85,
  projectedStats: {
    passingYards: 275,
    passingTds: 2,
    interceptions: 0.5,
    rushingYards: 45,
    rushingTds: 0.3,
  },
  createdAt: new Date(),
  ...overrides,
})

export const createMockPlayerStats = (overrides = {}) => ({
  id: 'stats-1',
  playerId: 'player-1',
  week: 1,
  season: '2024',
  gameId: 'game-1',
  gameDate: new Date('2024-09-08'),
  opponent: 'NYJ',
  stats: {
    passingYards: 283,
    passingTds: 2,
    interceptions: 1,
    rushingYards: 54,
    rushingTds: 1,
  },
  fantasyPoints: 23.2,
  isProjection: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

export const createMockRosterPlayer = (overrides = {}) => ({
  id: 'roster-1',
  teamId: 'team-1',
  playerId: 'player-1',
  position: 'QB',
  isStarter: true,
  isLocked: false,
  acquisitionDate: new Date('2024-08-15'),
  acquisitionType: 'draft',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

export const createMockPlayerNews = (overrides = {}) => ({
  id: 'news-1',
  playerId: 'player-1',
  headline: 'Player practices in full',
  body: 'The player participated in a full practice session today.',
  source: 'ESPN',
  url: 'https://espn.com/news/123',
  publishedAt: new Date(),
  createdAt: new Date(),
  ...overrides,
})

export const mockAvailablePlayers = () => {
  const playersByPosition = createMockPlayersByPosition()
  return [
    ...playersByPosition.QB,
    ...playersByPosition.RB,
    ...playersByPosition.WR,
    ...playersByPosition.TE,
    ...playersByPosition.K,
    ...playersByPosition.DEF,
  ]
}
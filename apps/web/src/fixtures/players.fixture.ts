/**
 * Zenith Test Fixtures - Player Data
 * Comprehensive test data for player-related tests
 */

export interface MockPlayer {
  id: string
  playerId: string
  firstName: string
  lastName: string
  fullName: string
  position: string
  team: string
  jerseyNumber?: number
  height?: string
  weight?: number
  age?: number
  experience?: number
  college?: string
  status: 'Active' | 'Injured' | 'Questionable' | 'Doubtful' | 'Out' | 'Suspended'
  injuryStatus?: string
  byeWeek?: number
  fantasy: {
    projectedPoints: number
    averagePoints: number
    totalPoints: number
    gamesPlayed: number
    rank: number
    tier: number
    adp: number // Average Draft Position
    ownership: number // Percentage owned
  }
  stats: {
    [key: string]: number
  }
  news?: Array<{
    id: string
    title: string
    body: string
    impact: 'HIGH' | 'MEDIUM' | 'LOW'
    timestamp: Date
  }>
}

export interface MockRosterPlayer {
  id: string
  playerId: string
  position: string
  isStarter: boolean
  positionRank?: number
  acquisitionType?: 'DRAFT' | 'WAIVER' | 'TRADE' | 'FREE_AGENT'
  acquisitionDate?: Date
  player?: MockPlayer
}

export const createMockPlayer = (overrides: Partial<MockPlayer> = {}): MockPlayer => ({
  id: 'player-1',
  playerId: 'player-1',
  firstName: 'Josh',
  lastName: 'Allen',
  fullName: 'Josh Allen',
  position: 'QB',
  team: 'BUF',
  jerseyNumber: 17,
  height: '6-5',
  weight: 237,
  age: 27,
  experience: 6,
  college: 'Wyoming',
  status: 'Active',
  byeWeek: 12,
  fantasy: {
    projectedPoints: 18.5,
    averagePoints: 21.3,
    totalPoints: 298.2,
    gamesPlayed: 14,
    rank: 1,
    tier: 1,
    adp: 3.2,
    ownership: 99.8
  },
  stats: {
    passingYards: 4306,
    passingTouchdowns: 29,
    interceptions: 18,
    rushingYards: 524,
    rushingTouchdowns: 15,
    completions: 359,
    attempts: 567,
    completionPercentage: 63.3,
    yards: 4306,
    touchdowns: 44
  },
  news: [
    {
      id: 'news-1',
      title: 'Josh Allen leads Bills to playoff berth',
      body: 'Allen threw for 300+ yards in the win over Miami',
      impact: 'MEDIUM',
      timestamp: new Date('2024-09-20')
    }
  ],
  ...overrides
})

export const createMockRosterPlayer = (overrides: Partial<MockRosterPlayer> = {}): MockRosterPlayer => ({
  id: 'roster-player-1',
  playerId: 'player-1',
  position: 'QB',
  isStarter: true,
  positionRank: 1,
  acquisitionType: 'DRAFT',
  acquisitionDate: new Date('2024-08-25'),
  player: createMockPlayer(),
  ...overrides
})

// Predefined player data by position
export const createMockPlayersByPosition = () => ({
  QB: [
    createMockPlayer({
      id: 'qb-1',
      playerId: 'qb-1',
      firstName: 'Josh',
      lastName: 'Allen',
      fullName: 'Josh Allen',
      position: 'QB',
      team: 'BUF',
      fantasy: { projectedPoints: 18.5, averagePoints: 21.3, totalPoints: 298.2, gamesPlayed: 14, rank: 1, tier: 1, adp: 3.2, ownership: 99.8 }
    }),
    createMockPlayer({
      id: 'qb-2',
      playerId: 'qb-2',
      firstName: 'Lamar',
      lastName: 'Jackson',
      fullName: 'Lamar Jackson',
      position: 'QB',
      team: 'BAL',
      fantasy: { projectedPoints: 17.8, averagePoints: 20.1, totalPoints: 281.4, gamesPlayed: 14, rank: 2, tier: 1, adp: 4.1, ownership: 98.2 }
    })
  ],
  RB: [
    createMockPlayer({
      id: 'rb-1',
      playerId: 'rb-1',
      firstName: 'Christian',
      lastName: 'McCaffrey',
      fullName: 'Christian McCaffrey',
      position: 'RB',
      team: 'SF',
      fantasy: { projectedPoints: 16.2, averagePoints: 18.7, totalPoints: 261.8, gamesPlayed: 14, rank: 1, tier: 1, adp: 1.2, ownership: 99.9 }
    }),
    createMockPlayer({
      id: 'rb-2',
      playerId: 'rb-2',
      firstName: 'Austin',
      lastName: 'Ekeler',
      fullName: 'Austin Ekeler',
      position: 'RB',
      team: 'WSH',
      fantasy: { projectedPoints: 14.8, averagePoints: 16.2, totalPoints: 226.8, gamesPlayed: 14, rank: 8, tier: 2, adp: 12.3, ownership: 95.4 }
    }),
    createMockPlayer({
      id: 'rb-3',
      playerId: 'rb-3',
      firstName: 'James',
      lastName: 'Conner',
      fullName: 'James Conner',
      position: 'RB',
      team: 'ARI',
      fantasy: { projectedPoints: 12.4, averagePoints: 14.1, totalPoints: 197.4, gamesPlayed: 14, rank: 15, tier: 3, adp: 28.7, ownership: 87.3 }
    })
  ],
  WR: [
    createMockPlayer({
      id: 'wr-1',
      playerId: 'wr-1',
      firstName: 'Tyreek',
      lastName: 'Hill',
      fullName: 'Tyreek Hill',
      position: 'WR',
      team: 'MIA',
      fantasy: { projectedPoints: 15.3, averagePoints: 17.2, totalPoints: 240.8, gamesPlayed: 14, rank: 1, tier: 1, adp: 5.8, ownership: 99.1 }
    }),
    createMockPlayer({
      id: 'wr-2',
      playerId: 'wr-2',
      firstName: 'Stefon',
      lastName: 'Diggs',
      fullName: 'Stefon Diggs',
      position: 'WR',
      team: 'HOU',
      fantasy: { projectedPoints: 14.7, averagePoints: 16.3, totalPoints: 228.2, gamesPlayed: 14, rank: 4, tier: 1, adp: 8.9, ownership: 97.8 }
    }),
    createMockPlayer({
      id: 'wr-3',
      playerId: 'wr-3',
      firstName: 'Puka',
      lastName: 'Nacua',
      fullName: 'Puka Nacua',
      position: 'WR',
      team: 'LAR',
      fantasy: { projectedPoints: 13.2, averagePoints: 15.1, totalPoints: 211.4, gamesPlayed: 14, rank: 12, tier: 2, adp: 24.3, ownership: 89.6 }
    })
  ],
  TE: [
    createMockPlayer({
      id: 'te-1',
      playerId: 'te-1',
      firstName: 'Travis',
      lastName: 'Kelce',
      fullName: 'Travis Kelce',
      position: 'TE',
      team: 'KC',
      fantasy: { projectedPoints: 12.8, averagePoints: 14.2, totalPoints: 198.8, gamesPlayed: 14, rank: 1, tier: 1, adp: 11.2, ownership: 98.7 }
    }),
    createMockPlayer({
      id: 'te-2',
      playerId: 'te-2',
      firstName: 'Sam',
      lastName: 'LaPorta',
      fullName: 'Sam LaPorta',
      position: 'TE',
      team: 'DET',
      fantasy: { projectedPoints: 10.4, averagePoints: 11.8, totalPoints: 165.2, gamesPlayed: 14, rank: 3, tier: 2, adp: 18.7, ownership: 94.3 }
    })
  ],
  K: [
    createMockPlayer({
      id: 'k-1',
      playerId: 'k-1',
      firstName: 'Justin',
      lastName: 'Tucker',
      fullName: 'Justin Tucker',
      position: 'K',
      team: 'BAL',
      fantasy: { projectedPoints: 8.2, averagePoints: 9.1, totalPoints: 127.4, gamesPlayed: 14, rank: 1, tier: 1, adp: 135.2, ownership: 78.9 }
    })
  ],
  DEF: [
    createMockPlayer({
      id: 'def-1',
      playerId: 'def-1',
      firstName: 'Dallas',
      lastName: 'Cowboys',
      fullName: 'Dallas Cowboys',
      position: 'DEF',
      team: 'DAL',
      fantasy: { projectedPoints: 7.8, averagePoints: 8.7, totalPoints: 121.8, gamesPlayed: 14, rank: 2, tier: 1, adp: 142.8, ownership: 82.4 }
    })
  ]
})

export const createMockInjuredPlayer = (overrides: Partial<MockPlayer> = {}) => 
  createMockPlayer({
    status: 'Injured',
    injuryStatus: 'Questionable - Ankle',
    fantasy: {
      projectedPoints: 0,
      averagePoints: 12.4,
      totalPoints: 148.8,
      gamesPlayed: 12,
      rank: 25,
      tier: 3,
      adp: 45.2,
      ownership: 76.3
    },
    news: [
      {
        id: 'injury-news-1',
        title: 'Player dealing with ankle injury',
        body: 'Listed as questionable for this week',
        impact: 'HIGH',
        timestamp: new Date()
      }
    ],
    ...overrides
  })

export const createMockByeWeekPlayer = (week = 12, overrides: Partial<MockPlayer> = {}) =>
  createMockPlayer({
    byeWeek: week,
    fantasy: {
      projectedPoints: 0,
      averagePoints: 14.2,
      totalPoints: 184.6,
      gamesPlayed: 13,
      rank: 18,
      tier: 2,
      adp: 32.1,
      ownership: 88.7
    },
    ...overrides
  })

// Advanced roster scenarios
export const createMockCompleteRoster = () => {
  const players = createMockPlayersByPosition()
  
  return [
    // Starters
    createMockRosterPlayer({
      id: 'roster-qb-1',
      playerId: 'qb-1',
      position: 'QB',
      isStarter: true,
      player: players.QB[0]
    }),
    createMockRosterPlayer({
      id: 'roster-rb-1',
      playerId: 'rb-1',
      position: 'RB',
      isStarter: true,
      player: players.RB[0]
    }),
    createMockRosterPlayer({
      id: 'roster-rb-2',
      playerId: 'rb-2',
      position: 'RB',
      isStarter: true,
      player: players.RB[1]
    }),
    createMockRosterPlayer({
      id: 'roster-wr-1',
      playerId: 'wr-1',
      position: 'WR',
      isStarter: true,
      player: players.WR[0]
    }),
    createMockRosterPlayer({
      id: 'roster-wr-2',
      playerId: 'wr-2',
      position: 'WR',
      isStarter: true,
      player: players.WR[1]
    }),
    createMockRosterPlayer({
      id: 'roster-te-1',
      playerId: 'te-1',
      position: 'TE',
      isStarter: true,
      player: players.TE[0]
    }),
    createMockRosterPlayer({
      id: 'roster-k-1',
      playerId: 'k-1',
      position: 'K',
      isStarter: true,
      player: players.K[0]
    }),
    createMockRosterPlayer({
      id: 'roster-def-1',
      playerId: 'def-1',
      position: 'DEF',
      isStarter: true,
      player: players.DEF[0]
    }),
    
    // Bench
    createMockRosterPlayer({
      id: 'roster-rb-3',
      playerId: 'rb-3',
      position: 'RB',
      isStarter: false,
      player: players.RB[2]
    }),
    createMockRosterPlayer({
      id: 'roster-wr-3',
      playerId: 'wr-3',
      position: 'WR',
      isStarter: false,
      player: players.WR[2]
    }),
    createMockRosterPlayer({
      id: 'roster-te-2',
      playerId: 'te-2',
      position: 'TE',
      isStarter: false,
      player: players.TE[1]
    })
  ]
}

export const createMockPlayerPerformance = (playerId: string, week: number, overrides = {}) => ({
  playerId,
  week,
  points: 12.5,
  projectedPoints: 14.2,
  actualStats: {
    passingYards: 287,
    passingTouchdowns: 2,
    rushingYards: 45,
    rushingTouchdowns: 1,
    interceptions: 1
  },
  gameInfo: {
    opponent: 'MIA',
    isHome: true,
    gameTime: '1:00 PM',
    weather: 'Clear, 72°F'
  },
  ...overrides
})

export const createMockPlayerNews = (playerId: string, overrides = {}) => ({
  id: `news-${playerId}-${Date.now()}`,
  playerId,
  title: 'Player Update',
  body: 'Fantasy relevant news about this player',
  impact: 'MEDIUM' as const,
  timestamp: new Date(),
  source: 'ESPN',
  reporter: 'Adam Schefter',
  ...overrides
})

// Factory functions for bulk data creation
export const createMockPlayersForDraft = (count = 200) => {
  const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']
  const teams = ['BUF', 'MIA', 'NE', 'NYJ', 'BAL', 'CIN', 'CLE', 'PIT', 'IND', 'JAX', 'TEN', 'HOU']
  
  return Array.from({ length: count }, (_, index) => {
    const position = positions[index % positions.length]
    const team = teams[index % teams.length]
    
    return createMockPlayer({
      id: `draft-player-${index + 1}`,
      playerId: `draft-player-${index + 1}`,
      firstName: `Player${index + 1}`,
      lastName: `Last${index + 1}`,
      fullName: `Player${index + 1} Last${index + 1}`,
      position,
      team,
      fantasy: {
        projectedPoints: Math.random() * 20 + 5,
        averagePoints: Math.random() * 18 + 4,
        totalPoints: Math.random() * 250 + 50,
        gamesPlayed: 14,
        rank: index + 1,
        tier: Math.floor(index / 12) + 1,
        adp: index + 1,
        ownership: Math.random() * 40 + 60
      }
    })
  })
}

export const createMockWaiverWirePlayers = (count = 50) => {
  return createMockPlayersForDraft(count).map(player => ({
    ...player,
    fantasy: {
      ...player.fantasy,
      ownership: Math.random() * 30 + 10 // Lower ownership for waiver wire
    }
  }))
}
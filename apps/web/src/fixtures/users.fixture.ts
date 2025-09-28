/**
 * Zenith Test Fixtures - User Data
 * Comprehensive test data for user-related tests
 */

export const createMockUser = (overrides = {}) => ({
  id: 'test-user-1',
  username: 'testuser',
  email: 'test@example.com',
  displayName: 'Test User',
  avatar: null,
  verified: true,
  bot: false,
  isPro: false,
  isOwner: false,
  metadata: {
    team_name: 'Test Team',
    avatar: null,
    mention_pn: 'off',
    allow_pn: true,
    allow_sms: false,
    phone: null,
    mascot_message: {
      avatar: '123',
      text: 'Test mascot message'
    },
    transaction_email: true,
    league_invite_email: true,
    trade_email: true,
    mascot_item_type_id_leg_1: null
  },
  settings: {
    currency: 'usd',
    locale: 'en',
    best_ball: false,
    dynasty: false,
    redraft: true
  },
  leagues: ['test-league-1'],
  teams: ['test-team-1'],
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-09-27'),
  ...overrides
})

export const createMockAuthUser = (overrides = {}) => ({
  id: 'auth-user-1',
  name: 'Auth Test User',
  email: 'auth@example.com',
  image: null,
  emailVerified: new Date('2024-01-01'),
  ...overrides
})

export const createMockSession = (overrides = {}) => ({
  sessionToken: 'test-session-token',
  userId: 'test-user-1',
  expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
  user: createMockAuthUser(),
  ...overrides
})

export const createMockAccount = (overrides = {}) => ({
  id: 'test-account-1',
  userId: 'test-user-1',
  type: 'oauth',
  provider: 'sleeper',
  providerAccountId: 'sleeper-user-123',
  refresh_token: 'refresh-token-123',
  access_token: 'access-token-123',
  expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
  token_type: 'Bearer',
  scope: 'read',
  id_token: null,
  session_state: null,
  ...overrides
})

export const createMockUserProfile = (overrides = {}) => ({
  id: 'profile-1',
  userId: 'test-user-1',
  bio: 'Fantasy football enthusiast',
  location: 'Test City',
  website: 'https://example.com',
  favoriteTeam: 'SF',
  yearsPlaying: 5,
  achievements: [
    'league_champion_2023',
    'draft_master',
    'waiver_wire_wizard'
  ],
  stats: {
    totalLeagues: 3,
    championships: 1,
    playoffAppearances: 8,
    winRate: 0.642,
    averageFinish: 4.2,
    bestFinish: 1,
    worstFinish: 12
  },
  preferences: {
    emailNotifications: true,
    pushNotifications: true,
    weeklyRecap: true,
    tradeAlerts: true,
    waiversAlerts: true,
    scoreUpdates: false,
    theme: 'dark',
    language: 'en'
  },
  privacy: {
    showEmail: false,
    showStats: true,
    showAchievements: true,
    allowMessages: true,
    allowFriendRequests: true
  },
  ...overrides
})

export const createMockUserPreferences = (overrides = {}) => ({
  userId: 'test-user-1',
  notifications: {
    email: {
      trades: true,
      waivers: true,
      lineupReminders: true,
      weeklyRecap: false,
      news: false
    },
    push: {
      trades: true,
      waivers: true,
      lineupReminders: true,
      scores: false,
      news: false
    },
    sms: {
      enabled: false,
      trades: false,
      lineupReminders: false
    }
  },
  privacy: {
    profileVisibility: 'public',
    showStats: true,
    showLeagues: true,
    allowMessages: true
  },
  display: {
    theme: 'dark',
    language: 'en',
    timezone: 'America/New_York',
    dateFormat: 'MM/DD/YYYY',
    currency: 'USD'
  },
  fantasy: {
    defaultLeagueType: 'redraft',
    favoritePositions: ['QB', 'RB'],
    draftStrategy: 'balanced',
    riskTolerance: 'medium'
  },
  ...overrides
})

export const createMockFriendship = (overrides = {}) => ({
  id: 'friendship-1',
  userId: 'test-user-1',
  friendId: 'test-user-2',
  status: 'accepted',
  createdAt: new Date('2024-01-15'),
  acceptedAt: new Date('2024-01-16'),
  ...overrides
})

export const createMockUserActivity = (overrides = {}) => ({
  id: 'activity-1',
  userId: 'test-user-1',
  type: 'trade_proposed',
  description: 'Proposed a trade in Test League',
  metadata: {
    leagueId: 'test-league-1',
    tradeId: 'trade-1',
    playersOffered: ['1', '2'],
    playersRequested: ['3', '4']
  },
  isPublic: true,
  createdAt: new Date(),
  ...overrides
})

export const createMockUserStats = (season = '2024', overrides = {}) => ({
  userId: 'test-user-1',
  season,
  totalLeagues: 3,
  wins: 24,
  losses: 12,
  ties: 0,
  winRate: 0.667,
  totalPoints: 1842.5,
  averagePoints: 51.18,
  highestScore: 156.8,
  lowestScore: 78.2,
  championships: 1,
  playoffAppearances: 2,
  regularSeasonFinish: [1, 4, 8],
  trades: {
    proposed: 8,
    accepted: 5,
    rejected: 3,
    successRate: 0.625
  },
  waivers: {
    claims: 45,
    successful: 32,
    successRate: 0.711
  },
  draft: {
    averagePosition: 6.3,
    bestPick: {
      round: 12,
      player: 'Puka Nacua',
      value: 85.2
    },
    worstPick: {
      round: 3,
      player: 'Austin Ekeler',
      value: 12.1
    }
  },
  ...overrides
})

// Factory functions for bulk test data creation
export const createMockUsers = (count = 12) => {
  return Array.from({ length: count }, (_, index) => 
    createMockUser({
      id: `test-user-${index + 1}`,
      username: `testuser${index + 1}`,
      email: `test${index + 1}@example.com`,
      displayName: `Test User ${index + 1}`
    })
  )
}

export const createMockLeagueMembers = (leagueId = 'test-league-1', count = 12) => {
  return Array.from({ length: count }, (_, index) => ({
    userId: `test-user-${index + 1}`,
    leagueId,
    role: index === 0 ? 'commissioner' : 'member',
    joinedAt: new Date('2024-08-01'),
    isActive: true,
    settings: {
      notifications: true,
      autopay: false,
      draftReminders: true
    }
  }))
}

export const createMockUserNotifications = (userId = 'test-user-1', count = 10) => {
  const types = ['trade_proposed', 'trade_accepted', 'waiver_processed', 'lineup_reminder', 'league_invite']
  
  return Array.from({ length: count }, (_, index) => ({
    id: `notification-${index + 1}`,
    userId,
    type: types[index % types.length],
    title: `Test Notification ${index + 1}`,
    message: `This is a test notification message ${index + 1}`,
    isRead: index % 3 === 0,
    metadata: {
      leagueId: 'test-league-1',
      actionId: `action-${index + 1}`
    },
    createdAt: new Date(Date.now() - (index * 3600000)), // Spread over hours
    readAt: index % 3 === 0 ? new Date(Date.now() - (index * 1800000)) : null
  }))
}
import { Player, Position, PlayerStatus, NewsImpact } from '@/types/fantasy';

export const mockPlayers: Player[] = [
  // Quarterbacks
  {
    id: 'player-1',
    nflId: 'nfl-1',
    name: 'Josh Allen',
    position: Position.QB,
    nflTeam: 'BUF',
    byeWeek: 12,
    status: PlayerStatus.ACTIVE,
    isRookie: false,
    yearsExperience: 6,
    averagePoints: 22.8,
    createdAt: new Date(),
    updatedAt: new Date(),
    projections: [{
      id: 'proj-1',
      playerId: 'player-1',
      week: 2,
      season: 2024,
      projectedPoints: 24.5,
      confidence: 85,
      source: 'SYSTEM',
      createdAt: new Date(),
      updatedAt: new Date()
    }],
    weeklyStats: [
      { week: 1, points: 26.2, opponent: 'ARI', gameTime: new Date(), isCompleted: true },
      { week: 2, points: 18.4, opponent: 'MIA', gameTime: new Date(), isCompleted: true }
    ]
  },
  {
    id: 'player-2',
    nflId: 'nfl-2',
    name: 'Lamar Jackson',
    position: Position.QB,
    nflTeam: 'BAL',
    byeWeek: 14,
    status: PlayerStatus.ACTIVE,
    isRookie: false,
    yearsExperience: 6,
    averagePoints: 21.6,
    createdAt: new Date(),
    updatedAt: new Date(),
    projections: [{
      id: 'proj-2',
      playerId: 'player-2',
      week: 2,
      season: 2024,
      projectedPoints: 23.1,
      confidence: 82,
      source: 'SYSTEM',
      createdAt: new Date(),
      updatedAt: new Date()
    }],
    weeklyStats: [
      { week: 1, points: 24.8, opponent: 'KC', gameTime: new Date(), isCompleted: true }
    ]
  },

  // Running Backs
  {
    id: 'player-3',
    nflId: 'nfl-3',
    name: 'Christian McCaffrey',
    position: Position.RB,
    nflTeam: 'SF',
    byeWeek: 9,
    status: PlayerStatus.ACTIVE,
    isRookie: false,
    yearsExperience: 7,
    averagePoints: 18.9,
    createdAt: new Date(),
    updatedAt: new Date(),
    projections: [{
      id: 'proj-3',
      playerId: 'player-3',
      week: 2,
      season: 2024,
      projectedPoints: 19.8,
      confidence: 90,
      source: 'SYSTEM',
      createdAt: new Date(),
      updatedAt: new Date()
    }],
    weeklyStats: [
      { week: 1, points: 22.1, opponent: 'PIT', gameTime: new Date(), isCompleted: true }
    ]
  },
  {
    id: 'player-4',
    nflId: 'nfl-4',
    name: 'Austin Ekeler',
    position: Position.RB,
    nflTeam: 'LAC',
    byeWeek: 5,
    status: PlayerStatus.QUESTIONABLE,
    isRookie: false,
    yearsExperience: 6,
    averagePoints: 16.2,
    createdAt: new Date(),
    updatedAt: new Date(),
    projections: [{
      id: 'proj-4',
      playerId: 'player-4',
      week: 2,
      season: 2024,
      projectedPoints: 15.3,
      confidence: 65,
      source: 'SYSTEM',
      createdAt: new Date(),
      updatedAt: new Date()
    }],
    news: [{
      id: 'news-1',
      playerId: 'player-4',
      headline: 'Ekeler limited in practice with ankle injury',
      content: 'Austin Ekeler was limited in Wednesday practice due to an ankle injury sustained in Week 1.',
      source: 'ESPN',
      timestamp: new Date(),
      impact: NewsImpact.NEGATIVE,
      category: 'injury',
      createdAt: new Date()
    }],
    weeklyStats: [
      { week: 1, points: 12.4, opponent: 'MIA', gameTime: new Date(), isCompleted: true }
    ]
  },

  // Wide Receivers
  {
    id: 'player-5',
    nflId: 'nfl-5',
    name: 'Cooper Kupp',
    position: Position.WR,
    nflTeam: 'LAR',
    byeWeek: 6,
    status: PlayerStatus.ACTIVE,
    isRookie: false,
    yearsExperience: 7,
    averagePoints: 17.8,
    createdAt: new Date(),
    updatedAt: new Date(),
    projections: [{
      id: 'proj-5',
      playerId: 'player-5',
      week: 2,
      season: 2024,
      projectedPoints: 18.5,
      confidence: 88,
      source: 'SYSTEM',
      createdAt: new Date(),
      updatedAt: new Date()
    }],
    weeklyStats: [
      { week: 1, points: 21.3, opponent: 'SEA', gameTime: new Date(), isCompleted: true }
    ]
  },
  {
    id: 'player-6',
    nflId: 'nfl-6',
    name: 'Stefon Diggs',
    position: Position.WR,
    nflTeam: 'BUF',
    byeWeek: 12,
    status: PlayerStatus.ACTIVE,
    isRookie: false,
    yearsExperience: 9,
    averagePoints: 16.4,
    createdAt: new Date(),
    updatedAt: new Date(),
    projections: [{
      id: 'proj-6',
      playerId: 'player-6',
      week: 2,
      season: 2024,
      projectedPoints: 17.2,
      confidence: 85,
      source: 'SYSTEM',
      createdAt: new Date(),
      updatedAt: new Date()
    }],
    weeklyStats: [
      { week: 1, points: 14.6, opponent: 'ARI', gameTime: new Date(), isCompleted: true }
    ]
  },

  // Tight Ends
  {
    id: 'player-7',
    nflId: 'nfl-7',
    name: 'Travis Kelce',
    position: Position.TE,
    nflTeam: 'KC',
    byeWeek: 10,
    status: PlayerStatus.ACTIVE,
    isRookie: false,
    yearsExperience: 11,
    averagePoints: 14.7,
    createdAt: new Date(),
    updatedAt: new Date(),
    projections: [{
      id: 'proj-7',
      playerId: 'player-7',
      week: 2,
      season: 2024,
      projectedPoints: 15.1,
      confidence: 87,
      source: 'SYSTEM',
      createdAt: new Date(),
      updatedAt: new Date()
    }],
    weeklyStats: [
      { week: 1, points: 18.2, opponent: 'BAL', gameTime: new Date(), isCompleted: true }
    ]
  },
  {
    id: 'player-8',
    nflId: 'nfl-8',
    name: 'Mark Andrews',
    position: Position.TE,
    nflTeam: 'BAL',
    byeWeek: 14,
    status: PlayerStatus.ACTIVE,
    isRookie: false,
    yearsExperience: 6,
    averagePoints: 12.8,
    createdAt: new Date(),
    updatedAt: new Date(),
    projections: [{
      id: 'proj-8',
      playerId: 'player-8',
      week: 2,
      season: 2024,
      projectedPoints: 13.4,
      confidence: 80,
      source: 'SYSTEM',
      createdAt: new Date(),
      updatedAt: new Date()
    }],
    weeklyStats: [
      { week: 1, points: 9.7, opponent: 'KC', gameTime: new Date(), isCompleted: true }
    ]
  },

  // Kickers
  {
    id: 'player-9',
    nflId: 'nfl-9',
    name: 'Justin Tucker',
    position: Position.K,
    nflTeam: 'BAL',
    byeWeek: 14,
    status: PlayerStatus.ACTIVE,
    isRookie: false,
    yearsExperience: 12,
    averagePoints: 9.2,
    createdAt: new Date(),
    updatedAt: new Date(),
    projections: [{
      id: 'proj-9',
      playerId: 'player-9',
      week: 2,
      season: 2024,
      projectedPoints: 8.5,
      confidence: 75,
      source: 'SYSTEM',
      createdAt: new Date(),
      updatedAt: new Date()
    }],
    weeklyStats: [
      { week: 1, points: 11.0, opponent: 'KC', gameTime: new Date(), isCompleted: true }
    ]
  },

  // Defense/Special Teams
  {
    id: 'player-10',
    nflId: 'nfl-10',
    name: 'Buffalo Bills',
    position: Position.DST,
    nflTeam: 'BUF',
    byeWeek: 12,
    status: PlayerStatus.ACTIVE,
    isRookie: false,
    yearsExperience: 0,
    averagePoints: 8.8,
    createdAt: new Date(),
    updatedAt: new Date(),
    projections: [{
      id: 'proj-10',
      playerId: 'player-10',
      week: 2,
      season: 2024,
      projectedPoints: 9.2,
      confidence: 70,
      source: 'SYSTEM',
      createdAt: new Date(),
      updatedAt: new Date()
    }],
    weeklyStats: [
      { week: 1, points: 12.0, opponent: 'ARI', gameTime: new Date(), isCompleted: true }
    ]
  },

  // Additional players for depth
  {
    id: 'player-11',
    nflId: 'nfl-11',
    name: 'Dak Prescott',
    position: Position.QB,
    nflTeam: 'DAL',
    byeWeek: 7,
    status: PlayerStatus.ACTIVE,
    isRookie: false,
    yearsExperience: 8,
    averagePoints: 19.4,
    createdAt: new Date(),
    updatedAt: new Date(),
    projections: [{
      id: 'proj-11',
      playerId: 'player-11',
      week: 2,
      season: 2024,
      projectedPoints: 20.1,
      confidence: 80,
      source: 'SYSTEM',
      createdAt: new Date(),
      updatedAt: new Date()
    }],
    weeklyStats: [
      { week: 1, points: 17.8, opponent: 'NYG', gameTime: new Date(), isCompleted: true }
    ]
  },

  {
    id: 'player-12',
    nflId: 'nfl-12',
    name: 'Derrick Henry',
    position: Position.RB,
    nflTeam: 'TEN',
    byeWeek: 7,
    status: PlayerStatus.ACTIVE,
    isRookie: false,
    yearsExperience: 8,
    averagePoints: 15.6,
    createdAt: new Date(),
    updatedAt: new Date(),
    projections: [{
      id: 'proj-12',
      playerId: 'player-12',
      week: 2,
      season: 2024,
      projectedPoints: 16.2,
      confidence: 83,
      source: 'SYSTEM',
      createdAt: new Date(),
      updatedAt: new Date()
    }],
    weeklyStats: [
      { week: 1, points: 18.4, opponent: 'NO', gameTime: new Date(), isCompleted: true }
    ]
  },

  {
    id: 'player-13',
    nflId: 'nfl-13',
    name: 'Tyreek Hill',
    position: Position.WR,
    nflTeam: 'MIA',
    byeWeek: 10,
    status: PlayerStatus.ACTIVE,
    isRookie: false,
    yearsExperience: 8,
    averagePoints: 18.9,
    createdAt: new Date(),
    updatedAt: new Date(),
    projections: [{
      id: 'proj-13',
      playerId: 'player-13',
      week: 2,
      season: 2024,
      projectedPoints: 19.8,
      confidence: 88,
      source: 'SYSTEM',
      createdAt: new Date(),
      updatedAt: new Date()
    }],
    weeklyStats: [
      { week: 1, points: 24.7, opponent: 'LAC', gameTime: new Date(), isCompleted: true }
    ]
  },

  {
    id: 'player-14',
    nflId: 'nfl-14',
    name: 'Davante Adams',
    position: Position.WR,
    nflTeam: 'LV',
    byeWeek: 13,
    status: PlayerStatus.ACTIVE,
    isRookie: false,
    yearsExperience: 11,
    averagePoints: 16.8,
    createdAt: new Date(),
    updatedAt: new Date(),
    projections: [{
      id: 'proj-14',
      playerId: 'player-14',
      week: 2,
      season: 2024,
      projectedPoints: 17.4,
      confidence: 85,
      source: 'SYSTEM',
      createdAt: new Date(),
      updatedAt: new Date()
    }],
    weeklyStats: [
      { week: 1, points: 15.2, opponent: 'DEN', gameTime: new Date(), isCompleted: true }
    ]
  },

  {
    id: 'player-15',
    nflId: 'nfl-15',
    name: 'George Kittle',
    position: Position.TE,
    nflTeam: 'SF',
    byeWeek: 9,
    status: PlayerStatus.ACTIVE,
    isRookie: false,
    yearsExperience: 7,
    averagePoints: 11.9,
    createdAt: new Date(),
    updatedAt: new Date(),
    projections: [{
      id: 'proj-15',
      playerId: 'player-15',
      week: 2,
      season: 2024,
      projectedPoints: 12.6,
      confidence: 82,
      source: 'SYSTEM',
      createdAt: new Date(),
      updatedAt: new Date()
    }],
    weeklyStats: [
      { week: 1, points: 8.3, opponent: 'PIT', gameTime: new Date(), isCompleted: true }
    ]
  }
];

export const mockRosterPlayers = [
  {
    id: 'roster-1',
    teamId: 'team-1',
    playerId: 'player-1',
    rosterSlot: 'QB' as const,
    isLocked: false,
    acquisitionDate: new Date('2024-08-15'),
    player: mockPlayers[0]
  },
  {
    id: 'roster-2',
    teamId: 'team-1',
    playerId: 'player-3',
    rosterSlot: 'RB' as const,
    isLocked: false,
    acquisitionDate: new Date('2024-08-15'),
    player: mockPlayers[2]
  },
  {
    id: 'roster-3',
    teamId: 'team-1',
    playerId: 'player-4',
    rosterSlot: 'RB' as const,
    isLocked: false,
    acquisitionDate: new Date('2024-08-20'),
    player: mockPlayers[3]
  },
  {
    id: 'roster-4',
    teamId: 'team-1',
    playerId: 'player-5',
    rosterSlot: 'WR' as const,
    isLocked: false,
    acquisitionDate: new Date('2024-08-15'),
    player: mockPlayers[4]
  },
  {
    id: 'roster-5',
    teamId: 'team-1',
    playerId: 'player-6',
    rosterSlot: 'WR' as const,
    isLocked: false,
    acquisitionDate: new Date('2024-08-22'),
    player: mockPlayers[5]
  },
  {
    id: 'roster-6',
    teamId: 'team-1',
    playerId: 'player-7',
    rosterSlot: 'TE' as const,
    isLocked: false,
    acquisitionDate: new Date('2024-08-15'),
    player: mockPlayers[6]
  },
  {
    id: 'roster-7',
    teamId: 'team-1',
    playerId: 'player-12',
    rosterSlot: 'FLEX' as const,
    isLocked: false,
    acquisitionDate: new Date('2024-08-25'),
    player: mockPlayers[11]
  },
  {
    id: 'roster-8',
    teamId: 'team-1',
    playerId: 'player-9',
    rosterSlot: 'K' as const,
    isLocked: false,
    acquisitionDate: new Date('2024-08-15'),
    player: mockPlayers[8]
  },
  {
    id: 'roster-9',
    teamId: 'team-1',
    playerId: 'player-10',
    rosterSlot: 'DST' as const,
    isLocked: false,
    acquisitionDate: new Date('2024-08-15'),
    player: mockPlayers[9]
  },
  // Bench players
  {
    id: 'roster-10',
    teamId: 'team-1',
    playerId: 'player-11',
    rosterSlot: 'BENCH' as const,
    isLocked: false,
    acquisitionDate: new Date('2024-08-30'),
    player: mockPlayers[10]
  },
  {
    id: 'roster-11',
    teamId: 'team-1',
    playerId: 'player-13',
    rosterSlot: 'BENCH' as const,
    isLocked: false,
    acquisitionDate: new Date('2024-09-01'),
    player: mockPlayers[12]
  },
  {
    id: 'roster-12',
    teamId: 'team-1',
    playerId: 'player-14',
    rosterSlot: 'BENCH' as const,
    isLocked: false,
    acquisitionDate: new Date('2024-09-03'),
    player: mockPlayers[13]
  },
  {
    id: 'roster-13',
    teamId: 'team-1',
    playerId: 'player-15',
    rosterSlot: 'BENCH' as const,
    isLocked: false,
    acquisitionDate: new Date('2024-09-05'),
    player: mockPlayers[14]
  }
];

// Function to get available players (not on any roster in the league)
export const getAvailablePlayers = (leagueId?: string) => {
  // In a real app, this would filter out rostered players
  return mockPlayers.filter(player => !mockRosterPlayers.some(rp => rp.playerId === player.id));
};
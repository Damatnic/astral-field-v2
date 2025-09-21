// Core Sleeper Types

export interface SleeperUser {
  user_id: string;
  username: string;
  display_name: string;
  avatar: string | null;
  metadata?: Record<string, any>;
  created?: number;
}

export interface SleeperLeague {
  id: string;
  name: string;
  season: string;
  seasonType: string;
  sport: string;
  status: string;
  totalRosters: number;
  scoringSettings: Record<string, any>;
  rosterPositions: string[];
  settings: Record<string, any>;
  metadata?: Record<string, any>;
  syncedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface SleeperRoster {
  id: string;
  leagueId: string;
  rosterId: number;
  ownerId: string;
  players: string[];
  starters: string[];
  reserve: string[];
  taxi: string[];
  coOwners: string[];
  settings: Record<string, any>;
  metadata?: Record<string, any>;
  owner?: {
    id: string;
    username: string;
    displayName: string;
    avatar?: string;
  };
}

export interface SleeperPlayer {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  searchFullName: string;
  position: string;
  team?: string;
  age?: number;
  yearsExp?: number;
  college?: string;
  height?: string;
  weight?: string;
  number?: number;
  depth?: number;
  status?: string;
  injuryStatus?: string;
  injuryNotes?: string;
  birthDate?: string;
  stats?: Record<string, any>;
  projections?: Record<string, any>;
  metadata?: Record<string, any>;
  hashtag?: string;
  depthChartOrder?: number;
  searchRank?: number;
  fantasyPositions: string[];
  newsUpdated?: string;
  syncedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface SleeperDraft {
  id: string;
  type: string;
  status: string;
  sport: string;
  season: string;
  seasonType: string;
  leagueId?: string;
  settings: Record<string, any>;
  draftOrder?: Record<string, number>;
  slotToRosterId?: Record<string, number>;
  creators: string[];
  created: string;
  lastPicked: string;
  lastMessageId: string;
  lastMessageTime: string;
  metadata?: Record<string, any>;
  picks?: DraftPick[];
}

export interface DraftPick {
  id: string;
  draftId: string;
  pickNo: number;
  playerId: string;
  player?: SleeperPlayer;
  pickedBy: string;
  rosterId: number;
  round: number;
  draftSlot: number;
  metadata: Record<string, any>;
  isKeeper: boolean;
  syncedAt: string;
  createdAt: string;
}

export interface DraftBoard {
  draftId: string;
  picks: DraftPick[];
  currentPick: {
    round: number;
    pickNumber: number;
    rosterId: number;
    timeRemaining?: number;
  };
  draftOrder: Record<string, number>;
  availablePlayers: SleeperPlayer[];
  rosterComposition: Record<number, {
    rosterId: number;
    picks: DraftPick[];
    positionCounts: Record<string, number>;
    needsAssessment: string[];
  }>;
}

export interface SleeperTransaction {
  id: string;
  transactionId: string;
  type: 'waiver' | 'free_agent' | 'trade' | 'commissioner';
  leagueId: string;
  status: 'complete' | 'failed' | 'pending';
  leg: number;
  scoringType: string;
  adds: Record<string, number> | null;
  drops: Record<string, number> | null;
  rosterIds: number[];
  waiverBudget: Record<string, number>;
  freeAgentBudget: number;
  consenterIds: number[];
  draftPicks: any[];
  settings: Record<string, any>;
  metadata: Record<string, any>;
  statusUpdated: string;
  created: string;
}

export interface PlayerStats {
  id: string;
  playerId: string;
  season: string;
  week: number;
  gameId: string;
  team: string;
  opponent: string;
  stats: Record<string, number>;
  fantasyPointsDefault: number;
  fantasyPointsPpr: number;
  fantasyPointsHalfPpr: number;
  lastUpdated: string;
  syncedAt: string;
}

export interface PlayerProjections {
  id: string;
  playerId: string;
  season: string;
  week: number;
  projectedStats: Record<string, number>;
  projectedPointsDefault: number;
  projectedPointsPpr: number;
  projectedPointsHalfPpr: number;
  confidence: number;
  lastUpdated: string;
  syncedAt: string;
}

export interface PlayerNews {
  id: string;
  playerId: string;
  source: string;
  title: string;
  content: string;
  url?: string;
  impact: string;
  isBreaking: boolean;
  publishedAt: string;
  createdAt: string;
}

export interface MatchupScoring {
  rosterId: number;
  owner: any;
  points: number;
  projectedPoints?: number;
  starters: string[];
  startersPoints: number[];
  lastUpdated: string;
}

export interface LeagueStanding {
  rosterId: number;
  owner: any;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  winPercentage: number;
}

export interface PendingTrade {
  id: string;
  transactionId: string;
  leagueId: string;
  rosterIds: number[];
  adds: Record<string, number>;
  drops: Record<string, number>;
  draftPicks: any[];
  fairnessScore: number;
  analysis: any;
  status: string;
  expiresAt: string;
  completedAt?: string;
  createdAt: string;
}

export interface TransactionAnalytics {
  totalTransactions: number;
  byType: Record<string, number>;
  totalValue: number;
  averageValue: number;
  mostActiveDay: string | null;
  timeline: any[];
}

export interface PlayerRecommendation extends SleeperPlayer {
  recommendationReason: string;
}

export interface WebSocketStatus {
  connected: boolean;
  subscriptions: number;
  lastHeartbeat: number;
  messageQueueSize: number;
}

// Configuration interfaces
export interface LiveScoringConfig {
  leagueId: string;
  week: number;
  updateInterval: number;
  enableWebSocket: boolean;
}

export interface PlayerSearchFilters {
  position?: string;
  team?: string;
  trending?: boolean;
}

// Hook return types
export interface SleeperAuthState {
  connected: boolean;
  user: SleeperUser | null;
  loading: boolean;
  error: string | null;
}
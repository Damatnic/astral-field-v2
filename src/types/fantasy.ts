// Core Fantasy Football Types
export interface League {
  id: string;
  name: string;
  description?: string;
  season: number;
  isActive: boolean;
  currentWeek?: number;
  commissionerId?: string;
  commissioner?: User;
  memberCount: number;
  teamCount: number;
  createdAt: Date;
  updatedAt: Date;
  settings: LeagueSettings;
  members: LeagueMember[];
  teams: Team[];
}

export interface LeagueSettings {
  id: string;
  leagueId: string;
  rosterSlots: RosterConfiguration;
  scoringSystem: ScoringSystem;
  waiverMode: WaiverMode;
  tradeDeadline?: Date;
  playoffWeeks: number[];
}

export interface RosterConfiguration {
  QB: number;
  RB: number;
  WR: number;
  TE: number;
  FLEX: number;
  SUPER_FLEX?: number;
  K: number;
  DST: number;
  BENCH: number;
  IR?: number;
  TAXI?: number;
}

export interface ScoringSystem {
  passing: {
    yards: number;
    touchdowns: number;
    interceptions: number;
    twoPointConversions: number;
  };
  rushing: {
    yards: number;
    touchdowns: number;
    twoPointConversions: number;
  };
  receiving: {
    yards: number;
    touchdowns: number;
    receptions: number;
    twoPointConversions: number;
  };
  kicking: {
    fieldGoals: Record<string, number>; // e.g., "0-39": 3, "40-49": 4
    extraPoints: number;
  };
  defense: {
    touchdowns: number;
    interceptions: number;
    fumbleRecoveries: number;
    sacks: number;
    safeties: number;
    pointsAllowed: Record<string, number>; // e.g., "0": 10, "1-6": 7
  };
}

export interface LeagueMember {
  id: string;
  userId: string;
  leagueId: string;
  role: RoleType;
  user: User;
  team?: Team;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
  role: UserRole;
  teamName?: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Team {
  id: string;
  name: string;
  leagueId: string;
  ownerId: string;
  owner: User;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  waiverPriority: number;
  faabBudget: number;
  faabSpent: number;
  roster: RosterPlayer[];
  record: {
    wins: number;
    losses: number;
    ties: number;
    percentage: number;
  };
  standings: {
    rank: number;
    pointsFor: number;
    pointsAgainst: number;
    streak: string;
  };
}

export interface Player {
  id: string;
  nflId: string;
  name: string;
  position: Position;
  nflTeam: string;
  byeWeek?: number;
  status: PlayerStatus;
  isRookie: boolean;
  yearsExperience: number;
  createdAt: Date;
  updatedAt: Date;
  stats?: PlayerStats[];
  projections?: PlayerProjection[];
  news?: PlayerNews[];
  averagePoints?: number;
  weeklyStats?: WeeklyStats[];
}

export interface RosterPlayer {
  id: string;
  teamId: string;
  playerId: string;
  player: Player;
  rosterSlot: RosterSlot;
  isLocked: boolean;
  acquisitionDate: Date;
}

export interface PlayerStats {
  id: string;
  playerId: string;
  week: number;
  season: number;
  gameId?: string;
  team?: string;
  opponent?: string;
  stats: Record<string, number>;
  fantasyPoints?: number;
  isProjected: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlayerProjection {
  id: string;
  playerId: string;
  week: number;
  season: number;
  projectedPoints: number;
  confidence: number;
  source: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlayerNews {
  id: string;
  playerId: string;
  headline: string;
  content?: string;
  source: string;
  timestamp: Date;
  impact: NewsImpact;
  category?: string;
  createdAt: Date;
}

export interface WeeklyStats {
  week: number;
  points: number;
  projectedPoints?: number;
  opponent: string;
  gameTime: Date;
  isCompleted: boolean;
}

export interface Matchup {
  id: string;
  leagueId: string;
  week: number;
  season: number;
  homeTeamId: string;
  awayTeamId: string;
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number;
  awayScore: number;
  isComplete: boolean;
  createdAt: Date;
}

export interface Trade {
  id: string;
  leagueId: string;
  proposerId: string;
  proposer: User;
  status: TradeStatus;
  expiresAt?: Date;
  processedAt?: Date;
  notes?: string;
  items: TradeItem[];
  votes: TradeVote[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TradeItem {
  id: string;
  tradeId: string;
  fromTeamId: string;
  toTeamId: string;
  playerId?: string;
  player?: Player;
  itemType: TradeItemType;
  metadata?: Record<string, any>;
}

export interface TradeVote {
  id: string;
  tradeId: string;
  userId: string;
  vote: TradeVoteType;
  reason?: string;
  votedAt: Date;
}

export interface WaiverClaim {
  id: string;
  leagueId: string;
  teamId: string;
  userId: string;
  playerId: string;
  player: Player;
  dropPlayerId?: string;
  dropPlayer?: Player;
  priority: number;
  faabBid?: number;
  status: WaiverStatus;
  processedAt?: Date;
  createdAt: Date;
}

// Search and Filter Types
export interface PlayerSearchFilters {
  position?: Position[];
  team?: string[];
  status?: PlayerStatus[];
  availability?: 'available' | 'rostered' | 'all';
  searchQuery?: string;
}

export interface PlayerSearchResult {
  players: Player[];
  totalCount: number;
  hasMore: boolean;
}

export interface LeagueSearchFilters {
  isActive?: boolean;
  season?: number;
  userRole?: RoleType;
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

// Component Props Types
export interface LeagueCardProps {
  league: League;
  currentUserId: string;
  onJoin?: (leagueId: string) => void;
  onLeave?: (leagueId: string) => void;
}

export interface PlayerCardProps {
  player: Player;
  isRostered?: boolean;
  isAvailable?: boolean;
  showActions?: boolean;
  onAdd?: (playerId: string) => void;
  onDrop?: (playerId: string) => void;
  onTrade?: (playerId: string) => void;
}

export interface TeamRosterProps {
  team: Team;
  isOwner: boolean;
  currentWeek: number;
  onLineupChange?: (changes: LineupChange[]) => void;
}

export interface LineupChange {
  playerId: string;
  fromSlot: RosterSlot;
  toSlot: RosterSlot;
}

// Form Types
export interface CreateLeagueForm {
  name: string;
  description?: string;
  season: number;
  teamCount: number;
  rosterSettings: RosterConfiguration;
  scoringSettings: ScoringSystem;
  waiverMode: WaiverMode;
  tradeDeadline?: string;
}

export interface LeagueInviteForm {
  email: string;
  role: RoleType;
  teamName?: string;
}

// Enums from Prisma Schema
export enum Position {
  QB = 'QB',
  RB = 'RB',
  WR = 'WR',
  TE = 'TE',
  K = 'K',
  DST = 'DST',
  P = 'P',
  LB = 'LB',
  DB = 'DB',
  DL = 'DL',
  CB = 'CB',
  S = 'S'
}

export enum RosterSlot {
  QB = 'QB',
  RB = 'RB',
  WR = 'WR',
  TE = 'TE',
  FLEX = 'FLEX',
  SUPER_FLEX = 'SUPER_FLEX',
  WR_RB_FLEX = 'WR_RB_FLEX',
  K = 'K',
  DST = 'DST',
  BENCH = 'BENCH',
  IR = 'IR',
  TAXI = 'TAXI',
  LB = 'LB',
  DB = 'DB',
  DL = 'DL',
  IDP_FLEX = 'IDP_FLEX'
}

export enum PlayerStatus {
  ACTIVE = 'ACTIVE',
  OUT = 'OUT',
  DOUBTFUL = 'DOUBTFUL',
  QUESTIONABLE = 'QUESTIONABLE',
  PROBABLE = 'PROBABLE',
  INJURED_RESERVE = 'INJURED_RESERVE',
  PUP = 'PUP',
  SUSPENDED = 'SUSPENDED',
  RETIRED = 'RETIRED',
  PRACTICE_SQUAD = 'PRACTICE_SQUAD',
  NON_FOOTBALL_INJURY = 'NON_FOOTBALL_INJURY'
}

export enum RoleType {
  ADMIN = 'ADMIN',
  COMMISSIONER = 'COMMISSIONER',
  OWNER = 'OWNER'
}

export enum UserRole {
  ADMIN = 'ADMIN',
  COMMISSIONER = 'COMMISSIONER',
  PLAYER = 'PLAYER'
}

export enum WaiverMode {
  ROLLING = 'ROLLING',
  FAAB = 'FAAB',
  REVERSE_STANDINGS = 'REVERSE_STANDINGS'
}

export enum TradeStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  VETOED = 'VETOED'
}

export enum TradeItemType {
  PLAYER = 'PLAYER',
  DRAFT_PICK = 'DRAFT_PICK',
  FAAB_MONEY = 'FAAB_MONEY'
}

export enum TradeVoteType {
  APPROVE = 'APPROVE',
  VETO = 'VETO'
}

export enum WaiverStatus {
  PENDING = 'PENDING',
  SUCCESSFUL = 'SUCCESSFUL',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

export enum NewsImpact {
  POSITIVE = 'POSITIVE',
  NEGATIVE = 'NEGATIVE',
  NEUTRAL = 'NEUTRAL'
}

// Utility Types
export type TeamStandings = Team & {
  rank: number;
  streak: string;
  playoffProbability?: number;
};

export type PositionEligibility = {
  [key in RosterSlot]?: boolean;
};

export type LineupOptimization = {
  playerId: string;
  currentSlot: RosterSlot;
  suggestedSlot: RosterSlot;
  projectedImprovement: number;
  confidence: number;
};
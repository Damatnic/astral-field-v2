// Comprehensive type definitions for matchup system
import { Prisma } from '@prisma/client';

// Enums
export enum MatchupStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum Environment {
  DEVELOPMENT = 'development',
  PRODUCTION = 'production',
  TEST = 'test'
}

export enum LogLevel {
  TRACE = 'trace',
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

// Base interfaces
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// User types
export interface UserBasic {
  id: string;
  name: string | null;
  email: string;
}

export interface UserWithTeams extends UserBasic {
  teams: TeamBasic[];
}

// Team types
export interface TeamBasic {
  id: string;
  name: string;
  ownerId: string;
  leagueId: string;
}

export interface TeamWithOwner extends TeamBasic {
  owner: UserBasic;
}

export interface TeamWithStats extends TeamWithOwner {
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  streak: string;
}

// League types
export interface LeagueBasic {
  id: string;
  name: string;
  currentWeek: number;
  season: number;
}

export interface LeagueWithSettings extends LeagueBasic {
  maxTeams: number;
  scoringSystem: string;
  tradeDeadline: Date | null;
  playoffStartWeek: number;
  playoffTeams: number;
  isActive: boolean;
}

export interface LeagueWithTeams extends LeagueWithSettings {
  teams: TeamWithOwner[];
}

// Matchup types
export interface MatchupBasic extends BaseEntity {
  week: number;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
  status: MatchupStatus;
  leagueId: string;
  isPlayoff: boolean;
}

export interface MatchupWithTeams extends MatchupBasic {
  homeTeam: TeamWithOwner;
  awayTeam: TeamWithOwner;
}

export interface MatchupWithDetails extends MatchupWithTeams {
  league: LeagueBasic;
  projectedHomeScore?: number;
  projectedAwayScore?: number;
}

// Statistical types
export interface MatchupStatistics {
  totalMatchups: number;
  completedMatchups: number;
  inProgressMatchups: number;
  scheduledMatchups: number;
  cancelledMatchups: number;
  averageHomeScore: number;
  averageAwayScore: number;
  homeWinPercentage: number;
  averageScoreDifferential: number;
  highestScoringMatchup: MatchupWithDetails | null;
  lowestScoringMatchup: MatchupWithDetails | null;
  biggestBlowout: MatchupWithDetails | null;
  closestMatchup: MatchupWithDetails | null;
  executionTime: number;
  timestamp: Date;
}

export interface WeekStatistics {
  week: number;
  matchupsCount: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  totalPoints: number;
}

export interface TeamPerformance {
  team: TeamWithOwner;
  wins: number;
  losses: number;
  ties: number;
  averagePointsFor: number;
  averagePointsAgainst: number;
  highestScore: number;
  lowestScore: number;
  currentStreak: number;
  streakType: 'W' | 'L' | 'T';
}

// Filter and query types
export interface MatchupFilters {
  leagueId?: string;
  teamId?: string;
  week?: number;
  status?: MatchupStatus;
  isPlayoff?: boolean;
  startDate?: Date;
  endDate?: Date;
  minScore?: number;
  maxScore?: number;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: keyof MatchupBasic;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// Service response types
export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: ErrorResponse;
  metadata?: ResponseMetadata;
}

export interface ErrorResponse {
  code: string;
  message: string;
  details?: any;
  stack?: string;
}

export interface ResponseMetadata {
  executionTime: number;
  timestamp: Date;
  cached: boolean;
  version: string;
}

// Configuration types
export interface ServiceConfig {
  databaseUrl: string;
  nodeEnv: Environment;
  logLevel: LogLevel;
  matchupFetchLimit: number;
  enableCache: boolean;
  cacheTtl: number;
  connectionRetries: number;
  retryDelay: number;
  poolSize: number;
  requestTimeout: number;
}

export interface CacheConfig {
  ttl: number;
  maxSize: number;
  checkPeriod: number;
  enableCompression: boolean;
}

// Event types for real-time updates
export interface MatchupEvent {
  type: 'SCORE_UPDATE' | 'STATUS_CHANGE' | 'MATCHUP_CREATED' | 'MATCHUP_DELETED';
  matchupId: string;
  data: Partial<MatchupBasic>;
  timestamp: Date;
  userId?: string;
}

export interface SubscriptionOptions {
  matchupIds?: string[];
  leagueIds?: string[];
  teamIds?: string[];
  events?: MatchupEvent['type'][];
}

// Validation schemas
export interface MatchupCreateInput {
  week: number;
  homeTeamId: string;
  awayTeamId: string;
  leagueId: string;
  isPlayoff?: boolean;
  scheduledDate?: Date;
}

export interface MatchupUpdateInput {
  homeScore?: number;
  awayScore?: number;
  status?: MatchupStatus;
  projectedHomeScore?: number;
  projectedAwayScore?: number;
}

export interface ScoreUpdateInput {
  matchupId: string;
  homeScore?: number;
  awayScore?: number;
  updateType: 'MANUAL' | 'AUTOMATIC' | 'IMPORT';
  source?: string;
  timestamp?: Date;
}

// Analytics types
export interface MatchupAnalytics {
  matchupId: string;
  viewCount: number;
  lastViewed: Date;
  uniqueViewers: string[];
  engagementScore: number;
}

export interface LeagueAnalytics {
  leagueId: string;
  activeUsers: number;
  totalTransactions: number;
  averageScorePerWeek: number;
  competitivenessIndex: number;
}

// Prisma type helpers
export type MatchupWithIncludes = Prisma.MatchupGetPayload<{
  include: {
    homeTeam: {
      include: {
        owner: true;
      };
    };
    awayTeam: {
      include: {
        owner: true;
      };
    };
    league: true;
  };
}>;

export type TeamWithIncludes = Prisma.TeamGetPayload<{
  include: {
    owner: true;
    league: true;
    homeMatchups: true;
    awayMatchups: true;
  };
}>;

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = 
  Pick<T, Exclude<keyof T, Keys>> & {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
  }[Keys];

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type AsyncResult<T> = Promise<ServiceResponse<T>>;

// Export namespace for grouped exports
export namespace MatchupTypes {
  export type Basic = MatchupBasic;
  export type WithTeams = MatchupWithTeams;
  export type WithDetails = MatchupWithDetails;
  export type Statistics = MatchupStatistics;
  export type Event = MatchupEvent;
  export type CreateInput = MatchupCreateInput;
  export type UpdateInput = MatchupUpdateInput;
  export type Filters = MatchupFilters;
}
// Core player data types
export interface Player {
  id: string;
  name: string;
  position: 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DST';
  team: string;
  jerseyNumber?: number;
  height?: string;
  weight?: number;
  age?: number;
  experience?: number;
  college?: string;
  status: 'healthy' | 'questionable' | 'doubtful' | 'out' | 'ir' | 'suspended';
  injuryDetails?: string;
  byeWeek: number;
  lastUpdated: Date;
}

// Player statistics
export interface PlayerStats {
  // Passing stats (QB)
  passingYards?: number;
  passingTDs?: number;
  interceptions?: number;
  completions?: number;
  attempts?: number;
  completionPercentage?: number;
  
  // Rushing stats (RB, QB, WR)
  rushingYards?: number;
  rushingTDs?: number;
  carries?: number;
  yardsPerCarry?: number;
  longRush?: number;
  
  // Receiving stats (WR, TE, RB)
  receptions?: number;
  receivingYards?: number;
  receivingTDs?: number;
  targets?: number;
  yardsPerReception?: number;
  longReception?: number;
  
  // Kicking stats (K)
  fieldGoalsMade?: number;
  fieldGoalsAttempted?: number;
  fieldGoalPercentage?: number;
  extraPointsMade?: number;
  extraPointsAttempted?: number;
  
  // Defense stats (DST)
  sacks?: number;
  interceptionsDef?: number;
  fumbleRecoveries?: number;
  defensiveTDs?: number;
  safeties?: number;
  pointsAllowed?: number;
  yardsAllowed?: number;
  
  // Universal stats
  fantasyPoints: number;
  gamesPlayed: number;
  fumbles?: number;
  fumblesLost?: number;
}

// Player projections
export interface PlayerProjection {
  // Fantasy projections
  fantasyPoints: number;
  
  // Passing projections
  passingYards?: number;
  passingTDs?: number;
  interceptions?: number;
  
  // Rushing projections
  rushingYards?: number;
  rushingTDs?: number;
  
  // Receiving projections
  receptions?: number;
  receivingYards?: number;
  receivingTDs?: number;
  
  // Kicking projections
  fieldGoalsMade?: number;
  extraPointsMade?: number;
  
  // Defense projections
  sacks?: number;
  defensiveTDs?: number;
  pointsAllowed?: number;
  
  // Projection metadata
  confidence?: 'high' | 'medium' | 'low';
  lastUpdated?: Date;
  source?: string;
}

// Fantasy-specific data
export interface FantasyData {
  adp: number; // Average Draft Position
  ownership: number; // Percentage of leagues rostered
  trending: 'up' | 'down' | 'stable';
  weeklyRank?: number;
  seasonRank?: number;
  positionRank?: number;
  tier?: number;
  valueBasedDrafting?: number;
  strengthOfSchedule?: number;
}

// Game context
export interface GameContext {
  opponent: string;
  isHome: boolean;
  gameTime?: string;
  weather?: {
    temperature?: number;
    conditions?: string;
    windSpeed?: number;
    precipitation?: number;
  };
  spread?: number;
  overUnder?: number;
  impliedTotal?: number;
}

// Social features
export interface SocialData {
  likes: number;
  notes: number;
  isWatched: boolean;
  watchedBy?: string[]; // User IDs
  leagueOwnership: number;
  recentActivity?: SocialActivity[];
}

export interface SocialActivity {
  id: string;
  type: 'like' | 'comment' | 'watch' | 'trade_interest';
  userId: string;
  userName?: string;
  timestamp: Date;
  content?: string;
}

// News and analysis
export interface PlayerNews {
  id: string;
  headline: string;
  summary: string;
  content?: string;
  source: string;
  author?: string;
  publishedAt: Date;
  impact: 'positive' | 'negative' | 'neutral';
  severity: 'low' | 'medium' | 'high';
  tags: string[];
}

// DFS-specific data
export interface DFSData {
  salary: {
    draftkings?: number;
    fanduel?: number;
    superdraft?: number;
  };
  ownership: {
    draftkings?: number;
    fanduel?: number;
  };
  value?: number; // Points per dollar
  stackability?: number; // How well they stack with teammates
  ceiling?: number; // Projected ceiling
  floor?: number; // Projected floor
}

// Advanced metrics
export interface AdvancedMetrics {
  // Efficiency metrics
  targetShare?: number;
  airYardsShare?: number;
  redZoneTargets?: number;
  snapShare?: number;
  
  // Usage metrics
  touchShare?: number;
  goalLineCarries?: number;
  passingDownUsage?: number;
  
  // Situational metrics
  pprPoints?: number;
  halfPprPoints?: number;
  standardPoints?: number;
  
  // Strength of schedule
  remainingStrengthOfSchedule?: number;
  playoffStrengthOfSchedule?: number;
  
  // Consistency metrics
  consistency?: number; // 0-100 score
  boom?: number; // Percentage of games with 20+ points
  bust?: number; // Percentage of games with <5 points
}

// Complete enhanced player interface
export interface EnhancedPlayer extends Player {
  stats: PlayerStats;
  projections: PlayerProjection;
  fantasy: FantasyData;
  game: GameContext;
  social: SocialData;
  news?: PlayerNews[];
  dfs?: DFSData;
  advanced?: AdvancedMetrics;
}

// Player filters and search
export interface PlayerFilters {
  position?: string[];
  team?: string[];
  status?: string[];
  minProjection?: number;
  maxProjection?: number;
  minOwnership?: number;
  maxOwnership?: number;
  trending?: 'up' | 'down' | 'stable';
  isWatched?: boolean;
  minSalary?: number;
  maxSalary?: number;
  gameTime?: 'early' | 'late' | 'monday' | 'thursday';
}

export interface PlayerSearchOptions {
  query?: string;
  filters?: PlayerFilters;
  sortBy?: 'rank' | 'projection' | 'ownership' | 'adp' | 'name' | 'salary';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// API response types
export interface PlayerListResponse {
  players: EnhancedPlayer[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface PlayerUpdateResponse {
  playerId: string;
  updated: boolean;
  data?: Partial<EnhancedPlayer>;
  error?: string;
}

// Analytics types
export interface PlayerAnalytics {
  totalPlayers: number;
  avgProjection: number;
  avgOwnership: number;
  topPerformers: number;
  healthyConcerns: number;
  highValueTargets: number;
  positionBreakdown: PositionAnalytics[];
  trendingPlayers: EnhancedPlayer[];
  sleeperPicks: EnhancedPlayer[];
}

export interface PositionAnalytics {
  position: string;
  count: number;
  avgProjection: number;
  avgOwnership: number;
  topPlayer?: EnhancedPlayer;
}

// Live updates
export interface LivePlayerUpdate {
  playerId: string;
  type: 'injury' | 'news' | 'projection' | 'ownership' | 'social';
  data: Partial<EnhancedPlayer>;
  timestamp: Date;
  source: string;
}

// Export utility types
export type Position = 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DST';
export type PlayerStatus = 'healthy' | 'questionable' | 'doubtful' | 'out' | 'ir' | 'suspended';
export type TrendDirection = 'up' | 'down' | 'stable';
export type ImpactLevel = 'positive' | 'negative' | 'neutral';
export type SeverityLevel = 'low' | 'medium' | 'high';
export type ConfidenceLevel = 'high' | 'medium' | 'low';
/**
 * Sleeper API Type Definitions
 * Based on official Sleeper API documentation
 * Documentation: https://docs.sleeper.app/
 */

import { z } from 'zod';

// NFL State Schema
export const NFLStateSchema = z.object({
  week: z.number(),
  season_type: z.enum(['pre', 'regular', 'post']),
  season: z.string(),
  previous_season: z.string(),
  leg: z.number(),
  season_start_date: z.string().optional(),
  season_end_date: z.string().optional(),
  week_start_date: z.string().optional(),
  week_end_date: z.string().optional(),
  league_season: z.string().optional(),
  display_week: z.number().optional(),
  league_create_season: z.string().optional(),
  season_has_scores: z.boolean().optional()
});

export type NFLState = z.infer<typeof NFLStateSchema>;

// Player Schema
export const SleeperPlayerSchema = z.object({
  player_id: z.string(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  full_name: z.string().nullable(),
  position: z.string().nullable(),
  team: z.string().nullable(),
  age: z.number().nullable(),
  height: z.string().nullable(),
  weight: z.string().nullable(),
  years_exp: z.number().nullable(),
  college: z.string().nullable(),
  status: z.enum(['Active', 'Inactive', 'Injured Reserve', 'Physically Unable to Perform', 'Practice Squad']).nullable(),
  injury_status: z.string().nullable(),
  injury_body_part: z.string().nullable(),
  injury_notes: z.string().nullable(),
  news_updated: z.number().nullable(),
  fantasy_data_id: z.number().nullable(),
  stats_id: z.string().nullable(),
  rotowire_id: z.number().nullable(),
  sportradar_id: z.string().nullable(),
  yahoo_id: z.number().nullable(),
  search_full_name: z.string().nullable(),
  birth_date: z.string().nullable()
});

export type SleeperPlayer = z.infer<typeof SleeperPlayerSchema>;

// Player Stats Schema
export const PlayerStatsSchema = z.object({
  pts_ppr: z.number().optional(),
  pts_std: z.number().optional(),
  pts_half_ppr: z.number().optional(),
  gms_active: z.number().optional(),
  pass_yd: z.number().optional(),
  pass_td: z.number().optional(),
  pass_int: z.number().optional(),
  pass_cmp: z.number().optional(),
  pass_att: z.number().optional(),
  pass_2pt: z.number().optional(),
  rush_yd: z.number().optional(),
  rush_td: z.number().optional(),
  rush_att: z.number().optional(),
  rush_2pt: z.number().optional(),
  rec: z.number().optional(),
  rec_yd: z.number().optional(),
  rec_td: z.number().optional(),
  rec_tgt: z.number().optional(),
  rec_2pt: z.number().optional(),
  fum_lost: z.number().optional(),
  fum: z.number().optional(),
  // Kicking stats
  fgm: z.number().optional(),
  fgm_0_19: z.number().optional(),
  fgm_20_29: z.number().optional(),
  fgm_30_39: z.number().optional(),
  fgm_40_49: z.number().optional(),
  fgm_50p: z.number().optional(),
  fga: z.number().optional(),
  xpm: z.number().optional(),
  xpa: z.number().optional(),
  // Defense stats
  def_int: z.number().optional(),
  def_fr: z.number().optional(),
  def_sack: z.number().optional(),
  def_safe: z.number().optional(),
  def_td: z.number().optional(),
  def_pa: z.number().optional(),
  def_yds_allowed: z.number().optional()
});

export type PlayerStats = z.infer<typeof PlayerStatsSchema>;

// League Schema
export const SleeperLeagueSchema = z.object({
  total_rosters: z.number(),
  status: z.enum(['pre_draft', 'drafting', 'in_season', 'complete']),
  sport: z.literal('nfl'),
  settings: z.object({
    max_keepers: z.number().optional(),
    draft_rounds: z.number().optional(),
    trade_deadline: z.number().optional(),
    playoff_week_start: z.number().optional(),
    num_teams: z.number(),
    playoff_teams: z.number().optional(),
    playoff_type: z.number().optional(),
    playoff_round_type: z.number().optional(),
    leg: z.number(),
    waiver_type: z.number().optional(),
    waiver_clear_days: z.number().optional(),
    waiver_day_of_week: z.number().optional(),
    start_week: z.number(),
    playoff_seed_type: z.number().optional(),
    reserve_slots: z.number().optional(),
    offseason_adds: z.number().optional(),
    total_budget: z.number().optional(),
    waiver_budget: z.number().optional()
  }),
  season_type: z.enum(['regular', 'post']),
  season: z.string(),
  scoring_settings: z.record(z.number()),
  roster_positions: z.array(z.string()),
  previous_league_id: z.string().nullable(),
  name: z.string(),
  league_id: z.string(),
  draft_id: z.string().nullable(),
  avatar: z.string().nullable()
});

export type SleeperLeague = z.infer<typeof SleeperLeagueSchema>;

// Roster Schema
export const SleeperRosterSchema = z.object({
  roster_id: z.number(),
  owner_id: z.string(),
  league_id: z.string(),
  players: z.array(z.string()).nullable(),
  starters: z.array(z.string()).nullable(),
  reserve: z.array(z.string()).nullable(),
  taxi: z.array(z.string()).nullable(),
  settings: z.object({
    wins: z.number().optional(),
    losses: z.number().optional(),
    ties: z.number().optional(),
    fpts: z.number().optional(),
    fpts_against: z.number().optional(),
    fpts_decimal: z.number().optional(),
    fpts_against_decimal: z.number().optional(),
    total_budget: z.number().optional(),
    budget: z.number().optional(),
    waiver_position: z.number().optional(),
    waiver_budget_used: z.number().optional()
  }).optional()
});

export type SleeperRoster = z.infer<typeof SleeperRosterSchema>;

// User Schema
export const SleeperUserSchema = z.object({
  user_id: z.string(),
  username: z.string(),
  display_name: z.string(),
  avatar: z.string().nullable(),
  metadata: z.object({
    team_name: z.string().optional(),
    mascot_name: z.string().optional(),
    mascot_message: z.string().optional(),
    mascot_item_type_id: z.string().optional(),
    mention_pn: z.string().optional(),
    allow_pn: z.string().optional(),
    allow_sms: z.string().optional(),
    phone: z.string().optional()
  }).optional()
});

export type SleeperUser = z.infer<typeof SleeperUserSchema>;

// Trending Players Schema
export const TrendingPlayersSchema = z.object({
  count: z.number()
}).catchall(z.unknown());

export type TrendingPlayers = z.infer<typeof TrendingPlayersSchema>;

// Matchup Schema
export const SleeperMatchupSchema = z.object({
  roster_id: z.number(),
  matchup_id: z.number().nullable(),
  points: z.number(),
  points_decimal: z.number().optional(),
  starters: z.array(z.string()).nullable(),
  starters_points: z.array(z.number()).nullable(),
  players: z.array(z.string()).nullable(),
  players_points: z.record(z.number()).nullable(),
  custom_points: z.number().nullable()
});

export type SleeperMatchup = z.infer<typeof SleeperMatchupSchema>;

// Transaction Schema
export const SleeperTransactionSchema = z.object({
  transaction_id: z.string(),
  type: z.enum(['trade', 'waiver', 'free_agent']),
  status: z.enum(['complete', 'processing', 'failed']),
  creator: z.string(),
  created: z.number(),
  roster_ids: z.array(z.number()),
  settings: z.object({
    waiver_budget: z.number().optional(),
    seq: z.number().optional()
  }).optional(),
  adds: z.record(z.number()).nullable(),
  drops: z.record(z.number()).nullable(),
  draft_picks: z.array(z.object({
    season: z.string(),
    round: z.number(),
    roster_id: z.number(),
    previous_owner_id: z.number(),
    owner_id: z.number()
  })).optional(),
  waiver_budget: z.array(z.object({
    sender: z.number(),
    receiver: z.number(),
    amount: z.number()
  })).optional()
});

export type SleeperTransaction = z.infer<typeof SleeperTransactionSchema>;

// API Error Schema
export const SleeperApiErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  status: z.number().optional()
});

export type SleeperApiError = z.infer<typeof SleeperApiErrorSchema>;

// Configuration types
export interface SleeperConfig {
  baseUrl: string;
  rateLimit: {
    maxRequests: number;
    windowMs: number;
  };
  cache: {
    defaultTtl: number;
    playersTtl: number;
    stateTtl: number;
    statsTtl: number;
    trendingTtl: number;
  };
  retry: {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
    exponentialBase: number;
  };
}

// Default configuration
export const DEFAULT_SLEEPER_CONFIG: SleeperConfig = {
  baseUrl: 'https://api.sleeper.app/v1',
  rateLimit: {
    maxRequests: 1000,
    windowMs: 60000 // 1 minute
  },
  cache: {
    defaultTtl: 300, // 5 minutes
    playersTtl: 3600, // 1 hour
    stateTtl: 300, // 5 minutes
    statsTtl: 60, // 1 minute
    trendingTtl: 600 // 10 minutes
  },
  retry: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    exponentialBase: 2
  }
};
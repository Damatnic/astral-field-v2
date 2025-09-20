import { z } from 'zod';

// Common schemas
export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
});

export const idParamSchema = z.object({
  id: z.string().min(1),
});

export const leagueIdSchema = z.object({
  leagueId: z.string().min(1),
});

export const teamIdSchema = z.object({
  teamId: z.string().min(1),
});

export const userIdSchema = z.object({
  userId: z.string().min(1),
});

// Trade schemas
export const createTradeSchema = z.object({
  initiatorTeamId: z.string().min(1),
  targetTeamId: z.string().min(1),
  offeredPlayerIds: z.array(z.string()).min(1),
  requestedPlayerIds: z.array(z.string()).min(1),
  message: z.string().max(500).optional(),
});

export const tradeResponseSchema = z.object({
  tradeId: z.string().min(1),
  action: z.enum(['ACCEPT', 'REJECT', 'COUNTER']),
  counterOffer: z.object({
    offeredPlayerIds: z.array(z.string()).min(1),
    requestedPlayerIds: z.array(z.string()).min(1),
    message: z.string().max(500).optional(),
  }).optional(),
});

// Waiver schemas
export const createWaiverClaimSchema = z.object({
  teamId: z.string().min(1),
  playerId: z.string().min(1),
  dropPlayerId: z.string().optional(),
  bidAmount: z.number().min(0).optional(),
  priority: z.number().min(1).optional(),
});

// Lineup schemas
export const updateLineupSchema = z.object({
  teamId: z.string().min(1),
  weekNumber: z.number().min(1).max(18),
  starters: z.array(z.object({
    playerId: z.string().min(1),
    position: z.string().min(1),
  })),
  bench: z.array(z.string()),
});

// Matchup schemas
export const getMatchupSchema = z.object({
  teamId: z.string().min(1),
  weekNumber: z.coerce.number().min(1).max(18).optional(),
});

// Player schemas
export const searchPlayersSchema = z.object({
  query: z.string().min(1).max(100),
  position: z.enum(['QB', 'RB', 'WR', 'TE', 'K', 'DEF']).optional(),
  team: z.string().max(3).optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
});

// League schemas
export const createLeagueSchema = z.object({
  name: z.string().min(1).max(100),
  season: z.coerce.number().min(2020).max(2030),
  teamCount: z.coerce.number().min(4).max(32).default(12),
  scoringSystem: z.enum(['PPR', 'HALF_PPR', 'STANDARD']).default('PPR'),
  draftType: z.enum(['SNAKE', 'AUCTION', 'LINEAR']).default('SNAKE'),
  settings: z.object({
    rosterSize: z.number().min(10).max(30).default(16),
    startingQB: z.number().min(1).max(2).default(1),
    startingRB: z.number().min(1).max(4).default(2),
    startingWR: z.number().min(1).max(4).default(2),
    startingTE: z.number().min(1).max(2).default(1),
    startingFlex: z.number().min(0).max(3).default(1),
    startingDEF: z.number().min(1).max(2).default(1),
    startingK: z.number().min(0).max(2).default(1),
    benchSpots: z.number().min(3).max(10).default(6),
    irSpots: z.number().min(0).max(3).default(1),
  }).optional(),
});

// Commissioner actions
export const commissionerActionSchema = z.object({
  action: z.enum(['APPROVE_TRADE', 'VETO_TRADE', 'FORCE_TRADE', 'SET_LINEUP', 'ADD_PLAYER', 'DROP_PLAYER']),
  targetId: z.string().min(1),
  data: z.record(z.any()).optional(),
  reason: z.string().max(500).optional(),
});

// Type exports
export type PaginationInput = z.infer<typeof paginationSchema>;
export type CreateTradeInput = z.infer<typeof createTradeSchema>;
export type TradeResponseInput = z.infer<typeof tradeResponseSchema>;
export type CreateWaiverClaimInput = z.infer<typeof createWaiverClaimSchema>;
export type UpdateLineupInput = z.infer<typeof updateLineupSchema>;
export type SearchPlayersInput = z.infer<typeof searchPlayersSchema>;
export type CreateLeagueInput = z.infer<typeof createLeagueSchema>;
export type CommissionerActionInput = z.infer<typeof commissionerActionSchema>;
import { z } from 'zod'

// Base schemas
export const idSchema = z.string().uuid()
export const emailSchema = z.string().email()
export const phoneSchema = z.string().regex(/^\+?[1-9]\d{1,14}$/)
export const passwordSchema = z.string().min(8).max(128)

// NFL positions
export const nflPositions = [
  'QB', 'RB', 'WR', 'TE', 'K', 'DST',
  'DL', 'LB', 'DB', 'IDP' // for IDP leagues
] as const

export const positionSchema = z.enum(nflPositions)

// NFL teams
export const nflTeams = [
  'ARI', 'ATL', 'BAL', 'BUF', 'CAR', 'CHI', 'CIN', 'CLE',
  'DAL', 'DEN', 'DET', 'GB', 'HOU', 'IND', 'JAC', 'KC',
  'LV', 'LAC', 'LAR', 'MIA', 'MIN', 'NE', 'NO', 'NYG',
  'NYJ', 'PHI', 'PIT', 'SF', 'SEA', 'TB', 'TEN', 'WAS'
] as const

export const teamSchema = z.enum(nflTeams)

// Seasons and weeks
export const seasonSchema = z.number().int().min(2020).max(2030)
export const weekSchema = z.number().int().min(1).max(18)

// User schemas
export const createUserSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/),
  avatar: z.string().url().optional()
})

export const updateUserSchema = createUserSchema.partial().omit({ password: true })

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1)
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
  confirmPassword: passwordSchema
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
})

// League schemas
export const leagueSettings = z.object({
  teamCount: z.number().int().min(8).max(14),
  scoringType: z.enum(['standard', 'ppr', 'half-ppr', 'superflex', 'dynasty', 'keeper']),
  playoffWeeks: z.number().int().min(1).max(4).default(3),
  playoffTeams: z.number().int().min(4).max(8),
  rosterSize: z.number().int().min(15).max(25).default(16),
  startingLineup: z.object({
    QB: z.number().int().min(1).max(2).default(1),
    RB: z.number().int().min(1).max(3).default(2),
    WR: z.number().int().min(2).max(4).default(2),
    TE: z.number().int().min(0).max(2).default(1),
    FLEX: z.number().int().min(0).max(3).default(1),
    K: z.number().int().min(0).max(1).default(1),
    DST: z.number().int().min(0).max(1).default(1),
    BENCH: z.number().int().min(5).max(10).default(6)
  }),
  waiverType: z.enum(['faab', 'rolling', 'reverse']).default('faab'),
  faabBudget: z.number().int().min(0).max(1000).default(100),
  draftType: z.enum(['snake', 'auction']).default('snake'),
  isDynasty: z.boolean().default(false),
  isKeeper: z.boolean().default(false),
  keeperCount: z.number().int().min(0).max(5).default(0)
})

export const createLeagueSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().default(false),
  password: z.string().min(4).max(50).optional(),
  settings: leagueSettings,
  season: seasonSchema.default(new Date().getFullYear()),
  logo: z.string().url().optional()
})

export const updateLeagueSchema = createLeagueSchema.partial()

export const joinLeagueSchema = z.object({
  leagueId: idSchema,
  teamName: z.string().min(1).max(50),
  password: z.string().optional()
})

// Player schemas
export const createPlayerSchema = z.object({
  externalId: z.string(),
  name: z.string().min(1).max(100),
  position: positionSchema,
  team: teamSchema.optional(),
  byeWeek: weekSchema.optional(),
  isActive: z.boolean().default(true),
  rookieYear: z.number().int().min(1960).max(2030).optional(),
  height: z.number().optional(),
  weight: z.number().optional(),
  age: z.number().int().min(18).max(50).optional()
})

export const updatePlayerSchema = createPlayerSchema.partial()

export const playerStatsSchema = z.object({
  playerId: idSchema,
  season: seasonSchema,
  week: weekSchema.optional(),
  fantasyPoints: z.number().min(0),
  stats: z.record(z.union([z.number(), z.string()])),
  projection: z.boolean().default(false)
})

// Draft schemas
export const createDraftSchema = z.object({
  leagueId: idSchema,
  type: z.enum(['snake', 'auction']),
  scheduledTime: z.string().datetime(),
  timePerPick: z.number().int().min(30).max(300).default(120), // seconds
  isAutoPick: z.boolean().default(true)
})

export const draftPickSchema = z.object({
  draftId: idSchema,
  playerId: idSchema,
  teamId: idSchema,
  round: z.number().int().min(1).max(20),
  pickNumber: z.number().int().min(1),
  auctionPrice: z.number().int().min(0).optional()
})

export const draftQueueSchema = z.object({
  draftId: idSchema,
  teamId: idSchema,
  playerId: idSchema,
  priority: z.number().int().min(1)
})

// Trade schemas
export const createTradeSchema = z.object({
  leagueId: idSchema,
  initiatorTeamId: idSchema,
  targetTeamId: idSchema,
  initiatorPlayers: z.array(idSchema).min(1).max(5),
  targetPlayers: z.array(idSchema).min(1).max(5),
  initiatorDraftPicks: z.array(z.object({
    year: seasonSchema,
    round: z.number().int().min(1).max(10)
  })).default([]),
  targetDraftPicks: z.array(z.object({
    year: seasonSchema,
    round: z.number().int().min(1).max(10)
  })).default([]),
  notes: z.string().max(500).optional(),
  expiresAt: z.string().datetime().optional()
})

export const tradeActionSchema = z.object({
  tradeId: idSchema,
  action: z.enum(['accept', 'reject', 'counter', 'cancel']),
  counterOffer: createTradeSchema.omit({ leagueId: true, initiatorTeamId: true, targetTeamId: true }).optional()
})

// Waiver schemas
export const createWaiverSchema = z.object({
  leagueId: idSchema,
  teamId: idSchema,
  addPlayerId: idSchema,
  dropPlayerId: idSchema,
  faabBid: z.number().int().min(0).optional(),
  priority: z.number().int().min(1).default(1),
  expiresAt: z.string().datetime().optional()
})

export const updateWaiverSchema = z.object({
  waiverId: idSchema,
  faabBid: z.number().int().min(0).optional(),
  priority: z.number().int().min(1).optional()
})

// Lineup schemas
export const lineupPositions = z.object({
  QB: z.array(idSchema).max(2),
  RB: z.array(idSchema).max(3),
  WR: z.array(idSchema).max(4),
  TE: z.array(idSchema).max(2),
  FLEX: z.array(idSchema).max(3),
  K: z.array(idSchema).max(1),
  DST: z.array(idSchema).max(1),
  BENCH: z.array(idSchema).max(10)
})

export const setLineupSchema = z.object({
  leagueId: idSchema,
  teamId: idSchema,
  week: weekSchema,
  positions: lineupPositions
})

// AI Coach schemas
export const aiRequestSchema = z.object({
  type: z.enum(['lineup_optimizer', 'trade_analyzer', 'waiver_suggestions', 'start_sit', 'draft_assistant']),
  data: z.record(z.any()),
  leagueId: idSchema,
  teamId: idSchema
})

export const aiResponseSchema = z.object({
  type: z.string(),
  recommendations: z.array(z.object({
    player: z.string(),
    action: z.string(),
    confidence: z.number().min(0).max(1),
    reasoning: z.string()
  })),
  analysis: z.record(z.any()),
  confidence: z.number().min(0).max(1)
})

// Notification schemas
export const createNotificationSchema = z.object({
  userId: idSchema,
  type: z.enum(['trade', 'waiver', 'draft', 'lineup', 'league', 'system']),
  title: z.string().min(1).max(100),
  message: z.string().min(1).max(500),
  data: z.record(z.any()).optional(),
  priority: z.enum(['low', 'normal', 'high']).default('normal')
})

// Admin schemas
export const adminStatsSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  groupBy: z.enum(['day', 'week', 'month']).optional()
})

// Query parameter schemas
export const paginationSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional().default("1"),
  limit: z.string().regex(/^\d+$/).transform(Number).optional().default("20"),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
})

export const playerQuerySchema = paginationSchema.extend({
  position: positionSchema.optional(),
  team: teamSchema.optional(),
  available: z.string().transform(val => val === 'true').optional(),
  search: z.string().optional()
})

export const leagueQuerySchema = paginationSchema.extend({
  isPublic: z.string().transform(val => val === 'true').optional(),
  hasOpenSlots: z.string().transform(val => val === 'true').optional(),
  search: z.string().optional()
})

// Export types for use in TypeScript
export type CreateUser = z.infer<typeof createUserSchema>
export type UpdateUser = z.infer<typeof updateUserSchema>
export type Login = z.infer<typeof loginSchema>
export type ChangePassword = z.infer<typeof changePasswordSchema>

export type CreateLeague = z.infer<typeof createLeagueSchema>
export type UpdateLeague = z.infer<typeof updateLeagueSchema>
export type JoinLeague = z.infer<typeof joinLeagueSchema>

export type CreatePlayer = z.infer<typeof createPlayerSchema>
export type UpdatePlayer = z.infer<typeof updatePlayerSchema>
export type PlayerStats = z.infer<typeof playerStatsSchema>

export type CreateDraft = z.infer<typeof createDraftSchema>
export type DraftPick = z.infer<typeof draftPickSchema>
export type DraftQueue = z.infer<typeof draftQueueSchema>

export type CreateTrade = z.infer<typeof createTradeSchema>
export type TradeAction = z.infer<typeof tradeActionSchema>

export type CreateWaiver = z.infer<typeof createWaiverSchema>
export type UpdateWaiver = z.infer<typeof updateWaiverSchema>

export type SetLineup = z.infer<typeof setLineupSchema>

export type AIRequest = z.infer<typeof aiRequestSchema>
export type AIResponse = z.infer<typeof aiResponseSchema>

export type CreateNotification = z.infer<typeof createNotificationSchema>

export type Pagination = z.infer<typeof paginationSchema>
export type PlayerQuery = z.infer<typeof playerQuerySchema>
export type LeagueQuery = z.infer<typeof leagueQuerySchema>
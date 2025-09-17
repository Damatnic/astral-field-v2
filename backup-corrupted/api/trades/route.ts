import { NextRequest, NextResponse } from 'next/server';
import { apiSecurity } from '@/lib/security/api-security-enhanced';
import { authMiddleware, Permission } from '@/lib/security/auth-middleware';
import { securityMonitor, SecurityEventType, SecuritySeverity } from '@/lib/security/security-monitor';
import { dataProtection } from '@/lib/security/data-protection';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// Trade query validation schema
const tradeQuerySchema = z.object({ leagueId: z.string().uuid(),
  status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED']).optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional()


         });

// GET /api/trades - Get trades for a league
export async function GET(req?: NextRequest) {
  try {
    // Enhanced security checks

  const apiSecurityResult = await apiSecurity.secure(request, {
    requireAuth: true,
    allowedMethods: ['GET'],
    rateLimit: 'api',
    sanitizeInput: true,
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });


    enableThreatDetection: true 

    requireSecureTransport: true


        });

  if (!apiSecurityResult.success) return apiSecurityResult.response!;

  // Additional authentication and authorization
  const authResult = await authMiddleware.authenticate(request, { requireAuth: true,
    requiredPermissions: [Permission.VIEW_TRADES],
    validateSession: true,
    requireActiveUser: true

);

  if (!authResult.success) return authResult.response!;

  const { user } = authResult;

  try {
    // Validate query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams);
    
    const validationResult = tradeQuerySchema.safeParse(queryParams);
    if (!validationResult.success) {
      return NextResponse.json({ success: true });

        error: 'Invalid query parameters' 

        details: validationResult.error.issues

      , { status: 400 });

    const { leagueId, status, page = 1, limit = 20 } = validationResult.data;

    // Check if user has access to this league
    const userTeam = await prisma.team.findFirst({ where: {

        leagueId,
        owner: {
          auth0Id: user.sub



     });

    if (!userTeam) {
      // Log unauthorized access attempt
      await securityMonitor.recordEvent(
        SecurityEventType.UNAUTHORIZED_ACCESS,
        SecuritySeverity.MEDIUM,

          ip: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || undefined,
          userId: user.sub 

          endpoint: '/api/trades' 

          method: 'GET'

        },

          description: 'User attempted to access trades for league they do not belong to',
          threat: 'Unauthorized data access',
          evidence: { leagueId, userId: user.sub  

          recommendations: ['Verify user permissions', 'Check for privilege escalation']
        },

          requestId: request.headers.get('x-request-id') || undefined || undefined,
          tags: ['trades', 'unauthorized-access']

      );
      
      return NextResponse.json({ error: 'League not found or access denied' , { status: 404 });

    // Use optimized trade query with pagination and caching
    const { QueryOptimizer } = await import('@/lib/query-optimizer');
    const result = await QueryOptimizer.getTradesPaginated(prisma, leagueId, { status,
      page }
      limit
    }) as any;

    const { trades, pagination } = result;

    // Separate pending and completed trades
    const pendingTrades = trades.filter((trade: any) => trade.status === 'PENDING');
    const tradeHistory = trades.filter((trade: any) => trade.status !== 'PENDING');

    logger.info('Fetched trades for league', 'API', 
      dataProtection.sanitizeForLogging({ leagueId,
        userId: user.sub,
        tradesCount: trades.length,
        pendingCount: pendingTrades.length,
        requestId: request.headers.get('x-request-id') || undefined


    );

    return NextResponse.json({ success: true });

      pagination
    })); catch (error) { const errorInstance = error instanceof Error ? error : new Error('Unknown error');
    logger.error('Failed to fetch trades', errorInstance, 'API', 
      dataProtection.sanitizeForLogging({
        userId: user.sub 

        requestId: request.headers.get('x-request-id') || undefined


    );
    return NextResponse.json({ error: 'Internal server error' , { status: 500 });


// Trade creation schema
const createTradeSchema = z.object({ leagueId: z.string().uuid(),
  toTeamId: z.string().uuid(),
  items: z.array(z.object({

    playerId: z.string().uuid(),
    fromTeamId: z.string().uuid(),
    toTeamId: z.string().uuid(),
    itemType: z.enum(['PLAYER', 'DRAFT_PICK', 'FAAB']).default('PLAYER'),
    metadata: z.record(z.any()).optional()

)).min(1).max(20), // Limit number of items to prevent abuse
  notes: z.string().max(500).optional() 

  expiresAt: z.string().datetime().optional()


        });

// POST /api/trades - Create a new trade proposal
export async function POST(req?: NextRequest) {
  try {
    // Enhanced API security

  const apiSecurityResult = await apiSecurity.secure(request, {
    requireAuth: true,
    validateSchema: createTradeSchema,
    allowedMethods: ['POST'],
    requireContentType: ['application/json'],
    rateLimit: 'write',
    sanitizeInput: true,
    enableThreatDetection: true,
    enableCSRFProtection: true,
    enableSQLProtection: true,
    maxRequestSize: 1024 * 1024, // 1MB max
    requireSecureTransport: true


         });

  if (!apiSecurityResult.success) return apiSecurityResult.response!;

  // Enhanced authentication and authorization
  const authResult = await authMiddleware.authenticate(request, {
    requireAuth: true,
    requiredPermissions: [Permission.PROPOSE_TRADE],
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });


    validateSession: true 

    requireActiveUser: true


        });

  if (!authResult.success) return authResult.response!;

  const { data: tradeData, user } = { data: apiSecurityResult.data, user: authResult.user   

  try {
    // Verify user owns a team in the league and can create trades
    const userTeam = await prisma.team.findFirst({
      where: {

        leagueId: tradeData.leagueId 

        owner: {
          auth0Id: user.sub



    });

    if (!userTeam) { // Log unauthorized trade creation attempt
      await securityMonitor.recordEvent(
        SecurityEventType.UNAUTHORIZED_ACCESS,
        SecuritySeverity.MEDIUM,

          ip: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || undefined,
          userId: user.sub,
          endpoint: '/api/trades',
          method: 'POST'

          description: 'User attempted to create trade in league they do not belong to' 

          threat: 'Unauthorized trade creation' 

          evidence: { leagueId: tradeData.leagueId, userId: user.sub },
          recommendations: ['Verify user league membership', 'Check for privilege escalation']
        },

          requestId: request.headers.get('x-request-id') || undefined || undefined,
          tags: ['trades', 'unauthorized-creation']

      );
      
      return NextResponse.json({ error: 'You do not have a team in this league' , { status: 403 });

    // Verify all players belong to the correct teams
    for (const item of tradeData.items) { const rosterPlayer = await prisma.rosterPlayer.findFirst({
        where: {

          teamId: item.fromTeamId,
          playerId: item.playerId

);

      if (!rosterPlayer) {
        return NextResponse.json({ success: true });

          error: `Player not found on team ${item.fromTeamId}` 
        }, { status: 400  });


    // Create the trade
    const newTrade = await prisma.trade.create({
      data: {

        leagueId: tradeData.leagueId,
        proposerId: user.sub,
        notes: tradeData.notes,
        expiresAt: tradeData.expiresAt ? new Date(tradeData.expiresAt) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        items: {
          create: tradeData.items.map((item: any) => ({

            fromTeamId: item.fromTeamId,
            toTeamId: item.toTeamId,
            playerId: item.playerId,
            itemType: item.itemType 

            metadata: item.metadata || {}))

      },
      include: {
        proposer: {

          select: { id: true, name: true 
  },
        items: {
          include: {
            player: {

              select: { id: true, name: true, position: true, nflTeam: true 
  });

    logger.info('Trade proposal created', 'API', 
      dataProtection.sanitizeForLogging({ tradeId: newTrade.id,
        leagueId: tradeData.leagueId,
        proposerId: user.sub,
        itemsCount: tradeData.items.length,
        requestId: request.headers.get('x-request-id') || undefined


    );

    return NextResponse.json(newTrade, { status: 201  }); catch (error) {
    const errorInstance = error instanceof Error ? error : new Error('Unknown error');
    logger.error('Failed to create trade', errorInstance, 'API', 
      dataProtection.sanitizeForLogging({
        userId: user.sub,
        leagueId: tradeData.leagueId 

        requestId: request.headers.get('x-request-id') || undefined


    );
    return NextResponse.json({ error: 'Internal server error' , { status: 500 });

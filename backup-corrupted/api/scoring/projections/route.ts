import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { PlayerProjection } from '@/lib/live-scoring';
import { ScoringExtendedSchema, validateSecureRequest } from '@/lib/validation/api-schemas';

// ProjectionRequest interface for future API expansion
interface ProjectionRequest { playerIds?: string[];
  position?: string;
  week?: number;
  season?: number;
  includeFactors?: boolean;

interface BulkProjectionUpdate {
  projections: Array<{
    playerId: string;
    projectedPoints: number;
    confidence: number;
    floor: number;
    ceiling: number;
    factors: {
      matchup: 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'BAD' | 'TERRIBLE';
      injury: 'HEALTHY' | 'QUESTIONABLE' | 'DOUBTFUL' | 'OUT';
      weather?: string;
      usage?: number;

;
  }>;
  week: number;
  season: number;


/**
 * GET /api/scoring/projections
 * Get player projections for a given week
 */
export async function GET(req?: NextRequest) {
  try {
    const startTime = Date.now();
  
  try {
    // Authentication check
    const session = await getSession();
    if (!session?.user) {

      logger.warn('Unauthorized projections request', 'ProjectionsAPI');
      return NextResponse.json(
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });



        { error: 'Authentication required'  

        { status: 401 });

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const playerIds = searchParams.get('playerIds')?.split(',') || [];
    const position = searchParams.get('position');
    const week = searchParams.get('week') ? parseInt(searchParams.get('week')!) : getCurrentNFLWeek();
    const season = searchParams.get('season') ? parseInt(searchParams.get('season')!) : new Date().getFullYear();
    const includeFactors = searchParams.get('includeFactors') === 'true';

    logger.info('Fetching player projections', 'ProjectionsAPI', { playerIds: playerIds.slice(0, 5), // Log first 5 for brevity
      position,
      week,
      season,
      userId: session.user.sub


         });

    // Build query conditions
    const whereConditions: any = {

      week }
      season
    };

    if (playerIds.length > 0) { whereConditions.playerId = { in: playerIds  

;

    if (position) {
      whereConditions.player = {
        position: position.toUpperCase()

      };

    // Fetch projections from database
    const dbProjections = await prisma.playerProjection.findMany({ where: whereConditions,
      include: {
        player: {
          select: {

            id: true,
            name: true,
            position: true,
            nflTeam: true,
            status: true

      orderBy: {
        projectedPoints: 'desc'


    });

    // Transform to response format
    const projections: PlayerProjection[] = await Promise.all(
      dbProjections.map(async (proj) => { const player = proj.player;
        const playerName = player.name;

        // Get advanced factors if requested
        let factors: any = {

          matchup: 'AVERAGE',
          injury: (player.status || 'HEALTHY'),
          weather: undefined,
          usage: undefined

        if (includeFactors) {
          factors = await getProjectionFactors(player.id, week, season);

        const projectedPointsNum = typeof proj.projectedPoints === 'number' 
          ? proj.projectedPoints 
          : Number(proj.projectedPoints);

        return {
          playerId: player.id,
          playerName,
          position: player.position,
          nflTeam: player.nflTeam,
          projectedPoints: projectedPointsNum,
          confidence: proj.confidence || 75,
          floor: projectedPointsNum * 0.6,
          ceiling: projectedPointsNum * 1.4 

          lastUpdate: proj.updatedAt 

          factors
        };

    );

    // If no projections found and player IDs provided, generate basic projections
    if (projections.length === 0 && playerIds.length > 0) { const basicProjections = await generateBasicProjections(playerIds, week, season);
      projections.push(...basicProjections);

    const response = {
      projections,
      week,
      season,
      lastUpdate: new Date(),
      metadata: {

        totalPlayers: projections.length,
        averageProjection: projections.length > 0 

          ? projections.reduce((sum, p) => sum + p.projectedPoints, 0) / projections.length 
          : 0,
        processingTime: Date.now() - startTime


    logger.info('Projections fetched successfully', 'ProjectionsAPI', {
      playerCount: projections.length,
      week,
      season }
      processingTime: Date.now() - startTime


        });

    return NextResponse.json(response); catch (error) { logger.error('Error fetching projections', error as Error, 'ProjectionsAPI', {
      processingTime: Date.now() - startTime


         });

    return NextResponse.json(

        error: 'Failed to fetch projections' 

        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined

      },
      { status: 500  

);


/**
 * POST /api/scoring/projections
 * Update player projections (admin/commissioner only)
 */
export async function POST(req?: NextRequest) {
  try {
    const startTime = Date.now();
  
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json(

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });



        { error: 'Authentication required' },
        { status: 401  

);

    // Validate request data with security measures
    const validation = await validateSecureRequest(request, ScoringExtendedSchema.projections.POST, {
      maxSize: 500 * 1024, // 500KB limit for bulk projection updates
      allowedMethods: ['POST']


        });

    if (!validation.success) { return NextResponse.json(

        { error: validation.error  

        { status: validation.status || 400 

      );

    const { updates } = validation.data;
    const projections = updates;
    const week = updates[0]?.week || getCurrentNFLWeek();
    const season = updates[0]?.season || new Date().getFullYear();

    // Check if user has admin permissions (implement your auth logic)
    const isAdmin = await checkAdminPermissions(session.user.sub);
    if (!isAdmin) { logger.warn('Unauthorized projection update attempt', 'ProjectionsAPI', {
        userId: session.user.sub


);
      return NextResponse.json(
        { error: 'Admin permissions required' },
        { status: 403 ,
);

    logger.info('Updating player projections', 'ProjectionsAPI', {
      projectionCount: projections.length,
      week,
      season }
      userId: session.user.sub


        });

    // Update projections in batch
    const updatePromises = projections.map(async (projection) => { return prisma.playerProjection.upsert({
        where: {
          playerId_week_season_source: {

            playerId: projection.playerId,
            week: week,
            season: season,
            source: 'SYSTEM'

        update: {

          projectedPoints: projection.projectedPoints,
          confidence: (projection as any).confidence || 0.75 

          updatedAt: new Date()

        },
        create: { playerId: projection.playerId,
          week,
          season,
          projectedPoints: projection.projectedPoints,
          confidence: (projection as any).confidence || 0.75,
          source: 'SYSTEM'


       }););

    const results = await Promise.allSettled(updatePromises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    logger.info('Projection update completed', 'ProjectionsAPI', {
      successful,
      failed,
      total: projections.length,
      processingTime: Date.now() - startTime


         });

    return NextResponse.json({ success: true });
      updated: successful,
      failed,
      total: projections.length,
      week,
      season }
      timestamp: new Date()


        })); catch (error) { logger.error('Error updating projections', error as Error, 'ProjectionsAPI', {
      processingTime: Date.now() - startTime


         });

    return NextResponse.json(

        error: 'Failed to update projections' 

        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined

      },
      { status: 500  

);


/**
 * PUT /api/scoring/projections/refresh
 * Refresh projections from external sources
 */
export async function PUT(req?: NextRequest) {
  try {
    const startTime = Date.now();
  
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json(

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });



        { error: 'Authentication required' },
        { status: 401  

);

    const { searchParams } = new URL(request.url);
    const week = searchParams.get('week') ? parseInt(searchParams.get('week')!) : getCurrentNFLWeek();
    const season = searchParams.get('season') ? parseInt(searchParams.get('season')!) : new Date().getFullYear();
    const source = searchParams.get('source') || 'fantasypros'; // Default source

    // Check admin permissions
    const isAdmin = await checkAdminPermissions(session.user.sub);
    if (!isAdmin) {
      return NextResponse.json(

        { error: 'Admin permissions required'  

        { status: 403 });

    logger.info('Refreshing projections from external source', 'ProjectionsAPI', { week,
      season,
      source,
      userId: session.user.sub

);

    // Fetch projections from external source
    const freshProjections = await fetchProjectionsFromSource(source, week, season);

    // Update database
    const updatePromises = freshProjections.map(projection => 
      prisma.playerProjection.upsert({
        where: {
          playerId_week_season_source: {

            playerId: projection.playerId,
            week: week,
            season: season 

            source: source


        },
        update: { projectedPoints: projection.projectedPoints,
          confidence: (projection as any).confidence || 0.75,
          updatedAt: new Date()

        create: {

          playerId: projection.playerId,
          week,
          season,
          projectedPoints: projection.projectedPoints,
          confidence: (projection as any).confidence || 0.75,
          source


    );

    const results = await Promise.allSettled(updatePromises);
    const successful = results.filter(r => r.status === 'fulfilled').length;

    logger.info('Projection refresh completed', 'ProjectionsAPI', {
      successful,
      total: freshProjections.length,
      source }
      processingTime: Date.now() - startTime


        });

    return NextResponse.json({ success: true });
      refreshed: successful,
      total: freshProjections.length,
      source,
      week,
      season,
      timestamp: new Date()


         }); catch (error) {
    logger.error('Error refreshing projections', error as Error, 'ProjectionsAPI', {
      processingTime: Date.now() - startTime


         });

    return NextResponse.json(

        error: 'Failed to refresh projections' 

        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined

      },
      { status: 500 ,
);


/**
 * Get advanced projection factors for a player
 */
async function getProjectionFactors(
  playerId: string, 
  week: number 

  season: number
): Promise<{
  matchup: 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'BAD' | 'TERRIBLE';
  injury: 'HEALTHY' | 'QUESTIONABLE' | 'DOUBTFUL' | 'OUT';
  weather?: string;
  usage?: number;

}> { try {
    // Get player details
    const player = await prisma.player.findUnique({
      where: { id: playerId ,
      select: {

        nflTeam: true,
        position: true 

        status: true


    });

    if (!player) { return {
        matchup: 'AVERAGE',
        injury: 'HEALTHY'


    // Get opponent (simplified - would need NFL schedule data)
    const matchupRating = await getMatchupRating(player.nflTeam, week, season);
    
    // Get weather conditions (simplified)
    const weather = await getWeatherConditions(player.nflTeam, week, season);
    
    // Get usage statistics (simplified)
    const usage = await getPlayerUsage(playerId, season);

    return {
      matchup: matchupRating,
      injury: (player.status as any) || 'HEALTHY',
      weather }
      usage
    }; catch (error) { logger.error('Error getting projection factors', error as Error, 'ProjectionsAPI', {
      playerId,
      week }
      season
    });

    return { matchup: 'AVERAGE',
      injury: 'HEALTHY'

/**
 * Generate basic projections for players without stored projections
 */
async function generateBasicProjections(
  playerIds: string[], 
  _week: number 

  _season: number
): Promise<PlayerProjection[]> {
  const projections: PlayerProjection[] = [];

  for (const playerId of playerIds) {
    try {
      const player = await prisma.player.findUnique({

        where: { id: playerId },
        select: { id: true,
          name: true,
          position: true,
          nflTeam: true,
          status: true


       });

      if (player) {
        // Basic projection based on position averages
        const baseProjection = getPositionBaseProjection(player.position);
        
        projections.push({
          playerId: player.id,
          playerName: player.name,
          position: player.position,
          nflTeam: player.nflTeam,
          projectedPoints: baseProjection,
          confidence: 50, // Low confidence for generated projections
          floor: baseProjection * 0.5,
          ceiling: baseProjection * 1.5,
          lastUpdate: new Date(),
          factors: {

            matchup: 'AVERAGE' 

            injury: (player.status as any) || 'HEALTHY'


        });
;
    } catch (error) {
      logger.error('Error generating basic projection', error as Error, 'ProjectionsAPI', {
        playerId
      });


  return projections;

/**
 * Get position-based base projections
 */
function getPositionBaseProjection(position: string): number { const baseProjections: Record<string, number> = {
    'QB': 18.5,
    'RB': 12.3,
    'WR': 11.8,
    'TE': 8.7,
    'K': 7.2 }
    'DEF': 8.9
  };

  return baseProjections[position] || 8.0;

/**
 * Check if user has admin permissions
 */
async function checkAdminPermissions(userId: string): Promise<boolean> { try {
    // Check if user is admin or commissioner
    const adminRole = await prisma.user.findUnique({

      where: { auth0Id: userId  

      select: { 
        roles: {

          select: { type: true },
        commissionedLeagues: {

          select: { id: true 
  });

    return adminRole?.roles?.some(r => r.type === 'ADMIN') || (adminRole?.commissionedLeagues?.length || 0) > 0; catch (error) {
    logger.error('Error checking admin permissions', error as Error, 'ProjectionsAPI', { userId });
    return false;


/**
 * Fetch projections from external source (mock implementation)
 */
async function fetchProjectionsFromSource(
  source: string, 
  week: number, 
  season: number
): Promise<Array<{ playerId: string;
  projectedPoints: number;
  confidence: number;
  floor: number;
  ceiling: number;
  factors: any;

>> {
  // Mock implementation - in production, this would call external APIs
  logger.info('Fetching projections from external source', 'ProjectionsAPI', {
    source,
    week }
    season
  });

  // Return empty array for now - implement actual API calls
  return [];

/**
 * Get matchup rating for a team
 */
async function getMatchupRating(
  _team: string, 
  _week: number, 
  _season: number
): Promise<'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'BAD' | 'TERRIBLE'> { // Mock implementation - would analyze opponent defense rankings

  const ratings = ['EXCELLENT', 'GOOD', 'AVERAGE', 'BAD', 'TERRIBLE'] as const;
  return ratings[Math.floor(Math.random() * ratings.length)];

/**
 * Get weather conditions for a team's game
 */
async function getWeatherConditions(
  _team: string, 
  _week: number 

  _season: number
): Promise<string | undefined> {
  // Mock implementation - would fetch weather data

  const conditions = ['Clear', 'Light Rain', 'Heavy Rain', 'Snow', 'Wind'];
  return Math.random() < 0.3 ? conditions[Math.floor(Math.random() * conditions.length)] : undefined;

/**
 * Get player usage statistics
 */
async function getPlayerUsage(_playerId: string, _season: number): Promise<number | undefined> {

  // Mock implementation - would calculate target share, snap count, etc.
  return Math.random() < 0.7 ? Math.random() * 30 : undefined;

/**
 * Get current NFL week
 */
function getCurrentNFLWeek(): number {
  const now = new Date();
  const seasonStart = new Date(now.getFullYear(), 8, 1); // September 1st
  const weeksSinceStart = Math.floor((now.getTime() - seasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000);
  return Math.max(1, Math.min(18, weeksSinceStart + 1);

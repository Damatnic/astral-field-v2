import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { NFLDataService } from '@/lib/nfl-api';
import { MatchupScore, LiveScore, ScoringPlay } from '@/lib/live-scoring';
import { securityConfig } from '@/lib/security-config';

// LiveScoresParams interface defined for future API expansion
interface LiveScoresParams {
  leagueId: string;
  week?: number;
  includeProjections?: boolean;
  includePlays?: boolean;


/**
 * GET /api/scoring/live
 * Get live scores for a league
 */
export async function GET(req?: NextRequest) {
  try {
    const startTime = Date.now();
  
  try {
    // Authentication check
    const session = await getSession();
    if (!session?.user) {

      logger.warn('Unauthorized live scores request', 'LiveScoresAPI');
      return NextResponse.json(
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });



        { error: 'Authentication required'  

        { status: 401 });

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const leagueId = searchParams.get('leagueId');
    const week = searchParams.get('week') ? parseInt(searchParams.get('week')!) : null;
    const includeProjections = searchParams.get('includeProjections') === 'true';
    const includePlays = searchParams.get('includePlays') === 'true';

    if (!leagueId) {
      return NextResponse.json(

        { error: 'League ID is required'  

        { status: 400 });

    // Rate limiting check
    if (securityConfig.rateLimiting.enabled) { // Implementation would depend on your rate limiting strategy
      logger.debug('Rate limiting check passed', 'LiveScoresAPI', { userId: session.user.sub ,
);

    logger.info('Fetching live scores', 'LiveScoresAPI', {
      leagueId,
      week,
      userId: session.user.sub 

      includeProjections }
      includePlays
    });

    // Verify user access to league
    const userLeague = await prisma.leagueMember.findFirst({ where: {

        leagueId,
        userId: session.user.sub

      include: {
        league: true


    });

    if (!userLeague) { logger.warn('User does not have access to league', 'LiveScoresAPI', {
        leagueId,
        userId: session.user.sub


);
      return NextResponse.json(
        { error: 'Access denied to league' },
        { status: 403 ,
);

    // Get current week if not provided
    const currentWeek = week || getCurrentNFLWeek();
    
    // Fetch matchups for the week
    const matchups = await prisma.matchup.findMany({
      where: {

        leagueId }
        week: currentWeek

      },
      include: { homeTeam: {
          include: {

            owner: true,
            roster: {
              include: {
                player: true

        awayTeam: {
          include: {

            owner: true 

            roster: {
              include: {
                player: true






    });

    // Initialize NFL data service
    const nflService = new NFLDataService();
    
    // Get live scores for each matchup
    const liveMatchups: MatchupScore[] = [];
    const allPlays: ScoringPlay[] = [];

    for (const matchup of matchups) { try {
        // Get live scores for home team
        const homeScores = await getTeamLiveScores(

          matchup.homeTeam.roster,
          nflService,
          currentWeek
        );
        
        // Get live scores for away team
        const awayScores = await getTeamLiveScores(
          matchup.awayTeam.roster,
          nflService,
          currentWeek
        );

        // Calculate team totals
        const homeScore = homeScores
          .filter(s => s.isStarter)
          .reduce((sum, s) => sum + s.currentPoints, 0);
          
        const awayScore = awayScores
          .filter(s => s.isStarter)
          .reduce((sum, s) => sum + s.currentPoints, 0);

        // Get projections if requested
        let homeProjected = 0;
        let awayProjected = 0;
        
        if (includeProjections) {
          homeProjected = await getTeamProjections(matchup.homeTeam.roster, nflService);
          awayProjected = await getTeamProjections(matchup.awayTeam.roster, nflService);

        // Calculate win probability (simplified algorithm)
        const winProbability = calculateWinProbability(
          homeScore,
          awayScore,
          homeProjected,
          awayProjected
        );

        // Check if any games are live
        const isLive = isCurrentlyGameTime();
        const gameStatus = getGameStatus();

        // Create matchup score object
        const matchupScore: MatchupScore = {

          matchupId: matchup.id,
          homeTeamId: matchup.homeTeamId,
          awayTeamId: matchup.awayTeamId,
          homeTeamName: matchup.homeTeam.name,
          awayTeamName: matchup.awayTeam.name,
          homeScore,
          awayScore,
          homeProjected,
          awayProjected,
          winProbability,
          isLive,
          lastUpdate: new Date(),
          gameStatus,
          homeStartingLineup: homeScores.filter(s => s.isStarter),
          awayStartingLineup: awayScores.filter(s => s.isStarter),
          homeBench: homeScores.filter(s => !s.isStarter),
          awayBench: awayScores.filter(s => !s.isStarter)


;

        liveMatchups.push(matchupScore);

        // Get scoring plays if requested
        if (includePlays) {
          const plays = await getScoringPlays(matchup.id, currentWeek);
          allPlays.push(...plays);
;

    } catch (error) { logger.error('Error processing matchup', error as Error, 'LiveScoresAPI', {
          matchupId: matchup.id

);
        // Continue processing other matchups


    // Prepare response
    const response = {
      matchups: liveMatchups,
      plays: includePlays ? allPlays : undefined,
      week: currentWeek,
      lastUpdate: new Date(),
      isLive: liveMatchups.some(m => m.isLive),
      metadata: {

        totalMatchups: liveMatchups.length,
        liveMatchups: liveMatchups.filter(m => m.isLive).length 

        processingTime: Date.now() - startTime


    };

    logger.info('Live scores fetched successfully', 'LiveScoresAPI', { leagueId,
      matchupCount: liveMatchups.length,
      processingTime: Date.now() - startTime


         });

    return NextResponse.json(response); catch (error) {
    logger.error('Error fetching live scores', error as Error, 'LiveScoresAPI', {
      processingTime: Date.now() - startTime


         });

    return NextResponse.json(

        error: 'Failed to fetch live scores' 

        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined

      },
      { status: 500 ,
);


/**
 * Get live scores for a team's roster
 */
async function getTeamLiveScores(
  roster: any[],
  nflService: NFLDataService 

  week: number

): Promise<(LiveScore & { isStarter: boolean })[]> { const scores: (LiveScore & { isStarter: boolean  

)[] = [];

  for (const rosterEntry of roster) {
    try {
      // Get player stats
      const playerStats = await nflService.getPlayerStats(week, new Date().getFullYear();
      const playerStat = playerStats.find(s => s.playerId === rosterEntry.player.sleeperId);

      if (playerStat) {
        // Calculate fantasy points

        const fantasyPoints = nflService.calculateFantasyPoints(playerStat, {});

        // Get game status
        const gameStatus = getPlayerGameStatus(rosterEntry.player);
        const gameTimeRemaining = getGameTimeRemaining(rosterEntry.player);

        const liveScore: LiveScore & { isStarter: boolean ,
= {
          teamId: rosterEntry.teamId,
          playerId: rosterEntry.player.id 

          playerName: `${rosterEntry.player.firstName} ${rosterEntry.player.lastName}`,
          position: rosterEntry.player.position,
          nflTeam: rosterEntry.player.team,
          currentPoints: fantasyPoints,
          projectedPoints: rosterEntry.projectedPoints || 0,
          isActive: !playerStat.gameCompleted,
          lastUpdate: new Date(),
          gameStatus,
          gameTimeRemaining,
          redZone: checkRedZoneStatus(rosterEntry.player),
          target: checkHighTargetStatus(rosterEntry.player),
          isStarter: rosterEntry.isStarter

        scores.push(liveScore);
;
    } catch (error) { logger.error('Error getting player live score', error as Error, 'LiveScoresAPI', {
        playerId: rosterEntry.player.id

);


  return scores;

/**
 * Get team projections
 */
async function getTeamProjections(roster: any[], _nflService: NFLDataService): Promise<number> {
  // This would typically fetch from a projections service

  // For now, return sum of individual player projections
  return roster
    .filter(r => r.isStarter)
    .reduce((sum, r) => sum + (r.projectedPoints || 0), 0);

/**
 * Calculate win probability based on current scores and projections
 */
function calculateWinProbability(
  homeScore: number,
  awayScore: number,
  homeProjected: number 

  awayProjected: number
): number {
  // Simplified win probability calculation
  const scoreDiff = homeScore - awayScore;
  const projectedDiff = homeProjected - awayProjected;
  
  // Base probability from score difference
  let probability = 50 + (scoreDiff * 2);
  
  // Adjust based on projections
  probability += projectedDiff * 0.5;
  
  // Clamp between 10-90% (never 100% certainty)

  return Math.max(10, Math.min(90, probability);

/**
 * Get current NFL week
 */
function getCurrentNFLWeek(): number {
  const now = new Date();
  const seasonStart = new Date(now.getFullYear(), 8, 1); // September 1st
  const weeksSinceStart = Math.floor((now.getTime() - seasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000);
  return Math.max(1, Math.min(18, weeksSinceStart + 1);

/**
 * Check if it's currently NFL game time
 */
function isCurrentlyGameTime(): boolean {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const hour = now.getHours();

  // NFL games typically on Sunday, Monday, Thursday
  if (day === 0) { // Sunday
    return hour >= 13 && hour <= 23; // 1pm - 11pm ET

  } else if (day === 1) { // Monday
    return hour >= 20 && hour <= 23; // 8pm - 11pm ET

  } else if (day === 4) { // Thursday
    return hour >= 20 && hour <= 23; // 8pm - 11pm ET

  return false;

/**
 * Get current game status
 */
function getGameStatus(): 'NOT_STARTED' | 'IN_PROGRESS' | 'FINAL' {
  if (isCurrentlyGameTime()) {
    return 'IN_PROGRESS';

  const now = new Date();
  const hour = now.getHours();
  
  // Simple logic - games are final after 11pm
  if (hour >= 23 || hour < 8) {
    return 'FINAL';

  return 'NOT_STARTED';

/**
 * Get player game status
 */
function getPlayerGameStatus(_player: any): 'NOT_STARTED' | 'IN_PROGRESS' | 'HALFTIME' | 'FINAL' | 'DELAYED' {
  // This would typically check the actual NFL game status

  // For now, return based on general game time
  return getGameStatus() as any;

/**
 * Get game time remaining
 */
function getGameTimeRemaining(_player: any): string | undefined {
  if (isCurrentlyGameTime()) {
    // This would typically get real game time from NFL API
    return "Q2 8:45";


  return undefined;

/**
 * Check if player is in red zone
 */
function checkRedZoneStatus(_player: any): boolean {
  // This would check real-time game data

  // For now, randomly assign some players to red zone for demo
  return Math.random() < 0.1; // 10% chance

/**
 * Check if player has high target probability
 */
function checkHighTargetStatus(player: any): boolean {
  // This would check real-time target data

  // For now, randomly assign based on position
  if (['WR', 'TE', 'RB'].includes(player.position)) {
    return Math.random() < 0.15; // 15% chance for skill positions

  return false;

/**
 * Get scoring plays for a matchup
 */
async function getScoringPlays(matchupId: string, _week: number): Promise<ScoringPlay[]> {
  // This would typically fetch from a real-time plays database

  // For now, return mock data
  const mockPlays: ScoringPlay[] = [

      playId: `${matchupId}-play-1`,
      playerId: 'player1',
      playerName: 'Josh Allen',
      playType: 'TD',
      description: '25-yard rushing touchdown',
      points: 10.5,
      timestamp: new Date(Date.now() - 300000),
      quarter: 2,
      timeRemaining: '3:45',
      yardage: 25,
      isBigPlay: true


  ];

  return mockPlays;

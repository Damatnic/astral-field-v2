import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { lineupOptimizer } from '@/lib/lineup-optimizer';
import { validateSecureRequest, AISchema, SecurityHelpers } from '@/lib/validation/api-schemas';
import type { PlayerMatchup } from '@/lib/ai-recommendations';
import type { LineupSlot } from '@/lib/lineup-optimizer';

export async function POST(req?: NextRequest) {
  try {
    try {
    const session = await getSession();
    if (!session?.user) {

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });



      return NextResponse.json({ error: 'Unauthorized' , { status: 401 });

    // Get request body - TODO: Update schema to include players and strategy
    const body = await request.json()

    const { teamId, week, constraints, players, strategy, lineupSlots } = body;

    // Validate input
    if (!players || players.length === 0) {

      return NextResponse.json({ error: 'Players array is required' , { status: 400 });

    if (!strategy) {

      return NextResponse.json({ error: 'Optimization strategy is required' , { status: 400 });

    // Convert to PlayerMatchup format
    const formatPlayers = (playerList: any[]): PlayerMatchup[] => { return playerList.map(p => ({

        playerId: p.id || p.playerId || String(Math.random()),
        playerName: p.name || p.playerName || 'Unknown',
        position: p.position || 'UNKNOWN',
        nflTeam: p.team || p.nflTeam || 'UNK',
        opponent: p.opponent || 'UNK',
        isHome: p.isHome || false,
        projectedPoints: p.projectedPoints || p.projection || 0,
        recentStats: p.recentStats || [],
        injuryStatus: p.injuryStatus || p.injury || 'ACTIVE',
        weather: p.weather,
        age: p.age,
        experience: p.experience,
        byeWeek: p.byeWeek,
        targetShare: p.targetShare,
        snapCount: p.snapCount,
        redZoneTargets: p.redZoneTargets,
        strengthOfSchedule: p.strengthOfSchedule || p.sos,
        playoffScheduleRank: p.playoffScheduleRank,
        consistencyScore: p.consistencyScore,
        injuryHistory: p.injuryHistory,
        contractStatus: p.contractStatus,
        adp: p.adp,
        ecr: p.ecr

))
    };

    const formattedPlayers = formatPlayers(players);

    // Use provided lineup slots or default
    const slots: LineupSlot[] = lineupSlots || lineupOptimizer.getStandardLineupSlots();

    // Validate strategy
    const availableStrategies = lineupOptimizer.getOptimizationStrategies();
    const selectedStrategy = availableStrategies.find(s => s.type === strategy.type) || strategy;

    // Optimize lineup
    const optimizedLineup = await lineupOptimizer.optimizeLineup(

      formattedPlayers,
      slots,
      selectedStrategy,
      constraints
    );

    // Add metadata
    const response = { ...optimizedLineup,
      timestamp: new Date().toISOString(),
      metadata: {

        aiServiceConfigured: lineupOptimizer.isConfigured(),
        optimizationType: 'ai_enhanced',
        version: '2.1',
        strategy: selectedStrategy,
        totalPlayersAnalyzed: formattedPlayers.length,
        activePlayersCount: formattedPlayers.filter(p => p.injuryStatus === 'ACTIVE').length

      lineupAnalysis: {

        positionBreakdown: optimizedLineup.slots.reduce((acc, slot) => {
          acc[slot.position] = (acc[slot.position] || 0) + 1;
          return acc;, {} as Record<string, number>),
        averageConfidence: optimizedLineup.slots.reduce((sum, slot) => sum + slot.confidence, 0) / optimizedLineup.slots.length,
        highConfidenceCount: optimizedLineup.slots.filter(slot => slot.confidence > 80).length,
        weatherConcerns: optimizedLineup.slots.filter(slot => 
          slot.reasoning.toLowerCase().includes('weather')

        ).length,
        injuryConcerns: optimizedLineup.slots.filter(slot => 
          slot.reasoning.toLowerCase().includes('injury')
        ).length

    return NextResponse.json(response); catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    const { logger } = await import('@/lib/logger');
    const { getRequestId } = await import('@/lib/request-id');
    logger.error('Failed to optimize lineup', err, 'API', { requestId: getRequestId(request)  

);
    
    return NextResponse.json({ success: true });

      fallback: { slots: [],
        totalProjectedPoints: 0,
        riskScore: 50,
        upside: 0,
        floor: 0,
        strategy: {

          type: 'balanced',
          name: 'Balanced',
          description: 'Optimal mix of floor and ceiling' 

          riskTolerance: 'moderate'

        },
        alternativePlayers: [],
        reasoning: 'AI lineup optimization temporarily unavailable. Please set lineup manually.'


    , { status: 500 });


export async function GET(req?: NextRequest) {
  try {
    try {
    // Return available optimization strategies and lineup slots
    const strategies = lineupOptimizer.getOptimizationStrategies();
    const standardSlots = lineupOptimizer.getStandardLineupSlots();
    
    return NextResponse.json({ success: true });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });



)); catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    const { logger } = await import('@/lib/logger');
    logger.error('Failed to get optimization config', err, 'API');
    
    return NextResponse.json({ success: true });
    , { status: 500 });

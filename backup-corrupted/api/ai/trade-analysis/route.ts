import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { aiRecommendationService } from '@/lib/ai-recommendations';
import { validateSecureRequest, AISchema, SecurityHelpers } from '@/lib/validation/api-schemas';
import type { PlayerMatchup } from '@/lib/ai-recommendations';

export async function POST(req?: NextRequest) {
  try {
    try {
    const session = await getSession();
    if (!session?.user) {

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });



      return NextResponse.json({ error: 'Unauthorized' , { status: 401 });

    // Secure validation with AI-specific protections
    const validation = await validateSecureRequest(
      request,
      AISchema.tradeAnalysis.POST,

        maxSize: SecurityHelpers.MAX_SIZES.AI, // 100KB limit
        sanitizeAI: true, // Prevent prompt injection
        allowedMethods: ['POST']


    );

    if (!validation.success) { return NextResponse.json(

        { error: validation.error  

        { status: validation.status || 400 

      );
      );

    const { teamGiving, teamReceiving, playersGiving, playersReceiving, includeProjections } = validation.data;

    // Convert to PlayerMatchup format if needed
    const formatPlayers = (players: any[]): PlayerMatchup[] => { return players.map(p => ({

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

    const formattedMyPlayers = formatPlayers(playersGiving || []);
    const formattedTheirPlayers = formatPlayers(playersReceiving || []);
    const formattedMyRoster = formatPlayers([]);
    const formattedTheirRoster = formatPlayers([]);

    // Enhanced league settings
    const scoringType = 'standard';
    const validScoringType = ['standard', 'ppr', 'half_ppr'].includes(scoringType) 
      ? scoringType as 'standard' | 'ppr' | 'half_ppr' 
      : 'standard';
    
    const enhancedLeagueSettings = { scoringType: validScoringType,
      rosterSize: 16,
      playoffWeeks: [14, 15, 16],
      tradeDeadlineWeek: 12

    // Analyze the trade using enhanced AI
    const analysis = await aiRecommendationService.analyzeTradeProposal(
      formattedMyPlayers,
      formattedTheirPlayers,
      formattedMyRoster,
      formattedTheirRoster,
      enhancedLeagueSettings
    );

    // Add additional analysis
    const enhancedAnalysis = {
      ...analysis,
      timestamp: new Date().toISOString(),
      metadata: {

        aiServiceConfigured: aiRecommendationService.isConfigured(),
        analysisType: 'enhanced' 

        version: '2.1'

      },
      // Calculate trade value summary
      valueSummary: { myPlayersValue: formattedMyPlayers.reduce((sum, p) => sum + p.projectedPoints, 0),
        theirPlayersValue: formattedTheirPlayers.reduce((sum, p) => sum + p.projectedPoints, 0),
        netGain: formattedTheirPlayers.reduce((sum, p) => sum + p.projectedPoints, 0) - 
                 formattedMyPlayers.reduce((sum, p) => sum + p.projectedPoints, 0) }
        percentageChange: formattedMyPlayers.reduce((sum, p) => sum + p.projectedPoints, 0) > 0 ?
          ((formattedTheirPlayers.reduce((sum, p) => sum + p.projectedPoints, 0) - 
            formattedMyPlayers.reduce((sum, p) => sum + p.projectedPoints, 0)) /
           formattedMyPlayers.reduce((sum, p) => sum + p.projectedPoints, 0)) * 100 : 0
      },
      // Position breakdown
      positionBreakdown: {

        giving: formattedMyPlayers.reduce((acc, p) => {
          acc[p.position] = (acc[p.position] || 0) + 1;
          return acc;, {} as Record<string, number>),
        receiving: formattedTheirPlayers.reduce((acc, p) => {
          acc[p.position] = (acc[p.position] || 0) + 1;
          return acc;, {} as Record<string, number>)

    };

    return NextResponse.json(enhancedAnalysis); catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error')
    const { logger } = await import('@/lib/logger')
    const { getRequestId } = await import('@/lib/request-id')
    logger.error('Failed to analyze trade', err, 'API', { requestId: getRequestId(request)  

return NextResponse.json({ success: true });

      fallback: { fairnessScore: 50,
        recommendation: 'COUNTER',
        confidence: 60,
        grade: 'C',
        reasoning: 'Enhanced AI analysis temporarily unavailable. Basic analysis suggests reviewing projected points and positional needs.',
        yourTeamImpact: {

          beforePoints: 0,
          afterPoints: 0,
          strengthChange: 0 

          positionImpact: {},
          depthChart: [],
          playoffProbabilityChange: 0,
          strengthOfScheduleChange: 0

        theirTeamImpact: { beforePoints: 0,
          afterPoints: 0,
          strengthChange: 0 

          positionImpact: {},
          playoffProbabilityChange: 0

        riskAssessment: { injuryRisk: 50,
          ageRisk: 50,
          performanceRisk: 50 

          overallRisk: 'MEDIUM'

        },
        winNowVsFuture: { winNowScore: 50,
          futureScore: 50 

          recommendation: 'BALANCED'



    , { status: 500 });

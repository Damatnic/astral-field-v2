import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { aiRecommendationService } from '@/lib/ai-recommendations';
import { lineupOptimizer } from '@/lib/lineup-optimizer';
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
      AISchema.startSit.POST,

        maxSize: SecurityHelpers.MAX_SIZES.AI, // 100KB limit
        sanitizeAI: true, // Prevent prompt injection in any text fields
        allowedMethods: ['POST']


    );

    if (!validation.success) { return NextResponse.json(

        { error: validation.error  

        { status: validation.status || 400 

      );
      );

    const { roster, currentLineup, week, season, leagueSettings: _leagueSettings  

= validation.data;

    // Validate input
    if (!roster || roster.length === 0) {

      return NextResponse.json({ error: 'Roster is required' }, { status: 400  

);

    if (!currentLineup) {

      return NextResponse.json({ error: 'Current lineup is required' }, { status: 400 ,
);

    // Convert to PlayerMatchup format
    const formatPlayers = (playerList: any[]): PlayerMatchup[] => {
      return playerList.map(p => ({

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
        adp: p.adp 

        ecr: p.ecr

      }))
    };

    const formattedRoster = formatPlayers(roster);
    const currentWeek = week || Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000)) % 18 + 1;
    const currentSeason = season || new Date().getFullYear();

    // Get traditional start/sit recommendations
    const startSitRecommendations = await aiRecommendationService.getStartSitRecommendations(
      formattedRoster,
      currentWeek,
      currentSeason
    );

    // Get enhanced start/sit analysis using lineup optimizer
    const enhancedDecisions = await lineupOptimizer.analyzeStartSitDecisions(
      formattedRoster,
      currentLineup as any, // TODO: Fix type mismatch - expecting array but getting object
      currentWeek
    );

    // Analyze weather impact for all players
    const weatherAnalysis = formattedRoster.map(player => 
      lineupOptimizer.analyzeWeatherImpact(player);

    // Combine and enhance recommendations
    const combinedRecommendations = startSitRecommendations.map(rec => { const enhancedDecision = enhancedDecisions.find(d => d.playerId === rec.playerId);
      const weatherImpact = weatherAnalysis.find(w => w.playerId === rec.playerId);
      const player = formattedRoster.find(p => p.playerId === rec.playerId);
      
      return {

        ...rec,
        enhancedDecision: enhancedDecision?.decision,
        enhancedConfidence: enhancedDecision?.confidence,
        enhancedReasoning: enhancedDecision?.reasoning,
        weatherImpact,
        conditions: enhancedDecision?.conditions,
        alternativeOptions: enhancedDecision?.alternativeOptions || rec.alternativeOptions || [],
        riskFactors: {

          injury: player?.injuryStatus !== 'ACTIVE',
          weather: weatherImpact?.impact === 'negative' && weatherImpact?.severity === 'high',
          matchup: false, // Would need matchup data to determine
          consistency: (player?.consistencyScore || 70) < 60

        projectedRange: {

          floor: Math.max(0, (weatherImpact?.adjustedProjection || player?.projectedPoints || 0) * 0.8),
          ceiling: (weatherImpact?.adjustedProjection || player?.projectedPoints || 0) * 1.3 

          projection: weatherImpact?.adjustedProjection || player?.projectedPoints || 0


      };);

    // Generate lineup optimization suggestions
    const lineupSuggestions = await aiRecommendationService.getLineupOptimization(
      formattedRoster,
      currentLineup as any // TODO: Fix type - expecting array but object provided
    );

    // Analyze positional priorities
    const positionalAnalysis = analyzePositionalPriorities(combinedRecommendations);

    // Create summary insights
    const insights = { totalRecommendations: combinedRecommendations.length,
      highConfidenceStarts: combinedRecommendations.filter(r => 
        r.recommendation === 'START' && (r.enhancedConfidence || r.confidence) > 80

      ).length,
      weatherConcerns: combinedRecommendations.filter(r => 
        r.weatherImpact?.impact === 'negative' && r.weatherImpact?.severity === 'high'

      ).length,
      injuryConcerns: combinedRecommendations.filter(r => 
        r.riskFactors?.injury

      ).length,
      suggestedChanges: lineupSuggestions.suggestedChanges.length,
      projectedPointsGain: lineupSuggestions.totalProjectedGain,
      topPriorities: combinedRecommendations
        .filter(r => r.recommendation === 'START' && (r.enhancedConfidence || r.confidence) > 75)

        .sort((a, b) => (b.enhancedConfidence || b.confidence) - (a.enhancedConfidence || a.confidence))
        .slice(0, 3)
        .map(r => ({
          playerName: r.playerName,
          position: formattedRoster.find(p => p.playerId === r.playerId)?.position,
          confidence: r.enhancedConfidence || r.confidence,
          reasoning: r.enhancedReasoning || r.reasoning

))
    };

    const response = { recommendations: combinedRecommendations,
      lineupSuggestions,
      positionalAnalysis,
      insights,
      weatherAnalysis: weatherAnalysis.filter(w => w.impact !== 'neutral'),
      timestamp: new Date().toISOString(),
      metadata: {

        week: currentWeek,
        season: currentSeason,
        aiServiceConfigured: aiRecommendationService.isConfigured(),
        analysisType: 'comprehensive',
        version: '2.1',
        totalPlayersAnalyzed: formattedRoster.length

;

    return NextResponse.json(response); catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    const { logger } = await import('@/lib/logger');
    const { getRequestId } = await import('@/lib/request-id');
    logger.error('Failed to analyze start/sit decisions', err, 'API', { requestId: getRequestId(request)  

);
    
    return NextResponse.json({ success: true });

      fallback: { recommendations: [],
        lineupSuggestions: {

          suggestedChanges: [] 

          totalProjectedGain: 0

        },
        insights: { totalRecommendations: 0,
          highConfidenceStarts: 0,
          weatherConcerns: 0,
          injuryConcerns: 0,
          suggestedChanges: 0,
          projectedPointsGain: 0,
          topPriorities: []

        reasoning: 'AI start/sit analysis temporarily unavailable. Please evaluate players manually based on projections and matchups.'


    }, { status: 500  

);


// Helper function to analyze positional priorities
function analyzePositionalPriorities(recommendations: any[]) {

  const positionGroups = recommendations.reduce((acc, rec) => {
    const pos = rec.position || 'UNKNOWN';
    if (!acc[pos]) acc[pos] = [];
    acc[pos].push(rec);
    return acc;, {} as Record<string, any[]>);

  return Object.entries(positionGroups).map(([position, players]) => ({ position,
    totalPlayers: (players as any[]).length,
    startRecommendations: (players as any[]).filter((p: any) => p.recommendation === 'START').length,
    sitRecommendations: (players as any[]).filter((p: any) => p.recommendation === 'SIT').length 

    averageConfidence: (players as any[]).reduce((sum: number, p: any) => sum + (p.enhancedConfidence || p.confidence || 0), 0) / (players as any[]).length || 0
  });

export async function GET(req?: NextRequest) {
  try {
    try {
    // Return available analysis options and current week info
    const currentWeek = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000)) % 18 + 1;
    const currentSeason = new Date().getFullYear();
    
    return NextResponse.json({ success: true });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });



)); catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    const { logger } = await import('@/lib/logger');
    logger.error('Failed to get start/sit config', err, 'API');
    
    return NextResponse.json({ success: true });
    , { status: 500 });

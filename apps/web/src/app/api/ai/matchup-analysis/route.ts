import { NextRequest, NextResponse } from 'next/server'
import { fantasyAI } from '@/lib/ai/fantasy-ai-engine'
import { fantasyDataGenerator } from '@/lib/ai/fantasy-data-generator'

/**
 * Nova AI: Advanced Matchup Analysis & Game Planning
 * Comprehensive head-to-head analysis with strategic recommendations
 */
export async function POST(request: NextRequest) {
  try {
    const { 
      homeTeamId,
      awayTeamId,
      homeTeamRoster = [],
      awayTeamRoster = [],
      week = 4,
      includeWeatherAnalysis = true,
      includeInjuryImpact = true
    } = await request.json()

    if (!homeTeamId || !awayTeamId) {
      return NextResponse.json(
        { success: false, error: 'homeTeamId and awayTeamId are required' },
        { status: 400 }
      )
    }

    // Mock team rosters (in production, get from database)
    const allPlayers = fantasyDataGenerator.getPlayers()
    const homeTeam = {
      id: homeTeamId,
      name: 'Home Team',
      roster: homeTeamRoster.length > 0 
        ? homeTeamRoster.map((id: string) => ({ playerId: id }))
        : allPlayers.slice(0, 16).map(p => ({ playerId: p.id }))
    }

    const awayTeam = {
      id: awayTeamId, 
      name: 'Away Team',
      roster: awayTeamRoster.length > 0
        ? awayTeamRoster.map((id: string) => ({ playerId: id }))
        : allPlayers.slice(16, 32).map(p => ({ playerId: p.id }))
    }

    // Generate comprehensive matchup analysis
    const matchupAnalysis = await fantasyAI.analyzeMatchup(homeTeam, awayTeam, week)

    // Generate additional insights
    const competitiveAdvantages = await analyzeCompetitiveAdvantages(homeTeam, awayTeam, week)
    const lineupSuggestions = await generateLineupSuggestions(homeTeam, awayTeam, week)
    const scenarioAnalysis = await generateGameScenarios(matchupAnalysis, week)
    const headToHeadComparisons = await generateHeadToHeadComparisons(homeTeam, awayTeam, week)
    
    // Weather and external factors
    const externalFactors = includeWeatherAnalysis 
      ? await analyzeExternalFactors(week)
      : null

    // Injury impact assessment
    const injuryImpact = includeInjuryImpact
      ? fantasyDataGenerator.generateInjuryReports().slice(0, 5)
      : null

    return NextResponse.json({
      success: true,
      data: {
        matchup: {
          homeTeam: { id: homeTeam.id, name: homeTeam.name },
          awayTeam: { id: awayTeam.id, name: awayTeam.name },
          week
        },
        analysis: matchupAnalysis,
        insights: {
          competitiveAdvantages,
          lineupSuggestions,
          scenarioAnalysis,
          headToHeadComparisons
        },
        externalFactors,
        injuryImpact,
        metadata: {
          confidenceLevel: matchupAnalysis.analysisConfidence,
          generatedAt: new Date().toISOString(),
          analysisType: 'COMPREHENSIVE_MATCHUP'
        }
      }
    })

  } catch (error) {
    console.error('Matchup analysis error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to analyze matchup' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const week = parseInt(searchParams.get('week') || '4')
    const leagueId = searchParams.get('leagueId')

    // Generate all weekly matchups for league
    const allPlayers = fantasyDataGenerator.getPlayers()
    
    // Mock league matchups (in production, get from database)
    const matchups = []
    for (let i = 0; i < 6; i++) {
      const homeTeam = {
        id: `team_${i * 2 + 1}`,
        name: `Team ${i * 2 + 1}`,
        roster: allPlayers.slice(i * 16, (i + 1) * 16).map(p => ({ playerId: p.id }))
      }
      
      const awayTeam = {
        id: `team_${i * 2 + 2}`,
        name: `Team ${i * 2 + 2}`,
        roster: allPlayers.slice((i + 1) * 16, (i + 2) * 16).map(p => ({ playerId: p.id }))
      }

      const analysis = await fantasyAI.analyzeMatchup(homeTeam, awayTeam, week)
      
      matchups.push({
        matchupId: `matchup_${i + 1}`,
        homeTeam: { id: homeTeam.id, name: homeTeam.name },
        awayTeam: { id: awayTeam.id, name: awayTeam.name },
        analysis: {
          projectedHomeScore: analysis.projectedHomeScore,
          projectedAwayScore: analysis.projectedAwayScore,
          winProbability: analysis.winProbability,
          competitiveness: getCompetitivenessRating(analysis),
          keyPlayers: analysis.keyMatchups.slice(0, 2)
        }
      })
    }

    // Calculate week overview
    const weekOverview = calculateWeekOverview(matchups)

    return NextResponse.json({
      success: true,
      data: {
        matchups,
        weekOverview,
        week,
        leagueId,
        metadata: {
          totalMatchups: matchups.length,
          averageProjectedScore: weekOverview.averageScore,
          mostCompetitive: weekOverview.mostCompetitive,
          generatedAt: new Date().toISOString()
        }
      }
    })

  } catch (error) {
    console.error('Weekly matchups error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate weekly matchups' },
      { status: 500 }
    )
  }
}

// Helper functions
async function analyzeCompetitiveAdvantages(homeTeam: any, awayTeam: any, week: number): Promise<any> {
  const homeAdvantages = []
  const awayAdvantages = []

  // Position-by-position advantage analysis
  const positions = ['QB', 'RB', 'WR', 'TE']
  
  for (const position of positions) {
    const homePositionPlayers = homeTeam.roster
      .map((r: any) => fantasyDataGenerator.getPlayers().find(p => p.id === r.playerId))
      .filter((p: any) => p && p.position === position)

    const awayPositionPlayers = awayTeam.roster
      .map((r: any) => fantasyDataGenerator.getPlayers().find(p => p.id === r.playerId))
      .filter((p: any) => p && p.position === position)

    // Calculate average strength
    const homeStrength = homePositionPlayers.reduce((sum: number, p: any) => 
      sum + (p.adp ? (200 - p.adp) : 0), 0) / Math.max(homePositionPlayers.length, 1)

    const awayStrength = awayPositionPlayers.reduce((sum: number, p: any) => 
      sum + (p.adp ? (200 - p.adp) : 0), 0) / Math.max(awayPositionPlayers.length, 1)

    if (homeStrength > awayStrength * 1.15) {
      homeAdvantages.push({
        category: 'POSITIONAL_STRENGTH',
        position,
        description: `Significant ${position} advantage`,
        impact: 'MEDIUM',
        details: `${homeStrength.toFixed(1)} vs ${awayStrength.toFixed(1)} strength rating`
      })
    } else if (awayStrength > homeStrength * 1.15) {
      awayAdvantages.push({
        category: 'POSITIONAL_STRENGTH',
        position,
        description: `Significant ${position} advantage`,
        impact: 'MEDIUM',
        details: `${awayStrength.toFixed(1)} vs ${homeStrength.toFixed(1)} strength rating`
      })
    }
  }

  // Depth advantages
  if (homeTeam.roster.length > awayTeam.roster.length + 2) {
    homeAdvantages.push({
      category: 'DEPTH',
      description: 'Superior roster depth',
      impact: 'LOW',
      details: `${homeTeam.roster.length} vs ${awayTeam.roster.length} roster players`
    })
  } else if (awayTeam.roster.length > homeTeam.roster.length + 2) {
    awayAdvantages.push({
      category: 'DEPTH',
      description: 'Superior roster depth',
      impact: 'LOW',
      details: `${awayTeam.roster.length} vs ${homeTeam.roster.length} roster players`
    })
  }

  return {
    homeAdvantages,
    awayAdvantages,
    summary: {
      homeAdvantageCount: homeAdvantages.length,
      awayAdvantageCount: awayAdvantages.length,
      overallFavorite: homeAdvantages.length > awayAdvantages.length ? 'HOME' : 
                       awayAdvantages.length > homeAdvantages.length ? 'AWAY' : 'EVEN'
    }
  }
}

async function generateLineupSuggestions(homeTeam: any, awayTeam: any, week: number): Promise<any> {
  const homePlayerIds = homeTeam.roster.map((r: any) => r.playerId)
  const awayPlayerIds = awayTeam.roster.map((r: any) => r.playerId)
  
  // Generate optimal lineups for both teams
  const homeOptimization = await fantasyAI.optimizeLineup(
    homeTeam.id,
    homePlayerIds.map((id: string) => ({ id, ...fantasyDataGenerator.getPlayers().find(p => p.id === id) })),
    'BALANCED',
    week
  )

  const awayOptimization = await fantasyAI.optimizeLineup(
    awayTeam.id,
    awayPlayerIds.map((id: string) => ({ id, ...fantasyDataGenerator.getPlayers().find(p => p.id === id) })),
    'BALANCED',
    week
  )

  return {
    homeTeam: {
      recommendedLineup: homeOptimization.lineup,
      projectedScore: homeOptimization.projectedScore,
      strategy: homeOptimization.strategy,
      keyDecisions: identifyKeyLineupDecisions(homeOptimization)
    },
    awayTeam: {
      recommendedLineup: awayOptimization.lineup,
      projectedScore: awayOptimization.projectedScore,
      strategy: awayOptimization.strategy,
      keyDecisions: identifyKeyLineupDecisions(awayOptimization)
    },
    matchupSpecific: {
      recommendation: homeOptimization.projectedScore > awayOptimization.projectedScore
        ? 'Home team favored with optimal lineups'
        : 'Away team favored with optimal lineups',
      scoreDifference: Math.abs(homeOptimization.projectedScore - awayOptimization.projectedScore),
      competitiveness: Math.abs(homeOptimization.projectedScore - awayOptimization.projectedScore) < 10
        ? 'VERY_CLOSE' : 'MODERATE_GAP'
    }
  }
}

async function generateGameScenarios(matchupAnalysis: any, week: number): Promise<any[]> {
  const scenarios = []
  
  // High-scoring scenario
  scenarios.push({
    name: 'High-Scoring Shootout',
    probability: 0.25,
    description: 'Both teams exceed projections in high-scoring affair',
    homeScore: matchupAnalysis.projectedHomeScore * 1.2,
    awayScore: matchupAnalysis.projectedAwayScore * 1.2,
    keyFactors: [
      'Multiple players hit ceiling projections',
      'Favorable game environments',
      'Minimal defensive performances'
    ],
    implications: [
      'Aggressive lineup strategies pay off',
      'Ceiling plays more important than floor',
      'High-upside players crucial'
    ]
  })

  // Low-scoring scenario
  scenarios.push({
    name: 'Defensive Struggle',
    probability: 0.2,
    description: 'Both teams underperform in low-scoring matchup',
    homeScore: matchupAnalysis.projectedHomeScore * 0.8,
    awayScore: matchupAnalysis.projectedAwayScore * 0.8,
    keyFactors: [
      'Multiple players hit floor projections',
      'Defensive/ST performances excel',
      'Safe plays more reliable'
    ],
    implications: [
      'Conservative lineup strategies favored',
      'Floor plays more important than ceiling',
      'Reliable veterans outperform upside plays'
    ]
  })

  // Blowout scenario
  scenarios.push({
    name: 'Decisive Victory',
    probability: 0.3,
    description: 'One team significantly outperforms the other',
    homeScore: matchupAnalysis.winProbability > 0.6 
      ? matchupAnalysis.projectedHomeScore * 1.15
      : matchupAnalysis.projectedHomeScore * 0.85,
    awayScore: matchupAnalysis.winProbability > 0.6
      ? matchupAnalysis.projectedAwayScore * 0.85  
      : matchupAnalysis.projectedAwayScore * 1.15,
    keyFactors: [
      'Star players deliver big performances',
      'Depth players provide minimal impact',
      'Game flow favors one strategy'
    ],
    implications: [
      'Top-heavy roster construction advantages',
      'Lineup optimization crucial',
      'Bench depth less important'
    ]
  })

  // Close matchup scenario
  scenarios.push({
    name: 'Nail-Biter Finish',
    probability: 0.25,
    description: 'Extremely close matchup decided by small margins',
    homeScore: matchupAnalysis.projectedHomeScore,
    awayScore: matchupAnalysis.projectedAwayScore,
    keyFactors: [
      'Both teams perform near projections',
      'Individual player performances vary',
      'Random variance plays significant role'
    ],
    implications: [
      'Every lineup decision matters',
      'Consistency more valuable than upside',
      'Late-week information crucial'
    ]
  })

  return scenarios
}

async function generateHeadToHeadComparisons(homeTeam: any, awayTeam: any, week: number): Promise<any[]> {
  const comparisons = []
  const positions = ['QB', 'RB', 'WR', 'TE']

  for (const position of positions) {
    const homeTopPlayer = homeTeam.roster
      .map((r: any) => fantasyDataGenerator.getPlayers().find(p => p.id === r.playerId))
      .filter((p: any) => p && p.position === position)
      .sort((a: any, b: any) => (a.adp || 200) - (b.adp || 200))[0]

    const awayTopPlayer = awayTeam.roster
      .map((r: any) => fantasyDataGenerator.getPlayers().find(p => p.id === r.playerId))
      .filter((p: any) => p && p.position === position)
      .sort((a: any, b: any) => (a.adp || 200) - (b.adp || 200))[0]

    if (homeTopPlayer && awayTopPlayer) {
      const homePrediction = await fantasyAI.predictPlayerPerformance(homeTopPlayer.id, week)
      const awayPrediction = await fantasyAI.predictPlayerPerformance(awayTopPlayer.id, week)

      comparisons.push({
        position,
        homePlayer: {
          name: homeTopPlayer.name,
          team: homeTopPlayer.nflTeam,
          prediction: homePrediction
        },
        awayPlayer: {
          name: awayTopPlayer.name,
          team: awayTopPlayer.nflTeam,
          prediction: awayPrediction
        },
        advantage: homePrediction.projectedPoints > awayPrediction.projectedPoints ? 'HOME' : 'AWAY',
        pointDifference: Math.abs(homePrediction.projectedPoints - awayPrediction.projectedPoints),
        competitiveness: Math.abs(homePrediction.projectedPoints - awayPrediction.projectedPoints) < 3 
          ? 'VERY_CLOSE' : 'CLEAR_ADVANTAGE'
      })
    }
  }

  return comparisons
}

async function analyzeExternalFactors(week: number): Promise<any> {
  return {
    weather: {
      forecast: Math.random() > 0.7 ? 'POOR' : 'FAVORABLE',
      impact: Math.random() > 0.7 ? 'SIGNIFICANT' : 'MINIMAL',
      affectedPositions: Math.random() > 0.7 ? ['QB', 'WR'] : [],
      description: Math.random() > 0.7 
        ? 'Poor weather conditions may impact passing games'
        : 'Favorable weather conditions expected'
    },
    byeWeeks: {
      affectedPositions: week >= 4 && week <= 12 ? ['QB', 'RB'] : [],
      impact: week >= 4 && week <= 12 ? 'Roster flexibility important' : 'No bye week concerns',
      rosterDepthFactor: week >= 4 && week <= 12 ? 'HIGH' : 'LOW'
    },
    scheduleContext: {
      week,
      seasonPhase: week <= 4 ? 'EARLY' : week <= 10 ? 'MID' : week <= 14 ? 'LATE' : 'PLAYOFFS',
      urgency: week > 10 ? 'HIGH' : 'MEDIUM',
      considerations: week > 10 
        ? ['Playoff implications', 'Season-long strategies coming to fruition']
        : ['Building consistency', 'Evaluating player roles']
    }
  }
}

function identifyKeyLineupDecisions(optimization: any): string[] {
  const decisions = []
  
  // Mock key decisions (in production, analyze actual lineup choices)
  const mockDecisions = [
    'Start high-ceiling WR over safe floor option',
    'Flex consideration between RB and WR',
    'QB streaming vs. season-long starter decision',
    'TE matchup advantage worth considering',
    'Defense/ST with favorable matchup available'
  ]

  // Return random decisions for demonstration
  return mockDecisions.slice(0, Math.floor(Math.random() * 3) + 1)
}

function getCompetitivenessRating(analysis: any): string {
  const scoreDiff = Math.abs(analysis.projectedHomeScore - analysis.projectedAwayScore)
  
  if (scoreDiff < 5) return 'VERY_COMPETITIVE'
  if (scoreDiff < 10) return 'COMPETITIVE'
  if (scoreDiff < 20) return 'MODERATE'
  return 'LOPSIDED'
}

function calculateWeekOverview(matchups: any[]): any {
  const totalHomeScore = matchups.reduce((sum, m) => sum + m.analysis.projectedHomeScore, 0)
  const totalAwayScore = matchups.reduce((sum, m) => sum + m.analysis.projectedAwayScore, 0)
  const averageScore = (totalHomeScore + totalAwayScore) / (matchups.length * 2)

  const competitiveMatchups = matchups.filter(m => 
    m.analysis.competitiveness === 'VERY_COMPETITIVE' || m.analysis.competitiveness === 'COMPETITIVE'
  ).length

  const mostCompetitive = matchups.reduce((most, current) => 
    current.analysis.competitiveness === 'VERY_COMPETITIVE' ? current : most
  , matchups[0])

  return {
    averageScore: Math.round(averageScore * 10) / 10,
    competitiveMatchups,
    mostCompetitive: mostCompetitive ? {
      homeTeam: mostCompetitive.homeTeam.name,
      awayTeam: mostCompetitive.awayTeam.name,
      scoreDifference: Math.abs(mostCompetitive.analysis.projectedHomeScore - mostCompetitive.analysis.projectedAwayScore)
    } : null,
    weekTrends: [
      `${competitiveMatchups}/${matchups.length} matchups expected to be competitive`,
      `Average projected score: ${averageScore.toFixed(1)} points`,
      'Several key positional battles to watch'
    ]
  }
}
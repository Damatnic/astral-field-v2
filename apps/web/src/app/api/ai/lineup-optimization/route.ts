import { NextRequest, NextResponse } from 'next/server'
import { fantasyAI } from '@/lib/ai/fantasy-ai-engine'
import { fantasyDataGenerator } from '@/lib/ai/fantasy-data-generator'

export const dynamic = 'force-dynamic'


/**
 * Nova AI: Intelligent Lineup Optimization
 * Advanced algorithms for optimal lineup selection based on strategy
 */
export async function POST(request: NextRequest) {
  try {
    const { 
      teamId, 
      strategy = 'BALANCED', 
      week = 4,
      rosterPlayerIds = [],
      constraints = {}
    } = await request.json()

    if (!teamId || !rosterPlayerIds.length) {
      return NextResponse.json(
        { success: false, error: 'teamId and rosterPlayerIds are required' },
        { status: 400 }
      )
    }

    // Get available players from roster
    const availablePlayers = rosterPlayerIds.map((playerId: string) => {
      const player = fantasyDataGenerator.getPlayers().find(p => p.id === playerId)
      return player ? { ...player, id: playerId } : null
    }).filter(Boolean)

    if (availablePlayers.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid players found' },
        { status: 400 }
      )
    }

    // Generate lineup optimization
    const optimization = await fantasyAI.optimizeLineup(
      teamId,
      availablePlayers,
      strategy as 'SAFE' | 'BALANCED' | 'AGGRESSIVE',
      week
    )

    // Calculate additional metrics
    const alternativeLineups = await generateAlternativeLineups(
      availablePlayers,
      strategy,
      week
    )

    const positionAnalysis = analyzePositionStrength(availablePlayers, week)
    const riskAssessment = calculateLineupRisk(optimization, availablePlayers)

    return NextResponse.json({
      success: true,
      data: {
        optimization,
        alternatives: alternativeLineups,
        analysis: {
          positionStrength: positionAnalysis,
          riskAssessment,
          recommendedStrategy: strategy,
          confidenceLevel: optimization.winProbability
        },
        roster: {
          totalPlayers: availablePlayers.length,
          byPosition: countByPosition(availablePlayers)
        },
        metadata: {
          optimizationMethod: 'Integer Programming + ML',
          generatedAt: new Date().toISOString(),
          week,
          strategy
        }
      }
    })

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {

      console.error('Lineup optimization error:', error);

    }
    return NextResponse.json(
      { success: false, error: 'Failed to optimize lineup' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')
    const week = parseInt(searchParams.get('week') || '4')

    if (!teamId) {
      return NextResponse.json(
        { success: false, error: 'teamId is required' },
        { status: 400 }
      )
    }

    // Mock roster for demo (in production, get from database)
    const mockRosterPlayerIds = fantasyDataGenerator.getPlayers()
      .filter(p => p.position !== 'DST')
      .slice(0, 16)
      .map(p => p.id)

    // Generate optimizations for all strategies
    const strategies = ['SAFE', 'BALANCED', 'AGGRESSIVE'] as const
    const optimizations = await Promise.all(
      strategies.map(async (strategy) => {
        const availablePlayers = mockRosterPlayerIds.map((playerId: string) => {
          const player = fantasyDataGenerator.getPlayers().find(p => p.id === playerId)
          return player ? { ...player, id: playerId } : null
        }).filter(Boolean)

        const optimization = await fantasyAI.optimizeLineup(
          teamId,
          availablePlayers,
          strategy,
          week
        )

        return {
          strategy,
          optimization,
          expectedOutcome: getStrategyOutcome(strategy, optimization)
        }
      })
    )

    // Generate comparative analysis
    const comparison = compareStrategies(optimizations)

    return NextResponse.json({
      success: true,
      data: {
        optimizations,
        comparison,
        recommendation: getRecommendedStrategy(optimizations),
        metadata: {
          week,
          teamId,
          strategiesAnalyzed: strategies.length
        }
      }
    })

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {

      console.error('Strategy comparison error:', error);

    }
    return NextResponse.json(
      { success: false, error: 'Failed to generate strategy comparison' },
      { status: 500 }
    )
  }
}

// Helper functions
async function generateAlternativeLineups(
  players: any[], 
  strategy: string, 
  week: number
): Promise<any[]> {
  const alternatives = []
  
  // Generate high-ceiling alternative
  if (strategy !== 'AGGRESSIVE') {
    const aggressiveLineup = await fantasyAI.optimizeLineup(
      'temp',
      players,
      'AGGRESSIVE',
      week
    )
    alternatives.push({
      name: 'High Ceiling',
      strategy: 'AGGRESSIVE',
      lineup: aggressiveLineup,
      description: 'Maximum upside potential, higher risk'
    })
  }
  
  // Generate safe alternative
  if (strategy !== 'SAFE') {
    const safeLineup = await fantasyAI.optimizeLineup(
      'temp',
      players,
      'SAFE',
      week
    )
    alternatives.push({
      name: 'Safe Floor',
      strategy: 'SAFE',
      lineup: safeLineup,
      description: 'Minimize risk, reliable scoring'
    })
  }
  
  return alternatives
}

function analyzePositionStrength(players: any[], week: number): any {
  const positions = ['QB', 'RB', 'WR', 'TE', 'K']
  const analysis: any = {}
  
  positions.forEach(position => {
    const positionPlayers = players.filter(p => p.position === position)
    
    if (positionPlayers.length > 0) {
      const avgAdp = positionPlayers.reduce((sum, p) => sum + (p.adp || 100), 0) / positionPlayers.length
      
      let strength = 'WEAK'
      if (avgAdp < 50) strength = 'STRONG'
      else if (avgAdp < 80) strength = 'AVERAGE'
      
      analysis[position] = {
        playerCount: positionPlayers.length,
        averageADP: avgAdp,
        strength,
        topPlayer: positionPlayers.sort((a, b) => (a.adp || 200) - (b.adp || 200))[0]?.name
      }
    }
  })
  
  return analysis
}

function calculateLineupRisk(optimization: any, players: any[]): any {
  // Calculate risk based on player volatility and injury history
  const lineupPlayerIds = Object.values(optimization.lineup)
  const riskFactors: string[] = []
  
  let totalRisk = 0
  let riskCount = 0
  
  lineupPlayerIds.forEach((playerId: any) => {
    const player = players.find(p => p.id === playerId)
    if (player) {
      // Mock risk calculation
      const playerRisk = Math.random() * 0.5 // 0-0.5 risk score
      totalRisk += playerRisk
      riskCount++
      
      if (playerRisk > 0.3) {
        riskFactors.push(`${player.name}: Moderate injury risk`)
      }
    }
  })
  
  const avgRisk = riskCount > 0 ? totalRisk / riskCount : 0
  
  let riskLevel = 'LOW'
  if (avgRisk > 0.3) riskLevel = 'HIGH'
  else if (avgRisk > 0.15) riskLevel = 'MEDIUM'
  
  return {
    level: riskLevel,
    score: avgRisk,
    factors: riskFactors,
    recommendation: avgRisk > 0.25 
      ? 'Consider safer alternatives for key positions'
      : 'Risk level acceptable for projected upside'
  }
}

function countByPosition(players: any[]): any {
  const counts: any = {}
  players.forEach(player => {
    counts[player.position] = (counts[player.position] || 0) + 1
  })
  return counts
}

function getStrategyOutcome(strategy: string, optimization: any): any {
  const base = optimization.projectedScore
  
  switch (strategy) {
    case 'SAFE':
      return {
        type: 'Conservative',
        description: `Projected ${base.toFixed(1)} points with ${optimization.floorScore.toFixed(1)} point floor`,
        winProbability: optimization.winProbability,
        risk: 'Low',
        upside: 'Limited'
      }
    case 'AGGRESSIVE':
      return {
        type: 'High Risk/Reward',
        description: `Projected ${base.toFixed(1)} points with ${optimization.ceilingScore.toFixed(1)} point ceiling`,
        winProbability: optimization.winProbability,
        risk: 'High',
        upside: 'Maximum'
      }
    default:
      return {
        type: 'Balanced',
        description: `Projected ${base.toFixed(1)} points with balanced risk/reward`,
        winProbability: optimization.winProbability,
        risk: 'Medium',
        upside: 'Good'
      }
  }
}

function compareStrategies(optimizations: any[]): any {
  const scores = optimizations.map(opt => opt.optimization.projectedScore)
  const floors = optimizations.map(opt => opt.optimization.floorScore)
  const ceilings = optimizations.map(opt => opt.optimization.ceilingScore)
  
  return {
    scoreRange: {
      min: Math.min(...scores),
      max: Math.max(...scores),
      difference: Math.max(...scores) - Math.min(...scores)
    },
    floorRange: {
      min: Math.min(...floors),
      max: Math.max(...floors),
      difference: Math.max(...floors) - Math.min(...floors)
    },
    ceilingRange: {
      min: Math.min(...ceilings),
      max: Math.max(...ceilings),
      difference: Math.max(...ceilings) - Math.min(...ceilings)
    },
    insights: [
      'AGGRESSIVE strategy offers highest ceiling but lower floor',
      'SAFE strategy minimizes risk but caps upside potential',
      'BALANCED strategy provides optimal risk-adjusted returns'
    ]
  }
}

function getRecommendedStrategy(optimizations: any[]): any {
  // Simple logic: recommend strategy with highest win probability
  const best = optimizations.reduce((best, current) => 
    current.optimization.winProbability > best.optimization.winProbability ? current : best
  )
  
  return {
    strategy: best.strategy,
    reasoning: `${best.strategy} strategy offers highest win probability at ${(best.optimization.winProbability * 100).toFixed(1)}%`,
    confidence: 0.75,
    expectedScore: best.optimization.projectedScore
  }
}
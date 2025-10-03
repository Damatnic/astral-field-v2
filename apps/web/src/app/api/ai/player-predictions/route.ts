import { NextRequest, NextResponse } from 'next/server'
import { fantasyAI } from '@/lib/ai/fantasy-ai-engine'
import { fantasyDataGenerator } from '@/lib/ai/fantasy-data-generator'

export const dynamic = 'force-dynamic'


/**
 * Nova AI: Player Performance Predictions for Week 4
 * Advanced ML-powered player projections with confidence intervals
 */
export async function POST(request: NextRequest) {
  try {
    const { playerId, week = 4, includeContext = true } = await request.json()

    if (!playerId) {
      return NextResponse.json(
        { success: false, error: 'playerId is required' },
        { status: 400 }
      )
    }

    // Get player data
    const player = fantasyDataGenerator.getPlayers().find(p => p.id === playerId)
    if (!player) {
      return NextResponse.json(
        { success: false, error: 'Player not found' },
        { status: 404 }
      )
    }

    // Get historical performance
    const historicalStats = fantasyDataGenerator.getPlayerStats(playerId)

    // Generate game context for week 4 (mock upcoming game)
    const gameContext = includeContext ? {
      week,
      season: 2025,
      nflTeam: player.nflTeam,
      opponent: 'TBD', // Would be determined by schedule
      homeAway: Math.random() > 0.5 ? 'HOME' : 'AWAY',
      vegasTotal: 45 + Math.random() * 15,
      vegasSpread: (Math.random() - 0.5) * 10,
      weather: 'CLEAR',
      temperature: 70,
      windSpeed: 5
    } : undefined

    // Generate AI prediction
    const prediction = await fantasyAI.predictPlayerPerformance(
      playerId,
      week,
      gameContext
    )

    // Calculate additional insights
    const recentTrend = calculateTrend(historicalStats)
    const consistencyScore = calculateConsistency(historicalStats)
    const matchupDifficulty = calculateMatchupDifficulty(player, gameContext)

    return NextResponse.json({
      success: true,
      data: {
        player: {
          id: player.id,
          name: player.name,
          position: player.position,
          team: player.nflTeam
        },
        prediction,
        insights: {
          recentTrend,
          consistencyScore,
          matchupDifficulty,
          historicalAverage: historicalStats.length > 0 
            ? historicalStats.reduce((sum, stat) => sum + stat.fantasyPoints, 0) / historicalStats.length
            : 0
        },
        gameContext,
        metadata: {
          modelVersion: '4.0',
          generatedAt: new Date().toISOString(),
          confidenceFactors: [
            'Recent performance trend',
            'Historical consistency',
            'Matchup difficulty',
            'Game context factors'
          ]
        }
      }
    })

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {

      console.error('Player prediction error:', error);

    }
    return NextResponse.json(
      { success: false, error: 'Failed to generate prediction' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const position = searchParams.get('position')
    const team = searchParams.get('team')
    const week = parseInt(searchParams.get('week') || '4')
    const limit = parseInt(searchParams.get('limit') || '10')

    // Get all players
    let players = fantasyDataGenerator.getPlayers()

    // Apply filters
    if (position) {
      players = players.filter(p => p.position === position)
    }
    if (team) {
      players = players.filter(p => p.nflTeam === team)
    }

    // Generate predictions for filtered players
    const predictions = await Promise.all(
      players.slice(0, limit).map(async (player) => {
        const prediction = await fantasyAI.predictPlayerPerformance(player.id, week)
        const historicalStats = fantasyDataGenerator.getPlayerStats(player.id)
        
        return {
          player: {
            id: player.id,
            name: player.name,
            position: player.position,
            team: player.nflTeam
          },
          prediction,
          weeklyStats: historicalStats.map(stat => ({
            week: stat.week,
            points: stat.fantasyPoints,
            performance: stat.fantasyPoints > prediction.projectedPoints ? 'ABOVE' : 'BELOW'
          }))
        }
      })
    )

    // Sort by projected points
    predictions.sort((a, b) => b.prediction.projectedPoints - a.prediction.projectedPoints)

    return NextResponse.json({
      success: true,
      data: {
        predictions,
        filters: { position, team, week, limit },
        metadata: {
          totalPlayers: players.length,
          predictionsGenerated: predictions.length,
          averageConfidence: predictions.reduce((sum, p) => sum + p.prediction.confidence, 0) / predictions.length
        }
      }
    })

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {

      console.error('Bulk predictions error:', error);

    }
    return NextResponse.json(
      { success: false, error: 'Failed to generate predictions' },
      { status: 500 }
    )
  }
}

// Helper functions
function calculateTrend(stats: any[]): { direction: string, strength: number, description: string } {
  if (stats.length < 2) {
    return { direction: 'UNKNOWN', strength: 0, description: 'Insufficient data' }
  }

  const recent = stats.slice(-3) // Last 3 weeks
  let trendSum = 0
  
  for (let i = 1; i < recent.length; i++) {
    trendSum += recent[i].fantasyPoints - recent[i-1].fantasyPoints
  }
  
  const avgTrend = trendSum / (recent.length - 1)
  const strength = Math.min(1, Math.abs(avgTrend) / 10) // Normalize to 0-1
  
  let direction = 'STABLE'
  let description = 'Performance has been consistent'
  
  if (avgTrend > 2) {
    direction = 'RISING'
    description = `Trending up with average ${avgTrend.toFixed(1)} point improvement per week`
  } else if (avgTrend < -2) {
    direction = 'DECLINING'
    description = `Trending down with average ${Math.abs(avgTrend).toFixed(1)} point decline per week`
  }
  
  return { direction, strength, description }
}

function calculateConsistency(stats: any[]): { score: number, rating: string, description: string } {
  if (stats.length < 2) {
    return { score: 0.5, rating: 'UNKNOWN', description: 'Insufficient data' }
  }

  const points = stats.map(s => s.fantasyPoints)
  const mean = points.reduce((sum, p) => sum + p, 0) / points.length
  const variance = points.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / points.length
  const stdDev = Math.sqrt(variance)
  
  // Lower standard deviation = higher consistency
  const score = Math.max(0, Math.min(1, 1 - (stdDev / mean)))
  
  let rating = 'INCONSISTENT'
  let description = 'Highly volatile week-to-week performance'
  
  if (score > 0.8) {
    rating = 'VERY_CONSISTENT'
    description = 'Extremely reliable week-to-week performance'
  } else if (score > 0.6) {
    rating = 'CONSISTENT'
    description = 'Reliable week-to-week performance'
  } else if (score > 0.4) {
    rating = 'MODERATE'
    description = 'Some week-to-week variance in performance'
  }
  
  return { score, rating, description }
}

function calculateMatchupDifficulty(player: any, gameContext: any): { difficulty: string, score: number, description: string } {
  // Mock matchup difficulty calculation
  const baseDifficulty = Math.random()
  
  let difficulty = 'MODERATE'
  let description = 'Average matchup difficulty expected'
  
  if (baseDifficulty > 0.7) {
    difficulty = 'DIFFICULT'
    description = 'Challenging matchup, lower ceiling expected'
  } else if (baseDifficulty < 0.3) {
    difficulty = 'FAVORABLE'
    description = 'Favorable matchup, higher ceiling possible'
  }
  
  // Adjust for game context
  if (gameContext?.vegasTotal > 50) {
    description += '. High-scoring game environment'
  }
  
  if (gameContext?.weather === 'RAIN') {
    description += '. Weather may impact performance'
  }
  
  return {
    difficulty,
    score: baseDifficulty,
    description
  }
}
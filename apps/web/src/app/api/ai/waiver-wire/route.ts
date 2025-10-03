import { NextRequest, NextResponse } from 'next/server'
import { fantasyAI } from '@/lib/ai/fantasy-ai-engine'
import { fantasyDataGenerator } from '@/lib/ai/fantasy-data-generator'

export const dynamic = 'force-dynamic'


/**
 * Nova AI: Intelligent Waiver Wire Analysis
 * Advanced pickup recommendations based on value, opportunity, and team needs
 */
export async function POST(request: NextRequest) {
  try {
    const { 
      leagueId, 
      teamId,
      teamNeeds = [],
      week = 4,
      excludePlayerIds = [],
      maxRecommendations = 15
    } = await request.json()

    if (!leagueId || !teamId) {
      return NextResponse.json(
        { success: false, error: 'leagueId and teamId are required' },
        { status: 400 }
      )
    }

    // Get available players (not on any roster)
    const allPlayers = fantasyDataGenerator.getPlayers()
    const availablePlayers = allPlayers.filter(player => 
      !excludePlayerIds.includes(player.id) && 
      player.isFantasyRelevant &&
      player.position !== 'DST' // Focus on skill positions
    )

    // Generate waiver wire analysis
    const recommendations = await fantasyAI.analyzeWaiverWire(
      leagueId,
      availablePlayers,
      teamNeeds,
      week
    )

    // Generate additional insights
    const emergingPlayers = await identifyEmergingPlayers(availablePlayers, week)
    const injuryReplacements = await findInjuryReplacements(availablePlayers, week)
    const handcuffAnalysis = await analyzeHandcuffs(availablePlayers, teamNeeds)
    const breakoutCandidates = await identifyBreakoutCandidates(availablePlayers, week)

    // Calculate league-wide trends
    const trends = analyzeTrends(availablePlayers, week)

    return NextResponse.json({
      success: true,
      data: {
        recommendations: recommendations.slice(0, maxRecommendations),
        insights: {
          emergingPlayers,
          injuryReplacements,
          handcuffAnalysis,
          breakoutCandidates
        },
        trends,
        analysis: {
          totalPlayersAnalyzed: availablePlayers.length,
          highValueTargets: recommendations.filter(r => r.priority <= 3).length,
          teamNeedsAddressed: teamNeeds.length,
          averageProjectedValue: recommendations.reduce((sum, r) => sum + r.projectedValue, 0) / recommendations.length
        },
        metadata: {
          generatedAt: new Date().toISOString(),
          week,
          leagueId,
          teamId
        }
      }
    })

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {

      console.error('Waiver wire analysis error:', error);

    }
    return NextResponse.json(
      { success: false, error: 'Failed to analyze waiver wire' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const position = searchParams.get('position')
    const week = parseInt(searchParams.get('week') || '4')
    const rosterThreshold = parseFloat(searchParams.get('rosterThreshold') || '10')

    // Get all available players
    const allPlayers = fantasyDataGenerator.getPlayers()
    let availablePlayers = allPlayers.filter(p => p.isFantasyRelevant)

    // Filter by position if specified
    if (position) {
      availablePlayers = availablePlayers.filter(p => p.position === position)
    }

    // Generate quick analysis for each player
    const quickAnalysis = await Promise.all(
      availablePlayers.map(async (player) => {
        const prediction = await fantasyAI.predictPlayerPerformance(player.id, week)
        const historicalStats = fantasyDataGenerator.getPlayerStats(player.id)
        
        // Calculate roster percentage (mock)
        const rosterPercentage = Math.max(0, Math.min(100, 
          50 - (player.adp || 100) / 2 + Math.random() * 20
        ))

        // Determine availability tier
        let availabilityTier = 'WIDELY_AVAILABLE'
        if (rosterPercentage > 50) availabilityTier = 'ROSTERED'
        else if (rosterPercentage > 25) availabilityTier = 'MODERATE'
        else if (rosterPercentage > 10) availabilityTier = 'AVAILABLE'

        return {
          player: {
            id: player.id,
            name: player.name,
            position: player.position,
            team: player.nflTeam,
            adp: player.adp
          },
          prediction,
          analysis: {
            rosterPercentage: Math.round(rosterPercentage),
            availabilityTier,
            trend: calculateSimpleTrend(historicalStats),
            opportunity: assessOpportunity(player, historicalStats),
            value: prediction.projectedPoints * (1 - rosterPercentage / 100)
          }
        }
      })
    )

    // Filter by roster threshold and sort by value
    const filteredAnalysis = quickAnalysis
      .filter(analysis => analysis.analysis.rosterPercentage < rosterThreshold)
      .sort((a, b) => b.analysis.value - a.analysis.value)
      .slice(0, 50)

    // Categorize recommendations
    const categories = categorizeRecommendations(filteredAnalysis)

    return NextResponse.json({
      success: true,
      data: {
        players: filteredAnalysis,
        categories,
        filters: {
          position,
          week,
          rosterThreshold
        },
        summary: {
          totalAnalyzed: availablePlayers.length,
          availableCount: filteredAnalysis.length,
          topValue: filteredAnalysis[0]?.analysis.value || 0,
          averageRosterPercentage: filteredAnalysis.reduce(
            (sum, p) => sum + p.analysis.rosterPercentage, 0
          ) / filteredAnalysis.length
        }
      }
    })

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {

      console.error('Waiver wire lookup error:', error);

    }
    return NextResponse.json(
      { success: false, error: 'Failed to analyze available players' },
      { status: 500 }
    )
  }
}

// Helper functions
async function identifyEmergingPlayers(players: any[], week: number): Promise<any[]> {
  const emerging = []
  
  for (const player of players.slice(0, 20)) {
    const historicalStats = fantasyDataGenerator.getPlayerStats(player.id)
    const prediction = await fantasyAI.predictPlayerPerformance(player.id, week)
    
    // Look for players with increasing usage/production
    if (historicalStats.length >= 2) {
      const recent = historicalStats.slice(-2)
      const improvement = recent[1].fantasyPoints - recent[0].fantasyPoints
      
      if (improvement > 5 && prediction.projectedPoints > 12) {
        emerging.push({
          player: {
            id: player.id,
            name: player.name,
            position: player.position,
            team: player.nflTeam
          },
          trend: {
            improvement: Math.round(improvement * 10) / 10,
            direction: 'RISING',
            reasoning: `${improvement.toFixed(1)} point improvement from Week ${recent[0].week} to Week ${recent[1].week}`
          },
          prediction
        })
      }
    }
  }
  
  return emerging.slice(0, 8)
}

async function findInjuryReplacements(players: any[], week: number): Promise<any[]> {
  const replacements = []
  
  // Mock injury scenarios (in production, integrate with injury reports)
  const injuryScenarios = [
    { position: 'RB', team: 'SF', context: 'Starting RB injury concerns' },
    { position: 'WR', team: 'DAL', context: 'WR1 questionable status' },
    { position: 'TE', team: 'KC', context: 'Starting TE injury' }
  ]
  
  for (const scenario of injuryScenarios) {
    const candidates = players.filter(p => 
      p.position === scenario.position && 
      p.nflTeam === scenario.team
    )
    
    for (const candidate of candidates.slice(0, 2)) {
      const prediction = await fantasyAI.predictPlayerPerformance(candidate.id, week)
      
      replacements.push({
        player: {
          id: candidate.id,
          name: candidate.name,
          position: candidate.position,
          team: candidate.nflTeam
        },
        scenario: scenario.context,
        prediction,
        urgency: 'HIGH',
        reasoning: `Direct replacement candidate if starter is inactive`
      })
    }
  }
  
  return replacements.slice(0, 6)
}

async function analyzeHandcuffs(players: any[], teamNeeds: string[]): Promise<any[]> {
  const handcuffs = []
  
  // Focus on RB handcuffs as they're most valuable
  const rbs = players.filter(p => p.position === 'RB')
  
  for (const rb of rbs.slice(0, 15)) {
    const prediction = await fantasyAI.predictPlayerPerformance(rb.id, 4)
    
    // Mock handcuff value calculation
    const handcuffValue = Math.random() * 100
    
    if (handcuffValue > 60) {
      handcuffs.push({
        player: {
          id: rb.id,
          name: rb.name,
          position: rb.position,
          team: rb.nflTeam
        },
        handcuffValue: Math.round(handcuffValue),
        reasoning: 'High-value handcuff with standalone value',
        prediction,
        priority: handcuffValue > 80 ? 'HIGH' : 'MEDIUM'
      })
    }
  }
  
  return handcuffs.slice(0, 8)
}

async function identifyBreakoutCandidates(players: any[], week: number): Promise<any[]> {
  const candidates = []
  
  for (const player of players.slice(0, 25)) {
    const prediction = await fantasyAI.predictPlayerPerformance(player.id, week)
    
    // Look for high breakout potential
    if (prediction.breakoutPotential > 0.6) {
      candidates.push({
        player: {
          id: player.id,
          name: player.name,
          position: player.position,
          team: player.nflTeam
        },
        breakoutPotential: prediction.breakoutPotential,
        prediction,
        reasoning: `High breakout potential (${Math.round(prediction.breakoutPotential * 100)}%) based on opportunity and talent`,
        timeframe: prediction.breakoutPotential > 0.8 ? 'IMMEDIATE' : 'SHORT_TERM'
      })
    }
  }
  
  return candidates
    .sort((a, b) => b.breakoutPotential - a.breakoutPotential)
    .slice(0, 6)
}

function analyzeTrends(players: any[], week: number): any {
  const trends = {
    hotPositions: [] as Array<{ position: string, reason: string, impact: string }>,
    risingTeams: [] as Array<{ team: string, reason: string, impact: string }>,
    valuePlays: [] as string[],
    riskFactors: [] as string[]
  }
  
  // Mock trend analysis
  trends.hotPositions.push(
    { position: 'TE', reason: 'Increased red zone usage league-wide', impact: 'POSITIVE' },
    { position: 'WR', reason: 'Slot receivers seeing more targets', impact: 'POSITIVE' }
  )
  
  trends.risingTeams.push(
    { team: 'MIA', reason: 'Improved offensive line play', impact: 'ALL_POSITIONS' },
    { team: 'DET', reason: 'High-powered offense creating opportunities', impact: 'SKILL_POSITIONS' }
  )
  
  trends.valuePlays.push(
    'Rookie wide receivers showing increased involvement',
    'Backup running backs getting more touches in high-scoring games',
    'Tight ends benefiting from injuries to wide receivers'
  )
  
  trends.riskFactors.push(
    'Weather concerns for outdoor games in northern cities',
    'Offensive line injuries affecting running game efficiency',
    'Increased usage of rookie players leading to inconsistency'
  )
  
  return trends
}

function calculateSimpleTrend(stats: any[]): { direction: string, strength: number } {
  if (stats.length < 2) return { direction: 'UNKNOWN', strength: 0 }
  
  const recent = stats.slice(-2)
  const change = recent[1].fantasyPoints - recent[0].fantasyPoints
  
  return {
    direction: change > 2 ? 'UP' : change < -2 ? 'DOWN' : 'STABLE',
    strength: Math.min(1, Math.abs(change) / 10)
  }
}

function assessOpportunity(player: any, stats: any[]): { level: string, factors: string[] } {
  const factors = []
  let level = 'LOW'
  
  // Mock opportunity assessment
  const randomFactors = [
    'Increased snap count trend',
    'Target share growth',
    'Red zone opportunity',
    'Favorable upcoming schedule',
    'Team trading away competition'
  ]
  
  const numFactors = Math.floor(Math.random() * 3) + 1
  for (let i = 0; i < numFactors; i++) {
    factors.push(randomFactors[Math.floor(Math.random() * randomFactors.length)])
  }
  
  if (factors.length >= 2) level = 'MEDIUM'
  if (factors.length >= 3) level = 'HIGH'
  
  return { level, factors }
}

function categorizeRecommendations(analysis: any[]): any {
  const categories = {
    mustAdd: [] as any[],
    strongConsider: [] as any[],
    speculative: [] as any[],
    deepSleepers: [] as any[]
  }
  
  analysis.forEach((item: any) => {
    if (item.analysis.value > 15) {
      categories.mustAdd.push(item)
    } else if (item.analysis.value > 10) {
      categories.strongConsider.push(item)
    } else if (item.analysis.value > 6) {
      categories.speculative.push(item)
    } else {
      categories.deepSleepers.push(item)
    }
  })
  
  return {
    mustAdd: categories.mustAdd.slice(0, 5),
    strongConsider: categories.strongConsider.slice(0, 8),
    speculative: categories.speculative.slice(0, 10),
    deepSleepers: categories.deepSleepers.slice(0, 8)
  }
}
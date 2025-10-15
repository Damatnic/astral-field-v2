/**
 * Breakout Player Predictor
 * Identify players poised for breakout performance
 */

interface Player {
  id: string
  name: string
  position: string
  team: string
  fantasyPoints: number
  projectedPoints: number
  age?: number
  experience?: number // years in NFL
  targetShare?: number
  snapCount?: number
  redZoneTargets?: number
}

export interface BreakoutPrediction {
  player: Player
  breakoutScore: number // 0-100
  breakoutProbability: number // 0-100
  confidence: number // 0-100
  keyFactors: {
    factor: string
    impact: 'POSITIVE' | 'NEGATIVE'
    weight: number
  }[]
  timeframe: 'IMMEDIATE' | 'SHORT_TERM' | 'LONG_TERM' // 1-2 weeks, 3-5 weeks, ROS
  reasoning: string
  recommendedAction: 'ADD_NOW' | 'MONITOR' | 'WAIT' | 'PASS'
}

/**
 * Analyze opportunity metrics
 */
function analyzeOpportunity(player: Player): {
  score: number
  factors: { factor: string; impact: 'POSITIVE' | 'NEGATIVE'; weight: number }[]
} {
  const factors: { factor: string; impact: 'POSITIVE' | 'NEGATIVE'; weight: number }[] = []
  let score = 50 // Base score
  
  // Target share (for pass catchers)
  if (player.position === 'WR' || player.position === 'TE') {
    if (player.targetShare && player.targetShare > 20) {
      factors.push({ factor: 'High target share (>20%)', impact: 'POSITIVE', weight: 20 })
      score += 20
    } else if (player.targetShare && player.targetShare > 15) {
      factors.push({ factor: 'Good target share (15-20%)', impact: 'POSITIVE', weight: 10 })
      score += 10
    } else if (player.targetShare && player.targetShare < 10) {
      factors.push({ factor: 'Low target share (<10%)', impact: 'NEGATIVE', weight: -10 })
      score -= 10
    }
  }
  
  // Snap count
  if (player.snapCount) {
    if (player.snapCount > 75) {
      factors.push({ factor: 'Elite snap count (>75%)', impact: 'POSITIVE', weight: 15 })
      score += 15
    } else if (player.snapCount > 60) {
      factors.push({ factor: 'Good snap count (60-75%)', impact: 'POSITIVE', weight: 10 })
      score += 10
    } else if (player.snapCount < 40) {
      factors.push({ factor: 'Limited snaps (<40%)', impact: 'NEGATIVE', weight: -15 })
      score -= 15
    }
  }
  
  // Red zone usage
  if (player.redZoneTargets && player.redZoneTargets > 5) {
    factors.push({ factor: 'High red zone usage', impact: 'POSITIVE', weight: 15 })
    score += 15
  }
  
  return { score: Math.max(0, Math.min(100, score)), factors }
}

/**
 * Analyze production efficiency
 */
function analyzeEfficiency(player: Player, currentWeek: number): {
  score: number
  factors: { factor: string; impact: 'POSITIVE' | 'NEGATIVE'; weight: number }[]
} {
  const factors: { factor: string; impact: 'POSITIVE' | 'NEGATIVE'; weight: number }[] = []
  let score = 50
  
  const avgPoints = player.fantasyPoints / Math.max(1, currentWeek)
  const projected = player.projectedPoints || 0
  
  // Trending up
  if (avgPoints > projected * 1.2) {
    factors.push({ factor: 'Exceeding projections significantly', impact: 'POSITIVE', weight: 25 })
    score += 25
  } else if (avgPoints > projected * 1.1) {
    factors.push({ factor: 'Outperforming projections', impact: 'POSITIVE', weight: 15 })
    score += 15
  }
  
  // Consistent performance
  const consistency = projected > 0 ? (avgPoints / projected) * 100 : 0
  if (consistency > 110 && consistency < 130) {
    factors.push({ factor: 'Consistent production', impact: 'POSITIVE', weight: 10 })
    score += 10
  }
  
  // Strong recent performance
  if (avgPoints > 12) {
    factors.push({ factor: 'Strong recent performance', impact: 'POSITIVE', weight: 15 })
    score += 15
  }
  
  return { score: Math.max(0, Math.min(100, score)), factors }
}

/**
 * Analyze situation changes
 */
function analyzeSituation(player: Player): {
  score: number
  factors: { factor: string; impact: 'POSITIVE' | 'NEGATIVE'; weight: number }[]
} {
  const factors: { factor: string; impact: 'POSITIVE' | 'NEGATIVE'; weight: number }[] = []
  let score = 50
  
  // Young player with upside
  if (player.age && player.age < 25) {
    factors.push({ factor: 'Young player with growth potential', impact: 'POSITIVE', weight: 15 })
    score += 15
  }
  
  // Early career player
  if (player.experience && player.experience <= 2) {
    factors.push({ factor: 'Early career breakout window', impact: 'POSITIVE', weight: 10 })
    score += 10
  }
  
  // Good offense (simplified - would check actual team stats)
  const goodOffenseTeams = ['KC', 'BUF', 'DAL', 'SF', 'MIA', 'PHI']
  if (goodOffenseTeams.includes(player.team)) {
    factors.push({ factor: 'Plays in high-powered offense', impact: 'POSITIVE', weight: 10 })
    score += 10
  }
  
  return { score: Math.max(0, Math.min(100, score)), factors }
}

/**
 * Analyze schedule ahead
 */
function analyzeSchedule(player: Player, currentWeek: number): {
  score: number
  factors: { factor: string; impact: 'POSITIVE' | 'NEGATIVE'; weight: number }[]
} {
  const factors: { factor: string; impact: 'POSITIVE' | 'NEGATIVE'; weight: number }[] = []
  let score = 50
  
  // Simplified schedule analysis
  // In production, would analyze actual upcoming opponents
  
  // Playoff push (weeks 14-16)
  if (currentWeek >= 11 && currentWeek <= 13) {
    factors.push({ factor: 'Favorable playoff schedule ahead', impact: 'POSITIVE', weight: 15 })
    score += 15
  }
  
  // Bye week considerations
  const byeWeekHeavy = currentWeek >= 6 && currentWeek <= 11
  if (byeWeekHeavy) {
    factors.push({ factor: 'Bye week period - good time to add depth', impact: 'POSITIVE', weight: 5 })
    score += 5
  }
  
  return { score: Math.max(0, Math.min(100, score)), factors }
}

/**
 * Predict breakout candidates
 */
export function predictBreakout(player: Player, currentWeek: number = 4): BreakoutPrediction {
  // Analyze all factors
  const opportunity = analyzeOpportunity(player)
  const efficiency = analyzeEfficiency(player, currentWeek)
  const situation = analyzeSituation(player)
  const schedule = analyzeSchedule(player, currentWeek)
  
  // Combine all factors
  const allFactors = [
    ...opportunity.factors,
    ...efficiency.factors,
    ...situation.factors,
    ...schedule.factors
  ]
  
  // Calculate weighted breakout score
  const breakoutScore = Math.round(
    opportunity.score * 0.35 +
    efficiency.score * 0.30 +
    situation.score * 0.20 +
    schedule.score * 0.15
  )
  
  // Breakout probability (adjusted for position)
  const positionMultiplier: Record<string, number> = {
    'WR': 1.1, // WRs break out more frequently
    'RB': 1.0,
    'TE': 0.9,
    'QB': 0.8,
    'K': 0.3,
    'DST': 0.4
  }
  
  const breakoutProbability = Math.round(
    breakoutScore * (positionMultiplier[player.position] || 1.0)
  )
  
  // Confidence level
  const factorCount = allFactors.filter(f => f.impact === 'POSITIVE').length
  const confidence = Math.min(95, 60 + (factorCount * 5))
  
  // Timeframe prediction
  let timeframe: BreakoutPrediction['timeframe'] = 'LONG_TERM'
  if (breakoutScore > 75 && efficiency.score > 70) {
    timeframe = 'IMMEDIATE'
  } else if (breakoutScore > 60) {
    timeframe = 'SHORT_TERM'
  }
  
  // Recommended action
  let recommendedAction: BreakoutPrediction['recommendedAction'] = 'WAIT'
  if (breakoutProbability > 75) {
    recommendedAction = 'ADD_NOW'
  } else if (breakoutProbability > 60) {
    recommendedAction = 'MONITOR'
  } else if (breakoutProbability > 45) {
    recommendedAction = 'WAIT'
  } else {
    recommendedAction = 'PASS'
  }
  
  // Generate reasoning
  const topFactors = allFactors
    .filter(f => f.impact === 'POSITIVE')
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
  
  const reasoning = topFactors.length > 0
    ? `Strong breakout indicators: ${topFactors.map(f => f.factor.toLowerCase()).join(', ')}.`
    : 'Limited breakout indicators at this time.'
  
  return {
    player,
    breakoutScore,
    breakoutProbability: Math.min(100, Math.max(0, breakoutProbability)),
    confidence,
    keyFactors: allFactors,
    timeframe,
    reasoning,
    recommendedAction
  }
}

/**
 * Find top breakout candidates from a list
 */
export function findBreakoutCandidates(
  players: Player[],
  currentWeek: number,
  limit: number = 10
): BreakoutPrediction[] {
  return players
    .map(player => predictBreakout(player, currentWeek))
    .filter(pred => pred.breakoutProbability > 45) // Only show viable candidates
    .sort((a, b) => b.breakoutScore - a.breakoutScore)
    .slice(0, limit)
}


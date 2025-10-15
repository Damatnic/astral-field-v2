/**
 * Player Analytics Utilities
 * Calculate real player metrics instead of using random values
 */

interface Player {
  id: string
  name: string
  position: string
  fantasyPoints: number
  projectedPoints: number
  team?: string
  nflTeam?: string
}

/**
 * Calculate trending status based on fantasy points
 */
export function calculateTrending(player: Player): 'hot' | 'up' | 'down' | undefined {
  const points = player.fantasyPoints || 0
  const projected = player.projectedPoints || 0
  
  // Hot: Significantly outperforming projections
  if (points > projected * 1.3 && points > 15) {
    return 'hot'
  }
  
  // Up: Outperforming projections
  if (points > projected * 1.1) {
    return 'up'
  }
  
  // Down: Underperforming projections
  if (points < projected * 0.8 && projected > 10) {
    return 'down'
  }
  
  return undefined
}

/**
 * Calculate ownership percentage based on fantasy points and position
 */
export function calculateOwnership(player: Player): number {
  const points = player.fantasyPoints || 0
  const position = player.position
  
  // Base ownership on position scarcity
  const positionWeight = {
    'QB': 0.6,
    'RB': 0.85,
    'WR': 0.75,
    'TE': 0.7,
    'K': 0.3,
    'DST': 0.5,
    'DEF': 0.5
  }
  
  const weight = positionWeight[position as keyof typeof positionWeight] || 0.5
  
  // Calculate based on points and position
  let ownership = Math.min(95, (points / 20) * 100 * weight)
  
  // Round to nearest 5
  return Math.round(ownership / 5) * 5
}

/**
 * Calculate AI score based on multiple factors
 */
export function calculateAIScore(player: Player): number {
  const points = player.fantasyPoints || 0
  const projected = player.projectedPoints || 0
  
  // Factors:
  // 1. Current performance (40%)
  // 2. Projected performance (30%)
  // 3. Consistency (30%)
  
  const performanceScore = Math.min(100, (points / 25) * 100)
  const projectionScore = Math.min(100, (projected / 20) * 100)
  const consistencyScore = projected > 0 ? Math.min(100, (points / projected) * 100) : 50
  
  const aiScore = (
    performanceScore * 0.4 +
    projectionScore * 0.3 +
    consistencyScore * 0.3
  )
  
  return Math.round(aiScore)
}

/**
 * Calculate breakout probability
 */
export function calculateBreakoutProbability(player: Player): number {
  const points = player.fantasyPoints || 0
  const projected = player.projectedPoints || 0
  
  // Young players with increasing production have higher breakout potential
  const performanceTrend = points > projected * 1.2 ? 1.5 : 1.0
  const baseScore = Math.min(100, (projected / 15) * 100)
  
  return Math.round(baseScore * performanceTrend)
}

/**
 * Calculate opportunity score and reasons
 */
export function calculateOpportunity(player: Player): { score: number; reasons: string[] } | undefined {
  const points = player.fantasyPoints || 0
  const projected = player.projectedPoints || 0
  
  // Only show opportunities for high-upside players
  if (projected < 8 && points < 10) {
    return undefined
  }
  
  const reasons: string[] = []
  let score = 60
  
  // High projection
  if (projected > 15) {
    reasons.push('High projected points')
    score += 15
  }
  
  // Outperforming projections
  if (points > projected * 1.2) {
    reasons.push('Exceeding projections')
    score += 10
  }
  
  // Position scarcity
  if (player.position === 'RB' || player.position === 'TE') {
    reasons.push('Position scarcity')
    score += 10
  }
  
  // Strong recent performance
  if (points > 15) {
    reasons.push('Strong recent performance')
    score += 5
  }
  
  return reasons.length > 0 ? { score: Math.min(100, score), reasons } : undefined
}

/**
 * Calculate schedule difficulty based on team
 */
export function calculateScheduleDifficulty(teamAbbr?: string): 'easy' | 'medium' | 'hard' {
  if (!teamAbbr) return 'medium'
  
  // Simplified schedule difficulty based on team quality
  // In production, this would query actual opponent data
  const easyScheduleTeams = ['MIA', 'CAR', 'NYG', 'WAS', 'CHI', 'ARI']
  const hardScheduleTeams = ['SF', 'DAL', 'KC', 'BUF', 'BAL', 'PHI']
  
  if (easyScheduleTeams.includes(teamAbbr)) return 'easy'
  if (hardScheduleTeams.includes(teamAbbr)) return 'hard'
  
  return 'medium'
}

/**
 * Get upcoming opponents (mock data for now)
 */
export function getUpcomingOpponents(teamAbbr?: string): string[] {
  // In production, this would query actual schedule data
  // For now, return generic opponents
  return ['OPP1', 'OPP2', 'OPP3']
}

/**
 * Calculate all enhanced metrics for a player
 */
export function enhancePlayerWithAnalytics(player: Player) {
  return {
    ...player,
    trending: calculateTrending(player),
    ownership: calculateOwnership(player),
    aiScore: calculateAIScore(player),
    breakoutProbability: calculateBreakoutProbability(player),
    opportunity: calculateOpportunity(player),
    upcomingSchedule: {
      difficulty: calculateScheduleDifficulty(player.team || player.nflTeam),
      opponents: getUpcomingOpponents(player.team || player.nflTeam)
    }
  }
}


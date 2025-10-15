/**
 * Trade Value Analyzer
 * Advanced trade fairness and value calculations
 */

interface Player {
  id: string
  name: string
  position: string
  fantasyPoints: number
  projectedPoints: number
  team?: string
  adp?: number
  age?: number
}

interface Team {
  id: string
  name: string
  roster: Player[]
  needPositions?: string[]
  surplusPositions?: string[]
}

export interface TradeAnalysis {
  fairnessScore: number // -100 to 100 (negative favors team A, positive favors team B)
  recommendation: 'ACCEPT' | 'REJECT' | 'COUNTER' | 'SLIGHT_FAVOR_A' | 'SLIGHT_FAVOR_B'
  teamAImpact: {
    valueGained: number
    valueLost: number
    netChange: number
    strengthenedPositions: string[]
    weakenedPositions: string[]
    rosterBalance: number // 0-100
  }
  teamBImpact: {
    valueGained: number
    valueLost: number
    netChange: number
    strengthenedPositions: string[]
    weakenedPositions: string[]
    rosterBalance: number
  }
  keyInsights: string[]
  counterSuggestion?: {
    addPlayers: string[]
    reason: string
  }
  confidenceLevel: number // 0-100
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
}

/**
 * Position scarcity weights (higher = more valuable)
 */
const POSITION_SCARCITY = {
  'RB': 1.3,
  'TE': 1.2,
  'WR': 1.0,
  'QB': 0.9,
  'K': 0.5,
  'DST': 0.6,
  'DEF': 0.6
}

/**
 * Calculate player value based on multiple factors
 */
function calculatePlayerValue(player: Player): number {
  const baseValue = (player.fantasyPoints || 0) + (player.projectedPoints || 0) / 2
  const scarcity = POSITION_SCARCITY[player.position as keyof typeof POSITION_SCARCITY] || 1.0
  
  // Age factor (younger players slightly more valuable in dynasty)
  const ageFactor = player.age ? Math.max(0.8, 1 - ((player.age - 25) / 50)) : 1.0
  
  // ADP factor (lower ADP = higher value)
  const adpFactor = player.adp ? Math.max(0.5, 1 - (player.adp / 300)) : 0.8
  
  return baseValue * scarcity * ageFactor * adpFactor
}

/**
 * Calculate total value of players
 */
function calculateTotalValue(players: Player[]): number {
  return players.reduce((sum, player) => sum + calculatePlayerValue(player), 0)
}

/**
 * Get position distribution for roster
 */
function getPositionDistribution(players: Player[]): Record<string, number> {
  const distribution: Record<string, number> = {}
  
  players.forEach(player => {
    distribution[player.position] = (distribution[player.position] || 0) + 1
  })
  
  return distribution
}

/**
 * Calculate roster balance (0-100, higher is better)
 */
function calculateRosterBalance(roster: Player[]): number {
  const distribution = getPositionDistribution(roster)
  
  // Ideal distribution
  const ideal = { QB: 2, RB: 4, WR: 4, TE: 2, K: 1, DST: 1 }
  
  let balanceScore = 100
  
  Object.entries(ideal).forEach(([position, idealCount]) => {
    const actual = distribution[position] || 0
    const diff = Math.abs(actual - idealCount)
    balanceScore -= diff * 5 // Penalize imbalance
  })
  
  return Math.max(0, Math.min(100, balanceScore))
}

/**
 * Identify strengthened and weakened positions
 */
function analyzePositionalImpact(
  beforeRoster: Player[],
  afterRoster: Player[],
  gainedPlayers: Player[],
  lostPlayers: Player[]
): { strengthened: string[], weakened: string[] } {
  const strengthened: Set<string> = new Set()
  const weakened: Set<string> = new Set()
  
  // Check each position
  const positions = new Set([...gainedPlayers.map(p => p.position), ...lostPlayers.map(p => p.position)])
  
  positions.forEach(position => {
    const beforeValue = beforeRoster
      .filter(p => p.position === position)
      .reduce((sum, p) => sum + calculatePlayerValue(p), 0)
      
    const afterValue = afterRoster
      .filter(p => p.position === position)
      .reduce((sum, p) => sum + calculatePlayerValue(p), 0)
    
    const change = afterValue - beforeValue
    
    if (change > 0) {
      strengthened.add(position)
    } else if (change < 0) {
      weakened.add(position)
    }
  })
  
  return {
    strengthened: Array.from(strengthened),
    weakened: Array.from(weakened)
  }
}

/**
 * Analyze a trade proposal
 */
export function analyzeTrade(
  teamA: Team,
  teamB: Team,
  teamAGives: Player[],
  teamBGives: Player[]
): TradeAnalysis {
  // Calculate values
  const teamAGiveValue = calculateTotalValue(teamAGives)
  const teamBGiveValue = calculateTotalValue(teamBGives)
  
  // Calculate fairness (-100 to 100)
  const valueDiff = teamBGiveValue - teamAGiveValue
  const avgValue = (teamAGiveValue + teamBGiveValue) / 2
  const fairnessScore = avgValue > 0 ? (valueDiff / avgValue) * 100 : 0
  
  // Team A after trade
  const teamARosterAfter = [
    ...teamA.roster.filter(p => !teamAGives.find(g => g.id === p.id)),
    ...teamBGives
  ]
  
  // Team B after trade
  const teamBRosterAfter = [
    ...teamB.roster.filter(p => !teamBGives.find(g => g.id === p.id)),
    ...teamAGives
  ]
  
  // Positional impact
  const teamAPositionalImpact = analyzePositionalImpact(teamA.roster, teamARosterAfter, teamBGives, teamAGives)
  const teamBPositionalImpact = analyzePositionalImpact(teamB.roster, teamBRosterAfter, teamAGives, teamBGives)
  
  // Roster balance
  const teamABalanceBefore = calculateRosterBalance(teamA.roster)
  const teamABalanceAfter = calculateRosterBalance(teamARosterAfter)
  const teamBBalanceBefore = calculateRosterBalance(teamB.roster)
  const teamBBalanceAfter = calculateRosterBalance(teamBRosterAfter)
  
  // Generate insights
  const insights: string[] = []
  
  if (Math.abs(fairnessScore) < 10) {
    insights.push('Trade is relatively fair in value')
  } else if (fairnessScore < -15) {
    insights.push(`Team A receives significantly more value (+${Math.abs(fairnessScore).toFixed(1)}%)`)
  } else if (fairnessScore > 15) {
    insights.push(`Team B receives significantly more value (+${fairnessScore.toFixed(1)}%)`)
  }
  
  if (teamABalanceAfter > teamABalanceBefore + 10) {
    insights.push('Team A improves roster balance significantly')
  }
  if (teamBBalanceAfter > teamBBalanceBefore + 10) {
    insights.push('Team B improves roster balance significantly')
  }
  
  if (teamA.needPositions) {
    const filledNeeds = teamBGives.filter(p => teamA.needPositions!.includes(p.position))
    if (filledNeeds.length > 0) {
      insights.push(`Team A fills need at ${filledNeeds.map(p => p.position).join(', ')}`)
    }
  }
  
  if (teamB.needPositions) {
    const filledNeeds = teamAGives.filter(p => teamB.needPositions!.includes(p.position))
    if (filledNeeds.length > 0) {
      insights.push(`Team B fills need at ${filledNeeds.map(p => p.position).join(', ')}`)
    }
  }
  
  // Risk assessment
  const hasInjuredPlayers = [...teamAGives, ...teamBGives].some(p => {
    // Simplified injury check - would use real data in production
    return p.fantasyPoints < p.projectedPoints * 0.5
  })
  
  const riskLevel = hasInjuredPlayers ? 'HIGH' : Math.abs(fairnessScore) > 20 ? 'MEDIUM' : 'LOW'
  
  // Recommendation
  let recommendation: TradeAnalysis['recommendation'] = 'ACCEPT'
  
  if (fairnessScore < -25) {
    recommendation = 'REJECT'
  } else if (fairnessScore > 25) {
    recommendation = 'REJECT'
  } else if (fairnessScore < -10) {
    recommendation = 'SLIGHT_FAVOR_A'
  } else if (fairnessScore > 10) {
    recommendation = 'SLIGHT_FAVOR_B'
  } else if (Math.abs(fairnessScore) < 5 && (teamABalanceAfter > teamABalanceBefore || teamBBalanceAfter > teamBBalanceBefore)) {
    recommendation = 'ACCEPT'
  }
  
  // Calculate confidence
  const confidenceLevel = Math.max(60, Math.min(95, 100 - Math.abs(fairnessScore) / 2))
  
  return {
    fairnessScore: Math.round(fairnessScore * 10) / 10,
    recommendation,
    teamAImpact: {
      valueGained: teamBGiveValue,
      valueLost: teamAGiveValue,
      netChange: teamBGiveValue - teamAGiveValue,
      strengthenedPositions: teamAPositionalImpact.strengthened,
      weakenedPositions: teamAPositionalImpact.weakened,
      rosterBalance: teamABalanceAfter
    },
    teamBImpact: {
      valueGained: teamAGiveValue,
      valueLost: teamBGiveValue,
      netChange: teamAGiveValue - teamBGiveValue,
      strengthenedPositions: teamBPositionalImpact.strengthened,
      weakenedPositions: teamBPositionalImpact.weakened,
      rosterBalance: teamBBalanceAfter
    },
    keyInsights: insights,
    confidenceLevel: Math.round(confidenceLevel),
    riskLevel
  }
}

/**
 * Generate counter-offer suggestions
 */
export function generateCounterOffer(
  analysis: TradeAnalysis,
  teamA: Team,
  teamB: Team,
  originalTeamAGives: Player[],
  originalTeamBGives: Player[]
): {
  suggestedAdd: Player | null
  suggestedRemove: Player | null
  reason: string
} | null {
  // Only suggest counter if trade is unfair
  if (Math.abs(analysis.fairnessScore) < 15) {
    return null
  }
  
  const needsMoreValue = analysis.fairnessScore > 0 ? teamA : teamB
  const givesMoreValue = analysis.fairnessScore > 0 ? teamB : teamA
  const valueDiff = Math.abs(analysis.teamAImpact.netChange)
  
  // Find a player from the team that needs to add value
  const potentialAdds = givesMoreValue.roster.filter(p => 
    !originalTeamAGives.find(g => g.id === p.id) &&
    !originalTeamBGives.find(g => g.id === p.id)
  ).sort((a, b) => calculatePlayerValue(b) - calculatePlayerValue(a))
  
  // Find the player closest to the value difference
  const suggestedAdd = potentialAdds.find(p => {
    const playerValue = calculatePlayerValue(p)
    return playerValue >= valueDiff * 0.5 && playerValue <= valueDiff * 1.5
  }) || potentialAdds[0]
  
  if (!suggestedAdd) return null
  
  return {
    suggestedAdd,
    suggestedRemove: null,
    reason: `Adding ${suggestedAdd.name} would balance the trade value`
  }
}

/**
 * Calculate buy-low and sell-high candidates
 */
export function identifyTradeTargets(roster: Player[], availablePlayers: Player[]): {
  buyLow: Player[]
  sellHigh: Player[]
} {
  const buyLow = availablePlayers.filter(player => {
    // Player performing below projections with good upside
    return player.fantasyPoints < player.projectedPoints * 0.8 && player.projectedPoints > 10
  }).slice(0, 10)
  
  const sellHigh = roster.filter(player => {
    // Player overperforming projections
    return player.fantasyPoints > player.projectedPoints * 1.3 && player.fantasyPoints > 12
  }).slice(0, 10)
  
  return { buyLow, sellHigh }
}

/**
 * Analyze position scarcity in league
 */
export function analyzePositionScarcity(allPlayers: Player[]): Record<string, {
  averagePoints: number
  topTier: number // Points threshold for top-tier player
  scarcityScore: number // 0-100, higher = more scarce
}> {
  const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DST']
  const result: Record<string, any> = {}
  
  positions.forEach(position => {
    const positionPlayers = allPlayers.filter(p => p.position === position)
    
    if (positionPlayers.length === 0) {
      result[position] = { averagePoints: 0, topTier: 0, scarcityScore: 50 }
      return
    }
    
    const averagePoints = positionPlayers.reduce((sum, p) => sum + (p.fantasyPoints || 0), 0) / positionPlayers.length
    const topPlayers = positionPlayers.sort((a, b) => (b.fantasyPoints || 0) - (a.fantasyPoints || 0)).slice(0, 12)
    const topTier = topPlayers[topPlayers.length - 1]?.fantasyPoints || 0
    
    // Calculate scarcity (fewer high-performing players = higher scarcity)
    const starterCount = positionPlayers.filter(p => (p.fantasyPoints || 0) > topTier).length
    const scarcityScore = Math.max(0, Math.min(100, 100 - (starterCount * 5)))
    
    result[position] = {
      averagePoints: Math.round(averagePoints * 10) / 10,
      topTier: Math.round(topTier * 10) / 10,
      scarcityScore
    }
  })
  
  return result
}

/**
 * Analyze trade timing (bye weeks, playoffs, etc.)
 */
export function analyzeTradeTimings(currentWeek: number): {
  isByeWeekHeavy: boolean
  isPlayoffPush: boolean
  recommendTiming: 'GOOD' | 'CAUTION' | 'WAIT'
} {
  const isByeWeekHeavy = currentWeek >= 6 && currentWeek <= 11
  const isPlayoffPush = currentWeek >= 10 && currentWeek <= 13
  const isTradingDeadline = currentWeek >= 11
  
  let recommendTiming: 'GOOD' | 'CAUTION' | 'WAIT' = 'GOOD'
  
  if (isTradingDeadline) {
    recommendTiming = 'CAUTION'
  } else if (isByeWeekHeavy) {
    recommendTiming = 'GOOD' // Good time to trade for depth
  }
  
  return {
    isByeWeekHeavy,
    isPlayoffPush,
    recommendTiming
  }
}


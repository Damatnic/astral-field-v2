/**
 * Injury Impact Analyzer
 * Analyze player injuries and their fantasy impact
 */

export type InjuryType = 'ANKLE' | 'KNEE' | 'HAMSTRING' | 'SHOULDER' | 'CONCUSSION' | 'BACK' | 'RIBS' | 'FOOT' | 'OTHER'
export type InjurySeverity = 'MINOR' | 'MODERATE' | 'SEVERE' | 'SEASON_ENDING'

interface Player {
  id: string
  name: string
  position: string
  team: string
  fantasyPoints: number
  projectedPoints: number
  adp?: number
  age?: number
}

export interface InjuryReport {
  playerId: string
  playerName: string
  position: string
  team: string
  injuryType: InjuryType
  severity: InjurySeverity
  expectedReturnWeek?: number
  currentWeek: number
}

export interface InjuryImpactAnalysis {
  injuredPlayer: Player
  severity: InjurySeverity
  expectedMissedWeeks: number
  returnProbability: number // 0-100 for each week
  fantasyImpact: {
    weeklyPointsLost: number
    totalProjectedLoss: number
    positionRankDrop: number
  }
  backupOptions: {
    player: Player
    valueIncrease: number // How much their value increases
    projectedPoints: number
    confidenceLevel: number
    reasoning: string
  }[]
  handcuffRecommendation?: {
    player: Player
    priority: 'HIGH' | 'MEDIUM' | 'LOW'
    reasoning: string
  }
  teamOffensiveImpact: {
    scoringDecrease: number // Percentage
    passingImpact: number
    rushingImpact: number
    affectedPlayers: string[]
  }
}

/**
 * Injury severity to expected weeks missed
 */
const SEVERITY_TO_WEEKS: Record<InjurySeverity, [number, number]> = {
  'MINOR': [1, 2],
  'MODERATE': [2, 4],
  'SEVERE': [4, 8],
  'SEASON_ENDING': [17, 17]
}

/**
 * Analyze injury impact
 */
export function analyzeInjuryImpact(
  injury: InjuryReport,
  player: Player,
  teamRoster: Player[],
  availablePlayers: Player[]
): InjuryImpactAnalysis {
  const [minWeeks, maxWeeks] = SEVERITY_TO_WEEKS[injury.severity]
  const expectedMissedWeeks = Math.floor((minWeeks + maxWeeks) / 2)
  
  // Return probability calculation
  const weeksOut = injury.expectedReturnWeek ? injury.expectedReturnWeek - injury.currentWeek : expectedMissedWeeks
  const returnProbability = Math.max(0, Math.min(100, 100 - (weeksOut * 15)))
  
  // Fantasy impact
  const weeklyPointsLost = player.projectedPoints || player.fantasyPoints / 8
  const totalProjectedLoss = weeklyPointsLost * expectedMissedWeeks
  const positionRankDrop = injury.severity === 'SEASON_ENDING' ? 50 : Math.floor(expectedMissedWeeks * 3)
  
  // Find backup options on same team
  const backupOptions = teamRoster
    .filter(p => p.position === player.position && p.team === player.team && p.id !== player.id)
    .map(backup => {
      // Calculate value increase
      const currentValue = backup.projectedPoints || backup.fantasyPoints / 8
      const valueIncrease = weeklyPointsLost * 0.6 // Backup typically gets 60% of starter's usage
      const newProjected = currentValue + valueIncrease
      
      return {
        player: backup,
        valueIncrease: Math.round(valueIncrease * 10) / 10,
        projectedPoints: Math.round(newProjected * 10) / 10,
        confidenceLevel: injury.severity === 'SEVERE' ? 85 : 70,
        reasoning: `Expected to absorb ${Math.round((valueIncrease / weeklyPointsLost) * 100)}% of ${player.name}'s workload`
      }
    })
    .sort((a, b) => b.projectedPoints - a.projectedPoints)
    .slice(0, 3)
  
  // Handcuff recommendation
  const handcuff = backupOptions[0]
  const handcuffRecommendation = handcuff ? {
    player: handcuff.player,
    priority: (injury.severity === 'SEVERE' || injury.severity === 'SEASON_ENDING') ? 'HIGH' as const :
              injury.severity === 'MODERATE' ? 'MEDIUM' as const : 'LOW' as const,
    reasoning: `Primary backup for ${player.name}, likely to see significant increase in touches`
  } : undefined
  
  // Team offensive impact
  const teamOffensiveImpact = calculateTeamOffensiveImpact(player)
  
  return {
    injuredPlayer: player,
    severity: injury.severity,
    expectedMissedWeeks,
    returnProbability: Math.round(returnProbability),
    fantasyImpact: {
      weeklyPointsLost: Math.round(weeklyPointsLost * 10) / 10,
      totalProjectedLoss: Math.round(totalProjectedLoss * 10) / 10,
      positionRankDrop
    },
    backupOptions,
    handcuffRecommendation,
    teamOffensiveImpact
  }
}

/**
 * Calculate team offensive impact
 */
function calculateTeamOffensiveImpact(player: Player): {
  scoringDecrease: number
  passingImpact: number
  rushingImpact: number
  affectedPlayers: string[]
} {
  const positionImpact: Record<string, any> = {
    'QB': {
      scoringDecrease: 15,
      passingImpact: 20,
      rushingImpact: 5,
      affectedPlayers: ['All pass catchers', 'Running backs (pass game)']
    },
    'RB': {
      scoringDecrease: 8,
      passingImpact: 2,
      rushingImpact: 12,
      affectedPlayers: ['Backup RBs', 'Offensive line workload']
    },
    'WR': {
      scoringDecrease: 5,
      passingImpact: 8,
      rushingImpact: 0,
      affectedPlayers: ['Other WRs (target redistribution)', 'TE (more targets)']
    },
    'TE': {
      scoringDecrease: 3,
      passingImpact: 5,
      rushingImpact: 0,
      affectedPlayers: ['WRs (red zone targets)', 'Backup TE']
    }
  }
  
  return positionImpact[player.position] || {
    scoringDecrease: 2,
    passingImpact: 1,
    rushingImpact: 1,
    affectedPlayers: []
  }
}

/**
 * Recommend handcuffs to pickup
 */
export function recommendHandcuffs(
  myRoster: Player[],
  availablePlayers: Player[],
  currentWeek: number
): {
  player: Player
  handcuff: Player
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  reasoning: string
}[] {
  const recommendations: any[] = []
  
  // Find high-value RBs on my roster
  const myRBs = myRoster.filter(p => p.position === 'RB' && (p.fantasyPoints || 0) > 12)
  
  myRBs.forEach(rb => {
    // Find backup RB from same team
    const handcuff = availablePlayers.find(p =>
      p.position === 'RB' &&
      p.team === rb.team &&
      p.id !== rb.id
    )
    
    if (handcuff) {
      const rbValue = calculatePlayerValue(rb)
      const priority = rbValue > 15 ? 'HIGH' : rbValue > 10 ? 'MEDIUM' : 'LOW'
      
      recommendations.push({
        player: rb,
        handcuff,
        priority,
        reasoning: `${handcuff.name} is the primary backup for ${rb.name}. High-value insurance.`
      })
    }
  })
  
  return recommendations.sort((a, b) => {
    const priorityOrder: Record<string, number> = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 }
    return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0)
  })
}

/**
 * Predict injury risk based on player history and usage
 */
export function predictInjuryRisk(player: Player, currentWeek: number): {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  riskFactors: string[]
  riskScore: number // 0-100
} {
  const riskFactors: string[] = []
  let riskScore = 20 // Base risk
  
  // Age factor
  const playerAge = (player as any).age
  if (playerAge && playerAge > 30) {
    riskFactors.push('Veteran player (age 30+)')
    riskScore += 15
  }
  
  // Position risk
  if (player.position === 'RB') {
    riskFactors.push('Running back position (high contact)')
    riskScore += 20
  }
  
  // Usage (high usage = higher risk)
  const avgPoints = player.fantasyPoints / Math.max(1, currentWeek)
  if (avgPoints > 18) {
    riskFactors.push('Heavy workload/usage')
    riskScore += 15
  }
  
  // Recent injury history (simulated - would use real data)
  if (Math.random() > 0.8) {
    riskFactors.push('Recent injury history')
    riskScore += 20
  }
  
  const riskLevel = riskScore > 60 ? 'HIGH' : riskScore > 35 ? 'MEDIUM' : 'LOW'
  
  return {
    riskLevel,
    riskFactors,
    riskScore: Math.min(100, riskScore)
  }
}

/**
 * Helper to calculate player value for internal use
 */
function calculatePlayerValue(player: Player): number {
  const baseValue = (player.fantasyPoints || 0) + (player.projectedPoints || 0) / 2
  const scarcity = POSITION_SCARCITY[player.position as keyof typeof POSITION_SCARCITY] || 1.0
  return baseValue * scarcity
}

const POSITION_SCARCITY: Record<string, number> = {
  'RB': 1.3,
  'TE': 1.2,
  'WR': 1.0,
  'QB': 0.9,
  'K': 0.5,
  'DST': 0.6,
  'DEF': 0.6
}


/**
 * Streaming Advisor
 * Weekly streaming recommendations for QB, TE, and DST
 */

interface Player {
  id: string
  name: string
  position: string
  team: string
  fantasyPoints: number
  projectedPoints: number
  ownership?: number
}

interface Matchup {
  team: string
  opponent: string
  homeAway: 'HOME' | 'AWAY'
  vegasTotal?: number
  vegasSpread?: number
}

export interface StreamingRecommendation {
  player: Player
  matchup: Matchup
  streamScore: number // 0-100
  projectedPoints: number
  confidence: number // 0-100
  reasoning: string[]
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  upside: 'LIMITED' | 'MODERATE' | 'HIGH' | 'BOOM'
  ownership: number
  addPriority: 'MUST_ADD' | 'STRONG_ADD' | 'SPECULATIVE' | 'DEEP_LEAGUE'
}

/**
 * Matchup difficulty ratings (simplified)
 */
const DEFENSE_RATINGS: Record<string, {
  vsQB: number // Points allowed above/below average
  vsRB: number
  vsWR: number
  vsTE: number
}> = {
  // Elite defenses (tough matchups)
  'SF': { vsQB: -3, vsRB: -2, vsWR: -2, vsTE: -1 },
  'DAL': { vsQB: -2, vsRB: -2, vsWR: -1, vsTE: -1 },
  'BUF': { vsQB: -2, vsRB: -1, vsWR: -2, vsTE: -1 },
  'BAL': { vsQB: -2, vsRB: -3, vsWR: -1, vsTE: -1 },
  
  // Weak defenses (favorable matchups)
  'ARI': { vsQB: 3, vsRB: 2, vsWR: 2, vsTE: 2 },
  'CAR': { vsQB: 2, vsRB: 2, vsWR: 2, vsTE: 1 },
  'WAS': { vsQB: 2, vsRB: 1, vsWR: 2, vsTE: 2 },
  'CHI': { vsQB: 2, vsRB: 1, vsWR: 1, vsTE: 2 },
  
  // Average defenses
  'DEFAULT': { vsQB: 0, vsRB: 0, vsWR: 0, vsTE: 0 }
}

/**
 * Calculate matchup bonus
 */
function calculateMatchupBonus(player: Player, matchup: Matchup): {
  bonus: number
  reasons: string[]
} {
  const reasons: string[] = []
  let bonus = 0
  
  // Get defense rating
  const defenseRating = DEFENSE_RATINGS[matchup.opponent] || DEFENSE_RATINGS['DEFAULT']
  const positionRating = defenseRating[`vs${player.position}` as keyof typeof defenseRating] || 0
  
  // Matchup bonus
  if (positionRating > 2) {
    reasons.push(`Favorable matchup vs ${matchup.opponent}`)
    bonus += 3
  } else if (positionRating > 0) {
    reasons.push(`Good matchup vs ${matchup.opponent}`)
    bonus += 1.5
  } else if (positionRating < -2) {
    reasons.push(`Tough matchup vs ${matchup.opponent}`)
    bonus -= 2
  }
  
  // Home field advantage
  if (matchup.homeAway === 'HOME') {
    reasons.push('Home field advantage')
    bonus += 1
  }
  
  // Game total (high-scoring games)
  if (matchup.vegasTotal && matchup.vegasTotal > 50) {
    reasons.push('High over/under (shootout potential)')
    bonus += 2
  } else if (matchup.vegasTotal && matchup.vegasTotal < 40) {
    reasons.push('Low over/under (low-scoring game)')
    bonus -= 1
  }
  
  // Spread (underdog QBs throw more)
  if (player.position === 'QB' && matchup.vegasSpread && matchup.vegasSpread < -7) {
    reasons.push('Heavy underdog (passing game script)')
    bonus += 1.5
  }
  
  return { bonus, reasons }
}

/**
 * Recommend QB streaming options
 */
export function recommendQBStreaming(
  availableQBs: Player[],
  matchups: Matchup[],
  currentWeek: number
): StreamingRecommendation[] {
  return availableQBs
    .filter(qb => (qb.ownership || 0) < 60) // Only low-rostered QBs
    .map(qb => {
      const matchup = matchups.find(m => m.team === qb.team)
      if (!matchup) return null
      
      const { bonus, reasons } = calculateMatchupBonus(qb, matchup)
      const baseProjection = qb.projectedPoints || (qb.fantasyPoints / Math.max(1, currentWeek))
      const projectedPoints = baseProjection + bonus
      
      // Stream score
      const matchupScore = ((bonus + 5) / 10) * 100
      const productionScore = (baseProjection / 25) * 100
      const streamScore = Math.round(matchupScore * 0.6 + productionScore * 0.4)
      
      // Upside calculation
      const upside = projectedPoints > 22 ? 'BOOM' :
                     projectedPoints > 18 ? 'HIGH' :
                     projectedPoints > 15 ? 'MODERATE' : 'LIMITED'
      
      // Add priority
      const addPriority = streamScore > 80 ? 'MUST_ADD' :
                          streamScore > 65 ? 'STRONG_ADD' :
                          streamScore > 50 ? 'SPECULATIVE' : 'DEEP_LEAGUE'
      
      return {
        player: qb,
        matchup,
        streamScore: Math.min(100, streamScore),
        projectedPoints: Math.round(projectedPoints * 10) / 10,
        confidence: Math.min(85, 65 + bonus * 3),
        reasoning: reasons,
        riskLevel: bonus < 0 ? 'HIGH' : bonus > 2 ? 'LOW' : 'MEDIUM',
        upside,
        ownership: qb.ownership || 0,
        addPriority
      } as StreamingRecommendation
    })
    .filter((rec): rec is StreamingRecommendation => rec !== null)
    .sort((a, b) => b.streamScore - a.streamScore)
    .slice(0, 5)
}

/**
 * Recommend TE streaming options
 */
export function recommendTEStreaming(
  availableTEs: Player[],
  matchups: Matchup[],
  currentWeek: number
): StreamingRecommendation[] {
  return availableTEs
    .filter(te => (te.ownership || 0) < 50)
    .map(te => {
      const matchup = matchups.find(m => m.team === te.team)
      if (!matchup) return null
      
      const { bonus, reasons } = calculateMatchupBonus(te, matchup)
      const baseProjection = te.projectedPoints || (te.fantasyPoints / Math.max(1, currentWeek))
      const projectedPoints = baseProjection + bonus
      
      // TEs are more matchup-dependent
      const matchupScore = ((bonus + 4) / 8) * 100
      const productionScore = (baseProjection / 15) * 100
      const streamScore = Math.round(matchupScore * 0.7 + productionScore * 0.3)
      
      const upside = projectedPoints > 12 ? 'BOOM' :
                     projectedPoints > 9 ? 'HIGH' :
                     projectedPoints > 6 ? 'MODERATE' : 'LIMITED'
      
      const addPriority = streamScore > 75 ? 'MUST_ADD' :
                          streamScore > 60 ? 'STRONG_ADD' :
                          streamScore > 45 ? 'SPECULATIVE' : 'DEEP_LEAGUE'
      
      return {
        player: te,
        matchup,
        streamScore: Math.min(100, streamScore),
        projectedPoints: Math.round(projectedPoints * 10) / 10,
        confidence: Math.min(80, 60 + bonus * 3),
        reasoning: reasons,
        riskLevel: bonus < 0 ? 'HIGH' : bonus > 1.5 ? 'LOW' : 'MEDIUM',
        upside,
        ownership: te.ownership || 0,
        addPriority
      } as StreamingRecommendation
    })
    .filter((rec): rec is StreamingRecommendation => rec !== null)
    .sort((a, b) => b.streamScore - a.streamScore)
    .slice(0, 5)
}

/**
 * Recommend DST streaming options
 */
export function recommendDSTStreaming(
  availableDSTs: Player[],
  matchups: Matchup[],
  currentWeek: number
): StreamingRecommendation[] {
  return availableDSTs
    .filter(dst => (dst.ownership || 0) < 70)
    .map(dst => {
      const matchup = matchups.find(m => m.team === dst.team)
      if (!matchup) return null
      
      const reasons: string[] = []
      let bonus = 0
      
      // Opponent strength (inverse for DST)
      const weakOffenseTeams = ['CAR', 'WAS', 'NYG', 'CHI', 'ARI', 'NE']
      const strongOffenseTeams = ['KC', 'BUF', 'DAL', 'SF', 'MIA']
      
      if (weakOffenseTeams.includes(matchup.opponent)) {
        reasons.push(`Weak opponent offense (${matchup.opponent})`)
        bonus += 4
      } else if (strongOffenseTeams.includes(matchup.opponent)) {
        reasons.push(`Strong opponent offense (${matchup.opponent})`)
        bonus -= 3
      }
      
      // Home advantage for DST
      if (matchup.homeAway === 'HOME') {
        reasons.push('Home field advantage')
        bonus += 1
      }
      
      // Low game total (defensive game)
      if (matchup.vegasTotal && matchup.vegasTotal < 42) {
        reasons.push('Low over/under (defensive game)')
        bonus += 2
      }
      
      const baseProjection = dst.projectedPoints || 8
      const projectedPoints = baseProjection + bonus
      
      const streamScore = Math.round(((bonus + 6) / 12) * 100)
      
      const upside = projectedPoints > 12 ? 'BOOM' :
                     projectedPoints > 9 ? 'HIGH' :
                     projectedPoints > 7 ? 'MODERATE' : 'LIMITED'
      
      const addPriority = streamScore > 80 ? 'MUST_ADD' :
                          streamScore > 65 ? 'STRONG_ADD' :
                          streamScore > 50 ? 'SPECULATIVE' : 'DEEP_LEAGUE'
      
      return {
        player: dst,
        matchup,
        streamScore: Math.min(100, Math.max(0, streamScore)),
        projectedPoints: Math.round(projectedPoints * 10) / 10,
        confidence: Math.min(85, 60 + bonus * 4),
        reasoning: reasons,
        riskLevel: bonus < -1 ? 'HIGH' : bonus > 2 ? 'LOW' : 'MEDIUM',
        upside,
        ownership: dst.ownership || 0,
        addPriority
      } as StreamingRecommendation
    })
    .filter((rec): rec is StreamingRecommendation => rec !== null)
    .sort((a, b) => b.streamScore - a.streamScore)
    .slice(0, 5)
}

/**
 * Multi-week streaming planner for bye weeks
 */
export function planByeWeekStreaming(
  position: 'QB' | 'TE' | 'DST',
  availablePlayers: Player[],
  byeWeeks: number[],
  matchupsByWeek: Record<number, Matchup[]>
): {
  week: number
  recommendations: StreamingRecommendation[]
}[] {
  return byeWeeks.map(week => {
    const matchups = matchupsByWeek[week] || []
    
    let recommendations: StreamingRecommendation[] = []
    
    if (position === 'QB') {
      recommendations = recommendQBStreaming(availablePlayers.filter(p => p.position === 'QB'), matchups, week)
    } else if (position === 'TE') {
      recommendations = recommendTEStreaming(availablePlayers.filter(p => p.position === 'TE'), matchups, week)
    } else if (position === 'DST') {
      recommendations = recommendDSTStreaming(availablePlayers.filter(p => p.position === 'DST' || p.position === 'DEF'), matchups, week)
    }
    
    return {
      week,
      recommendations: recommendations.slice(0, 3) // Top 3 per week
    }
  })
}


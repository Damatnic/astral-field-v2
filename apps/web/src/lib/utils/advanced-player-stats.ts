/**
 * Advanced Player Stats Calculator
 * Calculate realistic advanced stats for players
 */

interface Player {
  id: string
  name: string
  position: string
  fantasyPoints: number
  projectedPoints: number
}

/**
 * Calculate target share for pass catchers
 */
export function calculateTargetShare(player: Player): number | undefined {
  if (player.position !== 'WR' && player.position !== 'TE') {
    return undefined
  }
  
  const points = player.fantasyPoints || 0
  
  // Elite receivers: 25-30% target share
  if (points > 18) {
    return 25 + (points - 18) / 2
  }
  
  // WR1/TE1: 20-25% target share
  if (points > 15) {
    return 20 + (points - 15)
  }
  
  // WR2/Flex: 15-20% target share
  if (points > 10) {
    return 15 + (points - 10)
  }
  
  // Depth pieces: 8-15% target share
  return Math.max(8, points * 1.5)
}

/**
 * Calculate snap count percentage
 */
export function calculateSnapCount(player: Player): number {
  const points = player.fantasyPoints || 0
  const position = player.position
  
  // Starters typically get 60-95% of snaps
  // Backups get 15-40%
  
  // QB/TE starters: 85-95%
  if (position === 'QB' || position === 'TE') {
    if (points > 12) return Math.min(95, 85 + points / 2)
    if (points > 5) return 60 + points * 2
    return Math.max(15, points * 5)
  }
  
  // WR: Based on usage
  if (position === 'WR') {
    if (points > 15) return Math.min(95, 80 + points)
    if (points > 10) return 65 + points * 2
    if (points > 5) return 45 + points * 2
    return Math.max(15, points * 3)
  }
  
  // RB: Committee vs feature back
  if (position === 'RB') {
    if (points > 18) return Math.min(90, 75 + points)
    if (points > 12) return 60 + points * 2
    if (points > 6) return 40 + points * 2
    return Math.max(15, points * 3)
  }
  
  // K/DST: Always 100%
  if (position === 'K' || position === 'DST' || position === 'DEF') {
    return 100
  }
  
  // Default
  return Math.min(95, Math.max(15, points * 4))
}

/**
 * Calculate red zone targets/touches
 */
export function calculateRedZoneTargets(player: Player): number {
  const points = player.fantasyPoints || 0
  const position = player.position
  
  // Red zone usage indicates scoring potential
  
  // Pass catchers
  if (position === 'WR' || position === 'TE') {
    if (points > 18) return Math.floor(points / 3)
    if (points > 12) return Math.floor(points / 4)
    if (points > 6) return Math.floor(points / 5)
    return Math.max(0, Math.floor(points / 6))
  }
  
  // Running backs
  if (position === 'RB') {
    if (points > 18) return Math.floor(points / 2.5)
    if (points > 12) return Math.floor(points / 3.5)
    if (points > 6) return Math.floor(points / 4.5)
    return Math.max(0, Math.floor(points / 5.5))
  }
  
  // QB
  if (position === 'QB') {
    return Math.max(3, Math.floor(points / 2))
  }
  
  return 0
}

/**
 * Calculate routes run (for pass catchers)
 */
export function calculateRoutesRun(player: Player): number | undefined {
  if (player.position !== 'WR' && player.position !== 'TE') {
    return undefined
  }
  
  const snapCount = calculateSnapCount(player)
  
  // Pass catchers run routes on ~85-95% of pass plays
  // Assume ~35 pass plays per game, ~60% snap share = ~20 routes
  // Scale based on snap count
  
  return Math.floor((snapCount / 100) * 35)
}

/**
 * Calculate yards per route run (for pass catchers)
 */
export function calculateYardsPerRoute(player: Player): number | undefined {
  if (player.position !== 'WR' && player.position !== 'TE') {
    return undefined
  }
  
  const points = player.fantasyPoints || 0
  
  // YPRR is a strong efficiency metric
  // Elite: 2.5+
  // Good: 2.0-2.5
  // Average: 1.5-2.0
  // Below average: <1.5
  
  if (points > 18) return 2.5 + (points - 18) / 10
  if (points > 15) return 2.0 + (points - 15) / 10
  if (points > 10) return 1.5 + (points - 10) / 10
  
  return Math.max(0.8, points / 8)
}

/**
 * Enhance player with all advanced stats
 */
export function enhancePlayerWithAdvancedStats(player: Player) {
  return {
    ...player,
    targetShare: calculateTargetShare(player),
    snapCount: Math.round(calculateSnapCount(player)),
    redZoneTargets: calculateRedZoneTargets(player),
    routesRun: calculateRoutesRun(player),
    yardsPerRoute: calculateYardsPerRoute(player)
  }
}


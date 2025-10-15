/**
 * Advanced Player Stats Tests
 * Comprehensive test coverage for advanced stats calculator
 */

import {
  calculateTargetShare,
  calculateSnapCount,
  calculateRedZoneTargets,
  calculateRoutesRun,
  calculateYardsPerRoute,
  enhancePlayerWithAdvancedStats
} from '@/lib/utils/advanced-player-stats'

describe('Advanced Player Stats', () => {
  const mockPlayer = {
    id: 'player-1',
    name: 'Test Player',
    position: 'WR',
    fantasyPoints: 15,
    projectedPoints: 14
  }

  describe('calculateTargetShare', () => {
    it('should return target share for WR', () => {
      const wr = { ...mockPlayer, position: 'WR', fantasyPoints: 15 }
      const targetShare = calculateTargetShare(wr)
      
      expect(targetShare).toBeDefined()
      expect(targetShare).toBeGreaterThan(0)
    })

    it('should return target share for TE', () => {
      const te = { ...mockPlayer, position: 'TE', fantasyPoints: 12 }
      const targetShare = calculateTargetShare(te)
      
      expect(targetShare).toBeDefined()
      expect(targetShare).toBeGreaterThan(0)
    })

    it('should return undefined for QB', () => {
      const qb = { ...mockPlayer, position: 'QB' }
      expect(calculateTargetShare(qb)).toBeUndefined()
    })

    it('should return undefined for RB', () => {
      const rb = { ...mockPlayer, position: 'RB' }
      expect(calculateTargetShare(rb)).toBeUndefined()
    })

    it('should return undefined for K', () => {
      const k = { ...mockPlayer, position: 'K' }
      expect(calculateTargetShare(k)).toBeUndefined()
    })

    it('should return higher target share for elite receivers', () => {
      const elite = { ...mockPlayer, position: 'WR', fantasyPoints: 20 }
      const average = { ...mockPlayer, position: 'WR', fantasyPoints: 12 }
      
      const eliteShare = calculateTargetShare(elite)
      const averageShare = calculateTargetShare(average)
      
      expect(eliteShare).toBeGreaterThan(averageShare!)
    })

    it('should return minimum 8% for depth receivers', () => {
      const depth = { ...mockPlayer, position: 'WR', fantasyPoints: 5 }
      const targetShare = calculateTargetShare(depth)
      
      expect(targetShare).toBeGreaterThanOrEqual(8)
    })

    it('should handle zero fantasy points', () => {
      const zero = { ...mockPlayer, position: 'WR', fantasyPoints: 0 }
      const targetShare = calculateTargetShare(zero)
      
      expect(targetShare).toBeGreaterThanOrEqual(0)
    })
  })

  describe('calculateSnapCount', () => {
    it('should return snap count for all positions', () => {
      ['QB', 'RB', 'WR', 'TE', 'K', 'DST', 'DEF'].forEach(position => {
        const player = { ...mockPlayer, position }
        const snapCount = calculateSnapCount(player)
        
        expect(snapCount).toBeGreaterThanOrEqual(0)
        expect(snapCount).toBeLessThanOrEqual(100)
      })
    })

    it('should return 100% for K', () => {
      const k = { ...mockPlayer, position: 'K', fantasyPoints: 10 }
      expect(calculateSnapCount(k)).toBe(100)
    })

    it('should return 100% for DST', () => {
      const dst = { ...mockPlayer, position: 'DST', fantasyPoints: 12 }
      expect(calculateSnapCount(dst)).toBe(100)
    })

    it('should return higher snap count for elite QB', () => {
      const eliteQB = { ...mockPlayer, position: 'QB', fantasyPoints: 20 }
      const averageQB = { ...mockPlayer, position: 'QB', fantasyPoints: 12 }
      
      expect(calculateSnapCount(eliteQB)).toBeGreaterThan(calculateSnapCount(averageQB))
    })

    it('should return higher snap count for feature RB', () => {
      const featureRB = { ...mockPlayer, position: 'RB', fantasyPoints: 20 }
      const committeeRB = { ...mockPlayer, position: 'RB', fantasyPoints: 8 }
      
      expect(calculateSnapCount(featureRB)).toBeGreaterThan(calculateSnapCount(committeeRB))
    })

    it('should cap snap count at 95% for skill positions', () => {
      const superstar = { ...mockPlayer, position: 'WR', fantasyPoints: 30 }
      expect(calculateSnapCount(superstar)).toBeLessThanOrEqual(95)
    })

    it('should have minimum snap count of 15%', () => {
      const backup = { ...mockPlayer, position: 'RB', fantasyPoints: 2 }
      expect(calculateSnapCount(backup)).toBeGreaterThanOrEqual(15)
    })

    it('should handle zero fantasy points', () => {
      const zero = { ...mockPlayer, position: 'WR', fantasyPoints: 0 }
      const snapCount = calculateSnapCount(zero)
      
      expect(snapCount).toBeGreaterThanOrEqual(0)
      expect(snapCount).toBeLessThanOrEqual(100)
    })
  })

  describe('calculateRedZoneTargets', () => {
    it('should return red zone targets for WR', () => {
      const wr = { ...mockPlayer, position: 'WR', fantasyPoints: 15 }
      const targets = calculateRedZoneTargets(wr)
      
      expect(targets).toBeGreaterThanOrEqual(0)
    })

    it('should return red zone targets for TE', () => {
      const te = { ...mockPlayer, position: 'TE', fantasyPoints: 12 }
      const targets = calculateRedZoneTargets(te)
      
      expect(targets).toBeGreaterThanOrEqual(0)
    })

    it('should return red zone targets for RB', () => {
      const rb = { ...mockPlayer, position: 'RB', fantasyPoints: 15 }
      const targets = calculateRedZoneTargets(rb)
      
      expect(targets).toBeGreaterThanOrEqual(0)
    })

    it('should return red zone targets for QB', () => {
      const qb = { ...mockPlayer, position: 'QB', fantasyPoints: 20 }
      const targets = calculateRedZoneTargets(qb)
      
      expect(targets).toBeGreaterThanOrEqual(3)
    })

    it('should return 0 for K', () => {
      const k = { ...mockPlayer, position: 'K', fantasyPoints: 10 }
      expect(calculateRedZoneTargets(k)).toBe(0)
    })

    it('should return 0 for DST', () => {
      const dst = { ...mockPlayer, position: 'DST', fantasyPoints: 12 }
      expect(calculateRedZoneTargets(dst)).toBe(0)
    })

    it('should return higher targets for elite scorers', () => {
      const elite = { ...mockPlayer, position: 'WR', fantasyPoints: 20 }
      const average = { ...mockPlayer, position: 'WR', fantasyPoints: 10 }
      
      expect(calculateRedZoneTargets(elite)).toBeGreaterThan(calculateRedZoneTargets(average))
    })

    it('should handle zero fantasy points', () => {
      const zero = { ...mockPlayer, position: 'RB', fantasyPoints: 0 }
      expect(calculateRedZoneTargets(zero)).toBe(0)
    })
  })

  describe('calculateRoutesRun', () => {
    it('should return routes run for WR', () => {
      const wr = { ...mockPlayer, position: 'WR', fantasyPoints: 15 }
      const routes = calculateRoutesRun(wr)
      
      expect(routes).toBeDefined()
      expect(routes).toBeGreaterThan(0)
    })

    it('should return routes run for TE', () => {
      const te = { ...mockPlayer, position: 'TE', fantasyPoints: 12 }
      const routes = calculateRoutesRun(te)
      
      expect(routes).toBeDefined()
      expect(routes).toBeGreaterThan(0)
    })

    it('should return undefined for QB', () => {
      const qb = { ...mockPlayer, position: 'QB' }
      expect(calculateRoutesRun(qb)).toBeUndefined()
    })

    it('should return undefined for RB', () => {
      const rb = { ...mockPlayer, position: 'RB' }
      expect(calculateRoutesRun(rb)).toBeUndefined()
    })

    it('should return undefined for K', () => {
      const k = { ...mockPlayer, position: 'K' }
      expect(calculateRoutesRun(k)).toBeUndefined()
    })

    it('should return higher routes for starters', () => {
      const starter = { ...mockPlayer, position: 'WR', fantasyPoints: 18 }
      const backup = { ...mockPlayer, position: 'WR', fantasyPoints: 5 }
      
      expect(calculateRoutesRun(starter)).toBeGreaterThan(calculateRoutesRun(backup)!)
    })

    it('should scale with snap count', () => {
      const highSnaps = { ...mockPlayer, position: 'WR', fantasyPoints: 20 }
      const lowSnaps = { ...mockPlayer, position: 'WR', fantasyPoints: 8 }
      
      expect(calculateRoutesRun(highSnaps)).toBeGreaterThan(calculateRoutesRun(lowSnaps)!)
    })
  })

  describe('calculateYardsPerRoute', () => {
    it('should return yards per route for WR', () => {
      const wr = { ...mockPlayer, position: 'WR', fantasyPoints: 15 }
      const yprr = calculateYardsPerRoute(wr)
      
      expect(yprr).toBeDefined()
      expect(yprr).toBeGreaterThan(0)
    })

    it('should return yards per route for TE', () => {
      const te = { ...mockPlayer, position: 'TE', fantasyPoints: 12 }
      const yprr = calculateYardsPerRoute(te)
      
      expect(yprr).toBeDefined()
      expect(yprr).toBeGreaterThan(0)
    })

    it('should return undefined for QB', () => {
      const qb = { ...mockPlayer, position: 'QB' }
      expect(calculateYardsPerRoute(qb)).toBeUndefined()
    })

    it('should return undefined for RB', () => {
      const rb = { ...mockPlayer, position: 'RB' }
      expect(calculateYardsPerRoute(rb)).toBeUndefined()
    })

    it('should return higher YPRR for elite receivers', () => {
      const elite = { ...mockPlayer, position: 'WR', fantasyPoints: 20 }
      const average = { ...mockPlayer, position: 'WR', fantasyPoints: 12 }
      
      expect(calculateYardsPerRoute(elite)).toBeGreaterThan(calculateYardsPerRoute(average)!)
    })

    it('should return at least 0.8 YPRR', () => {
      const low = { ...mockPlayer, position: 'WR', fantasyPoints: 2 }
      const yprr = calculateYardsPerRoute(low)
      
      expect(yprr).toBeGreaterThanOrEqual(0.8)
    })

    it('should handle zero fantasy points', () => {
      const zero = { ...mockPlayer, position: 'WR', fantasyPoints: 0 }
      const yprr = calculateYardsPerRoute(zero)
      
      expect(yprr).toBeGreaterThanOrEqual(0.8)
    })
  })

  describe('enhancePlayerWithAdvancedStats', () => {
    it('should return player with all advanced stats', () => {
      const enhanced = enhancePlayerWithAdvancedStats(mockPlayer)
      
      expect(enhanced).toHaveProperty('id', mockPlayer.id)
      expect(enhanced).toHaveProperty('name', mockPlayer.name)
      expect(enhanced).toHaveProperty('targetShare')
      expect(enhanced).toHaveProperty('snapCount')
      expect(enhanced).toHaveProperty('redZoneTargets')
      expect(enhanced).toHaveProperty('routesRun')
      expect(enhanced).toHaveProperty('yardsPerRoute')
    })

    it('should preserve original player properties', () => {
      const enhanced = enhancePlayerWithAdvancedStats(mockPlayer)
      
      expect(enhanced.id).toBe(mockPlayer.id)
      expect(enhanced.name).toBe(mockPlayer.name)
      expect(enhanced.position).toBe(mockPlayer.position)
      expect(enhanced.fantasyPoints).toBe(mockPlayer.fantasyPoints)
      expect(enhanced.projectedPoints).toBe(mockPlayer.projectedPoints)
    })

    it('should round snap count to nearest integer', () => {
      const enhanced = enhancePlayerWithAdvancedStats(mockPlayer)
      expect(enhanced.snapCount % 1).toBe(0)
    })

    it('should handle WR stats correctly', () => {
      const wr = { ...mockPlayer, position: 'WR', fantasyPoints: 18 }
      const enhanced = enhancePlayerWithAdvancedStats(wr)
      
      expect(enhanced.targetShare).toBeDefined()
      expect(enhanced.snapCount).toBeGreaterThan(0)
      expect(enhanced.redZoneTargets).toBeGreaterThan(0)
      expect(enhanced.routesRun).toBeDefined()
      expect(enhanced.yardsPerRoute).toBeDefined()
    })

    it('should handle TE stats correctly', () => {
      const te = { ...mockPlayer, position: 'TE', fantasyPoints: 15 }
      const enhanced = enhancePlayerWithAdvancedStats(te)
      
      expect(enhanced.targetShare).toBeDefined()
      expect(enhanced.snapCount).toBeGreaterThan(0)
      expect(enhanced.redZoneTargets).toBeGreaterThan(0)
      expect(enhanced.routesRun).toBeDefined()
      expect(enhanced.yardsPerRoute).toBeDefined()
    })

    it('should handle RB stats correctly', () => {
      const rb = { ...mockPlayer, position: 'RB', fantasyPoints: 18 }
      const enhanced = enhancePlayerWithAdvancedStats(rb)
      
      expect(enhanced.targetShare).toBeUndefined()
      expect(enhanced.snapCount).toBeGreaterThan(0)
      expect(enhanced.redZoneTargets).toBeGreaterThan(0)
      expect(enhanced.routesRun).toBeUndefined()
      expect(enhanced.yardsPerRoute).toBeUndefined()
    })

    it('should handle QB stats correctly', () => {
      const qb = { ...mockPlayer, position: 'QB', fantasyPoints: 20 }
      const enhanced = enhancePlayerWithAdvancedStats(qb)
      
      expect(enhanced.targetShare).toBeUndefined()
      expect(enhanced.snapCount).toBeGreaterThan(0)
      expect(enhanced.redZoneTargets).toBeGreaterThanOrEqual(3)
      expect(enhanced.routesRun).toBeUndefined()
      expect(enhanced.yardsPerRoute).toBeUndefined()
    })

    it('should handle K stats correctly', () => {
      const k = { ...mockPlayer, position: 'K', fantasyPoints: 10 }
      const enhanced = enhancePlayerWithAdvancedStats(k)
      
      expect(enhanced.targetShare).toBeUndefined()
      expect(enhanced.snapCount).toBe(100)
      expect(enhanced.redZoneTargets).toBe(0)
      expect(enhanced.routesRun).toBeUndefined()
      expect(enhanced.yardsPerRoute).toBeUndefined()
    })

    it('should handle players with zero points', () => {
      const zero = { ...mockPlayer, fantasyPoints: 0, projectedPoints: 0 }
      const enhanced = enhancePlayerWithAdvancedStats(zero)
      
      expect(enhanced).toBeDefined()
      expect(enhanced.snapCount).toBeGreaterThanOrEqual(0)
    })

    it('should handle missing data gracefully', () => {
      const minimal = {
        id: 'p1',
        name: 'Minimal',
        position: 'WR',
        fantasyPoints: 0,
        projectedPoints: 0
      }
      
      const enhanced = enhancePlayerWithAdvancedStats(minimal)
      expect(enhanced).toBeDefined()
      expect(Object.keys(enhanced).length).toBeGreaterThan(5)
    })
  })
})


/**
 * Player Analytics Utilities Tests
 * Comprehensive test coverage for player analytics functions
 */

import {
  calculateTrending,
  calculateOwnership,
  calculateAIScore,
  calculateBreakoutProbability,
  calculateOpportunity,
  calculateScheduleDifficulty,
  getUpcomingOpponents,
  enhancePlayerWithAnalytics
} from '@/lib/utils/player-analytics'

describe('Player Analytics Utilities', () => {
  const mockPlayer = {
    id: 'player-1',
    name: 'Test Player',
    position: 'RB',
    fantasyPoints: 20,
    projectedPoints: 18,
    team: 'KC'
  }

  describe('calculateTrending', () => {
    it('should return "hot" for players significantly outperforming projections', () => {
      const hotPlayer = { ...mockPlayer, fantasyPoints: 25, projectedPoints: 15 }
      expect(calculateTrending(hotPlayer)).toBe('hot')
    })

    it('should return "up" for players moderately outperforming projections', () => {
      const upPlayer = { ...mockPlayer, fantasyPoints: 20, projectedPoints: 16 }
      expect(calculateTrending(upPlayer)).toBe('up')
    })

    it('should return "down" for players underperforming projections', () => {
      const downPlayer = { ...mockPlayer, fantasyPoints: 10, projectedPoints: 15 }
      expect(calculateTrending(downPlayer)).toBe('down')
    })

    it('should return undefined for players performing as expected', () => {
      const steadyPlayer = { ...mockPlayer, fantasyPoints: 15, projectedPoints: 15 }
      expect(calculateTrending(steadyPlayer)).toBeUndefined()
    })

    it('should handle players with zero points', () => {
      const zeroPlayer = { ...mockPlayer, fantasyPoints: 0, projectedPoints: 10 }
      expect(calculateTrending(zeroPlayer)).toBe('down')
    })

    it('should handle players with zero projections', () => {
      const noProjection = { ...mockPlayer, fantasyPoints: 10, projectedPoints: 0 }
      expect(calculateTrending(noProjection)).toBeUndefined()
    })
  })

  describe('calculateOwnership', () => {
    it('should return ownership percentage for RB', () => {
      const rb = { ...mockPlayer, position: 'RB', fantasyPoints: 20 }
      const ownership = calculateOwnership(rb)
      expect(ownership).toBeGreaterThanOrEqual(0)
      expect(ownership).toBeLessThanOrEqual(95)
    })

    it('should return ownership percentage for QB', () => {
      const qb = { ...mockPlayer, position: 'QB', fantasyPoints: 20 }
      const ownership = calculateOwnership(qb)
      expect(ownership).toBeGreaterThanOrEqual(0)
      expect(ownership).toBeLessThanOrEqual(95)
    })

    it('should return ownership percentage for WR', () => {
      const wr = { ...mockPlayer, position: 'WR', fantasyPoints: 20 }
      const ownership = calculateOwnership(wr)
      expect(ownership).toBeGreaterThanOrEqual(0)
      expect(ownership).toBeLessThanOrEqual(95)
    })

    it('should return ownership percentage for TE', () => {
      const te = { ...mockPlayer, position: 'TE', fantasyPoints: 20 }
      const ownership = calculateOwnership(te)
      expect(ownership).toBeGreaterThanOrEqual(0)
      expect(ownership).toBeLessThanOrEqual(95)
    })

    it('should return lower ownership for K', () => {
      const k = { ...mockPlayer, position: 'K', fantasyPoints: 10 }
      const ownership = calculateOwnership(k)
      expect(ownership).toBeLessThanOrEqual(30)
    })

    it('should return ownership as multiple of 5', () => {
      const player = { ...mockPlayer, fantasyPoints: 17 }
      const ownership = calculateOwnership(player)
      expect(ownership % 5).toBe(0)
    })

    it('should handle zero fantasy points', () => {
      const zeroPlayer = { ...mockPlayer, fantasyPoints: 0 }
      expect(calculateOwnership(zeroPlayer)).toBe(0)
    })

    it('should cap ownership at 95', () => {
      const superstar = { ...mockPlayer, fantasyPoints: 100 }
      expect(calculateOwnership(superstar)).toBeLessThanOrEqual(95)
    })
  })

  describe('calculateAIScore', () => {
    it('should return AI score between 0 and 100', () => {
      const score = calculateAIScore(mockPlayer)
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(100)
    })

    it('should return higher score for better performers', () => {
      const goodPlayer = { ...mockPlayer, fantasyPoints: 25, projectedPoints: 22 }
      const averagePlayer = { ...mockPlayer, fantasyPoints: 15, projectedPoints: 14 }
      
      expect(calculateAIScore(goodPlayer)).toBeGreaterThan(calculateAIScore(averagePlayer))
    })

    it('should consider consistency', () => {
      const consistentPlayer = { ...mockPlayer, fantasyPoints: 18, projectedPoints: 18 }
      const inconsistentPlayer = { ...mockPlayer, fantasyPoints: 18, projectedPoints: 10 }
      
      expect(calculateAIScore(consistentPlayer)).toBeLessThanOrEqual(calculateAIScore(inconsistentPlayer))
    })

    it('should handle zero points', () => {
      const zeroPlayer = { ...mockPlayer, fantasyPoints: 0, projectedPoints: 10 }
      const score = calculateAIScore(zeroPlayer)
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThan(50)
    })

    it('should handle zero projections', () => {
      const noProjection = { ...mockPlayer, fantasyPoints: 15, projectedPoints: 0 }
      const score = calculateAIScore(noProjection)
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(100)
    })
  })

  describe('calculateBreakoutProbability', () => {
    it('should return probability between 0 and 100', () => {
      const probability = calculateBreakoutProbability(mockPlayer)
      expect(probability).toBeGreaterThanOrEqual(0)
      expect(probability).toBeLessThanOrEqual(100)
    })

    it('should return higher probability for players exceeding projections', () => {
      const breakoutPlayer = { ...mockPlayer, fantasyPoints: 25, projectedPoints: 18 }
      const normalPlayer = { ...mockPlayer, fantasyPoints: 18, projectedPoints: 18 }
      
      expect(calculateBreakoutProbability(breakoutPlayer)).toBeGreaterThan(
        calculateBreakoutProbability(normalPlayer)
      )
    })

    it('should return higher probability for high-projection players', () => {
      const highProjection = { ...mockPlayer, fantasyPoints: 20, projectedPoints: 20 }
      const lowProjection = { ...mockPlayer, fantasyPoints: 10, projectedPoints: 10 }
      
      expect(calculateBreakoutProbability(highProjection)).toBeGreaterThan(
        calculateBreakoutProbability(lowProjection)
      )
    })

    it('should handle zero values', () => {
      const zeroPlayer = { ...mockPlayer, fantasyPoints: 0, projectedPoints: 0 }
      expect(calculateBreakoutProbability(zeroPlayer)).toBe(0)
    })
  })

  describe('calculateOpportunity', () => {
    it('should return opportunity score and reasons for high-upside players', () => {
      const goodPlayer = { ...mockPlayer, fantasyPoints: 20, projectedPoints: 16 }
      const opportunity = calculateOpportunity(goodPlayer)
      
      expect(opportunity).toBeDefined()
      expect(opportunity?.score).toBeGreaterThanOrEqual(0)
      expect(opportunity?.score).toBeLessThanOrEqual(100)
      expect(Array.isArray(opportunity?.reasons)).toBe(true)
    })

    it('should return undefined for low-upside players', () => {
      const lowPlayer = { ...mockPlayer, fantasyPoints: 5, projectedPoints: 5 }
      expect(calculateOpportunity(lowPlayer)).toBeUndefined()
    })

    it('should include "High projected points" reason', () => {
      const highProjection = { ...mockPlayer, fantasyPoints: 18, projectedPoints: 18 }
      const opportunity = calculateOpportunity(highProjection)
      
      expect(opportunity?.reasons).toContain('High projected points')
    })

    it('should include "Exceeding projections" reason', () => {
      const exceeding = { ...mockPlayer, fantasyPoints: 25, projectedPoints: 18 }
      const opportunity = calculateOpportunity(exceeding)
      
      expect(opportunity?.reasons).toContain('Exceeding projections')
    })

    it('should include "Position scarcity" for RB', () => {
      const rb = { ...mockPlayer, position: 'RB', fantasyPoints: 15, projectedPoints: 12 }
      const opportunity = calculateOpportunity(rb)
      
      expect(opportunity?.reasons).toContain('Position scarcity')
    })

    it('should include "Position scarcity" for TE', () => {
      const te = { ...mockPlayer, position: 'TE', fantasyPoints: 15, projectedPoints: 12 }
      const opportunity = calculateOpportunity(te)
      
      expect(opportunity?.reasons).toContain('Position scarcity')
    })

    it('should include "Strong recent performance" reason', () => {
      const strongPerformer = { ...mockPlayer, fantasyPoints: 20, projectedPoints: 15 }
      const opportunity = calculateOpportunity(strongPerformer)
      
      expect(opportunity?.reasons).toContain('Strong recent performance')
    })

    it('should cap opportunity score at 100', () => {
      const superstar = { ...mockPlayer, fantasyPoints: 30, projectedPoints: 25, position: 'RB' }
      const opportunity = calculateOpportunity(superstar)
      
      expect(opportunity?.score).toBeLessThanOrEqual(100)
    })
  })

  describe('calculateScheduleDifficulty', () => {
    it('should return "easy" for easy schedule teams', () => {
      expect(calculateScheduleDifficulty('MIA')).toBe('easy')
      expect(calculateScheduleDifficulty('CAR')).toBe('easy')
      expect(calculateScheduleDifficulty('NYG')).toBe('easy')
    })

    it('should return "hard" for hard schedule teams', () => {
      expect(calculateScheduleDifficulty('SF')).toBe('hard')
      expect(calculateScheduleDifficulty('KC')).toBe('hard')
      expect(calculateScheduleDifficulty('BUF')).toBe('hard')
    })

    it('should return "medium" for mid-tier teams', () => {
      expect(calculateScheduleDifficulty('NE')).toBe('medium')
      expect(calculateScheduleDifficulty('DEN')).toBe('medium')
    })

    it('should return "medium" for undefined team', () => {
      expect(calculateScheduleDifficulty(undefined)).toBe('medium')
    })

    it('should return "medium" for empty string', () => {
      expect(calculateScheduleDifficulty('')).toBe('medium')
    })
  })

  describe('getUpcomingOpponents', () => {
    it('should return array of opponents', () => {
      const opponents = getUpcomingOpponents('KC')
      expect(Array.isArray(opponents)).toBe(true)
      expect(opponents.length).toBe(3)
    })

    it('should handle undefined team', () => {
      const opponents = getUpcomingOpponents(undefined)
      expect(Array.isArray(opponents)).toBe(true)
    })
  })

  describe('enhancePlayerWithAnalytics', () => {
    it('should return player with all analytics', () => {
      const enhanced = enhancePlayerWithAnalytics(mockPlayer)
      
      expect(enhanced).toHaveProperty('id', mockPlayer.id)
      expect(enhanced).toHaveProperty('name', mockPlayer.name)
      expect(enhanced).toHaveProperty('trending')
      expect(enhanced).toHaveProperty('ownership')
      expect(enhanced).toHaveProperty('aiScore')
      expect(enhanced).toHaveProperty('breakoutProbability')
      expect(enhanced).toHaveProperty('upcomingSchedule')
    })

    it('should include upcoming schedule with difficulty', () => {
      const enhanced = enhancePlayerWithAnalytics(mockPlayer)
      
      expect(enhanced.upcomingSchedule).toHaveProperty('difficulty')
      expect(enhanced.upcomingSchedule).toHaveProperty('opponents')
    })

    it('should preserve original player properties', () => {
      const enhanced = enhancePlayerWithAnalytics(mockPlayer)
      
      expect(enhanced.id).toBe(mockPlayer.id)
      expect(enhanced.name).toBe(mockPlayer.name)
      expect(enhanced.position).toBe(mockPlayer.position)
      expect(enhanced.fantasyPoints).toBe(mockPlayer.fantasyPoints)
      expect(enhanced.projectedPoints).toBe(mockPlayer.projectedPoints)
    })

    it('should handle players with minimal data', () => {
      const minimalPlayer = {
        id: 'p1',
        name: 'Min Player',
        position: 'WR',
        fantasyPoints: 0,
        projectedPoints: 0
      }
      
      const enhanced = enhancePlayerWithAnalytics(minimalPlayer)
      expect(enhanced).toBeDefined()
      expect(enhanced.aiScore).toBeGreaterThanOrEqual(0)
    })

    it('should use nflTeam if team is not provided', () => {
      const playerWithNflTeam = {
        ...mockPlayer,
        team: undefined,
        nflTeam: 'SF'
      }
      
      const enhanced = enhancePlayerWithAnalytics(playerWithNflTeam)
      expect(enhanced.upcomingSchedule.difficulty).toBe('hard')
    })
  })
})


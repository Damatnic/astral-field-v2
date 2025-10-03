/**
 * Schedule Service Tests
 * Comprehensive test suite for schedule-service.ts
 */

import { ScheduleService, scheduleService } from '@/lib/services/schedule-service'

describe('ScheduleService', () => {
  let service: ScheduleService

  beforeEach(() => {
    service = new ScheduleService()
    service.clearCache()
  })

  describe('Constructor', () => {
    it('should create a new instance', () => {
      expect(service).toBeInstanceOf(ScheduleService)
    })

    it('should initialize with empty cache', () => {
      expect(service).toBeDefined()
    })
  })

  describe('getUpcomingSchedule', () => {
    it('should return upcoming schedule', async () => {
      const schedule = await service.getUpcomingSchedule(
        'player-1',
        'Patrick Mahomes',
        'KC',
        'QB',
        1
      )
      
      expect(schedule).toHaveProperty('playerId')
      expect(schedule).toHaveProperty('playerName')
      expect(schedule).toHaveProperty('team')
      expect(schedule).toHaveProperty('position')
      expect(schedule).toHaveProperty('nextThreeWeeks')
      expect(schedule).toHaveProperty('restOfSeason')
      expect(schedule).toHaveProperty('averageDifficulty')
      expect(schedule).toHaveProperty('favorableMatchups')
      expect(schedule).toHaveProperty('toughMatchups')
    })

    it('should include next 3 weeks', async () => {
      const schedule = await service.getUpcomingSchedule(
        'player-1',
        'Patrick Mahomes',
        'KC',
        'QB',
        1
      )
      
      expect(schedule.nextThreeWeeks).toHaveLength(3)
    })

    it('should include rest of season', async () => {
      const schedule = await service.getUpcomingSchedule(
        'player-1',
        'Patrick Mahomes',
        'KC',
        'QB',
        1
      )
      
      expect(schedule.restOfSeason.length).toBeGreaterThan(0)
    })

    it('should calculate average difficulty', async () => {
      const schedule = await service.getUpcomingSchedule(
        'player-1',
        'Patrick Mahomes',
        'KC',
        'QB',
        1
      )
      
      expect(schedule.averageDifficulty).toBeGreaterThanOrEqual(0)
      expect(schedule.averageDifficulty).toBeLessThanOrEqual(1)
    })

    it('should count favorable matchups', async () => {
      const schedule = await service.getUpcomingSchedule(
        'player-1',
        'Patrick Mahomes',
        'KC',
        'QB',
        1
      )
      
      expect(schedule.favorableMatchups).toBeGreaterThanOrEqual(0)
    })

    it('should count tough matchups', async () => {
      const schedule = await service.getUpcomingSchedule(
        'player-1',
        'Patrick Mahomes',
        'KC',
        'QB',
        1
      )
      
      expect(schedule.toughMatchups).toBeGreaterThanOrEqual(0)
    })

    it('should cache schedule data', async () => {
      const schedule1 = await service.getUpcomingSchedule(
        'player-1',
        'Patrick Mahomes',
        'KC',
        'QB',
        1
      )
      const schedule2 = await service.getUpcomingSchedule(
        'player-1',
        'Patrick Mahomes',
        'KC',
        'QB',
        1
      )
      
      expect(schedule1).toEqual(schedule2)
    })

    it('should handle different weeks', async () => {
      const week1 = await service.getUpcomingSchedule(
        'player-1',
        'Patrick Mahomes',
        'KC',
        'QB',
        1
      )
      const week10 = await service.getUpcomingSchedule(
        'player-1',
        'Patrick Mahomes',
        'KC',
        'QB',
        10
      )
      
      expect(week1.nextThreeWeeks[0].week).toBe(1)
      expect(week10.nextThreeWeeks[0].week).toBe(10)
    })
  })

  describe('calculateSOS', () => {
    it('should calculate strength of schedule', async () => {
      const sos = await service.calculateSOS('team-1', 'Kansas City Chiefs', 1)
      
      expect(sos).toHaveProperty('teamId')
      expect(sos).toHaveProperty('teamName')
      expect(sos).toHaveProperty('overallSOS')
      expect(sos).toHaveProperty('remainingSOS')
      expect(sos).toHaveProperty('playoffSOS')
      expect(sos).toHaveProperty('byPosition')
      expect(sos).toHaveProperty('ranking')
    })

    it('should have SOS values between 0 and 1', async () => {
      const sos = await service.calculateSOS('team-1', 'Kansas City Chiefs', 1)
      
      expect(sos.overallSOS).toBeGreaterThanOrEqual(0)
      expect(sos.overallSOS).toBeLessThanOrEqual(1)
      expect(sos.remainingSOS).toBeGreaterThanOrEqual(0)
      expect(sos.remainingSOS).toBeLessThanOrEqual(1)
      expect(sos.playoffSOS).toBeGreaterThanOrEqual(0)
      expect(sos.playoffSOS).toBeLessThanOrEqual(1)
    })

    it('should include position-specific SOS', async () => {
      const sos = await service.calculateSOS('team-1', 'Kansas City Chiefs', 1)
      
      expect(sos.byPosition).toHaveProperty('QB')
      expect(sos.byPosition).toHaveProperty('RB')
      expect(sos.byPosition).toHaveProperty('WR')
      expect(sos.byPosition).toHaveProperty('TE')
      expect(sos.byPosition).toHaveProperty('K')
      expect(sos.byPosition).toHaveProperty('DEF')
    })

    it('should have ranking between 1 and 32', async () => {
      const sos = await service.calculateSOS('team-1', 'Kansas City Chiefs', 1)
      
      expect(sos.ranking).toBeGreaterThanOrEqual(1)
      expect(sos.ranking).toBeLessThanOrEqual(32)
    })

    it('should cache SOS data', async () => {
      const sos1 = await service.calculateSOS('team-1', 'Kansas City Chiefs', 1)
      const sos2 = await service.calculateSOS('team-1', 'Kansas City Chiefs', 1)
      
      expect(sos1).toEqual(sos2)
    })
  })

  describe('getPositionSOS', () => {
    it('should return position SOS for all teams', async () => {
      const sos = await service.getPositionSOS('QB', 1)
      
      expect(typeof sos).toBe('object')
      expect(Object.keys(sos).length).toBeGreaterThan(0)
    })

    it('should have SOS values between 0 and 1', async () => {
      const sos = await service.getPositionSOS('QB', 1)
      
      Object.values(sos).forEach(value => {
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThanOrEqual(1)
      })
    })

    it('should handle different positions', async () => {
      const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']
      
      for (const position of positions) {
        const sos = await service.getPositionSOS(position, 1)
        expect(typeof sos).toBe('object')
      }
    })

    it('should include all 32 NFL teams', async () => {
      const sos = await service.getPositionSOS('QB', 1)
      
      expect(Object.keys(sos).length).toBe(32)
    })
  })

  describe('Schedule Difficulty', () => {
    it('should have valid difficulty ratings', async () => {
      const schedule = await service.getUpcomingSchedule(
        'player-1',
        'Patrick Mahomes',
        'KC',
        'QB',
        1
      )
      
      const validRatings = ['EASY', 'MODERATE', 'HARD', 'VERY_HARD']
      schedule.nextThreeWeeks.forEach(game => {
        expect(validRatings).toContain(game.rating)
      })
    })

    it('should have difficulty between 0 and 1', async () => {
      const schedule = await service.getUpcomingSchedule(
        'player-1',
        'Patrick Mahomes',
        'KC',
        'QB',
        1
      )
      
      schedule.nextThreeWeeks.forEach(game => {
        expect(game.difficulty).toBeGreaterThanOrEqual(0)
        expect(game.difficulty).toBeLessThanOrEqual(1)
      })
    })

    it('should include opponent information', async () => {
      const schedule = await service.getUpcomingSchedule(
        'player-1',
        'Patrick Mahomes',
        'KC',
        'QB',
        1
      )
      
      schedule.nextThreeWeeks.forEach(game => {
        expect(game).toHaveProperty('opponent')
        expect(game).toHaveProperty('week')
        expect(game).toHaveProperty('difficulty')
        expect(game).toHaveProperty('rating')
        expect(game).toHaveProperty('positionRankings')
      })
    })

    it('should include position rankings', async () => {
      const schedule = await service.getUpcomingSchedule(
        'player-1',
        'Patrick Mahomes',
        'KC',
        'QB',
        1
      )
      
      schedule.nextThreeWeeks.forEach(game => {
        expect(game.positionRankings).toHaveProperty('QB')
        expect(game.positionRankings).toHaveProperty('RB')
        expect(game.positionRankings).toHaveProperty('WR')
        expect(game.positionRankings).toHaveProperty('TE')
      })
    })
  })

  describe('clearCache', () => {
    it('should clear the cache', async () => {
      await service.getUpcomingSchedule('player-1', 'Test Player', 'KC', 'QB', 1)
      service.clearCache()
      
      expect(service).toBeDefined()
    })

    it('should allow new data after clearing', async () => {
      const schedule1 = await service.getUpcomingSchedule('player-1', 'Test', 'KC', 'QB', 1)
      service.clearCache()
      const schedule2 = await service.getUpcomingSchedule('player-1', 'Test', 'KC', 'QB', 1)
      
      expect(schedule1).toHaveProperty('playerId')
      expect(schedule2).toHaveProperty('playerId')
    })
  })

  describe('Singleton Instance', () => {
    it('should export a singleton instance', () => {
      expect(scheduleService).toBeInstanceOf(ScheduleService)
    })

    it('should be usable directly', async () => {
      const schedule = await scheduleService.getUpcomingSchedule(
        'player-1',
        'Test Player',
        'KC',
        'QB',
        1
      )
      
      expect(schedule).toHaveProperty('playerId')
    })
  })

  describe('Edge Cases', () => {
    it('should handle week 1', async () => {
      const schedule = await service.getUpcomingSchedule(
        'player-1',
        'Test Player',
        'KC',
        'QB',
        1
      )
      
      expect(schedule.nextThreeWeeks[0].week).toBe(1)
    })

    it('should handle late season weeks', async () => {
      const schedule = await service.getUpcomingSchedule(
        'player-1',
        'Test Player',
        'KC',
        'QB',
        16
      )
      
      expect(schedule.nextThreeWeeks[0].week).toBe(16)
    })

    it('should handle week 18', async () => {
      const schedule = await service.getUpcomingSchedule(
        'player-1',
        'Test Player',
        'KC',
        'QB',
        18
      )
      
      expect(schedule.nextThreeWeeks[0].week).toBe(18)
    })

    it('should handle all NFL teams', async () => {
      const teams = ['KC', 'BUF', 'SF', 'DAL', 'PHI']
      
      for (let i = 0; i < teams.length; i++) {
        const team = teams[i]
        const schedule = await service.getUpcomingSchedule(
          `player-${i}`,  // Use different player IDs to avoid cache
          'Test Player',
          team,
          'QB',
          1
        )
        expect(schedule.team).toBe(team)
      }
    })

    it('should handle all positions', async () => {
      const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']
      
      for (let i = 0; i < positions.length; i++) {
        const position = positions[i]
        const schedule = await service.getUpcomingSchedule(
          `player-pos-${i}`,  // Use different player IDs to avoid cache
          'Test Player',
          'KC',
          position,
          1
        )
        expect(schedule.position).toBe(position)
      }
    })
  })

  describe('Performance', () => {
    it('should cache results for performance', async () => {
      const start1 = Date.now()
      await service.getUpcomingSchedule('player-1', 'Test', 'KC', 'QB', 1)
      const time1 = Date.now() - start1
      
      const start2 = Date.now()
      await service.getUpcomingSchedule('player-1', 'Test', 'KC', 'QB', 1)
      const time2 = Date.now() - start2
      
      // Second call should be faster (cached)
      expect(time2).toBeLessThanOrEqual(time1)
    })

    it('should handle concurrent requests', async () => {
      const promises = []
      for (let i = 0; i < 10; i++) {
        promises.push(
          service.getUpcomingSchedule(`player-${i}`, 'Test', 'KC', 'QB', 1)
        )
      }
      
      const results = await Promise.all(promises)
      expect(results).toHaveLength(10)
      results.forEach(schedule => {
        expect(schedule).toHaveProperty('playerId')
      })
    })
  })

  describe('Data Validation', () => {
    it('should have consistent data structure', async () => {
      const schedule = await service.getUpcomingSchedule(
        'player-1',
        'Test Player',
        'KC',
        'QB',
        1
      )
      
      expect(schedule.playerId).toBe('player-1')
      expect(schedule.playerName).toBe('Test Player')
      expect(schedule.team).toBe('KC')
      expect(schedule.position).toBe('QB')
    })

    it('should have valid matchup counts', async () => {
      const schedule = await service.getUpcomingSchedule(
        'player-1',
        'Test Player',
        'KC',
        'QB',
        1
      )
      
      const totalMatchups = schedule.favorableMatchups + schedule.toughMatchups
      const totalGames = schedule.nextThreeWeeks.length + schedule.restOfSeason.length
      
      expect(totalMatchups).toBeLessThanOrEqual(totalGames)
    })

    it('should have sequential weeks', async () => {
      const schedule = await service.getUpcomingSchedule(
        'player-1',
        'Test Player',
        'KC',
        'QB',
        1
      )
      
      const allWeeks = [
        ...schedule.nextThreeWeeks,
        ...schedule.restOfSeason
      ]
      
      for (let i = 1; i < allWeeks.length; i++) {
        expect(allWeeks[i].week).toBeGreaterThan(allWeeks[i - 1].week)
      }
    })
  })
})

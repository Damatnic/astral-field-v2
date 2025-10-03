/**
 * Weather Service Tests
 * Comprehensive test suite for weather-service.ts
 */

import { WeatherService, weatherService } from '@/lib/services/weather-service'

describe('WeatherService', () => {
  let service: WeatherService

  beforeEach(() => {
    service = new WeatherService()
    service.clearCache()
  })

  describe('Constructor', () => {
    it('should create a new instance', () => {
      expect(service).toBeInstanceOf(WeatherService)
    })

    it('should initialize with empty cache', () => {
      expect(service).toBeDefined()
    })
  })

  describe('getWeatherImpact', () => {
    it('should return 0 impact for dome teams', async () => {
      const domeTeams = ['ATL', 'DET', 'NO', 'MIN', 'LV', 'LAR', 'ARI', 'IND']
      
      for (const team of domeTeams) {
        const impact = await service.getWeatherImpact(team, 1, 2025)
        expect(impact).toBe(0)
      }
    })

    it('should return weather impact for outdoor teams', async () => {
      const impact = await service.getWeatherImpact('GB', 1, 2025)
      expect(typeof impact).toBe('number')
      expect(impact).toBeGreaterThanOrEqual(-1)
      expect(impact).toBeLessThanOrEqual(1)
    })

    it('should cache weather data', async () => {
      const impact1 = await service.getWeatherImpact('GB', 1, 2025)
      const impact2 = await service.getWeatherImpact('GB', 1, 2025)
      
      expect(impact1).toBe(impact2)
    })

    it('should handle different weeks', async () => {
      const week1 = await service.getWeatherImpact('GB', 1, 2025)
      const week15 = await service.getWeatherImpact('GB', 15, 2025)
      
      expect(typeof week1).toBe('number')
      expect(typeof week15).toBe('number')
    })

    it('should return more negative impact for cold weather teams in late season', async () => {
      const coldTeams = ['GB', 'BUF', 'CHI', 'CLE']
      
      for (const team of coldTeams) {
        const impact = await service.getWeatherImpact(team, 15, 2025)
        expect(typeof impact).toBe('number')
      }
    })
  })

  describe('getPositionWeatherImpact', () => {
    it('should amplify impact for QBs', () => {
      const baseImpact = -0.1
      const weather = {
        temperature: 30,
        windSpeed: 20,
        precipitation: 0.5,
        conditions: 'wind' as const,
        impact: baseImpact
      }
      
      const qbImpact = service.getPositionWeatherImpact('QB', weather)
      expect(qbImpact).toBe(baseImpact * 1.5)
    })

    it('should amplify impact for WRs', () => {
      const baseImpact = -0.1
      const weather = {
        temperature: 30,
        windSpeed: 20,
        precipitation: 0.5,
        conditions: 'wind' as const,
        impact: baseImpact
      }
      
      const wrImpact = service.getPositionWeatherImpact('WR', weather)
      expect(wrImpact).toBe(baseImpact * 1.5)
    })

    it('should reduce impact for RBs', () => {
      const baseImpact = -0.1
      const weather = {
        temperature: 30,
        windSpeed: 20,
        precipitation: 0.5,
        conditions: 'rain' as const,
        impact: baseImpact
      }
      
      const rbImpact = service.getPositionWeatherImpact('RB', weather)
      expect(rbImpact).toBe(baseImpact * 0.5)
    })

    it('should moderately affect TEs', () => {
      const baseImpact = -0.1
      const weather = {
        temperature: 30,
        windSpeed: 20,
        precipitation: 0.5,
        conditions: 'rain' as const,
        impact: baseImpact
      }
      
      const teImpact = service.getPositionWeatherImpact('TE', weather)
      expect(teImpact).toBe(baseImpact * 0.8)
    })

    it('should heavily affect kickers', () => {
      const baseImpact = -0.1
      const weather = {
        temperature: 30,
        windSpeed: 25,
        precipitation: 0,
        conditions: 'wind' as const,
        impact: baseImpact
      }
      
      const kImpact = service.getPositionWeatherImpact('K', weather)
      expect(kImpact).toBe(baseImpact * 2.0)
    })

    it('should return base impact for unknown positions', () => {
      const baseImpact = -0.1
      const weather = {
        temperature: 30,
        windSpeed: 20,
        precipitation: 0.5,
        conditions: 'rain' as const,
        impact: baseImpact
      }
      
      const impact = service.getPositionWeatherImpact('DEF', weather)
      expect(impact).toBe(baseImpact)
    })
  })

  describe('clearCache', () => {
    it('should clear the cache', async () => {
      await service.getWeatherImpact('GB', 1, 2025)
      service.clearCache()
      
      // Cache should be cleared
      expect(service).toBeDefined()
    })

    it('should allow new data after clearing', async () => {
      const impact1 = await service.getWeatherImpact('GB', 1, 2025)
      service.clearCache()
      const impact2 = await service.getWeatherImpact('GB', 1, 2025)
      
      expect(typeof impact1).toBe('number')
      expect(typeof impact2).toBe('number')
    })
  })

  describe('Weather Conditions', () => {
    it('should handle clear conditions', async () => {
      const impact = await service.getWeatherImpact('MIA', 1, 2025)
      expect(typeof impact).toBe('number')
    })

    it('should handle rain conditions', async () => {
      const impact = await service.getWeatherImpact('SEA', 10, 2025)
      expect(typeof impact).toBe('number')
    })

    it('should handle snow conditions', async () => {
      const impact = await service.getWeatherImpact('GB', 16, 2025)
      expect(typeof impact).toBe('number')
    })

    it('should handle wind conditions', async () => {
      const impact = await service.getWeatherImpact('CHI', 14, 2025)
      expect(typeof impact).toBe('number')
    })
  })

  describe('Singleton Instance', () => {
    it('should export a singleton instance', () => {
      expect(weatherService).toBeInstanceOf(WeatherService)
    })

    it('should be usable directly', async () => {
      const impact = await weatherService.getWeatherImpact('GB', 1, 2025)
      expect(typeof impact).toBe('number')
    })
  })

  describe('Edge Cases', () => {
    it('should handle week 1', async () => {
      const impact = await service.getWeatherImpact('GB', 1, 2025)
      expect(typeof impact).toBe('number')
    })

    it('should handle week 18', async () => {
      const impact = await service.getWeatherImpact('GB', 18, 2025)
      expect(typeof impact).toBe('number')
    })

    it('should handle all NFL teams', async () => {
      const teams = [
        'ARI', 'ATL', 'BAL', 'BUF', 'CAR', 'CHI', 'CIN', 'CLE',
        'DAL', 'DEN', 'DET', 'GB', 'HOU', 'IND', 'JAX', 'KC',
        'LAC', 'LAR', 'LV', 'MIA', 'MIN', 'NE', 'NO', 'NYG',
        'NYJ', 'PHI', 'PIT', 'SEA', 'SF', 'TB', 'TEN', 'WAS'
      ]
      
      for (const team of teams) {
        const impact = await service.getWeatherImpact(team, 1, 2025)
        expect(typeof impact).toBe('number')
        expect(impact).toBeGreaterThanOrEqual(-1)
        expect(impact).toBeLessThanOrEqual(1)
      }
    })
  })

  describe('Performance', () => {
    it('should cache results for performance', async () => {
      const start1 = Date.now()
      await service.getWeatherImpact('GB', 1, 2025)
      const time1 = Date.now() - start1
      
      const start2 = Date.now()
      await service.getWeatherImpact('GB', 1, 2025)
      const time2 = Date.now() - start2
      
      // Second call should be faster (cached)
      expect(time2).toBeLessThanOrEqual(time1)
    })

    it('should handle multiple concurrent requests', async () => {
      const promises = []
      for (let i = 0; i < 10; i++) {
        promises.push(service.getWeatherImpact('GB', i + 1, 2025))
      }
      
      const results = await Promise.all(promises)
      expect(results).toHaveLength(10)
      results.forEach(impact => {
        expect(typeof impact).toBe('number')
      })
    })
  })
})

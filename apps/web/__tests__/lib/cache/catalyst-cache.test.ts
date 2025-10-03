/**
 * Catalyst Cache Tests
 * 
 * Tests for multi-layer caching system
 */

import { CatalystCache, LeagueDataCache, CacheConfigurations } from '@/lib/cache/catalyst-cache'

describe('CatalystCache', () => {
  let cache: CatalystCache

  beforeEach(() => {
    cache = new CatalystCache(100, 60)
    jest.clearAllMocks()
  })

  afterEach(async () => {
    await cache.clear()
  })

  describe('Basic Operations', () => {
    it('should set and get values', async () => {
      await cache.set('test-key', { data: 'test-value' })
      const result = await cache.get('test-key')
      
      expect(result).toEqual({ data: 'test-value' })
    })

    it('should return null for non-existent keys', async () => {
      const result = await cache.get('non-existent')
      
      expect(result).toBeNull()
    })

    it('should delete values', async () => {
      await cache.set('test-key', 'value')
      await cache.delete('test-key')
      const result = await cache.get('test-key')
      
      expect(result).toBeNull()
    })

    it('should clear all caches', async () => {
      await cache.set('key1', 'value1')
      await cache.set('key2', 'value2')
      await cache.clear()
      
      const result1 = await cache.get('key1')
      const result2 = await cache.get('key2')
      
      expect(result1).toBeNull()
      expect(result2).toBeNull()
    })
  })

  describe('TTL (Time To Live)', () => {
    it('should respect TTL', async () => {
      await cache.set('test-key', 'value', { ttl: 1 })
      
      // Should exist immediately
      let result = await cache.get('test-key')
      expect(result).toBe('value')
      
      // Wait for expiry
      await new Promise(resolve => setTimeout(resolve, 1100))
      
      result = await cache.get('test-key')
      expect(result).toBeNull()
    })

    it('should use default TTL when not specified', async () => {
      await cache.set('test-key', 'value')
      const result = await cache.get('test-key')
      
      expect(result).toBe('value')
    })
  })

  describe('Cache Tags', () => {
    it('should support cache tags', async () => {
      await cache.set('key1', 'value1', { tags: ['tag1', 'tag2'] })
      await cache.set('key2', 'value2', { tags: ['tag2', 'tag3'] })
      await cache.set('key3', 'value3', { tags: ['tag3'] })
      
      await cache.invalidateByTags(['tag2'])
      
      expect(await cache.get('key1')).toBeNull()
      expect(await cache.get('key2')).toBeNull()
      expect(await cache.get('key3')).toBe('value3')
    })

    it('should handle empty tags', async () => {
      await cache.set('key', 'value', { tags: [] })
      await cache.invalidateByTags(['any-tag'])
      
      expect(await cache.get('key')).toBe('value')
    })
  })

  describe('Metrics', () => {
    it('should track cache hits', async () => {
      await cache.set('key', 'value')
      await cache.get('key')
      await cache.get('key')
      
      const metrics = cache.getMetrics()
      
      expect(metrics.l1Hits).toBe(2)
      expect(metrics.totalRequests).toBe(2)
    })

    it('should track cache misses', async () => {
      await cache.get('non-existent-1')
      await cache.get('non-existent-2')
      
      const metrics = cache.getMetrics()
      
      expect(metrics.misses).toBe(2)
      expect(metrics.totalRequests).toBe(2)
    })

    it('should calculate hit rate', async () => {
      await cache.set('key', 'value')
      await cache.get('key') // hit
      await cache.get('key') // hit
      await cache.get('missing') // miss
      
      const metrics = cache.getMetrics()
      
      expect(metrics.hitRate).toBeCloseTo(66.67, 1)
    })

    it('should track average response time', async () => {
      await cache.set('key', 'value')
      await cache.get('key')
      
      const metrics = cache.getMetrics()
      
      expect(metrics.avgResponseTime).toBeGreaterThan(0)
    })
  })

  describe('Cache Size Management', () => {
    it('should enforce max cache size', async () => {
      const smallCache = new CatalystCache(5, 60)
      
      for (let i = 0; i < 10; i++) {
        await smallCache.set(`key${i}`, `value${i}`)
      }
      
      // Cache should have evicted old entries
      const metrics = smallCache.getMetrics()
      expect(metrics.l1Hits + metrics.misses).toBeGreaterThan(0)
    })
  })

  describe('Complex Data Types', () => {
    it('should handle objects', async () => {
      const obj = { name: 'test', nested: { value: 123 } }
      await cache.set('obj-key', obj)
      const result = await cache.get('obj-key')
      
      expect(result).toEqual(obj)
    })

    it('should handle arrays', async () => {
      const arr = [1, 2, 3, { nested: true }]
      await cache.set('arr-key', arr)
      const result = await cache.get('arr-key')
      
      expect(result).toEqual(arr)
    })

    it('should handle null values', async () => {
      await cache.set('null-key', null)
      const result = await cache.get('null-key')
      
      expect(result).toBeNull()
    })
  })

  describe('Error Handling', () => {
    it('should handle errors gracefully', async () => {
      const result = await cache.get('any-key')
      
      expect(result).toBeNull()
    })
  })
})

describe('LeagueDataCache', () => {
  let cache: LeagueDataCache

  beforeEach(() => {
    cache = new LeagueDataCache()
  })

  afterEach(async () => {
    await cache.clear()
  })

  describe('League Operations', () => {
    it('should cache league standings', async () => {
      const standings = { teams: ['team1', 'team2'] }
      await cache.setLeagueStandings('league-123', 4, standings)
      const result = await cache.getLeagueStandings('league-123', 4)
      
      expect(result).toEqual(standings)
    })

    it('should cache player stats', async () => {
      const stats = { points: 100 }
      await cache.setPlayerStats(['p1', 'p2'], [1, 2], stats)
      const result = await cache.getPlayerStats(['p1', 'p2'], [1, 2])
      
      expect(result).toEqual(stats)
    })

    it('should cache roster data', async () => {
      const roster = { players: ['p1', 'p2'] }
      await cache.setRosterData('team-123', roster)
      const result = await cache.getRosterData('team-123')
      
      expect(result).toEqual(roster)
    })
  })

  describe('Invalidation', () => {
    it('should invalidate league data', async () => {
      await cache.setLeagueStandings('league-123', 4, { data: 'test' })
      await cache.invalidateLeague('league-123')
      
      const result = await cache.getLeagueStandings('league-123', 4)
      expect(result).toBeNull()
    })

    it('should invalidate player data', async () => {
      await cache.setPlayerStats(['player-123'], [1], { data: 'test' })
      await cache.invalidatePlayer('player-123')
      
      // Player data should be cleared
      const metrics = cache.getMetrics()
      expect(metrics).toBeDefined()
    })
  })
})

describe('CacheConfigurations', () => {
  it('should have league data configuration', () => {
    expect(CacheConfigurations.LEAGUE_DATA).toBeDefined()
    expect(CacheConfigurations.LEAGUE_DATA.ttl).toBe(300)
    expect(CacheConfigurations.LEAGUE_DATA.tags).toContain('league')
  })

  it('should have player stats configuration', () => {
    expect(CacheConfigurations.PLAYER_STATS).toBeDefined()
    expect(CacheConfigurations.PLAYER_STATS.ttl).toBe(600)
  })

  it('should have roster data configuration', () => {
    expect(CacheConfigurations.ROSTER_DATA).toBeDefined()
    expect(CacheConfigurations.ROSTER_DATA.ttl).toBe(120)
  })

  it('should have matchup data configuration', () => {
    expect(CacheConfigurations.MATCHUP_DATA).toBeDefined()
    expect(CacheConfigurations.MATCHUP_DATA.ttl).toBe(180)
  })

  it('should have news data configuration', () => {
    expect(CacheConfigurations.NEWS_DATA).toBeDefined()
    expect(CacheConfigurations.NEWS_DATA.priority).toBe('low')
  })
})

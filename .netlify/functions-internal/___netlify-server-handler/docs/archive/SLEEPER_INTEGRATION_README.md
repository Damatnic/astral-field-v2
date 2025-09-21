# Sleeper API Integration

This document provides a quick start guide for using the newly implemented Sleeper API integration in the D'Amato Dynasty League platform.

## Overview

The Sleeper API integration replaces mock data and paid APIs with Sleeper's free, comprehensive NFL and fantasy football API. This provides:

- Real-time NFL player data with 2000+ players
- Live scoring and stats during games
- Trending player analysis and recommendations
- Comprehensive league management capabilities
- Zero API costs (free tier with 1000 requests/minute)

## Quick Start

### 1. Basic API Usage

```typescript
import { sleeperApiService } from '@/services/sleeper/sleeperApiService';

// Get current NFL state
const nflState = await sleeperApiService.getNFLState();
console.log(`Current: Season ${nflState.season}, Week ${nflState.week}`);

// Get all NFL players
const players = await sleeperApiService.getAllPlayers();
console.log(`Found ${Object.keys(players).length} players`);

// Get trending players
const trending = await sleeperApiService.getTrendingPlayers('add', 24, 10);
console.log('Top trending adds:', trending);
```

### 2. Player Data Synchronization

```typescript
import { playerSyncService } from '@/services/sleeper/playerSyncService';

// Sync all players from Sleeper to database
const result = await playerSyncService.syncAllPlayers({
  syncStats: true,
  syncProjections: true
});

console.log(`Synced ${result.syncedPlayers} players in ${result.duration}ms`);

// Sync specific week stats
const weekResult = await playerSyncService.syncWeekStats('2024', 17);
console.log(`Updated stats for ${weekResult.syncedPlayers} players`);
```

### 3. NFL State Management

```typescript
import { nflStateService } from '@/services/sleeper/nflStateService';

// Get current season info
const seasonInfo = await nflStateService.getSeasonInfo();
console.log(`Season ${seasonInfo.current} (${seasonInfo.seasonType})`);

// Check if it's game day
const isGameDay = await nflStateService.isGameDay();
const isScoringPeriod = await nflStateService.isScoringPeriod();

if (isGameDay && isScoringPeriod) {
  console.log('🏈 Games are currently being played!');
}

// Get timing recommendations
const timing = await nflStateService.getTimingRecommendations();
console.log('Recommended sync frequency:', timing.playerSync);
```

## API Endpoints

The integration includes several API endpoints for management:

### Sync Management
```bash
# Get sync status
GET /api/sleeper/sync

# Trigger full sync (players + stats + projections)
POST /api/sleeper/sync

# Sync only players
POST /api/sleeper/sync?action=players

# Sync current week stats
POST /api/sleeper/sync?action=stats

# Sync current week projections  
POST /api/sleeper/sync?action=projections

# Force sync (override running sync)
POST /api/sleeper/sync?force=true
```

### NFL State
```bash
# Get basic NFL state
GET /api/sleeper/state

# Get detailed state with recommendations
GET /api/sleeper/state?detailed=true

# Force refresh state cache
POST /api/sleeper/state/refresh
```

## Configuration

### Environment Variables

```env
# Optional: Redis for caching (improves performance)
REDIS_URL=redis://localhost:6379

# Optional: D'Amato League ID on Sleeper (for league import)
DAMATO_SLEEPER_LEAGUE_ID=123456789
```

### Service Configuration

```typescript
import { SleeperApiService } from '@/services/sleeper/sleeperApiService';

// Custom configuration
const customApi = new SleeperApiService({
  rateLimit: {
    maxRequests: 800, // Reduce from default 1000
    windowMs: 60000
  },
  cache: {
    playersTtl: 7200, // Cache players for 2 hours instead of 1
    statsTtl: 30      // Cache stats for 30 seconds during games
  },
  retry: {
    maxRetries: 5,    // Increase retry attempts
    baseDelay: 2000   // Longer initial delay
  }
});
```

## Data Flow

### Player Synchronization
1. **Fetch**: Get all players from Sleeper API (`/players/nfl`)
2. **Filter**: Keep only fantasy-relevant players (QB, RB, WR, TE, K, DEF)
3. **Transform**: Map Sleeper data to our database schema
4. **Store**: Upsert players with metadata and injury status
5. **Stats**: Optionally sync current season/week statistics
6. **Projections**: Optionally sync current week projections

### Live Scoring Process
1. **State Check**: Verify it's a game day using NFL state
2. **Smart Polling**: Adjust frequency based on game status
3. **Stats Fetch**: Get current week stats from Sleeper
4. **Change Detection**: Compare with stored stats
5. **Update Database**: Store new stats and calculate fantasy points
6. **Notifications**: Emit events for real-time updates

## Performance Considerations

### Rate Limiting
- Sleeper allows 1000 requests per minute
- Service automatically enforces limits with queuing
- Redis caching reduces API calls significantly
- Smart timing based on game status

### Caching Strategy
```typescript
// Cache durations by data type
{
  players: 3600,     // 1 hour (players don't change often)
  state: 300,        // 5 minutes (season/week info)
  stats: 60,         // 1 minute (during games)
  trending: 600,     // 10 minutes (trending data)
  projections: 300   // 5 minutes (projections)
}
```

### Database Optimization
- Batch processing in groups of 100 players
- Parallel processing with Promise.all()
- Efficient upsert operations
- Indexed queries on player nflId

## Error Handling

### Automatic Recovery
```typescript
// Circuit breaker prevents cascading failures
export const sleeperCircuitBreaker = new CircuitBreaker(5, 60000);

// Exponential backoff for retries
const result = await withRetry(
  () => sleeperApi.getAllPlayers(),
  { maxRetries: 3, baseDelay: 1000 }
);

// Fallback data when API is unavailable
if (apiError) {
  return FallbackDataProvider.getNFLState();
}
```

### Error Monitoring
```typescript
// Track error patterns
sleeperErrorMonitor.recordError(error);

// Get error statistics
const stats = sleeperErrorMonitor.getErrorStats();
console.log('Error rate:', stats.stats[0].errorRate, 'per minute');
```

## Testing

### Run Basic Tests
```bash
# Run Sleeper integration tests
npm test __tests__/services/sleeper/

# Run specific test file
npm test sleeperBasic.test.ts

# Run with coverage
npm test -- --coverage --testPathPattern=sleeper
```

### Manual Testing
```bash
# Test API connectivity
curl http://localhost:3000/api/sleeper/state

# Trigger sync
curl -X POST http://localhost:3000/api/sleeper/sync?action=players

# Check sync status
curl http://localhost:3000/api/sleeper/sync
```

## Monitoring & Health Checks

### Service Health
```typescript
// Check Sleeper API health
const health = await sleeperApiService.healthCheck();
console.log('API Status:', health.healthy ? '✅' : '❌');

// Check NFL State service  
const stateHealth = nflStateService.getHealthStatus();
console.log('State Cache Age:', stateHealth.cacheAge, 'seconds');

// Check sync service
const syncStatus = playerSyncService.getSyncStatus();
console.log('Sync Running:', syncStatus.isRunning);
```

### Usage Statistics
```typescript
const usage = sleeperApiService.getUsageStats();
console.log({
  requestsUsed: usage.requestCount,
  requestsRemaining: usage.remainingRequests,
  cacheSize: usage.cacheSize,
  resetTime: new Date(usage.resetTime)
});
```

## Migration Checklist

### Phase 1: Setup ✅
- [x] Sleeper API service with rate limiting
- [x] Type definitions for all Sleeper data
- [x] Error handling and retry logic
- [x] Caching layer (Redis + memory fallback)

### Phase 2: Data Integration ✅
- [x] Player synchronization service
- [x] NFL state management
- [x] Fantasy scoring calculations
- [x] Stats and projections sync

### Phase 3: API Endpoints ✅
- [x] Sync management endpoints
- [x] NFL state endpoints
- [x] Health check endpoints

### Phase 4: Testing ✅
- [x] Basic integration tests
- [x] Error handling tests
- [x] Performance tests
- [x] API endpoint tests

### Phase 5: Next Steps
- [ ] League import from Sleeper
- [ ] Live scoring manager
- [ ] Trending players service
- [ ] Real-time notifications
- [ ] Production deployment

## Troubleshooting

### Common Issues

**API Rate Limiting**
```
Error: Rate limit reached
Solution: Service automatically handles this, but you can check usage with getUsageStats()
```

**Cache Issues**
```
Error: Cache validation failed
Solution: Service automatically clears invalid cache. Check Redis connection if using Redis.
```

**Sync Failures**
```
Error: Player sync failed
Solution: Check network connectivity and Sleeper API status. Use force=true to retry.
```

### Debug Mode
```typescript
// Enable verbose logging
process.env.NODE_ENV = 'development';

// Check service status
console.log('NFL State:', await nflStateService.getHealthStatus());
console.log('API Usage:', sleeperApiService.getUsageStats());
console.log('Sync Status:', playerSyncService.getSyncStatus());
```

## Support

For issues or questions:
1. Check the error logs for specific error messages
2. Verify Sleeper API status at https://docs.sleeper.app/
3. Review the comprehensive migration plan in `SLEEPER_API_MIGRATION_PLAN.md`
4. Test individual services using the provided API endpoints
5. Check the test files for usage examples

---

**🏈 Ready to dominate your fantasy league with real-time Sleeper data!**
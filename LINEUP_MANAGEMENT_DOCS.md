# Comprehensive Lineup Management System

## Overview

This document describes the complete lineup management system implemented for the fantasy football platform. The system handles all aspects of roster and lineup management with advanced features for validation, optimization, and analytics.

## Core Features

### 1. Lineup Setting and Validation
- **Real-time position validation** with clear error messages
- **Flexible roster configurations** supporting standard and custom formats
- **FLEX position handling** (RB/WR/TE eligibility)
- **Super FLEX support** (QB/RB/WR/TE eligibility)
- **Injury status warnings** for starting injured players
- **Bye week detection** and alerts

### 2. Game Time Locking
- **Automatic player locking** when games start
- **Real-time lock status updates** with countdown timers
- **NFL schedule integration** (mock implementation with extensible architecture)
- **Position-specific lock handling** based on team schedules
- **Commissioner override capabilities** for locked lineups

### 3. Lineup Optimization
- **AI-powered recommendations** based on projections
- **Multiple optimization strategies**:
  - Highest Projected Points
  - Safest Floor
  - Highest Ceiling
- **Locked player consideration** (preserves already locked players)
- **Position depth analysis** for optimal FLEX usage

### 4. Analytics and History
- **Complete lineup change tracking** with timestamps
- **Performance analysis** comparing projected vs actual
- **Roster strength evaluation** by position
- **Trade impact analysis** with win probability calculations
- **Start/sit recommendations** with confidence scores

## API Endpoints

### Core Lineup Management

#### GET /api/lineup
```
Query Parameters:
- leagueId (optional): Target league ID
- week (optional): Week number (defaults to current week)

Response:
{
  "success": true,
  "data": {
    "starters": [...],
    "bench": [...],
    "injuredReserve": [...],
    "requirements": {...},
    "totalProjected": 125.4,
    "totalScored": 98.2,
    "validation": {...},
    "optimalLineup": [...],
    "lineupLocked": false
  }
}
```

#### POST /api/lineup
```
Body:
{
  "changes": [
    {
      "playerId": "player123",
      "newPosition": "FLEX",
      "oldPosition": "BENCH"
    }
  ],
  "week": 15,
  "leagueId": "league456"
}

Response:
{
  "success": true,
  "message": "Lineup updated successfully",
  "data": {
    "updatedPlayers": 1,
    "week": 15,
    "changes": 1
  }
}
```

#### PUT /api/lineup (Auto-Optimize)
```
Body:
{
  "strategy": "highest-projected", // or "safest-floor", "highest-ceiling"
  "week": 15,
  "leagueId": "league456"
}

Response:
{
  "success": true,
  "message": "Lineup optimized successfully",
  "data": {
    "changes": 3,
    "strategy": "highest-projected",
    "optimizedLineup": [...],
    "totalProjected": 128.7
  }
}
```

### Validation and Analysis

#### POST /api/lineup/validate
```
Body:
{
  "lineup": {
    "starters": [...],
    "bench": [...]
  },
  "week": 15,
  "validateLocks": true
}

Response:
{
  "success": true,
  "data": {
    "isValid": true,
    "errors": [],
    "warnings": ["Starting injured players: Player Name (Questionable)"],
    "suggestions": [...],
    "lockStatus": {...},
    "positionBreakdown": {...},
    "projectedScore": 125.4,
    "benchStrength": 8.2
  }
}
```

#### GET /api/lineup/lock-status
```
Query Parameters:
- week (optional): Week number
- playerIds (optional): Comma-separated player IDs

Response:
{
  "success": true,
  "data": {
    "week": 15,
    "weekLocked": false,
    "timeUntilNextLock": {
      "minutes": 120,
      "formatted": "2h 0m",
      "nextGame": {...}
    },
    "games": {
      "upcoming": [...],
      "live": [...],
      "completed": [...]
    },
    "players": {
      "locked": [...],
      "unlocked": [...]
    },
    "summary": {...}
  }
}
```

#### GET /api/lineup/history
```
Query Parameters:
- teamId (optional): Specific team ID
- week (optional): Specific week
- limit (optional): Number of entries (default: 20)

Response:
{
  "success": true,
  "data": {
    "history": [
      {
        "id": "history123",
        "week": 15,
        "timestamp": "2024-12-15T14:30:00Z",
        "changeType": "MANUAL",
        "modificationsCount": 2,
        "summary": "Moved Player Name from BENCH to FLEX"
      }
    ],
    "total": 15
  }
}
```

### Roster Analysis

#### GET /api/roster/analyze
```
Query Parameters:
- week (optional): Week number
- includeStartSit (optional): Include start/sit recommendations
- includeFlexOptions (optional): Include FLEX option analysis

Response:
{
  "success": true,
  "data": {
    "rosterAnalysis": {
      "strengthByPosition": {
        "QB": 18.5,
        "RB": 14.2,
        "WR": 12.8,
        "TE": 9.1
      },
      "depthChart": {...},
      "weaknesses": ["Lack of depth at TE"],
      "recommendations": [...],
      "benchStrength": 7.8,
      "injuryRisk": 12.5
    },
    "startSitRecommendations": [...],
    "flexOptions": [...],
    "leagueComparison": {
      "teamRank": 3,
      "percentile": 70
    }
  }
}
```

#### POST /api/roster/analyze
```
Body:
{
  "action": "trade-analysis", // or "start-sit", "flex-options", etc.
  "givingUpPlayerIds": ["player1", "player2"],
  "receivingPlayerIds": ["player3", "player4"],
  "week": 15
}

Response:
{
  "success": true,
  "data": {
    "action": "trade-analysis",
    "result": {
      "netGain": 3.5,
      "rosterBalance": "improved",
      "recommendation": "Good trade - solid point improvement"
    }
  }
}
```

## Key Features and Implementation

### 1. Position Validation System

The system enforces standard fantasy football roster requirements:
- **QB**: 1 starter
- **RB**: 2 starters
- **WR**: 2 starters  
- **TE**: 1 starter
- **FLEX**: 1 starter (RB/WR/TE eligible)
- **K**: 1 starter
- **DST**: 1 starter
- **BENCH**: Variable (typically 6-7)
- **IR**: 2-3 slots for injured players

### 2. Game Time Locking

Players are automatically locked when their NFL games begin:
- **Thursday Night Football**: 8:20 PM ET
- **Sunday Early Games**: 1:00 PM ET
- **Sunday Late Games**: 4:25 PM ET
- **Sunday Night Football**: 8:20 PM ET
- **Monday Night Football**: 8:15 PM ET

### 3. Optimization Strategies

#### Highest Projected Points
Prioritizes players with the highest week-to-week projections for maximum point potential.

#### Safest Floor
Focuses on players with consistent, reliable production to minimize risk of low scores.

#### Highest Ceiling
Targets players with the highest upside potential for tournament-style scoring.

### 4. Validation Rules

- **Position Eligibility**: Players can only be started in positions they're eligible for
- **Roster Limits**: Cannot exceed maximum players per position
- **Injury Warnings**: Alerts for starting injured players
- **Bye Week Detection**: Identifies players not playing in the current week
- **Lock Status**: Prevents changes to players whose games have started

### 5. Analytics Engine

#### Roster Strength Analysis
- Position-by-position strength ratings
- Depth chart with tier assignments
- Weakness identification and recommendations
- Injury risk assessment

#### Start/Sit Recommendations
- Confidence-based recommendations
- Alternative option suggestions
- Matchup-based analysis
- Recent performance trends

#### Trade Impact Analysis
- Net point gain/loss calculations
- Position balance improvements
- Long-term roster impact
- Win probability adjustments

## Database Schema Integration

### Core Tables Used

#### RosterPlayer
- Links players to teams with position assignments
- Tracks acquisition dates and methods
- Stores current roster slot (position in lineup)

#### LineupHistory
- Complete audit trail of lineup changes
- JSON storage for change details
- User attribution and timestamps

#### Player
- Player information and NFL team assignments
- Injury status and bye week data
- Fantasy position eligibility

#### Projections
- Week-specific player projections
- Multiple projection sources with confidence ratings
- Floor, ceiling, and expected point calculations

## Error Handling

### Common Error Scenarios

1. **Authentication Errors** (401)
   - Invalid session
   - Expired authentication

2. **Validation Errors** (400)
   - Invalid lineup configuration
   - Locked player modifications
   - Missing required players

3. **Resource Errors** (404)
   - Team not found
   - League not found
   - Player not found

4. **Server Errors** (500)
   - Database connection issues
   - External API failures
   - Unexpected calculation errors

### Error Response Format
```json
{
  "error": "Descriptive error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "specific field with error",
    "value": "problematic value"
  }
}
```

## Performance Considerations

### Optimization Strategies

1. **Database Indexing**
   - Indexes on teamId, playerId, week, season
   - Composite indexes for common query patterns

2. **Caching**
   - Player projection caching
   - Lock status caching with TTL
   - Roster analysis result caching

3. **Query Optimization**
   - Efficient joins with selective includes
   - Batch operations for multiple updates
   - Pagination for large result sets

4. **Real-time Updates**
   - WebSocket integration for live updates
   - Efficient change detection
   - Minimal payload updates

## Future Enhancements

### Planned Features

1. **Real NFL Schedule Integration**
   - ESPN/NFL API integration
   - Live game status updates
   - Weather condition factors

2. **Advanced Analytics**
   - Machine learning projections
   - Opponent matchup ratings
   - Historical performance patterns

3. **Mobile Optimization**
   - Drag-and-drop interface
   - Push notifications for locks
   - Offline capability

4. **League Customization**
   - Custom scoring systems
   - Flexible roster requirements
   - Commissioner tools

### Integration Points

1. **Draft Integration**
   - Auto-assignment from draft results
   - Keeper league support
   - Dynasty league considerations

2. **Waiver System**
   - Automatic roster updates
   - Priority adjustments
   - FAAB integration

3. **Scoring Engine**
   - Real-time point calculations
   - Historical accuracy tracking
   - Projection refinement

## Usage Examples

### Setting a Lineup
```javascript
// Update multiple positions
const changes = [
  { playerId: "player1", newPosition: "QB", oldPosition: "BENCH" },
  { playerId: "player2", newPosition: "BENCH", oldPosition: "RB" },
  { playerId: "player3", newPosition: "FLEX", oldPosition: "WR" }
];

const response = await fetch('/api/lineup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ changes, week: 15 })
});
```

### Optimizing a Lineup
```javascript
// Auto-optimize for highest projected points
const response = await fetch('/api/lineup', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    strategy: 'highest-projected',
    week: 15 
  })
});
```

### Validating a Lineup
```javascript
// Validate current lineup configuration
const lineup = {
  starters: [/* starter objects */],
  bench: [/* bench objects */]
};

const response = await fetch('/api/lineup/validate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ lineup, week: 15, validateLocks: true })
});
```

### Checking Lock Status
```javascript
// Get comprehensive lock status
const response = await fetch('/api/lineup/lock-status?week=15');
const { data } = await response.json();

console.log(`${data.timeUntilNextLock.formatted} until next lock`);
console.log(`${data.players.locked.length} players currently locked`);
```

This comprehensive lineup management system provides a robust foundation for fantasy football roster management with professional-grade features and scalability.
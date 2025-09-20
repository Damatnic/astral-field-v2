# API Reference

## Overview

The Astral Field API provides RESTful endpoints for all fantasy football platform functionality. All API routes are located under `/api/` and follow REST conventions with proper HTTP status codes and JSON responses.

## Base URL

```
Development: http://localhost:3007/api
Production: https://your-domain.com/api
```

## Authentication

### Session-Based Authentication

All protected endpoints require authentication via session cookies or Bearer tokens.

#### Headers
```http
Authorization: Bearer <session-token>
Content-Type: application/json
```

#### Cookie Authentication
```http
Cookie: astralfield-session=<session-id>
```

## Response Format

All API responses follow a consistent structure:

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": { ... }
}
```

## Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error

---

# Authentication Endpoints

## POST /api/auth/login

Authenticate user with email and password.

### Request Body
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

### Response
```json
{
  "success": true,
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "PLAYER",
    "avatar": "🏈"
  }
}
```

## POST /api/auth/logout

Log out the current user.

### Response
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

## GET /api/auth/session

Get current user session information.

### Response
```json
{
  "success": true,
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "PLAYER"
  }
}
```

---

# League Management

## GET /api/league

Get league information for the current user.

### Query Parameters
- `id` (optional): Specific league ID

### Response
```json
{
  "success": true,
  "data": {
    "id": "league_123",
    "name": "D'Amato Dynasty League",
    "season": 2024,
    "currentWeek": 12,
    "isActive": true,
    "settings": {
      "rosterSlots": {
        "QB": 1,
        "RB": 2,
        "WR": 2,
        "TE": 1,
        "FLEX": 1,
        "DST": 1,
        "K": 1,
        "BENCH": 6
      },
      "scoringSystem": { ... }
    },
    "teams": [ ... ],
    "members": [ ... ]
  }
}
```

## PUT /api/league

Update league settings (Commissioner only).

### Request Body
```json
{
  "name": "Updated League Name",
  "settings": {
    "rosterSlots": { ... },
    "scoringSystem": { ... }
  }
}
```

---

# Team Management

## GET /api/team

Get user's team information.

### Query Parameters
- `leagueId`: League ID (required)

### Response
```json
{
  "success": true,
  "data": {
    "id": "team_123",
    "name": "Team Name",
    "wins": 8,
    "losses": 4,
    "pointsFor": 1456.78,
    "pointsAgainst": 1234.56,
    "waiverPriority": 3,
    "faabBudget": 100,
    "faabSpent": 45,
    "roster": [ ... ]
  }
}
```

## PUT /api/team

Update team information.

### Request Body
```json
{
  "name": "New Team Name"
}
```

---

# Roster Management

## GET /api/roster

Get team roster.

### Query Parameters
- `teamId`: Team ID (required)
- `week` (optional): Specific week

### Response
```json
{
  "success": true,
  "data": {
    "roster": [
      {
        "id": "roster_123",
        "playerId": "player_456",
        "position": "QB",
        "rosterSlot": "QB",
        "isLocked": false,
        "player": {
          "id": "player_456",
          "name": "Josh Allen",
          "position": "QB",
          "nflTeam": "BUF",
          "status": "ACTIVE"
        }
      }
    ],
    "lineup": [ ... ],
    "bench": [ ... ]
  }
}
```

## POST /api/roster/set-lineup

Set lineup for a specific week.

### Request Body
```json
{
  "week": 12,
  "lineup": {
    "QB": "player_456",
    "RB": ["player_789", "player_012"],
    "WR": ["player_345", "player_678"],
    "TE": "player_901",
    "FLEX": "player_234",
    "DST": "player_567",
    "K": "player_890"
  }
}
```

---

# Player Data

## GET /api/players

Search and get player information.

### Query Parameters
- `search` (optional): Player name search
- `position` (optional): Filter by position
- `team` (optional): Filter by NFL team
- `available` (optional): Only available players
- `limit` (optional): Results limit (default: 50)
- `offset` (optional): Results offset

### Response
```json
{
  "success": true,
  "data": {
    "players": [
      {
        "id": "player_123",
        "name": "Josh Allen",
        "firstName": "Josh",
        "lastName": "Allen",
        "position": "QB",
        "nflTeam": "BUF",
        "status": "ACTIVE",
        "byeWeek": 12,
        "isRookie": false,
        "age": 27,
        "fantasyPositions": ["QB"],
        "adp": 12.5,
        "isAvailable": false
      }
    ],
    "total": 2500,
    "hasMore": true
  }
}
```

## GET /api/players/[id]

Get detailed player information.

### Response
```json
{
  "success": true,
  "data": {
    "player": { ... },
    "stats": {
      "2024": { ... },
      "projections": { ... }
    },
    "news": [ ... ],
    "injury": { ... }
  }
}
```

---

# Matchups

## GET /api/matchups

Get league matchups.

### Query Parameters
- `leagueId`: League ID (required)
- `week` (optional): Specific week (default: current)

### Response
```json
{
  "success": true,
  "data": {
    "week": 12,
    "matchups": [
      {
        "id": "matchup_123",
        "homeTeam": {
          "id": "team_456",
          "name": "Team A",
          "owner": "John Doe",
          "score": 124.56
        },
        "awayTeam": {
          "id": "team_789",
          "name": "Team B", 
          "owner": "Jane Smith",
          "score": 118.34
        },
        "isComplete": false
      }
    ]
  }
}
```

## GET /api/my-matchup

Get current user's matchup.

### Query Parameters
- `week` (optional): Specific week

### Response
```json
{
  "success": true,
  "data": {
    "matchup": { ... },
    "myTeam": { ... },
    "opponent": { ... },
    "projections": { ... }
  }
}
```

---

# Trading System

## GET /api/trades

Get trade proposals and history.

### Query Parameters
- `status` (optional): Filter by status (PENDING, ACCEPTED, REJECTED)
- `leagueId`: League ID (required)

### Response
```json
{
  "success": true,
  "data": {
    "trades": [
      {
        "id": "trade_123",
        "status": "PENDING",
        "proposer": { ... },
        "expiresAt": "2024-12-01T00:00:00Z",
        "items": [
          {
            "fromTeamId": "team_456",
            "toTeamId": "team_789",
            "player": { ... },
            "itemType": "PLAYER"
          }
        ],
        "votes": [ ... ]
      }
    ]
  }
}
```

## POST /api/trades

Create a new trade proposal.

### Request Body
```json
{
  "leagueId": "league_123",
  "items": [
    {
      "fromTeamId": "team_456",
      "toTeamId": "team_789",
      "playerId": "player_123",
      "itemType": "PLAYER"
    }
  ],
  "notes": "Trade proposal notes"
}
```

## POST /api/trades/[id]/vote

Vote on a trade proposal.

### Request Body
```json
{
  "vote": "APPROVE",
  "reason": "Fair trade"
}
```

---

# Waiver Claims

## GET /api/waivers

Get waiver claims.

### Query Parameters
- `leagueId`: League ID (required)
- `status` (optional): Filter by status

### Response
```json
{
  "success": true,
  "data": {
    "claims": [
      {
        "id": "claim_123",
        "player": { ... },
        "dropPlayer": { ... },
        "priority": 3,
        "faabBid": 25,
        "status": "PENDING",
        "processedAt": null
      }
    ],
    "waiverOrder": [ ... ]
  }
}
```

## POST /api/waivers/claim

Submit a waiver claim.

### Request Body
```json
{
  "playerId": "player_123",
  "dropPlayerId": "player_456",
  "faabBid": 25,
  "priority": 1
}
```

---

# Draft Management

## GET /api/draft

Get draft information.

### Query Parameters
- `leagueId`: League ID (required)

### Response
```json
{
  "success": true,
  "data": {
    "draft": {
      "id": "draft_123",
      "status": "IN_PROGRESS",
      "type": "SNAKE",
      "currentRound": 3,
      "currentPick": 7,
      "pickTimeLimit": 120
    },
    "draftOrder": [ ... ],
    "picks": [ ... ],
    "availablePlayers": [ ... ]
  }
}
```

## POST /api/draft/[id]/pick

Make a draft pick.

### Request Body
```json
{
  "playerId": "player_123"
}
```

---

# Analytics

## GET /api/analytics/league

Get league analytics.

### Query Parameters
- `leagueId`: League ID (required)
- `timeframe` (optional): Week range

### Response
```json
{
  "success": true,
  "data": {
    "standings": [ ... ],
    "powerRankings": [ ... ],
    "trends": { ... },
    "statistics": {
      "highScorer": { ... },
      "totalPoints": 15678.90,
      "averageScore": 108.45
    }
  }
}
```

## GET /api/analytics/user

Get user-specific analytics.

### Response
```json
{
  "success": true,
  "data": {
    "performance": { ... },
    "trends": { ... },
    "recommendations": [ ... ]
  }
}
```

---

# Chat & Social

## GET /api/chat

Get league chat messages.

### Query Parameters
- `leagueId`: League ID (required)
- `limit` (optional): Message limit
- `before` (optional): Messages before timestamp

### Response
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "msg_123",
        "content": "Great trade!",
        "type": "GENERAL",
        "user": { ... },
        "createdAt": "2024-12-01T12:00:00Z"
      }
    ]
  }
}
```

## POST /api/chat

Send a chat message.

### Request Body
```json
{
  "leagueId": "league_123",
  "content": "Message content",
  "type": "GENERAL"
}
```

---

# Notifications

## GET /api/notifications

Get user notifications.

### Query Parameters
- `unread` (optional): Only unread notifications
- `type` (optional): Filter by notification type

### Response
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notif_123",
        "type": "TRADE_PROPOSAL",
        "title": "New Trade Proposal",
        "content": "You have received a trade proposal",
        "isRead": false,
        "createdAt": "2024-12-01T12:00:00Z",
        "metadata": { ... }
      }
    ],
    "unreadCount": 5
  }
}
```

## PUT /api/notifications/[id]/read

Mark notification as read.

---

# WebSocket Events

## Real-Time Events

The platform supports real-time updates via WebSocket connections.

### Connection
```javascript
const socket = io('ws://localhost:3001');

// Join league room
socket.emit('join-league', 'league_123');
```

### Events

#### League Events
- `lineup-update`: Player lineup changes
- `trade-proposal`: New trade proposals
- `waiver-processed`: Waiver claim results
- `score-update`: Live scoring updates

#### Draft Events
- `draft-pick`: New draft picks
- `draft-timer`: Pick timer updates
- `draft-complete`: Draft completion

#### Chat Events
- `new-message`: New chat messages
- `user-typing`: User typing indicators

### Example Usage
```javascript
// Listen for score updates
socket.on('score-update', (data) => {
  console.log('Score updated:', data);
});

// Send lineup update
socket.emit('lineup-update', {
  leagueId: 'league_123',
  teamId: 'team_456',
  changes: { ... }
});
```

---

# Rate Limiting

API endpoints are rate limited to prevent abuse:

- **Authentication**: 5 requests per minute
- **General API**: 100 requests per minute
- **Real-time updates**: 1000 requests per minute
- **Search endpoints**: 50 requests per minute

Rate limit headers:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

---

# Error Codes

Common error codes and their meanings:

- `AUTH_REQUIRED`: Authentication required
- `INVALID_CREDENTIALS`: Invalid login credentials
- `INSUFFICIENT_PERMISSIONS`: Insufficient user permissions
- `RESOURCE_NOT_FOUND`: Requested resource not found
- `VALIDATION_ERROR`: Request validation failed
- `RATE_LIMIT_EXCEEDED`: Rate limit exceeded
- `EXTERNAL_API_ERROR`: External service error
- `DATABASE_ERROR`: Database operation failed

---

# SDK Examples

## JavaScript/TypeScript Client

```typescript
import { AstralFieldAPI } from '@astralfield/api-client';

const api = new AstralFieldAPI({
  baseURL: 'https://your-domain.com/api',
  apiKey: 'your-api-key'
});

// Get league data
const league = await api.league.get('league_123');

// Set lineup
await api.roster.setLineup('team_456', {
  week: 12,
  lineup: { QB: 'player_123', ... }
});

// Submit trade
const trade = await api.trades.create({
  items: [{ ... }],
  notes: 'Trade proposal'
});
```

This API reference covers all major endpoints and functionality of the Astral Field fantasy football platform.
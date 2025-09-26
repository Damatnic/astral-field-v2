# AstralField v3.0 - API Reference Documentation

## API Overview

AstralField v3.0 implements a **hybrid API architecture** with two complementary API layers:

1. **Next.js API Routes** (`/api/*`) - Authentication, simple operations
2. **Express.js API Server** (`/api/*`) - Complex business logic, real-time features

### Base URLs
- **Development**: `http://localhost:3000/api` (Next.js) / `http://localhost:3001/api` (Express)
- **Production**: `https://your-domain.com/api`

### Authentication
- **Method**: JWT Bearer tokens
- **Header**: `Authorization: Bearer <token>`
- **Session Storage**: Redis-based session management
- **Token Expiry**: 7 days (configurable)

## Authentication Endpoints

### POST /api/auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe",
  "username": "johndoe",
  "avatar": "https://example.com/avatar.jpg"
}
```

**Response (201):**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "username": "johndoe",
    "avatar": "https://example.com/avatar.jpg",
    "role": "USER",
    "createdAt": "2024-01-20T12:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 604800000
}
```

**Error Responses:**
```json
// 409 - User already exists
{
  "error": "User already exists",
  "field": "email",
  "timestamp": "2024-01-20T12:00:00.000Z"
}

// 400 - Validation error
{
  "error": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### POST /api/auth/login
Authenticate existing user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200):**
```json
{
  "message": "Login successful",
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "username": "johndoe",
    "avatar": "https://example.com/avatar.jpg",
    "role": "USER"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 604800000
}
```

**Error Responses:**
```json
// 401 - Invalid credentials
{
  "error": "Invalid credentials",
  "timestamp": "2024-01-20T12:00:00.000Z"
}

// 423 - Account locked
{
  "error": "Account temporarily locked",
  "message": "Too many failed login attempts",
  "lockedUntil": "2024-01-20T12:15:00.000Z",
  "timestamp": "2024-01-20T12:00:00.000Z"
}
```

### POST /api/auth/logout
Logout current user and invalidate session.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

### GET /api/auth/verify
Verify JWT token validity and get current user.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "valid": true,
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "username": "johndoe",
    "avatar": "https://example.com/avatar.jpg",
    "role": "USER",
    "isActive": true
  },
  "expiresAt": "2024-01-27T12:00:00.000Z"
}
```

### POST /api/auth/change-password
Change user password.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword456!"
}
```

**Response (200):**
```json
{
  "message": "Password changed successfully",
  "timestamp": "2024-01-20T12:00:00.000Z"
}
```

### POST /api/auth/forgot-password
Request password reset link.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "message": "If an account with that email exists, a password reset link has been sent.",
  "timestamp": "2024-01-20T12:00:00.000Z"
}
```

## League Management Endpoints

### GET /api/leagues
Get all leagues for current user.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `season` (optional): Filter by season
- `status` (optional): Filter by status (active, inactive)

**Response (200):**
```json
{
  "leagues": [
    {
      "id": "league_123",
      "name": "D'Amato Dynasty League",
      "commissionerId": "user_123",
      "currentWeek": 3,
      "season": "2024",
      "isActive": true,
      "settings": {
        "teamCount": 10,
        "playoffTeams": 4,
        "scoringType": "PPR"
      },
      "userTeam": {
        "id": "team_456",
        "name": "D'Amato Dynasty",
        "wins": 2,
        "losses": 1,
        "pointsFor": 345.6,
        "standing": 3
      },
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "pages": 1
  }
}
```

### POST /api/leagues
Create a new league.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "My Fantasy League",
  "settings": {
    "teamCount": 10,
    "playoffTeams": 4,
    "playoffWeeks": [15, 16, 17],
    "rosterLocks": "gameTime",
    "waiverType": "FAAB"
  },
  "scoringSettings": {
    "passing": { "yards": 0.04, "touchdowns": 4, "interceptions": -2 },
    "rushing": { "yards": 0.1, "touchdowns": 6 },
    "receiving": { "yards": 0.1, "touchdowns": 6, "receptions": 1 }
  },
  "rosterSettings": {
    "positions": {
      "QB": 1, "RB": 2, "WR": 2, "TE": 1, "FLEX": 1,
      "K": 1, "DEF": 1, "BENCH": 6, "IR": 1
    }
  },
  "draftDate": "2024-09-01T20:00:00.000Z"
}
```

**Response (201):**
```json
{
  "message": "League created successfully",
  "league": {
    "id": "league_789",
    "name": "My Fantasy League",
    "commissionerId": "user_123",
    "settings": { ... },
    "scoringSettings": { ... },
    "rosterSettings": { ... },
    "createdAt": "2024-01-20T12:00:00.000Z"
  }
}
```

### GET /api/leagues/:id
Get specific league details.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "league": {
    "id": "league_123",
    "name": "D'Amato Dynasty League",
    "commissionerId": "user_123",
    "currentWeek": 3,
    "season": "2024",
    "isActive": true,
    "settings": { ... },
    "scoringSettings": { ... },
    "rosterSettings": { ... },
    "teams": [
      {
        "id": "team_456",
        "name": "D'Amato Dynasty",
        "ownerId": "user_123",
        "wins": 2,
        "losses": 1,
        "pointsFor": 345.6,
        "standing": 3
      }
    ],
    "currentMatchups": [
      {
        "id": "matchup_789",
        "week": 3,
        "homeTeam": { ... },
        "awayTeam": { ... },
        "homeScore": 102.5,
        "awayScore": 98.2,
        "isComplete": false
      }
    ]
  }
}
```

### PUT /api/leagues/:id
Update league settings (Commissioner only).

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "Updated League Name",
  "settings": {
    "playoffTeams": 6
  }
}
```

### GET /api/leagues/:id/standings
Get league standings.

**Response (200):**
```json
{
  "standings": [
    {
      "rank": 1,
      "team": {
        "id": "team_123",
        "name": "Team Alpha",
        "owner": "John Doe",
        "wins": 3,
        "losses": 0,
        "ties": 0,
        "pointsFor": 425.8,
        "pointsAgainst": 312.4,
        "winPercentage": 1.0
      }
    }
  ],
  "playoffBracket": {
    "qualifiedTeams": ["team_123", "team_456"],
    "playoffWeeks": [15, 16, 17]
  }
}
```

## Team Management Endpoints

### GET /api/teams/:id
Get team details including roster.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "team": {
    "id": "team_123",
    "name": "D'Amato Dynasty",
    "logo": "https://example.com/logo.png",
    "ownerId": "user_123",
    "leagueId": "league_456",
    "wins": 2,
    "losses": 1,
    "pointsFor": 345.6,
    "standing": 3,
    "roster": [
      {
        "id": "roster_789",
        "player": {
          "id": "player_abc",
          "name": "Josh Allen",
          "position": "QB",
          "nflTeam": "BUF",
          "status": "active",
          "injuryStatus": null
        },
        "position": "QB",
        "isStarter": true,
        "isLocked": false
      }
    ],
    "transactions": [
      {
        "id": "txn_123",
        "type": "trade",
        "status": "completed",
        "createdAt": "2024-01-15T10:00:00.000Z"
      }
    ]
  }
}
```

### PUT /api/teams/:id/lineup
Set starting lineup.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "lineup": {
    "QB": "player_abc",
    "RB1": "player_def",
    "RB2": "player_ghi",
    "WR1": "player_jkl",
    "WR2": "player_mno",
    "TE": "player_pqr",
    "FLEX": "player_stu",
    "K": "player_vwx",
    "DEF": "player_yz"
  }
}
```

**Response (200):**
```json
{
  "message": "Lineup updated successfully",
  "lineup": { ... }
}
```

## Player Endpoints

### GET /api/players
Search and filter players.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `search` (optional): Search by name
- `position` (optional): Filter by position
- `team` (optional): Filter by NFL team
- `available` (optional): Only show available players
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response (200):**
```json
{
  "players": [
    {
      "id": "player_123",
      "name": "Josh Allen",
      "firstName": "Josh",
      "lastName": "Allen",
      "position": "QB",
      "nflTeam": "BUF",
      "jerseyNumber": 17,
      "height": "6'5\"",
      "weight": "237",
      "age": 28,
      "college": "Wyoming",
      "imageUrl": "https://example.com/josh-allen.jpg",
      "status": "active",
      "injuryStatus": null,
      "byeWeek": 12,
      "adp": 15.6,
      "rank": 2,
      "isAvailable": false,
      "currentTeam": "D'Amato Dynasty",
      "weeklyStats": {
        "week3": {
          "fantasyPoints": 24.8,
          "stats": {
            "passing": { "yards": 280, "touchdowns": 2, "interceptions": 1 },
            "rushing": { "yards": 25, "touchdowns": 1 }
          }
        }
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 500,
    "pages": 25
  }
}
```

### GET /api/players/:id
Get detailed player information.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "player": {
    "id": "player_123",
    "name": "Josh Allen",
    "position": "QB",
    "nflTeam": "BUF",
    "profile": { ... },
    "seasonStats": [
      {
        "week": 1,
        "opponent": "NYJ",
        "fantasyPoints": 28.5,
        "stats": { ... }
      }
    ],
    "projections": [
      {
        "week": 4,
        "projectedPoints": 22.8,
        "source": "espn",
        "confidence": 0.85
      }
    ],
    "news": [
      {
        "headline": "Allen practices in full",
        "body": "Josh Allen participated in full practice...",
        "source": "ESPN",
        "publishedAt": "2024-01-20T09:00:00.000Z"
      }
    ],
    "ownership": {
      "rostered": true,
      "teamName": "D'Amato Dynasty",
      "acquisitionDate": "2024-09-01T00:00:00.000Z"
    }
  }
}
```

### POST /api/players/:id/watchlist
Add player to watchlist.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (201):**
```json
{
  "message": "Player added to watchlist",
  "watchlistItem": {
    "id": "watchlist_123",
    "playerId": "player_456",
    "userId": "user_789",
    "createdAt": "2024-01-20T12:00:00.000Z"
  }
}
```

### DELETE /api/players/:id/watchlist
Remove player from watchlist.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Player removed from watchlist"
}
```

## Draft Endpoints

### GET /api/draft/:leagueId
Get draft room data.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "draft": {
    "id": "draft_123",
    "leagueId": "league_456",
    "status": "IN_PROGRESS",
    "type": "SNAKE",
    "currentRound": 3,
    "currentPick": 25,
    "currentTeam": {
      "id": "team_789",
      "name": "Team Alpha",
      "owner": "John Doe"
    },
    "timeRemaining": 45,
    "totalRounds": 15,
    "timePerPick": 90,
    "draftOrder": [
      {
        "pickOrder": 1,
        "team": { ... }
      }
    ],
    "picks": [
      {
        "pickNumber": 1,
        "round": 1,
        "pickInRound": 1,
        "team": { ... },
        "player": {
          "id": "player_123",
          "name": "Josh Allen",
          "position": "QB"
        },
        "timeUsed": 30,
        "pickMadeAt": "2024-09-01T20:05:00.000Z"
      }
    ],
    "availablePlayers": [
      {
        "id": "player_456",
        "name": "Lamar Jackson",
        "position": "QB",
        "adp": 8.5,
        "rank": 3
      }
    ]
  }
}
```

### POST /api/draft/:draftId/pick
Make a draft pick.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "playerId": "player_456"
}
```

**Response (201):**
```json
{
  "message": "Pick made successfully",
  "pick": {
    "id": "pick_789",
    "pickNumber": 25,
    "round": 3,
    "pickInRound": 5,
    "player": {
      "id": "player_456",
      "name": "Lamar Jackson",
      "position": "QB"
    },
    "timeUsed": 35,
    "pickMadeAt": "2024-09-01T20:35:00.000Z"
  },
  "nextPick": {
    "pickNumber": 26,
    "team": { ... },
    "timeRemaining": 90
  }
}
```

### POST /api/draft/:draftId/autopick
Enable/disable autopick for team.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "enabled": true,
  "strategy": "best_available" // or "positional_need"
}
```

## Trading Endpoints

### GET /api/trades
Get trade proposals for current user.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `status` (optional): Filter by status (pending, accepted, rejected)
- `type` (optional): sent, received, all

**Response (200):**
```json
{
  "trades": [
    {
      "id": "trade_123",
      "proposingTeam": {
        "id": "team_456",
        "name": "Team Alpha",
        "owner": "John Doe"
      },
      "receivingTeam": {
        "id": "team_789",
        "name": "Team Beta",
        "owner": "Jane Smith"
      },
      "givingPlayers": [
        {
          "id": "player_abc",
          "name": "Josh Allen",
          "position": "QB"
        }
      ],
      "receivingPlayers": [
        {
          "id": "player_def",
          "name": "Lamar Jackson",
          "position": "QB"
        }
      ],
      "status": "pending",
      "message": "Let's swap QBs!",
      "createdAt": "2024-01-20T10:00:00.000Z",
      "expiresAt": "2024-01-22T10:00:00.000Z"
    }
  ]
}
```

### POST /api/trades
Propose a new trade.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "receivingTeamId": "team_789",
  "givingPlayerIds": ["player_abc", "player_ghi"],
  "receivingPlayerIds": ["player_def"],
  "message": "Fair trade for both teams!"
}
```

**Response (201):**
```json
{
  "message": "Trade proposal sent successfully",
  "trade": {
    "id": "trade_456",
    "status": "pending",
    "createdAt": "2024-01-20T12:00:00.000Z",
    "expiresAt": "2024-01-22T12:00:00.000Z"
  }
}
```

### PUT /api/trades/:id
Respond to trade proposal.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "action": "accept", // or "reject" or "counter"
  "message": "Accepted! Great trade.",
  "counterOffer": {
    "givingPlayerIds": ["player_xyz"],
    "receivingPlayerIds": ["player_abc", "player_def"]
  }
}
```

**Response (200):**
```json
{
  "message": "Trade accepted successfully",
  "trade": {
    "id": "trade_123",
    "status": "accepted",
    "processedAt": "2024-01-20T12:30:00.000Z"
  }
}
```

## AI Coach Endpoints

### GET /api/ai-coach/recommendations
Get AI-powered lineup recommendations.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `teamId`: Team ID for recommendations
- `week` (optional): Week number (default: current week)
- `type` (optional): lineup, waiver, trade

**Response (200):**
```json
{
  "recommendations": {
    "lineup": [
      {
        "position": "QB",
        "recommended": {
          "id": "player_123",
          "name": "Josh Allen",
          "projectedPoints": 22.8,
          "confidence": 0.92
        },
        "current": {
          "id": "player_456",
          "name": "Dak Prescott",
          "projectedPoints": 18.5
        },
        "reasoning": "Allen has a higher projected ceiling against a weak secondary"
      }
    ],
    "waiver": [
      {
        "player": {
          "id": "player_789",
          "name": "Rookie RB",
          "position": "RB",
          "availability": "available"
        },
        "priority": "high",
        "reasoning": "Emerging handcuff with high upside if starter gets injured",
        "recommendedBid": 15
      }
    ],
    "trade": [
      {
        "target": {
          "id": "player_abc",
          "name": "Elite WR",
          "position": "WR"
        },
        "offer": ["player_def", "player_ghi"],
        "fairValue": 0.85,
        "reasoning": "Upgrade at WR position while maintaining depth"
      }
    ]
  },
  "confidence": 0.88,
  "lastUpdated": "2024-01-20T12:00:00.000Z"
}
```

### POST /api/ai-coach/analyze-trade
Analyze a potential trade.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "givingPlayerIds": ["player_123", "player_456"],
  "receivingPlayerIds": ["player_789"],
  "context": {
    "teamId": "team_abc",
    "week": 3,
    "goals": ["win_now", "depth"]
  }
}
```

**Response (200):**
```json
{
  "analysis": {
    "fairnessScore": 0.82,
    "recommendation": "accept",
    "reasoning": "This trade improves your starting lineup significantly",
    "impact": {
      "weeklyPointsChange": +3.5,
      "rostbalanceImprovement": 0.15,
      "seasonProjection": +2.3
    },
    "risks": [
      "Giving up depth at RB position",
      "Injury risk with acquired player"
    ],
    "benefits": [
      "Significant upgrade at WR",
      "Better playoff positioning"
    ]
  }
}
```

## Real-time WebSocket Events

### Connection
```javascript
const socket = io('ws://localhost:3001', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

### League Events
```javascript
// Join league room
socket.emit('join_league', { leagueId: 'league_123' });

// Listen for score updates
socket.on('score_update', (data) => {
  console.log('Score update:', data);
});

// Listen for trade notifications
socket.on('trade_proposal', (data) => {
  console.log('New trade proposal:', data);
});
```

### Draft Events
```javascript
// Join draft room
socket.emit('join_draft', { draftId: 'draft_123' });

// Listen for pick updates
socket.on('pick_made', (data) => {
  console.log('Pick made:', data);
});

// Listen for timer updates
socket.on('timer_update', (data) => {
  console.log('Time remaining:', data.timeRemaining);
});
```

### Chat Events
```javascript
// Send message
socket.emit('send_message', {
  leagueId: 'league_123',
  content: 'Great game!',
  type: 'TEXT'
});

// Receive messages
socket.on('new_message', (data) => {
  console.log('New message:', data);
});
```

## Error Handling

### Standard Error Response Format
```json
{
  "error": "Error description",
  "code": "ERROR_CODE",
  "details": {},
  "timestamp": "2024-01-20T12:00:00.000Z",
  "path": "/api/endpoint",
  "method": "POST"
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request / Validation Error
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Unprocessable Entity
- `423` - Locked (Account)
- `429` - Too Many Requests
- `500` - Internal Server Error

### Rate Limiting
- **Window**: 15 minutes
- **Limit**: 100 requests (production) / 1000 requests (development)
- **Headers**: 
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`

## SDK Usage Examples

### JavaScript/TypeScript Client
```typescript
import { AstralFieldAPI } from '@astralfield/api-client';

const api = new AstralFieldAPI({
  baseURL: 'https://api.astralfield.com',
  apiKey: 'your-api-key'
});

// Authentication
const { user, token } = await api.auth.login({
  email: 'user@example.com',
  password: 'password'
});

// Get leagues
const leagues = await api.leagues.list();

// Get team roster
const team = await api.teams.get('team_123');

// Make draft pick
await api.draft.makePick('draft_123', { playerId: 'player_456' });
```

### React Hooks
```typescript
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAstralFieldAPI } from '@astralfield/react-hooks';

function TeamRoster({ teamId }: { teamId: string }) {
  const api = useAstralFieldAPI();
  
  const { data: team, isLoading } = useQuery({
    queryKey: ['team', teamId],
    queryFn: () => api.teams.get(teamId)
  });

  const updateLineupMutation = useMutation({
    mutationFn: (lineup) => api.teams.updateLineup(teamId, lineup),
    onSuccess: () => {
      // Invalidate and refetch team data
    }
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h2>{team.name}</h2>
      {/* Roster display */}
    </div>
  );
}
```

---

*This API reference provides comprehensive documentation for all AstralField v3.0 endpoints, enabling developers to integrate with the platform effectively and build powerful fantasy football applications.*
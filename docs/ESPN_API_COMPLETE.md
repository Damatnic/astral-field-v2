# ESPN API Complete Reference

**Last Updated:** October 14, 2025  
**Status:** ✅ **FULLY OPERATIONAL** (14/14 endpoints)  
**Version:** 1.0

---

## Overview

The ESPN API service provides comprehensive access to NFL data including live scores, player statistics, team information, injury reports, and more. All endpoints are powered by ESPN's free public APIs with intelligent caching and error handling.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [All Endpoints](#all-endpoints)
3. [Endpoint Details](#endpoint-details)
4. [Caching Strategy](#caching-strategy)
5. [Error Handling](#error-handling)
6. [Integration Guide](#integration-guide)
7. [Best Practices](#best-practices)

---

## Quick Start

### Basic Usage

```typescript
// Fetch live scoreboard
const response = await fetch('/api/espn/scoreboard');
const data = await response.json();

// Get player stats
const playerResponse = await fetch('/api/espn/players/3139477/stats');
const playerStats = await playerResponse.json();

// Get current week
const weekResponse = await fetch('/api/espn/week');
const { week } = await weekResponse.json();
```

### With React/Next.js

```typescript
'use client';

import { useEffect, useState } from 'react';

export function LiveScores() {
  const [games, setGames] = useState([]);

  useEffect(() => {
    async function fetchScores() {
      const res = await fetch('/api/espn/scoreboard');
      const data = await res.json();
      setGames(data.events || []);
    }

    fetchScores();
    const interval = setInterval(fetchScores, 30000); // Refresh every 30s

    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      {games.map((game) => (
        <div key={game.id}>{game.name}</div>
      ))}
    </div>
  );
}
```

---

## All Endpoints

### Static Data Endpoints

| Endpoint | Method | Description | Cache Time |
|----------|--------|-------------|------------|
| `/api/espn/scoreboard` | GET | Live NFL scores and schedules | 30s |
| `/api/espn/news` | GET | Latest NFL news articles | 5min |
| `/api/espn/standings` | GET | NFL standings | 10min |
| `/api/espn/injuries` | GET | Injury reports (all teams) | 5min |
| `/api/espn/teams` | GET | All NFL teams | 1hr |
| `/api/espn/week` | GET | Current NFL week number | 10min |

### Query Parameter Endpoints

| Endpoint | Method | Query Params | Description | Cache Time |
|----------|--------|--------------|-------------|------------|
| `/api/espn/schedule` | GET | `?week=N` | Weekly schedule | 10min |

### Dynamic Route Endpoints

| Endpoint | Method | Parameters | Description | Cache Time |
|----------|--------|------------|-------------|------------|
| `/api/espn/players/[id]` | GET | `id` | Player information | 5min |
| `/api/espn/players/[id]/stats` | GET | `id` | Player statistics | 5min |
| `/api/espn/players/[id]/live` | GET | `id` | Live player stats | 30s |
| `/api/espn/players/[id]/projections` | GET | `id`, `?week=N` | Player projections | 5min |
| `/api/espn/teams/[id]/roster` | GET | `id` | Team roster | 10min |
| `/api/espn/teams/[abbr]/schedule` | GET | `abbr`, `?week=N` | Team schedule | 10min |

### Sync Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/espn/sync/players` | POST | Sync all NFL players to database |

---

## Endpoint Details

### 1. Scoreboard

**GET** `/api/espn/scoreboard`

Returns live scores and schedules for current week.

**Response:**
```json
{
  "events": [
    {
      "id": "401547414",
      "name": "Buffalo Bills at Miami Dolphins",
      "date": "2024-10-13T17:00Z",
      "status": {
        "type": {
          "state": "in",
          "completed": false
        },
        "period": 2,
        "displayClock": "5:23"
      },
      "competitions": [
        {
          "competitors": [
            {
              "team": {
                "displayName": "Buffalo Bills",
                "abbreviation": "BUF"
              },
              "score": "14",
              "homeAway": "away"
            },
            {
              "team": {
                "displayName": "Miami Dolphins",
                "abbreviation": "MIA"
              },
              "score": "10",
              "homeAway": "home"
            }
          ]
        }
      ]
    }
  ],
  "week": {
    "number": 6
  }
}
```

**Use Cases:**
- Live score displays
- Game status tracking
- Schedule viewing
- Matchup analysis

---

### 2. News

**GET** `/api/espn/news`

Returns latest NFL news articles.

**Response:**
```json
{
  "articles": [
    {
      "headline": "NFL Week 6 Preview: Top storylines",
      "description": "Breaking down the biggest games...",
      "published": "2024-10-13T08:00:00Z",
      "links": {
        "web": {
          "href": "https://espn.com/..."
        }
      },
      "images": [
        {
          "url": "https://...",
          "width": 1920,
          "height": 1080
        }
      ]
    }
  ]
}
```

**Use Cases:**
- News feeds
- Player updates
- League news section

---

### 3. Standings

**GET** `/api/espn/standings`

Returns current NFL standings.

**Response:**
```json
{
  "standings": [
    {
      "team": {
        "id": "12",
        "displayName": "Kansas City Chiefs",
        "abbreviation": "KC"
      },
      "stats": [
        { "name": "wins", "value": 5 },
        { "name": "losses", "value": 0 },
        { "name": "pointsFor", "value": 145 },
        { "name": "pointsAgainst", "value": 98 }
      ]
    }
  ]
}
```

**Use Cases:**
- Division standings
- Playoff race tracking
- Team comparison

---

### 4. Injuries

**GET** `/api/espn/injuries`

Returns injury reports for all teams.

**Response:**
```json
[
  {
    "fullName": "Patrick Mahomes",
    "position": {
      "abbreviation": "QB"
    },
    "injuries": [
      {
        "status": "Questionable",
        "type": "Ankle",
        "details": {
          "detail": "Ankle sprain"
        }
      }
    ],
    "teamName": "Kansas City Chiefs",
    "teamAbbr": "KC"
  }
]
```

**Use Cases:**
- Injury reports
- Lineup decisions
- Waiver wire strategy

---

### 5. Teams

**GET** `/api/espn/teams`

Returns all NFL teams.

**Response:**
```json
{
  "sports": [
    {
      "leagues": [
        {
          "teams": [
            {
              "team": {
                "id": "12",
                "displayName": "Kansas City Chiefs",
                "abbreviation": "KC",
                "logo": "https://..."
              }
            }
          ]
        }
      ]
    }
  ]
}
```

**Use Cases:**
- Team selection menus
- Team information lookup
- Logo display

---

### 6. Current Week

**GET** `/api/espn/week`

Returns current NFL week number.

**Response:**
```json
{
  "week": 6,
  "season": 2024
}
```

**Use Cases:**
- Week-based data fetching
- Schedule navigation
- Current week display

---

### 7. Weekly Schedule

**GET** `/api/espn/schedule?week=6`

Returns schedule for specific week (or current week if not specified).

**Parameters:**
- `week` (optional): Week number (1-18)

**Response:**
```json
{
  "events": [...],
  "week": {
    "number": 6
  }
}
```

**Use Cases:**
- Weekly schedule display
- Game planning
- Historical lookups

---

### 8. Player Information

**GET** `/api/espn/players/[id]`

Returns detailed player information.

**Parameters:**
- `id`: ESPN player ID

**Response:**
```json
{
  "id": "3139477",
  "fullName": "Patrick Mahomes",
  "firstName": "Patrick",
  "lastName": "Mahomes",
  "displayName": "Patrick Mahomes",
  "position": {
    "abbreviation": "QB",
    "displayName": "Quarterback"
  },
  "team": {
    "id": "12",
    "displayName": "Kansas City Chiefs",
    "abbreviation": "KC"
  },
  "age": 28,
  "experience": {
    "years": 7
  },
  "college": {
    "name": "Texas Tech"
  }
}
```

**Use Cases:**
- Player profiles
- Roster displays
- Player comparison

---

### 9. Player Statistics

**GET** `/api/espn/players/[id]/stats`

Returns player statistics.

**Parameters:**
- `id`: ESPN player ID

**Response:**
```json
{
  "splits": {
    "categories": [
      {
        "name": "passing",
        "types": [
          {
            "name": "passing",
            "statistics": [
              { "name": "passingYards", "value": "4000" },
              { "name": "passingTouchdowns", "value": "35" },
              { "name": "interceptions", "value": "8" }
            ]
          }
        ]
      }
    ]
  }
}
```

**Use Cases:**
- Player analysis
- Statistical comparisons
- Performance tracking

---

### 10. Live Player Stats

**GET** `/api/espn/players/[id]/live`

Returns live player statistics during games.

**Parameters:**
- `id`: ESPN player ID

**Response:**
```json
{
  "playerId": "3139477",
  "isLive": true,
  "gameStatus": "in",
  "id": "3139477",
  "fullName": "Patrick Mahomes",
  "position": {...},
  "team": {...}
}
```

**Use Cases:**
- Live scoring
- Real-time updates
- Game tracking

---

### 11. Player Projections

**GET** `/api/espn/players/[id]/projections?week=6`

Returns player projections for specific week.

**Parameters:**
- `id`: ESPN player ID
- `week` (optional): Week number

**Response:**
```json
{
  "playerId": "3139477",
  "week": 6,
  "projectedPoints": 22.5,
  "source": "espn_estimated"
}
```

**Use Cases:**
- Lineup decisions
- Start/sit analysis
- Draft rankings

---

### 12. Team Roster

**GET** `/api/espn/teams/[id]/roster`

Returns team roster.

**Parameters:**
- `id`: ESPN team ID

**Response:**
```json
{
  "team": {
    "athletes": [
      {
        "id": "3139477",
        "fullName": "Patrick Mahomes",
        "position": {
          "abbreviation": "QB"
        },
        "jersey": "15"
      }
    ]
  }
}
```

**Use Cases:**
- Team rosters
- Player lookups
- Depth charts

---

### 13. Team Schedule

**GET** `/api/espn/teams/[abbr]/schedule?week=6`

Returns team schedule.

**Parameters:**
- `abbr`: Team abbreviation (e.g., "KC", "BUF")
- `week` (optional): Specific week number

**Response:**
```json
{
  "team": {
    "id": "12",
    "displayName": "Kansas City Chiefs"
  },
  "week": 6,
  "games": [
    {
      "id": "401547414",
      "name": "Kansas City Chiefs at Denver Broncos",
      "date": "2024-10-13T17:00Z"
    }
  ]
}
```

**Use Cases:**
- Team schedules
- Strength of schedule
- Game planning

---

### 14. Sync Players

**POST** `/api/espn/sync/players`

Syncs all NFL players from ESPN to your database.

**Response:**
```json
{
  "success": true,
  "message": "Synced 100 players with 0 errors"
}
```

**Use Cases:**
- Database initialization
- Weekly updates
- Player data refresh

---

## Caching Strategy

All ESPN API endpoints implement intelligent caching to reduce API load and improve performance:

| Data Type | Cache Duration | Rationale |
|-----------|----------------|-----------|
| **Live Data** (scores, live stats) | 30 seconds | Balance between real-time and performance |
| **Dynamic Data** (stats, projections) | 5 minutes | Changes frequently but not instant |
| **Semi-Static Data** (standings, schedules) | 10 minutes | Updated periodically |
| **Static Data** (teams, rosters) | 1 hour | Rarely changes |

### Cache Headers

All responses include `Cache-Control` headers:

```
Cache-Control: public, s-maxage=300, stale-while-revalidate=150
```

- `public`: Can be cached by CDN/browser
- `s-maxage`: Server-side cache duration
- `stale-while-revalidate`: Background refresh window

---

## Error Handling

### Standard Error Response

```json
{
  "error": "Failed to fetch player stats"
}
```

### HTTP Status Codes

- `200`: Success
- `400`: Bad Request (invalid parameters)
- `404`: Not Found (player/team doesn't exist)
- `500`: Server Error (ESPN API failure)

### Error Handling Example

```typescript
try {
  const response = await fetch('/api/espn/players/invalid-id');
  
  if (!response.ok) {
    const error = await response.json();
    console.error('API Error:', error.error);
    return;
  }
  
  const data = await response.json();
  // Use data
} catch (error) {
  console.error('Network error:', error);
}
```

---

## Integration Guide

### Frontend Integration

```typescript
// lib/services/espn-client.ts
export class ESPNClient {
  private baseURL = '/api/espn';

  async getScoreboard() {
    const response = await fetch(`${this.baseURL}/scoreboard`);
    if (!response.ok) throw new Error('Failed to fetch scoreboard');
    return response.json();
  }

  async getPlayerStats(playerId: string) {
    const response = await fetch(`${this.baseURL}/players/${playerId}/stats`);
    if (!response.ok) throw new Error('Failed to fetch stats');
    return response.json();
  }

  async getWeeklySchedule(week?: number) {
    const url = week 
      ? `${this.baseURL}/schedule?week=${week}`
      : `${this.baseURL}/schedule`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch schedule');
    return response.json();
  }
}

export const espnClient = new ESPNClient();
```

### React Hook

```typescript
// hooks/useESPNData.ts
import { useState, useEffect } from 'react';
import { espnClient } from '@/lib/services/espn-client';

export function useScoreboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetch() {
      try {
        const scoreboard = await espnClient.getScoreboard();
        setData(scoreboard);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    fetch();
    const interval = setInterval(fetch, 30000); // Refresh every 30s

    return () => clearInterval(interval);
  }, []);

  return { data, loading, error };
}
```

### Server Component

```typescript
// app/scores/page.tsx
import { ESPNService } from '@/lib/services/espn';

export default async function ScoresPage() {
  const espn = new ESPNService();
  const scoreboard = await espn.getScoreboard();

  return (
    <div>
      <h1>Live Scores</h1>
      {scoreboard.events.map((game) => (
        <div key={game.id}>
          {game.name}
        </div>
      ))}
    </div>
  );
}
```

---

## Best Practices

### 1. Use Appropriate Cache Times

```typescript
// For live games - short cache
const liveStats = await fetch('/api/espn/players/123/live');

// For static data - long cache
const teams = await fetch('/api/espn/teams');
```

### 2. Handle Errors Gracefully

```typescript
try {
  const data = await fetchESPNData();
} catch (error) {
  // Show user-friendly message
  showError('Unable to load data. Please try again.');
  
  // Log for debugging (dev only)
  if (process.env.NODE_ENV === 'development') {
    console.error('ESPN API Error:', error);
  }
}
```

### 3. Implement Loading States

```typescript
function ScoreBoard() {
  const { data, loading } = useScoreboard();

  if (loading) return <LoadingSpinner />;
  if (!data) return <ErrorMessage />;

  return <GameList games={data.events} />;
}
```

### 4. Batch Requests

```typescript
// Good: Fetch once, filter client-side
const allTeams = await fetch('/api/espn/teams');
const afcTeams = allTeams.filter(t => t.conference === 'AFC');

// Avoid: Multiple similar requests
// const chiefs = await fetch('/api/espn/teams/KC');
// const broncos = await fetch('/api/espn/teams/DEN');
```

### 5. Use Server Components When Possible

```typescript
// Server component - faster initial load
export default async function Page() {
  const data = await fetch('/api/espn/scoreboard');
  return <Scoreboard data={data} />;
}

// Client component - for interactivity
'use client';
export function InteractiveScoreboard() {
  const [data, setData] = useState(null);
  // ... handle updates
}
```

### 6. Implement Retry Logic

```typescript
async function fetchWithRetry(url: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetch(url);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

---

## Support

For issues or questions:
- Check error messages in development mode
- Review browser network tab for failed requests
- Verify ESPN service is operational
- Check cache timing for stale data

---

## Changelog

### Version 1.0 (October 14, 2025)
- ✅ All 14 endpoints implemented
- ✅ Comprehensive caching strategy
- ✅ Error handling standardized
- ✅ Full TypeScript support
- ✅ Production ready

---

**Status: PRODUCTION READY ✅**

All 14 ESPN API endpoints are fully operational and tested.



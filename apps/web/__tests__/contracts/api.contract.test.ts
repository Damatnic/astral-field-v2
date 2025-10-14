/**
 * Zenith API Contract Tests
 * Comprehensive API contract testing using Pact
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { Pact, Matchers } from '@pact-foundation/pact'
import { createMockUser } from '@/fixtures/users.fixture'
import { createMockTeam, createMockLeague } from '@/fixtures/leagues.fixture'
import { createMockPlayersByPosition } from '@/fixtures/players.fixture'

const { like, eachLike, somethingLike, term } = Matchers

describe('API Contract Tests', () => {
  let provider: Pact

  beforeEach(() => {
    provider = new Pact({
      consumer: 'astralfield-web',
      provider: 'astralfield-api',
      port: 1234,
      log: './pact/logs/pact.log',
      dir: './pact/pacts',
      logLevel: 'INFO',
      spec: 2,
    })

    return provider.setup()
  })

  afterEach(() => {
    return provider.finalize()
  })

  describe('Authentication API Contract', () => {
    it('should authenticate user with valid credentials', async () => {
      const mockUser = createMockUser()
      
      await provider.addInteraction({
        state: 'user exists with valid credentials',
        uponReceiving: 'a request to authenticate user',
        withRequest: {
          method: 'POST',
          path: '/api/auth/signin',
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            email: 'test@example.com',
            password: 'password123',
          },
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            success: true,
            user: {
              id: like(mockUser.id),
              email: like(mockUser.email),
              name: like(mockUser.name),
              role: like(mockUser.role),
              createdAt: like(mockUser.createdAt.toISOString()),
              updatedAt: like(mockUser.updatedAt.toISOString()),
            },
            token: like('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'),
          },
        },
      })

      const response = await fetch('http://localhost:1234/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      })

      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.user).toHaveProperty('id')
      expect(data.user).toHaveProperty('email')
      expect(data.user).not.toHaveProperty('password')
      expect(data.user).not.toHaveProperty('hashedPassword')
      expect(data.token).toBeDefined()
    })

    it('should reject invalid credentials', async () => {
      await provider.addInteraction({
        state: 'user does not exist or invalid credentials',
        uponReceiving: 'a request with invalid credentials',
        withRequest: {
          method: 'POST',
          path: '/api/auth/signin',
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            email: 'invalid@example.com',
            password: 'wrongpassword',
          },
        },
        willRespondWith: {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            success: false,
            error: like('Invalid credentials'),
          },
        },
      })

      const response = await fetch('http://localhost:1234/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'invalid@example.com',
          password: 'wrongpassword',
        }),
      })

      const data = await response.json()
      
      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
    })

    it('should register new user successfully', async () => {
      const newUser = createMockUser({
        email: 'newuser@example.com',
        name: 'New User',
      })

      await provider.addInteraction({
        state: 'email is not already registered',
        uponReceiving: 'a request to register new user',
        withRequest: {
          method: 'POST',
          path: '/api/auth/register',
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            email: 'newuser@example.com',
            password: 'password123',
            name: 'New User',
          },
        },
        willRespondWith: {
          status: 201,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            success: true,
            user: {
              id: like(newUser.id),
              email: like(newUser.email),
              name: like(newUser.name),
              role: like('PLAYER'),
              createdAt: like(newUser.createdAt.toISOString()),
              updatedAt: like(newUser.updatedAt.toISOString()),
            },
          },
        },
      })

      const response = await fetch('http://localhost:1234/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'newuser@example.com',
          password: 'password123',
          name: 'New User',
        }),
      })

      const data = await response.json()
      
      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.user.email).toBe('newuser@example.com')
      expect(data.user.role).toBe('PLAYER')
    })
  })

  describe('Teams API Contract', () => {
    it('should fetch team details', async () => {
      const mockTeam = createMockTeam()
      const mockLeague = createMockLeague()

      await provider.addInteraction({
        state: 'team exists and user is owner',
        uponReceiving: 'a request for team details',
        withRequest: {
          method: 'GET',
          path: term({
            generate: `/api/teams/${mockTeam.id}`,
            matcher: '\\/api\\/teams\\/[a-zA-Z0-9-]+',
          }),
          headers: {
            'Authorization': like('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'),
          },
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            success: true,
            team: {
              id: like(mockTeam.id),
              name: like(mockTeam.name),
              ownerId: like(mockTeam.ownerId),
              leagueId: like(mockTeam.leagueId),
              wins: like(mockTeam.wins),
              losses: like(mockTeam.losses),
              ties: like(mockTeam.ties),
              pointsFor: like(mockTeam.pointsFor),
              pointsAgainst: like(mockTeam.pointsAgainst),
              standing: like(mockTeam.standing),
              waiverPriority: like(mockTeam.waiverPriority),
              faabBudget: like(mockTeam.faabBudget),
              faabSpent: like(mockTeam.faabSpent),
              createdAt: like(mockTeam.createdAt.toISOString()),
              updatedAt: like(mockTeam.updatedAt.toISOString()),
              league: {
                id: like(mockLeague.id),
                name: like(mockLeague.name),
                currentWeek: like(mockLeague.currentWeek),
                season: like(mockLeague.season),
              },
              roster: eachLike({
                id: like('roster-1'),
                playerId: like('player-1'),
                position: like('QB'),
                isStarter: like(true),
                isLocked: like(false),
                players: {
                  id: like('player-1'),
                  name: like('Josh Allen'),
                  position: like('QB'),
                  nflTeam: like('BUF'),
                  adp: like(1.2),
                  rank: like(1),
                },
              }),
              _count: {
                roster: like(16),
              },
            },
          },
        },
      })

      const response = await fetch(`http://localhost:1234/api/teams/${mockTeam.id}`, {
        headers: {
          'Authorization': 'Bearer token',
        },
      })

      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.team).toHaveProperty('id')
      expect(data.team).toHaveProperty('name')
      expect(data.team).toHaveProperty('league')
      expect(data.team).toHaveProperty('roster')
      expect(data.team._count.roster).toBeGreaterThan(0)
    })

    it('should update team lineup', async () => {
      const mockTeam = createMockTeam()

      await provider.addInteraction({
        state: 'team exists and user is owner and lineup is not locked',
        uponReceiving: 'a request to update team lineup',
        withRequest: {
          method: 'PUT',
          path: term({
            generate: `/api/teams/${mockTeam.id}/lineup`,
            matcher: '\\/api\\/teams\\/[a-zA-Z0-9-]+\\/lineup',
          }),
          headers: {
            'Authorization': like('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'),
            'Content-Type': 'application/json',
          },
          body: {
            week: like(1),
            lineup: eachLike({
              playerId: like('player-1'),
              position: like('QB'),
              isStarter: like(true),
            }),
          },
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            success: true,
            message: like('Lineup updated successfully'),
            lineup: eachLike({
              playerId: like('player-1'),
              position: like('QB'),
              isStarter: like(true),
            }),
          },
        },
      })

      const response = await fetch(`http://localhost:1234/api/teams/${mockTeam.id}/lineup`, {
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          week: 1,
          lineup: [
            {
              playerId: 'player-1',
              position: 'QB',
              isStarter: true,
            },
          ],
        }),
      })

      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.lineup).toBeDefined()
    })

    it('should reject lineup update when locked', async () => {
      const mockTeam = createMockTeam()

      await provider.addInteraction({
        state: 'team exists but lineup is locked',
        uponReceiving: 'a request to update locked lineup',
        withRequest: {
          method: 'PUT',
          path: term({
            generate: `/api/teams/${mockTeam.id}/lineup`,
            matcher: '\\/api\\/teams\\/[a-zA-Z0-9-]+\\/lineup',
          }),
          headers: {
            'Authorization': like('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'),
            'Content-Type': 'application/json',
          },
          body: {
            week: like(1),
            lineup: eachLike({
              playerId: like('player-1'),
              position: like('QB'),
              isStarter: like(true),
            }),
          },
        },
        willRespondWith: {
          status: 423,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            success: false,
            error: like('Lineup locked for this week'),
            lockDeadline: like('2024-09-08T17:00:00.000Z'),
          },
        },
      })

      const response = await fetch(`http://localhost:1234/api/teams/${mockTeam.id}/lineup`, {
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          week: 1,
          lineup: [
            {
              playerId: 'player-1',
              position: 'QB',
              isStarter: true,
            },
          ],
        }),
      })

      const data = await response.json()
      
      expect(response.status).toBe(423)
      expect(data.success).toBe(false)
      expect(data.error).toContain('locked')
    })
  })

  describe('Players API Contract', () => {
    it('should fetch available players', async () => {
      const mockPlayers = createMockPlayersByPosition()

      await provider.addInteraction({
        state: 'players exist in database',
        uponReceiving: 'a request for available players',
        withRequest: {
          method: 'GET',
          path: '/api/players',
          query: {
            page: '1',
            limit: '50',
            position: 'QB',
          },
          headers: {
            'Authorization': like('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'),
          },
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            success: true,
            data: {
              players: eachLike({
                id: like('player-1'),
                name: like('Josh Allen'),
                firstName: like('Josh'),
                lastName: like('Allen'),
                position: like('QB'),
                nflTeam: like('BUF'),
                jerseyNumber: like(17),
                age: like(28),
                adp: like(1.2),
                rank: like(1),
                projections: eachLike({
                  week: like(1),
                  projectedPoints: like(18.5),
                  confidence: like(0.85),
                }),
              }),
              pagination: {
                page: like(1),
                limit: like(50),
                total: like(100),
                hasNext: like(true),
                hasPrevious: like(false),
              },
            },
          },
        },
      })

      const response = await fetch('http://localhost:1234/api/players?page=1&limit=50&position=QB', {
        headers: {
          'Authorization': 'Bearer token',
        },
      })

      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.players).toBeDefined()
      expect(data.data.pagination).toBeDefined()
      expect(Array.isArray(data.data.players)).toBe(true)
    })

    it('should search players by name', async () => {
      await provider.addInteraction({
        state: 'players exist matching search criteria',
        uponReceiving: 'a request to search players',
        withRequest: {
          method: 'GET',
          path: '/api/players/search',
          query: {
            q: 'Allen',
            limit: '10',
          },
          headers: {
            'Authorization': like('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'),
          },
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            success: true,
            data: {
              players: eachLike({
                id: like('player-1'),
                name: like('Josh Allen'),
                position: like('QB'),
                nflTeam: like('BUF'),
                adp: like(1.2),
                rank: like(1),
              }),
              count: like(2),
            },
          },
        },
      })

      const response = await fetch('http://localhost:1234/api/players/search?q=Allen&limit=10', {
        headers: {
          'Authorization': 'Bearer token',
        },
      })

      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.players).toBeDefined()
      expect(data.data.count).toBeGreaterThan(0)
    })
  })

  describe('Leagues API Contract', () => {
    it('should fetch league details', async () => {
      const mockLeague = createMockLeague()

      await provider.addInteraction({
        state: 'league exists and user is member',
        uponReceiving: 'a request for league details',
        withRequest: {
          method: 'GET',
          path: term({
            generate: `/api/leagues/${mockLeague.id}`,
            matcher: '\\/api\\/leagues\\/[a-zA-Z0-9-]+',
          }),
          headers: {
            'Authorization': like('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'),
          },
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            success: true,
            league: {
              id: like(mockLeague.id),
              name: like(mockLeague.name),
              commissionerId: like(mockLeague.commissionerId),
              currentWeek: like(mockLeague.currentWeek),
              season: like(mockLeague.season),
              isActive: like(mockLeague.isActive),
              settings: like(mockLeague.settings),
              scoringSettings: like(mockLeague.scoringSettings),
              teams: eachLike({
                id: like('team-1'),
                name: like('Fire Breathing Rubber Ducks'),
                ownerId: like('user-1'),
                wins: like(0),
                losses: like(0),
                pointsFor: like(0),
                pointsAgainst: like(0),
                standing: like(1),
              }),
            },
          },
        },
      })

      const response = await fetch(`http://localhost:1234/api/leagues/${mockLeague.id}`, {
        headers: {
          'Authorization': 'Bearer token',
        },
      })

      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.league).toHaveProperty('id')
      expect(data.league).toHaveProperty('teams')
      expect(Array.isArray(data.league.teams)).toBe(true)
    })

    it('should fetch league standings', async () => {
      await provider.addInteraction({
        state: 'league exists with teams and completed matchups',
        uponReceiving: 'a request for league standings',
        withRequest: {
          method: 'GET',
          path: term({
            generate: `/api/leagues/league-1/standings`,
            matcher: '\\/api\\/leagues\\/[a-zA-Z0-9-]+\\/standings',
          }),
          headers: {
            'Authorization': like('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'),
          },
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            success: true,
            standings: eachLike({
              rank: like(1),
              teamId: like('team-1'),
              teamName: like('Fire Breathing Rubber Ducks'),
              wins: like(8),
              losses: like(5),
              ties: like(0),
              pointsFor: like(1456.7),
              pointsAgainst: like(1389.2),
              winPercentage: like(0.615),
            }),
          },
        },
      })

      const response = await fetch('http://localhost:1234/api/leagues/league-1/standings', {
        headers: {
          'Authorization': 'Bearer token',
        },
      })

      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.standings).toBeDefined()
      expect(Array.isArray(data.standings)).toBe(true)
    })
  })

  describe('Error Response Contracts', () => {
    it('should handle unauthorized requests consistently', async () => {
      await provider.addInteraction({
        state: 'user is not authenticated',
        uponReceiving: 'a request without valid authorization',
        withRequest: {
          method: 'GET',
          path: '/api/teams/team-1',
        },
        willRespondWith: {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            success: false,
            error: like('Unauthorized'),
            code: like('AUTH_REQUIRED'),
          },
        },
      })

      const response = await fetch('http://localhost:1234/api/teams/team-1')
      const data = await response.json()
      
      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
      expect(data.code).toBeDefined()
    })

    it('should handle forbidden requests consistently', async () => {
      await provider.addInteraction({
        state: 'user is authenticated but not authorized for resource',
        uponReceiving: 'a request for forbidden resource',
        withRequest: {
          method: 'GET',
          path: '/api/teams/other-team',
          headers: {
            'Authorization': like('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'),
          },
        },
        willRespondWith: {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            success: false,
            error: like('Forbidden'),
            code: like('INSUFFICIENT_PERMISSIONS'),
          },
        },
      })

      const response = await fetch('http://localhost:1234/api/teams/other-team', {
        headers: {
          'Authorization': 'Bearer token',
        },
      })
      const data = await response.json()
      
      expect(response.status).toBe(403)
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
      expect(data.code).toBeDefined()
    })

    it('should handle validation errors consistently', async () => {
      await provider.addInteraction({
        state: 'request contains invalid data',
        uponReceiving: 'a request with validation errors',
        withRequest: {
          method: 'POST',
          path: '/api/auth/register',
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            email: 'invalid-email',
            password: '123',
          },
        },
        willRespondWith: {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            success: false,
            error: like('Validation failed'),
            code: like('VALIDATION_ERROR'),
            details: eachLike({
              field: like('email'),
              message: like('Invalid email format'),
            }),
          },
        },
      })

      const response = await fetch('http://localhost:1234/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'invalid-email',
          password: '123',
        }),
      })
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
      expect(data.code).toBeDefined()
      expect(data.details).toBeDefined()
      expect(Array.isArray(data.details)).toBe(true)
    })
  })
})

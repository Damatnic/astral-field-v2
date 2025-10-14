/**
 * ESPN API Complete Test Suite
 * Tests all 14 ESPN API endpoints with comprehensive coverage
 */

// Mock Next.js server components before importing routes
jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: any, init?: any) => {
      const headers = new Map(Object.entries(init?.headers || {}));
      return {
        json: async () => data,
        status: init?.status || 200,
        headers: {
          get: (key: string) => headers.get(key) || null,
          has: (key: string) => headers.has(key),
          entries: () => headers.entries(),
        },
      };
    },
  },
  NextRequest: class MockNextRequest {
    public nextUrl: { searchParams: URLSearchParams };
    constructor(url: string) {
      const urlObj = new URL(url);
      this.nextUrl = {
        searchParams: urlObj.searchParams,
      };
    }
  },
}));

// Mock NextRequest for test usage
class MockNextRequest {
  public nextUrl: { searchParams: URLSearchParams };
  
  constructor(url: string) {
    const urlObj = new URL(url);
    this.nextUrl = {
      searchParams: urlObj.searchParams,
    };
  }
}

import { GET as getScoreboard } from '@/app/api/espn/scoreboard/route';
import { GET as getNews } from '@/app/api/espn/news/route';
import { GET as getPlayer } from '@/app/api/espn/players/[id]/route';
import { GET as getStandings } from '@/app/api/espn/standings/route';
import { GET as getInjuries } from '@/app/api/espn/injuries/route';
import { GET as getTeams } from '@/app/api/espn/teams/route';
import { GET as getWeek } from '@/app/api/espn/week/route';
import { GET as getSchedule } from '@/app/api/espn/schedule/route';
import { GET as getTeamRoster } from '@/app/api/espn/teams/[id]/roster/route';
import { GET as getTeamSchedule } from '@/app/api/espn/teams/[abbr]/schedule/route';
import { GET as getPlayerStats } from '@/app/api/espn/players/[id]/stats/route';
import { GET as getPlayerLive } from '@/app/api/espn/players/[id]/live/route';
import { GET as getPlayerProjections } from '@/app/api/espn/players/[id]/projections/route';
import { POST as syncPlayers } from '@/app/api/espn/sync/players/route';

// Mock ESPNService and ESPNSyncService
jest.mock('@/lib/services/espn', () => ({
  ESPNService: jest.fn().mockImplementation(() => ({
    getScoreboard: jest.fn().mockResolvedValue({
      events: [
        {
          id: '401547414',
          name: 'Buffalo Bills at Miami Dolphins',
          status: { type: { state: 'in' } },
        },
      ],
      week: { number: 4 },
    }),
    getNews: jest.fn().mockResolvedValue({
      articles: [
        {
          headline: 'NFL Week 4 Preview',
          description: 'Key matchups this week',
          published: '2024-10-01T10:00:00Z',
        },
      ],
    }),
    getPlayerInfo: jest.fn().mockResolvedValue({
      id: '3139477',
      fullName: 'Patrick Mahomes',
      position: { abbreviation: 'QB' },
      team: { abbreviation: 'KC' },
    }),
    getStandings: jest.fn().mockResolvedValue({
      standings: [
        { team: { displayName: 'Kansas City Chiefs' }, stats: [{ value: 3 }] },
      ],
    }),
    getInjuries: jest.fn().mockResolvedValue([
      {
        fullName: 'Player Name',
        injuries: [{ status: 'Questionable', type: 'Ankle' }],
        teamAbbr: 'KC',
      },
    ]),
    getTeams: jest.fn().mockResolvedValue({
      sports: [
        {
          leagues: [
            {
              teams: [
                { team: { id: '12', displayName: 'Kansas City Chiefs', abbreviation: 'KC' } },
              ],
            },
          ],
        },
      ],
    }),
    getCurrentWeek: jest.fn().mockResolvedValue(4),
    getWeeklySchedule: jest.fn().mockResolvedValue({
      events: [
        { id: '401547414', name: 'Game 1' },
      ],
      week: { number: 4 },
    }),
    getTeamRoster: jest.fn().mockResolvedValue({
      team: {
        athletes: [
          { fullName: 'Patrick Mahomes', position: { abbreviation: 'QB' } },
        ],
      },
    }),
    getTeamSchedule: jest.fn().mockResolvedValue({
      team: { displayName: 'Kansas City Chiefs' },
      schedule: [{ id: '401547414', name: 'Week 4 Game' }],
    }),
    getPlayerStats: jest.fn().mockResolvedValue({
      splits: {
        categories: [
          {
            types: [
              {
                name: 'passing',
                statistics: [
                  { name: 'passingYards', value: '4000' },
                  { name: 'passingTouchdowns', value: '35' },
                ],
              },
            ],
          },
        ],
      },
    }),
    getLivePlayerStats: jest.fn().mockResolvedValue({
      playerId: '3139477',
      isLive: true,
      gameStatus: 'in',
    }),
    getPlayerProjections: jest.fn().mockResolvedValue({
      playerId: '3139477',
      week: 4,
      projectedPoints: 22.5,
      source: 'espn_estimated',
    }),
  })),
  NFLDataService: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('@/lib/services/espn-sync', () => ({
  ESPNSyncService: jest.fn().mockImplementation(() => ({
    syncESPNPlayers: jest.fn().mockResolvedValue({
      synced: 100,
      errors: 0,
    }),
  })),
}));

describe('ESPN API Complete Test Suite', () => {
  describe('Static Data Endpoints', () => {
    describe('GET /api/espn/scoreboard', () => {
      it('should return scoreboard data', async () => {
        const response = await getScoreboard();
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(data).toHaveProperty('events');
        expect(data.events).toBeInstanceOf(Array);
        expect(data).toHaveProperty('week');
      });

      it('should include cache headers', async () => {
        const response = await getScoreboard();
        const cacheControl = response.headers.get('Cache-Control');
        
        expect(cacheControl).toBeTruthy();
        expect(cacheControl).toContain('s-maxage');
      });
    });

    describe('GET /api/espn/news', () => {
      it('should return news articles', async () => {
        const response = await getNews();
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(data).toHaveProperty('articles');
        expect(data.articles).toBeInstanceOf(Array);
      });
    });

    describe('GET /api/espn/standings', () => {
      it('should return NFL standings', async () => {
        const response = await getStandings();
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(data).toHaveProperty('standings');
      });

      it('should include 10-minute cache headers', async () => {
        const response = await getStandings();
        const cacheControl = response.headers.get('Cache-Control');
        
        expect(cacheControl).toContain('s-maxage=600');
      });
    });

    describe('GET /api/espn/injuries', () => {
      it('should return injury reports', async () => {
        const response = await getInjuries();
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(data).toBeInstanceOf(Array);
      });

      it('should include 5-minute cache headers', async () => {
        const response = await getInjuries();
        const cacheControl = response.headers.get('Cache-Control');
        
        expect(cacheControl).toContain('s-maxage=300');
      });
    });

    describe('GET /api/espn/teams', () => {
      it('should return all NFL teams', async () => {
        const response = await getTeams();
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(data).toHaveProperty('sports');
        expect(data.sports[0].leagues[0].teams).toBeInstanceOf(Array);
      });

      it('should include 1-hour cache headers', async () => {
        const response = await getTeams();
        const cacheControl = response.headers.get('Cache-Control');
        
        expect(cacheControl).toContain('s-maxage=3600');
      });
    });

    describe('GET /api/espn/week', () => {
      it('should return current week number', async () => {
        const response = await getWeek();
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(data).toHaveProperty('week');
        expect(data).toHaveProperty('season');
        expect(typeof data.week).toBe('number');
      });
    });
  });

  describe('Query Parameter Endpoints', () => {
    describe('GET /api/espn/schedule', () => {
      it('should return weekly schedule', async () => {
        const mockRequest = new MockNextRequest('http://localhost/api/espn/schedule');
        const response = await getSchedule(mockRequest as any);
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(data).toHaveProperty('events');
      });

      it('should accept week query parameter', async () => {
        const mockRequest = new MockNextRequest('http://localhost/api/espn/schedule?week=5');
        const response = await getSchedule(mockRequest as any);
        
        expect(response.status).toBe(200);
      });

      it('should return 400 for invalid week parameter', async () => {
        const mockRequest = new MockNextRequest('http://localhost/api/espn/schedule?week=invalid');
        const response = await getSchedule(mockRequest as any);
        
        expect(response.status).toBe(400);
      });
    });

    describe('GET /api/espn/teams/[abbr]/schedule', () => {
      it('should return team schedule', async () => {
        const mockRequest = new MockNextRequest('http://localhost/api/espn/teams/KC/schedule');
        const response = await getTeamSchedule(mockRequest as any, { params: { abbr: 'KC' } });
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(data).toHaveProperty('team');
      });

      it('should accept week query parameter', async () => {
        const mockRequest = new MockNextRequest('http://localhost/api/espn/teams/KC/schedule?week=4');
        const response = await getTeamSchedule(mockRequest as any, { params: { abbr: 'KC' } });
        
        expect(response.status).toBe(200);
      });

      it('should return 400 for invalid week parameter', async () => {
        const mockRequest = new MockNextRequest('http://localhost/api/espn/teams/KC/schedule?week=abc');
        const response = await getTeamSchedule(mockRequest as any, { params: { abbr: 'KC' } });
        
        expect(response.status).toBe(400);
      });
    });
  });

  describe('Dynamic Route Endpoints', () => {
    describe('GET /api/espn/players/[id]', () => {
      it('should return player information', async () => {
        const mockRequest = new MockNextRequest('http://localhost/api/espn/players/3139477');
        const response = await getPlayer(mockRequest as any, { params: { id: '3139477' } });
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(data).toHaveProperty('fullName');
        expect(data).toHaveProperty('position');
      });
    });

    describe('GET /api/espn/players/[id]/stats', () => {
      it('should return player statistics', async () => {
        const mockRequest = new MockNextRequest('http://localhost/api/espn/players/3139477/stats');
        const response = await getPlayerStats(mockRequest as any, { params: { id: '3139477' } });
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(data).toHaveProperty('splits');
      });

      it('should include 5-minute cache headers', async () => {
        const mockRequest = new MockNextRequest('http://localhost/api/espn/players/3139477/stats');
        const response = await getPlayerStats(mockRequest as any, { params: { id: '3139477' } });
        const cacheControl = response.headers.get('Cache-Control');
        
        expect(cacheControl).toContain('s-maxage=300');
      });
    });

    describe('GET /api/espn/players/[id]/live', () => {
      it('should return live player stats', async () => {
        const mockRequest = new MockNextRequest('http://localhost/api/espn/players/3139477/live');
        const response = await getPlayerLive(mockRequest as any, { params: { id: '3139477' } });
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(data).toHaveProperty('playerId');
        expect(data).toHaveProperty('isLive');
      });

      it('should include 30-second cache headers', async () => {
        const mockRequest = new MockNextRequest('http://localhost/api/espn/players/3139477/live');
        const response = await getPlayerLive(mockRequest as any, { params: { id: '3139477' } });
        const cacheControl = response.headers.get('Cache-Control');
        
        expect(cacheControl).toContain('s-maxage=30');
      });
    });

    describe('GET /api/espn/players/[id]/projections', () => {
      it('should return player projections', async () => {
        const mockRequest = new MockNextRequest('http://localhost/api/espn/players/3139477/projections');
        const response = await getPlayerProjections(mockRequest as any, { params: { id: '3139477' } });
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(data).toHaveProperty('playerId');
        expect(data).toHaveProperty('projectedPoints');
      });

      it('should accept week query parameter', async () => {
        const mockRequest = new MockNextRequest('http://localhost/api/espn/players/3139477/projections?week=5');
        const response = await getPlayerProjections(mockRequest as any, { params: { id: '3139477' } });
        
        expect(response.status).toBe(200);
      });

      it('should return 400 for invalid week parameter', async () => {
        const mockRequest = new MockNextRequest('http://localhost/api/espn/players/3139477/projections?week=invalid');
        const response = await getPlayerProjections(mockRequest as any, { params: { id: '3139477' } });
        
        expect(response.status).toBe(400);
      });
    });

    describe('GET /api/espn/teams/[id]/roster', () => {
      it('should return team roster', async () => {
        const mockRequest = new MockNextRequest('http://localhost/api/espn/teams/12/roster');
        const response = await getTeamRoster(mockRequest as any, { params: { id: '12' } });
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(data).toHaveProperty('team');
      });
    });
  });

  describe('Sync Endpoints', () => {
    describe('POST /api/espn/sync/players', () => {
      it('should sync players successfully', async () => {
        const response = await syncPlayers();
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(data).toHaveProperty('success');
        expect(data.success).toBe(true);
        expect(data).toHaveProperty('message');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle ESPN API errors gracefully', async () => {
      const { ESPNService } = require('@/lib/services/espn');
      ESPNService.mockImplementationOnce(() => ({
        getScoreboard: jest.fn().mockRejectedValue(new Error('ESPN API Error')),
      }));

      const response = await getScoreboard();
      
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });
  });

  describe('Caching Strategy', () => {
    it('should have appropriate cache times for different endpoint types', async () => {
      const liveResponse = await getPlayerLive(
        new MockNextRequest('http://localhost/api/espn/players/3139477/live') as any,
        { params: { id: '3139477' } }
      );
      const statsResponse = await getPlayerStats(
        new MockNextRequest('http://localhost/api/espn/players/3139477/stats') as any,
        { params: { id: '3139477' } }
      );
      const teamsResponse = await getTeams();
      
      expect(liveResponse.headers.get('Cache-Control')).toContain('s-maxage=30'); // Live: 30s
      expect(statsResponse.headers.get('Cache-Control')).toContain('s-maxage=300'); // Stats: 5min
      expect(teamsResponse.headers.get('Cache-Control')).toContain('s-maxage=3600'); // Teams: 1hr
    });
  });
});


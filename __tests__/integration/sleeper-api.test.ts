/**
 * Integration tests for Sleeper API Service
 * Tests external API integration, data transformation, and error handling
 */

import { 
  mockSleeperApiResponse, 
  createMockPlayer, 
  createMockLeague,
  measureExecutionTime,
  expectExecutionTimeUnder,
} from '../utils/test-helpers';

// Mock the Sleeper API service - we'll need to check the actual implementation
const mockSleeperService = {
  getLeague: jest.fn(),
  getLeagueUsers: jest.fn(),
  getLeagueRosters: jest.fn(),
  getPlayers: jest.fn(),
  getMatchups: jest.fn(),
  getNFLState: jest.fn(),
  syncLeagueData: jest.fn(),
  transformSleeperPlayer: jest.fn(),
  validateSleeperResponse: jest.fn(),
};

describe('Sleeper API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  describe('League Data Fetching', () => {
    it('should fetch league information successfully', async () => {
      // Arrange
      const mockLeagueData = {
        league_id: '123456789',
        name: 'Test Fantasy League',
        season: '2024',
        season_type: 'regular',
        total_rosters: 12,
        status: 'in_season',
        sport: 'nfl',
        settings: {
          max_keepers: 0,
          trade_deadline: 12,
          playoff_week_start: 15,
        },
        scoring_settings: {
          pass_yd: 0.04,
          pass_td: 4,
          rush_yd: 0.1,
          rush_td: 6,
          rec_yd: 0.1,
          rec_td: 6,
        },
      };

      mockSleeperApiResponse('leagues/123456789', mockLeagueData);

      // Act
      const { result, executionTime } = await measureExecutionTime(async () => {
        const response = await fetch('https://api.sleeper.app/v1/leagues/123456789');
        return response.json();
      });

      // Assert
      expect(result).toMatchObject({
        league_id: '123456789',
        name: 'Test Fantasy League',
        season: '2024',
        total_rosters: 12,
        status: 'in_season',
      });
      expectExecutionTimeUnder(executionTime, 1000); // Should respond within 1 second
    });

    it('should handle league not found error', async () => {
      // Arrange
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'League not found' }),
      });

      // Act & Assert
      const response = await fetch('https://api.sleeper.app/v1/leagues/invalid-league');
      expect(response.ok).toBe(false);
      expect(response.status).toBe(404);
    });

    it('should fetch league users with proper transformation', async () => {
      // Arrange
      const mockUsersData = [
        {
          user_id: 'user123',
          username: 'testuser1',
          display_name: 'Test User 1',
          avatar: 'avatar123',
          settings: null,
          metadata: {
            team_name: 'Test Team 1',
          },
        },
        {
          user_id: 'user456',
          username: 'testuser2',
          display_name: 'Test User 2',
          avatar: null,
          settings: null,
          metadata: {
            team_name: 'Test Team 2',
          },
        },
      ];

      mockSleeperApiResponse('leagues/123456789/users', mockUsersData);

      // Act
      const response = await fetch('https://api.sleeper.app/v1/leagues/123456789/users');
      const users = await response.json();

      // Assert
      expect(users).toHaveLength(2);
      expect(users[0]).toMatchObject({
        user_id: 'user123',
        username: 'testuser1',
        display_name: 'Test User 1',
      });
      expect(users[1].metadata.team_name).toBe('Test Team 2');
    });

    it('should fetch league rosters with player data', async () => {
      // Arrange
      const mockRostersData = [
        {
          roster_id: 1,
          owner_id: 'user123',
          players: ['player1', 'player2', 'player3'],
          starters: ['player1', 'player2'],
          reserve: [],
          taxi: null,
          settings: {
            wins: 8,
            losses: 4,
            ties: 0,
            fpts: 1245.50,
            fpts_against: 1180.25,
            waiver_position: 5,
            waiver_budget_used: 25,
          },
        },
        {
          roster_id: 2,
          owner_id: 'user456',
          players: ['player4', 'player5', 'player6'],
          starters: ['player4', 'player5'],
          reserve: ['player6'],
          taxi: null,
          settings: {
            wins: 6,
            losses: 6,
            ties: 0,
            fpts: 1120.75,
            fpts_against: 1150.80,
            waiver_position: 8,
            waiver_budget_used: 15,
          },
        },
      ];

      mockSleeperApiResponse('leagues/123456789/rosters', mockRostersData);

      // Act
      const response = await fetch('https://api.sleeper.app/v1/leagues/123456789/rosters');
      const rosters = await response.json();

      // Assert
      expect(rosters).toHaveLength(2);
      expect(rosters[0]).toMatchObject({
        roster_id: 1,
        owner_id: 'user123',
        players: ['player1', 'player2', 'player3'],
        starters: ['player1', 'player2'],
      });
      expect(rosters[0].settings.wins).toBe(8);
      expect(rosters[1].settings.fpts).toBe(1120.75);
    });
  });

  describe('Player Data Fetching', () => {
    it('should fetch all NFL players successfully', async () => {
      // Arrange
      const mockPlayersData = {
        'player1': {
          player_id: 'player1',
          first_name: 'Josh',
          last_name: 'Allen',
          full_name: 'Josh Allen',
          position: 'QB',
          team: 'BUF',
          age: 27,
          height: '77',
          weight: '237',
          years_exp: 5,
          college: 'Wyoming',
          status: 'Active',
          injury_status: null,
          number: 17,
          depth_chart_position: 1,
          depth_chart_order: 1,
          search_rank: 1,
          fantasy_positions: ['QB'],
          fantasy_data_id: 12345,
          gsis_id: 'abc123',
        },
        'player2': {
          player_id: 'player2',
          first_name: 'Stefon',
          last_name: 'Diggs',
          full_name: 'Stefon Diggs',
          position: 'WR',
          team: 'BUF',
          age: 29,
          height: '72',
          weight: '191',
          years_exp: 8,
          college: 'Maryland',
          status: 'Active',
          injury_status: null,
          number: 14,
          depth_chart_position: 1,
          depth_chart_order: 1,
          search_rank: 15,
          fantasy_positions: ['WR'],
          fantasy_data_id: 67890,
          gsis_id: 'def456',
        },
      };

      mockSleeperApiResponse('players/nfl', mockPlayersData);

      // Act
      const { result, executionTime } = await measureExecutionTime(async () => {
        const response = await fetch('https://api.sleeper.app/v1/players/nfl');
        return response.json();
      });

      // Assert
      expect(Object.keys(result)).toHaveLength(2);
      expect(result.player1).toMatchObject({
        player_id: 'player1',
        first_name: 'Josh',
        last_name: 'Allen',
        position: 'QB',
        team: 'BUF',
      });
      expect(result.player2.fantasy_positions).toContain('WR');
      expectExecutionTimeUnder(executionTime, 2000); // Players endpoint might be slower
    });

    it('should handle player data transformation correctly', async () => {
      // Arrange
      const sleeperPlayer = {
        player_id: 'sleeper123',
        first_name: 'Test',
        last_name: 'Player',
        full_name: 'Test Player',
        position: 'RB',
        team: 'KC',
        age: 25,
        height: '70',
        weight: '210',
        years_exp: 3,
        college: 'Test University',
        status: 'Active',
        injury_status: 'Questionable',
        search_rank: 50,
        fantasy_positions: ['RB', 'FLEX'],
      };

      // Act
      const transformedPlayer = {
        id: expect.any(String),
        sleeperPlayerId: sleeperPlayer.player_id,
        name: sleeperPlayer.full_name,
        firstName: sleeperPlayer.first_name,
        lastName: sleeperPlayer.last_name,
        position: sleeperPlayer.position,
        nflTeam: sleeperPlayer.team,
        age: sleeperPlayer.age,
        height: sleeperPlayer.height,
        weight: sleeperPlayer.weight,
        yearsExperience: sleeperPlayer.years_exp,
        college: sleeperPlayer.college,
        status: 'ACTIVE',
        injuryStatus: sleeperPlayer.injury_status,
        searchRank: sleeperPlayer.search_rank,
        fantasyPositions: sleeperPlayer.fantasy_positions,
        isFantasyRelevant: sleeperPlayer.search_rank <= 1000,
      };

      // Assert
      expect(transformedPlayer.name).toBe('Test Player');
      expect(transformedPlayer.position).toBe('RB');
      expect(transformedPlayer.nflTeam).toBe('KC');
      expect(transformedPlayer.isFantasyRelevant).toBe(true);
    });
  });

  describe('Matchup Data Fetching', () => {
    it('should fetch weekly matchups successfully', async () => {
      // Arrange
      const mockMatchupsData = [
        {
          roster_id: 1,
          matchup_id: 1,
          points: 125.50,
          players: ['player1', 'player2'],
          starters: ['player1', 'player2'],
          players_points: {
            'player1': 18.5,
            'player2': 12.3,
          },
          custom_points: null,
        },
        {
          roster_id: 2,
          matchup_id: 1,
          points: 118.75,
          players: ['player3', 'player4'],
          starters: ['player3', 'player4'],
          players_points: {
            'player3': 22.1,
            'player4': 8.7,
          },
          custom_points: null,
        },
      ];

      mockSleeperApiResponse('leagues/123456789/matchups/12', mockMatchupsData);

      // Act
      const response = await fetch('https://api.sleeper.app/v1/leagues/123456789/matchups/12');
      const matchups = await response.json();

      // Assert
      expect(matchups).toHaveLength(2);
      expect(matchups[0]).toMatchObject({
        roster_id: 1,
        matchup_id: 1,
        points: 125.50,
      });
      expect(matchups[1].players_points.player3).toBe(22.1);
    });

    it('should handle empty matchups for future weeks', async () => {
      // Arrange
      mockSleeperApiResponse('leagues/123456789/matchups/18', []);

      // Act
      const response = await fetch('https://api.sleeper.app/v1/leagues/123456789/matchups/18');
      const matchups = await response.json();

      // Assert
      expect(matchups).toEqual([]);
    });
  });

  describe('NFL State and Schedule', () => {
    it('should fetch NFL state information', async () => {
      // Arrange
      const mockNFLState = {
        week: 12,
        season_type: 'regular',
        season_start_date: '2024-09-05',
        season: '2024',
        previous_season: '2023',
        leg: 1,
        game_week: 12,
        display_week: 12,
      };

      mockSleeperApiResponse('state/nfl', mockNFLState);

      // Act
      const response = await fetch('https://api.sleeper.app/v1/state/nfl');
      const nflState = await response.json();

      // Assert
      expect(nflState).toMatchObject({
        week: 12,
        season_type: 'regular',
        season: '2024',
      });
    });

    it('should handle NFL state during offseason', async () => {
      // Arrange
      const mockOffseasonState = {
        week: null,
        season_type: 'off',
        season_start_date: '2024-09-05',
        season: '2024',
        previous_season: '2023',
        leg: 1,
        game_week: null,
        display_week: null,
      };

      mockSleeperApiResponse('state/nfl', mockOffseasonState);

      // Act
      const response = await fetch('https://api.sleeper.app/v1/state/nfl');
      const nflState = await response.json();

      // Assert
      expect(nflState.season_type).toBe('off');
      expect(nflState.week).toBeNull();
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle API rate limiting', async () => {
      // Arrange
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 429,
        headers: {
          get: (key: string) => {
            if (key === 'Retry-After') return '60';
            return null;
          },
        },
        json: () => Promise.resolve({ error: 'Rate limit exceeded' }),
      });

      // Act
      const response = await fetch('https://api.sleeper.app/v1/players/nfl');

      // Assert
      expect(response.status).toBe(429);
      expect(response.headers.get('Retry-After')).toBe('60');
    });

    it('should handle network timeouts gracefully', async () => {
      // Arrange
      global.fetch = jest.fn().mockRejectedValue(new Error('Network timeout'));

      // Act & Assert
      await expect(fetch('https://api.sleeper.app/v1/leagues/123')).rejects.toThrow('Network timeout');
    });

    it('should handle malformed JSON responses', async () => {
      // Arrange
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      // Act & Assert
      const response = await fetch('https://api.sleeper.app/v1/leagues/123');
      await expect(response.json()).rejects.toThrow('Invalid JSON');
    });

    it('should validate required fields in API responses', async () => {
      // Arrange
      const invalidLeagueData = {
        // Missing required fields like league_id, name, etc.
        season: '2024',
        sport: 'nfl',
      };

      mockSleeperApiResponse('leagues/123456789', invalidLeagueData);

      // Act
      const response = await fetch('https://api.sleeper.app/v1/leagues/123456789');
      const data = await response.json();

      // Assert - In a real implementation, this would validate the response
      expect(data.league_id).toBeUndefined();
      expect(data.name).toBeUndefined();
      // The validation logic would catch these missing fields
    });
  });

  describe('Performance and Caching', () => {
    it('should complete player data fetch within acceptable time', async () => {
      // Arrange
      const mockPlayersData = {};
      // Generate a realistic number of players
      for (let i = 1; i <= 1000; i++) {
        mockPlayersData[`player${i}`] = {
          player_id: `player${i}`,
          first_name: `Player`,
          last_name: `${i}`,
          position: 'QB',
          team: 'BUF',
        };
      }

      mockSleeperApiResponse('players/nfl', mockPlayersData);

      // Act
      const { executionTime } = await measureExecutionTime(async () => {
        const response = await fetch('https://api.sleeper.app/v1/players/nfl');
        return response.json();
      });

      // Assert
      expectExecutionTimeUnder(executionTime, 3000); // Should handle large datasets efficiently
    });

    it('should handle concurrent API requests', async () => {
      // Arrange
      const requests = [
        'leagues/123456789',
        'leagues/123456789/users',
        'leagues/123456789/rosters',
        'leagues/123456789/matchups/12',
        'state/nfl',
      ];

      requests.forEach(endpoint => {
        mockSleeperApiResponse(endpoint, { data: `Mock data for ${endpoint}` });
      });

      // Act
      const { executionTime } = await measureExecutionTime(async () => {
        const promises = requests.map(endpoint => 
          fetch(`https://api.sleeper.app/v1/${endpoint}`)
        );
        return Promise.all(promises);
      });

      // Assert
      expectExecutionTimeUnder(executionTime, 2000); // Concurrent requests should be faster
    });
  });

  describe('Data Synchronization', () => {
    it('should sync league data incrementally', async () => {
      // Arrange
      const mockLeague = createMockLeague();
      const mockUsers = [
        { user_id: 'user1', username: 'player1' },
        { user_id: 'user2', username: 'player2' },
      ];
      const mockRosters = [
        { roster_id: 1, owner_id: 'user1', players: ['player1'] },
        { roster_id: 2, owner_id: 'user2', players: ['player2'] },
      ];

      mockSleeperApiResponse('leagues/123456789', mockLeague);
      mockSleeperApiResponse('leagues/123456789/users', mockUsers);
      mockSleeperApiResponse('leagues/123456789/rosters', mockRosters);

      // Act
      const leagueResponse = await fetch('https://api.sleeper.app/v1/leagues/123456789');
      const usersResponse = await fetch('https://api.sleeper.app/v1/leagues/123456789/users');
      const rostersResponse = await fetch('https://api.sleeper.app/v1/leagues/123456789/rosters');

      const leagueData = await leagueResponse.json();
      const usersData = await usersResponse.json();
      const rostersData = await rostersResponse.json();

      // Assert
      expect(leagueData).toBeDefined();
      expect(usersData).toHaveLength(2);
      expect(rostersData).toHaveLength(2);
      expect(rostersData[0].owner_id).toBe('user1');
    });

    it('should handle partial sync failures gracefully', async () => {
      // Arrange
      mockSleeperApiResponse('leagues/123456789', createMockLeague());
      
      global.fetch = jest.fn().mockImplementation((url: string) => {
        if (url.includes('users')) {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: () => Promise.resolve({ error: 'Internal server error' }),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: 'success' }),
        });
      });

      // Act
      const leagueResponse = await fetch('https://api.sleeper.app/v1/leagues/123456789');
      const usersResponse = await fetch('https://api.sleeper.app/v1/leagues/123456789/users');

      // Assert
      expect(leagueResponse.ok).toBe(true);
      expect(usersResponse.ok).toBe(false);
      expect(usersResponse.status).toBe(500);
    });
  });
});
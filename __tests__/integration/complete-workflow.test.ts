/**
 * Complete Workflow Integration Tests
 * End-to-end testing of the entire fantasy football platform
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { prisma } from '@/lib/db';
import { TradeProcessor } from '@/lib/trades/trade-processor';
import { draftStateManager } from '@/lib/draft/draft-state';
import { LiveScoreProcessor } from '@/lib/scoring/live-score-processor';
import { notificationService } from '@/lib/notifications/notification-service';
import { cacheService } from '@/lib/cache/redis-client';
import { performanceMonitor } from '@/lib/monitoring/performance-monitor';

// Test data setup
let testLeague: any;
let testUsers: any[];
let testTeams: any[];
let testDraft: any;
let testPlayers: any[];

describe('Complete Fantasy Football Workflow', () => {
  beforeAll(async () => {
    // Setup test database state
    await setupTestEnvironment();
  });

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestEnvironment();
  });

  beforeEach(() => {
    // Reset performance monitoring for each test
    performanceMonitor.cleanup();
  });

  describe('League Creation and Management', () => {
    test('should create league with all settings', async () => {
      const startTime = performance.now();

      expect(testLeague).toBeDefined();
      expect(testLeague.name).toBe('Test Integration League');
      expect(testLeague.status).toBe('SETUP');
      expect(testLeague.teams).toHaveLength(10);

      // Verify league settings
      expect(testLeague.settings).toMatchObject({
        rosterSize: 16,
        startingLineup: {
          QB: 1,
          RB: 2,
          WR: 2,
          TE: 1,
          FLEX: 1,
          DST: 1,
          K: 1,
          BENCH: 7
        },
        scoringType: 'PPR',
        tradeDeadlineWeek: 12,
        waiverType: 'FAAB'
      });

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete under 1 second
    });

    test('should setup teams with owners', async () => {
      expect(testTeams).toHaveLength(10);
      
      for (const team of testTeams) {
        expect(team.name).toBeDefined();
        expect(team.ownerId).toBeDefined();
        expect(team.leagueId).toBe(testLeague.id);
      }
    });
  });

  describe('Draft Process', () => {
    test('should initialize draft correctly', async () => {
      const startTime = performance.now();

      expect(testDraft).toBeDefined();
      expect(testDraft.status).toBe('WAITING');
      expect(testDraft.currentRound).toBe(1);
      expect(testDraft.currentPick).toBe(1);

      const endTime = performance.now();
      performanceMonitor.recordMetric({
        metricType: 'api_response',
        name: 'draft_initialization',
        value: endTime - startTime,
        unit: 'ms'
      });
    });

    test('should handle complete draft simulation', async () => {
      const startTime = performance.now();

      // Start the draft
      await draftStateManager.startDraft(testDraft.id);
      
      // Simulate all picks
      let currentRound = 1;
      let currentPick = 1;
      const totalPicks = 10 * 16; // 10 teams, 16 rounds

      for (let pick = 0; pick < totalPicks; pick++) {
        const teamIndex = currentRound % 2 === 1 
          ? (currentPick - 1) % 10 // Snake draft logic
          : 9 - ((currentPick - 1) % 10);
        
        const team = testTeams[teamIndex];
        const availablePlayer = testPlayers.find(p => p.isAvailable);
        
        if (availablePlayer) {
          const result = await draftStateManager.makePick(
            testDraft.id,
            team.id,
            availablePlayer.id
          );
          
          expect(result.success).toBe(true);
          availablePlayer.isAvailable = false;
        }

        // Update pick/round counters
        if (currentPick === 10) {
          currentRound++;
          currentPick = 1;
        } else {
          currentPick++;
        }
      }

      const endTime = performance.now();
      const draftTime = endTime - startTime;
      
      expect(draftTime).toBeLessThan(30000); // Should complete under 30 seconds
      performanceMonitor.recordMetric({
        metricType: 'user_interaction',
        name: 'complete_draft_simulation',
        value: draftTime,
        unit: 'ms'
      });

      // Verify draft completion
      const finalState = await draftStateManager.getState(testDraft.id);
      expect(finalState?.status).toBe('COMPLETED');
    });
  });

  describe('Team Management', () => {
    test('should set lineups for all teams', async () => {
      const startTime = performance.now();

      for (const team of testTeams) {
        // Get team roster
        const roster = await prisma.roster.findMany({
          where: { teamId: team.id },
          include: { player: true }
        });

        expect(roster.length).toBe(16);

        // Create lineup for week 1
        const lineup = await prisma.lineup.create({
          data: {
            teamId: team.id,
            week: 1,
            isLocked: false
          }
        });

        // Set starting lineup
        const positions = ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'DST', 'K'];
        for (let i = 0; i < positions.length; i++) {
          const position = positions[i];
          let player = roster.find(p => 
            p.player.position === position || 
            (position === 'FLEX' && ['RB', 'WR', 'TE'].includes(p.player.position))
          );

          if (player) {
            await prisma.lineupSlot.create({
              data: {
                lineupId: lineup.id,
                position: position,
                playerId: player.playerId
              }
            });
          }
        }
      }

      const endTime = performance.now();
      performanceMonitor.recordMetric({
        metricType: 'database_query',
        name: 'set_all_lineups',
        value: endTime - startTime,
        unit: 'ms'
      });

      expect(endTime - startTime).toBeLessThan(5000); // Should complete under 5 seconds
    });
  });

  describe('Trade System', () => {
    test('should process complete trade workflow', async () => {
      const startTime = performance.now();

      const tradeProcessor = new TradeProcessor();
      
      // Get two teams
      const team1 = testTeams[0];
      const team2 = testTeams[1];

      // Get players from each team
      const team1Players = await prisma.roster.findMany({
        where: { teamId: team1.id },
        take: 2
      });
      const team2Players = await prisma.roster.findMany({
        where: { teamId: team2.id },
        take: 2
      });

      // Propose trade
      const tradeProposal = {
        fromTeamId: team1.id,
        toTeamId: team2.id,
        givingPlayerIds: [team1Players[0].playerId],
        receivingPlayerIds: [team2Players[0].playerId],
        message: 'Test trade proposal'
      };

      const proposalResult = await tradeProcessor.proposeTrade(
        tradeProposal,
        testLeague.id,
        team1.ownerId
      );

      expect(proposalResult.success).toBe(true);
      expect(proposalResult.tradeId).toBeDefined();

      // Accept trade
      const acceptResult = await tradeProcessor.acceptTrade(
        proposalResult.tradeId!,
        team2.ownerId
      );

      expect(acceptResult.success).toBe(true);

      // Verify players were moved
      const team1NewRoster = await prisma.roster.findMany({
        where: { teamId: team1.id }
      });
      const team2NewRoster = await prisma.roster.findMany({
        where: { teamId: team2.id }
      });

      expect(team1NewRoster.some(p => p.playerId === team2Players[0].playerId)).toBe(true);
      expect(team2NewRoster.some(p => p.playerId === team1Players[0].playerId)).toBe(true);

      const endTime = performance.now();
      performanceMonitor.recordMetric({
        metricType: 'user_interaction',
        name: 'complete_trade_workflow',
        value: endTime - startTime,
        unit: 'ms'
      });
    });
  });

  describe('Scoring System', () => {
    test('should process live scoring for all teams', async () => {
      const startTime = performance.now();

      const liveScoreProcessor = new LiveScoreProcessor();

      // Update league to current week
      await prisma.league.update({
        where: { id: testLeague.id },
        data: { status: 'ACTIVE', currentWeek: 1 }
      });

      // Create matchups for the week
      const matchups = [];
      for (let i = 0; i < 10; i += 2) {
        const matchup = await prisma.matchup.create({
          data: {
            leagueId: testLeague.id,
            week: 1,
            team1Id: testTeams[i].id,
            team2Id: testTeams[i + 1].id,
            team1Score: 0,
            team2Score: 0,
            status: 'IN_PROGRESS'
          }
        });
        matchups.push(matchup);
      }

      // Process live scoring
      await liveScoreProcessor.processLiveScores(testLeague.id);

      // Verify scores were calculated
      const updatedMatchups = await prisma.matchup.findMany({
        where: { leagueId: testLeague.id, week: 1 }
      });

      for (const matchup of updatedMatchups) {
        expect(typeof matchup.team1Score).toBe('number');
        expect(typeof matchup.team2Score).toBe('number');
      }

      const endTime = performance.now();
      performanceMonitor.recordMetric({
        metricType: 'api_response',
        name: 'process_live_scoring',
        value: endTime - startTime,
        unit: 'ms'
      });

      expect(endTime - startTime).toBeLessThan(3000); // Should complete under 3 seconds
    });
  });

  describe('Notification System', () => {
    test('should send notifications for all events', async () => {
      const startTime = performance.now();

      // Test trade notification
      await notificationService.notifyTradeProposed(
        'test-trade-id',
        testTeams[0].name,
        testUsers[1].id,
        testLeague.id
      );

      // Test draft notification
      await notificationService.notifyDraftTurn(
        testUsers[0].id,
        testLeague.id,
        1,
        10
      );

      // Test scoring notification
      await notificationService.notifyScoreUpdate(
        testUsers[0].id,
        testLeague.id,
        125.5,
        118.2,
        1
      );

      // Verify notifications were created
      const notifications = await notificationService.getNotificationHistory(testUsers[0].id, 10);
      expect(notifications.length).toBeGreaterThan(0);

      const endTime = performance.now();
      performanceMonitor.recordMetric({
        metricType: 'api_response',
        name: 'send_notifications',
        value: endTime - startTime,
        unit: 'ms'
      });
    });
  });

  describe('Caching Performance', () => {
    test('should demonstrate cache effectiveness', async () => {
      // First request (cache miss)
      const startTime1 = performance.now();
      const standings1 = await cacheService.getOrSet(
        `league:standings:${testLeague.id}`,
        async () => {
          return await prisma.team.findMany({
            where: { leagueId: testLeague.id },
            orderBy: { totalPointsFor: 'desc' }
          });
        },
        300
      );
      const endTime1 = performance.now();
      const cacheMissTime = endTime1 - startTime1;

      // Second request (cache hit)
      const startTime2 = performance.now();
      const standings2 = await cacheService.get(`league:standings:${testLeague.id}`);
      const endTime2 = performance.now();
      const cacheHitTime = endTime2 - startTime2;

      expect(standings1).toEqual(standings2);
      expect(cacheHitTime).toBeLessThan(cacheMissTime * 0.1); // Cache should be 10x faster
      
      performanceMonitor.recordMetric({
        metricType: 'database_query',
        name: 'cache_miss_vs_hit',
        value: cacheMissTime - cacheHitTime,
        unit: 'ms'
      });
    });
  });

  describe('Performance Benchmarks', () => {
    test('should meet all performance targets', async () => {
      const summary = performanceMonitor.getPerformanceSummary('1h');
      
      // Verify performance metrics
      if (summary.averagePageLoad > 0) {
        expect(summary.averagePageLoad).toBeLessThan(1500); // 1.5 seconds
      }
      if (summary.averageApiResponse > 0) {
        expect(summary.averageApiResponse).toBeLessThan(500); // 500ms
      }
      if (summary.averageDbQuery > 0) {
        expect(summary.averageDbQuery).toBeLessThan(200); // 200ms
      }

      console.log('Performance Summary:', {
        totalMetrics: summary.totalMetrics,
        avgPageLoad: `${summary.averagePageLoad}ms`,
        avgApiResponse: `${summary.averageApiResponse}ms`,
        avgDbQuery: `${summary.averageDbQuery}ms`,
        alerts: summary.alertCount
      });
    });
  });
});

// Helper functions
async function setupTestEnvironment() {
  // Create test league
  testLeague = await prisma.league.create({
    data: {
      name: 'Test Integration League',
      status: 'SETUP',
      currentWeek: 1,
      season: 2024,
      commissionerId: 'test-user-1',
      settings: {
        create: {
          rosterSize: 16,
          startingLineup: {
            QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, DST: 1, K: 1, BENCH: 7
          },
          scoringType: 'PPR',
          tradeDeadlineWeek: 12,
          waiverType: 'FAAB',
          waiverBudget: 100
        }
      }
    },
    include: { settings: true }
  });

  // Create test users
  testUsers = [];
  for (let i = 1; i <= 10; i++) {
    const user = await prisma.user.create({
      data: {
        email: `testuser${i}@test.com`,
        name: `Test User ${i}`,
        role: i === 1 ? 'ADMIN' : 'PLAYER'
      }
    });
    testUsers.push(user);
  }

  // Create test teams
  testTeams = [];
  for (let i = 0; i < 10; i++) {
    const team = await prisma.team.create({
      data: {
        name: `Test Team ${i + 1}`,
        leagueId: testLeague.id,
        ownerId: testUsers[i].id,
        wins: 0,
        losses: 0,
        ties: 0,
        totalPointsFor: 0,
        totalPointsAgainst: 0
      }
    });
    testTeams.push(team);
  }

  // Create test players
  testPlayers = [];
  const positions = ['QB', 'RB', 'WR', 'TE', 'DST', 'K'];
  for (let i = 1; i <= 200; i++) {
    const position = positions[i % positions.length];
    const player = await prisma.player.create({
      data: {
        name: `Test Player ${i}`,
        position,
        team: 'TEST',
        isActive: true,
        espnId: i,
        averagePoints: Math.random() * 20,
        projectedPoints: Math.random() * 25
      }
    });
    testPlayers.push({ ...player, isAvailable: true });
  }

  // Create test draft
  testDraft = await prisma.draft.create({
    data: {
      leagueId: testLeague.id,
      status: 'WAITING',
      currentRound: 1,
      currentPick: 1,
      pickTimeLimit: 120,
      draftOrder: testTeams.map((team, index) => ({ teamId: team.id, position: index + 1 }))
    }
  });
}

async function cleanupTestEnvironment() {
  // Clean up in reverse order due to foreign key constraints
  await prisma.draftPick.deleteMany({ where: { draftId: testDraft?.id } });
  await prisma.draft.deleteMany({ where: { leagueId: testLeague?.id } });
  await prisma.lineupSlot.deleteMany({});
  await prisma.lineup.deleteMany({});
  await prisma.roster.deleteMany({});
  await prisma.transaction.deleteMany({ where: { leagueId: testLeague?.id } });
  await prisma.matchup.deleteMany({ where: { leagueId: testLeague?.id } });
  await prisma.team.deleteMany({ where: { leagueId: testLeague?.id } });
  await prisma.leagueSettings.deleteMany({ where: { leagueId: testLeague?.id } });
  await prisma.league.deleteMany({ where: { id: testLeague?.id } });
  await prisma.player.deleteMany({ where: { team: 'TEST' } });
  await prisma.user.deleteMany({ where: { email: { contains: '@test.com' } } });
  
  // Clear cache
  await cacheService.deletePattern('*test*');
}
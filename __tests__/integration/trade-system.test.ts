/**
 * Trade System Integration Tests
 * Tests complex trade scenarios, fairness algorithms, and edge cases
 */

import { test, expect } from '@playwright/test';
import { prisma } from '@/lib/prisma';
import { calculateTradeFairness } from '@/lib/trades/fairness';
import { processTradeVeto } from '@/lib/trades/veto';

describe('Trade System Integration Tests', () => {
  let testLeagueId: string;
  let testUsers: any[] = [];
  let testTeams: any[] = [];
  let testPlayers: any[] = [];

  beforeAll(async () => {
    // Create test league
    const league = await prisma.league.create({
      data: {
        name: 'Trade Test League',
        commissionerId: 'test-commissioner',
        status: 'ACTIVE',
        maxTeams: 10,
        currentWeek: 4,
        settings: {
          tradeDeadline: 12, // Week 12
          tradeReviewPeriod: 48, // 48 hours
          allowCommissionerVeto: true,
          allowLeagueVeto: true,
          leagueVetoVotesRequired: 6
        }
      }
    });
    testLeagueId = league.id;

    // Create test users and teams
    for (let i = 0; i < 10; i++) {
      const user = await prisma.user.create({
        data: {
          name: `Trade Test User ${i + 1}`,
          email: `tradeuser${i + 1}@example.com`,
          password: 'test-password'
        }
      });

      const team = await prisma.team.create({
        data: {
          name: `Trade Team ${i + 1}`,
          ownerId: user.id,
          leagueId: testLeagueId,
          wins: Math.floor(Math.random() * 4),
          losses: Math.floor(Math.random() * 4),
          totalPointsFor: 400 + Math.random() * 200,
          totalPointsAgainst: 400 + Math.random() * 200
        }
      });

      testUsers.push(user);
      testTeams.push(team);
    }

    // Create test players with realistic stats
    const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
    const playerTypes = [
      { pos: 'QB', value: 'high', stats: { passingYards: 3500, passingTDs: 28 } },
      { pos: 'QB', value: 'medium', stats: { passingYards: 2800, passingTDs: 20 } },
      { pos: 'RB', value: 'high', stats: { rushingYards: 1200, rushingTDs: 12 } },
      { pos: 'RB', value: 'medium', stats: { rushingYards: 800, rushingTDs: 8 } },
      { pos: 'WR', value: 'high', stats: { receivingYards: 1100, receivingTDs: 10 } },
      { pos: 'WR', value: 'medium', stats: { receivingYards: 700, receivingTDs: 6 } },
      { pos: 'TE', value: 'high', stats: { receivingYards: 800, receivingTDs: 8 } },
      { pos: 'TE', value: 'medium', stats: { receivingYards: 500, receivingTDs: 5 } },
    ];

    for (let i = 0; i < playerTypes.length; i++) {
      const playerType = playerTypes[i];
      const player = await prisma.player.create({
        data: {
          name: `Test ${playerType.pos} ${i + 1}`,
          position: playerType.pos,
          team: 'TEST',
          projectedPoints: playerType.value === 'high' ? 15.5 : 10.2,
          averagePoints: playerType.value === 'high' ? 14.8 : 9.7,
          playerStats: {
            create: {
              week: 4,
              year: 2024,
              points: playerType.value === 'high' ? 18.6 : 12.3,
              ...playerType.stats
            }
          }
        }
      });
      testPlayers.push(player);
    }

    // Assign players to teams
    for (let i = 0; i < testPlayers.length; i++) {
      const teamIndex = i % testTeams.length;
      await prisma.roster.create({
        data: {
          teamId: testTeams[teamIndex].id,
          playerId: testPlayers[i].id,
          position: 'BENCH',
          week: 4,
          year: 2024
        }
      });
    }
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.roster.deleteMany({ where: { team: { leagueId: testLeagueId } } });
    await prisma.playerStats.deleteMany({});
    await prisma.player.deleteMany({ where: { name: { startsWith: 'Test' } } });
    await prisma.trade.deleteMany({ where: { league: { id: testLeagueId } } });
    await prisma.team.deleteMany({ where: { leagueId: testLeagueId } });
    await prisma.league.delete({ where: { id: testLeagueId } });
    
    for (const user of testUsers) {
      await prisma.user.delete({ where: { id: user.id } });
    }
  });

  test('Simple 1-for-1 trade proposal and acceptance', async ({ page }) => {
    await page.goto('/trades');

    // Propose a simple trade
    await page.click('[data-testid="propose-trade"]');
    
    // Select team to trade with
    await page.selectOption('[data-testid="trade-partner"]', testTeams[1].id);
    
    // Select player to give
    await page.click(`[data-testid="my-player-${testPlayers[0].id}"]`);
    
    // Select player to receive
    await page.click(`[data-testid="partner-player-${testPlayers[1].id}"]`);
    
    // Review trade fairness
    await expect(page.locator('[data-testid="trade-fairness-score"]')).toBeVisible();
    const fairnessScore = await page.locator('[data-testid="trade-fairness-score"]').textContent();
    expect(parseFloat(fairnessScore || '0')).toBeGreaterThan(0.7); // Fair trade threshold
    
    // Submit trade proposal
    await page.click('[data-testid="submit-trade"]');
    
    // Verify success message
    await expect(page.getByText('Trade proposal sent successfully')).toBeVisible();
    
    // Verify trade appears in pending trades
    await expect(page.locator('[data-testid="pending-trade"]')).toBeVisible();
    await expect(page.getByText(testPlayers[0].name)).toBeVisible();
    await expect(page.getByText(testPlayers[1].name)).toBeVisible();
  });

  test('Multi-player trade with picks and FAAB', async ({ page }) => {
    await page.goto('/trades');
    await page.click('[data-testid="propose-trade"]');
    
    // Complex multi-asset trade
    await page.selectOption('[data-testid="trade-partner"]', testTeams[2].id);
    
    // Add multiple players to give
    await page.click(`[data-testid="my-player-${testPlayers[2].id}"]`);
    await page.click(`[data-testid="my-player-${testPlayers[3].id}"]`);
    
    // Add FAAB money
    await page.fill('[data-testid="faab-amount-give"]', '25');
    
    // Add 2025 draft pick
    await page.selectOption('[data-testid="draft-pick-give"]', '2025_3'); // 3rd round pick
    
    // Select what to receive
    await page.click(`[data-testid="partner-player-${testPlayers[4].id}"]`);
    await page.fill('[data-testid="faab-amount-receive"]', '10');
    
    // Check trade complexity analysis
    await expect(page.locator('[data-testid="trade-complexity"]')).toContainText('Complex');
    
    // Verify fairness calculation handles multiple assets
    const complexFairnessScore = await page.locator('[data-testid="trade-fairness-score"]').textContent();
    expect(parseFloat(complexFairnessScore || '0')).toBeGreaterThan(0.6); // Lower threshold for complex trades
    
    await page.click('[data-testid="submit-trade"]');
    await expect(page.getByText('Complex trade proposal sent')).toBeVisible();
  });

  test('Trade deadline enforcement', async ({ page }) => {
    // Update league to be past trade deadline
    await prisma.league.update({
      where: { id: testLeagueId },
      data: { currentWeek: 13 } // Past week 12 deadline
    });

    await page.goto('/trades');
    
    // Verify trade proposal is disabled
    const proposeButton = page.locator('[data-testid="propose-trade"]');
    await expect(proposeButton).toBeDisabled();
    
    // Verify deadline message
    await expect(page.getByText('Trade deadline has passed')).toBeVisible();
    await expect(page.getByText('Week 12')).toBeVisible();
    
    // Try to propose trade via API (should fail)
    const response = await page.request.post('/api/trades', {
      data: {
        leagueId: testLeagueId,
        fromTeamId: testTeams[0].id,
        toTeamId: testTeams[1].id,
        fromPlayers: [testPlayers[0].id],
        toPlayers: [testPlayers[1].id]
      }
    });
    
    expect(response.status()).toBe(400);
    const errorData = await response.json();
    expect(errorData.error).toContain('trade deadline');

    // Reset league week for other tests
    await prisma.league.update({
      where: { id: testLeagueId },
      data: { currentWeek: 4 }
    });
  });

  test('Commissioner veto functionality', async ({ page }) => {
    // Create a trade to veto
    const trade = await prisma.trade.create({
      data: {
        leagueId: testLeagueId,
        fromTeamId: testTeams[0].id,
        toTeamId: testTeams[1].id,
        status: 'PENDING',
        proposedAt: new Date(),
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
        tradeItems: {
          create: [
            {
              fromTeamId: testTeams[0].id,
              playerId: testPlayers[0].id,
              type: 'PLAYER'
            },
            {
              toTeamId: testTeams[1].id,
              playerId: testPlayers[1].id,
              type: 'PLAYER'
            }
          ]
        }
      }
    });

    // Login as commissioner
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'test-commissioner@example.com');
    await page.fill('[data-testid="password"]', 'test-password');
    await page.click('[data-testid="login"]');

    await page.goto(`/commissioner/trades`);
    
    // Verify trade appears in commissioner panel
    await expect(page.locator(`[data-testid="trade-${trade.id}"]`)).toBeVisible();
    
    // Veto the trade
    await page.click(`[data-testid="veto-trade-${trade.id}"]`);
    
    // Provide veto reason
    await page.fill('[data-testid="veto-reason"]', 'Trade appears heavily unfair and potentially collusive');
    await page.click('[data-testid="confirm-veto"]');
    
    // Verify veto success
    await expect(page.getByText('Trade has been vetoed')).toBeVisible();
    
    // Verify trade status updated
    const updatedTrade = await prisma.trade.findUnique({
      where: { id: trade.id }
    });
    expect(updatedTrade?.status).toBe('VETOED');
    expect(updatedTrade?.vetoReason).toContain('unfair');
  });

  test('League veto voting system', async ({ page, context }) => {
    // Create trade for league voting
    const trade = await prisma.trade.create({
      data: {
        leagueId: testLeagueId,
        fromTeamId: testTeams[0].id,
        toTeamId: testTeams[1].id,
        status: 'PENDING',
        proposedAt: new Date(),
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
        allowLeagueVeto: true,
        tradeItems: {
          create: [
            {
              fromTeamId: testTeams[0].id,
              playerId: testPlayers[0].id,
              type: 'PLAYER'
            },
            {
              toTeamId: testTeams[1].id,
              playerId: testPlayers[1].id,
              type: 'PLAYER'
            }
          ]
        }
      }
    });

    // Open multiple browser contexts for different users
    const user1Page = page;
    const user2Page = await context.newPage();
    const user3Page = await context.newPage();
    const user4Page = await context.newPage();
    const user5Page = await context.newPage();
    const user6Page = await context.newPage();
    
    const pages = [user1Page, user2Page, user3Page, user4Page, user5Page, user6Page];
    const users = testUsers.slice(2, 8); // Skip trade participants

    // Login each user and navigate to trade
    for (let i = 0; i < pages.length; i++) {
      await pages[i].goto('/login');
      await pages[i].fill('[data-testid="email"]', users[i].email);
      await pages[i].fill('[data-testid="password"]', 'test-password');
      await pages[i].click('[data-testid="login"]');
      
      await pages[i].goto(`/trades/${trade.id}`);
      await expect(pages[i].locator('[data-testid="trade-details"]')).toBeVisible();
    }

    // Have 6 users vote to veto (reaching threshold)
    for (let i = 0; i < 6; i++) {
      await pages[i].click('[data-testid="vote-veto"]');
      await pages[i].fill('[data-testid="veto-comment"]', `Vote ${i + 1}: This trade seems unfair`);
      await pages[i].click('[data-testid="submit-veto-vote"]');
      
      await expect(pages[i].getByText('Your veto vote has been recorded')).toBeVisible();
    }

    // Check if trade was automatically vetoed
    await pages[0].waitForTimeout(2000); // Wait for vote processing
    
    const vetoedTrade = await prisma.trade.findUnique({
      where: { id: trade.id },
      include: { tradeVetos: true }
    });
    
    expect(vetoedTrade?.status).toBe('VETOED');
    expect(vetoedTrade?.tradeVetos).toHaveLength(6);
    expect(vetoedTrade?.vetoReason).toContain('League vote');

    // Cleanup pages
    for (let i = 1; i < pages.length; i++) {
      await pages[i].close();
    }
  });

  test('Trade fairness algorithm accuracy', async () => {
    // Test various trade scenarios
    const testCases = [
      {
        name: 'Equal value trade',
        give: [testPlayers[0]], // High QB
        receive: [testPlayers[2]], // High RB
        expectedFairness: 0.85,
      },
      {
        name: 'Slightly unfair trade',
        give: [testPlayers[1]], // Medium QB
        receive: [testPlayers[0]], // High QB
        expectedFairness: 0.65,
      },
      {
        name: 'Very unfair trade',
        give: [testPlayers[7]], // Medium TE
        receive: [testPlayers[0], testPlayers[2]], // High QB + High RB
        expectedFairness: 0.3,
      },
      {
        name: 'Multi-player balanced trade',
        give: [testPlayers[0], testPlayers[3]], // High QB + Medium RB
        receive: [testPlayers[2], testPlayers[4]], // High RB + High WR
        expectedFairness: 0.8,
      },
    ];

    for (const testCase of testCases) {
      const fairnessScore = await calculateTradeFairness({
        givePlayers: testCase.give,
        receivePlayers: testCase.receive,
        leagueId: testLeagueId,
        week: 4
      });

      expect(fairnessScore).toBeCloseTo(testCase.expectedFairness, 1);
      console.log(`${testCase.name}: Expected ${testCase.expectedFairness}, Got ${fairnessScore}`);
    }
  });

  test('Trade review period and automatic processing', async ({ page }) => {
    // Create trade with short review period for testing
    const trade = await prisma.trade.create({
      data: {
        leagueId: testLeagueId,
        fromTeamId: testTeams[0].id,
        toTeamId: testTeams[1].id,
        status: 'ACCEPTED',
        proposedAt: new Date(),
        acceptedAt: new Date(),
        processAt: new Date(Date.now() + 5000), // 5 seconds from now
        tradeItems: {
          create: [
            {
              fromTeamId: testTeams[0].id,
              playerId: testPlayers[0].id,
              type: 'PLAYER'
            },
            {
              toTeamId: testTeams[1].id,
              playerId: testPlayers[1].id,
              type: 'PLAYER'
            }
          ]
        }
      }
    });

    await page.goto(`/trades/${trade.id}`);
    
    // Verify trade is in review period
    await expect(page.getByText('Review Period')).toBeVisible();
    await expect(page.locator('[data-testid="countdown-timer"]')).toBeVisible();
    
    // Wait for automatic processing
    await page.waitForTimeout(10000);
    await page.reload();
    
    // Verify trade was processed
    await expect(page.getByText('COMPLETED')).toBeVisible();
    
    // Verify players were swapped in database
    const team1Roster = await prisma.roster.findMany({
      where: { teamId: testTeams[0].id },
      include: { player: true }
    });
    
    const team2Roster = await prisma.roster.findMany({
      where: { teamId: testTeams[1].id },
      include: { player: true }
    });
    
    // Player 1 should now be on team 2
    expect(team2Roster.some(r => r.playerId === testPlayers[0].id)).toBe(true);
    // Player 2 should now be on team 1
    expect(team1Roster.some(r => r.playerId === testPlayers[1].id)).toBe(true);
  });

  test('Trade expiration handling', async ({ page }) => {
    // Create trade with very short expiration
    const trade = await prisma.trade.create({
      data: {
        leagueId: testLeagueId,
        fromTeamId: testTeams[0].id,
        toTeamId: testTeams[1].id,
        status: 'PENDING',
        proposedAt: new Date(),
        expiresAt: new Date(Date.now() + 3000), // 3 seconds from now
        tradeItems: {
          create: [
            {
              fromTeamId: testTeams[0].id,
              playerId: testPlayers[2].id,
              type: 'PLAYER'
            },
            {
              toTeamId: testTeams[1].id,
              playerId: testPlayers[3].id,
              type: 'PLAYER'
            }
          ]
        }
      }
    });

    await page.goto(`/trades/${trade.id}`);
    
    // Verify expiration timer
    await expect(page.locator('[data-testid="expiration-timer"]')).toBeVisible();
    
    // Wait for expiration
    await page.waitForTimeout(5000);
    await page.reload();
    
    // Verify trade expired
    await expect(page.getByText('EXPIRED')).toBeVisible();
    
    // Verify accept button is disabled
    await expect(page.locator('[data-testid="accept-trade"]')).toBeDisabled();
    
    // Verify status in database
    const expiredTrade = await prisma.trade.findUnique({
      where: { id: trade.id }
    });
    expect(expiredTrade?.status).toBe('EXPIRED');
  });

  test('Trade notification system', async ({ page, context }) => {
    const proposerPage = page;
    const receiverPage = await context.newPage();
    
    // Login as trade receiver
    await receiverPage.goto('/login');
    await receiverPage.fill('[data-testid="email"]', testUsers[1].email);
    await receiverPage.fill('[data-testid="password"]', 'test-password');
    await receiverPage.click('[data-testid="login"]');
    
    // Proposer creates trade
    await proposerPage.goto('/trades');
    await proposerPage.click('[data-testid="propose-trade"]');
    await proposerPage.selectOption('[data-testid="trade-partner"]', testTeams[1].id);
    await proposerPage.click(`[data-testid="my-player-${testPlayers[4].id}"]`);
    await proposerPage.click(`[data-testid="partner-player-${testPlayers[5].id}"]`);
    await proposerPage.click('[data-testid="submit-trade"]');
    
    // Check receiver gets notification
    await receiverPage.goto('/notifications');
    await expect(receiverPage.getByText('New trade proposal received')).toBeVisible();
    await expect(receiverPage.getByText(testUsers[0].name)).toBeVisible();
    
    // Receiver accepts trade
    await receiverPage.goto('/trades');
    await receiverPage.click('[data-testid="pending-trade"]:first-child');
    await receiverPage.click('[data-testid="accept-trade"]');
    
    // Check proposer gets acceptance notification
    await proposerPage.goto('/notifications');
    await expect(proposerPage.getByText('Trade proposal accepted')).toBeVisible();
    
    await receiverPage.close();
  });

  test('Trade history and analytics', async ({ page }) => {
    // Create some historical trades
    const historicalTrades = [];
    for (let i = 0; i < 5; i++) {
      const trade = await prisma.trade.create({
        data: {
          leagueId: testLeagueId,
          fromTeamId: testTeams[i % 5].id,
          toTeamId: testTeams[(i + 1) % 5].id,
          status: 'COMPLETED',
          proposedAt: new Date(Date.now() - (i + 1) * 7 * 24 * 60 * 60 * 1000),
          completedAt: new Date(Date.now() - (i + 1) * 7 * 24 * 60 * 60 * 1000 + 48 * 60 * 60 * 1000),
          fairnessScore: 0.7 + Math.random() * 0.3,
          tradeItems: {
            create: [
              {
                fromTeamId: testTeams[i % 5].id,
                playerId: testPlayers[i % testPlayers.length].id,
                type: 'PLAYER'
              },
              {
                toTeamId: testTeams[(i + 1) % 5].id,
                playerId: testPlayers[(i + 1) % testPlayers.length].id,
                type: 'PLAYER'
              }
            ]
          }
        }
      });
      historicalTrades.push(trade);
    }

    await page.goto('/trades/history');
    
    // Verify trade history displays
    await expect(page.locator('[data-testid="trade-history-item"]')).toHaveCount(5);
    
    // Test sorting by date
    await page.click('[data-testid="sort-by-date"]');
    const tradeDates = await page.locator('[data-testid="trade-date"]').allTextContents();
    
    // Verify chronological order
    for (let i = 0; i < tradeDates.length - 1; i++) {
      const date1 = new Date(tradeDates[i]);
      const date2 = new Date(tradeDates[i + 1]);
      expect(date1.getTime()).toBeGreaterThanOrEqual(date2.getTime());
    }
    
    // Test filtering by team
    await page.selectOption('[data-testid="filter-by-team"]', testTeams[0].id);
    await page.waitForTimeout(500);
    
    const filteredTrades = await page.locator('[data-testid="trade-history-item"]').count();
    expect(filteredTrades).toBeGreaterThan(0);
    expect(filteredTrades).toBeLessThanOrEqual(5);
    
    // Test trade analytics
    await page.goto('/trades/analytics');
    
    // Verify analytics dashboard
    await expect(page.locator('[data-testid="total-trades"]')).toBeVisible();
    await expect(page.locator('[data-testid="average-fairness"]')).toBeVisible();
    await expect(page.locator('[data-testid="most-active-trader"]')).toBeVisible();
    
    // Verify fairness distribution chart
    await expect(page.locator('[data-testid="fairness-chart"]')).toBeVisible();
  });
});
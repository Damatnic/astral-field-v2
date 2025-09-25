/**
 * Draft Room Integration Tests
 * Tests real-time draft functionality, WebSocket connections, and multi-user interactions
 */

import { test, expect } from '@playwright/test';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { prisma } from '@/lib/prisma';
import { io as Client } from 'socket.io-client';

describe('Draft Room Integration Tests', () => {
  let testLeagueId: string;
  let testDraftId: string;
  let testUsers: any[] = [];

  beforeAll(async () => {
    // Create test league and draft
    const testLeague = await prisma.league.create({
      data: {
        name: 'Integration Test League',
        commissionerId: 'test-commissioner',
        status: 'ACTIVE',
        maxTeams: 12,
        currentWeek: 1
      }
    });
    testLeagueId = testLeague.id;

    // Create test users and teams
    const userPromises = Array.from({ length: 12 }, async (_, i) => {
      const user = await prisma.user.create({
        data: {
          name: `Test User ${i + 1}`,
          email: `testuser${i + 1}@example.com`,
          password: 'test-password'
        }
      });

      const team = await prisma.team.create({
        data: {
          name: `Test Team ${i + 1}`,
          ownerId: user.id,
          leagueId: testLeagueId
        }
      });

      return { user, team };
    });

    testUsers = await Promise.all(userPromises);

    // Create test draft
    const testDraft = await prisma.draft.create({
      data: {
        leagueId: testLeagueId,
        status: 'SCHEDULED',
        type: 'SNAKE',
        roundTimeLimit: 60,
        scheduledFor: new Date(),
        settings: {
          randomizeOrder: false
        }
      }
    });
    testDraftId = testDraft.id;

    // Create draft order
    const orderPromises = testUsers.map(async ({ team }, index) => {
      return prisma.draftOrder.create({
        data: {
          draftId: testDraftId,
          teamId: team.id,
          position: index + 1
        }
      });
    });
    await Promise.all(orderPromises);
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.draftPick.deleteMany({ where: { draftId: testDraftId } });
    await prisma.draftOrder.deleteMany({ where: { draftId: testDraftId } });
    await prisma.draft.delete({ where: { id: testDraftId } });
    await prisma.team.deleteMany({ where: { leagueId: testLeagueId } });
    await prisma.league.delete({ where: { id: testLeagueId } });
    
    for (const { user } of testUsers) {
      await prisma.user.delete({ where: { id: user.id } });
    }
  });

  test('Draft room loads with correct initial state', async ({ page }) => {
    // Navigate to draft room
    await page.goto(`/draft/${testDraftId}`);

    // Check if draft room components are loaded
    await expect(page.getByText('Integration Test League Draft')).toBeVisible();
    await expect(page.getByText('Round 1 • Pick 1')).toBeVisible();
    
    // Verify all draft room sections are present
    await expect(page.locator('[data-testid="draft-board"]')).toBeVisible();
    await expect(page.locator('[data-testid="player-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="team-roster"]')).toBeVisible();
    await expect(page.locator('[data-testid="draft-chat"]')).toBeVisible();
    await expect(page.locator('[data-testid="draft-timer"]')).toBeVisible();
  });

  test('WebSocket connection establishes and maintains real-time sync', async ({ page }) => {
    await page.goto(`/draft/${testDraftId}`);

    // Wait for WebSocket connection
    await page.waitForFunction(() => {
      return window.socketConnected === true;
    }, { timeout: 10000 });

    // Verify connection indicator is shown
    await expect(page.getByText('Connected to live updates')).toBeVisible();

    // Test connection resilience by simulating disconnect/reconnect
    await page.evaluate(() => {
      if (window.socket) {
        window.socket.disconnect();
      }
    });

    // Should automatically reconnect
    await page.waitForFunction(() => {
      return window.socketConnected === true;
    }, { timeout: 15000 });
  });

  test('Snake draft order is correctly implemented', async ({ page, context }) => {
    await page.goto(`/draft/${testDraftId}`);

    // Start the draft
    await page.click('[data-testid="start-draft"]');

    // Verify Round 1: Team 1 -> Team 12
    for (let pick = 1; pick <= 12; pick++) {
      await expect(page.getByText(`On the clock: Test Team ${pick}`)).toBeVisible();
      
      // Make a pick (simulate)
      await page.click('[data-testid="player-item"]:first-child');
      await page.click('[data-testid="make-pick"]');
      
      await page.waitForTimeout(1000); // Wait for pick to process
    }

    // Verify Round 2: Team 12 -> Team 1 (snake order)
    for (let pick = 12; pick >= 1; pick--) {
      await expect(page.getByText(`On the clock: Test Team ${pick}`)).toBeVisible();
      
      await page.click('[data-testid="player-item"]:first-child');
      await page.click('[data-testid="make-pick"]');
      
      await page.waitForTimeout(1000);
    }

    // Verify draft board shows correct picks
    await expect(page.locator('[data-testid="draft-board"] .pick')).toHaveCount(24);
  });

  test('Timer countdown functions correctly with auto-pick', async ({ page }) => {
    await page.goto(`/draft/${testDraftId}`);

    // Set shorter timer for testing (10 seconds)
    await page.evaluate(() => {
      fetch(`/api/draft/${draftId}/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateSettings', roundTimeLimit: 10 })
      });
    });

    // Start draft
    await page.click('[data-testid="start-draft"]');

    // Wait for first pick timer to appear
    await expect(page.locator('[data-testid="draft-timer"]')).toBeVisible();

    // Verify timer counts down
    await expect(page.getByText('00:10')).toBeVisible();
    await page.waitForTimeout(2000);
    await expect(page.getByText('00:08')).toBeVisible();

    // Wait for auto-pick to trigger
    await page.waitForTimeout(10000);

    // Verify auto-pick was made
    await expect(page.getByText('Auto-picked')).toBeVisible();
    await expect(page.locator('[data-testid="draft-board"] .pick')).toHaveCount(1);
  });

  test('Player search and filtering works correctly', async ({ page }) => {
    await page.goto(`/draft/${testDraftId}`);

    // Test search functionality
    await page.fill('[data-testid="player-search"]', 'Josh Allen');
    await page.waitForTimeout(1000);
    
    const searchResults = page.locator('[data-testid="player-item"]');
    await expect(searchResults).toContainText('Josh Allen');

    // Test position filtering
    await page.selectOption('[data-testid="position-filter"]', 'QB');
    await page.waitForTimeout(1000);

    const qbResults = page.locator('[data-testid="player-item"]');
    const count = await qbResults.count();
    
    for (let i = 0; i < count; i++) {
      await expect(qbResults.nth(i)).toContainText('QB');
    }

    // Clear filters
    await page.fill('[data-testid="player-search"]', '');
    await page.selectOption('[data-testid="position-filter"]', 'ALL');
  });

  test('Real-time chat functionality works', async ({ page, context }) => {
    const page1 = page;
    const page2 = await context.newPage();

    // Open draft room in two different browsers/tabs
    await page1.goto(`/draft/${testDraftId}`);
    await page2.goto(`/draft/${testDraftId}`);

    // Send message from first user
    await page1.fill('[data-testid="chat-input"]', 'Test message from user 1');
    await page1.click('[data-testid="send-chat"]');

    // Verify message appears in both windows
    await expect(page1.getByText('Test message from user 1')).toBeVisible();
    await expect(page2.getByText('Test message from user 1')).toBeVisible();

    // Send message from second user
    await page2.fill('[data-testid="chat-input"]', 'Test message from user 2');
    await page2.click('[data-testid="send-chat"]');

    // Verify both messages are visible in both windows
    await expect(page1.getByText('Test message from user 2')).toBeVisible();
    await expect(page2.getByText('Test message from user 2')).toBeVisible();

    await page2.close();
  });

  test('Pick validation prevents invalid selections', async ({ page }) => {
    await page.goto(`/draft/${testDraftId}`);

    // Try to make a pick when it's not your turn
    await page.click('[data-testid="player-item"]:first-child');
    await page.click('[data-testid="make-pick"]');

    // Should show error message
    await expect(page.getByText('Not your turn to pick')).toBeVisible();

    // Try to make a pick without selecting a player
    await page.click('[data-testid="make-pick"]');
    await expect(page.getByText('Please select a player')).toBeVisible();
  });

  test('Roster updates in real-time after picks', async ({ page }) => {
    await page.goto(`/draft/${testDraftId}`);

    const initialRosterCount = await page.locator('[data-testid="roster-player"]').count();

    // Make a pick (when it's our turn)
    await page.click('[data-testid="player-item"]:first-child');
    const playerName = await page.locator('[data-testid="player-item"]:first-child').textContent();
    await page.click('[data-testid="make-pick"]');

    // Wait for pick to process
    await page.waitForTimeout(2000);

    // Verify roster was updated
    const newRosterCount = await page.locator('[data-testid="roster-player"]').count();
    expect(newRosterCount).toBe(initialRosterCount + 1);

    // Verify the picked player appears in roster
    await expect(page.locator('[data-testid="roster-player"]')).toContainText(playerName || '');
  });

  test('Draft pause and resume functionality', async ({ page }) => {
    await page.goto(`/draft/${testDraftId}`);

    // Start draft
    await page.click('[data-testid="start-draft"]');

    // Pause draft (commissioner only)
    await page.click('[data-testid="pause-draft"]');
    await expect(page.getByText('Draft has been paused')).toBeVisible();

    // Verify timer is stopped
    await expect(page.locator('[data-testid="draft-timer"]')).toHaveClass(/paused/);

    // Resume draft
    await page.click('[data-testid="resume-draft"]');
    await expect(page.getByText('Draft has been resumed')).toBeVisible();

    // Verify timer is running again
    await expect(page.locator('[data-testid="draft-timer"]')).not.toHaveClass(/paused/);
  });

  test('Multi-user concurrent draft simulation', async ({ page, context }) => {
    const pages = [page];
    
    // Create additional browser contexts for multiple users
    for (let i = 1; i < 4; i++) {
      const newPage = await context.newPage();
      pages.push(newPage);
    }

    // Load draft room in all pages
    for (const p of pages) {
      await p.goto(`/draft/${testDraftId}`);
      await p.waitForLoadState('networkidle');
    }

    // Start draft from first page
    await pages[0].click('[data-testid="start-draft"]');

    // Simulate concurrent picks
    for (let round = 1; round <= 2; round++) {
      for (let pick = 1; pick <= pages.length; pick++) {
        const currentPage = pages[pick - 1];
        
        // Wait for it to be this team's turn
        await currentPage.waitForSelector('[data-testid="your-turn-indicator"]', { timeout: 30000 });
        
        // Make pick
        await currentPage.click('[data-testid="player-item"]:first-child');
        await currentPage.click('[data-testid="make-pick"]');
        
        // Verify pick was broadcast to all pages
        for (const otherPage of pages) {
          await expect(otherPage.locator('[data-testid="recent-pick"]')).toBeVisible();
        }
        
        await currentPage.waitForTimeout(1000);
      }
    }

    // Verify all pages have the same draft state
    const draftBoards = await Promise.all(
      pages.map(p => p.locator('[data-testid="draft-board"] .pick').count())
    );
    
    // All pages should show the same number of picks
    expect(new Set(draftBoards).size).toBe(1);

    // Clean up additional pages
    for (let i = 1; i < pages.length; i++) {
      await pages[i].close();
    }
  });

  test('Draft completion triggers correct notifications', async ({ page }) => {
    // This test simulates a complete draft
    await page.goto(`/draft/${testDraftId}`);

    // Start draft
    await page.click('[data-testid="start-draft"]');

    // Simulate completing all rounds (simplified for testing)
    await page.evaluate(() => {
      // Force complete the draft via API
      fetch(`/api/draft/${draftId}/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'completeDraft' })
      });
    });

    // Wait for completion notification
    await expect(page.getByText('Draft completed!')).toBeVisible();

    // Verify draft status is updated
    await expect(page.getByText('COMPLETED')).toBeVisible();

    // Verify navigation to league page is available
    await expect(page.getByText('View League')).toBeVisible();
  });

  test('Error handling for network disruptions', async ({ page }) => {
    await page.goto(`/draft/${testDraftId}`);

    // Simulate network failure during pick
    await page.route('**/api/draft/*/make-pick', route => {
      route.abort();
    });

    await page.click('[data-testid="player-item"]:first-child');
    await page.click('[data-testid="make-pick"]');

    // Should show error message
    await expect(page.getByText('Failed to make pick')).toBeVisible();

    // Restore network and verify retry works
    await page.unroute('**/api/draft/*/make-pick');
    
    await page.click('[data-testid="make-pick"]');
    await expect(page.getByText('Drafted')).toBeVisible();
  });
});

/**
 * WebSocket Integration Tests
 * Tests the real-time connection and message handling
 */
describe('Draft WebSocket Integration', () => {
  let server: Server;
  let clientSocket: any;
  const port = 3001;

  beforeAll((done) => {
    const httpServer = createServer();
    server = new Server(httpServer);
    
    httpServer.listen(port, () => {
      clientSocket = Client(`http://localhost:${port}`);
      clientSocket.on('connect', done);
    });
  });

  afterAll(() => {
    server.close();
    clientSocket.close();
  });

  test('Socket connects and joins draft room', (done) => {
    const testDraftId = 'test-draft-123';
    
    clientSocket.emit('draft:join', testDraftId);
    
    server.on('connection', (socket) => {
      socket.on('draft:join', (draftId) => {
        expect(draftId).toBe(testDraftId);
        socket.emit('draft:joined', { draftId, success: true });
      });
    });

    clientSocket.on('draft:joined', (data) => {
      expect(data.success).toBe(true);
      expect(data.draftId).toBe(testDraftId);
      done();
    });
  });

  test('Socket handles draft picks and broadcasts to room', (done) => {
    const testData = {
      draftId: 'test-draft-123',
      playerId: 'player-456',
      teamId: 'team-789'
    };

    let messagesReceived = 0;

    clientSocket.emit('draft:makePick', testData);

    server.on('connection', (socket) => {
      socket.on('draft:makePick', (data) => {
        expect(data.draftId).toBe(testData.draftId);
        expect(data.playerId).toBe(testData.playerId);
        
        // Simulate successful pick
        socket.to(data.draftId).emit('draft:pickMade', {
          pick: {
            playerId: data.playerId,
            teamId: data.teamId,
            round: 1,
            pickNumber: 1
          }
        });
        
        socket.emit('draft:pickMade', {
          pick: {
            playerId: data.playerId,
            teamId: data.teamId,
            round: 1,
            pickNumber: 1
          }
        });
      });
    });

    clientSocket.on('draft:pickMade', (data) => {
      messagesReceived++;
      expect(data.pick.playerId).toBe(testData.playerId);
      expect(data.pick.teamId).toBe(testData.teamId);
      
      if (messagesReceived === 1) {
        done();
      }
    });
  });

  test('Socket handles chat messages', (done) => {
    const testMessage = {
      draftId: 'test-draft-123',
      message: 'Hello from test!'
    };

    clientSocket.emit('draft:chat', testMessage);

    server.on('connection', (socket) => {
      socket.on('draft:chat', (data) => {
        expect(data.message).toBe(testMessage.message);
        
        socket.to(data.draftId).emit('draft:chatMessage', {
          message: data.message,
          userId: 'test-user',
          timestamp: new Date().toISOString()
        });
      });
    });

    clientSocket.on('draft:chatMessage', (data) => {
      expect(data.message).toBe(testMessage.message);
      expect(data.userId).toBe('test-user');
      done();
    });
  });

  test('Socket handles disconnections gracefully', (done) => {
    const testDraftId = 'test-draft-123';
    
    server.on('connection', (socket) => {
      socket.on('disconnect', (reason) => {
        expect(reason).toBeDefined();
        done();
      });
    });

    clientSocket.disconnect();
  });
});
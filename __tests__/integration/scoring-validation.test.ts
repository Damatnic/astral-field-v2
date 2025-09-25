/**
 * Scoring Validation and Accuracy Tests
 * Tests scoring calculations, live updates, stat corrections, and historical accuracy
 */

import { test, expect } from '@playwright/test';
import { prisma } from '@/lib/prisma';
import { calculatePlayerScore } from '@/lib/scoring/calculator';
import { liveScoreProcessor } from '@/lib/scoring/live-score-processor';
import { scoringScheduler } from '@/lib/scoring/scoring-scheduler';

describe('Scoring Validation and Accuracy Tests', () => {
  let testLeagueId: string;
  let testTeams: any[] = [];
  let testPlayers: any[] = [];
  let testMatchups: any[] = [];

  beforeAll(async () => {
    // Create test league with specific scoring settings
    const league = await prisma.league.create({
      data: {
        name: 'Scoring Test League',
        commissionerId: 'scoring-commissioner',
        status: 'ACTIVE',
        maxTeams: 12,
        currentWeek: 4,
        settings: {
          // PPR Scoring settings
          passingYards: 0.04,      // 1 point per 25 yards
          passingTDs: 4,           // 4 points per TD
          passingInterceptions: -2,  // -2 points per INT
          rushingYards: 0.1,       // 1 point per 10 yards
          rushingTDs: 6,           // 6 points per TD
          receivingYards: 0.1,     // 1 point per 10 yards
          receivingTDs: 6,         // 6 points per TD
          receptions: 1,           // PPR - 1 point per reception
          fumbles: -2,             // -2 points per fumble
          kickingFG: 3,            // 3 points per FG
          kickingXP: 1,            // 1 point per XP
          defenseInterceptions: 2,  // 2 points per INT
          defenseSacks: 1,         // 1 point per sack
          defenseTDs: 6,           // 6 points per TD
          defensePointsAllowed: {
            "0": 10,    // 0 points allowed = 10 fantasy points
            "1-6": 7,   // 1-6 points = 7 fantasy points
            "7-13": 4,  // 7-13 points = 4 fantasy points
            "14-20": 1, // 14-20 points = 1 fantasy point
            "21-27": 0, // 21-27 points = 0 fantasy points
            "28+": -1    // 28+ points = -1 fantasy point
          }
        }
      }
    });
    testLeagueId = league.id;

    // Create test teams
    for (let i = 0; i < 12; i++) {
      const user = await prisma.user.create({
        data: {
          name: `Scoring User ${i + 1}`,
          email: `scoringuser${i + 1}@example.com`,
          password: 'test-password'
        }
      });

      const team = await prisma.team.create({
        data: {
          name: `Scoring Team ${i + 1}`,
          ownerId: user.id,
          leagueId: testLeagueId
        }
      });

      testTeams.push(team);
    }

    // Create realistic test players with known stats
    const playerData = [
      // Quarterbacks
      { name: 'Test QB Elite', pos: 'QB', passingYards: 387, passingTDs: 3, passingINTs: 1, rushingYards: 23 },
      { name: 'Test QB Average', pos: 'QB', passingYards: 251, passingTDs: 2, passingINTs: 0, rushingYards: 5 },
      
      // Running Backs
      { name: 'Test RB Elite', pos: 'RB', rushingYards: 124, rushingTDs: 2, receivingYards: 45, receptions: 4, fumbles: 0 },
      { name: 'Test RB Average', pos: 'RB', rushingYards: 67, rushingTDs: 0, receivingYards: 22, receptions: 2, fumbles: 1 },
      
      // Wide Receivers
      { name: 'Test WR Elite', pos: 'WR', receivingYards: 156, receivingTDs: 2, receptions: 12, rushingYards: 0 },
      { name: 'Test WR Average', pos: 'WR', receivingYards: 73, receivingTDs: 0, receptions: 5, rushingYards: 0 },
      
      // Tight Ends
      { name: 'Test TE Elite', pos: 'TE', receivingYards: 89, receivingTDs: 1, receptions: 8 },
      { name: 'Test TE Average', pos: 'TE', receivingYards: 34, receivingTDs: 0, receptions: 3 },
      
      // Kickers
      { name: 'Test K Elite', pos: 'K', kickingFG: 4, kickingXP: 3, kickingFGMissed: 0 },
      { name: 'Test K Average', pos: 'K', kickingFG: 2, kickingXP: 4, kickingFGMissed: 1 },
      
      // Defense
      { name: 'Test DEF Elite', pos: 'DEF', defenseINTs: 3, defenseSacks: 4, defenseTDs: 1, pointsAllowed: 10 },
      { name: 'Test DEF Average', pos: 'DEF', defenseINTs: 1, defenseSacks: 2, defenseTDs: 0, pointsAllowed: 21 },
    ];

    for (const data of playerData) {
      const player = await prisma.player.create({
        data: {
          name: data.name,
          position: data.pos,
          team: 'TEST',
          isActive: true
        }
      });

      // Create week 4 stats
      await prisma.playerStats.create({
        data: {
          playerId: player.id,
          week: 4,
          year: 2024,
          ...data,
          points: 0 // Will be calculated
        }
      });

      testPlayers.push({ ...player, stats: data });
    }

    // Create matchups for week 4
    for (let i = 0; i < 6; i++) {
      const matchup = await prisma.matchup.create({
        data: {
          leagueId: testLeagueId,
          week: 4,
          year: 2024,
          team1Id: testTeams[i * 2].id,
          team2Id: testTeams[i * 2 + 1].id,
          team1Score: 0,
          team2Score: 0,
          isComplete: false
        }
      });
      testMatchups.push(matchup);
    }

    // Create starting lineups
    for (let i = 0; i < testTeams.length; i++) {
      const team = testTeams[i];
      
      // Assign players to starting lineup positions
      const lineup = [
        { playerId: testPlayers[i % 2].id, position: 'QB' }, // QB
        { playerId: testPlayers[2 + (i % 2)].id, position: 'RB' }, // RB1
        { playerId: testPlayers[2 + ((i + 1) % 2)].id, position: 'RB' }, // RB2
        { playerId: testPlayers[4 + (i % 2)].id, position: 'WR' }, // WR1
        { playerId: testPlayers[4 + ((i + 1) % 2)].id, position: 'WR' }, // WR2
        { playerId: testPlayers[6 + (i % 2)].id, position: 'TE' }, // TE
        { playerId: testPlayers[8 + (i % 2)].id, position: 'K' }, // K
        { playerId: testPlayers[10 + (i % 2)].id, position: 'DEF' }, // DEF
      ];

      for (const spot of lineup) {
        await prisma.roster.create({
          data: {
            teamId: team.id,
            playerId: spot.playerId,
            position: spot.position,
            week: 4,
            year: 2024
          }
        });
      }
    }
  });

  afterAll(async () => {
    // Cleanup
    await prisma.roster.deleteMany({ where: { team: { leagueId: testLeagueId } } });
    await prisma.playerStats.deleteMany({ where: { player: { name: { startsWith: 'Test' } } } });
    await prisma.player.deleteMany({ where: { name: { startsWith: 'Test' } } });
    await prisma.matchup.deleteMany({ where: { leagueId: testLeagueId } });
    await prisma.team.deleteMany({ where: { leagueId: testLeagueId } });
    await prisma.league.delete({ where: { id: testLeagueId } });
  });

  test('Scoring calculation accuracy for all positions', async () => {
    // Test QB scoring
    const qbElite = testPlayers[0];
    const qbScore = await calculatePlayerScore(qbElite.stats, 'QB', testLeagueId);
    
    // Expected: (387 * 0.04) + (3 * 4) + (1 * -2) + (23 * 0.1) = 15.48 + 12 - 2 + 2.3 = 27.78
    expect(qbScore).toBeCloseTo(27.78, 1);

    // Test RB scoring (PPR)
    const rbElite = testPlayers[2];
    const rbScore = await calculatePlayerScore(rbElite.stats, 'RB', testLeagueId);
    
    // Expected: (124 * 0.1) + (2 * 6) + (45 * 0.1) + (4 * 1) + (0 * -2) = 12.4 + 12 + 4.5 + 4 + 0 = 32.9
    expect(rbScore).toBeCloseTo(32.9, 1);

    // Test WR scoring
    const wrElite = testPlayers[4];
    const wrScore = await calculatePlayerScore(wrElite.stats, 'WR', testLeagueId);
    
    // Expected: (156 * 0.1) + (2 * 6) + (12 * 1) = 15.6 + 12 + 12 = 39.6
    expect(wrScore).toBeCloseTo(39.6, 1);

    // Test TE scoring
    const teElite = testPlayers[6];
    const teScore = await calculatePlayerScore(teElite.stats, 'TE', testLeagueId);
    
    // Expected: (89 * 0.1) + (1 * 6) + (8 * 1) = 8.9 + 6 + 8 = 22.9
    expect(teScore).toBeCloseTo(22.9, 1);

    // Test K scoring
    const kElite = testPlayers[8];
    const kScore = await calculatePlayerScore(kElite.stats, 'K', testLeagueId);
    
    // Expected: (4 * 3) + (3 * 1) = 12 + 3 = 15
    expect(kScore).toBe(15);

    // Test DEF scoring
    const defElite = testPlayers[10];
    const defScore = await calculatePlayerScore(defElite.stats, 'DEF', testLeagueId);
    
    // Expected: (3 * 2) + (4 * 1) + (1 * 6) + 7 (1-6 points allowed) = 6 + 4 + 6 + 7 = 23
    expect(defScore).toBe(23);
  });

  test('Live scoring updates work correctly', async ({ page }) => {
    await page.goto(`/leagues/${testLeagueId}/live-scoring`);
    
    // Start live scoring
    await page.click('[data-testid="start-live-scoring"]');
    
    // Verify live scoring indicator
    await expect(page.getByText('Live Scoring Active')).toBeVisible();
    await expect(page.locator('[data-testid="live-indicator"]')).toHaveClass(/animate-pulse/);
    
    // Check initial scores display
    await expect(page.locator('[data-testid="team-score"]')).toHaveCount(12);
    
    // Simulate stat update
    await prisma.playerStats.update({
      where: {
        playerId_week_year: {
          playerId: testPlayers[0].id,
          week: 4,
          year: 2024
        }
      },
      data: {
        passingYards: 425, // Increased from 387
        passingTDs: 4      // Increased from 3
      }
    });

    // Trigger score recalculation
    await page.click('[data-testid="refresh-scores"]');
    
    // Wait for update
    await page.waitForTimeout(2000);
    
    // Verify score updated
    const updatedScore = await page.locator('[data-testid="player-score"]').first().textContent();
    expect(parseFloat(updatedScore || '0')).toBeGreaterThan(27.78);
  });

  test('Stat corrections are handled properly', async ({ page }) => {
    await page.goto(`/leagues/${testLeagueId}/scoring/week/4`);
    
    // Record initial team score
    const initialScore = await page.locator('[data-testid="team-total-score"]').first().textContent();
    
    // Simulate stat correction (Tuesday correction)
    await prisma.playerStats.update({
      where: {
        playerId_week_year: {
          playerId: testPlayers[2].id, // RB Elite
          week: 4,
          year: 2024
        }
      },
      data: {
        rushingYards: 134, // Increased by 10 yards
        statCorrectionNote: 'Official scoring correction: +10 rushing yards'
      }
    });

    // Create stat correction record
    await prisma.statCorrection.create({
      data: {
        playerId: testPlayers[2].id,
        week: 4,
        year: 2024,
        correctionType: 'RUSHING_YARDS',
        oldValue: 124,
        newValue: 134,
        pointDifference: 1.0,
        appliedAt: new Date(),
        reason: 'Official NFL stat correction'
      }
    });

    // Refresh page to see correction
    await page.reload();
    await page.waitForTimeout(1000);

    // Verify stat correction notification
    await expect(page.getByText('Stat corrections applied')).toBeVisible();
    
    // Verify score increased
    const newScore = await page.locator('[data-testid="team-total-score"]').first().textContent();
    expect(parseFloat(newScore || '0')).toBeGreaterThan(parseFloat(initialScore || '0'));
    
    // Check stat correction details
    await page.click('[data-testid="stat-corrections"]');
    await expect(page.getByText('Official NFL stat correction')).toBeVisible();
    await expect(page.getByText('+1.0 points')).toBeVisible();
  });

  test('Historical scoring accuracy verification', async ({ page }) => {
    // Create historical data for comparison
    const historicalWeeks = [1, 2, 3];
    
    for (const week of historicalWeeks) {
      // Create historical stats with known values
      await prisma.playerStats.create({
        data: {
          playerId: testPlayers[0].id,
          week,
          year: 2024,
          passingYards: 300 + week * 20,
          passingTDs: 2 + week,
          passingINTs: week === 2 ? 2 : 1,
          points: 0 // Will calculate
        }
      });
    }

    await page.goto(`/leagues/${testLeagueId}/scoring/history`);
    
    // Verify historical weeks display
    for (const week of historicalWeeks) {
      await expect(page.getByText(`Week ${week}`)).toBeVisible();
    }
    
    // Test score calculation for week 1
    await page.click('[data-testid="week-1-details"]');
    
    // Expected week 1 QB score: (320 * 0.04) + (3 * 4) + (1 * -2) = 12.8 + 12 - 2 = 22.8
    const week1Score = await page.locator('[data-testid="week-1-qb-score"]').textContent();
    expect(parseFloat(week1Score || '0')).toBeCloseTo(22.8, 1);
    
    // Verify progression tracking
    await page.click('[data-testid="score-trends"]');
    await expect(page.locator('[data-testid="trend-chart"]')).toBeVisible();
    
    // Check average calculation
    const avgScore = await page.locator('[data-testid="season-average"]').textContent();
    expect(parseFloat(avgScore || '0')).toBeGreaterThan(20);
  });

  test('Playoff scoring differential works', async ({ page }) => {
    // Update league to playoff week
    await prisma.league.update({
      where: { id: testLeagueId },
      data: { currentWeek: 15 } // Playoff week
    });

    // Create playoff matchup
    const playoffMatchup = await prisma.matchup.create({
      data: {
        leagueId: testLeagueId,
        week: 15,
        year: 2024,
        team1Id: testTeams[0].id,
        team2Id: testTeams[1].id,
        isPlayoff: true,
        playoffRound: 'SEMIFINALS'
      }
    });

    await page.goto(`/leagues/${testLeagueId}/playoffs`);
    
    // Verify playoff scoring rules
    await expect(page.getByText('Playoff Scoring Active')).toBeVisible();
    await expect(page.getByText('Bonus points for playoff performance')).toBeVisible();
    
    // Test playoff bonus calculation
    await prisma.playerStats.create({
      data: {
        playerId: testPlayers[0].id,
        week: 15,
        year: 2024,
        passingYards: 350,
        passingTDs: 3,
        passingINTs: 0,
        isPlayoffGame: true
      }
    });

    await page.click('[data-testid="calculate-playoff-scores"]');
    
    // Verify playoff bonus applied
    const playoffScore = await page.locator('[data-testid="playoff-player-score"]').first().textContent();
    const regularScore = (350 * 0.04) + (3 * 4); // 26 points
    const expectedPlayoffScore = regularScore * 1.1; // 10% playoff bonus
    
    expect(parseFloat(playoffScore || '0')).toBeCloseTo(expectedPlayoffScore, 1);

    // Reset league week
    await prisma.league.update({
      where: { id: testLeagueId },
      data: { currentWeek: 4 }
    });
  });

  test('Scoring scheduler automation works', async () => {
    // Test automatic scoring start/stop
    await scoringScheduler.scheduleAutoScoring(testLeagueId);
    
    // Verify job is scheduled
    const activeJobs = scoringScheduler.getActiveJobs();
    expect(activeJobs).toContain(testLeagueId);
    
    // Test manual scoring start
    await scoringScheduler.startManualScoring(testLeagueId);
    
    // Verify live scoring is running
    const isRunning = scoringScheduler.isScoringRunning(testLeagueId);
    expect(isRunning).toBe(true);
    
    // Test scoring status
    const scoringStatus = scoringScheduler.getScoringStatus();
    const leagueStatus = scoringStatus.find(s => s.leagueId === testLeagueId);
    expect(leagueStatus?.isRunning).toBe(true);
    
    // Test manual stop
    await scoringScheduler.stopManualScoring(testLeagueId);
    scoringScheduler.stopAutoScoring(testLeagueId);
  });

  test('Performance under high scoring load', async ({ page }) => {
    // Create many players with stats to test performance
    const manyPlayers = [];
    
    for (let i = 0; i < 100; i++) {
      const player = await prisma.player.create({
        data: {
          name: `Perf Test Player ${i}`,
          position: ['QB', 'RB', 'WR', 'TE'][i % 4],
          team: 'PERF'
        }
      });

      await prisma.playerStats.create({
        data: {
          playerId: player.id,
          week: 4,
          year: 2024,
          rushingYards: Math.floor(Math.random() * 150),
          receivingYards: Math.floor(Math.random() * 120),
          receptions: Math.floor(Math.random() * 12),
          rushingTDs: Math.floor(Math.random() * 3),
          receivingTDs: Math.floor(Math.random() * 2)
        }
      });
      
      manyPlayers.push(player);
    }

    // Measure scoring calculation performance
    const startTime = Date.now();
    
    await page.goto(`/leagues/${testLeagueId}/scoring/calculate-all`);
    await page.click('[data-testid="calculate-all-scores"]');
    
    // Wait for completion
    await page.waitForSelector('[data-testid="calculation-complete"]', { timeout: 30000 });
    
    const endTime = Date.now();
    const calculationTime = endTime - startTime;
    
    // Should complete within 30 seconds for 100 players
    expect(calculationTime).toBeLessThan(30000);
    
    // Verify all scores calculated
    const calculatedScores = await page.locator('[data-testid="calculated-score"]').count();
    expect(calculatedScores).toBeGreaterThanOrEqual(100);

    // Cleanup performance test data
    await prisma.playerStats.deleteMany({ 
      where: { player: { name: { startsWith: 'Perf Test' } } }
    });
    await prisma.player.deleteMany({ 
      where: { name: { startsWith: 'Perf Test' } }
    });
  });

  test('Cross-platform scoring consistency', async ({ page }) => {
    // Test that scoring is consistent across different views
    const player = testPlayers[0];
    const expectedScore = 27.78; // From first test
    
    // Check dashboard view
    await page.goto('/dashboard');
    const dashboardScore = await page.locator(`[data-testid="player-${player.id}-score"]`).textContent();
    expect(parseFloat(dashboardScore || '0')).toBeCloseTo(expectedScore, 1);
    
    // Check league view
    await page.goto(`/leagues/${testLeagueId}`);
    const leagueScore = await page.locator(`[data-testid="player-${player.id}-score"]`).textContent();
    expect(parseFloat(leagueScore || '0')).toBeCloseTo(expectedScore, 1);
    
    // Check player detail view
    await page.goto(`/players/${player.id}`);
    const playerScore = await page.locator('[data-testid="current-week-score"]').textContent();
    expect(parseFloat(playerScore || '0')).toBeCloseTo(expectedScore, 1);
    
    // Check mobile view
    await page.setViewportSize({ width: 375, height: 667 }); // Mobile viewport
    await page.goto(`/leagues/${testLeagueId}/mobile`);
    const mobileScore = await page.locator(`[data-testid="player-${player.id}-score"]`).textContent();
    expect(parseFloat(mobileScore || '0')).toBeCloseTo(expectedScore, 1);
  });

  test('Edge case scoring scenarios', async () => {
    // Test negative score scenarios
    const badGame = {
      passingYards: 156,
      passingTDs: 0,
      passingINTs: 4,
      fumbles: 2,
      rushingYards: -3
    };
    
    const negativeScore = await calculatePlayerScore(badGame, 'QB', testLeagueId);
    // Expected: (156 * 0.04) + (0 * 4) + (4 * -2) + (2 * -2) + (-3 * 0.1) = 6.24 + 0 - 8 - 4 - 0.3 = -6.06
    expect(negativeScore).toBeCloseTo(-6.06, 1);
    
    // Test fractional yards
    const fractionalStats = {
      rushingYards: 99.5, // Should round properly
      receivingYards: 50.7,
      receptions: 5
    };
    
    const fractionalScore = await calculatePlayerScore(fractionalStats, 'RB', testLeagueId);
    // Test handles fractional yards correctly
    expect(fractionalScore).toBeGreaterThan(14);
    
    // Test zero stats
    const zeroStats = {
      passingYards: 0,
      passingTDs: 0,
      passingINTs: 0,
      rushingYards: 0
    };
    
    const zeroScore = await calculatePlayerScore(zeroStats, 'QB', testLeagueId);
    expect(zeroScore).toBe(0);
  });
});
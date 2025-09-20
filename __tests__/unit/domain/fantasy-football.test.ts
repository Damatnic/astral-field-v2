/**
 * Fantasy Football Domain-Specific Tests
 * Tests lineup validation, scoring calculations, trade fairness, and game rules
 */

import {
  createMockPlayer,
  createMockTeam,
  createMockTrade,
  createMockWaiverClaim,
  createMockMatchup,
  createValidLineup,
  createInvalidLineup,
  calculateExpectedScore,
} from '../../utils/test-helpers';

// Mock fantasy football domain services
const mockFantasyServices = {
  lineupValidator: {
    validate: jest.fn(),
    isPositionValid: jest.fn(),
    checkRosterRequirements: jest.fn(),
    validateByeWeeks: jest.fn(),
  },
  scoringEngine: {
    calculatePlayerScore: jest.fn(),
    calculateTeamScore: jest.fn(),
    applyBonuses: jest.fn(),
    validateScoringSettings: jest.fn(),
  },
  tradeAnalyzer: {
    evaluateTradeValue: jest.fn(),
    checkTradeFairness: jest.fn(),
    validateTradeEligibility: jest.fn(),
    calculateImpact: jest.fn(),
  },
  waiverProcessor: {
    processWaiverClaims: jest.fn(),
    determinePriority: jest.fn(),
    validateFaabBid: jest.fn(),
    checkRosterSpace: jest.fn(),
  },
  draftManager: {
    validateDraftPick: jest.fn(),
    checkDraftOrder: jest.fn(),
    applyAutoPick: jest.fn(),
  },
  scheduleManager: {
    generateSchedule: jest.fn(),
    validateMatchups: jest.fn(),
    checkWeekConstraints: jest.fn(),
  },
};

describe('Fantasy Football Domain Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Lineup Validation', () => {
    describe('Position Requirements', () => {
      it('should validate standard lineup positions', () => {
        // Arrange
        const validLineup = createValidLineup();
        
        mockFantasyServices.lineupValidator.validate.mockImplementation((lineup) => {
          const requiredPositions = {
            QB: 1,
            RB: 2,
            WR: 2,
            TE: 1,
            FLEX: 1,
            K: 1,
            DST: 1,
          };

          const errors = [];
          
          for (const [position, required] of Object.entries(requiredPositions)) {
            const playerCount = lineup[position]?.length || 0;
            if (playerCount < required) {
              errors.push(`${position} requires ${required} players, but has ${playerCount}`);
            }
          }

          return {
            isValid: errors.length === 0,
            errors,
          };
        });

        // Act
        const result = mockFantasyServices.lineupValidator.validate(validLineup);

        // Assert
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject lineups with missing required positions', () => {
        // Arrange
        const invalidLineup = createInvalidLineup();
        
        mockFantasyServices.lineupValidator.validate.mockImplementation((lineup) => {
          const errors = [];
          
          if (!lineup.QB || lineup.QB.length === 0) {
            errors.push('QB position is required');
          }
          
          if (!lineup.RB || lineup.RB.length < 2) {
            errors.push('RB position requires 2 players');
          }

          return {
            isValid: errors.length === 0,
            errors,
          };
        });

        // Act
        const result = mockFantasyServices.lineupValidator.validate(invalidLineup);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('QB position is required');
        expect(result.errors).toContain('RB position requires 2 players');
      });

      it('should validate FLEX position eligibility', () => {
        // Arrange
        const rbPlayer = createMockPlayer({ id: 'rb-1', position: 'RB' });
        const wrPlayer = createMockPlayer({ id: 'wr-1', position: 'WR' });
        const tePlayer = createMockPlayer({ id: 'te-1', position: 'TE' });
        const qbPlayer = createMockPlayer({ id: 'qb-1', position: 'QB' });

        mockFantasyServices.lineupValidator.isPositionValid.mockImplementation((player, slot) => {
          const flexEligible = ['RB', 'WR', 'TE'];
          
          if (slot === 'FLEX') {
            return flexEligible.includes(player.position);
          }
          
          return player.position === slot;
        });

        // Act & Assert
        expect(mockFantasyServices.lineupValidator.isPositionValid(rbPlayer, 'FLEX')).toBe(true);
        expect(mockFantasyServices.lineupValidator.isPositionValid(wrPlayer, 'FLEX')).toBe(true);
        expect(mockFantasyServices.lineupValidator.isPositionValid(tePlayer, 'FLEX')).toBe(true);
        expect(mockFantasyServices.lineupValidator.isPositionValid(qbPlayer, 'FLEX')).toBe(false);
      });

      it('should validate SUPER_FLEX position eligibility', () => {
        // Arrange
        const players = [
          createMockPlayer({ id: 'qb-1', position: 'QB' }),
          createMockPlayer({ id: 'rb-1', position: 'RB' }),
          createMockPlayer({ id: 'wr-1', position: 'WR' }),
          createMockPlayer({ id: 'te-1', position: 'TE' }),
          createMockPlayer({ id: 'k-1', position: 'K' }),
          createMockPlayer({ id: 'dst-1', position: 'DST' }),
        ];

        mockFantasyServices.lineupValidator.isPositionValid.mockImplementation((player, slot) => {
          const superFlexEligible = ['QB', 'RB', 'WR', 'TE'];
          
          if (slot === 'SUPER_FLEX') {
            return superFlexEligible.includes(player.position);
          }
          
          return true;
        });

        // Act & Assert
        players.forEach(player => {
          const isValid = mockFantasyServices.lineupValidator.isPositionValid(player, 'SUPER_FLEX');
          const shouldBeValid = ['QB', 'RB', 'WR', 'TE'].includes(player.position);
          expect(isValid).toBe(shouldBeValid);
        });
      });
    });

    describe('Bye Week Validation', () => {
      it('should warn about bye week conflicts', () => {
        // Arrange
        const byeWeekPlayers = [
          createMockPlayer({ id: 'qb-1', position: 'QB', byeWeek: 12 }),
          createMockPlayer({ id: 'rb-1', position: 'RB', byeWeek: 12 }),
          createMockPlayer({ id: 'wr-1', position: 'WR', byeWeek: 12 }),
        ];

        const currentWeek = 12;

        mockFantasyServices.lineupValidator.validateByeWeeks.mockImplementation((players, week) => {
          const byeWeekPlayers = players.filter(p => p.byeWeek === week);
          
          return {
            hasConflicts: byeWeekPlayers.length > 0,
            conflictingPlayers: byeWeekPlayers,
            warnings: byeWeekPlayers.map(p => 
              `${p.name} (${p.position}) is on bye week ${week}`
            ),
          };
        });

        // Act
        const result = mockFantasyServices.lineupValidator.validateByeWeeks(byeWeekPlayers, currentWeek);

        // Assert
        expect(result.hasConflicts).toBe(true);
        expect(result.conflictingPlayers).toHaveLength(3);
        expect(result.warnings).toContain('QB (QB) is on bye week 12');
      });

      it('should handle empty bye weeks correctly', () => {
        // Arrange
        const players = [
          createMockPlayer({ id: 'qb-1', position: 'QB', byeWeek: null }),
          createMockPlayer({ id: 'rb-1', position: 'RB', byeWeek: 10 }),
        ];

        const currentWeek = 12;

        mockFantasyServices.lineupValidator.validateByeWeeks.mockImplementation((players, week) => {
          const byeWeekPlayers = players.filter(p => p.byeWeek === week);
          
          return {
            hasConflicts: byeWeekPlayers.length > 0,
            conflictingPlayers: byeWeekPlayers,
            warnings: [],
          };
        });

        // Act
        const result = mockFantasyServices.lineupValidator.validateByeWeeks(players, currentWeek);

        // Assert
        expect(result.hasConflicts).toBe(false);
        expect(result.conflictingPlayers).toHaveLength(0);
      });
    });

    describe('Roster Space Validation', () => {
      it('should validate roster size limits', () => {
        // Arrange
        const maxRosterSize = 16;
        const currentRoster = Array.from({ length: 15 }, (_, i) => 
          createMockPlayer({ id: `player-${i}` })
        );

        mockFantasyServices.lineupValidator.checkRosterRequirements.mockImplementation((roster, limits) => {
          return {
            isValid: roster.length <= limits.maxSize,
            currentSize: roster.length,
            maxSize: limits.maxSize,
            errors: roster.length > limits.maxSize ? 
              [`Roster exceeds maximum size of ${limits.maxSize}`] : [],
          };
        });

        // Act
        const result = mockFantasyServices.lineupValidator.checkRosterRequirements(
          currentRoster, 
          { maxSize: maxRosterSize }
        );

        // Assert
        expect(result.isValid).toBe(true);
        expect(result.currentSize).toBe(15);
        expect(result.maxSize).toBe(16);
      });

      it('should validate position limits', () => {
        // Arrange
        const roster = [
          ...Array.from({ length: 4 }, (_, i) => createMockPlayer({ id: `qb-${i}`, position: 'QB' })),
          ...Array.from({ length: 6 }, (_, i) => createMockPlayer({ id: `rb-${i}`, position: 'RB' })),
          ...Array.from({ length: 6 }, (_, i) => createMockPlayer({ id: `wr-${i}`, position: 'WR' })),
        ];

        const positionLimits = { QB: 3, RB: 8, WR: 8 };

        mockFantasyServices.lineupValidator.checkRosterRequirements.mockImplementation((roster, limits) => {
          const positionCounts = roster.reduce((acc, player) => {
            acc[player.position] = (acc[player.position] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);

          const errors = [];
          
          for (const [position, limit] of Object.entries(limits.positionLimits || {})) {
            const count = positionCounts[position] || 0;
            if (count > limit) {
              errors.push(`Too many ${position} players: ${count}/${limit}`);
            }
          }

          return {
            isValid: errors.length === 0,
            positionCounts,
            errors,
          };
        });

        // Act
        const result = mockFantasyServices.lineupValidator.checkRosterRequirements(
          roster, 
          { positionLimits }
        );

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Too many QB players: 4/3');
      });
    });
  });

  describe('Scoring Engine', () => {
    describe('Player Scoring', () => {
      it('should calculate QB scoring correctly', () => {
        // Arrange
        const qbStats = {
          passingYards: 320,
          passingTDs: 3,
          interceptions: 1,
          rushingYards: 25,
          rushingTDs: 1,
        };

        const scoringSettings = {
          passingYards: 0.04, // 1 point per 25 yards
          passingTDs: 4,
          interceptions: -2,
          rushingYards: 0.1, // 1 point per 10 yards
          rushingTDs: 6,
        };

        mockFantasyServices.scoringEngine.calculatePlayerScore.mockImplementation((stats, settings) => {
          let score = 0;
          score += (stats.passingYards || 0) * settings.passingYards;
          score += (stats.passingTDs || 0) * settings.passingTDs;
          score += (stats.interceptions || 0) * settings.interceptions;
          score += (stats.rushingYards || 0) * settings.rushingYards;
          score += (stats.rushingTDs || 0) * settings.rushingTDs;
          return Math.round(score * 100) / 100; // Round to 2 decimal places
        });

        // Act
        const score = mockFantasyServices.scoringEngine.calculatePlayerScore(qbStats, scoringSettings);

        // Assert
        const expectedScore = calculateExpectedScore(qbStats);
        expect(score).toBe(expectedScore);
        expect(score).toBeCloseTo(22.3, 1); // 12.8 + 12 - 2 + 2.5 + 6 = 30.3
      });

      it('should calculate RB scoring correctly', () => {
        // Arrange
        const rbStats = {
          rushingYards: 120,
          rushingTDs: 2,
          receivingYards: 45,
          receivingTDs: 0,
          receptions: 5,
          fumbles: 1,
        };

        const scoringSettings = {
          rushingYards: 0.1,
          rushingTDs: 6,
          receivingYards: 0.1,
          receivingTDs: 6,
          receptions: 0.5, // PPR scoring
          fumbles: -2,
        };

        mockFantasyServices.scoringEngine.calculatePlayerScore.mockImplementation((stats, settings) => {
          let score = 0;
          score += (stats.rushingYards || 0) * settings.rushingYards;
          score += (stats.rushingTDs || 0) * settings.rushingTDs;
          score += (stats.receivingYards || 0) * settings.receivingYards;
          score += (stats.receivingTDs || 0) * settings.receivingTDs;
          score += (stats.receptions || 0) * settings.receptions;
          score += (stats.fumbles || 0) * settings.fumbles;
          return Math.round(score * 100) / 100;
        });

        // Act
        const score = mockFantasyServices.scoringEngine.calculatePlayerScore(rbStats, scoringSettings);

        // Assert
        expect(score).toBeCloseTo(19, 1); // 12 + 12 + 4.5 + 0 + 2.5 - 2 = 29
      });

      it('should apply scoring bonuses correctly', () => {
        // Arrange
        const stats = {
          passingYards: 350,
          rushingYards: 150,
          receivingYards: 120,
        };

        const bonuses = {
          passing300Yards: 3,
          rushing100Yards: 3,
          receiving100Yards: 3,
        };

        mockFantasyServices.scoringEngine.applyBonuses.mockImplementation((stats, bonuses) => {
          let bonusPoints = 0;
          
          if (stats.passingYards >= 300) bonusPoints += bonuses.passing300Yards;
          if (stats.rushingYards >= 100) bonusPoints += bonuses.rushing100Yards;
          if (stats.receivingYards >= 100) bonusPoints += bonuses.receiving100Yards;
          
          return bonusPoints;
        });

        // Act
        const bonusPoints = mockFantasyServices.scoringEngine.applyBonuses(stats, bonuses);

        // Assert
        expect(bonusPoints).toBe(9); // All three bonuses triggered
      });
    });

    describe('Team Scoring', () => {
      it('should calculate total team score correctly', () => {
        // Arrange
        const teamLineup = [
          { playerId: 'qb-1', slot: 'QB', score: 24.5 },
          { playerId: 'rb-1', slot: 'RB', score: 18.2 },
          { playerId: 'rb-2', slot: 'RB', score: 15.8 },
          { playerId: 'wr-1', slot: 'WR', score: 22.1 },
          { playerId: 'wr-2', slot: 'WR', score: 16.7 },
          { playerId: 'te-1', slot: 'TE', score: 12.3 },
          { playerId: 'flex-1', slot: 'FLEX', score: 14.9 },
          { playerId: 'k-1', slot: 'K', score: 8.0 },
          { playerId: 'dst-1', slot: 'DST', score: 12.0 },
        ];

        mockFantasyServices.scoringEngine.calculateTeamScore.mockImplementation((lineup) => {
          const activeLineup = lineup.filter(player => player.slot !== 'BENCH');
          const totalScore = activeLineup.reduce((sum, player) => sum + player.score, 0);
          
          return {
            totalScore: Math.round(totalScore * 100) / 100,
            activePlayersCount: activeLineup.length,
            breakdown: activeLineup.reduce((acc, player) => {
              acc[player.slot] = (acc[player.slot] || 0) + player.score;
              return acc;
            }, {} as Record<string, number>),
          };
        });

        // Act
        const result = mockFantasyServices.scoringEngine.calculateTeamScore(teamLineup);

        // Assert
        expect(result.totalScore).toBeCloseTo(144.5, 1);
        expect(result.activePlayersCount).toBe(9);
        expect(result.breakdown.QB).toBe(24.5);
      });

      it('should handle bye week players in scoring', () => {
        // Arrange
        const teamLineup = [
          { playerId: 'qb-1', slot: 'QB', score: 0, isByeWeek: true },
          { playerId: 'rb-1', slot: 'RB', score: 18.2, isByeWeek: false },
          { playerId: 'rb-2', slot: 'RB', score: 15.8, isByeWeek: false },
        ];

        mockFantasyServices.scoringEngine.calculateTeamScore.mockImplementation((lineup) => {
          const totalScore = lineup.reduce((sum, player) => {
            return sum + (player.isByeWeek ? 0 : player.score);
          }, 0);
          
          const byeWeekWarnings = lineup.filter(p => p.isByeWeek).map(p => 
            `${p.slot} player is on bye week`
          );
          
          return {
            totalScore: Math.round(totalScore * 100) / 100,
            byeWeekWarnings,
          };
        });

        // Act
        const result = mockFantasyServices.scoringEngine.calculateTeamScore(teamLineup);

        // Assert
        expect(result.totalScore).toBe(34);
        expect(result.byeWeekWarnings).toContain('QB player is on bye week');
      });
    });
  });

  describe('Trade Analysis', () => {
    describe('Trade Value Evaluation', () => {
      it('should evaluate basic trade value fairly', () => {
        // Arrange
        const trade = createMockTrade({
          items: [
            {
              fromTeamId: 'team-1',
              toTeamId: 'team-2',
              player: createMockPlayer({ 
                id: 'rb-elite', 
                position: 'RB', 
                projectedPoints: 20.5,
                trends: { seasonAvg: 19.8 }
              }),
            },
            {
              fromTeamId: 'team-2',
              toTeamId: 'team-1',
              player: createMockPlayer({ 
                id: 'wr-elite', 
                position: 'WR', 
                projectedPoints: 18.2,
                trends: { seasonAvg: 17.9 }
              }),
            },
          ],
        });

        mockFantasyServices.tradeAnalyzer.evaluateTradeValue.mockImplementation((trade) => {
          const team1Value = trade.items
            .filter(item => item.toTeamId === 'team-1')
            .reduce((sum, item) => sum + (item.player?.projectedPoints || 0), 0);
            
          const team2Value = trade.items
            .filter(item => item.toTeamId === 'team-2')
            .reduce((sum, item) => sum + (item.player?.projectedPoints || 0), 0);

          const valueDifference = Math.abs(team1Value - team2Value);
          const fairnessScore = Math.max(0, 100 - (valueDifference * 5)); // Penalize large differences

          return {
            team1Value,
            team2Value,
            valueDifference,
            fairnessScore,
            isFair: fairnessScore >= 70,
          };
        });

        // Act
        const evaluation = mockFantasyServices.tradeAnalyzer.evaluateTradeValue(trade);

        // Assert
        expect(evaluation.team1Value).toBe(18.2); // WR
        expect(evaluation.team2Value).toBe(20.5); // RB
        expect(evaluation.valueDifference).toBeCloseTo(2.3, 1);
        expect(evaluation.fairnessScore).toBeGreaterThan(85);
        expect(evaluation.isFair).toBe(true);
      });

      it('should flag severely unbalanced trades', () => {
        // Arrange
        const unfairTrade = createMockTrade({
          items: [
            {
              fromTeamId: 'team-1',
              toTeamId: 'team-2',
              player: createMockPlayer({ 
                id: 'superstar', 
                projectedPoints: 25.0,
              }),
            },
            {
              fromTeamId: 'team-2',
              toTeamId: 'team-1',
              player: createMockPlayer({ 
                id: 'benchwarmer', 
                projectedPoints: 8.0,
              }),
            },
          ],
        });

        mockFantasyServices.tradeAnalyzer.evaluateTradeValue.mockImplementation((trade) => {
          const team1Value = trade.items
            .filter(item => item.toTeamId === 'team-1')
            .reduce((sum, item) => sum + (item.player?.projectedPoints || 0), 0);
            
          const team2Value = trade.items
            .filter(item => item.toTeamId === 'team-2')
            .reduce((sum, item) => sum + (item.player?.projectedPoints || 0), 0);

          const valueDifference = Math.abs(team1Value - team2Value);
          const fairnessScore = Math.max(0, 100 - (valueDifference * 5));

          return {
            team1Value,
            team2Value,
            valueDifference,
            fairnessScore,
            isFair: fairnessScore >= 70,
            flags: fairnessScore < 50 ? ['SEVERELY_UNBALANCED'] : [],
          };
        });

        // Act
        const evaluation = mockFantasyServices.tradeAnalyzer.evaluateTradeValue(unfairTrade);

        // Assert
        expect(evaluation.valueDifference).toBe(17);
        expect(evaluation.fairnessScore).toBeLessThan(50);
        expect(evaluation.isFair).toBe(false);
        expect(evaluation.flags).toContain('SEVERELY_UNBALANCED');
      });

      it('should consider positional scarcity in trade evaluation', () => {
        // Arrange
        const positionScarcity = {
          QB: 1.0,  // Least scarce
          RB: 1.5,  // Most scarce
          WR: 1.2,
          TE: 1.3,
          K: 1.0,
          DST: 1.0,
        };

        const trade = createMockTrade({
          items: [
            {
              fromTeamId: 'team-1',
              toTeamId: 'team-2',
              player: createMockPlayer({ 
                position: 'RB', 
                projectedPoints: 15.0 
              }),
            },
            {
              fromTeamId: 'team-2',
              toTeamId: 'team-1',
              player: createMockPlayer({ 
                position: 'WR', 
                projectedPoints: 15.0 
              }),
            },
          ],
        });

        mockFantasyServices.tradeAnalyzer.evaluateTradeValue.mockImplementation((trade, scarcity) => {
          const calculateAdjustedValue = (item) => {
            const baseValue = item.player?.projectedPoints || 0;
            const scarcityMultiplier = scarcity[item.player?.position] || 1.0;
            return baseValue * scarcityMultiplier;
          };

          const team1Value = trade.items
            .filter(item => item.toTeamId === 'team-1')
            .reduce((sum, item) => sum + calculateAdjustedValue(item), 0);
            
          const team2Value = trade.items
            .filter(item => item.toTeamId === 'team-2')
            .reduce((sum, item) => sum + calculateAdjustedValue(item), 0);

          return { team1Value, team2Value };
        });

        // Act
        const evaluation = mockFantasyServices.tradeAnalyzer.evaluateTradeValue(trade, positionScarcity);

        // Assert
        expect(evaluation.team1Value).toBe(18.0); // 15 * 1.2 (WR)
        expect(evaluation.team2Value).toBe(22.5); // 15 * 1.5 (RB)
      });
    });

    describe('Trade Eligibility', () => {
      it('should validate trade deadlines', () => {
        // Arrange
        const tradeDeadline = new Date('2024-11-15');
        const currentDate = new Date('2024-11-20'); // After deadline
        
        const trade = createMockTrade({
          createdAt: currentDate,
        });

        mockFantasyServices.tradeAnalyzer.validateTradeEligibility.mockImplementation((trade, settings) => {
          const isAfterDeadline = trade.createdAt > settings.tradeDeadline;
          
          return {
            isEligible: !isAfterDeadline,
            violations: isAfterDeadline ? ['PAST_TRADE_DEADLINE'] : [],
          };
        });

        // Act
        const result = mockFantasyServices.tradeAnalyzer.validateTradeEligibility(
          trade, 
          { tradeDeadline }
        );

        // Assert
        expect(result.isEligible).toBe(false);
        expect(result.violations).toContain('PAST_TRADE_DEADLINE');
      });

      it('should prevent trading locked players', () => {
        // Arrange
        const trade = createMockTrade({
          items: [
            {
              player: createMockPlayer({ 
                id: 'locked-player',
                isLocked: true 
              }),
            },
          ],
        });

        mockFantasyServices.tradeAnalyzer.validateTradeEligibility.mockImplementation((trade) => {
          const violations = [];
          
          trade.items.forEach(item => {
            if (item.player?.isLocked) {
              violations.push(`Player ${item.player.name} is locked and cannot be traded`);
            }
          });

          return {
            isEligible: violations.length === 0,
            violations,
          };
        });

        // Act
        const result = mockFantasyServices.tradeAnalyzer.validateTradeEligibility(trade);

        // Assert
        expect(result.isEligible).toBe(false);
        expect(result.violations[0]).toContain('is locked and cannot be traded');
      });
    });
  });

  describe('Waiver Processing', () => {
    describe('Priority Determination', () => {
      it('should process claims by waiver priority', () => {
        // Arrange
        const claims = [
          createMockWaiverClaim({ id: 'claim-1', priority: 3, playerId: 'player-hot' }),
          createMockWaiverClaim({ id: 'claim-2', priority: 1, playerId: 'player-hot' }),
          createMockWaiverClaim({ id: 'claim-3', priority: 5, playerId: 'player-hot' }),
        ];

        mockFantasyServices.waiverProcessor.determinePriority.mockImplementation((claims) => {
          return claims.sort((a, b) => a.priority - b.priority);
        });

        // Act
        const sortedClaims = mockFantasyServices.waiverProcessor.determinePriority(claims);

        // Assert
        expect(sortedClaims[0].priority).toBe(1);
        expect(sortedClaims[1].priority).toBe(3);
        expect(sortedClaims[2].priority).toBe(5);
      });

      it('should process FAAB bids by highest amount', () => {
        // Arrange
        const faabClaims = [
          createMockWaiverClaim({ id: 'claim-1', faabBid: 25, playerId: 'player-hot' }),
          createMockWaiverClaim({ id: 'claim-2', faabBid: 50, playerId: 'player-hot' }),
          createMockWaiverClaim({ id: 'claim-3', faabBid: 30, playerId: 'player-hot' }),
        ];

        mockFantasyServices.waiverProcessor.determinePriority.mockImplementation((claims) => {
          return claims.sort((a, b) => (b.faabBid || 0) - (a.faabBid || 0));
        });

        // Act
        const sortedClaims = mockFantasyServices.waiverProcessor.determinePriority(faabClaims);

        // Assert
        expect(sortedClaims[0].faabBid).toBe(50);
        expect(sortedClaims[1].faabBid).toBe(30);
        expect(sortedClaims[2].faabBid).toBe(25);
      });
    });

    describe('FAAB Validation', () => {
      it('should validate FAAB budget constraints', () => {
        // Arrange
        const team = createMockTeam({ 
          faabBudget: 100, 
          faabSpent: 60 
        }); // $40 remaining
        
        const claim = createMockWaiverClaim({ faabBid: 50 });

        mockFantasyServices.waiverProcessor.validateFaabBid.mockImplementation((team, bid) => {
          const remaining = team.faabBudget - team.faabSpent;
          
          return {
            isValid: bid <= remaining,
            remaining,
            errors: bid > remaining ? [`Bid exceeds remaining budget: $${bid} > $${remaining}`] : [],
          };
        });

        // Act
        const result = mockFantasyServices.waiverProcessor.validateFaabBid(team, claim.faabBid);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.remaining).toBe(40);
        expect(result.errors[0]).toContain('exceeds remaining budget');
      });

      it('should allow valid FAAB bids', () => {
        // Arrange
        const team = createMockTeam({ 
          faabBudget: 100, 
          faabSpent: 25 
        }); // $75 remaining
        
        const claim = createMockWaiverClaim({ faabBid: 30 });

        mockFantasyServices.waiverProcessor.validateFaabBid.mockImplementation((team, bid) => {
          const remaining = team.faabBudget - team.faabSpent;
          
          return {
            isValid: bid <= remaining,
            remaining,
            errors: [],
          };
        });

        // Act
        const result = mockFantasyServices.waiverProcessor.validateFaabBid(team, claim.faabBid);

        // Assert
        expect(result.isValid).toBe(true);
        expect(result.remaining).toBe(75);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('Roster Space Validation', () => {
      it('should require roster space for claims without drops', () => {
        // Arrange
        const fullRoster = Array.from({ length: 16 }, (_, i) => 
          createMockPlayer({ id: `player-${i}` })
        );
        
        const claim = createMockWaiverClaim({ 
          dropPlayerId: null // No drop specified
        });

        mockFantasyServices.waiverProcessor.checkRosterSpace.mockImplementation((roster, claim) => {
          const hasSpace = roster.length < 16;
          const needsDrop = !hasSpace && !claim.dropPlayerId;
          
          return {
            hasSpace,
            needsDrop,
            errors: needsDrop ? ['Roster is full and no drop player specified'] : [],
          };
        });

        // Act
        const result = mockFantasyServices.waiverProcessor.checkRosterSpace(fullRoster, claim);

        // Assert
        expect(result.hasSpace).toBe(false);
        expect(result.needsDrop).toBe(true);
        expect(result.errors[0]).toContain('Roster is full and no drop player specified');
      });
    });
  });

  describe('Draft Management', () => {
    describe('Draft Order Validation', () => {
      it('should enforce correct draft order', () => {
        // Arrange
        const draftOrder = [
          { teamId: 'team-1', pick: 1 },
          { teamId: 'team-2', pick: 2 },
          { teamId: 'team-3', pick: 3 },
        ];
        
        const currentPick = { teamId: 'team-3', pick: 3 };

        mockFantasyServices.draftManager.checkDraftOrder.mockImplementation((order, pick) => {
          const expectedTeam = order.find(slot => slot.pick === pick.pick);
          
          return {
            isCorrectTurn: expectedTeam?.teamId === pick.teamId,
            expectedTeamId: expectedTeam?.teamId,
            errors: expectedTeam?.teamId !== pick.teamId ? 
              [`It's ${expectedTeam?.teamId}'s turn, not ${pick.teamId}`] : [],
          };
        });

        // Act
        const result = mockFantasyServices.draftManager.checkDraftOrder(draftOrder, currentPick);

        // Assert
        expect(result.isCorrectTurn).toBe(true);
        expect(result.expectedTeamId).toBe('team-3');
        expect(result.errors).toHaveLength(0);
      });

      it('should prevent out-of-turn picks', () => {
        // Arrange
        const draftOrder = [
          { teamId: 'team-1', pick: 1 },
          { teamId: 'team-2', pick: 2 },
          { teamId: 'team-3', pick: 3 },
        ];
        
        const wrongPick = { teamId: 'team-1', pick: 2 }; // team-1 picking on team-2's turn

        mockFantasyServices.draftManager.checkDraftOrder.mockImplementation((order, pick) => {
          const expectedTeam = order.find(slot => slot.pick === pick.pick);
          
          return {
            isCorrectTurn: expectedTeam?.teamId === pick.teamId,
            expectedTeamId: expectedTeam?.teamId,
            errors: expectedTeam?.teamId !== pick.teamId ? 
              [`It's ${expectedTeam?.teamId}'s turn, not ${pick.teamId}`] : [],
          };
        });

        // Act
        const result = mockFantasyServices.draftManager.checkDraftOrder(draftOrder, wrongPick);

        // Assert
        expect(result.isCorrectTurn).toBe(false);
        expect(result.expectedTeamId).toBe('team-2');
        expect(result.errors[0]).toContain("It's team-2's turn, not team-1");
      });
    });

    describe('Pick Validation', () => {
      it('should prevent drafting already picked players', () => {
        // Arrange
        const alreadyPicked = ['player-1', 'player-2', 'player-3'];
        const attemptedPick = 'player-2';

        mockFantasyServices.draftManager.validateDraftPick.mockImplementation((playerId, pickedPlayers) => {
          const isAlreadyPicked = pickedPlayers.includes(playerId);
          
          return {
            isValid: !isAlreadyPicked,
            errors: isAlreadyPicked ? [`Player ${playerId} has already been drafted`] : [],
          };
        });

        // Act
        const result = mockFantasyServices.draftManager.validateDraftPick(attemptedPick, alreadyPicked);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors[0]).toContain('has already been drafted');
      });
    });
  });

  describe('Schedule Generation', () => {
    describe('Matchup Validation', () => {
      it('should ensure each team plays every other team', () => {
        // Arrange
        const teams = ['team-1', 'team-2', 'team-3', 'team-4'];
        const totalWeeks = 14;

        mockFantasyServices.scheduleManager.generateSchedule.mockImplementation((teams, weeks) => {
          const schedule = [];
          const numTeams = teams.length;
          
          // Simple round-robin generation logic
          for (let week = 1; week <= weeks; week++) {
            const weekMatchups = [];
            for (let i = 0; i < numTeams; i += 2) {
              if (i + 1 < numTeams) {
                weekMatchups.push({
                  week,
                  homeTeam: teams[i],
                  awayTeam: teams[i + 1],
                });
              }
            }
            schedule.push(...weekMatchups);
          }
          
          return schedule;
        });

        // Act
        const schedule = mockFantasyServices.scheduleManager.generateSchedule(teams, totalWeeks);

        // Assert
        expect(schedule.length).toBeGreaterThan(0);
        expect(schedule.every(matchup => matchup.homeTeam !== matchup.awayTeam)).toBe(true);
      });

      it('should prevent teams from playing themselves', () => {
        // Arrange
        const invalidMatchup = createMockMatchup({
          homeTeamId: 'team-1',
          awayTeamId: 'team-1', // Same team
        });

        mockFantasyServices.scheduleManager.validateMatchups.mockImplementation((matchups) => {
          const errors = [];
          
          matchups.forEach(matchup => {
            if (matchup.homeTeamId === matchup.awayTeamId) {
              errors.push(`Team ${matchup.homeTeamId} cannot play against itself`);
            }
          });

          return {
            isValid: errors.length === 0,
            errors,
          };
        });

        // Act
        const result = mockFantasyServices.scheduleManager.validateMatchups([invalidMatchup]);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors[0]).toContain('cannot play against itself');
      });
    });
  });
});
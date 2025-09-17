/**
 * Validation Utilities
 * 
 * Comprehensive validation utilities for Sleeper API data validation,
 * cross-reference checking, and data integrity verification.
 * 
 * Features:
 * - Schema validation with detailed error reporting
 * - Cross-reference validation between related data
 * - Business logic validation for fantasy football rules
 * - Data consistency checking across time periods
 * - Custom validation rule engine
 */

import { z } from 'zod';
import { 
  SleeperPlayer, 
  SleeperLeague, 
  SleeperRoster, 
  SleeperUser, 
  SleeperTransaction, 
  SleeperMatchup, 
  PlayerStats,
  NFLState 
} from '@/types/sleeper';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  score: number; // 0-100
  metadata: {
    validatedAt: Date;
    validationRules: string[];
    dataSource: string;
  };
}

export interface ValidationError {
  code: string;
  message: string;
  field?: string;
  value?: any;
  severity: 'critical' | 'major' | 'minor';
  suggestion?: string;
}

export interface ValidationWarning {
  code: string;
  message: string;
  field?: string;
  value?: any;
  suggestion?: string;
}

export interface CrossReferenceResult {
  entity: string;
  references: {
    valid: number;
    invalid: number;
    missing: number;
    total: number;
  };
  issues: string[];
}

export interface DataConsistencyResult {
  timeframe: string;
  consistencyScore: number;
  inconsistencies: {
    field: string;
    expectedValue: any;
    actualValue: any;
    timestamp: Date;
  }[];
}

export class ValidationUtils {
  /**
   * Validate NFL player data
   */
  static validatePlayer(player: SleeperPlayer): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Required field validation
    if (!player.player_id || player.player_id.trim() === '') {
      errors.push({
        code: 'MISSING_PLAYER_ID',
        message: 'Player ID is required',
        field: 'player_id',
        value: player.player_id,
        severity: 'critical',
        suggestion: 'Ensure player_id is provided and not empty'
      });
    }

    // Name validation
    if (!player.full_name && (!player.first_name || !player.last_name)) {
      errors.push({
        code: 'MISSING_PLAYER_NAME',
        message: 'Player must have either full_name or both first_name and last_name',
        severity: 'critical',
        suggestion: 'Provide complete name information'
      });
    }

    // Position validation
    const validPositions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF', 'DL', 'LB', 'DB'];
    if (player.position && !validPositions.includes(player.position)) {
      warnings.push({
        code: 'INVALID_POSITION',
        message: `Invalid position: ${player.position}`,
        field: 'position',
        value: player.position,
        suggestion: `Valid positions are: ${validPositions.join(', ')}`
      });
    }

    // Team validation
    const validTeams = [
      'ARI', 'ATL', 'BAL', 'BUF', 'CAR', 'CHI', 'CIN', 'CLE', 'DAL', 'DEN',
      'DET', 'GB', 'HOU', 'IND', 'JAX', 'KC', 'LV', 'LAC', 'LAR', 'MIA',
      'MIN', 'NE', 'NO', 'NYG', 'NYJ', 'PHI', 'PIT', 'SF', 'SEA', 'TB',
      'TEN', 'WAS'
    ];
    if (player.team && !validTeams.includes(player.team)) {
      errors.push({
        code: 'INVALID_TEAM',
        message: `Invalid team code: ${player.team}`,
        field: 'team',
        value: player.team,
        severity: 'major',
        suggestion: `Valid team codes are: ${validTeams.join(', ')}`
      });
    }

    // Age validation
    if (player.age !== null && player.age !== undefined) {
      if (player.age < 18 || player.age > 50) {
        warnings.push({
          code: 'UNUSUAL_AGE',
          message: `Unusual age for NFL player: ${player.age}`,
          field: 'age',
          value: player.age,
          suggestion: 'Verify age is correct'
        });
      }
    }

    // Years of experience validation
    if (player.years_exp !== null && player.years_exp !== undefined && player.age) {
      const expectedMinAge = player.years_exp + 22; // Minimum NFL age is typically 22
      if (player.age < expectedMinAge) {
        warnings.push({
          code: 'AGE_EXPERIENCE_MISMATCH',
          message: `Age (${player.age}) seems inconsistent with years of experience (${player.years_exp})`,
          suggestion: 'Verify age and experience data'
        });
      }
    }

    // Status validation
    const validStatuses = ['Active', 'Inactive', 'Injured Reserve', 'Physically Unable to Perform', 'Practice Squad'];
    if (player.status && !validStatuses.includes(player.status)) {
      warnings.push({
        code: 'INVALID_STATUS',
        message: `Invalid player status: ${player.status}`,
        field: 'status',
        value: player.status,
        suggestion: `Valid statuses are: ${validStatuses.join(', ')}`
      });
    }

    // Injury status consistency
    if (player.injury_status && !player.injury_body_part) {
      warnings.push({
        code: 'INCOMPLETE_INJURY_INFO',
        message: 'Injury status provided but missing body part information',
        suggestion: 'Include injury_body_part when injury_status is present'
      });
    }

    // Calculate validation score
    const totalChecks = 8;
    const failedChecks = errors.filter(e => e.severity === 'critical').length;
    const score = Math.max(0, Math.round(((totalChecks - failedChecks) / totalChecks) * 100));

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score,
      metadata: {
        validatedAt: new Date(),
        validationRules: ['required_fields', 'position_validity', 'team_validity', 'age_range', 'status_validity'],
        dataSource: 'sleeper_api'
      }
    };
  }

  /**
   * Validate league configuration
   */
  static validateLeague(league: SleeperLeague): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Required fields
    if (!league.league_id) {
      errors.push({
        code: 'MISSING_LEAGUE_ID',
        message: 'League ID is required',
        field: 'league_id',
        severity: 'critical'
      });
    }

    if (!league.name || league.name.trim() === '') {
      errors.push({
        code: 'MISSING_LEAGUE_NAME',
        message: 'League name is required',
        field: 'name',
        severity: 'critical'
      });
    }

    // Team count validation
    if (league.total_rosters < 4 || league.total_rosters > 20) {
      warnings.push({
        code: 'UNUSUAL_TEAM_COUNT',
        message: `Unusual number of teams: ${league.total_rosters}`,
        field: 'total_rosters',
        value: league.total_rosters,
        suggestion: 'Most leagues have 8-16 teams'
      });
    }

    // Playoff validation
    if (league.settings.playoff_teams && league.settings.playoff_teams > league.total_rosters) {
      errors.push({
        code: 'INVALID_PLAYOFF_TEAMS',
        message: 'More playoff teams than total teams',
        field: 'playoff_teams',
        severity: 'major'
      });
    }

    // Scoring settings validation
    if (!league.scoring_settings || Object.keys(league.scoring_settings).length === 0) {
      errors.push({
        code: 'MISSING_SCORING_SETTINGS',
        message: 'League must have scoring settings defined',
        field: 'scoring_settings',
        severity: 'critical'
      });
    }

    // Roster positions validation
    if (!league.roster_positions || league.roster_positions.length === 0) {
      errors.push({
        code: 'MISSING_ROSTER_POSITIONS',
        message: 'League must define roster positions',
        field: 'roster_positions',
        severity: 'critical'
      });
    }

    const score = errors.length === 0 ? 100 : Math.max(0, 100 - (errors.length * 20));

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score,
      metadata: {
        validatedAt: new Date(),
        validationRules: ['required_fields', 'team_count', 'playoff_settings', 'scoring_settings'],
        dataSource: 'sleeper_api'
      }
    };
  }

  /**
   * Validate roster composition
   */
  static validateRoster(roster: SleeperRoster, league: SleeperLeague): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Required fields
    if (!roster.roster_id) {
      errors.push({
        code: 'MISSING_ROSTER_ID',
        message: 'Roster ID is required',
        severity: 'critical'
      });
    }

    if (!roster.owner_id) {
      errors.push({
        code: 'MISSING_OWNER_ID',
        message: 'Owner ID is required',
        severity: 'critical'
      });
    }

    // Player count validation
    const expectedRosterSize = league.roster_positions.length;
    const actualRosterSize = roster.players?.length || 0;
    
    if (actualRosterSize !== expectedRosterSize) {
      warnings.push({
        code: 'ROSTER_SIZE_MISMATCH',
        message: `Roster has ${actualRosterSize} players but league expects ${expectedRosterSize}`,
        suggestion: 'Check roster composition and league settings'
      });
    }

    // Starters validation
    const starterPositions = league.roster_positions.filter(pos => !pos.startsWith('BN') && pos !== 'IR');
    const expectedStarters = starterPositions.length;
    const actualStarters = roster.starters?.length || 0;

    if (actualStarters !== expectedStarters) {
      warnings.push({
        code: 'STARTER_COUNT_MISMATCH',
        message: `Roster has ${actualStarters} starters but league expects ${expectedStarters}`,
        suggestion: 'Verify starter lineup configuration'
      });
    }

    // Duplicate player check
    if (roster.players) {
      const uniquePlayers = new Set(roster.players);
      if (uniquePlayers.size !== roster.players.length) {
        errors.push({
          code: 'DUPLICATE_PLAYERS',
          message: 'Roster contains duplicate players',
          severity: 'major'
        });
      }
    }

    const score = errors.length === 0 ? 100 : Math.max(0, 100 - (errors.length * 25));

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score,
      metadata: {
        validatedAt: new Date(),
        validationRules: ['required_fields', 'roster_size', 'starter_count', 'duplicate_check'],
        dataSource: 'sleeper_api'
      }
    };
  }

  /**
   * Validate transaction integrity
   */
  static validateTransaction(transaction: SleeperTransaction): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Required fields
    if (!transaction.transaction_id) {
      errors.push({
        code: 'MISSING_TRANSACTION_ID',
        message: 'Transaction ID is required',
        severity: 'critical'
      });
    }

    // Type validation
    const validTypes = ['trade', 'waiver', 'free_agent'];
    if (!validTypes.includes(transaction.type)) {
      errors.push({
        code: 'INVALID_TRANSACTION_TYPE',
        message: `Invalid transaction type: ${transaction.type}`,
        field: 'type',
        severity: 'major'
      });
    }

    // Status validation
    const validStatuses = ['complete', 'processing', 'failed'];
    if (!validStatuses.includes(transaction.status)) {
      errors.push({
        code: 'INVALID_TRANSACTION_STATUS',
        message: `Invalid transaction status: ${transaction.status}`,
        field: 'status',
        severity: 'major'
      });
    }

    // Player movement validation
    const hasAdds = transaction.adds && Object.keys(transaction.adds).length > 0;
    const hasDrops = transaction.drops && Object.keys(transaction.drops).length > 0;
    
    if (!hasAdds && !hasDrops) {
      errors.push({
        code: 'NO_PLAYER_MOVEMENT',
        message: 'Transaction must include player adds or drops',
        severity: 'major'
      });
    }

    // Trade-specific validation
    if (transaction.type === 'trade') {
      if (!transaction.roster_ids || transaction.roster_ids.length < 2) {
        errors.push({
          code: 'INVALID_TRADE_PARTICIPANTS',
          message: 'Trade must involve at least 2 teams',
          severity: 'major'
        });
      }
    }

    // Timestamp validation
    if (transaction.created && transaction.created > Date.now()) {
      warnings.push({
        code: 'FUTURE_TIMESTAMP',
        message: 'Transaction timestamp is in the future',
        suggestion: 'Verify transaction timestamp'
      });
    }

    const score = errors.length === 0 ? 100 : Math.max(0, 100 - (errors.length * 20));

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score,
      metadata: {
        validatedAt: new Date(),
        validationRules: ['required_fields', 'type_validity', 'player_movement', 'trade_rules'],
        dataSource: 'sleeper_api'
      }
    };
  }

  /**
   * Validate player statistics
   */
  static validatePlayerStats(stats: PlayerStats, playerId: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Negative stats validation (only certain stats can be negative)
    const allowedNegativeStats = ['pass_int', 'fum_lost'];
    
    Object.entries(stats).forEach(([key, value]) => {
      if (typeof value === 'number' && value < 0 && !allowedNegativeStats.includes(key)) {
        warnings.push({
          code: 'NEGATIVE_STAT',
          message: `Negative value for ${key}: ${value}`,
          field: key,
          value,
          suggestion: 'Verify stat value is correct'
        });
      }
    });

    // Unrealistic stat values
    if (stats.pass_yd && stats.pass_yd > 600) {
      warnings.push({
        code: 'UNREALISTIC_PASSING_YARDS',
        message: `Very high passing yards: ${stats.pass_yd}`,
        field: 'pass_yd',
        value: stats.pass_yd,
        suggestion: 'Verify passing yards are correct'
      });
    }

    if (stats.rush_yd && stats.rush_yd > 400) {
      warnings.push({
        code: 'UNREALISTIC_RUSHING_YARDS',
        message: `Very high rushing yards: ${stats.rush_yd}`,
        field: 'rush_yd',
        value: stats.rush_yd,
        suggestion: 'Verify rushing yards are correct'
      });
    }

    // Fantasy points consistency
    if (stats.pts_ppr !== undefined && stats.pts_std !== undefined) {
      const pprDifference = stats.pts_ppr - stats.pts_std;
      const expectedReceptionPoints = stats.rec || 0;
      
      if (Math.abs(pprDifference - expectedReceptionPoints) > 0.1) {
        warnings.push({
          code: 'PPR_CALCULATION_INCONSISTENCY',
          message: 'PPR points calculation appears inconsistent',
          suggestion: 'Verify reception points calculation'
        });
      }
    }

    const score = errors.length === 0 ? 100 : Math.max(0, 100 - (errors.length * 30));

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score,
      metadata: {
        validatedAt: new Date(),
        validationRules: ['negative_stats', 'unrealistic_values', 'ppr_consistency'],
        dataSource: 'sleeper_api'
      }
    };
  }

  /**
   * Cross-reference validation between players and rosters
   */
  static validatePlayerRosterReferences(
    players: Record<string, SleeperPlayer>,
    rosters: SleeperRoster[]
  ): CrossReferenceResult {
    const issues: string[] = [];
    let validReferences = 0;
    let invalidReferences = 0;
    let missingReferences = 0;

    const allRosterPlayers = new Set<string>();
    
    // Collect all player IDs from rosters
    rosters.forEach(roster => {
      [
        ...(roster.players || []),
        ...(roster.starters || []),
        ...(roster.reserve || []),
        ...(roster.taxi || [])
      ].forEach(playerId => allRosterPlayers.add(playerId));
    });

    // Check if roster players exist in player database
    allRosterPlayers.forEach(playerId => {
      if (players[playerId]) {
        validReferences++;
      } else {
        invalidReferences++;
        issues.push(`Player ${playerId} referenced in roster but not found in player database`);
      }
    });

    // Check for orphaned players (in database but not in any roster)
    const playerIds = Object.keys(players);
    const orphanedPlayers = playerIds.filter(playerId => !allRosterPlayers.has(playerId));
    
    if (orphanedPlayers.length > 0) {
      issues.push(`${orphanedPlayers.length} players in database but not assigned to any roster`);
    }

    return {
      entity: 'player_roster_references',
      references: {
        valid: validReferences,
        invalid: invalidReferences,
        missing: missingReferences,
        total: allRosterPlayers.size
      },
      issues
    };
  }

  /**
   * Validate data consistency across time periods
   */
  static validateDataConsistency(
    previousData: any,
    currentData: any,
    timeframe: string
  ): DataConsistencyResult {
    const inconsistencies: DataConsistencyResult['inconsistencies'] = [];
    
    // Compare data structures and identify changes
    const comparePaths = (prev: any, curr: any, path: string = '') => {
      if (typeof prev !== typeof curr) {
        inconsistencies.push({
          field: path,
          expectedValue: prev,
          actualValue: curr,
          timestamp: new Date()
        });
        return;
      }

      if (typeof prev === 'object' && prev !== null) {
        Object.keys(prev).forEach(key => {
          const newPath = path ? `${path}.${key}` : key;
          if (curr && curr[key] !== undefined) {
            comparePaths(prev[key], curr[key], newPath);
          } else {
            inconsistencies.push({
              field: newPath,
              expectedValue: prev[key],
              actualValue: undefined,
              timestamp: new Date()
            });
          }
        });
      } else if (prev !== curr) {
        inconsistencies.push({
          field: path,
          expectedValue: prev,
          actualValue: curr,
          timestamp: new Date()
        });
      }
    };

    comparePaths(previousData, currentData);

    // Calculate consistency score
    const totalFields = this.countFields(previousData);
    const consistencyScore = totalFields > 0 
      ? Math.max(0, 100 - (inconsistencies.length / totalFields) * 100)
      : 100;

    return {
      timeframe,
      consistencyScore,
      inconsistencies
    };
  }

  /**
   * Count total fields in an object (recursive)
   */
  private static countFields(obj: any, count: number = 0): number {
    if (typeof obj === 'object' && obj !== null) {
      Object.values(obj).forEach(value => {
        count++;
        if (typeof value === 'object' && value !== null) {
          count = this.countFields(value, count);
        }
      });
    }
    return count;
  }

  /**
   * Batch validation for multiple entities
   */
  static batchValidate<T>(
    entities: T[],
    validator: (entity: T) => ValidationResult
  ): {
    overallScore: number;
    results: ValidationResult[];
    summary: {
      total: number;
      valid: number;
      invalid: number;
      avgScore: number;
    };
  } {
    const results = entities.map(validator);
    
    const valid = results.filter(r => r.isValid).length;
    const invalid = results.length - valid;
    const avgScore = results.length > 0 
      ? results.reduce((sum, r) => sum + r.score, 0) / results.length 
      : 0;
    
    return {
      overallScore: avgScore,
      results,
      summary: {
        total: results.length,
        valid,
        invalid,
        avgScore
      }
    };
  }

  /**
   * Generate validation report
   */
  static generateValidationReport(results: ValidationResult[]): string {
    const totalResults = results.length;
    const validResults = results.filter(r => r.isValid).length;
    const avgScore = totalResults > 0 
      ? results.reduce((sum, r) => sum + r.score, 0) / totalResults 
      : 0;

    const allErrors = results.flatMap(r => r.errors);
    const allWarnings = results.flatMap(r => r.warnings);

    const errorsByCode = allErrors.reduce((acc, error) => {
      acc[error.code] = (acc[error.code] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const warningsByCode = allWarnings.reduce((acc, warning) => {
      acc[warning.code] = (acc[warning.code] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return `
# Validation Report

**Generated**: ${new Date().toISOString()}
**Total Validations**: ${totalResults}
**Valid Results**: ${validResults} (${((validResults / totalResults) * 100).toFixed(1)}%)
**Average Score**: ${avgScore.toFixed(1)}/100

## Error Summary
**Total Errors**: ${allErrors.length}

${Object.entries(errorsByCode).map(([code, count]) => 
  `- **${code}**: ${count} occurrences`
).join('\n')}

## Warning Summary  
**Total Warnings**: ${allWarnings.length}

${Object.entries(warningsByCode).map(([code, count]) => 
  `- **${code}**: ${count} occurrences`
).join('\n')}

## Recommendations
${avgScore < 80 ? '- ⚠️ Low validation score. Review and fix critical errors.' : ''}
${allErrors.filter(e => e.severity === 'critical').length > 0 ? '- ❌ Critical errors found. Immediate attention required.' : ''}
${allWarnings.length > totalResults * 0.1 ? '- ⚠️ High warning count. Consider reviewing data quality.' : ''}
${validResults === totalResults ? '- ✅ All validations passed successfully!' : ''}
    `.trim();
  }
}
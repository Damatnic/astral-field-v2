// Fantasy Football Application Constants
export const FANTASY_CONSTANTS = {
  // Default League IDs for testing
  DEFAULT_LEAGUE_ID: '1',
  DEFAULT_TEST_LEAGUE_ID: 'test-league-123',
  
  // Default Team IDs
  DEFAULT_TEAM_ID: '1',
  DEFAULT_TEST_TEAM_ID: 'test-team-123',
  
  // Default User IDs
  DEFAULT_USER_ID: '1',
  DEFAULT_TEST_USER_ID: 'test-user-123',
  
  // Draft Settings
  DEFAULT_DRAFT_ID: 'test-draft-123',
  DEFAULT_ROUND: 1,
  DEFAULT_PICK: 1,
  
  // Scoring Settings
  DEFAULT_WEEK: 3, // Current NFL week
  DEFAULT_SEASON: 2025,
  
  // Trade Settings
  DEFAULT_TRADE_ID: 'test-trade-123',
  
  // Waiver Settings
  DEFAULT_WAIVER_ORDER: 1,
  DEFAULT_PRIORITY: 1,
  
  // Player Settings
  DEFAULT_POSITION: 'QB',
  DEFAULT_PLAYER_LIMIT: 20,
  
  // Pagination
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  DEFAULT_OFFSET: 0
};

// Utility function to validate and provide defaults
export function validateAndDefault<T>(value: T | undefined, defaultValue: T): T {
  return value !== undefined ? value : defaultValue;
}

// Parameter validation helpers
export function getLeagueIdOrDefault(leagueId?: string): string {
  return validateAndDefault(leagueId, FANTASY_CONSTANTS.DEFAULT_LEAGUE_ID);
}

export function getTeamIdOrDefault(teamId?: string): string {
  return validateAndDefault(teamId, FANTASY_CONSTANTS.DEFAULT_TEAM_ID);
}

export function getUserIdOrDefault(userId?: string): string {
  return validateAndDefault(userId, FANTASY_CONSTANTS.DEFAULT_USER_ID);
}

export function getWeekOrDefault(week?: number): number {
  return validateAndDefault(week, FANTASY_CONSTANTS.DEFAULT_WEEK);
}

export function getSeasonOrDefault(season?: number): number {
  return validateAndDefault(season, FANTASY_CONSTANTS.DEFAULT_SEASON);
}

export function getPageOrDefault(page?: number): number {
  return validateAndDefault(page, FANTASY_CONSTANTS.DEFAULT_PAGE);
}

export function getLimitOrDefault(limit?: number): number {
  return validateAndDefault(limit, FANTASY_CONSTANTS.DEFAULT_LIMIT);
}

// Export specific constants for backwards compatibility
export const DEFAULT_LEAGUE_ID = FANTASY_CONSTANTS.DEFAULT_LEAGUE_ID;
export const DEFAULT_TEAM_ID = FANTASY_CONSTANTS.DEFAULT_TEAM_ID;
export const DEFAULT_USER_ID = FANTASY_CONSTANTS.DEFAULT_USER_ID;
export const DEFAULT_WEEK = FANTASY_CONSTANTS.DEFAULT_WEEK;
export const DEFAULT_SEASON = FANTASY_CONSTANTS.DEFAULT_SEASON;
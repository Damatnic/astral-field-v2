/**
 * Theme utility functions for AstralField design system
 */

import { colors, semanticColors, darkColors, type TeamColor } from '../tokens/colors';

/**
 * Theme mode type
 */
export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * Team theme configuration
 */
export interface TeamTheme {
  primary: string;
  secondary: string;
  accent: string;
  name: string;
}

/**
 * Complete theme configuration
 */
export interface Theme {
  mode: ThemeMode;
  team?: TeamColor;
  colors: typeof semanticColors;
  teamColors?: TeamTheme;
}

/**
 * Get team colors by team key
 * 
 * @param teamKey - NFL team key
 * @returns Team color configuration
 */
export function getTeamColors(teamKey: TeamColor): TeamTheme {
  const teamColors = colors.teams[teamKey];
  return {
    primary: teamColors.primary,
    secondary: teamColors.secondary,
    accent: teamColors.accent,
    name: teamKey,
  };
}

/**
 * Get all available team options
 * 
 * @returns Array of team configurations
 */
export function getAllTeams(): Array<{ key: TeamColor; name: string; colors: TeamTheme }> {
  return Object.entries(colors.teams).map(([key, colors]) => ({
    key: key as TeamColor,
    name: formatTeamName(key as TeamColor),
    colors: {
      primary: colors.primary,
      secondary: colors.secondary,
      accent: colors.accent,
      name: key,
    },
  }));
}

/**
 * Format team key to display name
 * 
 * @param teamKey - Team key
 * @returns Formatted team name
 */
export function formatTeamName(teamKey: TeamColor): string {
  const teamNames: Record<TeamColor, string> = {
    // AFC East
    bills: 'Buffalo Bills',
    dolphins: 'Miami Dolphins',
    patriots: 'New England Patriots',
    jets: 'New York Jets',
    
    // AFC North
    ravens: 'Baltimore Ravens',
    bengals: 'Cincinnati Bengals',
    browns: 'Cleveland Browns',
    steelers: 'Pittsburgh Steelers',
    
    // AFC South
    texans: 'Houston Texans',
    colts: 'Indianapolis Colts',
    jaguars: 'Jacksonville Jaguars',
    titans: 'Tennessee Titans',
    
    // AFC West
    broncos: 'Denver Broncos',
    chiefs: 'Kansas City Chiefs',
    raiders: 'Las Vegas Raiders',
    chargers: 'Los Angeles Chargers',
    
    // NFC East
    cowboys: 'Dallas Cowboys',
    giants: 'New York Giants',
    eagles: 'Philadelphia Eagles',
    commanders: 'Washington Commanders',
    
    // NFC North
    bears: 'Chicago Bears',
    packers: 'Green Bay Packers',
    lions: 'Detroit Lions',
    vikings: 'Minnesota Vikings',
    
    // NFC South
    falcons: 'Atlanta Falcons',
    panthers: 'Carolina Panthers',
    saints: 'New Orleans Saints',
    buccaneers: 'Tampa Bay Buccaneers',
    
    // NFC West
    cardinals: 'Arizona Cardinals',
    rams: 'Los Angeles Rams',
    seahawks: 'Seattle Seahawks',
    niners: 'San Francisco 49ers',
  };
  
  return teamNames[teamKey] || teamKey;
}

/**
 * Generate CSS custom properties for theme colors
 * 
 * @param mode - Theme mode
 * @param teamKey - Optional team key for team-specific colors
 * @returns CSS custom properties object
 */
export function generateThemeCSS(mode: ThemeMode = 'light', teamKey?: TeamColor): Record<string, string> {
  const baseColors = mode === 'dark' ? darkColors : semanticColors;
  const css: Record<string, string> = {};
  
  // Generate CSS custom properties for semantic colors
  Object.entries(baseColors).forEach(([category, colorGroup]) => {
    Object.entries(colorGroup).forEach(([variant, value]) => {
      css[`--color-${category}-${variant}`] = value;
    });
  });
  
  // Add team-specific colors if provided
  if (teamKey) {
    const teamColors = getTeamColors(teamKey);
    css['--color-team-primary'] = teamColors.primary;
    css['--color-team-secondary'] = teamColors.secondary;
    css['--color-team-accent'] = teamColors.accent;
  }
  
  return css;
}

/**
 * Apply theme to document root
 * 
 * @param mode - Theme mode
 * @param teamKey - Optional team key
 */
export function applyTheme(mode: ThemeMode = 'light', teamKey?: TeamColor): void {
  const css = generateThemeCSS(mode, teamKey);
  const root = document.documentElement;
  
  Object.entries(css).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });
  
  // Set data attribute for CSS targeting
  root.setAttribute('data-theme', mode);
  if (teamKey) {
    root.setAttribute('data-team', teamKey);
  }
}

/**
 * Get system theme preference
 * 
 * @returns 'light' or 'dark' based on system preference
 */
export function getSystemTheme(): 'light' | 'dark' {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

/**
 * Create a theme context value
 * 
 * @param mode - Theme mode
 * @param teamKey - Optional team key
 * @returns Complete theme configuration
 */
export function createTheme(mode: ThemeMode = 'light', teamKey?: TeamColor): Theme {
  const actualMode = mode === 'system' ? getSystemTheme() : mode;
  const themeColors = actualMode === 'dark' ? darkColors : semanticColors;
  
  return {
    mode,
    team: teamKey,
    colors: themeColors,
    teamColors: teamKey ? getTeamColors(teamKey) : undefined,
  };
}

/**
 * Validate if a string is a valid team key
 * 
 * @param value - String to validate
 * @returns True if valid team key
 */
export function isValidTeamKey(value: string): value is TeamColor {
  return value in colors.teams;
}

/**
 * Get contrasting text color for a background color
 * 
 * @param backgroundColor - Hex color string
 * @returns 'light' or 'dark' text recommendation
 */
export function getContrastingTextColor(backgroundColor: string): 'light' | 'dark' {
  // Remove # if present
  const hex = backgroundColor.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  return luminance > 0.5 ? 'dark' : 'light';
}
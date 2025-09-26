/**
 * Formatting utility functions for AstralField
 */

/**
 * Format a number with proper decimal places and thousands separators
 * 
 * @param value - Number to format
 * @param options - Formatting options
 * @returns Formatted number string
 */
export function formatNumber(
  value: number,
  options: {
    decimals?: number;
    useGrouping?: boolean;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  } = {}
): string {
  const {
    decimals,
    useGrouping = true,
    minimumFractionDigits = 0,
    maximumFractionDigits = decimals ?? 2,
  } = options;

  return new Intl.NumberFormat('en-US', {
    useGrouping,
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(value);
}

/**
 * Format a percentage with proper decimal places
 * 
 * @param value - Decimal value (0.5 = 50%)
 * @param decimals - Number of decimal places
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${formatNumber(value * 100, { decimals })}%`;
}

/**
 * Format currency value
 * 
 * @param value - Currency amount
 * @param currency - Currency code (default: USD)
 * @param decimals - Number of decimal places
 * @returns Formatted currency string
 */
export function formatCurrency(
  value: number,
  currency: string = 'USD',
  decimals?: number
): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format large numbers with abbreviations (K, M, B, T)
 * 
 * @param value - Number to format
 * @param decimals - Number of decimal places
 * @returns Formatted abbreviated number string
 */
export function formatAbbreviatedNumber(value: number, decimals: number = 1): string {
  const absValue = Math.abs(value);
  
  if (absValue >= 1e12) {
    return `${formatNumber(value / 1e12, { decimals })}T`;
  }
  if (absValue >= 1e9) {
    return `${formatNumber(value / 1e9, { decimals })}B`;
  }
  if (absValue >= 1e6) {
    return `${formatNumber(value / 1e6, { decimals })}M`;
  }
  if (absValue >= 1e3) {
    return `${formatNumber(value / 1e3, { decimals })}K`;
  }
  
  return formatNumber(value, { decimals: 0 });
}

/**
 * Format a date string
 * 
 * @param date - Date string or Date object
 * @param format - Format style
 * @returns Formatted date string
 */
export function formatDate(
  date: string | Date,
  format: 'short' | 'medium' | 'long' | 'full' = 'medium'
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const formatOptions: Record<string, Intl.DateTimeFormatOptions> = {
    short: { month: 'numeric', day: 'numeric', year: '2-digit' },
    medium: { month: 'short', day: 'numeric', year: 'numeric' },
    long: { month: 'long', day: 'numeric', year: 'numeric' },
    full: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
  };
  
  return new Intl.DateTimeFormat('en-US', formatOptions[format]).format(dateObj);
}

/**
 * Format a time string
 * 
 * @param date - Date string or Date object
 * @param use24Hour - Use 24-hour format
 * @returns Formatted time string
 */
export function formatTime(date: string | Date, use24Hour: boolean = false): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: !use24Hour,
  }).format(dateObj);
}

/**
 * Format a date and time string
 * 
 * @param date - Date string or Date object
 * @param options - Formatting options
 * @returns Formatted date and time string
 */
export function formatDateTime(
  date: string | Date,
  options: {
    dateFormat?: 'short' | 'medium' | 'long';
    use24Hour?: boolean;
    showTimezone?: boolean;
  } = {}
): string {
  const { dateFormat = 'medium', use24Hour = false, showTimezone = false } = options;
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const formatOptions: Intl.DateTimeFormatOptions = {
    month: dateFormat === 'short' ? 'numeric' : dateFormat === 'medium' ? 'short' : 'long',
    day: 'numeric',
    year: dateFormat === 'short' ? '2-digit' : 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: !use24Hour,
  };
  
  if (showTimezone) {
    formatOptions.timeZoneName = 'short';
  }
  
  return new Intl.DateTimeFormat('en-US', formatOptions).format(dateObj);
}

/**
 * Format a relative time (e.g., "2 hours ago", "in 3 days")
 * 
 * @param date - Date string or Date object
 * @param baseDate - Base date for comparison (default: now)
 * @returns Formatted relative time string
 */
export function formatRelativeTime(
  date: string | Date,
  baseDate: Date = new Date()
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const diffInSeconds = (dateObj.getTime() - baseDate.getTime()) / 1000;
  
  const formatter = new Intl.RelativeTimeFormat('en-US', { numeric: 'auto' });
  
  const intervals = [
    { unit: 'year' as const, seconds: 31536000 },
    { unit: 'month' as const, seconds: 2628000 },
    { unit: 'week' as const, seconds: 604800 },
    { unit: 'day' as const, seconds: 86400 },
    { unit: 'hour' as const, seconds: 3600 },
    { unit: 'minute' as const, seconds: 60 },
    { unit: 'second' as const, seconds: 1 },
  ];
  
  for (const { unit, seconds } of intervals) {
    const count = Math.floor(Math.abs(diffInSeconds) / seconds);
    if (count >= 1) {
      return formatter.format(diffInSeconds < 0 ? -count : count, unit);
    }
  }
  
  return 'now';
}

/**
 * Fantasy-specific formatting functions
 */

/**
 * Format fantasy points with proper decimal places
 * 
 * @param points - Fantasy points value
 * @param decimals - Number of decimal places
 * @returns Formatted points string
 */
export function formatFantasyPoints(points: number, decimals: number = 1): string {
  return formatNumber(points, { decimals });
}

/**
 * Format player position
 * 
 * @param position - Player position
 * @returns Formatted position string
 */
export function formatPosition(position: string): string {
  const positionMap: Record<string, string> = {
    QB: 'QB',
    RB: 'RB',
    WR: 'WR',
    TE: 'TE',
    K: 'K',
    DEF: 'D/ST',
    DST: 'D/ST',
    FLEX: 'FLEX',
    SUPER_FLEX: 'SFLEX',
    BENCH: 'BENCH',
    IR: 'IR',
  };
  
  return positionMap[position.toUpperCase()] || position;
}

/**
 * Format team abbreviation
 * 
 * @param team - Team name or abbreviation
 * @returns Formatted team abbreviation
 */
export function formatTeam(team: string): string {
  // Common team abbreviation mappings
  const teamMap: Record<string, string> = {
    'arizona cardinals': 'ARI',
    'atlanta falcons': 'ATL',
    'baltimore ravens': 'BAL',
    'buffalo bills': 'BUF',
    'carolina panthers': 'CAR',
    'chicago bears': 'CHI',
    'cincinnati bengals': 'CIN',
    'cleveland browns': 'CLE',
    'dallas cowboys': 'DAL',
    'denver broncos': 'DEN',
    'detroit lions': 'DET',
    'green bay packers': 'GB',
    'houston texans': 'HOU',
    'indianapolis colts': 'IND',
    'jacksonville jaguars': 'JAX',
    'kansas city chiefs': 'KC',
    'las vegas raiders': 'LV',
    'los angeles chargers': 'LAC',
    'los angeles rams': 'LAR',
    'miami dolphins': 'MIA',
    'minnesota vikings': 'MIN',
    'new england patriots': 'NE',
    'new orleans saints': 'NO',
    'new york giants': 'NYG',
    'new york jets': 'NYJ',
    'philadelphia eagles': 'PHI',
    'pittsburgh steelers': 'PIT',
    'san francisco 49ers': 'SF',
    'seattle seahawks': 'SEA',
    'tampa bay buccaneers': 'TB',
    'tennessee titans': 'TEN',
    'washington commanders': 'WAS',
  };
  
  const lowerTeam = team.toLowerCase();
  return teamMap[lowerTeam] || team.toUpperCase().substring(0, 3);
}

/**
 * Format NFL week
 * 
 * @param week - Week number
 * @param isPlayoffs - Whether it's playoffs
 * @returns Formatted week string
 */
export function formatWeek(week: number, isPlayoffs: boolean = false): string {
  if (isPlayoffs) {
    const playoffWeeks = ['Wild Card', 'Divisional', 'Conference', 'Super Bowl'];
    return playoffWeeks[week - 1] || `Week ${week}`;
  }
  
  return `Week ${week}`;
}

/**
 * Format record (wins-losses-ties)
 * 
 * @param wins - Number of wins
 * @param losses - Number of losses
 * @param ties - Number of ties
 * @returns Formatted record string
 */
export function formatRecord(wins: number, losses: number, ties: number = 0): string {
  if (ties > 0) {
    return `${wins}-${losses}-${ties}`;
  }
  return `${wins}-${losses}`;
}
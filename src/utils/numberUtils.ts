/**
 * Safe number formatting utilities for fantasy football statistics
 * Prevents runtime errors from undefined/null values
 */

/**
 * Safely formats a number to fixed decimal places
 * @param value - The value to format (can be undefined, null, or any type)
 * @param decimals - Number of decimal places (default: 2)
 * @param defaultValue - Default value if input is invalid (default: '0')
 * @returns Formatted string representation
 */
export function safeToFixed(
  value: any,
  decimals: number = 2,
  defaultValue: string = '0'
): string {
  // Handle null or undefined
  if (value == null) {
    // If defaultValue doesn't have decimals, add them
    if (defaultValue.includes('.')) {
      return defaultValue;
    }
    // Check if defaultValue is a valid number before using toFixed
    const defaultNum = Number(defaultValue);
    if (isNaN(defaultNum)) {
      return defaultValue; // Return as-is if it's not a valid number (like 'N/A')
    }
    return defaultNum.toFixed(decimals);
  }

  // Try to convert to number
  const num = Number(value);
  
  // Check if conversion resulted in valid number
  if (isNaN(num) || !isFinite(num)) {
    // If defaultValue doesn't have decimals, add them
    if (defaultValue.includes('.')) {
      return defaultValue;
    }
    // Check if defaultValue is a valid number before using toFixed
    const defaultNum = Number(defaultValue);
    if (isNaN(defaultNum)) {
      return defaultValue; // Return as-is if it's not a valid number (like 'N/A')
    }
    return defaultNum.toFixed(decimals);
  }

  return num.toFixed(decimals);
}

/**
 * Safely formats a percentage value
 * @param value - The value to format as percentage
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string with % symbol
 */
export function safePercentage(
  value: any,
  decimals: number = 1
): string {
  // Handle null/undefined/NaN first
  if (value == null) {
    return '0.0%';
  }
  
  const num = Number(value);
  if (isNaN(num) || !isFinite(num)) {
    return '0.0%';
  }
  
  // Convert decimal to percentage (e.g., 0.652 = 65.2%)
  return `${(num * 100).toFixed(decimals)}%`;
}

/**
 * Safely formats currency values
 * @param value - The value to format as currency
 * @param includeSymbol - Whether to include $ symbol (default: true)
 * @returns Formatted currency string
 */
export function safeCurrency(
  value: any,
  includeSymbol: boolean = true
): string {
  const formatted = safeToFixed(value, 2, '0.00');
  return includeSymbol ? `$${formatted}` : formatted;
}

/**
 * Safely rounds a number
 * @param value - The value to round
 * @param decimals - Number of decimal places (default: 0)
 * @returns Rounded number
 */
export function safeRound(
  value: any,
  decimals: number = 0
): number {
  if (value == null) return 0;
  
  const num = Number(value);
  if (isNaN(num) || !isFinite(num)) return 0;
  
  const multiplier = Math.pow(10, decimals);
  return Math.round(num * multiplier) / multiplier;
}

/**
 * Safely parses a float value
 * @param value - The value to parse
 * @param defaultValue - Default value if parsing fails (default: 0)
 * @returns Parsed float number
 */
export function safeParseFloat(
  value: any,
  defaultValue: number = 0
): number {
  if (value == null) return defaultValue;
  
  const num = parseFloat(value);
  if (isNaN(num) || !isFinite(num)) return defaultValue;
  
  return num;
}

/**
 * Safely parses an integer value
 * @param value - The value to parse
 * @param defaultValue - Default value if parsing fails (default: 0)
 * @returns Parsed integer
 */
export function safeParseInt(
  value: any,
  defaultValue: number = 0
): number {
  if (value == null) return defaultValue;
  
  const num = parseInt(value, 10);
  if (isNaN(num) || !isFinite(num)) return defaultValue;
  
  return num;
}

/**
 * Formats a fantasy points value with appropriate precision
 * @param points - The points value to format
 * @returns Formatted points string
 */
export function formatFantasyPoints(points: any): string {
  return safeToFixed(points, 1, '0.0');
}

/**
 * Formats a player's statistical value based on the stat type
 * @param value - The stat value
 * @param statType - Type of statistic (e.g., 'yards', 'touchdowns', 'receptions')
 * @returns Formatted stat string
 */
export function formatPlayerStat(value: any, statType: string): string {
  switch (statType.toLowerCase()) {
    case 'completion_percentage':
    case 'catch_rate':
    case 'target_share':
      return safePercentage(value, 1);
    
    case 'yards_per_attempt':
    case 'yards_per_carry':
    case 'yards_per_reception':
    case 'average':
      return safeToFixed(value, 1, '0.0');
    
    case 'passing_yards':
    case 'rushing_yards':
    case 'receiving_yards':
    case 'total_yards':
      return safeToFixed(value, 0, '0');
    
    case 'touchdowns':
    case 'interceptions':
    case 'fumbles':
    case 'receptions':
    case 'carries':
    case 'targets':
      return safeToFixed(value, 0, '0');
    
    case 'fantasy_points':
    case 'projected_points':
      return formatFantasyPoints(value);
    
    case 'salary':
    case 'faab':
      return safeCurrency(value);
    
    default:
      return safeToFixed(value, 1, '0.0');
  }
}

/**
 * Calculates and formats a change percentage
 * @param current - Current value
 * @param previous - Previous value
 * @returns Formatted change percentage with +/- sign
 */
export function calculateChangePercentage(
  current: any,
  previous: any
): string {
  const currentNum = safeParseFloat(current, 0);
  const previousNum = safeParseFloat(previous, 0);
  
  if (previousNum === 0) {
    return currentNum > 0 ? '+100.0%' : '0.0%';
  }
  
  const change = ((currentNum - previousNum) / Math.abs(previousNum)) * 100;
  const formatted = safeToFixed(change, 1, '0.0');
  
  return change >= 0 ? `+${formatted}%` : `${formatted}%`;
}
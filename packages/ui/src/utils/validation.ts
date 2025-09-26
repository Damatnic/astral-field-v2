/**
 * Validation utility functions for AstralField
 */

/**
 * Check if a value is not null or undefined
 * 
 * @param value - Value to check
 * @returns True if value is not null or undefined
 */
export function isNotNullish<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Check if a string is not empty or whitespace only
 * 
 * @param value - String to check
 * @returns True if string has content
 */
export function isNotEmpty(value: string | null | undefined): value is string {
  return isNotNullish(value) && value.trim().length > 0;
}

/**
 * Check if a value is a valid email address
 * 
 * @param email - Email string to validate
 * @returns True if valid email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Check if a value is a valid URL
 * 
 * @param url - URL string to validate
 * @returns True if valid URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a number is within a specified range
 * 
 * @param value - Number to check
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @returns True if number is within range
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/**
 * Check if a string matches minimum length requirement
 * 
 * @param value - String to check
 * @param minLength - Minimum length required
 * @returns True if string meets minimum length
 */
export function hasMinLength(value: string, minLength: number): boolean {
  return value.length >= minLength;
}

/**
 * Check if a string is within maximum length requirement
 * 
 * @param value - String to check
 * @param maxLength - Maximum length allowed
 * @returns True if string is within maximum length
 */
export function hasMaxLength(value: string, maxLength: number): boolean {
  return value.length <= maxLength;
}

/**
 * Check if a password meets strength requirements
 * 
 * @param password - Password to validate
 * @param options - Password strength options
 * @returns Object with validation results
 */
export function validatePasswordStrength(
  password: string,
  options: {
    minLength?: number;
    requireUppercase?: boolean;
    requireLowercase?: boolean;
    requireNumbers?: boolean;
    requireSpecialChars?: boolean;
  } = {}
): {
  isValid: boolean;
  score: number;
  feedback: string[];
} {
  const {
    minLength = 8,
    requireUppercase = true,
    requireLowercase = true,
    requireNumbers = true,
    requireSpecialChars = true,
  } = options;

  const feedback: string[] = [];
  let score = 0;

  // Check minimum length
  if (password.length >= minLength) {
    score += 1;
  } else {
    feedback.push(`Must be at least ${minLength} characters long`);
  }

  // Check for uppercase letters
  if (/[A-Z]/.test(password)) {
    score += 1;
  } else if (requireUppercase) {
    feedback.push('Must contain at least one uppercase letter');
  }

  // Check for lowercase letters
  if (/[a-z]/.test(password)) {
    score += 1;
  } else if (requireLowercase) {
    feedback.push('Must contain at least one lowercase letter');
  }

  // Check for numbers
  if (/\d/.test(password)) {
    score += 1;
  } else if (requireNumbers) {
    feedback.push('Must contain at least one number');
  }

  // Check for special characters
  if (/[^a-zA-Z0-9]/.test(password)) {
    score += 1;
  } else if (requireSpecialChars) {
    feedback.push('Must contain at least one special character');
  }

  const maxScore = 5;
  const isValid = feedback.length === 0;

  return {
    isValid,
    score: (score / maxScore) * 100,
    feedback,
  };
}

/**
 * Fantasy-specific validation functions
 */

/**
 * Check if a fantasy team name is valid
 * 
 * @param teamName - Team name to validate
 * @returns Validation result
 */
export function validateFantasyTeamName(teamName: string): {
  isValid: boolean;
  error?: string;
} {
  if (!isNotEmpty(teamName)) {
    return { isValid: false, error: 'Team name is required' };
  }

  if (!hasMinLength(teamName, 3)) {
    return { isValid: false, error: 'Team name must be at least 3 characters' };
  }

  if (!hasMaxLength(teamName, 30)) {
    return { isValid: false, error: 'Team name must be 30 characters or less' };
  }

  // Check for inappropriate content (basic profanity filter)
  const inappropriate = ['damn', 'hell', 'shit', 'fuck', 'bitch', 'ass'];
  const lowerName = teamName.toLowerCase();
  if (inappropriate.some(word => lowerName.includes(word))) {
    return { isValid: false, error: 'Team name contains inappropriate content' };
  }

  return { isValid: true };
}

/**
 * Check if a player position is valid
 * 
 * @param position - Position to validate
 * @returns True if valid position
 */
export function isValidPosition(position: string): boolean {
  const validPositions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF', 'DST', 'FLEX', 'SUPER_FLEX', 'BENCH', 'IR'];
  return validPositions.includes(position.toUpperCase());
}

/**
 * Check if a fantasy score is valid
 * 
 * @param score - Score to validate
 * @returns True if valid score
 */
export function isValidFantasyScore(score: number): boolean {
  return !isNaN(score) && isFinite(score) && score >= -50 && score <= 100;
}

/**
 * Check if a week number is valid for NFL season
 * 
 * @param week - Week number to validate
 * @param includePlayoffs - Whether to include playoff weeks
 * @returns True if valid week
 */
export function isValidWeek(week: number, includePlayoffs: boolean = false): boolean {
  const maxWeek = includePlayoffs ? 22 : 18; // Regular season is 1-18, playoffs extend to 22
  return Number.isInteger(week) && week >= 1 && week <= maxWeek;
}

/**
 * Check if a year is valid for fantasy football
 * 
 * @param year - Year to validate
 * @returns True if valid year
 */
export function isValidFantasyYear(year: number): boolean {
  const currentYear = new Date().getFullYear();
  return Number.isInteger(year) && year >= 1999 && year <= currentYear + 1; // Fantasy football started around 1999
}

/**
 * Check if a league size is valid
 * 
 * @param size - League size to validate
 * @returns True if valid league size
 */
export function isValidLeagueSize(size: number): boolean {
  return Number.isInteger(size) && size >= 2 && size <= 32; // Reasonable league sizes
}

/**
 * Validate a trade proposal
 * 
 * @param trade - Trade object to validate
 * @returns Validation result
 */
export function validateTrade(trade: {
  fromTeam: string;
  toTeam: string;
  fromPlayers: string[];
  toPlayers: string[];
}): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!isNotEmpty(trade.fromTeam)) {
    errors.push('From team is required');
  }

  if (!isNotEmpty(trade.toTeam)) {
    errors.push('To team is required');
  }

  if (trade.fromTeam === trade.toTeam) {
    errors.push('Cannot trade with the same team');
  }

  if (!Array.isArray(trade.fromPlayers) || trade.fromPlayers.length === 0) {
    errors.push('At least one player must be traded from the first team');
  }

  if (!Array.isArray(trade.toPlayers) || trade.toPlayers.length === 0) {
    errors.push('At least one player must be traded from the second team');
  }

  const totalPlayers = (trade.fromPlayers?.length || 0) + (trade.toPlayers?.length || 0);
  if (totalPlayers > 10) {
    errors.push('Trade cannot involve more than 10 total players');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Generic field validator that can be used in forms
 * 
 * @param value - Value to validate
 * @param rules - Validation rules
 * @returns First validation error or null if valid
 */
export function validateField(
  value: any,
  rules: Array<{
    test: (val: any) => boolean;
    message: string;
  }>
): string | null {
  for (const rule of rules) {
    if (!rule.test(value)) {
      return rule.message;
    }
  }
  return null;
}

/**
 * Create common validation rules
 */
export const validationRules = {
  required: (message = 'This field is required') => ({
    test: (value: any) => isNotNullish(value) && (typeof value !== 'string' || isNotEmpty(value)),
    message,
  }),

  email: (message = 'Please enter a valid email address') => ({
    test: (value: string) => !value || isValidEmail(value),
    message,
  }),

  minLength: (length: number, message = `Must be at least ${length} characters`) => ({
    test: (value: string) => !value || hasMinLength(value, length),
    message,
  }),

  maxLength: (length: number, message = `Must be ${length} characters or less`) => ({
    test: (value: string) => !value || hasMaxLength(value, length),
    message,
  }),

  pattern: (regex: RegExp, message = 'Invalid format') => ({
    test: (value: string) => !value || regex.test(value),
    message,
  }),

  range: (min: number, max: number, message = `Must be between ${min} and ${max}`) => ({
    test: (value: number) => isNotNullish(value) ? isInRange(value, min, max) : true,
    message,
  }),
};
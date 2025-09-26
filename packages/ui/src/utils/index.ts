/**
 * Utility functions for AstralField design system
 * Centralized export for all utility functions
 */

// Core utilities
export * from './cn';
export * from './theme';
export * from './format';
export * from './validation';
export * from './animation';

// Re-export commonly used utilities
export { cn, cx, createClassMerger } from './cn';

export {
  type ThemeMode,
  type TeamTheme,
  type Theme,
  getTeamColors,
  getAllTeams,
  formatTeamName,
  generateThemeCSS,
  applyTheme,
  getSystemTheme,
  createTheme,
  isValidTeamKey,
  getContrastingTextColor,
} from './theme';

export {
  formatNumber,
  formatPercentage,
  formatCurrency,
  formatAbbreviatedNumber,
  formatDate,
  formatTime,
  formatDateTime,
  formatRelativeTime,
  formatFantasyPoints,
  formatPosition,
  formatTeam,
  formatWeek,
  formatRecord,
} from './format';

export {
  isNotNullish,
  isNotEmpty,
  isValidEmail,
  isValidUrl,
  isInRange,
  hasMinLength,
  hasMaxLength,
  validatePasswordStrength,
  validateFantasyTeamName,
  isValidPosition,
  isValidFantasyScore,
  isValidWeek,
  isValidFantasyYear,
  isValidLeagueSize,
  validateTrade,
  validateField,
  validationRules,
} from './validation';

export {
  type AnimationConfig,
  createTransition,
  createAnimation,
  animations,
  generateKeyframes,
  createSpring,
  AnimationChain,
  prefersReducedMotion,
  getAccessibleDuration,
} from './animation';
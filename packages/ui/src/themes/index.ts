/**
 * Theme system for AstralField design system
 * Centralized export for all theme utilities
 */

export * from './base';
export * from './css-variables';

// Re-export commonly used theme utilities
export {
  type BaseTheme,
  lightTheme,
  darkTheme,
  highContrastTheme,
  themes,
  type ThemeVariant,
  getTheme,
  createTeamTheme,
} from './base';

export {
  generateCSSVariables,
  generateCSSString,
  applyCSSVariables,
  removeCSSVariables,
  getCSSVariable,
  setCSSVariable,
  generateTailwindConfig,
} from './css-variables';
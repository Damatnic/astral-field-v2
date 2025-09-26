/**
 * Base theme configuration for AstralField
 */

import { colors, semanticColors, darkColors } from '../tokens/colors';
import { typography, fontFamilies, fontSizes, fontWeights, lineHeights } from '../tokens/typography';
import { spacing, borderRadius, boxShadow, zIndex, duration, easing } from '../tokens/spacing';
import { type TeamColor } from '../utils/theme';

/**
 * Base theme structure
 */
export interface BaseTheme {
  colors: typeof semanticColors;
  typography: typeof typography;
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  shadows: typeof boxShadow;
  zIndex: typeof zIndex;
  animation: {
    duration: typeof duration;
    easing: typeof easing;
  };
  fonts: {
    families: typeof fontFamilies;
    sizes: typeof fontSizes;
    weights: typeof fontWeights;
    lineHeights: typeof lineHeights;
  };
  breakpoints: {
    values: Record<string, number>;
    up: (breakpoint: string) => string;
    down: (breakpoint: string) => string;
    between: (start: string, end: string) => string;
  };
}

/**
 * Breakpoint system
 */
const breakpointValues = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

const createBreakpoints = (values: Record<string, number>) => ({
  values,
  up: (breakpoint: string) => `@media (min-width: ${values[breakpoint]}px)`,
  down: (breakpoint: string) => {
    const breakpointKeys = Object.keys(values);
    const index = breakpointKeys.indexOf(breakpoint);
    const nextBreakpoint = breakpointKeys[index + 1];
    if (!nextBreakpoint) return '@media (min-width: 0px)';
    return `@media (max-width: ${values[nextBreakpoint] - 1}px)`;
  },
  between: (start: string, end: string) => 
    `@media (min-width: ${values[start]}px) and (max-width: ${values[end] - 1}px)`,
});

/**
 * Light theme configuration
 */
export const lightTheme: BaseTheme = {
  colors: semanticColors,
  typography,
  spacing,
  borderRadius,
  shadows: boxShadow,
  zIndex,
  animation: {
    duration,
    easing,
  },
  fonts: {
    families: fontFamilies,
    sizes: fontSizes,
    weights: fontWeights,
    lineHeights,
  },
  breakpoints: createBreakpoints(breakpointValues),
};

/**
 * Dark theme configuration
 */
export const darkTheme: BaseTheme = {
  ...lightTheme,
  colors: darkColors,
};

/**
 * Create team-specific theme
 */
export function createTeamTheme(baseTheme: BaseTheme, teamKey: TeamColor): BaseTheme {
  const teamColors = colors.teams[teamKey];
  
  return {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      interactive: {
        ...baseTheme.colors.interactive,
        primary: teamColors.primary,
        primaryHover: adjustColor(teamColors.primary, -10),
        primaryActive: adjustColor(teamColors.primary, -20),
        secondary: teamColors.secondary,
        secondaryHover: adjustColor(teamColors.secondary, -10),
        secondaryActive: adjustColor(teamColors.secondary, -20),
      },
      fantasy: {
        ...baseTheme.colors.fantasy,
        // Override fantasy colors with team colors where appropriate
        trade: teamColors.primary,
        waiver: teamColors.secondary,
      },
    },
  };
}

/**
 * Utility function to adjust color brightness
 */
function adjustColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;

  return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
    (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
    (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
}

/**
 * High contrast theme for accessibility
 */
export const highContrastTheme: BaseTheme = {
  ...lightTheme,
  colors: {
    ...semanticColors,
    background: {
      primary: '#ffffff',
      secondary: '#f8f9fa',
      tertiary: '#e9ecef',
      inverse: '#000000',
    },
    text: {
      primary: '#000000',
      secondary: '#212529',
      tertiary: '#495057',
      inverse: '#ffffff',
      disabled: '#6c757d',
      link: '#0d6efd',
      linkHover: '#0a58ca',
    },
    border: {
      primary: '#000000',
      secondary: '#495057',
      subtle: '#6c757d',
      strong: '#212529',
    },
  },
};

/**
 * Theme variants
 */
export const themes = {
  light: lightTheme,
  dark: darkTheme,
  highContrast: highContrastTheme,
} as const;

export type ThemeVariant = keyof typeof themes;

/**
 * Get theme by variant and optional team
 */
export function getTheme(variant: ThemeVariant, teamKey?: TeamColor): BaseTheme {
  const baseTheme = themes[variant];
  return teamKey ? createTeamTheme(baseTheme, teamKey) : baseTheme;
}
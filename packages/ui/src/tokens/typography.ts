/**
 * AstralField Typography Design Tokens
 * Comprehensive typography system with semantic font assignments
 */

// Font Families
export const fontFamilies = {
  sans: [
    'Inter',
    '-apple-system',
    'BlinkMacSystemFont',
    'Segoe UI',
    'Roboto',
    'Oxygen',
    'Ubuntu',
    'Cantarell',
    'Fira Sans',
    'Droid Sans',
    'Helvetica Neue',
    'sans-serif',
  ],
  mono: [
    'JetBrains Mono',
    'Fira Code',
    'SF Mono',
    'Monaco',
    'Inconsolata',
    'Roboto Mono',
    'Consolas',
    'Liberation Mono',
    'Menlo',
    'Courier',
    'monospace',
  ],
  display: [
    'Cal Sans',
    'Inter',
    '-apple-system',
    'BlinkMacSystemFont',
    'Segoe UI',
    'sans-serif',
  ],
} as const;

// Font Sizes (in rem, with px equivalents in comments)
export const fontSizes = {
  'xs': '0.75rem',    // 12px
  'sm': '0.875rem',   // 14px
  'base': '1rem',     // 16px
  'lg': '1.125rem',   // 18px
  'xl': '1.25rem',    // 20px
  '2xl': '1.5rem',    // 24px
  '3xl': '1.875rem',  // 30px
  '4xl': '2.25rem',   // 36px
  '5xl': '3rem',      // 48px
  '6xl': '3.75rem',   // 60px
  '7xl': '4.5rem',    // 72px
  '8xl': '6rem',      // 96px
  '9xl': '8rem',      // 128px
} as const;

// Font Weights
export const fontWeights = {
  thin: 100,
  extralight: 200,
  light: 300,
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
  black: 900,
} as const;

// Line Heights
export const lineHeights = {
  none: 1,
  tight: 1.25,
  snug: 1.375,
  normal: 1.5,
  relaxed: 1.625,
  loose: 2,
  '3': '0.75rem',
  '4': '1rem',
  '5': '1.25rem',
  '6': '1.5rem',
  '7': '1.75rem',
  '8': '2rem',
  '9': '2.25rem',
  '10': '2.5rem',
} as const;

// Letter Spacing
export const letterSpacings = {
  tighter: '-0.05em',
  tight: '-0.025em',
  normal: '0em',
  wide: '0.025em',
  wider: '0.05em',
  widest: '0.1em',
} as const;

// Typography Scale - Semantic assignments
export const typography = {
  // Display text (hero sections, major headings)
  display: {
    '2xl': {
      fontSize: fontSizes['8xl'],
      lineHeight: lineHeights.none,
      fontWeight: fontWeights.extrabold,
      letterSpacing: letterSpacings.tighter,
      fontFamily: fontFamilies.display,
    },
    xl: {
      fontSize: fontSizes['7xl'],
      lineHeight: lineHeights.none,
      fontWeight: fontWeights.extrabold,
      letterSpacing: letterSpacings.tighter,
      fontFamily: fontFamilies.display,
    },
    lg: {
      fontSize: fontSizes['6xl'],
      lineHeight: lineHeights.none,
      fontWeight: fontWeights.bold,
      letterSpacing: letterSpacings.tighter,
      fontFamily: fontFamilies.display,
    },
    md: {
      fontSize: fontSizes['5xl'],
      lineHeight: lineHeights.tight,
      fontWeight: fontWeights.bold,
      letterSpacing: letterSpacings.tight,
      fontFamily: fontFamilies.display,
    },
    sm: {
      fontSize: fontSizes['4xl'],
      lineHeight: lineHeights.tight,
      fontWeight: fontWeights.bold,
      letterSpacing: letterSpacings.tight,
      fontFamily: fontFamilies.display,
    },
  },

  // Headings (section headers, card titles)
  heading: {
    '6xl': {
      fontSize: fontSizes['6xl'],
      lineHeight: lineHeights.tight,
      fontWeight: fontWeights.bold,
      letterSpacing: letterSpacings.tight,
      fontFamily: fontFamilies.sans,
    },
    '5xl': {
      fontSize: fontSizes['5xl'],
      lineHeight: lineHeights.tight,
      fontWeight: fontWeights.bold,
      letterSpacing: letterSpacings.tight,
      fontFamily: fontFamilies.sans,
    },
    '4xl': {
      fontSize: fontSizes['4xl'],
      lineHeight: lineHeights.tight,
      fontWeight: fontWeights.bold,
      letterSpacing: letterSpacings.tight,
      fontFamily: fontFamilies.sans,
    },
    '3xl': {
      fontSize: fontSizes['3xl'],
      lineHeight: lineHeights.snug,
      fontWeight: fontWeights.bold,
      letterSpacing: letterSpacings.tight,
      fontFamily: fontFamilies.sans,
    },
    '2xl': {
      fontSize: fontSizes['2xl'],
      lineHeight: lineHeights.snug,
      fontWeight: fontWeights.bold,
      letterSpacing: letterSpacings.tight,
      fontFamily: fontFamilies.sans,
    },
    xl: {
      fontSize: fontSizes.xl,
      lineHeight: lineHeights.snug,
      fontWeight: fontWeights.semibold,
      letterSpacing: letterSpacings.tight,
      fontFamily: fontFamilies.sans,
    },
    lg: {
      fontSize: fontSizes.lg,
      lineHeight: lineHeights.normal,
      fontWeight: fontWeights.semibold,
      letterSpacing: letterSpacings.normal,
      fontFamily: fontFamilies.sans,
    },
    md: {
      fontSize: fontSizes.base,
      lineHeight: lineHeights.normal,
      fontWeight: fontWeights.semibold,
      letterSpacing: letterSpacings.normal,
      fontFamily: fontFamilies.sans,
    },
    sm: {
      fontSize: fontSizes.sm,
      lineHeight: lineHeights.normal,
      fontWeight: fontWeights.semibold,
      letterSpacing: letterSpacings.normal,
      fontFamily: fontFamilies.sans,
    },
    xs: {
      fontSize: fontSizes.xs,
      lineHeight: lineHeights.normal,
      fontWeight: fontWeights.semibold,
      letterSpacing: letterSpacings.normal,
      fontFamily: fontFamilies.sans,
    },
  },

  // Body text (paragraphs, descriptions)
  body: {
    '2xl': {
      fontSize: fontSizes['2xl'],
      lineHeight: lineHeights.relaxed,
      fontWeight: fontWeights.normal,
      letterSpacing: letterSpacings.normal,
      fontFamily: fontFamilies.sans,
    },
    xl: {
      fontSize: fontSizes.xl,
      lineHeight: lineHeights.relaxed,
      fontWeight: fontWeights.normal,
      letterSpacing: letterSpacings.normal,
      fontFamily: fontFamilies.sans,
    },
    lg: {
      fontSize: fontSizes.lg,
      lineHeight: lineHeights.relaxed,
      fontWeight: fontWeights.normal,
      letterSpacing: letterSpacings.normal,
      fontFamily: fontFamilies.sans,
    },
    md: {
      fontSize: fontSizes.base,
      lineHeight: lineHeights.relaxed,
      fontWeight: fontWeights.normal,
      letterSpacing: letterSpacings.normal,
      fontFamily: fontFamilies.sans,
    },
    sm: {
      fontSize: fontSizes.sm,
      lineHeight: lineHeights.normal,
      fontWeight: fontWeights.normal,
      letterSpacing: letterSpacings.normal,
      fontFamily: fontFamilies.sans,
    },
    xs: {
      fontSize: fontSizes.xs,
      lineHeight: lineHeights.normal,
      fontWeight: fontWeights.normal,
      letterSpacing: letterSpacings.normal,
      fontFamily: fontFamilies.sans,
    },
  },

  // Labels (form labels, captions)
  label: {
    lg: {
      fontSize: fontSizes.base,
      lineHeight: lineHeights.normal,
      fontWeight: fontWeights.medium,
      letterSpacing: letterSpacings.normal,
      fontFamily: fontFamilies.sans,
    },
    md: {
      fontSize: fontSizes.sm,
      lineHeight: lineHeights.normal,
      fontWeight: fontWeights.medium,
      letterSpacing: letterSpacings.normal,
      fontFamily: fontFamilies.sans,
    },
    sm: {
      fontSize: fontSizes.xs,
      lineHeight: lineHeights.normal,
      fontWeight: fontWeights.medium,
      letterSpacing: letterSpacings.wide,
      fontFamily: fontFamilies.sans,
    },
  },

  // Code blocks and inline code
  code: {
    lg: {
      fontSize: fontSizes.base,
      lineHeight: lineHeights.normal,
      fontWeight: fontWeights.medium,
      letterSpacing: letterSpacings.normal,
      fontFamily: fontFamilies.mono,
    },
    md: {
      fontSize: fontSizes.sm,
      lineHeight: lineHeights.normal,
      fontWeight: fontWeights.medium,
      letterSpacing: letterSpacings.normal,
      fontFamily: fontFamilies.mono,
    },
    sm: {
      fontSize: fontSizes.xs,
      lineHeight: lineHeights.normal,
      fontWeight: fontWeights.medium,
      letterSpacing: letterSpacings.normal,
      fontFamily: fontFamilies.mono,
    },
  },

  // Fantasy-specific typography
  fantasy: {
    // Player stats and numbers
    stat: {
      fontSize: fontSizes.xl,
      lineHeight: lineHeights.none,
      fontWeight: fontWeights.bold,
      letterSpacing: letterSpacings.tight,
      fontFamily: fontFamilies.sans,
    },
    
    // Score displays
    score: {
      fontSize: fontSizes['4xl'],
      lineHeight: lineHeights.none,
      fontWeight: fontWeights.black,
      letterSpacing: letterSpacings.tighter,
      fontFamily: fontFamilies.display,
    },

    // Team names
    team: {
      fontSize: fontSizes.lg,
      lineHeight: lineHeights.snug,
      fontWeight: fontWeights.semibold,
      letterSpacing: letterSpacings.normal,
      fontFamily: fontFamilies.sans,
    },

    // Player names
    player: {
      fontSize: fontSizes.base,
      lineHeight: lineHeights.normal,
      fontWeight: fontWeights.medium,
      letterSpacing: letterSpacings.normal,
      fontFamily: fontFamilies.sans,
    },

    // Position labels
    position: {
      fontSize: fontSizes.xs,
      lineHeight: lineHeights.normal,
      fontWeight: fontWeights.bold,
      letterSpacing: letterSpacings.widest,
      fontFamily: fontFamilies.sans,
    },

    // Projections and predictions
    projection: {
      fontSize: fontSizes.sm,
      lineHeight: lineHeights.normal,
      fontWeight: fontWeights.medium,
      letterSpacing: letterSpacings.normal,
      fontFamily: fontFamilies.mono,
    },
  },
} as const;

// Utility type exports
export type FontFamily = keyof typeof fontFamilies;
export type FontSize = keyof typeof fontSizes;
export type FontWeight = keyof typeof fontWeights;
export type LineHeight = keyof typeof lineHeights;
export type LetterSpacing = keyof typeof letterSpacings;
export type TypographyVariant = keyof typeof typography;
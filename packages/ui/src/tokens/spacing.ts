/**
 * AstralField Spacing Design Tokens
 * Consistent spacing system based on 4px/8px grid
 */

// Base spacing scale (in rem, with px equivalents in comments)
export const spacing = {
  0: '0px',           // 0px
  0.5: '0.125rem',    // 2px
  1: '0.25rem',       // 4px
  1.5: '0.375rem',    // 6px
  2: '0.5rem',        // 8px
  2.5: '0.625rem',    // 10px
  3: '0.75rem',       // 12px
  3.5: '0.875rem',    // 14px
  4: '1rem',          // 16px
  5: '1.25rem',       // 20px
  6: '1.5rem',        // 24px
  7: '1.75rem',       // 28px
  8: '2rem',          // 32px
  9: '2.25rem',       // 36px
  10: '2.5rem',       // 40px
  11: '2.75rem',      // 44px
  12: '3rem',         // 48px
  14: '3.5rem',       // 56px
  16: '4rem',         // 64px
  20: '5rem',         // 80px
  24: '6rem',         // 96px
  28: '7rem',         // 112px
  32: '8rem',         // 128px
  36: '9rem',         // 144px
  40: '10rem',        // 160px
  44: '11rem',        // 176px
  48: '12rem',        // 192px
  52: '13rem',        // 208px
  56: '14rem',        // 224px
  60: '15rem',        // 240px
  64: '16rem',        // 256px
  72: '18rem',        // 288px
  80: '20rem',        // 320px
  96: '24rem',        // 384px
} as const;

// Semantic spacing assignments
export const semanticSpacing = {
  // Component internal spacing
  component: {
    xs: spacing[1],     // 4px - tight spacing within components
    sm: spacing[2],     // 8px - standard component padding
    md: spacing[4],     // 16px - comfortable component spacing
    lg: spacing[6],     // 24px - generous component spacing
    xl: spacing[8],     // 32px - loose component spacing
  },

  // Layout spacing
  layout: {
    xs: spacing[4],     // 16px - minimal section spacing
    sm: spacing[6],     // 24px - compact layout spacing
    md: spacing[8],     // 32px - standard layout spacing
    lg: spacing[12],    // 48px - comfortable section spacing
    xl: spacing[16],    // 64px - generous section spacing
    '2xl': spacing[20], // 80px - large section spacing
    '3xl': spacing[24], // 96px - extra large section spacing
  },

  // Container spacing (padding/margins)
  container: {
    xs: spacing[4],     // 16px - mobile container padding
    sm: spacing[6],     // 24px - small container padding
    md: spacing[8],     // 32px - medium container padding
    lg: spacing[12],    // 48px - large container padding
    xl: spacing[16],    // 64px - extra large container padding
  },

  // Gap spacing (between items in flex/grid)
  gap: {
    xs: spacing[2],     // 8px - tight gap
    sm: spacing[3],     // 12px - small gap
    md: spacing[4],     // 16px - standard gap
    lg: spacing[6],     // 24px - comfortable gap
    xl: spacing[8],     // 32px - loose gap
  },

  // Stack spacing (vertical rhythm)
  stack: {
    xs: spacing[2],     // 8px - tight vertical rhythm
    sm: spacing[4],     // 16px - standard vertical rhythm
    md: spacing[6],     // 24px - comfortable vertical rhythm
    lg: spacing[8],     // 32px - loose vertical rhythm
    xl: spacing[12],    // 48px - extra loose vertical rhythm
  },

  // Fantasy-specific spacing
  fantasy: {
    // Player card spacing
    cardPadding: spacing[4],    // 16px - player card internal padding
    cardGap: spacing[6],        // 24px - gap between player cards
    
    // Roster spacing
    rosterGap: spacing[3],      // 12px - gap between roster items
    rosterSection: spacing[8],  // 32px - gap between roster sections
    
    // Stat display spacing
    statGap: spacing[2],        // 8px - gap between individual stats
    statGroup: spacing[6],      // 24px - gap between stat groups
    
    // Table spacing
    tableCell: spacing[3],      // 12px - table cell padding
    tableRow: spacing[2],       // 8px - table row padding
    
    // Dashboard spacing
    widgetGap: spacing[6],      // 24px - gap between dashboard widgets
    sectionGap: spacing[12],    // 48px - gap between dashboard sections
  },
} as const;

// Responsive spacing breakpoints
export const responsiveSpacing = {
  mobile: {
    container: spacing[4],    // 16px
    section: spacing[8],      // 32px
    component: spacing[3],    // 12px
  },
  tablet: {
    container: spacing[6],    // 24px
    section: spacing[12],     // 48px
    component: spacing[4],    // 16px
  },
  desktop: {
    container: spacing[8],    // 32px
    section: spacing[16],     // 64px
    component: spacing[6],    // 24px
  },
  wide: {
    container: spacing[12],   // 48px
    section: spacing[20],     // 80px
    component: spacing[8],    // 32px
  },
} as const;

// Border radius scale
export const borderRadius = {
  none: '0px',
  sm: '0.125rem',    // 2px
  base: '0.25rem',   // 4px
  md: '0.375rem',    // 6px
  lg: '0.5rem',      // 8px
  xl: '0.75rem',     // 12px
  '2xl': '1rem',     // 16px
  '3xl': '1.5rem',   // 24px
  full: '9999px',    // Fully rounded
} as const;

// Shadow scale
export const boxShadow = {
  none: 'none',
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  
  // Fantasy-specific shadows
  card: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  cardHover: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  modal: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  dropdown: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
} as const;

// Z-index layers
export const zIndex = {
  auto: 'auto',
  hide: -1,
  base: 0,
  docked: 10,
  dropdown: 1000,
  sticky: 1100,
  banner: 1200,
  overlay: 1300,
  modal: 1400,
  popover: 1500,
  skipLink: 1600,
  toast: 1700,
  tooltip: 1800,
} as const;

// Motion/Animation durations
export const duration = {
  instant: '0ms',
  fastest: '50ms',
  faster: '100ms',
  fast: '150ms',
  normal: '200ms',
  slow: '300ms',
  slower: '400ms',
  slowest: '500ms',
  
  // Specific animation durations
  hover: '150ms',
  press: '100ms',
  modal: '200ms',
  drawer: '300ms',
  toast: '200ms',
  tooltip: '100ms',
} as const;

// Easing functions
export const easing = {
  linear: 'cubic-bezier(0, 0, 1, 1)',
  ease: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
  easeIn: 'cubic-bezier(0.42, 0, 1, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.58, 1)',
  easeInOut: 'cubic-bezier(0.42, 0, 0.58, 1)',
  
  // Custom fantasy easing curves
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
  snappy: 'cubic-bezier(0.4, 0, 0.6, 1)',
} as const;

// Utility type exports
export type Spacing = keyof typeof spacing;
export type SemanticSpacing = keyof typeof semanticSpacing;
export type BorderRadius = keyof typeof borderRadius;
export type BoxShadow = keyof typeof boxShadow;
export type ZIndex = keyof typeof zIndex;
export type Duration = keyof typeof duration;
export type Easing = keyof typeof easing;
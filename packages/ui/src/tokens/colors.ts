/**
 * AstralField Color Design Tokens
 * Comprehensive color system with semantic color assignments
 */

export const colors = {
  // Primary Brand Colors
  primary: {
    50: '#f0f4ff',
    100: '#dae8ff',
    200: '#bed3ff',
    300: '#91b5ff',
    400: '#5e8eff',
    500: '#3b63ff', // Primary brand color
    600: '#2d47f7',
    700: '#2336e3',
    800: '#1e2cb7',
    900: '#1d2b90',
    950: '#161d57',
  },

  // Secondary Accent Colors
  secondary: {
    50: '#fef7ee',
    100: '#fdecd8',
    200: '#fad5b0',
    300: '#f7b87e',
    400: '#f3954a',
    500: '#f07925', // Secondary brand color
    600: '#e1601b',
    700: '#ba4619',
    800: '#943a1c',
    900: '#78321a',
    950: '#41170b',
  },

  // Success Colors (Green)
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
    950: '#052e16',
  },

  // Warning Colors (Amber)
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
    950: '#451a03',
  },

  // Error Colors (Red)
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
    950: '#450a0a',
  },

  // Info Colors (Blue)
  info: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554',
  },

  // Neutral Colors (Gray Scale)
  neutral: {
    0: '#ffffff',
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0a0a0a',
    1000: '#000000',
  },

  // NFL Team Colors
  teams: {
    // AFC East
    bills: { primary: '#00338d', secondary: '#c60c30', accent: '#ffffff' },
    dolphins: { primary: '#008e97', secondary: '#fc4c02', accent: '#005778' },
    patriots: { primary: '#002244', secondary: '#c60c30', accent: '#b0b7bc' },
    jets: { primary: '#125740', secondary: '#ffffff', accent: '#000000' },

    // AFC North
    ravens: { primary: '#241773', secondary: '#000000', accent: '#9e7c0c' },
    bengals: { primary: '#fb4f14', secondary: '#000000', accent: '#ffffff' },
    browns: { primary: '#311d00', secondary: '#ff3c00', accent: '#ffffff' },
    steelers: { primary: '#ffb612', secondary: '#101820', accent: '#ffffff' },

    // AFC South
    texans: { primary: '#03202f', secondary: '#a71930', accent: '#ffffff' },
    colts: { primary: '#002c5f', secondary: '#a2aaad', accent: '#ffffff' },
    jaguars: { primary: '#101820', secondary: '#d7a22a', accent: '#9f792c' },
    titans: { primary: '#0c2340', secondary: '#4b92db', accent: '#c8102e' },

    // AFC West
    broncos: { primary: '#fb4f14', secondary: '#002244', accent: '#ffffff' },
    chiefs: { primary: '#e31837', secondary: '#ffb81c', accent: '#ffffff' },
    raiders: { primary: '#000000', secondary: '#a5acaf', accent: '#ffffff' },
    chargers: { primary: '#0080c6', secondary: '#ffc20e', accent: '#ffffff' },

    // NFC East
    cowboys: { primary: '#041e42', secondary: '#869397', accent: '#ffffff' },
    giants: { primary: '#0b2265', secondary: '#a71930', accent: '#a5acaf' },
    eagles: { primary: '#004c54', secondary: '#a5acaf', accent: '#acc0c6' },
    commanders: { primary: '#5a1414', secondary: '#ffb612', accent: '#ffffff' },

    // NFC North
    bears: { primary: '#0b162a', secondary: '#c83803', accent: '#ffffff' },
    packers: { primary: '#203731', secondary: '#ffb612', accent: '#ffffff' },
    lions: { primary: '#0076b6', secondary: '#b0b7bc', accent: '#000000' },
    vikings: { primary: '#4f2683', secondary: '#ffc62f', accent: '#ffffff' },

    // NFC South
    falcons: { primary: '#a71930', secondary: '#000000', accent: '#a5acaf' },
    panthers: { primary: '#0085ca', secondary: '#101820', accent: '#bfc0bf' },
    saints: { primary: '#d3bc8d', secondary: '#101820', accent: '#ffffff' },
    buccaneers: { primary: '#d50a0a', secondary: '#ff7900', accent: '#0a0a08' },

    // NFC West
    cardinals: { primary: '#97233f', secondary: '#000000', accent: '#ffb612' },
    rams: { primary: '#003594', secondary: '#ffa300', accent: '#ffffff' },
    seahawks: { primary: '#002244', secondary: '#69be28', accent: '#a5acaf' },
    niners: { primary: '#aa0000', secondary: '#b3995d', accent: '#ffffff' },
  },
} as const;

// Semantic color mappings
export const semanticColors = {
  background: {
    primary: colors.neutral[0],
    secondary: colors.neutral[50],
    tertiary: colors.neutral[100],
    inverse: colors.neutral[900],
  },
  
  surface: {
    primary: colors.neutral[0],
    secondary: colors.neutral[50],
    tertiary: colors.neutral[100],
    elevated: colors.neutral[0],
    overlay: 'rgba(0, 0, 0, 0.5)',
  },

  border: {
    primary: colors.neutral[200],
    secondary: colors.neutral[300],
    subtle: colors.neutral[100],
    strong: colors.neutral[400],
  },

  text: {
    primary: colors.neutral[900],
    secondary: colors.neutral[600],
    tertiary: colors.neutral[400],
    inverse: colors.neutral[0],
    disabled: colors.neutral[300],
    link: colors.primary[600],
    linkHover: colors.primary[700],
  },

  interactive: {
    primary: colors.primary[500],
    primaryHover: colors.primary[600],
    primaryActive: colors.primary[700],
    primaryDisabled: colors.neutral[300],
    
    secondary: colors.secondary[500],
    secondaryHover: colors.secondary[600],
    secondaryActive: colors.secondary[700],
    
    ghost: 'transparent',
    ghostHover: colors.neutral[100],
    ghostActive: colors.neutral[200],
  },

  status: {
    success: colors.success[500],
    successSubtle: colors.success[100],
    warning: colors.warning[500],
    warningSubtle: colors.warning[100],
    error: colors.error[500],
    errorSubtle: colors.error[100],
    info: colors.info[500],
    infoSubtle: colors.info[100],
  },

  fantasy: {
    // Fantasy-specific color tokens
    projection: colors.info[500],
    actual: colors.success[500],
    variance: colors.warning[500],
    injury: colors.error[500],
    trade: colors.secondary[500],
    waiver: colors.primary[500],
    
    // Player position colors
    qb: '#8B5CF6', // Purple
    rb: '#10B981', // Green
    wr: '#3B82F6', // Blue
    te: '#F59E0B', // Amber
    k: '#EF4444',  // Red
    def: '#6B7280', // Gray
    
    // Matchup ratings
    elite: colors.success[600],
    good: colors.success[400],
    average: colors.warning[500],
    poor: colors.error[400],
    avoid: colors.error[600],
  },
} as const;

// Dark mode color overrides
export const darkColors = {
  background: {
    primary: colors.neutral[950],
    secondary: colors.neutral[900],
    tertiary: colors.neutral[800],
    inverse: colors.neutral[0],
  },
  
  surface: {
    primary: colors.neutral[900],
    secondary: colors.neutral[800],
    tertiary: colors.neutral[700],
    elevated: colors.neutral[800],
    overlay: 'rgba(0, 0, 0, 0.8)',
  },

  border: {
    primary: colors.neutral[700],
    secondary: colors.neutral[600],
    subtle: colors.neutral[800],
    strong: colors.neutral[500],
  },

  text: {
    primary: colors.neutral[50],
    secondary: colors.neutral[300],
    tertiary: colors.neutral[500],
    inverse: colors.neutral[900],
    disabled: colors.neutral[600],
    link: colors.primary[400],
    linkHover: colors.primary[300],
  },

  interactive: {
    primary: colors.primary[500],
    primaryHover: colors.primary[400],
    primaryActive: colors.primary[300],
    primaryDisabled: colors.neutral[600],
    
    secondary: colors.secondary[500],
    secondaryHover: colors.secondary[400],
    secondaryActive: colors.secondary[300],
    
    ghost: 'transparent',
    ghostHover: colors.neutral[800],
    ghostActive: colors.neutral[700],
  },
} as const;

export type ColorScale = typeof colors.primary;
export type SemanticColor = keyof typeof semanticColors;
export type TeamColor = keyof typeof colors.teams;
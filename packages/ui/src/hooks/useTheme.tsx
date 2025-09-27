/**
 * Theme hook for AstralField design system
 */

import { useContext, useEffect, useState, createContext, type ReactNode } from 'react';
import { type ThemeMode, type TeamColor, type Theme, createTheme, applyTheme, getSystemTheme } from '../utils/theme';

/**
 * Theme context interface
 */
interface ThemeContextValue {
  theme: Theme;
  mode: ThemeMode;
  team?: TeamColor;
  setMode: (mode: ThemeMode) => void;
  setTeam: (team?: TeamColor) => void;
  toggleMode: () => void;
}

/**
 * Theme context
 */
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/**
 * Theme provider props
 */
interface ThemeProviderProps {
  children: ReactNode;
  defaultMode?: ThemeMode;
  defaultTeam?: TeamColor;
  storageKey?: string;
}

/**
 * Theme provider component
 */
export function ThemeProvider({
  children,
  defaultMode = 'system',
  defaultTeam,
  storageKey = 'astralfield-theme',
}: ThemeProviderProps) {
  const [mode, setModeState] = useState<ThemeMode>(defaultMode);
  const [team, setTeamState] = useState<TeamColor | undefined>(defaultTeam);

  // Initialize theme from localStorage or defaults
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const { mode: storedMode, team: storedTeam } = JSON.parse(stored);
        if (storedMode) setModeState(storedMode);
        if (storedTeam) setTeamState(storedTeam);
      }
    } catch (error) {
      console.warn('Failed to load theme from localStorage:', error);
    }
  }, [storageKey]);

  // Apply theme whenever mode or team changes
  useEffect(() => {
    const actualMode = mode === 'system' ? getSystemTheme() : mode;
    applyTheme(actualMode, team);

    // Store in localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(storageKey, JSON.stringify({ mode, team }));
      } catch (error) {
        console.warn('Failed to save theme to localStorage:', error);
      }
    }
  }, [mode, team, storageKey]);

  // Listen for system theme changes
  useEffect(() => {
    if (typeof window === 'undefined' || mode !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      applyTheme(getSystemTheme(), team);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [mode, team]);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
  };

  const setTeam = (newTeam?: TeamColor) => {
    setTeamState(newTeam);
  };

  const toggleMode = () => {
    if (mode === 'light') {
      setMode('dark');
    } else if (mode === 'dark') {
      setMode('system');
    } else {
      setMode('light');
    }
  };

  const theme = createTheme(mode, team);

  const value: ThemeContextValue = {
    theme,
    mode,
    team,
    setMode,
    setTeam,
    toggleMode,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to use theme context
 * 
 * @returns Theme context value
 * @throws Error if used outside ThemeProvider
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

/**
 * Hook to get current theme mode (resolved from system if needed)
 * 
 * @returns Current resolved theme mode
 */
export function useResolvedTheme(): 'light' | 'dark' {
  const { mode } = useTheme();
  const [resolvedMode, setResolvedMode] = useState<'light' | 'dark'>(() => {
    return mode === 'system' ? getSystemTheme() : mode;
  });

  useEffect(() => {
    if (mode === 'system') {
      const updateMode = () => setResolvedMode(getSystemTheme());
      updateMode(); // Set initial value

      if (typeof window !== 'undefined') {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', updateMode);
        return () => mediaQuery.removeEventListener('change', updateMode);
      }
    } else {
      setResolvedMode(mode);
    }
  }, [mode]);

  return resolvedMode;
}

/**
 * Hook for theme-aware styling
 * 
 * @returns Object with theme-aware utility functions
 */
export function useThemeUtils() {
  const { theme } = useTheme();
  const resolvedMode = useResolvedTheme();

  return {
    /**
     * Get color value from theme
     * @param path - Color path (e.g., 'background.primary', 'text.secondary')
     * @returns Color value
     */
    getColor: (path: string) => {
      const keys = path.split('.');
      let value: any = theme.colors;
      
      for (const key of keys) {
        value = value?.[key];
      }
      
      return value || '';
    },

    /**
     * Check if current theme is dark
     * @returns True if dark mode
     */
    isDark: resolvedMode === 'dark',

    /**
     * Check if current theme is light
     * @returns True if light mode
     */
    isLight: resolvedMode === 'light',

    /**
     * Get team colors if available
     * @returns Team colors or undefined
     */
    teamColors: theme.teamColors,

    /**
     * Get CSS variable name for a color
     * @param path - Color path
     * @returns CSS variable name
     */
    getCSSVar: (path: string) => `var(--color-${path.replace('.', '-')})`,

    /**
     * Create conditional classes based on theme
     * @param lightClass - Class for light mode
     * @param darkClass - Class for dark mode
     * @returns Appropriate class
     */
    conditional: (lightClass: string, darkClass: string) => {
      return resolvedMode === 'dark' ? darkClass : lightClass;
    },
  };
}
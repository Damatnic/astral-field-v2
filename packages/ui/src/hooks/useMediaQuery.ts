/**
 * Media query hooks for responsive design
 */

import { useState, useEffect } from 'react';

/**
 * Hook for matching media queries with SSR support
 * 
 * @param query - CSS media query string
 * @param options - Additional options
 * @returns Boolean indicating if query matches
 * 
 * @example
 * ```ts
 * const isMobile = useMediaQuery('(max-width: 768px)');
 * const isDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
 * const isRetina = useMediaQuery('(min-resolution: 2dppx)');
 * ```
 */
export function useMediaQuery(
  query: string,
  options: {
    defaultValue?: boolean;
    initializeWithValue?: boolean;
  } = {}
): boolean {
  const { defaultValue = false, initializeWithValue = true } = options;

  const getMatches = (query: string): boolean => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return defaultValue;
  };

  const [matches, setMatches] = useState<boolean>(() => {
    if (initializeWithValue) {
      return getMatches(query);
    }
    return defaultValue;
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const matchMedia = window.matchMedia(query);

    // Triggered at the first client-side load and if query changes
    const handleChange = () => {
      setMatches(matchMedia.matches);
    };

    // Set initial value
    handleChange();

    // Listen for changes
    matchMedia.addEventListener('change', handleChange);

    return () => {
      matchMedia.removeEventListener('change', handleChange);
    };
  }, [query]);

  return matches;
}

/**
 * Breakpoint definitions for common responsive design
 */
export const breakpoints = {
  xs: '(max-width: 639px)',
  sm: '(min-width: 640px)',
  md: '(min-width: 768px)',
  lg: '(min-width: 1024px)',
  xl: '(min-width: 1280px)',
  '2xl': '(min-width: 1536px)',
  
  // Max width breakpoints
  'max-xs': '(max-width: 639px)',
  'max-sm': '(max-width: 767px)',
  'max-md': '(max-width: 1023px)',
  'max-lg': '(max-width: 1279px)',
  'max-xl': '(max-width: 1535px)',
  
  // Range breakpoints
  'sm-md': '(min-width: 640px) and (max-width: 1023px)',
  'md-lg': '(min-width: 768px) and (max-width: 1279px)',
  'lg-xl': '(min-width: 1024px) and (max-width: 1535px)',
  
  // Device-specific
  mobile: '(max-width: 767px)',
  tablet: '(min-width: 768px) and (max-width: 1023px)',
  desktop: '(min-width: 1024px)',
  
  // Orientation
  portrait: '(orientation: portrait)',
  landscape: '(orientation: landscape)',
  
  // User preferences
  darkMode: '(prefers-color-scheme: dark)',
  lightMode: '(prefers-color-scheme: light)',
  reducedMotion: '(prefers-reduced-motion: reduce)',
  
  // Device capabilities
  touch: '(pointer: coarse)',
  mouse: '(pointer: fine)',
  highRes: '(min-resolution: 2dppx), (-webkit-min-device-pixel-ratio: 2)',
} as const;

/**
 * Hook for common breakpoint queries
 * 
 * @returns Object with common breakpoint matches
 * 
 * @example
 * ```ts
 * const { isMobile, isTablet, isDesktop, isDarkMode } = useBreakpoints();
 * 
 * return (
 *   <div>
 *     {isMobile && <MobileComponent />}
 *     {isTablet && <TabletComponent />}
 *     {isDesktop && <DesktopComponent />}
 *   </div>
 * );
 * ```
 */
export function useBreakpoints() {
  const xs = useMediaQuery(breakpoints.xs);
  const sm = useMediaQuery(breakpoints.sm);
  const md = useMediaQuery(breakpoints.md);
  const lg = useMediaQuery(breakpoints.lg);
  const xl = useMediaQuery(breakpoints.xl);
  const xxl = useMediaQuery(breakpoints['2xl']);
  
  const mobile = useMediaQuery(breakpoints.mobile);
  const tablet = useMediaQuery(breakpoints.tablet);
  const desktop = useMediaQuery(breakpoints.desktop);
  
  const portrait = useMediaQuery(breakpoints.portrait);
  const landscape = useMediaQuery(breakpoints.landscape);
  
  const darkMode = useMediaQuery(breakpoints.darkMode);
  const lightMode = useMediaQuery(breakpoints.lightMode);
  const reducedMotion = useMediaQuery(breakpoints.reducedMotion);
  
  const touch = useMediaQuery(breakpoints.touch);
  const mouse = useMediaQuery(breakpoints.mouse);
  const highRes = useMediaQuery(breakpoints.highRes);

  return {
    // Size breakpoints
    xs,
    sm,
    md,
    lg,
    xl,
    xxl,
    
    // Device categories
    isMobile: mobile,
    isTablet: tablet,
    isDesktop: desktop,
    
    // Orientation
    isPortrait: portrait,
    isLandscape: landscape,
    
    // User preferences
    isDarkMode: darkMode,
    isLightMode: lightMode,
    prefersReducedMotion: reducedMotion,
    
    // Input methods
    isTouch: touch,
    isMouse: mouse,
    isHighRes: highRes,
    
    // Current breakpoint (largest matching)
    currentBreakpoint: xxl ? '2xl' : xl ? 'xl' : lg ? 'lg' : md ? 'md' : sm ? 'sm' : 'xs',
  };
}

/**
 * Hook for responsive values based on breakpoints
 * 
 * @param values - Object mapping breakpoints to values
 * @param fallback - Fallback value if no breakpoints match
 * @returns Current responsive value
 * 
 * @example
 * ```ts
 * const columns = useResponsiveValue({
 *   xs: 1,
 *   md: 2,
 *   lg: 3,
 *   xl: 4,
 * }, 1);
 * 
 * const fontSize = useResponsiveValue({
 *   mobile: '14px',
 *   tablet: '16px',
 *   desktop: '18px',
 * }, '16px');
 * ```
 */
export function useResponsiveValue<T>(
  values: Partial<Record<keyof typeof breakpoints | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl', T>>,
  fallback: T
): T {
  const breakpointMatches = useBreakpoints();
  
  // Define breakpoint priority (largest to smallest)
  const breakpointOrder: Array<keyof typeof values> = [
    '2xl', 'xl', 'lg', 'md', 'sm', 'xs',
    'desktop', 'tablet', 'mobile'
  ];
  
  // Find the first matching breakpoint value
  for (const breakpoint of breakpointOrder) {
    if (values[breakpoint] !== undefined) {
      const isMatching = (() => {
        switch (breakpoint) {
          case 'xs': return breakpointMatches.xs;
          case 'sm': return breakpointMatches.sm;
          case 'md': return breakpointMatches.md;
          case 'lg': return breakpointMatches.lg;
          case 'xl': return breakpointMatches.xl;
          case '2xl': return breakpointMatches.xxl;
          case 'mobile': return breakpointMatches.isMobile;
          case 'tablet': return breakpointMatches.isTablet;
          case 'desktop': return breakpointMatches.isDesktop;
          default: return false;
        }
      })();
      
      if (isMatching) {
        return values[breakpoint]!;
      }
    }
  }
  
  return fallback;
}

/**
 * Hook for container queries (experimental)
 * Note: This requires CSS Container Queries support
 * 
 * @param containerName - Container name for scoped queries
 * @param query - Container query string
 * @returns Boolean indicating if container query matches
 * 
 * @example
 * ```ts
 * const isWideContainer = useContainerQuery('sidebar', '(min-width: 300px)');
 * ```
 */
export function useContainerQuery(containerName: string, query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('matchMedia' in window)) {
      return;
    }

    // Check if container queries are supported
    const supportsContainerQueries = 'container' in document.documentElement.style;
    
    if (!supportsContainerQueries) {
      console.warn('Container queries are not supported in this browser');
      return;
    }

    try {
      const containerQuery = `@container ${containerName} ${query}`;
      const mediaQuery = window.matchMedia(containerQuery);
      
      const handleChange = () => {
        setMatches(mediaQuery.matches);
      };

      handleChange();
      mediaQuery.addEventListener('change', handleChange);

      return () => {
        mediaQuery.removeEventListener('change', handleChange);
      };
    } catch (error) {
      console.warn('Error setting up container query:', error);
    }
  }, [containerName, query]);

  return matches;
}

/**
 * Hook for detecting viewport size changes
 * 
 * @returns Viewport dimensions and utilities
 * 
 * @example
 * ```ts
 * const { width, height, isLandscape, isPortrait } = useViewport();
 * ```
 */
export function useViewport() {
  const [viewport, setViewport] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    width: viewport.width,
    height: viewport.height,
    isLandscape: viewport.width > viewport.height,
    isPortrait: viewport.height >= viewport.width,
    aspectRatio: viewport.width / viewport.height,
  };
}
/**
 * Custom hooks for AstralField design system
 * Centralized export for all custom hooks
 */

// Core hooks
export * from './useTheme';
export * from './useLocalStorage';
export * from './useDebounce';
export * from './useMediaQuery';
export * from './useKeyboard';
export * from './useClipboard';

// Re-export commonly used hooks with explicit names
export {
  useTheme,
  ThemeProvider,
  useResolvedTheme,
  useThemeUtils,
  type ThemeMode,
  type TeamTheme,
  type Theme,
} from './useTheme';

export {
  useLocalStorage,
  useLocalStorageBoolean,
  useLocalStorageArray,
  useLocalStorageObject,
} from './useLocalStorage';

export {
  useDebounce,
  useDebouncedCallback,
  useAdvancedDebounce,
  useDebouncedState,
  useSearch,
} from './useDebounce';

export {
  useMediaQuery,
  useBreakpoints,
  useResponsiveValue,
  useContainerQuery,
  useViewport,
  breakpoints,
} from './useMediaQuery';

export {
  useKeyboard,
  useArrowKeys,
  useKeyPress,
  useKeyboardNavigation,
  useEscapeKey,
  useFormKeyboard,
  useFantasyKeyboard,
  FANTASY_SHORTCUTS,
} from './useKeyboard';

export {
  useClipboard,
  useRichClipboard,
  useFantasyClipboard,
} from './useClipboard';
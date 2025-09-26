/**
 * Keyboard interaction hooks for accessibility and UX
 */

import { useEffect, useCallback, useRef, useState } from 'react';

/**
 * Type for keyboard event handler
 */
type KeyboardEventHandler = (event: KeyboardEvent) => void;

/**
 * Options for keyboard hooks
 */
interface KeyboardOptions {
  enabled?: boolean;
  preventDefault?: boolean;
  stopPropagation?: boolean;
  target?: 'document' | 'window' | HTMLElement | null;
}

/**
 * Hook for handling keyboard shortcuts
 * 
 * @param keys - Key combination (e.g., 'ctrl+s', 'escape', 'cmd+shift+z')
 * @param handler - Function to call when keys are pressed
 * @param options - Additional options
 * 
 * @example
 * ```ts
 * useKeyboard('escape', () => closeModal());
 * useKeyboard('ctrl+s', () => saveDocument(), { preventDefault: true });
 * useKeyboard(['enter', 'space'], () => selectItem());
 * ```
 */
export function useKeyboard(
  keys: string | string[],
  handler: KeyboardEventHandler,
  options: KeyboardOptions = {}
) {
  const {
    enabled = true,
    preventDefault = false,
    stopPropagation = false,
    target = 'document',
  } = options;

  const savedHandler = useRef<KeyboardEventHandler>();

  // Update handler ref when it changes
  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!enabled) return;

    const keyArray = Array.isArray(keys) ? keys : [keys];
    
    const handleKeyDown = (event: KeyboardEvent) => {
      const pressedKeys = [
        event.ctrlKey && 'ctrl',
        event.metaKey && 'cmd',
        event.altKey && 'alt',
        event.shiftKey && 'shift',
        event.key.toLowerCase(),
      ].filter(Boolean).join('+');

      const matches = keyArray.some(keyCombo => {
        const normalizedCombo = keyCombo.toLowerCase().replace(/\s/g, '');
        return normalizedCombo === pressedKeys || event.key.toLowerCase() === keyCombo.toLowerCase();
      });

      if (matches) {
        if (preventDefault) event.preventDefault();
        if (stopPropagation) event.stopPropagation();
        savedHandler.current?.(event);
      }
    };

    const targetElement = (() => {
      if (target === 'document') return document;
      if (target === 'window') return window;
      if (target instanceof HTMLElement) return target;
      return document;
    })();

    targetElement.addEventListener('keydown', handleKeyDown as any);
    
    return () => {
      targetElement.removeEventListener('keydown', handleKeyDown as any);
    };
  }, [keys, enabled, preventDefault, stopPropagation, target]);
}

/**
 * Hook for handling arrow key navigation
 * 
 * @param handlers - Object with arrow key handlers
 * @param options - Additional options
 * 
 * @example
 * ```ts
 * useArrowKeys({
 *   up: () => moveFocusUp(),
 *   down: () => moveFocusDown(),
 *   left: () => moveFocusLeft(),
 *   right: () => moveFocusRight(),
 * }, { preventDefault: true });
 * ```
 */
export function useArrowKeys(
  handlers: {
    up?: () => void;
    down?: () => void;
    left?: () => void;
    right?: () => void;
  },
  options: Omit<KeyboardOptions, 'keys'> = {}
) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowUp':
        handlers.up?.();
        break;
      case 'ArrowDown':
        handlers.down?.();
        break;
      case 'ArrowLeft':
        handlers.left?.();
        break;
      case 'ArrowRight':
        handlers.right?.();
        break;
    }
  }, [handlers]);

  useKeyboard(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'], handleKeyDown, {
    preventDefault: true,
    ...options,
  });
}

/**
 * Hook for detecting if a key is currently pressed
 * 
 * @param targetKey - Key to monitor
 * @returns Boolean indicating if key is pressed
 * 
 * @example
 * ```ts
 * const isShiftPressed = useKeyPress('Shift');
 * const isSpacePressed = useKeyPress(' ');
 * ```
 */
export function useKeyPress(targetKey: string): boolean {
  const [isPressed, setIsPressed] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === targetKey) {
        setIsPressed(true);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === targetKey) {
        setIsPressed(false);
      }
    };

    const handleBlur = () => {
      setIsPressed(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [targetKey]);

  return isPressed;
}

/**
 * Hook for creating keyboard navigation within a container
 * 
 * @param containerRef - Ref to the container element
 * @param options - Navigation options
 * @returns Navigation utilities
 * 
 * @example
 * ```ts
 * const containerRef = useRef<HTMLDivElement>(null);
 * const { focusedIndex, setFocusedIndex } = useKeyboardNavigation(containerRef, {
 *   selector: '[role="menuitem"]',
 *   loop: true,
 * });
 * ```
 */
export function useKeyboardNavigation(
  containerRef: React.RefObject<HTMLElement>,
  options: {
    selector?: string;
    loop?: boolean;
    orientation?: 'horizontal' | 'vertical' | 'both';
    onSelect?: (index: number, element: Element) => void;
  } = {}
) {
  const {
    selector = '[tabindex]:not([tabindex="-1"]), button, input, select, textarea, a[href]',
    loop = true,
    orientation = 'vertical',
    onSelect,
  } = options;

  const [focusedIndex, setFocusedIndex] = useState(-1);

  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return [];
    return Array.from(containerRef.current.querySelectorAll(selector));
  }, [selector]);

  const focusElement = useCallback((index: number) => {
    const elements = getFocusableElements();
    const element = elements[index] as HTMLElement;
    if (element) {
      element.focus();
      setFocusedIndex(index);
    }
  }, [getFocusableElements]);

  const moveNext = useCallback(() => {
    const elements = getFocusableElements();
    if (elements.length === 0) return;

    let nextIndex = focusedIndex + 1;
    if (nextIndex >= elements.length) {
      nextIndex = loop ? 0 : elements.length - 1;
    }
    focusElement(nextIndex);
  }, [focusedIndex, focusElement, getFocusableElements, loop]);

  const movePrevious = useCallback(() => {
    const elements = getFocusableElements();
    if (elements.length === 0) return;

    let prevIndex = focusedIndex - 1;
    if (prevIndex < 0) {
      prevIndex = loop ? elements.length - 1 : 0;
    }
    focusElement(prevIndex);
  }, [focusedIndex, focusElement, getFocusableElements, loop]);

  const selectCurrent = useCallback(() => {
    const elements = getFocusableElements();
    const currentElement = elements[focusedIndex];
    if (currentElement && onSelect) {
      onSelect(focusedIndex, currentElement);
    }
  }, [focusedIndex, getFocusableElements, onSelect]);

  // Handle keyboard navigation
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const { key } = event;

      if (orientation === 'vertical' || orientation === 'both') {
        if (key === 'ArrowDown') {
          event.preventDefault();
          moveNext();
        } else if (key === 'ArrowUp') {
          event.preventDefault();
          movePrevious();
        }
      }

      if (orientation === 'horizontal' || orientation === 'both') {
        if (key === 'ArrowRight') {
          event.preventDefault();
          moveNext();
        } else if (key === 'ArrowLeft') {
          event.preventDefault();
          movePrevious();
        }
      }

      if (key === 'Home') {
        event.preventDefault();
        focusElement(0);
      } else if (key === 'End') {
        event.preventDefault();
        const elements = getFocusableElements();
        focusElement(elements.length - 1);
      } else if (key === 'Enter' || key === ' ') {
        if (focusedIndex >= 0) {
          event.preventDefault();
          selectCurrent();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [
    focusedIndex,
    moveNext,
    movePrevious,
    focusElement,
    getFocusableElements,
    selectCurrent,
    orientation,
  ]);

  // Track focus changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleFocusIn = (event: FocusEvent) => {
      const elements = getFocusableElements();
      const index = elements.indexOf(event.target as Element);
      if (index >= 0) {
        setFocusedIndex(index);
      }
    };

    container.addEventListener('focusin', handleFocusIn);
    return () => container.removeEventListener('focusin', handleFocusIn);
  }, [getFocusableElements]);

  return {
    focusedIndex,
    setFocusedIndex,
    focusElement,
    moveNext,
    movePrevious,
    selectCurrent,
    getFocusableElements,
  };
}

/**
 * Hook for handling escape key to close overlays
 * 
 * @param callback - Function to call on escape
 * @param enabled - Whether the hook is enabled
 * 
 * @example
 * ```ts
 * useEscapeKey(() => setIsOpen(false), isOpen);
 * ```
 */
export function useEscapeKey(callback: () => void, enabled: boolean = true) {
  useKeyboard('Escape', callback, { enabled });
}

/**
 * Hook for handling common form keyboard shortcuts
 * 
 * @param handlers - Object with form action handlers
 * 
 * @example
 * ```ts
 * useFormKeyboard({
 *   save: () => handleSave(),
 *   cancel: () => handleCancel(),
 *   submit: () => handleSubmit(),
 * });
 * ```
 */
export function useFormKeyboard(handlers: {
  save?: () => void;
  cancel?: () => void;
  submit?: () => void;
  reset?: () => void;
}) {
  useKeyboard('ctrl+s', () => handlers.save?.(), { preventDefault: true });
  useKeyboard('cmd+s', () => handlers.save?.(), { preventDefault: true });
  useKeyboard('Escape', () => handlers.cancel?.());
  useKeyboard('ctrl+Enter', () => handlers.submit?.(), { preventDefault: true });
  useKeyboard('cmd+Enter', () => handlers.submit?.(), { preventDefault: true });
  useKeyboard('ctrl+r', () => handlers.reset?.(), { preventDefault: true });
  useKeyboard('cmd+r', () => handlers.reset?.(), { preventDefault: true });
}

/**
 * Common keyboard shortcuts for fantasy sports applications
 */
export const FANTASY_SHORTCUTS = {
  QUICK_ADD: 'a',
  QUICK_DROP: 'd',
  QUICK_TRADE: 't',
  REFRESH_SCORES: 'r',
  TOGGLE_FAVORITES: 'f',
  SEARCH: 'ctrl+f',
  PREVIOUS_WEEK: 'ArrowLeft',
  NEXT_WEEK: 'ArrowRight',
  TOGGLE_SETTINGS: 'ctrl+,',
} as const;

/**
 * Hook for fantasy sports keyboard shortcuts
 * 
 * @param handlers - Object mapping shortcuts to handlers
 * 
 * @example
 * ```ts
 * useFantasyKeyboard({
 *   [FANTASY_SHORTCUTS.QUICK_ADD]: () => openAddPlayerModal(),
 *   [FANTASY_SHORTCUTS.REFRESH_SCORES]: () => refreshScores(),
 *   [FANTASY_SHORTCUTS.NEXT_WEEK]: () => goToNextWeek(),
 * });
 * ```
 */
export function useFantasyKeyboard(
  handlers: Partial<Record<string, () => void>>
) {
  Object.entries(handlers).forEach(([shortcut, handler]) => {
    useKeyboard(shortcut, handler, { preventDefault: true });
  });
}
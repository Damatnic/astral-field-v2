'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

// Accessibility Context for global settings
interface AccessibilitySettings {
  highContrast: boolean;
  reducedMotion: boolean;
  largeText: boolean;
  keyboardNavigation: boolean;
  screenReaderOptimized: boolean;
  focusIndicators: boolean;
}

interface AccessibilityContextType {
  settings: AccessibilitySettings;
  updateSettings: (newSettings: Partial<AccessibilitySettings>) => void;
  announceToScreenReader: (message: string, priority?: 'polite' | 'assertive') => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | null>(null);

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return context;
};

// Accessibility Provider Component
export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AccessibilitySettings>({
    highContrast: false,
    reducedMotion: false,
    largeText: false,
    keyboardNavigation: true,
    screenReaderOptimized: false,
    focusIndicators: true
  });

  const [announcer, setAnnouncer] = useState<HTMLElement | null>(null);

  // Initialize accessibility features
  useEffect(() => {
    // Check for user preferences
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const prefersHighContrast = window.matchMedia('(prefers-contrast: high)');
    
    setSettings(prev => ({
      ...prev,
      reducedMotion: prefersReducedMotion.matches,
      highContrast: prefersHighContrast.matches
    }));

    // Create screen reader announcer
    const announcerElement = document.createElement('div');
    announcerElement.setAttribute('aria-live', 'polite');
    announcerElement.setAttribute('aria-atomic', 'true');
    announcerElement.setAttribute('aria-hidden', 'false');
    announcerElement.className = 'sr-only';
    announcerElement.style.cssText = `
      position: absolute;
      left: -10000px;
      width: 1px;
      height: 1px;
      overflow: hidden;
    `;
    document.body.appendChild(announcerElement);
    setAnnouncer(announcerElement);

    // Listen for preference changes
    const handleMotionChange = (e: MediaQueryListEvent) => {
      setSettings(prev => ({ ...prev, reducedMotion: e.matches }));
    };

    const handleContrastChange = (e: MediaQueryListEvent) => {
      setSettings(prev => ({ ...prev, highContrast: e.matches }));
    };

    prefersReducedMotion.addEventListener('change', handleMotionChange);
    prefersHighContrast.addEventListener('change', handleContrastChange);

    return () => {
      prefersReducedMotion.removeEventListener('change', handleMotionChange);
      prefersHighContrast.removeEventListener('change', handleContrastChange);
      if (announcerElement.parentNode) {
        announcerElement.parentNode.removeChild(announcerElement);
      }
    };
  }, []);

  // Apply accessibility classes to document
  useEffect(() => {
    const classList = document.documentElement.classList;
    
    classList.toggle('high-contrast', settings.highContrast);
    classList.toggle('reduced-motion', settings.reducedMotion);
    classList.toggle('large-text', settings.largeText);
    classList.toggle('keyboard-navigation', settings.keyboardNavigation);
    classList.toggle('screen-reader-optimized', settings.screenReaderOptimized);
    classList.toggle('focus-indicators', settings.focusIndicators);
  }, [settings]);

  const updateSettings = (newSettings: Partial<AccessibilitySettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (announcer) {
      announcer.setAttribute('aria-live', priority);
      announcer.textContent = message;
      
      // Clear after announcement
      setTimeout(() => {
        announcer.textContent = '';
      }, 1000);
    }
  };

  return (
    <AccessibilityContext.Provider value={{
      settings,
      updateSettings,
      announceToScreenReader
    }}>
      {children}
    </AccessibilityContext.Provider>
  );
}

// Focus management utilities
export class FocusManager {
  private static focusableSelectors = [
    'button:not([disabled])',
    '[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]'
  ].join(', ');

  static getFocusableElements(container: HTMLElement): HTMLElement[] {
    return Array.from(container.querySelectorAll(this.focusableSelectors));
  }

  static trapFocus(container: HTMLElement) {
    const focusableElements = this.getFocusableElements(container);
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);
    firstElement.focus();

    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  }

  static restoreFocus(previousElement?: HTMLElement | null) {
    if (previousElement && document.contains(previousElement)) {
      previousElement.focus();
    }
  }
}

// Skip Link Component for keyboard navigation
export function SkipLinks() {
  return (
    <div className="sr-only focus:not-sr-only">
      <a
        href="#main-content"
        className="absolute top-0 left-0 z-50 p-4 bg-blue-600 text-white font-medium rounded-br-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        Skip to main content
      </a>
      <a
        href="#navigation"
        className="absolute top-0 left-32 z-50 p-4 bg-blue-600 text-white font-medium rounded-br-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        Skip to navigation
      </a>
    </div>
  );
}

// Accessible Button Component
export interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

export function AccessibleButton({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  disabled,
  className = '',
  ...props
}: AccessibleButtonProps) {
  const { settings, announceToScreenReader } = useAccessibility();

  const baseClasses = 'inline-flex items-center justify-center font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
  };

  const sizeClasses = {
    sm: settings.largeText ? 'px-4 py-3 text-base' : 'px-3 py-2 text-sm',
    md: settings.largeText ? 'px-6 py-4 text-lg' : 'px-4 py-2 text-base',
    lg: settings.largeText ? 'px-8 py-5 text-xl' : 'px-6 py-3 text-lg'
  };

  const contrastClasses = settings.highContrast ? 'ring-4 ring-current' : '';
  const motionClasses = settings.reducedMotion ? '' : 'transform hover:scale-105';

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (settings.screenReaderOptimized && !loading) {
      announceToScreenReader(`Button ${children} activated`);
    }
    props.onClick?.(e);
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${contrastClasses} ${motionClasses} ${className}`}
      disabled={disabled || loading}
      aria-describedby={loading ? 'loading-description' : undefined}
      {...props}
      onClick={handleClick}
    >
      {loading && (
        <>
          <svg
            className="w-4 h-4 mr-2 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
          <span className="sr-only">Loading...</span>
        </>
      )}
      {children}
    </button>
  );
}

// Live Region Component for dynamic content announcements
export function LiveRegion({ 
  children, 
  priority = 'polite' 
}: { 
  children: React.ReactNode; 
  priority?: 'polite' | 'assertive' 
}) {
  return (
    <div
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
    >
      {children}
    </div>
  );
}

// Keyboard navigation hook
export function useKeyboardNavigation() {
  const [currentFocusIndex, setCurrentFocusIndex] = useState(0);
  const [focusableElements, setFocusableElements] = useState<HTMLElement[]>([]);

  const updateFocusableElements = (container: HTMLElement) => {
    const elements = FocusManager.getFocusableElements(container);
    setFocusableElements(elements);
    setCurrentFocusIndex(0);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (focusableElements.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        e.preventDefault();
        const nextIndex = (currentFocusIndex + 1) % focusableElements.length;
        setCurrentFocusIndex(nextIndex);
        focusableElements[nextIndex]?.focus();
        break;
      
      case 'ArrowUp':
      case 'ArrowLeft':
        e.preventDefault();
        const prevIndex = currentFocusIndex === 0 ? focusableElements.length - 1 : currentFocusIndex - 1;
        setCurrentFocusIndex(prevIndex);
        focusableElements[prevIndex]?.focus();
        break;
      
      case 'Home':
        e.preventDefault();
        setCurrentFocusIndex(0);
        focusableElements[0]?.focus();
        break;
      
      case 'End':
        e.preventDefault();
        const lastIndex = focusableElements.length - 1;
        setCurrentFocusIndex(lastIndex);
        focusableElements[lastIndex]?.focus();
        break;
    }
  };

  return {
    updateFocusableElements,
    handleKeyDown,
    currentFocusIndex,
    focusableElements
  };
}

// ARIA Label Generator
export class ARIALabelGenerator {
  static generateTableDescription(rowCount: number, columnCount: number): string {
    return `Table with ${rowCount} rows and ${columnCount} columns`;
  }

  static generateListDescription(itemCount: number, listType: 'ordered' | 'unordered' = 'unordered'): string {
    return `${listType === 'ordered' ? 'Ordered' : 'Unordered'} list with ${itemCount} items`;
  }

  static generateProgressDescription(current: number, total: number, label?: string): string {
    const percentage = Math.round((current / total) * 100);
    return `${label || 'Progress'}: ${percentage}% complete, ${current} of ${total}`;
  }

  static generateSortDescription(column: string, direction: 'asc' | 'desc'): string {
    return `Sorted by ${column} in ${direction === 'asc' ? 'ascending' : 'descending'} order`;
  }
}
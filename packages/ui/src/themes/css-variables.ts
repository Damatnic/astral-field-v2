/**
 * CSS Variables generation for AstralField themes
 */

import { type BaseTheme } from './base';

/**
 * Generate CSS custom properties from theme
 */
export function generateCSSVariables(theme: BaseTheme): Record<string, string> {
  const variables: Record<string, string> = {};

  // Color variables
  Object.entries(theme.colors).forEach(([category, colorGroup]) => {
    Object.entries(colorGroup).forEach(([variant, value]) => {
      variables[`--color-${category}-${variant.replace(/([A-Z])/g, '-$1').toLowerCase()}`] = value;
    });
  });

  // Typography variables
  Object.entries(theme.fonts.families).forEach(([name, family]) => {
    variables[`--font-${name}`] = Array.isArray(family) ? family.join(', ') : family;
  });

  Object.entries(theme.fonts.sizes).forEach(([size, value]) => {
    variables[`--font-size-${size}`] = value;
  });

  Object.entries(theme.fonts.weights).forEach(([weight, value]) => {
    variables[`--font-weight-${weight}`] = value.toString();
  });

  Object.entries(theme.fonts.lineHeights).forEach(([height, value]) => {
    variables[`--line-height-${height}`] = typeof value === 'number' ? value.toString() : value;
  });

  // Spacing variables
  Object.entries(theme.spacing).forEach(([space, value]) => {
    variables[`--spacing-${space.replace('.', '_')}`] = value;
  });

  // Border radius variables
  Object.entries(theme.borderRadius).forEach(([radius, value]) => {
    variables[`--radius-${radius}`] = value;
  });

  // Shadow variables
  Object.entries(theme.shadows).forEach(([shadow, value]) => {
    variables[`--shadow-${shadow}`] = value;
  });

  // Z-index variables
  Object.entries(theme.zIndex).forEach(([layer, value]) => {
    variables[`--z-${layer}`] = typeof value === 'number' ? value.toString() : value;
  });

  // Animation variables
  Object.entries(theme.animation.duration).forEach(([name, value]) => {
    variables[`--duration-${name}`] = value;
  });

  Object.entries(theme.animation.easing).forEach(([name, value]) => {
    variables[`--easing-${name}`] = value;
  });

  // Breakpoint variables
  Object.entries(theme.breakpoints.values).forEach(([breakpoint, value]) => {
    variables[`--breakpoint-${breakpoint}`] = `${value}px`;
  });

  return variables;
}

/**
 * Generate CSS string from variables
 */
export function generateCSSString(variables: Record<string, string>, selector: string = ':root'): string {
  const cssProperties = Object.entries(variables)
    .map(([property, value]) => `  ${property}: ${value};`)
    .join('\n');

  return `${selector} {\n${cssProperties}\n}`;
}

/**
 * Apply CSS variables to DOM
 */
export function applyCSSVariables(variables: Record<string, string>, element: HTMLElement = document.documentElement): void {
  Object.entries(variables).forEach(([property, value]) => {
    element.style.setProperty(property, value);
  });
}

/**
 * Remove CSS variables from DOM
 */
export function removeCSSVariables(variables: Record<string, string>, element: HTMLElement = document.documentElement): void {
  Object.keys(variables).forEach((property) => {
    element.style.removeProperty(property);
  });
}

/**
 * Get CSS variable value
 */
export function getCSSVariable(variable: string, element: HTMLElement = document.documentElement): string {
  return getComputedStyle(element).getPropertyValue(variable).trim();
}

/**
 * Set CSS variable value
 */
export function setCSSVariable(variable: string, value: string, element: HTMLElement = document.documentElement): void {
  element.style.setProperty(variable, value);
}

/**
 * Tailwind CSS configuration generator
 */
export function generateTailwindConfig(theme: BaseTheme) {
  return {
    theme: {
      colors: {
        // Semantic colors
        background: {
          primary: 'var(--color-background-primary)',
          secondary: 'var(--color-background-secondary)',
          tertiary: 'var(--color-background-tertiary)',
          inverse: 'var(--color-background-inverse)',
        },
        surface: {
          primary: 'var(--color-surface-primary)',
          secondary: 'var(--color-surface-secondary)',
          tertiary: 'var(--color-surface-tertiary)',
          elevated: 'var(--color-surface-elevated)',
          overlay: 'var(--color-surface-overlay)',
        },
        border: {
          primary: 'var(--color-border-primary)',
          secondary: 'var(--color-border-secondary)',
          subtle: 'var(--color-border-subtle)',
          strong: 'var(--color-border-strong)',
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          tertiary: 'var(--color-text-tertiary)',
          inverse: 'var(--color-text-inverse)',
          disabled: 'var(--color-text-disabled)',
          link: 'var(--color-text-link)',
          'link-hover': 'var(--color-text-link-hover)',
        },
        interactive: {
          primary: 'var(--color-interactive-primary)',
          'primary-hover': 'var(--color-interactive-primary-hover)',
          'primary-active': 'var(--color-interactive-primary-active)',
          'primary-disabled': 'var(--color-interactive-primary-disabled)',
          secondary: 'var(--color-interactive-secondary)',
          'secondary-hover': 'var(--color-interactive-secondary-hover)',
          'secondary-active': 'var(--color-interactive-secondary-active)',
          ghost: 'var(--color-interactive-ghost)',
          'ghost-hover': 'var(--color-interactive-ghost-hover)',
          'ghost-active': 'var(--color-interactive-ghost-active)',
        },
        status: {
          success: 'var(--color-status-success)',
          'success-subtle': 'var(--color-status-success-subtle)',
          warning: 'var(--color-status-warning)',
          'warning-subtle': 'var(--color-status-warning-subtle)',
          error: 'var(--color-status-error)',
          'error-subtle': 'var(--color-status-error-subtle)',
          info: 'var(--color-status-info)',
          'info-subtle': 'var(--color-status-info-subtle)',
        },
        fantasy: {
          projection: 'var(--color-fantasy-projection)',
          actual: 'var(--color-fantasy-actual)',
          variance: 'var(--color-fantasy-variance)',
          injury: 'var(--color-fantasy-injury)',
          trade: 'var(--color-fantasy-trade)',
          waiver: 'var(--color-fantasy-waiver)',
          qb: 'var(--color-fantasy-qb)',
          rb: 'var(--color-fantasy-rb)',
          wr: 'var(--color-fantasy-wr)',
          te: 'var(--color-fantasy-te)',
          k: 'var(--color-fantasy-k)',
          def: 'var(--color-fantasy-def)',
          elite: 'var(--color-fantasy-elite)',
          good: 'var(--color-fantasy-good)',
          average: 'var(--color-fantasy-average)',
          poor: 'var(--color-fantasy-poor)',
          avoid: 'var(--color-fantasy-avoid)',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
        display: ['var(--font-display)'],
      },
      fontSize: Object.entries(theme.fonts.sizes).reduce((acc, [key, value]) => {
        acc[key] = `var(--font-size-${key})`;
        return acc;
      }, {} as Record<string, string>),
      fontWeight: Object.entries(theme.fonts.weights).reduce((acc, [key, value]) => {
        acc[key] = `var(--font-weight-${key})`;
        return acc;
      }, {} as Record<string, string>),
      lineHeight: Object.entries(theme.fonts.lineHeights).reduce((acc, [key, value]) => {
        acc[key] = `var(--line-height-${key})`;
        return acc;
      }, {} as Record<string, string>),
      spacing: Object.entries(theme.spacing).reduce((acc, [key, value]) => {
        acc[key.replace('.', '_')] = `var(--spacing-${key.replace('.', '_')})`;
        return acc;
      }, {} as Record<string, string>),
      borderRadius: Object.entries(theme.borderRadius).reduce((acc, [key, value]) => {
        acc[key] = `var(--radius-${key})`;
        return acc;
      }, {} as Record<string, string>),
      boxShadow: Object.entries(theme.shadows).reduce((acc, [key, value]) => {
        acc[key] = `var(--shadow-${key})`;
        return acc;
      }, {} as Record<string, string>),
      zIndex: Object.entries(theme.zIndex).reduce((acc, [key, value]) => {
        acc[key] = `var(--z-${key})`;
        return acc;
      }, {} as Record<string, string>),
      transitionDuration: Object.entries(theme.animation.duration).reduce((acc, [key, value]) => {
        acc[key] = `var(--duration-${key})`;
        return acc;
      }, {} as Record<string, string>),
      transitionTimingFunction: Object.entries(theme.animation.easing).reduce((acc, [key, value]) => {
        acc[key] = `var(--easing-${key})`;
        return acc;
      }, {} as Record<string, string>),
      screens: Object.entries(theme.breakpoints.values).reduce((acc, [key, value]) => {
        acc[key] = `var(--breakpoint-${key})`;
        return acc;
      }, {} as Record<string, string>),
    },
  };
}
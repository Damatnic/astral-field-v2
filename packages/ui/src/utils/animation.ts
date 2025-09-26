/**
 * Animation utility functions and helpers for AstralField
 */

import { duration, easing } from '../tokens/spacing';

/**
 * Animation configuration type
 */
export interface AnimationConfig {
  duration?: keyof typeof duration | string;
  easing?: keyof typeof easing | string;
  delay?: string;
  fillMode?: 'none' | 'forwards' | 'backwards' | 'both';
}

/**
 * Create CSS transition string
 * 
 * @param properties - CSS properties to transition
 * @param config - Animation configuration
 * @returns CSS transition string
 */
export function createTransition(
  properties: string | string[],
  config: AnimationConfig = {}
): string {
  const {
    duration: dur = 'normal',
    easing: ease = 'smooth',
    delay = '0ms',
  } = config;

  const durationValue = typeof dur === 'string' && dur in duration ? duration[dur as keyof typeof duration] : dur;
  const easingValue = typeof ease === 'string' && ease in easing ? easing[ease as keyof typeof easing] : ease;

  const props = Array.isArray(properties) ? properties : [properties];
  
  return props
    .map(prop => `${prop} ${durationValue} ${easingValue} ${delay}`)
    .join(', ');
}

/**
 * Create CSS animation string
 * 
 * @param name - Animation name
 * @param config - Animation configuration
 * @returns CSS animation string
 */
export function createAnimation(
  name: string,
  config: AnimationConfig & {
    iterationCount?: number | 'infinite';
    direction?: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
  } = {}
): string {
  const {
    duration: dur = 'normal',
    easing: ease = 'smooth',
    delay = '0ms',
    fillMode = 'both',
    iterationCount = 1,
    direction = 'normal',
  } = config;

  const durationValue = typeof dur === 'string' && dur in duration ? duration[dur as keyof typeof duration] : dur;
  const easingValue = typeof ease === 'string' && ease in easing ? easing[ease as keyof typeof easing] : ease;

  return `${name} ${durationValue} ${easingValue} ${delay} ${iterationCount} ${direction} ${fillMode}`;
}

/**
 * Common animation presets
 */
export const animations = {
  // Fade animations
  fadeIn: {
    keyframes: {
      '0%': { opacity: '0' },
      '100%': { opacity: '1' },
    },
    config: { duration: 'normal', easing: 'smooth' },
  },

  fadeOut: {
    keyframes: {
      '0%': { opacity: '1' },
      '100%': { opacity: '0' },
    },
    config: { duration: 'normal', easing: 'smooth' },
  },

  fadeInUp: {
    keyframes: {
      '0%': { opacity: '0', transform: 'translateY(20px)' },
      '100%': { opacity: '1', transform: 'translateY(0)' },
    },
    config: { duration: 'normal', easing: 'smooth' },
  },

  fadeInDown: {
    keyframes: {
      '0%': { opacity: '0', transform: 'translateY(-20px)' },
      '100%': { opacity: '1', transform: 'translateY(0)' },
    },
    config: { duration: 'normal', easing: 'smooth' },
  },

  // Scale animations
  scaleIn: {
    keyframes: {
      '0%': { opacity: '0', transform: 'scale(0.9)' },
      '100%': { opacity: '1', transform: 'scale(1)' },
    },
    config: { duration: 'fast', easing: 'snappy' },
  },

  scaleOut: {
    keyframes: {
      '0%': { opacity: '1', transform: 'scale(1)' },
      '100%': { opacity: '0', transform: 'scale(0.9)' },
    },
    config: { duration: 'fast', easing: 'smooth' },
  },

  // Slide animations
  slideInLeft: {
    keyframes: {
      '0%': { transform: 'translateX(-100%)' },
      '100%': { transform: 'translateX(0)' },
    },
    config: { duration: 'normal', easing: 'smooth' },
  },

  slideInRight: {
    keyframes: {
      '0%': { transform: 'translateX(100%)' },
      '100%': { transform: 'translateX(0)' },
    },
    config: { duration: 'normal', easing: 'smooth' },
  },

  slideOutLeft: {
    keyframes: {
      '0%': { transform: 'translateX(0)' },
      '100%': { transform: 'translateX(-100%)' },
    },
    config: { duration: 'normal', easing: 'smooth' },
  },

  slideOutRight: {
    keyframes: {
      '0%': { transform: 'translateX(0)' },
      '100%': { transform: 'translateX(100%)' },
    },
    config: { duration: 'normal', easing: 'smooth' },
  },

  // Bounce animations
  bounceIn: {
    keyframes: {
      '0%': { opacity: '0', transform: 'scale(0.3)' },
      '50%': { opacity: '1', transform: 'scale(1.05)' },
      '70%': { transform: 'scale(0.9)' },
      '100%': { opacity: '1', transform: 'scale(1)' },
    },
    config: { duration: 'slow', easing: 'bounce' },
  },

  // Pulse animation
  pulse: {
    keyframes: {
      '0%': { transform: 'scale(1)' },
      '50%': { transform: 'scale(1.05)' },
      '100%': { transform: 'scale(1)' },
    },
    config: { duration: 'slow', easing: 'smooth' },
  },

  // Spin animation
  spin: {
    keyframes: {
      '0%': { transform: 'rotate(0deg)' },
      '100%': { transform: 'rotate(360deg)' },
    },
    config: { duration: 'slower', easing: 'linear' },
  },

  // Shake animation
  shake: {
    keyframes: {
      '0%, 100%': { transform: 'translateX(0)' },
      '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-10px)' },
      '20%, 40%, 60%, 80%': { transform: 'translateX(10px)' },
    },
    config: { duration: 'slower', easing: 'smooth' },
  },

  // Fantasy-specific animations
  fantasyScoreUpdate: {
    keyframes: {
      '0%': { transform: 'scale(1)', color: 'inherit' },
      '50%': { transform: 'scale(1.2)', color: '#22c55e' },
      '100%': { transform: 'scale(1)', color: 'inherit' },
    },
    config: { duration: 'slow', easing: 'bounce' },
  },

  injuryAlert: {
    keyframes: {
      '0%': { backgroundColor: 'transparent' },
      '50%': { backgroundColor: '#fef2f2' },
      '100%': { backgroundColor: 'transparent' },
    },
    config: { duration: 'normal', easing: 'smooth', iterationCount: 3 },
  },

  tradeAccepted: {
    keyframes: {
      '0%': { transform: 'scale(1)', borderColor: 'transparent' },
      '25%': { transform: 'scale(1.02)', borderColor: '#22c55e' },
      '50%': { transform: 'scale(1.05)', borderColor: '#16a34a' },
      '100%': { transform: 'scale(1)', borderColor: '#22c55e' },
    },
    config: { duration: 'slow', easing: 'bounce' },
  },
} as const;

/**
 * Generate CSS keyframes string
 * 
 * @param name - Animation name
 * @param keyframes - Keyframe definitions
 * @returns CSS keyframes string
 */
export function generateKeyframes(
  name: string,
  keyframes: Record<string, Record<string, string>>
): string {
  const keyframeString = Object.entries(keyframes)
    .map(([percentage, styles]) => {
      const styleString = Object.entries(styles)
        .map(([property, value]) => `${property}: ${value};`)
        .join(' ');
      return `${percentage} { ${styleString} }`;
    })
    .join(' ');

  return `@keyframes ${name} { ${keyframeString} }`;
}

/**
 * Create a spring animation configuration
 * 
 * @param tension - Spring tension (higher = stiffer)
 * @param friction - Spring friction (higher = more damping)
 * @returns Spring animation configuration
 */
export function createSpring(tension: number = 170, friction: number = 26) {
  // Convert spring physics to CSS cubic-bezier
  const w = Math.sqrt(tension);
  const zeta = friction / (2 * Math.sqrt(tension));
  
  let x1, x2: number;
  
  if (zeta < 1) {
    // Underdamped
    const wd = w * Math.sqrt(1 - zeta * zeta);
    x1 = (-zeta * w + wd) / w;
    x2 = (-zeta * w - wd) / w;
  } else {
    // Overdamped or critically damped
    x1 = -w;
    x2 = -w;
  }
  
  // Normalize to 0-1 range for cubic-bezier
  const bezier1 = Math.min(Math.max((4 * x1) / (x1 * x1 - x1 + 1), 0), 1);
  const bezier2 = Math.min(Math.max((4 * x2) / (x2 * x2 - x2 + 1), 0), 1);
  
  return `cubic-bezier(${bezier1.toFixed(3)}, 0, ${bezier2.toFixed(3)}, 1)`;
}

/**
 * Animation utility class for chaining animations
 */
export class AnimationChain {
  private animations: Array<{
    element: HTMLElement;
    animation: string;
    duration: number;
  }> = [];

  /**
   * Add an animation to the chain
   * 
   * @param element - Element to animate
   * @param animationName - Animation name or keyframes
   * @param config - Animation configuration
   * @returns This instance for chaining
   */
  add(
    element: HTMLElement,
    animationName: string,
    config: AnimationConfig = {}
  ): this {
    const animationString = createAnimation(animationName, config);
    const durationMs = this.parseDuration(config.duration || 'normal');
    
    this.animations.push({
      element,
      animation: animationString,
      duration: durationMs,
    });

    return this;
  }

  /**
   * Play animations in sequence
   * 
   * @returns Promise that resolves when all animations complete
   */
  async playSequence(): Promise<void> {
    for (const { element, animation } of this.animations) {
      await this.playAnimation(element, animation);
    }
  }

  /**
   * Play animations in parallel
   * 
   * @returns Promise that resolves when all animations complete
   */
  async playParallel(): Promise<void> {
    const promises = this.animations.map(({ element, animation }) =>
      this.playAnimation(element, animation)
    );
    await Promise.all(promises);
  }

  /**
   * Play a single animation
   * 
   * @param element - Element to animate
   * @param animation - Animation string
   * @returns Promise that resolves when animation completes
   */
  private playAnimation(element: HTMLElement, animation: string): Promise<void> {
    return new Promise((resolve) => {
      element.style.animation = animation;
      
      const handleAnimationEnd = () => {
        element.removeEventListener('animationend', handleAnimationEnd);
        resolve();
      };
      
      element.addEventListener('animationend', handleAnimationEnd);
    });
  }

  /**
   * Parse duration string to milliseconds
   * 
   * @param dur - Duration string or key
   * @returns Duration in milliseconds
   */
  private parseDuration(dur: string): number {
    if (dur in duration) {
      const durationValue = duration[dur as keyof typeof duration];
      return parseInt(durationValue.replace('ms', ''));
    }
    
    if (dur.includes('ms')) {
      return parseInt(dur.replace('ms', ''));
    }
    
    if (dur.includes('s')) {
      return parseInt(dur.replace('s', '')) * 1000;
    }
    
    return 200; // Default fallback
  }
}

/**
 * Utility functions for reduced motion preference
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Get animation duration based on user preference
 * 
 * @param normalDuration - Normal animation duration
 * @param reducedDuration - Reduced animation duration (default: 0ms)
 * @returns Appropriate duration based on user preference
 */
export function getAccessibleDuration(
  normalDuration: string,
  reducedDuration: string = '0ms'
): string {
  return prefersReducedMotion() ? reducedDuration : normalDuration;
}
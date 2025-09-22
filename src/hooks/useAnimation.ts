import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

interface UseAnimationOptions {
  duration?: number;
  delay?: number;
  easing?: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';
  loop?: boolean;
  autoStart?: boolean;
}

interface AnimationControls {
  start: () => void;
  stop: () => void;
  reset: () => void;
  isAnimating: boolean;
  progress: number;
}

export function useAnimation({
  duration = 1000,
  delay = 0,
  easing = 'ease-out',
  loop = false,
  autoStart = true
}: UseAnimationOptions = {}): AnimationControls {
  const [isAnimating, setIsAnimating] = useState(false);
  const [progress, setProgress] = useState(0);
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>();

  const easingFunctions = useMemo(() => ({
    linear: (t: number) => t,
    ease: (t: number) => t * t * (3 - 2 * t),
    'ease-in': (t: number) => t * t,
    'ease-out': (t: number) => t * (2 - t),
    'ease-in-out': (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
  }), []);

  const animate = useCallback((timestamp: number) => {
    if (!startTimeRef.current) {
      startTimeRef.current = timestamp + delay;
    }

    const elapsed = timestamp - startTimeRef.current;
    const rawProgress = Math.min(elapsed / duration, 1);
    const easedProgress = easingFunctions[easing](rawProgress);

    setProgress(easedProgress);

    if (rawProgress < 1) {
      animationRef.current = requestAnimationFrame(animate);
    } else {
      setIsAnimating(false);
      startTimeRef.current = undefined;
      
      if (loop) {
        setTimeout(() => {
          setIsAnimating(true);
          setProgress(0);
          startTimeRef.current = undefined;
          animationRef.current = requestAnimationFrame(animate);
        }, 0);
      }
    }
  }, [duration, delay, easing, loop, easingFunctions]);

  const start = useCallback(() => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    setProgress(0);
    startTimeRef.current = undefined;
    animationRef.current = requestAnimationFrame(animate);
  }, [isAnimating, animate]);

  const stop = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    setIsAnimating(false);
  }, []);

  const reset = useCallback(() => {
    stop();
    setProgress(0);
    startTimeRef.current = undefined;
  }, [stop]);

  useEffect(() => {
    if (autoStart) {
      start();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [autoStart, start]);

  return {
    start,
    stop,
    reset,
    isAnimating,
    progress
  };
}

// Hook for intersection observer animations
export function useIntersectionAnimation(
  threshold = 0.1,
  triggerOnce = true
) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!hasTriggered || !triggerOnce) {
            setIsVisible(true);
            if (triggerOnce) {
              setHasTriggered(true);
            }
          }
        } else if (!triggerOnce) {
          setIsVisible(false);
        }
      },
      { threshold }
    );

    const element = elementRef.current;
    if (element) {
      observer.observe(element);
    }

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [threshold, triggerOnce, hasTriggered]);

  return { isVisible, elementRef };
}

// Hook for spring animations
export function useSpring(
  target: number,
  config: { tension?: number; friction?: number } = {}
) {
  const { tension = 120, friction = 14 } = config;
  const [value, setValue] = useState(0);
  const [velocity, setVelocity] = useState(0);
  const animationRef = useRef<number>();

  useEffect(() => {
    const animate = () => {
      setValue(currentValue => {
        const force = -tension * (currentValue - target);
        const damping = -friction * velocity;
        const acceleration = force + damping;
        const newVelocity = velocity + acceleration * 0.016; // ~60fps
        const newValue = currentValue + newVelocity * 0.016;

        setVelocity(newVelocity);

        // Stop animation if we're close enough and moving slowly
        if (Math.abs(newValue - target) < 0.01 && Math.abs(newVelocity) < 0.01) {
          setVelocity(0);
          return target;
        }

        animationRef.current = requestAnimationFrame(animate);
        return newValue;
      });
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [target, tension, friction, velocity]);

  return value;
}

// Hook for reduced motion preference
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
}
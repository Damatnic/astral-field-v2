import React, { useEffect, useRef, useState } from 'react';

export interface FadeInProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  distance?: number;
  once?: boolean;
  triggerOnce?: boolean;
  threshold?: number;
  className?: string;
}

export function FadeIn({
  children,
  delay = 0,
  duration = 600,
  direction = 'up',
  distance = 20,
  once = true,
  triggerOnce = true,
  threshold = 0.1,
  className = ''
}: FadeInProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!hasTriggered || !triggerOnce) {
            setTimeout(() => {
              setIsVisible(true);
              if (triggerOnce) {
                setHasTriggered(true);
              }
            }, delay);
          }
        } else if (!once && !triggerOnce) {
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
  }, [delay, once, triggerOnce, threshold, hasTriggered]);

  const getTransformClasses = () => {
    if (direction === 'none') return '';
    
    const directions = {
      up: `translateY(${distance}px)`,
      down: `translateY(-${distance}px)`,
      left: `translateX(${distance}px)`,
      right: `translateX(-${distance}px)`
    };

    return directions[direction];
  };

  const initialTransform = getTransformClasses();

  return (
    <div
      ref={elementRef}
      className={`transition-all ease-out ${className}`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateX(0) translateY(0)' : initialTransform,
        transitionDuration: `${duration}ms`,
        transitionDelay: isVisible ? `${delay}ms` : '0ms'
      }}
    >
      {children}
    </div>
  );
}
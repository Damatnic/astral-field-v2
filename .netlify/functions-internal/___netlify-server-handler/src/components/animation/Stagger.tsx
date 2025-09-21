import React, { Children, useEffect, useState } from 'react';

export interface StaggerProps {
  children: React.ReactNode;
  delay?: number;
  stagger?: number;
  duration?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'scale';
  distance?: number;
  className?: string;
}

export function Stagger({
  children,
  delay = 0,
  stagger = 100,
  duration = 400,
  direction = 'up',
  distance = 20,
  className = ''
}: StaggerProps) {
  const [visibleCount, setVisibleCount] = useState(0);
  const childrenArray = Children.toArray(children);

  useEffect(() => {
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        setVisibleCount(prev => {
          if (prev >= childrenArray.length) {
            clearInterval(interval);
            return prev;
          }
          return prev + 1;
        });
      }, stagger);

      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay, stagger, childrenArray.length]);

  return (
    <div className={className}>
      {childrenArray.map((child, index) => {
        const isVisible = index < visibleCount;
        
        return (
          <div
            key={index}
            className="transition-all ease-out"
            style={{
              transitionDuration: `${duration}ms`,
              transform: isVisible ? 'translateX(0) translateY(0) scale(1)' : (() => {
                switch (direction) {
                  case 'up':
                    return `translateY(${distance}px)`;
                  case 'down':
                    return `translateY(-${distance}px)`;
                  case 'left':
                    return `translateX(${distance}px)`;
                  case 'right':
                    return `translateX(-${distance}px)`;
                  case 'scale':
                    return 'scale(0.8)';
                  default:
                    return 'none';
                }
              })(),
              opacity: isVisible ? 1 : 0
            }}
          >
            {child}
          </div>
        );
      })}
    </div>
  );
}
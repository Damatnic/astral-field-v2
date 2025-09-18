import React, { useState, useEffect, useRef } from 'react';

export interface AnimatePresenceProps {
  children: React.ReactNode;
  show: boolean;
  enter?: string;
  enterFrom?: string;
  enterTo?: string;
  leave?: string;
  leaveFrom?: string;
  leaveTo?: string;
  duration?: number;
  delay?: number;
  onEnterComplete?: () => void;
  onLeaveComplete?: () => void;
  className?: string;
}

export function AnimatePresence({
  children,
  show,
  enter = 'transition-all ease-out',
  enterFrom = 'opacity-0 scale-95',
  enterTo = 'opacity-100 scale-100',
  leave = 'transition-all ease-in',
  leaveFrom = 'opacity-100 scale-100',
  leaveTo = 'opacity-0 scale-95',
  duration = 200,
  delay = 0,
  onEnterComplete,
  onLeaveComplete,
  className = ''
}: AnimatePresenceProps) {
  const [isVisible, setIsVisible] = useState(show);
  const [isAnimating, setIsAnimating] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (show && !isVisible) {
      // Entering
      setIsVisible(true);
      setIsAnimating(true);
      
      // Force a reflow to ensure the element is rendered before animation
      if (elementRef.current) {
        elementRef.current.offsetHeight;
      }
      
      timeoutRef.current = setTimeout(() => {
        setIsAnimating(false);
        onEnterComplete?.();
      }, duration + delay);
    } else if (!show && isVisible) {
      // Leaving
      setIsAnimating(true);
      
      timeoutRef.current = setTimeout(() => {
        setIsVisible(false);
        setIsAnimating(false);
        onLeaveComplete?.();
      }, duration + delay);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [show, isVisible, duration, delay, onEnterComplete, onLeaveComplete]);

  if (!isVisible) return null;

  const getAnimationClasses = () => {
    if (!isAnimating) {
      return show ? `${enter} ${enterTo}` : `${leave} ${leaveTo}`;
    }
    
    return show ? `${enter} ${enterFrom}` : `${leave} ${leaveFrom}`;
  };

  return (
    <div
      ref={elementRef}
      className={`${getAnimationClasses()} ${className}`}
      style={{ 
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`
      }}
    >
      {children}
    </div>
  );
}
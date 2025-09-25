'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface StatsCounterProps {
  end: number;
  start?: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  gradient?: boolean;
  delay?: number;
  decimals?: number;
}

export function StatsCounter({
  end,
  start = 0,
  duration = 2000,
  prefix = '',
  suffix = '',
  className,
  gradient = true,
  delay = 0,
  decimals = 0
}: StatsCounterProps) {
  const [count, setCount] = useState(start);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    if (delay > 0) {
      const delayTimer = setTimeout(() => {
        setHasStarted(true);
      }, delay);
      return () => clearTimeout(delayTimer);
    } else {
      setHasStarted(true);
    }
  }, [delay]);

  useEffect(() => {
    if (!hasStarted) return;

    const startTime = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      const currentCount = start + (end - start) * easeOutCubic;
      
      setCount(decimals > 0 ? Number(currentCount.toFixed(decimals)) : Math.floor(currentCount));
      
      if (progress === 1) clearInterval(timer);
    }, 16); // ~60fps
    
    return () => clearInterval(timer);
  }, [end, start, duration, hasStarted, decimals]);

  const formatNumber = (num: number) => {
    if (decimals > 0) {
      return num.toFixed(decimals);
    }
    return Math.floor(num).toLocaleString();
  };

  return (
    <span
      className={cn(
        'font-black tabular-nums',
        gradient && 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600',
        className
      )}
    >
      {prefix}{formatNumber(count)}{suffix}
    </span>
  );
}
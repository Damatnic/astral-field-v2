'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface AnimatedCardProps {
  children: React.ReactNode;
  className?: string;
  gradient?: 'purple' | 'pink' | 'blue' | 'green' | 'orange' | 'rainbow';
  hover?: 'lift' | 'glow' | 'rotate' | 'scale';
  animation?: 'float' | 'pulse' | 'bounce';
  delay?: number;
  glass?: boolean;
}

export function AnimatedCard({
  children,
  className,
  gradient = 'purple',
  hover = 'lift',
  animation,
  delay = 0,
  glass = false
}: AnimatedCardProps) {
  const gradientClasses = {
    purple: 'from-purple-500/20 to-pink-500/20',
    pink: 'from-pink-500/20 to-rose-500/20',
    blue: 'from-blue-500/20 to-indigo-500/20',
    green: 'from-green-500/20 to-emerald-500/20',
    orange: 'from-orange-500/20 to-yellow-500/20',
    rainbow: 'from-purple-500/20 via-pink-500/20 to-yellow-500/20'
  };

  const hoverClasses = {
    lift: 'hover:-translate-y-2 hover:shadow-2xl',
    glow: 'hover:shadow-[0_0_30px_rgba(147,51,234,0.6)]',
    rotate: 'hover:rotate-1',
    scale: 'hover:scale-105'
  };

  const animationClasses = {
    float: 'animate-float',
    pulse: 'animate-pulse',
    bounce: 'animate-bounce'
  };

  return (
    <div
      className={cn(
        'relative group overflow-hidden rounded-2xl transition-all duration-500',
        glass ? 'glass-light' : 'bg-white/10 backdrop-blur-md border border-white/20',
        `bg-gradient-to-br ${gradientClasses[gradient]}`,
        hoverClasses[hover],
        animation && animationClasses[animation],
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Animated gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
      
      {/* Bottom gradient border */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-yellow-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
    </div>
  );
}
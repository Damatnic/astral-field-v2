import React from 'react';

export interface PulseProps {
  children: React.ReactNode;
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'gray';
  size?: 'sm' | 'md' | 'lg';
  speed?: 'slow' | 'normal' | 'fast';
  intensity?: 'subtle' | 'normal' | 'strong';
  shape?: 'circle' | 'square' | 'rounded';
  className?: string;
}

export function Pulse({
  children,
  color = 'primary',
  size = 'md',
  speed = 'normal',
  intensity = 'normal',
  shape = 'circle',
  className = ''
}: PulseProps) {
  const colorClasses = {
    primary: 'bg-primary-500',
    success: 'bg-success-500',
    warning: 'bg-warning-500',
    danger: 'bg-danger-500',
    gray: 'bg-gray-500'
  };

  const sizeClasses = {
    sm: 'h-2 w-2',
    md: 'h-3 w-3',
    lg: 'h-4 w-4'
  };

  const speedClasses = {
    slow: 'animate-pulse-slow',
    normal: 'animate-pulse',
    fast: 'animate-ping'
  };

  const intensityClasses = {
    subtle: 'opacity-30',
    normal: 'opacity-50',
    strong: 'opacity-75'
  };

  const shapeClasses = {
    circle: 'rounded-full',
    square: 'rounded-none',
    rounded: 'rounded-md'
  };

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <div className="flex items-center gap-2">
        <div className="relative">
          <div className={`
            ${sizeClasses[size]}
            ${colorClasses[color]}
            ${shapeClasses[shape]}
            ${speedClasses[speed]}
          `} />
          <div className={`
            absolute inset-0
            ${sizeClasses[size]}
            ${colorClasses[color]}
            ${shapeClasses[shape]}
            ${speedClasses[speed]}
            ${intensityClasses[intensity]}
          `} style={{ animationDelay: '1s' }} />
        </div>
        {children}
      </div>
    </div>
  );
}
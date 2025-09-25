import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'danger' | 'info';
  position?: 'qb' | 'rb' | 'wr' | 'te' | 'k' | 'dst';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
  pulse?: boolean;
}

export function Badge({ 
  children, 
  className = '', 
  variant = 'default',
  position,
  size = 'md',
  dot = false,
  pulse = false
}: BadgeProps) {
  const baseClasses = [
    'inline-flex items-center gap-1 font-medium transition-colors',
    pulse && 'animate-pulse'
  ].filter(Boolean).join(' ');
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs rounded-md',
    md: 'px-2.5 py-0.5 text-xs rounded-lg',
    lg: 'px-3 py-1 text-sm rounded-lg'
  };

  const variantClasses = {
    default: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    secondary: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    outline: 'border border-gray-200 text-gray-700 bg-transparent dark:border-gray-700 dark:text-gray-300',
    success: 'bg-success-100 text-success-800 dark:bg-success-900 dark:text-success-200',
    warning: 'bg-warning-100 text-warning-800 dark:bg-warning-900 dark:text-warning-200',
    danger: 'bg-danger-100 text-danger-800 dark:bg-danger-900 dark:text-danger-200',
    info: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
  };

  const positionClasses = position ? {
    qb: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    rb: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    wr: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    te: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    k: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
    dst: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
  }[position] : null;

  const dotSize = {
    sm: 'h-1.5 w-1.5',
    md: 'h-2 w-2',
    lg: 'h-2.5 w-2.5'
  }[size];
  
  return (
    <span className={`${baseClasses} ${sizeClasses[size]} ${positionClasses || variantClasses[variant]} ${className}`}>
      {dot && (
        <span className={`${dotSize} rounded-full bg-current opacity-75`}></span>
      )}
      {children}
    </span>
  );
}
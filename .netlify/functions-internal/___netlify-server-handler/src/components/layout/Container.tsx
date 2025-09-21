import React from 'react';

export interface ContainerProps {
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  center?: boolean;
  className?: string;
}

export function Container({
  children,
  size = 'lg',
  padding = 'md',
  center = true,
  className = ''
}: ContainerProps) {
  const sizeClasses = {
    sm: 'max-w-2xl',        // 672px
    md: 'max-w-4xl',        // 896px
    lg: 'max-w-6xl',        // 1152px
    xl: 'max-w-7xl',        // 1280px
    full: 'max-w-full'
  };

  const paddingClasses = padding !== 'none' ? {
    sm: 'px-4 py-2',
    md: 'px-6 py-4',
    lg: 'px-8 py-6',
    xl: 'px-12 py-8'
  }[padding] : '';

  const centerClass = center ? 'mx-auto' : '';

  return (
    <div className={`${sizeClasses[size]} ${paddingClasses} ${centerClass} ${className}`}>
      {children}
    </div>
  );
}
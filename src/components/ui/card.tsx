'use client';

import React from 'react';
import { motion } from 'framer-motion';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'outlined' | 'glass' | 'cinematic' | 'gradient';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  hover?: boolean;
  interactive?: boolean;
  onClick?: () => void;
  glowEffect?: boolean;
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
}

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
}

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
}

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

interface CardDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ 
  children, 
  className = '', 
  variant = 'default',
  padding = 'md',
  hover = false,
  interactive = false,
  onClick,
  glowEffect = false
}: CardProps) {
  const baseClasses = [
    'rounded-2xl transition-all duration-300 relative overflow-hidden',
    interactive && 'cursor-pointer',
    hover && 'hover:shadow-2xl hover:-translate-y-1',
    onClick && 'cursor-pointer'
  ].filter(Boolean).join(' ');

  const variantClasses = {
    default: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm',
    elevated: 'bg-white dark:bg-gray-800 shadow-xl border-0',
    outlined: 'bg-transparent border-2 border-gray-200 dark:border-gray-700 shadow-none',
    glass: 'bg-white/5 backdrop-blur-md border border-white/10 hover:border-white/20',
    cinematic: 'bg-white/5 backdrop-blur-md border border-white/10 hover:border-white/20 shadow-lg hover:shadow-xl',
    gradient: 'bg-gradient-to-br from-blue-600/10 to-purple-600/10 backdrop-blur-md border border-white/10 hover:border-white/20'
  };

  const paddingClasses = padding !== 'none' ? {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-10'
  }[padding] : '';
  
  const MotionComponent = motion[onClick ? 'button' : 'div'];
  
  return (
    <MotionComponent 
      className={`${baseClasses} ${variantClasses[variant]} ${paddingClasses} ${className}`}
      onClick={onClick}
      whileHover={hover || interactive ? { y: -2, scale: 1.01 } : {}}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {/* Glow effect for cinematic cards */}
      {(glowEffect || variant === 'cinematic') && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-400/10 to-purple-400/10 opacity-0 hover:opacity-100 transition-opacity duration-300" />
      )}
      
      <div className="relative z-10">
        {children}
      </div>
    </MotionComponent>
  );
}

export function CardHeader({ 
  children, 
  className = '', 
  padding = 'md' 
}: CardHeaderProps) {
  const paddingClasses = {
    sm: 'p-4 pb-2',
    md: 'p-6 pb-4',
    lg: 'p-8 pb-6'
  };

  return (
    <div className={`${paddingClasses[padding]} ${className}`}>
      {children}
    </div>
  );
}

export function CardContent({ 
  children, 
  className = '', 
  padding = 'md' 
}: CardContentProps) {
  const paddingClasses = {
    sm: 'px-4 pb-4',
    md: 'px-6 pb-6',
    lg: 'px-8 pb-8'
  };

  return (
    <div className={`${paddingClasses[padding]} ${className}`}>
      {children}
    </div>
  );
}

export function CardFooter({ 
  children, 
  className = '', 
  padding = 'md' 
}: CardFooterProps) {
  const paddingClasses = {
    sm: 'p-4 pt-2 border-t border-gray-100 dark:border-gray-700',
    md: 'p-6 pt-4 border-t border-gray-100 dark:border-gray-700',
    lg: 'p-8 pt-6 border-t border-gray-100 dark:border-gray-700'
  };

  return (
    <div className={`${paddingClasses[padding]} ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({ 
  children, 
  className = '', 
  as: Component = 'h3' 
}: CardTitleProps) {
  const titleClasses = {
    h1: 'text-3xl font-bold',
    h2: 'text-2xl font-bold',
    h3: 'text-xl font-semibold',
    h4: 'text-lg font-semibold',
    h5: 'text-base font-semibold',
    h6: 'text-sm font-semibold'
  };

  return (
    <Component className={`${titleClasses[Component]} text-white leading-tight ${className}`}>
      {children}
    </Component>
  );
}

export function CardDescription({ children, className = '' }: CardDescriptionProps) {
  return (
    <p className={`text-sm text-gray-400 leading-relaxed ${className}`}>
      {children}
    </p>
  );
}
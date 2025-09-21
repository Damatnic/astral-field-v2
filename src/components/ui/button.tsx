'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'warning' | 'gradient' | 'glass';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  position?: 'qb' | 'rb' | 'wr' | 'te' | 'k' | 'dst';
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit' | 'reset';
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  glowEffect?: boolean;
}

export function Button({ 
  children, 
  className = '', 
  variant = 'primary',
  size = 'md',
  position,
  onClick,
  disabled = false,
  loading = false,
  type = 'button',
  fullWidth = false,
  leftIcon,
  rightIcon,
  glowEffect = false,
  ...props
}: ButtonProps) {
  const baseClasses = [
    'inline-flex items-center justify-center gap-2',
    'font-medium transition-all duration-300',
    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent',
    'disabled:opacity-60 disabled:cursor-not-allowed disabled:pointer-events-none',
    'relative overflow-hidden',
    'active:scale-95',
    fullWidth && 'w-full',
    glowEffect && 'shadow-lg hover:shadow-xl'
  ].filter(Boolean).join(' ');
  
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 shadow-lg hover:shadow-xl',
    secondary: 'bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/30 focus:ring-white/50 backdrop-blur-md',
    outline: 'border-2 border-blue-500 text-blue-400 bg-transparent hover:bg-blue-500/10 focus:ring-blue-500',
    ghost: 'text-white/80 bg-transparent hover:bg-white/10 focus:ring-white/50',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-lg hover:shadow-xl',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 shadow-lg hover:shadow-xl',
    warning: 'bg-yellow-600 text-white hover:bg-yellow-700 focus:ring-yellow-500 shadow-lg hover:shadow-xl',
    gradient: 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white focus:ring-blue-500 shadow-lg hover:shadow-xl',
    glass: 'bg-white/5 backdrop-blur-md border border-white/10 hover:border-white/20 text-white hover:bg-white/10 focus:ring-white/50'
  };

  const positionClasses = position ? {
    qb: 'bg-position-qb text-white hover:opacity-90 focus:ring-purple-500',
    rb: 'bg-position-rb text-white hover:opacity-90 focus:ring-green-500',
    wr: 'bg-position-wr text-white hover:opacity-90 focus:ring-blue-500',
    te: 'bg-position-te text-white hover:opacity-90 focus:ring-amber-500',
    k: 'bg-position-k text-white hover:opacity-90 focus:ring-pink-500',
    dst: 'bg-position-dst text-white hover:opacity-90 focus:ring-gray-500'
  }[position] : '';
  
  const sizeClasses = {
    xs: 'h-7 px-2 text-xs rounded-md',
    sm: 'h-8 px-3 text-sm rounded-md',
    md: 'h-10 px-4 text-sm rounded-lg',
    lg: 'h-12 px-6 text-base rounded-lg',
    xl: 'h-14 px-8 text-lg rounded-xl'
  };

  const iconSize = {
    xs: 'h-3 w-3',
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
    xl: 'h-6 w-6'
  }[size];
  
  return (
    <motion.button
      type={type}
      className={`${baseClasses} ${positionClasses || variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      onClick={onClick}
      disabled={disabled || loading}
      whileHover={{ scale: disabled || loading ? 1 : 1.02 }}
      whileTap={{ scale: disabled || loading ? 1 : 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      {...props}
    >
      {/* Glow effect overlay */}
      {glowEffect && !disabled && (
        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-400/20 to-purple-400/20 opacity-0 hover:opacity-100 transition-opacity duration-300" />
      )}
      
      {loading && (
        <Loader2 className={`${iconSize} animate-spin`} />
      )}
      {!loading && leftIcon && (
        <span className={iconSize}>{leftIcon}</span>
      )}
      <span className={`relative z-10 ${loading ? 'opacity-70' : ''}`}>{children}</span>
      {!loading && rightIcon && (
        <span className={iconSize}>{rightIcon}</span>
      )}
    </motion.button>
  );
}
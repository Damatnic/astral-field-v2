'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface GlowButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  glow?: boolean;
  pulse?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

export function GlowButton({
  children,
  onClick,
  className,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  glow = true,
  pulse = false,
  type = 'button'
}: GlowButtonProps) {
  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-8 py-4 text-base',
    lg: 'px-10 py-5 text-lg'
  };

  const variantClasses = {
    primary: 'bg-gradient-to-r from-purple-600 via-pink-600 to-yellow-600 text-white shadow-2xl',
    secondary: 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-xl',
    outline: 'bg-white/10 backdrop-blur-md text-white border border-white/20 hover:bg-white/20'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'relative group overflow-hidden rounded-xl font-bold transition-all duration-500',
        'hover:scale-105 hover:-translate-y-1',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:translate-y-0',
        sizeClasses[size],
        variantClasses[variant],
        glow && variant === 'primary' && 'hover:shadow-purple-500/50',
        glow && variant === 'secondary' && 'hover:shadow-blue-500/50',
        pulse && 'animate-pulse',
        className
      )}
    >
      {/* Content */}
      <span className="relative z-10 flex items-center justify-center gap-2">
        {loading && <Loader2 className="w-5 h-5 animate-spin" />}
        {children}
      </span>
      
      {/* Primary button effects */}
      {variant === 'primary' && (
        <>
          {/* Hover glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-yellow-600 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500" />
          
          {/* Animated gradient background */}
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-600 via-pink-600 to-purple-600 animate-gradient-shift" />
          
          {/* Shimmer effect */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          </div>
        </>
      )}
      
      {/* Secondary button effects */}
      {variant === 'secondary' && (
        <>
          <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-purple-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          </div>
        </>
      )}
    </button>
  );
}
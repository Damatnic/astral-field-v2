'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
  variant?: 'quantum' | 'cosmic' | 'nebula' | 'ghost' | 'hologram' | 'glass' | 'outline' | 'void' | 'primary' | 'secondary' | 'danger' | 'success' | 'warning';
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
  pulseEffect?: boolean;
  shimmerEffect?: boolean;
}

export function Button({ 
  children, 
  className = '', 
  variant = 'quantum',
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
  pulseEffect = false,
  shimmerEffect = false,
  ...props
}: ButtonProps) {
  const baseClasses = [
    'inline-flex items-center justify-center gap-2',
    'font-medium transition-all duration-400 ease-out',
    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent',
    'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
    'relative overflow-hidden transform-gpu',
    'hover:scale-105 active:scale-95',
    'rounded-xl border backdrop-blur-md',
    fullWidth && 'w-full',
    glowEffect && 'animate-cosmic-glow',
    pulseEffect && 'animate-nebula-pulse',
    shimmerEffect && 'animate-quantum-shimmer'
  ].filter(Boolean).join(' ');
  
  const variantClasses = {
    quantum: 'gradient-cosmic text-white hover:shadow-quantum focus:ring-astral-primary-500 border-transparent',
    cosmic: 'bg-astral-cosmic-600 hover:bg-astral-cosmic-700 text-white focus:ring-astral-cosmic-500 border-astral-cosmic-500/20 shadow-cosmic',
    nebula: 'bg-astral-nebula-600 hover:bg-astral-nebula-700 text-white focus:ring-astral-nebula-500 border-astral-nebula-500/20 shadow-nebula',
    ghost: 'bg-transparent hover:glass-cosmic text-astral-light-shadow hover:text-white border-transparent focus:ring-astral-cosmic-500',
    hologram: 'holo-border glass-starlight text-white hover:glass-cosmic focus:ring-astral-cosmic-500 animate-hologram',
    glass: 'glass-cosmic text-white hover:glass-quantum border-astral-primary-500/20 focus:ring-astral-primary-500',
    outline: 'border-2 border-astral-cosmic-500 text-astral-cosmic-400 bg-transparent hover:glass-cosmic hover:text-white focus:ring-astral-cosmic-500',
    void: 'bg-astral-dark-void hover:bg-astral-dark-space text-astral-light-shadow hover:text-white border-astral-dark-asteroid focus:ring-astral-light-shadow shadow-void',
    // Legacy variants mapped to new cosmic system
    primary: 'gradient-cosmic text-white hover:shadow-quantum focus:ring-astral-primary-500 border-transparent',
    secondary: 'glass-cosmic text-white hover:glass-quantum border-astral-primary-500/20 focus:ring-astral-primary-500',
    danger: 'bg-astral-supernova-600 hover:bg-astral-supernova-700 text-white focus:ring-astral-supernova-500 border-astral-supernova-500/20 shadow-nebula',
    success: 'bg-astral-gold-600 hover:bg-astral-gold-700 text-white focus:ring-astral-gold-500 border-astral-gold-500/20 shadow-quantum',
    warning: 'bg-astral-solar-600 hover:bg-astral-solar-700 text-white focus:ring-astral-solar-500 border-astral-solar-500/20 shadow-nebula'
  };

  const positionClasses = position ? {
    qb: 'bg-position-qb text-white hover:shadow-cosmic focus:ring-astral-cosmic-500 border-astral-cosmic-500/20',
    rb: 'bg-position-rb text-white hover:shadow-quantum focus:ring-astral-gold-500 border-astral-gold-500/20',
    wr: 'bg-position-wr text-white hover:shadow-quantum focus:ring-astral-primary-500 border-astral-primary-500/20',
    te: 'bg-position-te text-white hover:shadow-nebula focus:ring-astral-solar-500 border-astral-solar-500/20',
    k: 'bg-position-k text-white hover:shadow-nebula focus:ring-astral-nebula-500 border-astral-nebula-500/20',
    dst: 'bg-position-dst text-white hover:shadow-void focus:ring-astral-light-shadow border-astral-dark-asteroid'
  }[position] : '';
  
  const sizeClasses = {
    xs: 'h-8 px-3 text-xs rounded-lg font-semibold',
    sm: 'h-9 px-4 text-sm rounded-lg font-semibold',
    md: 'h-11 px-6 text-sm rounded-xl font-bold',
    lg: 'h-13 px-8 text-base rounded-xl font-bold',
    xl: 'h-16 px-10 text-lg rounded-2xl font-bold'
  };

  const iconSize = {
    xs: 'h-3 w-3',
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
    xl: 'h-6 w-6'
  }[size];
  
  const { onDrag, onDragEnd, onDragStart, ...safeProps } = props as any;
  
  return (
    <motion.button
      type={type}
      className={`${baseClasses} ${positionClasses || variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      onClick={onClick}
      disabled={disabled || loading}
      whileHover={{ 
        scale: disabled ? 1 : 1.05,
        y: disabled ? 0 : -2
      }}
      whileTap={{ 
        scale: disabled ? 1 : 0.95 
      }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 15
      }}
      {...safeProps}
    >
      {/* Cosmic glow overlay */}
      {glowEffect && !disabled && (
        <motion.div 
          className="absolute inset-0 rounded-xl gradient-cosmic opacity-0 blur-sm"
          animate={{
            opacity: [0, 0.3, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      )}
      
      {/* Shimmer effect overlay */}
      {shimmerEffect && !disabled && (
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-quantum-shimmer" />
      )}
      
      {/* Loading state with cosmic spinner */}
      {loading && (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "linear"
          }}
        >
          <Loader2 className={`${iconSize} text-astral-light-star`} />
        </motion.div>
      )}
      
      {/* Left icon with subtle animation */}
      {!loading && leftIcon && (
        <motion.span 
          className={iconSize}
          whileHover={{ x: -2 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          {leftIcon}
        </motion.span>
      )}
      
      {/* Button content with cosmic typography */}
      <span className={`relative z-10 font-semibold tracking-wide ${loading ? 'opacity-70' : ''}`}>
        {children}
      </span>
      
      {/* Right icon with subtle animation */}
      {!loading && rightIcon && (
        <motion.span 
          className={iconSize}
          whileHover={{ x: 2 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          {rightIcon}
        </motion.span>
      )}
      
      {/* Holographic edge effect */}
      {variant === 'hologram' && (
        <div className="absolute inset-0 rounded-xl border border-astral-cosmic-400/50 opacity-0 hover:opacity-100 transition-opacity duration-300" />
      )}
    </motion.button>
  );
}
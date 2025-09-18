import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'warning';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  position?: 'qb' | 'rb' | 'wr' | 'te' | 'k' | 'dst';
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit' | 'reset';
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
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
  rightIcon
}: ButtonProps) {
  const baseClasses = [
    'inline-flex items-center justify-center gap-2',
    'font-medium transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'disabled:opacity-60 disabled:cursor-not-allowed disabled:pointer-events-none',
    'relative overflow-hidden',
    fullWidth && 'w-full'
  ].filter(Boolean).join(' ');
  
  const variantClasses = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 shadow-sm hover:shadow-md',
    secondary: 'bg-secondary-600 text-white hover:bg-secondary-700 focus:ring-secondary-500 shadow-sm hover:shadow-md',
    outline: 'border-2 border-primary-600 text-primary-600 bg-transparent hover:bg-primary-50 focus:ring-primary-500',
    ghost: 'text-gray-700 bg-transparent hover:bg-gray-100 focus:ring-gray-500',
    danger: 'bg-danger-600 text-white hover:bg-danger-700 focus:ring-danger-500 shadow-sm hover:shadow-md',
    success: 'bg-success-600 text-white hover:bg-success-700 focus:ring-success-500 shadow-sm hover:shadow-md',
    warning: 'bg-warning-600 text-white hover:bg-warning-700 focus:ring-warning-500 shadow-sm hover:shadow-md'
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
    <button
      type={type}
      className={`${baseClasses} ${positionClasses || variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading && (
        <Loader2 className={`${iconSize} animate-spin`} />
      )}
      {!loading && leftIcon && (
        <span className={iconSize}>{leftIcon}</span>
      )}
      <span className={loading ? 'opacity-70' : ''}>{children}</span>
      {!loading && rightIcon && (
        <span className={iconSize}>{rightIcon}</span>
      )}
    </button>
  );
}
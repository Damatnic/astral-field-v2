'use client';

import React from 'react';
import { motion } from 'framer-motion';

export interface MobileOptimizedLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  showHeader?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
}

export interface MobilePageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  backButton?: boolean;
  className?: string;
}

export interface MobileCardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
}

export interface TouchFriendlyButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabled?: boolean;
  className?: string;
}

// Mobile-optimized page layout with touch-friendly spacing
export function MobileOptimizedLayout({
  children,
  title,
  description,
  actions,
  showHeader = true,
  padding = 'md',
  className = ''
}: MobileOptimizedLayoutProps) {
  const paddingClasses = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  };

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 ${className}`}>
      {/* Mobile Header */}
      {showHeader && title && (
        <MobilePageHeader
          title={title}
          description={description}
          actions={actions}
        />
      )}

      {/* Main Content */}
      <main className={`${paddingClasses[padding]} pb-safe`}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}

// Mobile-optimized header with proper spacing and typography
export function MobilePageHeader({
  title,
  description,
  actions,
  className = ''
}: MobilePageHeaderProps) {
  return (
    <header className={`bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="px-4 py-4 sm:px-6">
        <div className="flex items-center justify-between min-h-[60px]">
          <div className="flex-1 min-w-0 pr-4">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">
              {title}
            </h1>
            {description && (
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                {description}
              </p>
            )}
          </div>
          
          {actions && (
            <div className="flex-shrink-0 flex items-center space-x-2">
              {actions}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

// Mobile-optimized card with proper touch targets
export function MobileCard({
  children,
  title,
  subtitle,
  action,
  padding = 'md',
  className = ''
}: MobileCardProps) {
  const paddingClasses = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`
        bg-white dark:bg-gray-800 
        rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 
        ${paddingClasses[padding]}
        ${className}
      `}
    >
      {(title || subtitle || action) && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1 min-w-0">
            {title && (
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                {subtitle}
              </p>
            )}
          </div>
          {action && (
            <div className="flex-shrink-0 ml-4">
              {action}
            </div>
          )}
        </div>
      )}
      {children}
    </motion.div>
  );
}

// Touch-friendly button with proper sizing and feedback
export function TouchFriendlyButton({
  children,
  onClick,
  href,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  className = ''
}: TouchFriendlyButtonProps) {
  const baseClasses = `
    inline-flex items-center justify-center font-medium rounded-xl 
    transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
    active:scale-95 select-none
  `;

  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 shadow-lg hover:shadow-xl',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white focus:ring-gray-500 shadow-md hover:shadow-lg',
    outline: 'border-2 border-gray-300 hover:border-gray-400 text-gray-700 hover:bg-gray-50 focus:ring-gray-500',
    ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-gray-500'
  };

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm min-h-[40px]',
    md: 'px-6 py-3 text-base min-h-[48px]',
    lg: 'px-8 py-4 text-lg min-h-[56px]'
  };

  const widthClasses = fullWidth ? 'w-full' : '';

  const buttonClasses = `
    ${baseClasses}
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${widthClasses}
    ${className}
  `;

  const buttonContent = (
    <motion.span
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="flex items-center justify-center space-x-2"
    >
      {children}
    </motion.span>
  );

  if (href) {
    return (
      <a
        href={href}
        className={buttonClasses}
        {...(disabled && { 'aria-disabled': true })}
      >
        {buttonContent}
      </a>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={buttonClasses}
    >
      {buttonContent}
    </button>
  );
}

// Mobile-optimized grid system
export function MobileGrid({
  children,
  columns = 1,
  gap = 'md',
  className = ''
}: {
  children: React.ReactNode;
  columns?: 1 | 2 | 3;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
  };

  const gapClasses = {
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6'
  };

  return (
    <div className={`grid ${gridClasses[columns]} ${gapClasses[gap]} ${className}`}>
      {children}
    </div>
  );
}

// Mobile-optimized list with proper touch targets
export function MobileList({
  children,
  className = ''
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-3 ${className}`}>
      {children}
    </div>
  );
}

export function MobileListItem({
  children,
  onClick,
  href,
  className = ''
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  className?: string;
}) {
  const baseClasses = `
    flex items-center p-4 bg-white dark:bg-gray-800 
    rounded-xl border border-gray-200 dark:border-gray-700
    transition-all duration-200 min-h-[60px]
    ${className}
  `;

  const interactiveClasses = onClick || href ? 
    'hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-100 dark:active:bg-gray-600 cursor-pointer' : 
    '';

  const itemContent = (
    <motion.div
      whileHover={onClick || href ? { scale: 1.01 } : {}}
      whileTap={onClick || href ? { scale: 0.99 } : {}}
      className={`${baseClasses} ${interactiveClasses}`}
    >
      {children}
    </motion.div>
  );

  if (href) {
    return (
      <a href={href}>
        {itemContent}
      </a>
    );
  }

  if (onClick) {
    return (
      <button onClick={onClick} className="w-full text-left">
        {itemContent}
      </button>
    );
  }

  return itemContent;
}
import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'outlined' | 'glass';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  hover?: boolean;
  interactive?: boolean;
  onClick?: () => void;
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
  onClick
}: CardProps) {
  const baseClasses = [
    'rounded-xl transition-all duration-200',
    interactive && 'cursor-pointer',
    hover && 'hover:shadow-lg hover:-translate-y-0.5',
    onClick && 'cursor-pointer'
  ].filter(Boolean).join(' ');

  const variantClasses = {
    default: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm',
    elevated: 'bg-white dark:bg-gray-800 shadow-lg border-0',
    outlined: 'bg-transparent border-2 border-gray-200 dark:border-gray-700 shadow-none',
    glass: 'glass-effect backdrop-blur-md'
  };

  const paddingClasses = padding !== 'none' ? {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-10'
  }[padding] : '';
  
  const Component = onClick ? 'button' : 'div';
  
  return (
    <Component 
      className={`${baseClasses} ${variantClasses[variant]} ${paddingClasses} ${className}`}
      onClick={onClick}
    >
      {children}
    </Component>
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
    <Component className={`${titleClasses[Component]} text-gray-900 dark:text-gray-100 leading-tight ${className}`}>
      {children}
    </Component>
  );
}

export function CardDescription({ children, className = '' }: CardDescriptionProps) {
  return (
    <p className={`text-sm text-gray-600 dark:text-gray-400 leading-relaxed ${className}`}>
      {children}
    </p>
  );
}
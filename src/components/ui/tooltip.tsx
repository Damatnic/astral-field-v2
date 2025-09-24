"use client";

import React from 'react';

interface TooltipProps {
  children: React.ReactNode;
}

interface TooltipContentProps {
  children: React.ReactNode;
  className?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
}

interface TooltipTriggerProps {
  children: React.ReactNode;
  className?: string;
  asChild?: boolean;
}

export const TooltipProvider: React.FC<TooltipProps> = ({ children }) => {
  return <>{children}</>;
};

export const Tooltip: React.FC<TooltipProps> = ({ children }) => {
  return <div className="relative inline-block">{children}</div>;
};

export const TooltipTrigger: React.FC<TooltipTriggerProps> = ({ children, className, asChild }) => {
  if (asChild) {
    return <>{children}</>;
  }
  return <div className={className}>{children}</div>;
};

export const TooltipContent: React.FC<TooltipContentProps> = ({ children, className, side = 'top' }) => {
  const sideClasses = {
    top: '-top-2 -translate-y-full left-1/2 -translate-x-1/2',
    bottom: '-bottom-2 translate-y-full left-1/2 -translate-x-1/2',
    left: 'top-1/2 -translate-y-1/2 -left-2 -translate-x-full',
    right: 'top-1/2 -translate-y-1/2 -right-2 translate-x-full'
  };

  return (
    <div 
      className={`absolute z-50 px-2 py-1 text-sm text-white bg-gray-900 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity ${sideClasses[side]} ${className || ''}`}
    >
      {children}
    </div>
  );
};
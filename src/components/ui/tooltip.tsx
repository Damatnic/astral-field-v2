"use client";

import React from 'react';

interface TooltipProps {
  children: React.ReactNode;
}

interface TooltipContentProps {
  children: React.ReactNode;
  className?: string;
}

interface TooltipTriggerProps {
  children: React.ReactNode;
  className?: string;
}

export const TooltipProvider: React.FC<TooltipProps> = ({ children }) => {
  return <>{children}</>;
};

export const Tooltip: React.FC<TooltipProps> = ({ children }) => {
  return <div className="relative inline-block">{children}</div>;
};

export const TooltipTrigger: React.FC<TooltipTriggerProps> = ({ children, className }) => {
  return <div className={className}>{children}</div>;
};

export const TooltipContent: React.FC<TooltipContentProps> = ({ children, className }) => {
  return (
    <div 
      className={`absolute z-50 px-2 py-1 text-sm text-white bg-gray-900 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity ${className || ''}`}
    >
      {children}
    </div>
  );
};
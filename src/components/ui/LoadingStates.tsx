'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, Zap, Trophy, Users, BarChart3 } from 'lucide-react';

// Generic loading spinner
export function LoadingSpinner({ size = 'md', className = '' }: { 
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  };

  return (
    <Loader2 className={`animate-spin ${sizeClasses[size]} ${className}`} />
  );
}

// Full page loading with fantasy football theme
export function PageLoadingState({ 
  title = 'Loading AstralField',
  subtitle = 'Preparing your fantasy football experience...',
  icon: Icon = Trophy 
}: {
  title?: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center max-w-md mx-auto p-8"
      >
        {/* Animated Logo */}
        <motion.div
          initial={{ rotate: 0 }}
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="h-16 w-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg mx-auto mb-6"
        >
          <span className="text-white font-bold text-xl">🏈</span>
        </motion.div>

        {/* Loading Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <div className="p-4 bg-white rounded-xl shadow-sm border inline-block">
            <Icon className="h-8 w-8 text-blue-600" />
          </div>
        </motion.div>

        {/* Loading Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
          <p className="text-blue-600 mb-6">{subtitle}</p>
          
          {/* Loading Bar */}
          <div className="w-full bg-gray-200 rounded-full h-1 mb-4">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ duration: 2, repeat: Infinity }}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 h-1 rounded-full"
            />
          </div>
          
          <div className="text-sm text-gray-500">
            Loading your league data...
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

// Card loading skeleton
export function CardSkeleton({ count = 1 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="bg-white rounded-xl p-6 shadow-sm border animate-pulse">
          <div className="flex items-center space-x-4 mb-4">
            <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
            <div className="h-3 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      ))}
    </>
  );
}

// Table loading skeleton
export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-6 py-4 border-b">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: cols }).map((_, index) => (
            <div key={index} className="h-4 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="px-6 py-4 border-b border-gray-100">
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {Array.from({ length: cols }).map((_, colIndex) => (
              <div key={colIndex} className="h-4 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Stats grid loading skeleton
export function StatsGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="bg-white rounded-xl p-6 shadow-sm border animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="h-10 w-10 bg-gray-200 rounded-lg"></div>
            <div className="h-6 w-12 bg-gray-200 rounded-full"></div>
          </div>
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Player card loading skeleton
export function PlayerCardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="bg-white rounded-xl p-4 shadow-sm border animate-pulse">
          <div className="flex items-center space-x-3 mb-3">
            <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
            <div className="h-6 w-12 bg-gray-200 rounded-full"></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center space-y-1">
              <div className="h-6 bg-gray-200 rounded"></div>
              <div className="h-3 bg-gray-200 rounded"></div>
            </div>
            <div className="text-center space-y-1">
              <div className="h-6 bg-gray-200 rounded"></div>
              <div className="h-3 bg-gray-200 rounded"></div>
            </div>
            <div className="text-center space-y-1">
              <div className="h-6 bg-gray-200 rounded"></div>
              <div className="h-3 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

// Loading states for specific page types
export const LoadingStates = {
  Dashboard: () => (
    <PageLoadingState 
      title="Loading Dashboard"
      subtitle="Fetching your latest league updates..."
      icon={BarChart3}
    />
  ),
  
  Players: () => (
    <PageLoadingState 
      title="Loading Players"
      subtitle="Gathering player data and statistics..."
      icon={Users}
    />
  ),
  
  Analytics: () => (
    <PageLoadingState 
      title="Crunching Numbers"
      subtitle="Analyzing your fantasy football performance..."
      icon={BarChart3}
    />
  ),
  
  Trade: () => (
    <PageLoadingState 
      title="Loading Trade Center"
      subtitle="Preparing trade analysis tools..."
      icon={Zap}
    />
  ),
  
  Draft: () => (
    <PageLoadingState 
      title="Entering Draft Room"
      subtitle="Setting up your draft environment..."
      icon={Trophy}
    />
  )
};

// Error state component
export function ErrorState({ 
  title = 'Something went wrong',
  message = 'We encountered an error while loading this content.',
  onRetry,
  showRetry = true 
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  showRetry?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-12"
    >
      <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          ⚠️
        </motion.div>
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">{message}</p>
      
      {showRetry && onRetry && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onRetry}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </motion.button>
      )}
    </motion.div>
  );
}

// Empty state component
export function EmptyState({ 
  title = 'No data available',
  message = 'There's nothing to show here yet.',
  icon: Icon = Users,
  action
}: {
  title?: string;
  message?: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-12"
    >
      <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Icon className="h-8 w-8 text-gray-400" />
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">{message}</p>
      
      {action && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={action.onClick}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {action.label}
        </motion.button>
      )}
    </motion.div>
  );
}
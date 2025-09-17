'use client';

import React from 'react';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: boolean;
  animate?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  width,
  height,
  rounded = false,
  animate = true,
}) => {
  const baseClasses = `bg-gray-200 dark:bg-gray-700 ${rounded ? 'rounded-full' : 'rounded'}`;
  const animationClasses = animate ? 'animate-pulse' : '';
  
  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={`${baseClasses} ${animationClasses} ${className}`}
      style={style}
    />
  );
};

// Pre-built skeleton components for common use cases
export const PlayerCardSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow border animate-pulse">
    <div className="flex items-center space-x-4">
      <Skeleton width={48} height={48} rounded />
      <div className="flex-1 space-y-2">
        <Skeleton height={16} width="60%" />
        <Skeleton height={14} width="40%" />
      </div>
      <div className="space-y-2">
        <Skeleton height={16} width={60} />
        <Skeleton height={14} width={40} />
      </div>
    </div>
  </div>
);

export const LineupSlotSkeleton: React.FC = () => (
  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border animate-pulse">
    <div className="flex items-center justify-between mb-2">
      <Skeleton height={14} width={40} />
      <Skeleton height={12} width={30} />
    </div>
    <div className="flex items-center space-x-3">
      <Skeleton width={40} height={40} rounded />
      <div className="flex-1 space-y-1">
        <Skeleton height={16} width="70%" />
        <Skeleton height={12} width="50%" />
      </div>
      <Skeleton height={20} width={50} />
    </div>
  </div>
);

export const ScoreboardSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow animate-pulse">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center space-x-3">
        <Skeleton width={32} height={32} rounded />
        <Skeleton height={18} width={120} />
      </div>
      <Skeleton height={24} width={60} />
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Skeleton height={14} width="80%" />
        <Skeleton height={12} width="60%" />
      </div>
      <div className="space-y-2">
        <Skeleton height={14} width="80%" />
        <Skeleton height={12} width="60%" />
      </div>
    </div>
  </div>
);

export const ActivityFeedSkeleton: React.FC = () => (
  <div className="space-y-4">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow animate-pulse">
        <div className="flex items-start space-x-3">
          <Skeleton width={32} height={32} rounded />
          <div className="flex-1 space-y-2">
            <div className="flex items-center space-x-2">
              <Skeleton height={14} width={100} />
              <Skeleton height={12} width={60} />
            </div>
            <Skeleton height={16} width="90%" />
            <Skeleton height={12} width="40%" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

export const DraftBoardSkeleton: React.FC = () => (
  <div className="space-y-4">
    <div className="grid grid-cols-10 gap-2 mb-4">
      {[...Array(10)].map((_, i) => (
        <div key={i} className="text-center">
          <Skeleton height={16} width="100%" className="mb-2" />
          <Skeleton width={32} height={32} rounded className="mx-auto" />
        </div>
      ))}
    </div>
    <div className="space-y-2">
      {[...Array(15)].map((_, round) => (
        <div key={round} className="grid grid-cols-10 gap-2">
          {[...Array(10)].map((_, pick) => (
            <div key={pick} className="aspect-square">
              <Skeleton height="100%" width="100%" />
            </div>
          ))}
        </div>
      ))}
    </div>
  </div>
);
/**
 * Mobile-Optimized Components for Astral Field Fantasy Football
 * Features: Touch optimization, gesture support, adaptive layouts, and performance optimization for mobile
 */

'use client';

import React, { useState, useCallback, useMemo, memo, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Touch gesture detection hook
function useTouch() {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return;

    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    const isLeftSwipe = distanceX > minSwipeDistance;
    const isRightSwipe = distanceX < -minSwipeDistance;
    const isUpSwipe = distanceY > minSwipeDistance;
    const isDownSwipe = distanceY < -minSwipeDistance;

    return { isLeftSwipe, isRightSwipe, isUpSwipe, isDownSwipe };
  }, [touchStart, touchEnd, minSwipeDistance]);

  return { onTouchStart, onTouchMove, onTouchEnd };
}

// Mobile-optimized player card with touch interactions
interface MobilePlayerCardProps {
  player: {
    id: string;
    name: string;
    position: string;
    nflTeam: string;
    projectedPoints: number;
    status: string;
    isRostered?: boolean;
  };
  onSelect?: (playerId: string) => void;
  onSwipeLeft?: (playerId: string) => void;
  onSwipeRight?: (playerId: string) => void;
  className?: string;
}

const MobilePlayerCard = memo<MobilePlayerCardProps>(({
  player,
  onSelect,
  onSwipeLeft,
  onSwipeRight,
  className,
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const [translateX, setTranslateX] = useState(0);
  const [actionRevealed, setActionRevealed] = useState<'left' | 'right' | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const { onTouchStart, onTouchMove, onTouchEnd } = useTouch();

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setIsPressed(true);
    onTouchStart(e);
  }, [onTouchStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    onTouchMove(e);
    
    if (!e.touches[0]) return;
    
    const startX = cardRef.current?.getBoundingClientRect().left || 0;
    const currentX = e.touches[0].clientX;
    const deltaX = currentX - startX;
    
    // Limit swipe distance
    const maxSwipe = 100;
    const clampedDelta = Math.max(-maxSwipe, Math.min(maxSwipe, deltaX));
    
    setTranslateX(clampedDelta);
    
    // Reveal actions based on swipe direction
    if (clampedDelta < -30) {
      setActionRevealed('left');
    } else if (clampedDelta > 30) {
      setActionRevealed('right');
    } else {
      setActionRevealed(null);
    }
  }, [onTouchMove]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    setIsPressed(false);
    const swipeResult = onTouchEnd();
    
    if (swipeResult?.isLeftSwipe && onSwipeLeft) {
      onSwipeLeft(player.id);
    } else if (swipeResult?.isRightSwipe && onSwipeRight) {
      onSwipeRight(player.id);
    } else if (Math.abs(translateX) < 30 && onSelect) {
      onSelect(player.id);
    }
    
    // Reset position
    setTranslateX(0);
    setActionRevealed(null);
  }, [onTouchEnd, translateX, player.id, onSelect, onSwipeLeft, onSwipeRight]);

  const statusColor = useMemo(() => {
    switch (player.status) {
      case 'ACTIVE': return 'bg-green-500';
      case 'QUESTIONABLE': return 'bg-yellow-500';
      case 'DOUBTFUL': return 'bg-orange-500';
      case 'OUT': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  }, [player.status]);

  return (
    <div className="relative overflow-hidden">
      {/* Action buttons background */}
      {actionRevealed && (
        <div className="absolute inset-y-0 right-0 flex items-center justify-end px-4 bg-blue-500 text-white z-0">
          <span className="text-sm font-medium">
            {actionRevealed === 'left' ? 'Add to Lineup' : 'View Details'}
          </span>
        </div>
      )}
      
      {/* Main card */}
      <Card
        ref={cardRef}
        className={cn(
          'relative z-10 transition-transform duration-200 ease-out',
          'active:scale-95 select-none touch-manipulation',
          isPressed && 'scale-95',
          className
        )}
        style={{
          transform: `translateX(${translateX}px)`,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="p-3 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm truncate">{player.name}</h3>
              <Badge variant="secondary" className="text-xs shrink-0">
                {player.position}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{player.nflTeam}</span>
              <div className={cn('w-2 h-2 rounded-full', statusColor)} />
              {player.isRostered && (
                <Badge variant="outline" className="text-xs">Rostered</Badge>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-lg font-bold text-primary">
              {player.projectedPoints.toFixed(1)}
            </div>
            <div className="text-xs text-muted-foreground">Proj</div>
          </div>
        </div>
      </Card>
    </div>
  );
});

MobilePlayerCard.displayName = 'MobilePlayerCard';

// Mobile-optimized lineup manager with drag-and-drop
interface MobileLineupSlotProps {
  position: string;
  player?: {
    id: string;
    name: string;
    position: string;
    projectedPoints: number;
  };
  onPlayerDrop?: (playerId: string, position: string) => void;
  onPlayerRemove?: (playerId: string) => void;
  className?: string;
}

const MobileLineupSlot = memo<MobileLineupSlotProps>(({
  position,
  player,
  onPlayerDrop,
  onPlayerRemove,
  className,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLongPress, setIsLongPress] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const handleTouchStart = useCallback(() => {
    if (!player) return;
    
    longPressTimer.current = setTimeout(() => {
      setIsLongPress(true);
      // Trigger haptic feedback if available
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    }, 500);
  }, [player]);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    
    if (isLongPress && player && onPlayerRemove) {
      onPlayerRemove(player.id);
    }
    
    setIsLongPress(false);
  }, [isLongPress, player, onPlayerRemove]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const playerId = e.dataTransfer.getData('playerId');
    if (playerId && onPlayerDrop) {
      onPlayerDrop(playerId, position);
    }
  }, [position, onPlayerDrop]);

  return (
    <Card
      className={cn(
        'p-3 min-h-[80px] transition-all duration-200',
        'border-2 border-dashed',
        isDragOver && 'border-primary bg-primary/10',
        isLongPress && 'bg-red-50 border-red-300',
        !player && 'border-gray-300',
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="text-xs font-medium text-muted-foreground mb-1">
        {position}
      </div>
      
      {player ? (
        <div className="space-y-1">
          <div className="font-semibold text-sm truncate">{player.name}</div>
          <div className="text-xs text-muted-foreground">
            {player.projectedPoints.toFixed(1)} pts
          </div>
          {isLongPress && (
            <div className="text-xs text-red-600 font-medium">
              Release to remove
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
          Empty
        </div>
      )}
    </Card>
  );
});

MobileLineupSlot.displayName = 'MobileLineupSlot';

// Mobile-optimized tab navigation with swipe support
interface MobileTabNavigationProps {
  tabs: Array<{
    id: string;
    label: string;
    icon?: React.ReactNode;
  }>;
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

const MobileTabNavigation = memo<MobileTabNavigationProps>(({
  tabs,
  activeTab,
  onTabChange,
  className,
}) => {
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const activeIndex = tabs.findIndex(tab => tab.id === activeTab);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartX) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const deltaX = touchStartX - touchEndX;
    const minSwipeDistance = 50;
    
    if (Math.abs(deltaX) > minSwipeDistance) {
      if (deltaX > 0 && activeIndex < tabs.length - 1) {
        // Swipe left - next tab
        onTabChange(tabs[activeIndex + 1].id);
      } else if (deltaX < 0 && activeIndex > 0) {
        // Swipe right - previous tab
        onTabChange(tabs[activeIndex - 1].id);
      }
    }
    
    setTouchStartX(null);
  }, [touchStartX, activeIndex, tabs, onTabChange]);

  return (
    <div 
      className={cn('flex border-b bg-background', className)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {tabs.map((tab, index) => (
        <Button
          key={tab.id}
          variant="ghost"
          className={cn(
            'flex-1 rounded-none border-b-2 border-transparent',
            'h-12 gap-2 text-sm font-medium transition-colors',
            activeTab === tab.id && 'border-primary text-primary'
          )}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.icon}
          <span className="truncate">{tab.label}</span>
        </Button>
      ))}
    </div>
  );
});

MobileTabNavigation.displayName = 'MobileTabNavigation';

// Mobile-optimized floating action button
interface MobileFloatingActionButtonProps {
  actions: Array<{
    id: string;
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'destructive';
  }>;
  className?: string;
}

const MobileFloatingActionButton = memo<MobileFloatingActionButtonProps>(({
  actions,
  className,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggle = useCallback(() => {
    setIsExpanded(prev => !prev);
    
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(30);
    }
  }, []);

  const handleActionClick = useCallback((action: typeof actions[0]) => {
    action.onClick();
    setIsExpanded(false);
    
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  }, []);

  if (actions.length === 0) return null;

  return (
    <div className={cn('fixed bottom-6 right-6 z-50', className)}>
      {/* Backdrop */}
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm -z-10"
          onClick={() => setIsExpanded(false)}
        />
      )}
      
      {/* Action buttons */}
      {isExpanded && (
        <div className="absolute bottom-16 right-0 space-y-3">
          {actions.map((action, index) => (
            <Button
              key={action.id}
              variant={action.variant || 'secondary'}
              size="lg"
              className={cn(
                'w-12 h-12 rounded-full shadow-lg',
                'transform transition-all duration-200 ease-out',
                'translate-y-0 opacity-100'
              )}
              style={{
                animationDelay: `${index * 50}ms`,
              }}
              onClick={() => handleActionClick(action)}
            >
              {action.icon}
            </Button>
          ))}
        </div>
      )}
      
      {/* Main FAB */}
      <Button
        size="lg"
        className={cn(
          'w-14 h-14 rounded-full shadow-lg',
          'transition-transform duration-200',
          isExpanded && 'rotate-45'
        )}
        onClick={handleToggle}
      >
        <svg 
          className="w-6 h-6" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M12 6v6m0 0v6m0-6h6m-6 0H6" 
          />
        </svg>
      </Button>
    </div>
  );
});

MobileFloatingActionButton.displayName = 'MobileFloatingActionButton';

export {
  MobilePlayerCard,
  MobileLineupSlot,
  MobileTabNavigation,
  MobileFloatingActionButton,
  useTouch,
};
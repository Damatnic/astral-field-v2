'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Activity, Zap, TrendingUp, AlertCircle } from 'lucide-react';

interface TickerItem {
  id: string;
  text: string;
  type: 'score' | 'trade' | 'injury' | 'news';
  timestamp: Date;
  priority?: 'low' | 'medium' | 'high';
}

interface LiveTickerProps {
  items?: TickerItem[];
  speed?: 'slow' | 'medium' | 'fast';
  className?: string;
  pauseOnHover?: boolean;
}

const defaultItems: TickerItem[] = [
  { id: '1', text: 'Josh Allen throws 3 TD passes in first quarter!', type: 'score', timestamp: new Date(), priority: 'high' },
  { id: '2', text: 'BREAKING: Jonathan Taylor traded to Cowboys', type: 'trade', timestamp: new Date(), priority: 'high' },
  { id: '3', text: 'Tyreek Hill questionable with ankle injury', type: 'injury', timestamp: new Date(), priority: 'medium' },
  { id: '4', text: 'Chiefs defense forces 3 turnovers in first half', type: 'score', timestamp: new Date(), priority: 'medium' },
  { id: '5', text: 'Weather alert: Heavy rain expected in Green Bay', type: 'news', timestamp: new Date(), priority: 'low' },
];

export function LiveTicker({
  items = defaultItems,
  speed = 'medium',
  className,
  pauseOnHover = true
}: LiveTickerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const speedClasses = {
    slow: 'duration-[60s]',
    medium: 'duration-[40s]',
    fast: 'duration-[20s]'
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'score':
        return <Activity className="w-4 h-4 text-green-400" />;
      case 'trade':
        return <TrendingUp className="w-4 h-4 text-blue-400" />;
      case 'injury':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      case 'news':
        return <Zap className="w-4 h-4 text-yellow-400" />;
      default:
        return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  const getPriorityColors = (priority: string = 'medium') => {
    switch (priority) {
      case 'high':
        return 'text-red-300 bg-red-500/20 border-red-500/30';
      case 'medium':
        return 'text-yellow-300 bg-yellow-500/20 border-yellow-500/30';
      case 'low':
        return 'text-gray-300 bg-gray-500/20 border-gray-500/30';
      default:
        return 'text-blue-300 bg-blue-500/20 border-blue-500/30';
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 5000); // Change every 5 seconds
    
    return () => clearInterval(interval);
  }, [items.length]);

  const currentItem = items[currentIndex];

  return (
    <div className={cn(
      'relative overflow-hidden bg-black/30 backdrop-blur-md border border-white/10 rounded-xl',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-red-600/20 to-pink-600/20 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
          <span className="text-white font-bold text-sm">LIVE</span>
        </div>
        <div className="text-gray-400 text-xs">
          Fantasy Football News
        </div>
      </div>

      {/* Scrolling content */}
      <div className="relative h-12 flex items-center overflow-hidden">
        <div 
          className={cn(
            'flex items-center gap-8 animate-marquee whitespace-nowrap',
            speedClasses[speed],
            pauseOnHover && 'hover:pause'
          )}
          style={{
            animation: `marquee ${speed === 'slow' ? '60s' : speed === 'medium' ? '40s' : '20s'} linear infinite`
          }}
        >
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 px-4">
              {getIcon(item.type)}
              <span className={cn(
                'font-medium text-sm px-3 py-1 rounded-full border',
                getPriorityColors(item.priority)
              )}>
                {item.text}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Gradient overlays for fade effect */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-black/30 to-transparent pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-black/30 to-transparent pointer-events-none" />
    </div>
  );
}

// Add CSS for marquee animation
const style = `
@keyframes marquee {
  0% {
    transform: translateX(100%);
  }
  100% {
    transform: translateX(-100%);
  }
}

.animate-marquee {
  animation: marquee linear infinite;
}

.hover\\:pause:hover {
  animation-play-state: paused;
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = style;
  document.head.appendChild(styleElement);
}
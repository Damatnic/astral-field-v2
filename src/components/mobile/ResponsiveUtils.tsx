'use client';

import React, { useEffect, useState, createContext, useContext } from 'react';
import { usePathname } from 'next/navigation';
import Navigation from '@/components/Navigation';
import MobileHeader from '@/components/mobile/MobileOptimizedNavigation';
import { performanceManager } from '@/lib/mobile/performance';

// Hook to detect mobile devices
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      const userAgent = navigator.userAgent;
      const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      const screenWidth = window.innerWidth <= 768;
      setIsMobile(mobile || screenWidth);
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  return isMobile;
}

// Responsive Navigation Component
export function ResponsiveNavigation() {
  const isMobile = useIsMobile();
  const pathname = usePathname();

  // Don't show navigation on login page
  if (pathname === '/login') {
    return null;
  }

  // Return mobile header for mobile devices, desktop navigation otherwise
  return isMobile ? <MobileHeader /> : <Navigation />;
}

// Enhanced Mobile Detection Hook with breakpoint support
export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState('lg');

  useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      if (width < 640) setBreakpoint('sm');
      else if (width < 768) setBreakpoint('md');  
      else if (width < 1024) setBreakpoint('lg');
      else if (width < 1280) setBreakpoint('xl');
      else setBreakpoint('2xl');
    };

    updateBreakpoint();
    window.addEventListener('resize', updateBreakpoint);
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, []);

  return {
    breakpoint,
    isMobile: breakpoint === 'sm' || breakpoint === 'md',
    isTablet: breakpoint === 'lg',
    isDesktop: breakpoint === 'xl' || breakpoint === '2xl'
  };
}

// Touch-friendly interaction utilities
export function useTouchDevice() {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch(('ontouchstart' in window) || (navigator.maxTouchPoints > 0));
  }, []);

  return isTouch;
}

// Safe area utilities for mobile devices with notches
const SafeAreaContext = createContext({
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
});

export function SafeAreaProvider({ children }: { children: React.ReactNode }) {
  const [safeArea, setSafeArea] = useState({ top: 0, bottom: 0, left: 0, right: 0 });

  useEffect(() => {
    // Set CSS custom properties for safe area insets
    const updateSafeAreas = () => {
      const computedStyle = getComputedStyle(document.documentElement);
      
      const top = parseInt(computedStyle.getPropertyValue('env(safe-area-inset-top)')) || 
                  parseInt(computedStyle.getPropertyValue('--sat')) || 0;
      const bottom = parseInt(computedStyle.getPropertyValue('env(safe-area-inset-bottom)')) || 
                     parseInt(computedStyle.getPropertyValue('--sab')) || 0;
      const left = parseInt(computedStyle.getPropertyValue('env(safe-area-inset-left)')) || 
                   parseInt(computedStyle.getPropertyValue('--sal')) || 0;
      const right = parseInt(computedStyle.getPropertyValue('env(safe-area-inset-right)')) || 
                    parseInt(computedStyle.getPropertyValue('--sar')) || 0;
      
      setSafeArea({ top, bottom, left, right });
      
      document.documentElement.style.setProperty('--safe-area-top', `${top}px`);
      document.documentElement.style.setProperty('--safe-area-bottom', `${bottom}px`);
      document.documentElement.style.setProperty('--safe-area-left', `${left}px`);
      document.documentElement.style.setProperty('--safe-area-right', `${right}px`);
    };

    updateSafeAreas();
    
    // Initialize performance manager
    performanceManager.onNetworkStatusChange((online) => {
      document.documentElement.classList.toggle('offline', !online);
    });

    window.addEventListener('orientationchange', () => {
      setTimeout(updateSafeAreas, 100);
    });
    
    return () => window.removeEventListener('orientationchange', updateSafeAreas);
  }, []);

  return (
    <SafeAreaContext.Provider value={safeArea}>
      {children}
    </SafeAreaContext.Provider>
  );
}

export function useSafeArea() {
  return useContext(SafeAreaContext);
}

// Enhanced mobile utilities
export function useScrollDirection() {
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const updateScrollDirection = () => {
      const scrollY = window.scrollY;
      const direction = scrollY > lastScrollY ? 'down' : 'up';
      
      if (direction !== scrollDirection && (scrollY - lastScrollY > 10 || scrollY - lastScrollY < -10)) {
        setScrollDirection(direction);
      }
      
      setLastScrollY(scrollY > 0 ? scrollY : 0);
    };

    window.addEventListener('scroll', updateScrollDirection);
    return () => window.removeEventListener('scroll', updateScrollDirection);
  }, [scrollDirection, lastScrollY]);

  return scrollDirection;
}

// Swipe gesture detection
export function useSwipeGesture(
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  onSwipeUp?: () => void,
  onSwipeDown?: () => void,
  threshold = 50
) {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    });
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const deltaX = touchStart.x - touchEnd.x;
    const deltaY = touchStart.y - touchEnd.y;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    if (absDeltaX > absDeltaY) {
      // Horizontal swipe
      if (absDeltaX > threshold) {
        if (deltaX > 0 && onSwipeLeft) {
          onSwipeLeft();
        } else if (deltaX < 0 && onSwipeRight) {
          onSwipeRight();
        }
      }
    } else {
      // Vertical swipe
      if (absDeltaY > threshold) {
        if (deltaY > 0 && onSwipeUp) {
          onSwipeUp();
        } else if (deltaY < 0 && onSwipeDown) {
          onSwipeDown();
        }
      }
    }
  };

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd
  };
}

// Mobile-friendly modal/sheet behavior
export function useMobileSheet() {
  const [isOpen, setIsOpen] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartY(e.touches[0].clientY);
    setCurrentY(e.touches[0].clientY);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    setCurrentY(e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    
    const deltaY = currentY - startY;
    if (deltaY > 100) {
      setIsOpen(false);
    }
    
    setIsDragging(false);
    setStartY(0);
    setCurrentY(0);
  };

  const dragOffset = isDragging ? Math.max(0, currentY - startY) : 0;

  return {
    isOpen,
    setIsOpen,
    dragOffset,
    dragHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd
    }
  };
}

// Keyboard height detection for mobile inputs
export function useKeyboardHeight() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      const viewport = window.visualViewport;
      if (viewport) {
        const keyboardHeight = window.innerHeight - viewport.height;
        setKeyboardHeight(keyboardHeight);
        setIsKeyboardOpen(keyboardHeight > 150);
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      return () => window.visualViewport?.removeEventListener('resize', handleResize);
    }
  }, []);

  return { keyboardHeight, isKeyboardOpen };
}

// Mobile-optimized intersection observer
export function useMobileIntersection(threshold = 0.1) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [ref, setRef] = useState<Element | null>(null);

  useEffect(() => {
    if (!ref) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      {
        threshold,
        rootMargin: '0px 0px -50px 0px' // Account for mobile browsers' UI
      }
    );

    observer.observe(ref);
    return () => observer.disconnect();
  }, [ref, threshold]);

  return [setRef, isIntersecting] as const;
}
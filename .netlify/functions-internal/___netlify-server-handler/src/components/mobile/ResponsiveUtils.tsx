'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Navigation from '@/components/Navigation';
import MobileHeader from '@/components/mobile/MobileOptimizedNavigation';

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
export function SafeAreaProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Set CSS custom properties for safe area insets
    const updateSafeAreas = () => {
      const safeAreaTop = getComputedStyle(document.documentElement).getPropertyValue('--sat') || '0px';
      const safeAreaBottom = getComputedStyle(document.documentElement).getPropertyValue('--sab') || '0px';
      
      document.documentElement.style.setProperty('--safe-area-top', safeAreaTop);
      document.documentElement.style.setProperty('--safe-area-bottom', safeAreaBottom);
    };

    updateSafeAreas();
    window.addEventListener('orientationchange', updateSafeAreas);
    return () => window.removeEventListener('orientationchange', updateSafeAreas);
  }, []);

  return <>{children}</>;
}
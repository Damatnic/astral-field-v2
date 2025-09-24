/**
 * Bundle Optimization Utilities
 * Code splitting, lazy loading, and performance monitoring
 */

import dynamic from 'next/dynamic';
import { ComponentType, lazy, Suspense } from 'react';

// ==================== DYNAMIC IMPORTS ====================

// Dashboard components - loaded on demand
export const DynamicDashboard = dynamic(
  () => import('@/components/dashboard/Dashboard'),
  {
    loading: () => <div className="animate-pulse bg-gray-200 h-96 rounded-lg" />,
    ssr: false
  }
);

export const DynamicLeagueOverview = dynamic(
  () => import('@/components/league/LeagueOverview'),
  {
    loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded-lg" />,
  }
);

// Draft components - only load during draft
export const DynamicDraftRoom = dynamic(
  () => import('@/components/draft/DraftRoom'),
  {
    loading: () => (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600" />
      </div>
    ),
    ssr: false
  }
);

export const DynamicDraftBoard = dynamic(
  () => import('@/components/draft/DraftBoard'),
  {
    loading: () => <div className="animate-pulse bg-gray-200 h-96 rounded-lg" />,
    ssr: false
  }
);

export const DynamicPlayerDraftCard = dynamic(
  () => import('@/components/draft/PlayerDraftCard'),
  {
    loading: () => <div className="animate-pulse bg-gray-200 h-24 rounded-lg" />,
    ssr: false
  }
);

// Trade components - load when needed
export const DynamicTradeProposal = dynamic(
  () => import('@/components/trades/TradeProposal'),
  {
    loading: () => <div className="animate-pulse bg-gray-200 h-96 rounded-lg" />,
    ssr: false
  }
);

export const DynamicTradeAnalysis = dynamic(
  () => import('@/components/trades/TradeAnalysis'),
  {
    loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded-lg" />,
    ssr: false
  }
);

export const DynamicTradeHistory = dynamic(
  () => import('@/components/trades/TradeHistory'),
  {
    loading: () => <div className="animate-pulse bg-gray-200 h-48 rounded-lg" />,
  }
);

// Live scoring components - load during game time
export const DynamicLiveScoreboard = dynamic(
  () => import('@/components/scoring/LiveScoreboard'),
  {
    loading: () => <div className="animate-pulse bg-gray-200 h-96 rounded-lg" />,
    ssr: false
  }
);

export const DynamicMatchupDetail = dynamic(
  () => import('@/components/scoring/MatchupDetail'),
  {
    loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded-lg" />,
    ssr: false
  }
);

// Commissioner tools - admin only
export const DynamicCommissionerDashboard = dynamic(
  () => import('@/components/commissioner/CommissionerDashboard'),
  {
    loading: () => <div className="animate-pulse bg-gray-200 h-96 rounded-lg" />,
    ssr: false
  }
);

export const DynamicLeagueSettings = dynamic(
  () => import('@/components/commissioner/LeagueSettings'),
  {
    loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded-lg" />,
    ssr: false
  }
);

// Charts and visualizations - load when needed
export const DynamicStatsChart = dynamic(
  () => import('@/components/charts/StatsChart'),
  {
    loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded-lg" />,
    ssr: false
  }
);

export const DynamicPerformanceChart = dynamic(
  () => import('@/components/charts/PerformanceChart'),
  {
    loading: () => <div className="animate-pulse bg-gray-200 h-48 rounded-lg" />,
    ssr: false
  }
);

// Player research tools - advanced features
export const DynamicPlayerComparison = dynamic(
  () => import('@/components/research/PlayerComparison'),
  {
    loading: () => <div className="animate-pulse bg-gray-200 h-96 rounded-lg" />,
    ssr: false
  }
);

export const DynamicAdvancedStats = dynamic(
  () => import('@/components/research/AdvancedStats'),
  {
    loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded-lg" />,
    ssr: false
  }
);

// ==================== CONDITIONAL LOADING ====================

interface ConditionalComponentProps {
  condition: boolean;
  component: ComponentType<any>;
  fallback?: ComponentType<any>;
  props?: any;
}

export const ConditionalComponent = ({ 
  condition, 
  component: Component, 
  fallback: Fallback,
  props = {} 
}: ConditionalComponentProps) => {
  if (!condition) {
    return Fallback ? <Fallback {...props} /> : null;
  }
  
  return <Component {...props} />;
};

// ==================== FEATURE FLAGS ====================

interface FeatureGatedComponentProps {
  feature: string;
  component: ComponentType<any>;
  fallback?: ComponentType<any>;
  props?: any;
}

const FEATURE_FLAGS = {
  ADVANCED_ANALYTICS: process.env.NEXT_PUBLIC_FEATURE_ADVANCED_ANALYTICS === 'true',
  LIVE_CHAT: process.env.NEXT_PUBLIC_FEATURE_LIVE_CHAT === 'true',
  PUSH_NOTIFICATIONS: process.env.NEXT_PUBLIC_FEATURE_PUSH_NOTIFICATIONS === 'true',
  TRADE_ANALYSIS: process.env.NEXT_PUBLIC_FEATURE_TRADE_ANALYSIS === 'true',
  COMMISSIONER_TOOLS: process.env.NEXT_PUBLIC_FEATURE_COMMISSIONER_TOOLS === 'true',
  DRAFT_ASSISTANCE: process.env.NEXT_PUBLIC_FEATURE_DRAFT_ASSISTANCE === 'true',
};

export const FeatureGatedComponent = ({ 
  feature, 
  component: Component, 
  fallback: Fallback,
  props = {} 
}: FeatureGatedComponentProps) => {
  const isEnabled = FEATURE_FLAGS[feature as keyof typeof FEATURE_FLAGS];
  
  if (!isEnabled) {
    return Fallback ? <Fallback {...props} /> : null;
  }
  
  return <Component {...props} />;
};

// ==================== PERFORMANCE MONITORING ====================

interface PerformanceMetrics {
  componentName: string;
  renderTime: number;
  propsSize: number;
  timestamp: number;
}

export const withPerformanceTracking = <P extends object>(
  Component: ComponentType<P>,
  componentName: string
) => {
  return (props: P) => {
    const startTime = performance.now();
    
    // Calculate props size for monitoring
    const propsSize = JSON.stringify(props).length;
    
    const trackRender = () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Only track in development or when monitoring is enabled
      if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_PERFORMANCE_MONITORING === 'true') {
        console.log(`Performance: ${componentName} rendered in ${renderTime.toFixed(2)}ms (props: ${propsSize} bytes)`);
        
        // Send to monitoring service in production
        if (process.env.NODE_ENV === 'production') {
          reportPerformanceMetric({
            componentName,
            renderTime,
            propsSize,
            timestamp: Date.now()
          });
        }
      }
    };
    
    // Track render completion
    setTimeout(trackRender, 0);
    
    return <Component {...props} />;
  };
};

const reportPerformanceMetric = async (metrics: PerformanceMetrics) => {
  try {
    // Only report if render time is significant or props are large
    if (metrics.renderTime > 50 || metrics.propsSize > 10000) {
      await fetch('/api/monitoring/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metrics)
      });
    }
  } catch (error) {
    console.error('Failed to report performance metric:', error);
  }
};

// ==================== LAZY LOADING UTILITIES ====================

export const createLazyComponent = <P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  FallbackComponent?: ComponentType
) => {
  const LazyComponent = lazy(importFn);
  
  return (props: P) => (
    <Suspense fallback={FallbackComponent ? <FallbackComponent /> : <div>Loading...</div>}>
      <LazyComponent {...props} />
    </Suspense>
  );
};

// ==================== PRELOADING ====================

export const preloadComponent = (importFn: () => Promise<any>) => {
  if (typeof window !== 'undefined') {
    // Preload on user interaction or idle time
    const preload = () => importFn();
    
    // Preload on mouse enter for better UX
    document.addEventListener('mouseenter', preload, { once: true });
    
    // Preload on idle
    if ('requestIdleCallback' in window) {
      requestIdleCallback(preload);
    } else {
      setTimeout(preload, 1000);
    }
  }
};

// Preload critical routes
export const preloadCriticalComponents = () => {
  if (typeof window !== 'undefined') {
    // Preload dashboard components
    preloadComponent(() => import('@/components/dashboard/Dashboard'));
    preloadComponent(() => import('@/components/league/LeagueOverview'));
    
    // Preload common components
    preloadComponent(() => import('@/components/team/TeamRoster'));
    preloadComponent(() => import('@/components/players/PlayerSearch'));
  }
};

// ==================== BUNDLE ANALYSIS ====================

export const getBundleInfo = () => {
  if (typeof window !== 'undefined' && 'performance' in window) {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    return {
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
      firstPaint: performance.getEntriesByType('paint')
        .find(entry => entry.name === 'first-paint')?.startTime || 0,
      firstContentfulPaint: performance.getEntriesByType('paint')
        .find(entry => entry.name === 'first-contentful-paint')?.startTime || 0
    };
  }
  
  return null;
};

// ==================== RESOURCE HINTS ====================

export const addResourceHints = () => {
  if (typeof document !== 'undefined') {
    const head = document.head;
    
    // Preconnect to external APIs
    const preconnectESPN = document.createElement('link');
    preconnectESPN.rel = 'preconnect';
    preconnectESPN.href = 'https://site.api.espn.com';
    head.appendChild(preconnectESPN);
    
    // Prefetch critical CSS
    const prefetchCSS = document.createElement('link');
    prefetchCSS.rel = 'prefetch';
    prefetchCSS.href = '/_next/static/css/app.css';
    head.appendChild(prefetchCSS);
    
    // DNS prefetch for CDN
    const dnsPrefetch = document.createElement('link');
    dnsPrefetch.rel = 'dns-prefetch';
    dnsPrefetch.href = 'https://cdn.astralfield.com';
    head.appendChild(dnsPrefetch);
  }
};

export { FEATURE_FLAGS };
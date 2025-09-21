// Performance Monitor - Fixed version for production
(function() {
    'use strict';
    
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
        return;
    }

    console.log('[Performance Monitor] Initializing...');
    
    // Configuration
    const config = {
        enableMetrics: true,
        enableErrorTracking: true,
        apiEndpoint: '/api/metrics',
        sampleRate: 1.0,
        isDebug: window.location.hostname === 'localhost'
    };
    
    // Core Web Vitals thresholds
    const thresholds = {
        FCP: 1800,  // First Contentful Paint
        LCP: 2500,  // Largest Contentful Paint
        FID: 100,   // First Input Delay
        CLS: 0.1,   // Cumulative Layout Shift
        TTFB: 600   // Time to First Byte
    };
    
    // Metrics tracking
    const metrics = {
        FCP: null,
        LCP: null,
        FID: null,
        CLS: null,
        TTFB: null,
        memory: null,
        connection: null
    };
    
    // Track First Contentful Paint
    function trackFCP() {
        try {
            if ('PerformanceObserver' in window && PerformanceObserver.supportedEntryTypes.includes('paint')) {
                const observer = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (entry.name === 'first-contentful-paint') {
                            metrics.FCP = Math.round(entry.startTime);
                            reportMetric('FCP', metrics.FCP, thresholds.FCP);
                            observer.disconnect();
                        }
                    }
                });
                observer.observe({ entryTypes: ['paint'] });
            }
        } catch (e) {
            if (config.isDebug) console.error('[Performance] Error tracking FCP:', e);
        }
    }
    
    // Track Largest Contentful Paint
    function trackLCP() {
        try {
            if ('PerformanceObserver' in window && PerformanceObserver.supportedEntryTypes.includes('largest-contentful-paint')) {
                const observer = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    const lastEntry = entries[entries.length - 1];
                    metrics.LCP = Math.round(lastEntry.renderTime || lastEntry.loadTime);
                    reportMetric('LCP', metrics.LCP, thresholds.LCP);
                });
                observer.observe({ entryTypes: ['largest-contentful-paint'] });
            }
        } catch (e) {
            if (config.isDebug) console.error('[Performance] Error tracking LCP:', e);
        }
    }
    
    // Track First Input Delay
    function trackFID() {
        try {
            if ('PerformanceObserver' in window && PerformanceObserver.supportedEntryTypes.includes('first-input')) {
                const observer = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        const fid = entry.processingStart - entry.startTime;
                        metrics.FID = Math.round(fid);
                        reportMetric('FID', metrics.FID, thresholds.FID);
                        observer.disconnect();
                    }
                });
                observer.observe({ entryTypes: ['first-input'] });
            }
        } catch (e) {
            if (config.isDebug) console.error('[Performance] Error tracking FID:', e);
        }
    }
    
    // Track Cumulative Layout Shift
    function trackCLS() {
        try {
            if ('PerformanceObserver' in window && PerformanceObserver.supportedEntryTypes.includes('layout-shift')) {
                let clsValue = 0;
                let clsEntries = [];
                
                const observer = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (!entry.hadRecentInput) {
                            clsValue += entry.value;
                            clsEntries.push(entry);
                        }
                    }
                    metrics.CLS = Math.round(clsValue * 1000) / 1000;
                    reportMetric('CLS', metrics.CLS, thresholds.CLS);
                });
                observer.observe({ entryTypes: ['layout-shift'] });
            }
        } catch (e) {
            if (config.isDebug) console.error('[Performance] Error tracking CLS:', e);
        }
    }
    
    // Track Time to First Byte
    function trackTTFB() {
        try {
            window.addEventListener('load', () => {
                const navigationTiming = performance.getEntriesByType('navigation')[0];
                if (navigationTiming && navigationTiming.responseStart) {
                    metrics.TTFB = Math.round(navigationTiming.responseStart - navigationTiming.fetchStart);
                    reportMetric('TTFB', metrics.TTFB, thresholds.TTFB);
                }
            });
        } catch (e) {
            if (config.isDebug) console.error('[Performance] Error tracking TTFB:', e);
        }
    }
    
    // Report metric to API
    function reportMetric(name, value, threshold) {
        if (!config.enableMetrics || Math.random() > config.sampleRate) {
            return;
        }
        
        const metric = {
            name,
            value,
            threshold,
            exceeds: value > threshold,
            timestamp: Date.now(),
            url: window.location.href,
            userAgent: navigator.userAgent
        };
        
        // Send to API endpoint if not localhost
        if (window.location.hostname !== 'localhost') {
            fetch(`${config.apiEndpoint}/performance`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(metric),
                keepalive: true
            }).catch(() => {
                // Fail silently
            });
        }
        
        // Log to console in development
        if (config.isDebug) {
            console.log(`[Performance] ${name}:`, value, threshold ? `(threshold: ${threshold})` : '');
        }
    }
    
    // Error tracking
    function initErrorTracking() {
        if (!config.enableErrorTracking) return;
        
        window.addEventListener('error', (event) => {
            reportError({
                message: event.message,
                source: event.filename,
                line: event.lineno,
                column: event.colno,
                error: event.error ? event.error.stack : null,
                timestamp: Date.now(),
                url: window.location.href
            });
        });
        
        window.addEventListener('unhandledrejection', (event) => {
            reportError({
                message: `Unhandled Promise Rejection: ${event.reason}`,
                error: event.reason ? event.reason.stack : null,
                timestamp: Date.now(),
                url: window.location.href
            });
        });
    }
    
    // Report error to API
    function reportError(errorData) {
        if (Math.random() > config.sampleRate) {
            return;
        }
        
        // Send to API endpoint if not localhost
        if (window.location.hostname !== 'localhost') {
            fetch(`${config.apiEndpoint}/errors`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(errorData),
                keepalive: true
            }).catch(() => {
                // Fail silently
            });
        }
        
        // Log to console in development
        if (config.isDebug) {
            console.error('[Performance] Error tracked:', errorData);
        }
    }
    
    // Track memory usage (if available)
    function trackMemoryUsage() {
        try {
            if ('memory' in performance) {
                const memory = performance.memory;
                metrics.memory = {
                    used: Math.round(memory.usedJSHeapSize / 1048576),
                    total: Math.round(memory.totalJSHeapSize / 1048576),
                    limit: Math.round(memory.jsHeapSizeLimit / 1048576)
                };
                reportMetric('memory', metrics.memory, null);
            }
        } catch (e) {
            if (config.isDebug) console.error('[Performance] Error tracking memory:', e);
        }
    }
    
    // Track connection info
    function trackConnection() {
        try {
            if ('connection' in navigator || 'mozConnection' in navigator || 'webkitConnection' in navigator) {
                const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
                metrics.connection = {
                    effectiveType: connection.effectiveType,
                    downlink: connection.downlink,
                    rtt: connection.rtt,
                    saveData: connection.saveData
                };
                reportMetric('connection', metrics.connection, null);
            }
        } catch (e) {
            if (config.isDebug) console.error('[Performance] Error tracking connection:', e);
        }
    }
    
    // Initialize all tracking
    function init() {
        console.log('[Performance Monitor] Starting metrics collection...');
        
        // Core Web Vitals
        trackFCP();
        trackLCP();
        trackFID();
        trackCLS();
        trackTTFB();
        
        // Additional metrics
        trackMemoryUsage();
        trackConnection();
        
        // Error tracking
        initErrorTracking();
        
        // Periodic memory tracking
        setInterval(() => {
            trackMemoryUsage();
        }, 30000); // Every 30 seconds
    }
    
    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();
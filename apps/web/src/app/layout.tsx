import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { CatalystPerformanceDashboard } from '@/components/performance/catalyst-performance-dashboard'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Analytics } from '@vercel/analytics/react'
import { SessionWrapper } from '@/components/providers/session-provider'

// Catalyst: Optimized font loading with display swap
const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  variable: '--font-inter'
})

// Catalyst: Viewport configuration
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' }
  ]
}

// Catalyst: Enhanced metadata for Core Web Vitals
export const metadata: Metadata = {
  title: 'AstralField - AI-Powered Fantasy Platform',
  description: 'The AI-powered fantasy platform that serious leagues deserve. Advanced AI coaching, real-time updates, and enterprise-grade performance.',
  keywords: 'fantasy football, AI coaching, real-time scoring, draft tools, analytics',
  authors: [{ name: 'AstralField Team' }],
  creator: 'AstralField',
  publisher: 'AstralField',
  robots: 'index, follow',
  openGraph: {
    title: 'AstralField - AI-Powered Fantasy Platform',
    description: 'The AI-powered fantasy platform that serious leagues deserve.',
    type: 'website',
    locale: 'en_US',
    siteName: 'AstralField'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AstralField - AI-Powered Fantasy Platform',
    description: 'The AI-powered fantasy platform that serious leagues deserve.',
    creator: '@astralfield'
  },
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' }
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
    ]
  }
}

// Catalyst: Critical resource preloading component
function CriticalResourcePreloader() {
  return (
    <>
      {/* Catalyst: Preload critical fonts */}
      <link
        rel="preload"
        href="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2"
        as="font"
        type="font/woff2"
        crossOrigin="anonymous"
      />
      
      {/* Catalyst: Preconnect to external domains */}
      <link rel="preconnect" href="https://vitals.vercel-insights.com" />
      <link rel="preconnect" href="https://va.vercel-scripts.com" />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      
      {/* Catalyst: Critical CSS hint */}
      {/* CSS is handled by Next.js bundling, no need for manual preload */}
      
      {/* Catalyst: Performance hints */}
      <meta httpEquiv="x-dns-prefetch-control" content="on" />
      <meta name="format-detection" content="telephone=no" />
      
      {/* Sigma: Mobile and PWA optimization */}
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      <meta name="apple-mobile-web-app-title" content="AstralField" />
      <meta name="application-name" content="AstralField" />
      <meta name="msapplication-TileColor" content="#0f172a" />
      <meta name="msapplication-config" content="/browserconfig.xml" />
      
      {/* Sigma: Enhanced touch and gesture support */}
      <meta name="touch-action" content="manipulation" />
      <meta name="HandheldFriendly" content="true" />
      <meta name="MobileOptimized" content="320" />
      
      {/* Sigma: iOS Safari optimizations */}
      <meta name="apple-touch-fullscreen" content="yes" />
      <meta name="apple-mobile-web-app-orientations" content="portrait" />
      
      {/* Sigma: Android Chrome optimizations */}
      <meta name="theme-color" content="#0f172a" />
      <meta name="color-scheme" content="dark light" />
      
      {/* Sigma: Performance and accessibility */}
      <meta name="referrer" content="strict-origin-when-cross-origin" />
      <meta name="robots" content="index, follow, max-image-preview:large" />
      
      {/* Sigma: Security headers */}
      <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
      <meta httpEquiv="X-Frame-Options" content="DENY" />
      <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
      
      {/* Sigma: iOS specific splash screens and icons */}
      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      <link rel="apple-touch-startup-image" href="/apple-splash-2048-2732.png" sizes="2048x2732" />
      <link rel="apple-touch-startup-image" href="/apple-splash-1668-2224.png" sizes="1668x2224" />
      <link rel="apple-touch-startup-image" href="/apple-splash-1536-2048.png" sizes="1536x2048" />
      <link rel="apple-touch-startup-image" href="/apple-splash-1125-2436.png" sizes="1125x2436" />
      <link rel="apple-touch-startup-image" href="/apple-splash-1242-2208.png" sizes="1242x2208" />
      <link rel="apple-touch-startup-image" href="/apple-splash-750-1334.png" sizes="750x1334" />
      <link rel="apple-touch-startup-image" href="/apple-splash-828-1792.png" sizes="828x1792" />
      
      {/* Catalyst: Resource hints for better loading */}
      <link rel="prefetch" href="/api/auth/session" />
    </>
  )
}

// Catalyst: Performance-optimized Root Layout
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <CriticalResourcePreloader />
        
        {/* Catalyst: Inline critical CSS for instant rendering */}
        <style dangerouslySetInnerHTML={{
          __html: `
            /* Catalyst: Critical above-the-fold styles */
            body { 
              margin: 0; 
              background-color: #0f172a; 
              color: #ffffff; 
              font-family: var(--font-inter), -apple-system, BlinkMacSystemFont, sans-serif;
              line-height: 1.6;
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
            }
            
            /* Catalyst: Loading state styles */
            .loading-skeleton {
              background: linear-gradient(90deg, #1e293b 25%, #334155 50%, #1e293b 75%);
              background-size: 200% 100%;
              animation: loading 1.5s infinite;
            }
            
            @keyframes loading {
              0% { background-position: 200% 0; }
              100% { background-position: -200% 0; }
            }
            
            /* Catalyst: Prevent layout shift */
            img { display: block; max-width: 100%; height: auto; }
            
            /* Catalyst: Focus management for accessibility */
            :focus-visible {
              outline: 2px solid #3b82f6;
              outline-offset: 2px;
            }
          `
        }} />
      </head>
      <body className={`${inter.className} antialiased min-h-screen bg-slate-900 text-white`}>
        {/* Catalyst: Performance budget warning for development */}
        {process.env.NODE_ENV === 'development' && (
          <script dangerouslySetInnerHTML={{
            __html: `
              // Catalyst: Performance budget monitoring
              if (typeof window !== 'undefined') {
                window.addEventListener('load', () => {
                  setTimeout(() => {
                    const nav = performance.getEntriesByType('navigation')[0];
                    const loadTime = nav.loadEventEnd - nav.navigationStart;
                    if (loadTime > 3000) {
                      console.warn('⚡ Catalyst: Page load time exceeds 3s budget:', loadTime + 'ms');
                    }
                    
                    const memInfo = performance.memory;
                    if (memInfo && memInfo.usedJSHeapSize > 50000000) {
                      console.warn('⚡ Catalyst: Memory usage exceeds 50MB budget:', 
                        (memInfo.usedJSHeapSize / 1024 / 1024).toFixed(1) + 'MB');
                    }
                  }, 1000);
                });
              }
            `
          }} />
        )}

        {/* Catalyst: Main application content */}
        <main className="relative">
          <SessionWrapper>
            {children}
          </SessionWrapper>
        </main>

        {/* Catalyst: Performance monitoring in development */}
        {process.env.NODE_ENV === 'development' && (
          <CatalystPerformanceDashboard />
        )}

        {/* Catalyst: Analytics with performance impact minimization */}
        <SpeedInsights />
        <Analytics />

        {/* Catalyst: Service worker registration for PWA capabilities */}
        <script dangerouslySetInnerHTML={{
          __html: `
            // Catalyst: Progressive enhancement with service worker
            if ('serviceWorker' in navigator && 'production' === '${process.env.NODE_ENV}') {
              window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                  .then(registration => {
                    console.log('SW registered:', registration);
                  })
                  .catch(error => {
                    console.log('SW registration failed:', error);
                  });
              });
            }
            
            // Catalyst: Web Vitals reporting
            if (typeof window !== 'undefined' && 'performance' in window) {
              function sendToAnalytics(metric) {
                // Send to your analytics service
                if (typeof gtag !== 'undefined') {
                  gtag('event', metric.name, {
                    value: Math.round(metric.value),
                    metric_id: metric.id,
                    metric_value: metric.value,
                    metric_delta: metric.delta,
                  });
                }
              }
              
              // Import web-vitals dynamically with proper module resolution
              (async () => {
                try {
                  const webVitals = await import('web-vitals');
                  webVitals.getFCP(sendToAnalytics);
                  webVitals.getLCP(sendToAnalytics);
                  webVitals.getFID(sendToAnalytics);
                  webVitals.getCLS(sendToAnalytics);
                  webVitals.getTTFB(sendToAnalytics);
                } catch (error) {
                  console.warn('Web Vitals could not be loaded:', error);
                }
              })();
            }
          `
        }} />
      </body>
    </html>
  )
}
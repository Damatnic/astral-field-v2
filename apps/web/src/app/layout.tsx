import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Providers } from '@/components/providers'
import { Toaster } from 'sonner'
import dynamic from 'next/dynamic'
import './globals.css'

// Catalyst: Optimized font loading with aggressive performance settings
const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'arial'],
  adjustFontFallback: true,
  variable: '--font-inter'
})

// Catalyst: Lazy load performance monitor for better initial load
const PerformanceMonitor = dynamic(
  () => import('@/components/performance/performance-monitor').then(mod => mod.PerformanceMonitor),
  { 
    ssr: false,
    loading: () => null
  }
)

// Catalyst: Optimized metadata for maximum SEO and performance
export const metadata: Metadata = {
  title: {
    default: 'AstralField v3.0 - The AI-Powered Fantasy Platform',
    template: '%s | AstralField v3.0'
  },
  description: 'The AI-Powered Fantasy Platform That Serious Leagues Deserve. Advanced AI coaching, real-time updates, and enterprise-grade performance.',
  applicationName: 'AstralField',
  referrer: 'origin-when-cross-origin',
  keywords: [
    'fantasy football',
    'AI coaching',
    'sports analytics', 
    'live scoring',
    'fantasy sports',
    'NFL',
    'draft tools',
    'lineup optimizer'
  ],
  authors: [{ name: 'AstralField Team', url: 'https://astralfield.com' }],
  creator: 'AstralField Team',
  publisher: 'AstralField',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' }
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
    ],
    shortcut: '/favicon.ico'
  },
  openGraph: {
    type: 'website',
    siteName: 'AstralField',
    title: 'AstralField v3.0 - The AI-Powered Fantasy Platform',
    description: 'The AI-Powered Fantasy Platform That Serious Leagues Deserve',
    url: 'https://astralfield.com',
    images: [
      {
        url: 'https://astralfield.com/og-image.png',
        width: 1200,
        height: 630,
        alt: 'AstralField - AI-Powered Fantasy Platform'
      }
    ],
    locale: 'en_US'
  },
  twitter: {
    card: 'summary_large_image',
    site: '@astralfield',
    creator: '@astralfield',
    title: 'AstralField v3.0 - The AI-Powered Fantasy Platform',
    description: 'The AI-Powered Fantasy Platform That Serious Leagues Deserve',
    images: ['https://astralfield.com/twitter-image.png']
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  category: 'sports'
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <head>
        {/* Catalyst: Critical resource preloading for sub-second load times */}
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//fonts.gstatic.com" />
        <link rel="dns-prefetch" href="//vercel.live" />
        <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        
        {/* Catalyst: Critical CSS preload */}
        <link rel="preload" href="/_next/static/css/app/layout.css" as="style" />
        
        {/* Catalyst: Critical JS preload */}
        <link rel="modulepreload" href="/_next/static/chunks/polyfills.js" />
        <link rel="modulepreload" href="/_next/static/chunks/webpack.js" />
        <link rel="modulepreload" href="/_next/static/chunks/main.js" />
        
        {/* Catalyst: Performance optimizations */}
        <meta name="theme-color" content="#3b82f6" />
        <meta name="color-scheme" content="dark light" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        
        {/* Catalyst: Advanced Service Worker with performance features */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Catalyst: Lightning-fast service worker registration
              if ('serviceWorker' in navigator) {
                // Register immediately for faster caching
                navigator.serviceWorker.register('/sw.js', {
                  scope: '/',
                  updateViaCache: 'imports'
                }).then(function(registration) {
                  console.log('[Catalyst] SW registered successfully:', registration.scope);
                  
                  // Preload critical resources
                  if (registration.active) {
                    registration.active.postMessage({
                      type: 'PRELOAD_CRITICAL',
                      resources: ['/', '/dashboard', '/auth/signin']
                    });
                  }
                }).catch(function(error) {
                  console.error('[Catalyst] SW registration failed:', error);
                });
                
                // Listen for SW updates
                navigator.serviceWorker.addEventListener('controllerchange', () => {
                  window.location.reload();
                });
              }
              
              // Catalyst: Performance monitoring initialization
              if (typeof window !== 'undefined') {
                window.__CATALYST_PERF_START__ = Date.now();
                
                // Track resource loading
                if ('PerformanceObserver' in window) {
                  const obs = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                      if (entry.name.includes('chunk') && entry.duration > 1000) {
                        console.warn('[Catalyst] Slow chunk detected:', entry.name, entry.duration + 'ms');
                      }
                    }
                  });
                  obs.observe({ entryTypes: ['resource'] });
                }
              }
            `
          }}
        />
      </head>
      <body className={`${inter.className} font-sans antialiased`}>
        <Providers>
          <PerformanceMonitor />
          {children}
          <Toaster 
            richColors 
            position="top-right" 
            closeButton
            duration={4000}
            toastOptions={{
              style: {
                background: 'rgb(15 23 42)',
                border: '1px solid rgb(51 65 85)',
                color: 'rgb(248 250 252)'
              }
            }}
          />
        </Providers>
        
        {/* Catalyst: Critical performance scripts */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Catalyst: Mark Time to Interactive
              if (typeof window !== 'undefined' && window.__CATALYST_PERF_START__) {
                const tti = Date.now() - window.__CATALYST_PERF_START__;
                console.log('[Catalyst] Time to Interactive:', tti + 'ms');
                
                // Send to analytics
                if (window.gtag) {
                  window.gtag('event', 'timing_complete', {
                    name: 'time_to_interactive',
                    value: tti
                  });
                }
              }
            `
          }}
        />
      </body>
    </html>
  )
}
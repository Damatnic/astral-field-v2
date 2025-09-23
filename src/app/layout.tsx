import type { Metadata } from 'next';
import './globals.css';
import AuthProvider from '@/components/AuthProvider';
import QueryProvider from '@/components/QueryProvider';
import { ResponsiveNavigation, SafeAreaProvider } from '@/components/mobile/ResponsiveUtils';
import { ToastProvider } from '@/components/ui/Toast';
import { ThemeProvider } from '@/components/ThemeProvider';

// Local font configuration (no Google Fonts dependency for faster builds)
const fontClass = 'font-sans';

// Metadata configuration
export const metadata: Metadata = {
  title: {
    default: 'AstralField - Fantasy Football Platform',
    template: '%s | AstralField'
  },
  description: 'The ultimate fantasy football platform with AI-powered insights, advanced analytics, and immersive league management.',
  keywords: [
    'fantasy football',
    'NFL',
    'fantasy sports',
    'football analytics',
    'draft',
    'league management',
    'AI insights',
    'player stats',
    'fantasy predictions'
  ],
  authors: [{ name: 'AstralField Team' }],
  creator: 'AstralField',
  publisher: 'AstralField',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    title: 'AstralField - Fantasy Football Platform',
    description: 'The ultimate fantasy football platform with AI-powered insights, advanced analytics, and immersive league management.',
    siteName: 'AstralField',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'AstralField Fantasy Football Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AstralField - Fantasy Football Platform',
    description: 'The ultimate fantasy football platform with AI-powered insights, advanced analytics, and immersive league management.',
    images: ['/og-image.jpg'],
    creator: '@astralfield',
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
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
  category: 'Sports',
  classification: 'Fantasy Sports Platform',
  other: {
    'msapplication-TileColor': '#3b82f6',
    'theme-color': '#3b82f6',
  },
};

// Viewport configuration moved to metadata

// Root layout component
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fontClass} h-full`} suppressHydrationWarning>
      <head>
        {/* Preconnect to external domains for performance */}
        
        {/* Favicon and app icons */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        
        {/* Performance hints */}
        <link rel="dns-prefetch" href="//api.astralfield.com" />
      </head>
      <body 
        className={`${fontClass} h-full bg-gray-50 text-gray-900 antialiased`}
        suppressHydrationWarning
      >
        {/* Skip to main content link for accessibility */}
        <a 
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary-600 text-white px-4 py-2 rounded-md z-50"
        >
          Skip to main content
        </a>

        {/* Auth Provider wraps everything to provide authentication context */}
        <AuthProvider>
          <QueryProvider>
            <ThemeProvider>
              <SafeAreaProvider>
                <ToastProvider>
                {/* Responsive Navigation component */}
                <ResponsiveNavigation />
              
              {/* Main content area */}
              <main 
                id="main-content" 
                className="min-h-screen"
                role="main"
              >
                {children}
              </main>
              </ToastProvider>
              </SafeAreaProvider>
            </ThemeProvider>
          </QueryProvider>

          {/* Mobile-Responsive Footer */}
          <footer className="bg-white border-t border-gray-200 mt-auto">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
                {/* Company info - Full width on mobile, spans 2 cols on desktop */}
                <div className="col-span-1 sm:col-span-2">
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">AF</span>
                    </div>
                    <span className="text-lg sm:text-xl font-bold text-gray-900">AstralField</span>
                  </div>
                  <p className="text-sm text-gray-600 max-w-md mb-4">
                    The ultimate fantasy football platform with AI-powered insights, 
                    advanced analytics, and immersive league management.
                  </p>
                  <div className="flex flex-wrap gap-4 mb-4 sm:hidden">
                    {/* Mobile-only social links */}
                    <a href="/help" className="text-sm text-gray-600 hover:text-gray-900 font-medium">
                      Help
                    </a>
                    <a href="/contact" className="text-sm text-gray-600 hover:text-gray-900 font-medium">
                      Contact
                    </a>
                    <a href="/features" className="text-sm text-gray-600 hover:text-gray-900 font-medium">
                      Features
                    </a>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">
                      © 2024 AstralField. All rights reserved.
                    </p>
                  </div>
                </div>
                
                {/* Quick links - Hidden on mobile, shown on larger screens */}
                <div className="hidden sm:block">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Platform</h3>
                  <ul className="space-y-2">
                    <li>
                      <a href="/features" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                        Features
                      </a>
                    </li>
                    <li>
                      <a href="/pricing" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                        Pricing
                      </a>
                    </li>
                    <li>
                      <a href="/api" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                        API
                      </a>
                    </li>
                    <li>
                      <a href="/docs" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                        Documentation
                      </a>
                    </li>
                  </ul>
                </div>
                
                {/* Support links - Hidden on mobile, shown on larger screens */}
                <div className="hidden sm:block">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Support</h3>
                  <ul className="space-y-2">
                    <li>
                      <a href="/help" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                        Help Center
                      </a>
                    </li>
                    <li>
                      <a href="/contact" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                        Contact
                      </a>
                    </li>
                    <li>
                      <a href="/privacy" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                        Privacy Policy
                      </a>
                    </li>
                    <li>
                      <a href="/terms" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                        Terms of Service
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
              
              {/* Mobile bottom border for visual separation */}
              <div className="mt-6 pt-4 border-t border-gray-100 sm:hidden">
                <div className="flex justify-center space-x-6 text-xs text-gray-500">
                  <a href="/privacy" className="hover:text-gray-700">Privacy</a>
                  <a href="/terms" className="hover:text-gray-700">Terms</a>
                  <a href="/api" className="hover:text-gray-700">API</a>
                </div>
              </div>
            </div>
          </footer>
        </AuthProvider>

        {/* Performance monitoring script */}
        {typeof window !== 'undefined' && window.location.hostname !== 'localhost' && (
          <script
            defer
            src="/scripts/performance-monitor.js"
          />
        )}
        
        {/* Service Worker registration */}
        {typeof window !== 'undefined' && window.location.hostname !== 'localhost' && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', function() {
                    navigator.serviceWorker.register('/sw.js')
                      .then(function(registration) {})
                      .catch(function(registrationError) {});
                  });
                }
              `,
            }}
          />
        )}
      </body>
    </html>
  );
}
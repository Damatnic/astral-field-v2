import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import AuthProvider from '@/components/AuthProvider';
import Navigation from '@/components/Navigation';
import { ToastProvider } from '@/components/ui/Toast';

// Font configuration
const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter'
});

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

// Viewport configuration
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#3b82f6' },
    { media: '(prefers-color-scheme: dark)', color: '#1e40af' },
  ],
};

// Root layout component
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} h-full`} suppressHydrationWarning>
      <head>
        {/* Preconnect to external domains for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        
        {/* Favicon and app icons */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        
        {/* Performance hints */}
        <link rel="dns-prefetch" href="//api.astralfield.com" />
      </head>
      <body 
        className={`${inter.className} h-full bg-gray-50 text-gray-900 antialiased`}
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
          <ToastProvider>
            {/* Navigation component */}
            <Navigation />
            
            {/* Main content area */}
            <main 
              id="main-content" 
              className="min-h-screen"
              role="main"
            >
              {children}
            </main>
          </ToastProvider>
          
          {/* Footer */}
          <footer className="bg-white border-t border-gray-200 mt-auto">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                {/* Company info */}
                <div className="col-span-1 md:col-span-2">
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">AF</span>
                    </div>
                    <span className="text-xl font-bold text-gray-900">AstralField</span>
                  </div>
                  <p className="text-sm text-gray-600 max-w-md">
                    The ultimate fantasy football platform with AI-powered insights, 
                    advanced analytics, and immersive league management.
                  </p>
                  <div className="mt-4">
                    <p className="text-xs text-gray-500">
                      © 2024 AstralField. All rights reserved.
                    </p>
                  </div>
                </div>
                
                {/* Quick links */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Platform</h3>
                  <ul className="space-y-2">
                    <li>
                      <a href="/features" className="text-sm text-gray-600 hover:text-gray-900">
                        Features
                      </a>
                    </li>
                    <li>
                      <a href="/pricing" className="text-sm text-gray-600 hover:text-gray-900">
                        Pricing
                      </a>
                    </li>
                    <li>
                      <a href="/api" className="text-sm text-gray-600 hover:text-gray-900">
                        API
                      </a>
                    </li>
                    <li>
                      <a href="/docs" className="text-sm text-gray-600 hover:text-gray-900">
                        Documentation
                      </a>
                    </li>
                  </ul>
                </div>
                
                {/* Support links */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Support</h3>
                  <ul className="space-y-2">
                    <li>
                      <a href="/help" className="text-sm text-gray-600 hover:text-gray-900">
                        Help Center
                      </a>
                    </li>
                    <li>
                      <a href="/contact" className="text-sm text-gray-600 hover:text-gray-900">
                        Contact
                      </a>
                    </li>
                    <li>
                      <a href="/privacy" className="text-sm text-gray-600 hover:text-gray-900">
                        Privacy Policy
                      </a>
                    </li>
                    <li>
                      <a href="/terms" className="text-sm text-gray-600 hover:text-gray-900">
                        Terms of Service
                      </a>
                    </li>
                  </ul>
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
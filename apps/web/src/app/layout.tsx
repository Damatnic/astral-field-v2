import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Providers } from '@/components/providers'
import { Toaster } from 'sonner'
import { PerformanceMonitor } from '@/components/performance/performance-monitor'
import './globals.css'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  preload: true
})

export const metadata: Metadata = {
  title: 'AstralField v3.0 - The AI-Powered Fantasy Platform',
  description: 'The AI-Powered Fantasy Platform That Serious Leagues Deserve',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon-192.png',
    apple: '/icon-192.png',
  },
  themeColor: '#3b82f6',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=5',
  robots: 'index, follow',
  authors: [{ name: 'AstralField Team' }],
  keywords: 'fantasy football, AI, sports analytics, live scoring',
  openGraph: {
    title: 'AstralField v3.0 - The AI-Powered Fantasy Platform',
    description: 'The AI-Powered Fantasy Platform That Serious Leagues Deserve',
    type: 'website',
    siteName: 'AstralField',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AstralField v3.0',
    description: 'The AI-Powered Fantasy Platform That Serious Leagues Deserve',
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preload critical resources */}
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        
        {/* Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(registration) {
                    console.log('SW registered: ', registration);
                  }).catch(function(registrationError) {
                    console.log('SW registration failed: ', registrationError);
                  });
                });
              }
            `
          }}
        />
        
        {/* Performance monitoring script */}
        <script src="/scripts/performance-monitor.js" async />
      </head>
      <body className={inter.className}>
        <Providers>
          <PerformanceMonitor />
          {children}
          <Toaster richColors position="top-right" />
        </Providers>
      </body>
    </html>
  )
}
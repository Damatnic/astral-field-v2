/** @type {import('next').NextConfig} */
const nextConfig = {
  // ===== PRODUCTION READINESS CONFIGURATION =====
  
  // Build optimizations for production
  eslint: {
    dirs: ['src', 'prisma', 'scripts'],
    ignoreDuringBuilds: process.env.NODE_ENV === 'production',
  },
  typescript: {
    ignoreBuildErrors: process.env.NODE_ENV === 'production',
  },

  // Performance optimizations
  swcMinify: true,
  compress: true,
  
  // Experimental features for 2025 production standards
  experimental: {
    // External packages for Prisma compatibility
    serverComponentsExternalPackages: ['@prisma/client', 'prisma'],
    // Performance optimizations
    optimizeServerReact: true,
    serverMinification: true,
    // Modern features
    scrollRestoration: true,
    largePageDataBytes: 128 * 1000, // 128KB
    // Output file tracing for better builds
    outputFileTracingRoot: process.cwd(),
  },

  // Security headers - COMPREHENSIVE PRODUCTION IMPLEMENTATION
  async headers() {
    const securityHeaders = [
      // DNS Prefetch Control
      {
        key: 'X-DNS-Prefetch-Control',
        value: 'on'
      },
      // Strict Transport Security (HSTS)
      {
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains; preload'
      },
      // XSS Protection
      {
        key: 'X-XSS-Protection',
        value: '1; mode=block'
      },
      // Frame Options
      {
        key: 'X-Frame-Options',
        value: 'DENY'
      },
      // Content Type Options
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff'
      },
      // Referrer Policy
      {
        key: 'Referrer-Policy',
        value: 'origin-when-cross-origin'
      },
      // Permissions Policy
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()'
      },
      // Cross-Origin Opener Policy
      {
        key: 'Cross-Origin-Opener-Policy',
        value: 'same-origin'
      },
      // Cross-Origin Resource Policy
      {
        key: 'Cross-Origin-Resource-Policy',
        value: 'same-site'
      }
    ];

    // Content Security Policy - STRICT PRODUCTION CONFIGURATION
    const cspHeader = process.env.NODE_ENV === 'production'
      ? `
        default-src 'self';
        script-src 'self' 'unsafe-eval' 'unsafe-inline' 
          https://vercel.live 
          https://*.vercel-analytics.com 
          https://*.sentry.io
          https://va.vercel-scripts.com;
        style-src 'self' 'unsafe-inline' 
          https://fonts.googleapis.com;
        img-src 'self' blob: data: https:;
        font-src 'self' data: 
          https://fonts.gstatic.com 
          https://fonts.googleapis.com;
        connect-src 'self' 
          https://*.sentry.io 
          https://*.vercel-analytics.com 
          wss://*.vercel.live 
          https://api.sportsdata.io 
          https://fonts.googleapis.com;
        frame-ancestors 'none';
        base-uri 'self';
        form-action 'self';
        object-src 'none';
        block-all-mixed-content;
        upgrade-insecure-requests;
      `.replace(/\\s{2,}/g, ' ').trim()
      : `
        default-src 'self';
        script-src 'self' 'unsafe-eval' 'unsafe-inline';
        style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
        img-src 'self' blob: data: https:;
        font-src 'self' data: https://fonts.gstatic.com https://fonts.googleapis.com;
        connect-src 'self' ws: wss: https://fonts.googleapis.com;
        frame-ancestors 'none';
      `.replace(/\\s{2,}/g, ' ').trim();

    // Add CSP header
    securityHeaders.push({
      key: 'Content-Security-Policy',
      value: cspHeader
    });

    return [
      // Cache control for service worker
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      // Cache control for manifest
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400',
          },
        ],
      },
      // Cache control for static assets
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // API routes with security headers
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          ...securityHeaders,
        ],
      },
      // All other routes
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },

  // Image optimization - PRODUCTION STANDARDS
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000, // 1 year
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    domains: [],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.cloudfront.net',
        port: '',
        pathname: '/**',
      },
    ],
  },

  // Redirects for production
  async redirects() {
    return [
      // Redirect www to non-www in production
      ...(process.env.NODE_ENV === 'production' ? [
        {
          source: '/(.*)',
          has: [
            {
              type: 'host',
              value: 'www.astralfield.com',
            },
          ],
          destination: 'https://astralfield.com/:path*',
          permanent: true,
        },
      ] : []),
    ];
  },

  // Rewrites for API and health checks
  async rewrites() {
    return [
      {
        source: '/health',
        destination: '/api/health',
      },
      {
        source: '/robots.txt',
        destination: '/api/robots',
      },
      {
        source: '/sitemap.xml',
        destination: '/api/sitemap',
      },
      {
        source: '/metrics',
        destination: '/api/metrics',
      },
    ];
  },

  // Compiler optimizations for production
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
    reactRemoveProperties: process.env.NODE_ENV === 'production',
    styledComponents: true,
  },

  // Webpack configuration for production optimization
  webpack: (config, { dev, isServer, webpack }) => {
    // Module resolution optimizations
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': './src',
    };

    // Production optimizations
    if (!dev && !isServer) {
      // Bundle analysis in CI
      if (process.env.ANALYZE === 'true') {
        const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
        config.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            openAnalyzer: false,
          })
        );
      }
    }

    // Server-side optimizations
    if (isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
      
      // Define global 'self' for server environment
      config.plugins = config.plugins || [];
      config.plugins.push(
        new webpack.DefinePlugin({
          'typeof self': '"undefined"',
        })
      );
    }

    return config;
  },

  // Performance optimizations
  onDemandEntries: {
    // Period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // Number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },

  // Remove powered by header for security
  poweredByHeader: false,

  // Environment variables for build-time optimization
  env: {
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV || 'development',
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version || '2.1.0',
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
    NEXT_PUBLIC_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
  },

  // Trailing slash configuration
  trailingSlash: false,

  // Generate build ID for cache busting
  generateBuildId: async () => {
    return process.env.VERCEL_GIT_COMMIT_SHA || `build-${Date.now()}`;
  },
};

module.exports = nextConfig;
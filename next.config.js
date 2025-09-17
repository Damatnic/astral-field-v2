const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Experimental features
  experimental: {
    typedRoutes: true,
    instrumentationHook: true,
    optimizeServerReact: true,
    serverMinification: true,
    swcMinify: true,
    serverComponentsExternalPackages: ['@prisma/client', 'prisma'],
    // optimizeCss: process.env.NODE_ENV === 'production', // Disabled - requires critters package
    scrollRestoration: true,
    largePageDataBytes: 128 * 1000, // 128KB
    outputFileTracingRoot: process.cwd(),
  },
  
  // Build configuration
  eslint: {
    dirs: ['src', 'prisma', 'scripts'],
  },
  
  // Production optimizations
  swcMinify: true,
  compress: true,
  
  // Source maps for better error tracking in production
  productionBrowserSourceMaps: process.env.NODE_ENV === 'production' && process.env.GENERATE_SOURCEMAP !== 'false',
  
  // Output configuration
  output: 'standalone',
  
  // Bundle analyzer (only in development)
  ...(process.env.ANALYZE === 'true' && {
    webpack: (config, { isServer }) => {
      if (!isServer) {
        const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
        config.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            openAnalyzer: false,
          })
        );
      }
      return config;
    },
  }),
  
  // Performance and security headers
  async headers() {
    const securityHeaders = [
      {
        key: 'X-DNS-Prefetch-Control',
        value: 'on'
      },
      {
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains; preload'
      },
      {
        key: 'X-XSS-Protection',
        value: '1; mode=block'
      },
      {
        key: 'X-Frame-Options',
        value: 'DENY'
      },
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff'
      },
      {
        key: 'Referrer-Policy',
        value: 'origin-when-cross-origin'
      },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()'
      }
    ];

    // Development vs Production CSP - Fixed for production deployment
    const cspHeader = process.env.NODE_ENV === 'production'
      ? "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live https://*.vercel-analytics.com https://*.sentry.io; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' blob: data: https:; font-src 'self' data: https://fonts.gstatic.com https://fonts.googleapis.com; connect-src 'self' https://*.sentry.io https://*.vercel-analytics.com wss://*.vercel.live https://api.sportsdata.io; frame-ancestors 'none';"
      : "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' blob: data: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' ws: wss:; frame-ancestors 'none';";

    if (process.env.NODE_ENV === 'production') {
      securityHeaders.push({
        key: 'Content-Security-Policy',
        value: cspHeader.replace(/\s{2,}/g, ' ').trim()
      });
    }

    return [
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
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400',
          },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
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
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
  
  // Redirect and rewrites
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

  
  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
    reactRemoveProperties: process.env.NODE_ENV === 'production',
    styledComponents: true,
  },
  
  // Performance optimizations
  onDemandEntries: {
    // Period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // Number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },
  
  // Webpack optimizations
  webpack: (config, { dev, isServer, webpack }) => {
    // Module resolution optimizations
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': './src',
    };

    // Add polyfill for 'self' in server environment
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
  
  // Image optimization
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
  
  // PoweredByHeader
  poweredByHeader: false,
  
  // Generate static exports for specific pages
  trailingSlash: false,
  
  // Environment variables available to browser
  env: {
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV || 'development',
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version || '2.1.0',
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
    NEXT_PUBLIC_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
  },
  
  // API route configuration
  async rewrites() {
    return [
      {
        source: '/sw.js',
        destination: '/sw.js',
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
        source: '/health',
        destination: '/api/health',
      },
      {
        source: '/metrics',
        destination: '/api/metrics',
      },
    ];
  },
  
  // Server-side runtime config
  serverRuntimeConfig: {
    // Will only be available on the server side
    mySecret: process.env.MY_SECRET,
  },
  
  // Public runtime config
  publicRuntimeConfig: {
    // Will be available on both server and client
    staticFolder: '/static',
  },
};

// Check if we have valid Sentry configuration
const hasValidSentryAuth = process.env.SENTRY_AUTH_TOKEN && 
                           process.env.SENTRY_AUTH_TOKEN !== 'placeholder-auth-token' &&
                           !process.env.SENTRY_AUTH_TOKEN.includes('placeholder');

const hasValidSentryDSN = process.env.NEXT_PUBLIC_SENTRY_DSN && 
                          !process.env.NEXT_PUBLIC_SENTRY_DSN.includes('placeholder');

// Only enable Sentry webpack integration if we have both valid DSN and auth token
// This prevents any source map upload attempts with invalid tokens
const shouldEnableSentryWebpack = hasValidSentryDSN && hasValidSentryAuth;

// Sentry configuration options
const sentryWebpackPluginOptions = {
  // Organization and project settings
  org: process.env.SENTRY_ORG || "astral-productions",
  project: process.env.SENTRY_PROJECT || "javascript-nextjs",
  
  // Additional config options for the Sentry Webpack plugin
  silent: !process.env.CI, // Suppresses source map uploading logs during build (except in CI)
  
  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
  
  // Upload source maps only in production with valid auth token and DSN
  dryRun: process.env.NODE_ENV !== 'production' || 
          !hasValidSentryAuth || 
          !hasValidSentryDSN,
          
  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: process.env.NODE_ENV === 'production',
  
  // Release settings
  release: process.env.NEXT_PUBLIC_APP_VERSION || '2.1.0',
  
  // Source maps settings
  hideSourceMaps: process.env.NODE_ENV === 'production',
  widenClientFileUpload: true,
  
  // Route browser requests to Sentry through a Next.js rewrite
  tunnelRoute: "/monitoring",
  
  // Enable automatic Vercel cron monitoring
  automaticVercelMonitors: true,
  
  // Error handling - don't fail the build if source map upload fails
  errorHandler: (err, invokeErr, compilation) => {
    console.warn('Sentry source map upload failed:', err?.message || err);
    // Don't throw - this allows the build to continue
  },
};

// Production bundle analysis
if (process.env.ANALYZE === 'true') {
  const withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: true,
  });
  
  // Only wrap with Sentry if BOTH DSN and auth token are valid
  if (shouldEnableSentryWebpack) {
    console.log('Enabling Sentry webpack integration with bundle analyzer');
    module.exports = withBundleAnalyzer(withSentryConfig(nextConfig, sentryWebpackPluginOptions));
  } else {
    console.warn('Sentry not fully configured - skipping Sentry webpack integration for bundle analysis build');
    console.warn(`DSN valid: ${hasValidSentryDSN}, Auth token valid: ${hasValidSentryAuth}`);
    module.exports = withBundleAnalyzer(nextConfig);
  }
} else {
  // Only wrap with Sentry if BOTH DSN and auth token are valid
  if (shouldEnableSentryWebpack) {
    console.log('Enabling Sentry webpack integration');
    module.exports = withSentryConfig(nextConfig, sentryWebpackPluginOptions);
  } else {
    console.warn('Sentry not fully configured - skipping Sentry webpack integration.');
    console.warn(`DSN valid: ${hasValidSentryDSN}, Auth token valid: ${hasValidSentryAuth}`);
    console.warn('Error reporting will still work via client/server config files if DSN is valid.');
    module.exports = nextConfig;
  }
}


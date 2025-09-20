/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'prisma', 'bcryptjs'],
  },
  swcMinify: true,
  compress: true,
  poweredByHeader: false,
  
  // Configure caching headers for optimal performance
  async headers() {
    return [
      {
        // Cache Next.js static assets for 1 year
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Cache static files for 1 year
        source: '/(favicon.ico|robots.txt)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
      {
        // Cache API responses with revalidation
        source: '/api/players/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=300, s-maxage=600, stale-while-revalidate=300',
          },
        ],
      },
      {
        // Cache league data for 5 minutes
        source: '/api/league/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=300, s-maxage=300, stale-while-revalidate=300',
          },
        ],
      },
      {
        // Cache analytics for 10 minutes
        source: '/api/analytics/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=600, s-maxage=600, stale-while-revalidate=300',
          },
        ],
      },
      {
        // Short cache for real-time data
        source: '/api/(matchups|roster|lineup)/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=60, s-maxage=60, stale-while-revalidate=30',
          },
        ],
      },
      {
        // Cache pages for 1 hour with revalidation
        source: '/((?!api|_next).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=1800',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },
  
  // Image optimization for player photos and team logos
  images: {
    domains: ['sleeper.app', 'sleepercdn.com', 'a.espncdn.com'],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 604800, // 1 week in seconds
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  // Generate ETags for better caching
  generateEtags: true,
  webpack: (config, { isServer, buildId }) => {
    if (isServer) {
      // Ensure the export-detail.json file exists for Vercel
      const fs = require('fs');
      const path = require('path');
      const exportDetailPath = path.join(process.cwd(), '.next', 'export-detail.json');
      
      try {
        if (!fs.existsSync(exportDetailPath)) {
          const exportDir = path.dirname(exportDetailPath);
          if (!fs.existsSync(exportDir)) {
            fs.mkdirSync(exportDir, { recursive: true });
          }
          fs.writeFileSync(exportDetailPath, JSON.stringify({
            version: 1,
            hasExportPathMap: false,
            exportTrailingSlash: false,
            isNextImageImported: false
          }));
        }
      } catch (e) {
        // Ignore errors during webpack phase
      }
    }
    
    // Optimize bundle splitting for better caching
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 20,
            enforce: true,
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 10,
            enforce: true,
          },
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
            name: 'react',
            chunks: 'all',
            priority: 30,
            enforce: true,
          },
          prisma: {
            test: /[\\/]node_modules[\\/](@prisma)[\\/]/,
            name: 'prisma',
            chunks: 'all',
            priority: 25,
            enforce: true,
          },
        },
      };
    }
    
    return config;
  },
};

module.exports = nextConfig;
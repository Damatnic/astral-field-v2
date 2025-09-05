import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Enable experimental features for better performance
  experimental: {
    optimizePackageImports: [
      'lucide-react', 
      'framer-motion', 
      '@hookform/resolvers',
      'react-hook-form',
      'zustand'
    ],
    // Enable memory usage tracking
    memoryBasedWorkersCount: true,
    // Precompile React components
    ppr: false, // Partial Prerendering is still experimental
  },

  // Turbopack configuration (moved from experimental)
  turbopack: {
    rules: {
      // SVG handling for Turbopack
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },

  // Server external packages (moved from experimental)
  serverExternalPackages: ['pg', 'bcryptjs', 'pg-connection-string', 'pgpass'],

  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.sportsdata.io',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.vercel.app',
        port: '',
        pathname: '/**',
      }
    ],
    formats: ['image/avif', 'image/webp'],
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ]
  },

  // Redirects for SEO
  async redirects() {
    return [
      // Add any future redirects here
    ]
  },

  // Environment variables validation
  env: {
    NEXT_PUBLIC_SPORTSDATA_API_KEY: process.env.NEXT_PUBLIC_SPORTSDATA_API_KEY,
  },

  // Bundle optimization
  webpack: (config, { dev, isServer }) => {
    // Handle Node.js modules properly
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        dns: false,
        child_process: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
      }
    }

    // Ignore optional pg-native module
    if (!isServer) {
      config.externals = config.externals || []
      if (Array.isArray(config.externals)) {
        config.externals.push('pg-native')
      } else {
        config.externals = [config.externals, 'pg-native']
      }
    }

    // Optimize bundle size
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      }
    }
    
    return config
  },

  // TypeScript configuration
  typescript: {
    // Dangerously allow production builds to successfully complete even if
    // your project has TypeScript errors.
    ignoreBuildErrors: false,
  },

  // ESLint configuration  
  eslint: {
    // Only run ESLint on specific directories during production builds
    dirs: ['src'],
    // Don't fail build on ESLint warnings
    ignoreDuringBuilds: true,
  },

  // Output configuration for static export (if needed)
  trailingSlash: true,

  // Performance optimizations
  poweredByHeader: false,
  compress: true,

  // API routes configuration
  async rewrites() {
    return [
      {
        source: '/api/sports/:path*',
        destination: 'https://api.sportsdata.io/v3/nfl/:path*',
      },
    ]
  },
}

export default nextConfig
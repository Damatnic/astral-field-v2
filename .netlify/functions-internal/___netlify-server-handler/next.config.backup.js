/** @type {import('next').NextConfig} */
const nextConfig = {
  // Force standard server deployment (not edge/static)
  output: 'standalone',
  
  // Essential build configuration for Vercel deployment
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Optimizations
  swcMinify: true,
  compress: true,
  
  // Explicitly disable static export to fix export-detail.json error
  trailingSlash: false,
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
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
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live https://*.vercel-analytics.com https://*.sentry.io; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' blob: data: https:; font-src 'self' data: https://fonts.gstatic.com https://fonts.googleapis.com; connect-src 'self' https://*.sentry.io https://*.vercel-analytics.com wss://*.vercel.live https://api.sportsdata.io https://fonts.googleapis.com https://fonts.gstatic.com; frame-ancestors 'none';"
          }
        ]
      }
    ];
  },
  
  // Image optimization
  images: {
    domains: [],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '**.cloudfront.net',
      },
    ],
  },
  
  // API routes timeout
  async rewrites() {
    return [
      {
        source: '/health',
        destination: '/api/health',
      },
    ];
  },
  
  // Remove powered by header
  poweredByHeader: false,
  
  // Webpack configuration for better builds
  webpack: (config, { isServer, dev }) => {
    // Optimize for production builds
    if (!dev && !isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@': './src',
      };
    }
    
    return config;
  },
};

module.exports = nextConfig;
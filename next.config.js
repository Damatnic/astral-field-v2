/** @type {import('next').NextConfig} */
const nextConfig = {
  // CRITICAL: Do NOT use 'standalone' or 'export' output modes on Vercel
  // Vercel handles the deployment architecture automatically
  
  // Disable strict mode to avoid double renders in development
  reactStrictMode: false,
  
  // Allow build to complete even with linting/type errors
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Image optimization settings
  images: {
    domains: ['localhost', 'vercel.app', 'astralfield.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  
  // Performance optimizations
  swcMinify: true,
  compress: true,
  poweredByHeader: false,
  
  // Webpack configuration for client-side compatibility
  webpack: (config, { isServer }) => {
    // Handle node modules that should only run server-side
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        path: false,
        os: false,
        stream: false,
        buffer: false,
      };
    }
    
    // Add external packages for server-side
    if (isServer) {
      config.externals.push('@prisma/client', 'prisma', 'bcryptjs', 'bcrypt');
    }
    
    return config;
  },
  
  // Environment variables to expose to the browser
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'https://astralfield.com',
  },
  
  // Headers configuration for API routes
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, must-revalidate' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
    ];
  },
  
  // Redirects for legacy routes (if any)
  async redirects() {
    return [];
  },
  
  // Rewrites for API proxying (if needed)
  async rewrites() {
    return [];
  },
};

module.exports = nextConfig;
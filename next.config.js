/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove standalone output for Vercel - it handles this automatically
  // output: 'standalone',
  
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'prisma', 'bcryptjs', 'bcrypt'],
  },
  swcMinify: true,
  compress: true,
  poweredByHeader: false,
  
  // Add image configuration for optimization
  images: {
    domains: ['localhost', 'vercel.app', 'astralfield.com'],
    unoptimized: process.env.NODE_ENV === 'development',
  },
  
  // Webpack configuration to handle Edge Runtime issues
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't include certain modules on the client side
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    return config;
  },
  
  // Disable static optimization for problematic pages
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, must-revalidate' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
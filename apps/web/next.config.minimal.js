/** @type {import('next').NextConfig} */

// Minimal Next.js configuration to avoid jest-worker issues
const nextConfig = {
  // Essential settings only
  distDir: '.next',
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Minimal experimental features
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
  
  // Basic webpack configuration without workers
  webpack: (config, { isServer, dev, webpack }) => {
    // Only essential webpack modifications
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    // Block jest completely
    config.externals = config.externals || [];
    config.externals.push('jest-worker', 'jest', '@jest/core');
    
    return config;
  },
  
  // Essential headers only
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
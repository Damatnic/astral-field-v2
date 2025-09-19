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
};

module.exports = nextConfig;
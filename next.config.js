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
    return config;
  },
};

module.exports = nextConfig;
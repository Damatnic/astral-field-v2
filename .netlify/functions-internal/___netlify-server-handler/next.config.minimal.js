/** @type {import('next').NextConfig} */
const nextConfig = {
  // Minimal config to avoid export-detail.json error
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  }
};

module.exports = nextConfig;
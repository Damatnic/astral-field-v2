
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
  images: {
    domains: [
      'a.espncdn.com',
      's.espncdn.com',
      'static.www.nfl.com',
      'lh3.googleusercontent.com'
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.espncdn.com',
      },
      {
        protocol: 'https',
        hostname: 'static.www.nfl.com',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
  webpack: (config, { isServer, webpack }) => {
    // Handle node modules that don't work in the browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
        url: require.resolve('url'),
        zlib: require.resolve('browserify-zlib'),
        http: require.resolve('stream-http'),
        https: require.resolve('https-browserify'),
        assert: require.resolve('assert'),
        os: require.resolve('os-browserify'),
        path: require.resolve('path-browserify'),
      };
    }
    
    // Ignore warnings for punycode
    config.ignoreWarnings = [
      { module: /node_modules\/punycode/ },
      { file: /node_modules\/punycode/ },
    ];
    
    return config;
  },
  // Reduce bundle size
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
}

module.exports = nextConfig;

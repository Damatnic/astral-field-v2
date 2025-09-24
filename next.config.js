
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
  // PWA optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
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
      // PWA specific headers
      {
        source: '/manifest.json',
        headers: [
          { key: 'Content-Type', value: 'application/manifest+json' },
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript' },
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
        ],
      },
      // Static assets caching
      {
        source: '/(.*\\.(ico|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot))',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // App shell caching
      {
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
  webpack: (config, { buildId, dev, isServer, defaultLoaders, nextRuntime, webpack }) => {
    // Bundle analyzer in development
    if (dev && !isServer && process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'server',
          analyzerPort: 8888,
          openAnalyzer: false,
        })
      );
    }

    // Production optimizations
    if (!dev && !isServer) {
      // Split chunks for better caching
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 10,
            reuseExistingChunk: true,
          },
          common: {
            name: 'common',
            minChunks: 2,
            priority: 5,
            reuseExistingChunk: true,
          },
          // Separate chunk for heavy libraries
          charts: {
            test: /[\\/]node_modules[\\/](chart\.js|recharts|react-chartjs-2)[\\/]/,
            name: 'charts',
            chunks: 'all',
            priority: 20,
          },
          // Separate chunk for form libraries
          forms: {
            test: /[\\/]node_modules[\\/](react-hook-form|@hookform)[\\/]/,
            name: 'forms',
            chunks: 'all',
            priority: 20,
          },
          // Separate chunk for UI components
          ui: {
            test: /[\\/]node_modules[\\/](@radix-ui|framer-motion)[\\/]/,
            name: 'ui',
            chunks: 'all',
            priority: 20,
          }
        },
      };

      // Tree shaking optimization
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;
    }

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
        buffer: require.resolve('buffer'),
      };

      // Add buffer polyfill
      config.plugins.push(
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
          process: 'process/browser',
        })
      );
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

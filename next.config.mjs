/** @type {import('next').NextConfig} */

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1024mb',
    },
  },
};

const nextConfig = {
  // ==========================================
  // PERFORMANCE: Image Optimization
  // ==========================================
  images: {
    unoptimized: process.env.NODE_ENV === 'development',
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000, // 1 year cache
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '192.168.43.100',
        pathname: '/media/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        pathname: '/media/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        pathname: '/media/**',
      },
      {
        protocol: 'https',
        hostname: 'nyc3.digitaloceanspaces.com',
        pathname: '/storyvermo/**',
      },
      {
        protocol: 'https',
        hostname: 'storyvermo.nyc3.cdn.digitaloceanspaces.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.digitaloceanspaces.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.storyvermo.com',
        pathname: '/**',
      },
    ],
  },

  // ==========================================
  // PERFORMANCE: Compiler Optimizations
  // ==========================================
  compiler: {
    // Remove console.logs in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // Use SWC minifier (faster than Terser)
  swcMinify: true,

  // ==========================================
  // PERFORMANCE: Experimental Features
  // ==========================================
  experimental: {
    optimizeCss: true,
    optimizePackageImports: [
      '@fortawesome/react-fontawesome',
      '@fortawesome/free-solid-svg-icons',
      'lucide-react',
      'framer-motion',
      'lodash',
    ],
  },

  // ==========================================
  // PERFORMANCE: Webpack Bundle Optimization
  // ==========================================
  webpack: (config, { dev, isServer, webpack }) => {
    // Bundle analyzer in development
    if (process.env.ANALYZE === 'true' && !isServer) {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          reportFilename: './analyze/client.html',
          openAnalyzer: false,
        })
      );
    }

    // Optimize bundle splitting
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Separate vendor libraries
            lib: {
              test: /[\\/]node_modules[\\/]/,
              name(module) {
                const packageName = module.context.match(
                  /[\\/]node_modules[\\/](.*?)([\\/]|$)/
                )?.[1];
                return `npm.${packageName?.replace('@', '')}`;
              },
              priority: 10,
              minChunks: 1,
              reuseExistingChunk: true,
            },
            // Separate React/React-DOM
            react: {
              test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
              name: 'react',
              priority: 20,
              reuseExistingChunk: true,
            },
            // Heavy libraries in separate chunks
            commons: {
              test: /[\\/]node_modules[\\/](framer-motion|lodash|@tanstack)[\\/]/,
              name: 'commons',
              priority: 15,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }

    // Optimize module resolution
    config.resolve.alias = {
      ...config.resolve.alias,
      'lodash': 'lodash-es', // Use ES modules version
    };

    return config;
  },

  // ==========================================
  // PRODUCTION: Security & Headers
  // ==========================================
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|jpeg|png|gif|webp|avif|woff|woff2)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // ==========================================
  // PRODUCTION: Compression
  // ==========================================
  compress: true,

  // ==========================================
  // PRODUCTION: Output Settings
  // ==========================================
  output: 'standalone',
  poweredByHeader: false,

  // ==========================================
  // PERFORMANCE: React Strict Mode
  // ==========================================
  reactStrictMode: true,
};

export default nextConfig;
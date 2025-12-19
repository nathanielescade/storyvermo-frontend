/** @type {import('next').NextConfig} */

const nextConfig = {
  images: {
    // 🔥 CRITICAL: Disable Next.js image optimization since Django handles it
    unoptimized: true,
    
    // Keep remote patterns for security (still needed even with unoptimized)
    remotePatterns: [
      // Local development backend
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
      // DigitalOcean Spaces - multiple patterns to cover all variations
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

  // Enable CSS optimization to reduce and inline critical CSS where possible
  experimental: {
    optimizeCss: true,
  },

  // 🔥 Production optimizations
  compiler: {
    // Remove console.logs in production
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // 🔥 OPTIMIZED: Enable Turbopack for faster builds
  turbopack: {
    resolveAlias: {
      '@': './src',
    },
  },

  // Development UI indicators
  devIndicators: {
    buildActivity: true,
    buildActivityPosition: 'top-right',
  },

  // 🔥 HTTP Link headers for preconnect (sent with page, browser sees these first!)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Link',
            value: '</api.storyvermo.com>; rel=preconnect; crossorigin, </nyc3.digitaloceanspaces.com>; rel=preconnect; crossorigin, </storyvermo.nyc3.cdn.digitaloceanspaces.com>; rel=preconnect; crossorigin',
          },
        ],
      },
    ];
  },
};
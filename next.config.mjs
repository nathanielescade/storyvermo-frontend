/** @type {import('next').NextConfig} */

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1024mb', // match your Nginx & Django limits
    },
  },
};

const nextConfig = {
  eslint: {
    // Allow deprecated Tailwind class names during build (they still work)
    ignoreDuringBuilds: true,
  },
  images: {
    // Let Next.js optimize remote images in production. In development it's fine
    // to leave images unoptimized for local workflows.
    unoptimized: process.env.NODE_ENV === 'development',
    // Prefer modern formats when possible to reduce transfer sizes
    formats: ['image/avif', 'image/webp'],
    // 🔥 AGGRESSIVE: Reduce quality to 60-75 for feed images (user won't notice on mobile)
    qualities: [60, 75],
    // 🔥 OPTIMIZED: Reduce device sizes to common breakpoints only
    deviceSizes: [320, 640, 768, 1024],
    // 🔥 OPTIMIZED: Smaller image sizes for thumbnails and avatars
    imageSizes: [32, 48, 64, 96],
    // 🔥 AGGRESSIVE: Cache optimized remote images longer (6 hours)
    minimumCacheTTL: 21600,
    // 🔥 OPTIMIZED: Aggressive dangerously allow SVG optimization
    dangerouslyAllowSVG: false,
    remotePatterns: [
      // Local development backend
      {
        protocol: 'http',
        hostname: '10.188.1.100',
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

  // 🔥 OPTIMIZED: Enable Turbopack (default in Next.js 16) with optimized config
  turbopack: {
    resolveAlias: {
      '@': './src',
    },
  },

  // Development UI indicators (show small build/reload indicator in dev)
  devIndicators: {
    buildActivity: true,
    buildActivityPosition: 'top-right',
  },
};

export default nextConfig;
/** @type {import('next').NextConfig} */

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1024mb', // match your Nginx & Django limits
    },
  },
};

const nextConfig = {
  images: {
    // Let Next.js optimize remote images in production. In development it's fine
    // to leave images unoptimized for local workflows.
    unoptimized: process.env.NODE_ENV === 'development',
    // Prefer modern formats when possible to reduce transfer sizes
    formats: ['image/avif', 'image/webp'],
      // Quality presets supported by Next Image (add any values used across app)
      qualities: [75, 90],
    // Device widths Next.js will generate images for (reduce if you want fewer sizes)
    deviceSizes: [320, 420, 768, 1024, 1280, 1600],
    // Additional image sizes used for srcset
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Cache optimized remote images at least 1 hour (3600s)
    minimumCacheTTL: 3600,
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

  // Development UI indicators (show small build/reload indicator in dev)
  devIndicators: {
    buildActivity: true,
    buildActivityPosition: 'top-right',
  },
};

export default nextConfig;
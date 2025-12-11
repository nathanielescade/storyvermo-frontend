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
    // Optimize images in production, unoptimized only in development for local IPs
    unoptimized: process.env.NODE_ENV === 'development',
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
};

export default nextConfig;
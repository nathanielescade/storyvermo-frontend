/** @type {import('next').NextConfig} */

const nextConfig = {
  images: {
    remotePatterns: [
      // Local development patterns
      {
        protocol: 'http',
        hostname: '192.168.43.100',
        port: '8000',
        pathname: '/media/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
        pathname: '/media/**',
      },
      {
        protocol: 'https',
        hostname: 'api.storyvermo.com',
        pathname: '/media/**',
      },
      // DigitalOcean Spaces CDN pattern
      {
        protocol: 'https',
        hostname: 'storyvermospace.nyc3.cdn.digitaloceanspaces.com',
        pathname: '/media/**',
      },
    ],
  },
};

export default nextConfig;
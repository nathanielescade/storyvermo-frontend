/** @type {import('next').NextConfig} */

const nextConfig = {
  images: {
    remotePatterns: [
      // -----------------------------------------------------------
      // 1. DIGITALOCEAN SPACES CDN (New Production Endpoint)
      // -----------------------------------------------------------
      {
        protocol: 'https',
        // This hostname must match your CDN endpoint exactly (without the media folder)
        hostname: 'storyvermo.nyc3.cdn.digitaloceanspaces.com', 
        // No port needed for standard HTTPS
        pathname: '/media/**',
      },
      // -----------------------------------------------------------
      // 2. KEEPING LOCAL DEVELOPMENT (If you need to test locally)
      // -----------------------------------------------------------
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
      // -----------------------------------------------------------
      // 3. REMOVE/UPDATE API HOSTNAME
      // -----------------------------------------------------------
      // The API server no longer serves media. We can remove this 
      // since the CDN pattern now covers production media delivery.
      // {
      //   protocol: 'https',
      //   hostname: 'api.storyvermo.com',
      //   pathname: '/media/**',
      // },
    ],
  },
};

export default nextConfig;
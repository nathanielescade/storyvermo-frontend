/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '192.168.1.133',
        port: '8000',
        pathname: '/media/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
        pathname: '/media/**',
      }
      ,
      // Allow images served from the production API host
      {
        protocol: 'https',
        hostname: 'api.storyvermo.com',
        pathname: '/media/**',
      }
    ],
  },
};

export default nextConfig;

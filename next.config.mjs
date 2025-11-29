/** @type {import('next').NextConfig} */

const nextConfig = {
  images: {
    remotePatterns: [
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
        hostname: 'storyvermo.nyc3.cdn.digitaloceanspaces.com', 
        pathname: '/**',
      },
      // Add any other domains where your images might be hosted
    ],
  },
};

export default nextConfig;
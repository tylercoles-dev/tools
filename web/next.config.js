/** @type {import('next').NextConfig} */
const nextConfig = {
  // API routes configuration
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.API_BASE_URL 
          ? `${process.env.API_BASE_URL}/api/:path*`
          : 'http://localhost:3000/api/:path*',
      },
    ];
  },
  // Environment variables
  env: {
    API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:3000',
    WS_BASE_URL: process.env.WS_BASE_URL || 'ws://localhost:3000',
    APP_ENV: process.env.NODE_ENV || 'development',
  },
  // Image optimization
  images: {
    domains: ['localhost'],
  },
  // Webpack configuration for shared types
  webpack: (config, { isServer }) => {
    // Allow importing TypeScript files from shared types
    config.resolve.alias = {
      ...config.resolve.alias,
      '@mcp-tools/core': require('path').resolve(__dirname, '../core/dist'),
      '@mcp-tools/core/shared': require('path').resolve(__dirname, '../core/dist/shared'),
    };
    
    return config;
  },
  // Output configuration
  output: 'standalone',
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Output standalone build — required for Hostinger Node.js hosting
  output: 'standalone',

  // Compress responses
  compress: true,

  // Power header
  poweredByHeader: false,

  // Image optimization
  images: {
    remotePatterns: [],
  },

  // Environment variables available client-side
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME ?? 'RepriceGuard',
  },
};

export default nextConfig;

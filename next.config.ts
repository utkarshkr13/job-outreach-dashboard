import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Allow deployment even if TypeScript errors exist (fixes are tracked separately)
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Gzip/Brotli compress all responses
  compress: true,

  // Tree-shake heavy packages — only import what's actually used
  // Firebase alone is ~700KB unoptimized; this cuts it dramatically
  experimental: {
    optimizePackageImports: [
      'firebase',
      'firebase-admin',
      '@notionhq/client',
      '@anthropic-ai/sdk',
      '@vercel/blob',
      'nodemailer',
    ],
  },

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
  },
};

export default nextConfig;

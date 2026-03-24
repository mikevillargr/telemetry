import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@gr-bi/shared'],
  allowedDevOrigins: ['http://127.0.0.1:*', 'http://localhost:*'],
  experimental: {
    proxyTimeout: 120_000, // 2 min for long-running AI calls (analyze, agents)
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/:path*`,
      },
      {
        source: '/auth/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/auth/:path*`,
      },
    ];
  },
};

export default nextConfig;

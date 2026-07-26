import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react', '@repo/ui', 'next-intl'],
  },
  poweredByHeader: false,
  compress: true,
  async headers() {
    return [
      {
        source: '/(.*\\.(?:svg|ico|webp|png|jpg|jpeg|woff2))',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/:path*',
        headers: [{ key: 'X-DNS-Prefetch-Control', value: 'on' }],
      },
    ];
  },
  outputFileTracingRoot: path.join(__dirname, '../../'),
  transpilePackages: [
    '@repo/ui',
    '@repo/core',
    '@repo/db',
    '@repo/feature-auth',
    '@repo/agents',
    '@repo/ai',
    '@repo/mcp',
    '@repo/i18n',
  ],
  serverExternalPackages: [
    'playwright',
    'playwright-core',
    'sharp',
    '@repo/browser',
    '@repo/automation',
  ],
  env: {
    NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : []),
        'playwright',
        'playwright-core',
        '@repo/browser',
      ];
    }
    return config;
  },
};

export default withNextIntl(nextConfig);

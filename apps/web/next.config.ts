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
  async redirects() {
    return [
      /** Sprint Product Trust — canonical entry /workspace (CPO sign-off) */
      { source: '/validation', destination: '/workspace', permanent: false },
      { source: '/who', destination: '/workspace', permanent: false },
      { source: '/workflow', destination: '/workspace', permanent: false },
      { source: '/dashboard', destination: '/workspace', permanent: false },
      { source: '/decision-center', destination: '/workspace', permanent: false },
      { source: '/execution', destination: '/workspace', permanent: false },
      { source: '/goal', destination: '/workspace', permanent: false },
      { source: '/investigate', destination: '/workspace', permanent: false },
      { source: '/conclusion', destination: '/workspace', permanent: false },
      { source: '/my-projects', destination: '/workspace', permanent: false },
      {
        source: '/my-projects/:id/interview',
        destination: '/workspace?project=:id',
        permanent: false,
      },
      {
        source: '/my-projects/:id',
        destination: '/workspace?project=:id',
        permanent: false,
      },
      { source: '/projects/new', destination: '/workspace', permanent: false },
      { source: '/projects', destination: '/workspace', permanent: false },
      {
        source: '/projects/:id/:path*',
        destination: '/workspace?project=:id',
        permanent: false,
      },
      {
        source: '/projects/:id',
        destination: '/workspace?project=:id',
        permanent: false,
      },
      { source: '/workspaces', destination: '/workspace', permanent: false },
      { source: '/reports', destination: '/workspace', permanent: false },
      { source: '/evidence', destination: '/workspace', permanent: false },
      { source: '/research', destination: '/workspace', permanent: false },
      { source: '/voc', destination: '/workspace', permanent: false },
      { source: '/competitors', destination: '/workspace', permanent: false },
      { source: '/validation-score', destination: '/workspace', permanent: false },
      { source: '/government-grants', destination: '/workspace', permanent: false },
      { source: '/naver-commerce', destination: '/workspace', permanent: false },
    ];
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

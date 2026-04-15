import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@ai-platform/shared'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.mountsea.ai' },
      { protocol: 'https', hostname: '**.googleapis.com' },
      { protocol: 'https', hostname: '**.openai.com' },
      { protocol: 'https', hostname: '**.suno.ai' },
    ],
  },
};

export default withNextIntl(nextConfig);

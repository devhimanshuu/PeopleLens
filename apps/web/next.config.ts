import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ['@peoplelens/ui', '@peoplelens/types'],
};

export default nextConfig;

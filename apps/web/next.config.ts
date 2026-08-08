import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ['@peoplelens/ui', '@peoplelens/types'],
  // The app renders no <Image> components (all visuals are CSS/SVG), so the
  // native `sharp` optimizer is pure overhead — and on Windows it can crash
  // the server (STATUS_STACK_BUFFER_OVERRUN) when handed a missing asset.
  // Disabling optimization removes that failure vector entirely.
  images: { unoptimized: true },
};

export default nextConfig;

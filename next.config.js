// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Pick one output mode – don’t declare it twice.
  // If you’re deploying as a standalone server:
  output: 'standalone',
  // If instead you meant to export a static site, use:
  // output: 'export',

  webpack(config) {
    // Stub out the native `canvas` module everywhere
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      canvas: false,
    };
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      canvas: false,
    };

    return config;
  },
};

module.exports = nextConfig;

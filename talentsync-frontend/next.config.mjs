/** @type {import('next').NextConfig} */
const nextConfig = {

  // Production optimizations
  compress: true,  // Enable gzip compression
  poweredByHeader: false,  // Remove X-Powered-By header

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },

  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Turbopack config (Next.js 16 default)
  turbopack: {},

  // Experimental features
  experimental: {
    // optimizeCss: true, // Requires 'critters' which is missing
    scrollRestoration: true,
  },

  // Headers for caching
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;

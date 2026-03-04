/** @type {import('next').NextConfig} */

const nextConfig = {
  // Enable strict mode for better React debugging
  reactStrictMode: true,

  // Image optimization settings
  images: {
    // Allow images from these domains
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '**.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '**.getstream.io',
      },
      {
        protocol: 'https',
        hostname: 'stream-io-cdn.com',
      },
      {
        protocol: 'https',
        hostname: '**.stream-io-cdn.com',
      },
    ],
  },

  // Experimental features
  experimental: {
    // Enable server actions
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },

  // Fix lockfile detection — tell Turbopack this is the project root
  turbopack: {
    root: process.cwd(),
  },

  // Custom redirects to fix missing language prefix issues (e.g., /auth → /en/auth)
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          { type: 'query', key: 'lang', value: undefined },
        ],
        destination: '/en/:path*',
        permanent: true,
      },
    ]
  },
}

module.exports = nextConfig;
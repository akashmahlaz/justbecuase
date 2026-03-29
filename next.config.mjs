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
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
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

  // SEO: Security & caching headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      {
        // Cache static assets aggressively
        source: '/(.*)\\.(ico|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ]
  },

  // SEO: Redirect trailing slashes for consistent URLs
  async redirects() {
    return [
      {
        source: '/:path+/',
        destination: '/:path+',
        permanent: true,
      },
    ]
  },
}

export default nextConfig;
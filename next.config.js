/** @type {import('next').NextConfig} */
const nextConfig = {
  // Self-hosted production build: emits .next/standalone with only the
  // runtime files we actually need, so deploying to a Hetzner box is
  // `node .next/standalone/server.js` plus the static-files copy step.
  // No-op in dev.
  output: 'standalone',
  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'i.vimeocdn.com',
      },
      {
        protocol: 'https',
        hostname: 'assets.faahm.com',
      },
      {
        protocol: 'https',
        hostname: '*.r2.cloudflarestorage.com',
      },
    ],
  },
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
  // 301 redirects for paths inherited from the old platform. Permanent so
  // Google updates its index instead of treating new URLs as duplicates of
  // the dead ones. Anything not matched here falls through to app/not-found.tsx,
  // which 307s the visitor onto /dashboard or /login depending on auth.
  async redirects() {
    return [
      // Old /p/* product pages
      { source: '/p/n8n', destination: '/course/n8n', permanent: true },
      { source: '/p/vibe-coding', destination: '/course/vibe-coding', permanent: true },
      { source: '/p/ai-video', destination: '/course/ai-video', permanent: true },
      { source: '/p/subscriptions', destination: '/pricing', permanent: true },
      { source: '/p/pricing', destination: '/pricing', permanent: true },
      { source: '/p/login', destination: '/login', permanent: true },
      { source: '/p/dashboard', destination: '/dashboard', permanent: true },
      { source: '/p/signup', destination: '/signup', permanent: true },
      { source: '/p/about', destination: '/about', permanent: true },
      { source: '/p/contact', destination: '/help', permanent: true },
      { source: '/p/help', destination: '/help', permanent: true },
      { source: '/p/faq', destination: '/faq', permanent: true },
      { source: '/p/terms', destination: '/terms', permanent: true },
      { source: '/p/privacy', destination: '/privacy', permanent: true },
      { source: '/p/refund', destination: '/refund', permanent: true },
      // Catch-all for any other /p/* path — sends to home so it stops being
      // a dead end on Google.
      { source: '/p/:rest*', destination: '/', permanent: true },
    ];
  },
  // Experimental features
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

module.exports = nextConfig;

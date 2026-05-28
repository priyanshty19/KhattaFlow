/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: true,
  },
  serverExternalPackages: ['prisma'],
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/(.*)',
        headers: [
          {
            // Allow Clerk widgets + Cloudflare Turnstile (bot challenge) to load fully.
            // Without frame-src/connect-src entries, the Cloudflare iframe can't talk to
            // its parent and the sign-up widget hangs on a spinner.
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://*.clerk.com https://clerk.myfingrid.com",
              "style-src 'self' 'unsafe-inline' https://*.clerk.com",
              "img-src 'self' data: blob: https://*.clerk.com https://*.gravatar.com https://img.clerk.com",
              "font-src 'self' data:",
              "frame-src 'self' https://challenges.cloudflare.com https://*.clerk.com https://clerk.myfingrid.com https://accounts.google.com",
              "connect-src 'self' https://*.clerk.com https://clerk.myfingrid.com https://challenges.cloudflare.com wss://*.clerk.com",
              "worker-src 'self' blob:",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig

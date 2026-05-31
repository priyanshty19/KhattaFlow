/** @type {import('next').NextConfig} */

// ── Content-Security-Policy: local vs production ────────────────────────────
// Production Clerk serves its Frontend API + JS from the CNAME clerk.myfingrid.com.
// DEVELOPMENT Clerk instances (pk_test_ keys) instead serve from *.clerk.accounts.dev
// (e.g. next-buffalo-55.clerk.accounts.dev). If those dev origins aren't allowed,
// the browser blocks Clerk's script on localhost and the <SignIn>/<SignUp> widget
// renders blank. We add the dev origins ONLY in development so the production CSP
// stays tight.
const isProd = process.env.NODE_ENV === 'production'

const clerkScript = ['https://*.clerk.com', 'https://clerk.myfingrid.com']
const clerkStyle = ['https://*.clerk.com']
const clerkImg = ['https://*.clerk.com', 'https://img.clerk.com']
const clerkFrame = ['https://*.clerk.com', 'https://clerk.myfingrid.com']
const clerkConnect = ['https://*.clerk.com', 'https://clerk.myfingrid.com', 'wss://*.clerk.com']

if (!isProd) {
  clerkScript.push('https://*.clerk.accounts.dev')
  clerkStyle.push('https://*.clerk.accounts.dev')
  clerkImg.push('https://*.clerk.accounts.dev')
  clerkFrame.push('https://*.clerk.accounts.dev')
  clerkConnect.push('https://*.clerk.accounts.dev', 'wss://*.clerk.accounts.dev')
}

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com ${clerkScript.join(' ')}`,
  `style-src 'self' 'unsafe-inline' ${clerkStyle.join(' ')}`,
  `img-src 'self' data: blob: https://*.gravatar.com https://challenges.cloudflare.com ${clerkImg.join(' ')}`,
  "font-src 'self' data:",
  `frame-src 'self' https://challenges.cloudflare.com https://accounts.google.com ${clerkFrame.join(' ')}`,
  // Turnstile uses a Web Worker for invisible/smart challenge processing.
  `connect-src 'self' https://challenges.cloudflare.com https://*.cloudflare.com ${clerkConnect.join(' ')}`,
  // Without challenges.cloudflare.com in worker-src the worker is killed silently
  // and the CAPTCHA token is never generated — causing the desktop form to hang.
  "worker-src 'self' blob: https://challenges.cloudflare.com",
  // Clickjacking: MyFinGrid is never legitimately embedded in another site's frame.
  "frame-ancestors 'none'",
].join('; ')

// ── Baseline security headers (applied to every route alongside the CSP) ─────
// All are response-tightening only and don't affect Clerk/Turnstile, which load
// in CHILD frames (frame-src) rather than framing us. HSTS is ignored by browsers
// over http://localhost, so it's safe in development too.
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
]

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
            value: csp,
          },
          ...securityHeaders,
        ],
      },
    ]
  },
}

module.exports = nextConfig

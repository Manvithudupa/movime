/** @type {import('next').NextConfig} */
const { withSentryConfig } = require('@sentry/nextjs')

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
      },
      {
        protocol: 'https',
        hostname: 'raw.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      }
    ],
    // Serve raw image URLs instead of routing them through the host's
    // image optimizer (e.g. Vercel). Proxying/caching is handled by
    // ProxyImage via NEXT_PUBLIC_IMAGE_PROXY.
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            // SECURITY: stop browsers MIME-sniffing responses (blocks a class
            // of XSS where an attacker's upload is served as text/html).
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          {
            // Only honored over HTTPS (Vercel is always HTTPS). Browsers
            // ignore HSTS received over plain HTTP, so local dev is unaffected.
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          {
            // Hardening directives that cannot break the app: no <object>/<embed>
            // content, no <base> tag, and every form posts same-origin. A full
            // script-src/frame-src policy is intentionally NOT set here — Next.js
            // inline scripts and the third-party embed players would require
            // nonce support and per-provider frame-src entries that need live
            // verification against the deployed site.
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self'; object-src 'none'; base-uri 'self'; form-action 'self';",
          },
        ],
      },
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
      {
        // SECURITY: API responses carry authenticated user data (watchlist,
        // profile, settings). Never mark them cacheable — 'public' would let a
        // shared cache store one user's data and replay it to another. This
        // rule is matched after the generic rule above and overrides it.
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, no-cache, no-store, must-revalidate',
          },
        ],
      },
      {
        source: '/_next/image(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
    ];
  },
}

module.exports = withSentryConfig(nextConfig, {
  // Source map uploads require a SENTRY_AUTH_TOKEN; keep them disabled so the
  // build works even before a token is configured. Error capture still works.
  sourcemaps: { disable: true },
  silent: true,
  telemetry: false,
})

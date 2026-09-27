/** @type {import('next').NextConfig} */
const { withSentryConfig } = require('@sentry/nextjs')

const isProd = process.env.NODE_ENV === 'production'

// Content-Security-Policy.
//
// script-src keeps 'unsafe-inline' because Next.js emits inline hydration
// scripts and a nonce would require threading a per-request value through the
// whole tree. It still blocks scripts from any origin we did not list, which is
// the main defence. 'unsafe-eval' is added only for local dev (HMR needs it).
// img/media allow any https host because posters/backdrops are proxied through
// the configurable NEXT_PUBLIC_IMAGE_PROXY; the app-level host allowlist in
// lib/imageHosts.ts still constrains what is actually rendered.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? '' : " 'unsafe-eval'"} https://va.vercel-scripts.com https://*.sentry.io https://*.ingest.sentry.io`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.themoviedb.org https://graphql.anilist.co https://vitals.vercel-insights.com https://images.weserv.nl https://*.sentry.io https://*.ingest.sentry.io",
  // The watch page iframes these embed providers (see lib/sources.ts).
  "frame-src https://cinemaos.tech https://vidnest.fun https://mapple.rip https://vidsrc.rip https://vidsrc.su https://vidsrc.sbs https://vidsrcme.ru https://vidsrc.nl https://vidsrc.pm https://vidlink.pro https://player.videasy.net https://vidfast.pro https://player.vidzee.wtf https://cinesrc.st https://www.youtube.com https://www.youtube-nocookie.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join('; ')

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
            key: 'Content-Security-Policy',
            value: CONTENT_SECURITY_POLICY,
          },
          {
            // Isolate our browsing context from any window.opener references.
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            // Our resources are only meant to be loaded by same-origin pages.
            key: 'Cross-Origin-Resource-Policy',
            value: 'same-origin',
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

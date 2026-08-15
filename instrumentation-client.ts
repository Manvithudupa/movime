import * as Sentry from '@sentry/nextjs'

// Client bundle can only read NEXT_PUBLIC_ variables. Without a DSN this whole
// file is a no-op — the site keeps working normally.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    // Capture errors only, not full session replays, to keep the bundle small.
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  })
}

// Instrument client-side navigations for Sentry.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart

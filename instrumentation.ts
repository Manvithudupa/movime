import * as Sentry from '@sentry/nextjs'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

// Capture server-side request errors (API route failures, server component
// errors) via Sentry. No-op unless a DSN is configured.
export const onRequestError = Sentry.captureRequestError

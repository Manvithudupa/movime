'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN
    if (dsn) {
      Sentry.captureException(error)
    }
  }, [error])

  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#000', color: '#fff', fontFamily: 'sans-serif' }}>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            textAlign: 'center',
            padding: '24px',
          }}
        >
          <h1 style={{ fontSize: '28px', margin: 0 }}>Something went wrong</h1>
          <p style={{ color: '#9ca3af', margin: 0 }}>
            An unexpected error occurred. Please refresh the page to try again.
          </p>
          {/* Plain anchor is intentional here: after a crash a full page
              reload is the most reliable recovery. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/"
            style={{
              marginTop: '8px',
              padding: '10px 20px',
              background: '#fff',
              color: '#000',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            Back to Home
          </a>
        </div>
      </body>
    </html>
  )
}

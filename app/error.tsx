'use client'

import React, { useEffect } from 'react'
import Link from 'next/link'

/**
 * Root route error boundary. Without this, an error thrown while rendering any
 * page fell through to Next's default error screen. This keeps the app's look
 * and gives the user a one-click recovery (retry, or head home).
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Surfaced to Sentry as well when a DSN is configured.
    console.error('Route error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <h1 className="text-2xl font-semibold mb-2">Something went wrong</h1>
        <p className="text-gray-400 text-sm mb-6">
          An unexpected error occurred while loading this page. You can try again or head back home.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="px-5 py-2.5 rounded-sm bg-white text-black text-sm font-semibold hover:bg-gray-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          >
            Try again
          </button>
          <Link
            href="/"
            className="px-5 py-2.5 rounded-sm bg-white/10 border border-white/20 text-sm font-medium hover:bg-white/20 transition-colors"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  )
}

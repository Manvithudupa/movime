import { NextRequest, NextResponse } from 'next/server'
import { rateLimitGlobal, rateLimitResponse } from '@/lib/rateLimit'

// Server-side proxy for the TMDB API.
//
// SECURITY: the TMDB key used to be exposed via NEXT_PUBLIC_TMDB_API_KEY and
// inlined into the client bundle, where anyone could scrape it. All TMDB
// requests now go through this route, which injects the key server-side.
// The preferred key is the server-only TMDB_API_KEY; NEXT_PUBLIC_TMDB_API_KEY
// is kept only as a fallback for existing deployments that never set the
// server key (and should be removed once migrated).
const TMDB_API_URL = 'https://api.themoviedb.org/3'
const TMDB_SERVER_KEY =
  process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY || ''

// The client only ever requests paths we construct in lib/utils.ts, but the
// proxy still validates every segment as defense-in-depth (no traversal,
// printable URL-path characters only).
const MAX_SEGMENTS = 10
const SEGMENT_RE = /^[a-zA-Z0-9._-]+$/

export async function GET(request: NextRequest) {
  // Keep this tight enough to stop scripted abuse of the proxy but loose
  // enough for normal browsing — the client caches every URL for 10 minutes
  // and the proxy caches upstream responses for an hour too, so a real user
  // issues far fewer than one request per second per URL.
  const limited = await rateLimitGlobal(request, { limit: 240, windowMs: 60 * 1000, keyPrefix: 'tmdb-proxy' })
  if (!limited.success) return rateLimitResponse(limited)

  const { pathname, searchParams } = new URL(request.url)
  const slug = pathname.replace(/^\/api\/tmdb\/?/, '').split('/').filter(Boolean)

  if (
    slug.length === 0 ||
    slug.length > MAX_SEGMENTS ||
    slug.some((segment) => !SEGMENT_RE.test(segment))
  ) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
  }

  if (!TMDB_SERVER_KEY) {
    return NextResponse.json({ error: 'TMDB API key is not configured' }, { status: 500 })
  }

  // Forward the query string but always override the API key with the
  // server-side one, so a client-supplied api_key can never be used.
  const params = new URLSearchParams(searchParams)
  params.set('api_key', TMDB_SERVER_KEY)
  params.set('language', params.get('language') || 'en-US')

  try {
    const response = await fetch(`${TMDB_API_URL}/${slug.join('/')}?${params.toString()}`, {
      headers: { Accept: 'application/json' },
      // Cache upstream responses for an hour. Next's data cache serves the
      // stale copy instantly and refreshes it in the background, so popular
      // pages don't hammer TMDB while the content stays fresh.
      next: { revalidate: 3600 },
    })
    const data = await response.json()
    return NextResponse.json(data, { status: response.ok ? 200 : 502 })
  } catch (error) {
    console.error('TMDB proxy error:', error)
    return NextResponse.json({ error: 'Upstream TMDB request failed' }, { status: 502 })
  }
}

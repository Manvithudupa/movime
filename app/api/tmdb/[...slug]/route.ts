import { NextRequest, NextResponse } from 'next/server'
import { rateLimitGlobal, rateLimitResponse } from '@/lib/rateLimit'

// Server-side proxy for the TMDB API.
//
// SECURITY: the TMDB key used to be exposed via NEXT_PUBLIC_TMDB_API_KEY and
// inlined into the client bundle, where anyone could scrape it. All TMDB
// requests now go through this route, which injects the key server-side using
// the server-only TMDB_API_KEY.
const TMDB_API_URL = 'https://api.themoviedb.org/3'

// The client only ever requests paths we construct in lib/utils.ts, but the
// proxy still validates every segment as defense-in-depth (no traversal,
// printable URL-path characters only).
const MAX_SEGMENTS = 10
const SEGMENT_RE = /^[a-zA-Z0-9._-]+$/

// First segments the app actually uses (lib/utils.ts) plus the two harmless
// metadata endpoints. Anything else (account, authentication, lists, …) is
// rejected so this route can never be used as a general TMDB relay.
const ALLOWED_FIRST_SEGMENTS = new Set([
  'movie',
  'tv',
  'search',
  'trending',
  'discover',
  'genre',
  'person',
  'configuration',
])

// '.' and '..' would let a crafted path climb out of the intended API prefix.
const isDotOnlySegment = (segment: string) => /^\.+$/.test(segment)

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
    slug.some((segment) => !SEGMENT_RE.test(segment) || isDotOnlySegment(segment)) ||
    !ALLOWED_FIRST_SEGMENTS.has(slug[0])
  ) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
  }

  const apiKey = process.env.TMDB_API_KEY || ''
  if (!apiKey) {
    return NextResponse.json({ error: 'TMDB API key is not configured' }, { status: 500 })
  }

  // Forward the query string but always override the API key with the
  // server-side one, so a client-supplied api_key can never be used.
  const params = new URLSearchParams(searchParams)
  params.set('api_key', apiKey)
  params.set('language', params.get('language') || 'en-US')

  try {
    const response = await fetch(`${TMDB_API_URL}/${slug.join('/')}?${params.toString()}`, {
      headers: { Accept: 'application/json' },
      // Cache upstream responses for an hour. Next's data cache serves the
      // stale copy instantly and refreshes it in the background, so popular
      // pages don't hammer TMDB while the content stays fresh.
      next: { revalidate: 3600 },
    })
    const data = await response.json().catch(() => ({ error: 'Upstream TMDB returned an invalid response' }))

    // Pass the client-actionable statuses through unchanged so callers can
    // distinguish "this title does not exist" (404) and "back off" (429) from
    // a genuine proxy/upstream failure.
    if (response.status === 404 || response.status === 429) {
      const headers: Record<string, string> = {}
      const retryAfter = response.headers.get('retry-after')
      if (response.status === 429 && retryAfter) headers['Retry-After'] = retryAfter
      return NextResponse.json(data, { status: response.status, headers })
    }

    return NextResponse.json(data, { status: response.ok ? 200 : 502 })
  } catch (error) {
    console.error('TMDB proxy error:', error)
    return NextResponse.json({ error: 'Upstream TMDB request failed' }, { status: 502 })
  }
}

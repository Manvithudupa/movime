import { NextRequest, NextResponse } from 'next/server'

// In-memory sliding-window rate limiter for API routes.
//
// NOTE: On serverless platforms (e.g. Vercel) each function instance keeps its
// own in-memory state, so limits are enforced per instance rather than globally
// across all instances. This still stops casual abuse — like spamming the
// contact form to burn through the Resend quota — and requires no external
// service. For strict global limits, replace this with a shared store such as
// Upstash Redis.

interface RateLimitOptions {
  limit: number
  windowMs: number
  keyPrefix: string
}

interface RateLimitResult {
  success: boolean
  remaining: number
  retryAfterSeconds: number
}

// Bucket per "prefix:ip". Entries expire naturally and are pruned lazily.
const buckets = new Map<string, { count: number; resetAt: number }>()

// Keep the map bounded even if an attacker rotates IPs through a proxy.
const MAX_BUCKETS = 10_000

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp
  return 'unknown'
}

export function rateLimit(request: NextRequest, options: RateLimitOptions): RateLimitResult {
  const now = Date.now()
  const key = `${options.keyPrefix}:${getClientIp(request)}`

  // Lazy prune so the map never grows unboundedly.
  if (buckets.size >= MAX_BUCKETS) {
    for (const [k, b] of buckets) {
      if (b.resetAt <= now) buckets.delete(k)
    }
  }

  const bucket = buckets.get(key)

  // First request from this IP in the window (or window expired) — start fresh.
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs })
    return { success: true, remaining: options.limit - 1, retryAfterSeconds: 0 }
  }

  if (bucket.count >= options.limit) {
    return {
      success: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
    }
  }

  bucket.count += 1
  return { success: true, remaining: options.limit - bucket.count, retryAfterSeconds: 0 }
}

export function rateLimitResponse(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    { error: 'Too many requests. Please slow down and try again later.' },
    {
      status: 429,
      headers: { 'Retry-After': String(Math.max(result.retryAfterSeconds, 1)) },
    }
  )
}

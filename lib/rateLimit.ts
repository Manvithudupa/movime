import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

// Rate limiter for API routes.
//
// Two layers:
//  1. `rateLimit` — an in-memory sliding-window limiter. On serverless
//     platforms (e.g. Vercel) each function instance keeps its own state, so
//     limits are enforced per instance. This still stops casual abuse (spam
//     bots, quota burners) and needs no external service.
//  2. `rateLimitGlobal` — the same limits enforced across ALL instances via
//     Upstash Redis, when UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
//     are configured. Without those env vars it transparently falls back to
//     the in-memory limiter (and also falls back if Redis errors at runtime),
//     so enabling it is purely additive and never breaks the site.

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

// Cap the map so a flood of unique (spoofed) IPs can never grow memory
// without bound. 5_000 entries is a few hundred KB at most.
const MAX_BUCKETS = 5_000

// Fraction of the soonest-expiring buckets evicted when the map is at
// capacity with no expired entries to reclaim.
const EVICT_FRACTION = 0.2

function getClientIp(request: NextRequest): string {
  // SECURITY: the old code took the first value of x-forwarded-for
  // unconditionally. On Vercel that's safe — the platform overwrites the header
  // and never forwards client-supplied IPs (anti-spoofing by design). But on a
  // self-hosted deployment behind a reverse proxy that APPENDS to the header,
  // the first entry is attacker-controlled and lets anyone rotate fake IPs to
  // bypass every limit. Outside Vercel we therefore take the right-most entry,
  // the hop appended by the proxy closest to us and the least
  // attacker-controllable value. (If the app is exposed directly with no proxy
  // at all, any header value is spoofable — run it behind a trusted proxy.)
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const parts = forwarded.split(',').map((part) => part.trim()).filter(Boolean)
    if (parts.length > 0) {
      return process.env.VERCEL === '1' ? parts[0] : parts[parts.length - 1]
    }
  }
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp
  return 'unknown'
}

/**
 * Memory-DoS defense: keep the bucket map bounded. Drops expired buckets, and
 * if the map is still at capacity (an attacker rotating IPs faster than
 * windows expire), evicts the buckets closest to expiry. Limits are soft —
 * evicted IPs simply start a fresh window, which is the correct trade-off
 * against letting an attacker hold the map at full size forever.
 */
function pruneBuckets(now: number) {
  if (buckets.size < MAX_BUCKETS) return

  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }

  if (buckets.size >= MAX_BUCKETS) {
    const sorted = [...buckets.entries()].sort((a, b) => a[1].resetAt - b[1].resetAt)
    const toEvict = Math.max(1, Math.floor(MAX_BUCKETS * EVICT_FRACTION))
    for (let i = 0; i < toEvict && i < sorted.length; i++) {
      buckets.delete(sorted[i][0])
    }
  }
}

export function rateLimit(request: NextRequest, options: RateLimitOptions): RateLimitResult {
  const now = Date.now()
  const key = `${options.keyPrefix}:${getClientIp(request)}`

  pruneBuckets(now)

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

// --- Optional global (cross-instance) limiting via Upstash Redis ------------

// undefined = not initialized yet, null = not configured
let redisClient: Redis | null | undefined

function getRedisClient(): Redis | null {
  if (redisClient !== undefined) return redisClient
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    redisClient = null
    return null
  }
  redisClient = new Redis({ url, token })
  return redisClient
}

// Fixed-window counter, executed atomically in Redis. INCR and EXPIRE must be
// one operation: doing them as two round-trips leaves a window where the key
// exists without a TTL if the second call fails, which would rate-limit that
// IP forever. The TTL check also repairs a key that somehow lost its expiry.
const RATE_LIMIT_SCRIPT = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('TTL', KEYS[1])
if ttl < 0 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
return {current, ttl}
`

/**
 * Rate limit that is enforced across all serverless instances when Upstash
 * Redis is configured, and falls back to the in-memory limiter otherwise
 * (or if Redis is temporarily unreachable). Fixed-window per IP; identical
 * semantics to `rateLimit` from a caller's perspective.
 */
export async function rateLimitGlobal(
  request: NextRequest,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const redis = getRedisClient()
  if (!redis) return rateLimit(request, options)

  const key = `${options.keyPrefix}:${getClientIp(request)}`
  const windowSeconds = Math.max(1, Math.ceil(options.windowMs / 1000))

  try {
    const [count, ttl] = (await redis.eval(
      RATE_LIMIT_SCRIPT,
      [key],
      [String(windowSeconds)]
    )) as [number, number]

    if (count > options.limit) {
      return { success: false, remaining: 0, retryAfterSeconds: Math.max(ttl, 1) }
    }
    return { success: true, remaining: Math.max(options.limit - count, 0), retryAfterSeconds: 0 }
  } catch (error) {
    console.error('Rate limit Redis error, falling back to in-memory limiter:', error)
    return rateLimit(request, options)
  }
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

import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { rateLimit } from '../rateLimit'

function makeRequest(ip = '1.2.3.4') {
  return new NextRequest('http://localhost/api/test', {
    headers: { 'x-forwarded-for': ip },
  })
}

describe('rateLimit', () => {
  it('allows requests up to the limit', () => {
    const req = makeRequest()
    for (let i = 0; i < 3; i++) {
      const result = rateLimit(req, { limit: 3, windowMs: 60_000, keyPrefix: 'allow-up-to' })
      expect(result.success).toBe(true)
    }
  })

  it('blocks requests beyond the limit and reports retry time', () => {
    const req = makeRequest()
    for (let i = 0; i < 3; i++) {
      rateLimit(req, { limit: 3, windowMs: 60_000, keyPrefix: 'block-beyond' })
    }
    const blocked = rateLimit(req, { limit: 3, windowMs: 60_000, keyPrefix: 'block-beyond' })
    expect(blocked.success).toBe(false)
    expect(blocked.remaining).toBe(0)
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0)
  })

  it('resets the window after windowMs elapses', () => {
    const req = makeRequest()
    rateLimit(req, { limit: 1, windowMs: 15, keyPrefix: 'window-reset' })
    expect(rateLimit(req, { limit: 1, windowMs: 15, keyPrefix: 'window-reset' }).success).toBe(false)

    return new Promise((resolve) => {
      setTimeout(() => {
        const allowed = rateLimit(req, { limit: 1, windowMs: 15, keyPrefix: 'window-reset' })
        expect(allowed.success).toBe(true)
        resolve(null)
      }, 25)
    })
  })

  it('tracks different IPs independently', () => {
    const a = makeRequest('1.1.1.1')
    const b = makeRequest('2.2.2.2')
    rateLimit(a, { limit: 1, windowMs: 60_000, keyPrefix: 'per-ip' })
    expect(rateLimit(a, { limit: 1, windowMs: 60_000, keyPrefix: 'per-ip' }).success).toBe(false)
    expect(rateLimit(b, { limit: 1, windowMs: 60_000, keyPrefix: 'per-ip' }).success).toBe(true)
  })

  it('isolates different key prefixes', () => {
    const req = makeRequest()
    rateLimit(req, { limit: 1, windowMs: 60_000, keyPrefix: 'contact' })
    expect(rateLimit(req, { limit: 1, windowMs: 60_000, keyPrefix: 'watchlist' }).success).toBe(true)
  })
})

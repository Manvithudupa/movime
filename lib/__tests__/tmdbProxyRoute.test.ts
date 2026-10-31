import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '../../app/api/tmdb/[...slug]/route'

const fetchMock = vi.fn()

function makeRequest(path: string, ip = '198.51.100.7') {
  return new NextRequest(`http://localhost/api/tmdb${path}`, {
    headers: { 'x-forwarded-for': ip },
  })
}

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  })
}

describe('GET /api/tmdb/[...slug]', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    global.fetch = fetchMock as any
    process.env.TMDB_API_KEY = 'server-key'
    delete process.env.NEXT_PUBLIC_TMDB_API_KEY
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
  })

  afterEach(() => {
    delete process.env.TMDB_API_KEY
  })

  it('proxies allowed paths and injects the server-side key', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 550 }))

    const response = await GET(makeRequest('/movie/550?api_key=attacker'))
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ id: 550 })

    const requested = String(fetchMock.mock.calls[0][0])
    expect(requested).toContain('https://api.themoviedb.org/3/movie/550?')
    expect(requested).toContain('api_key=server-key')
    expect(requested).not.toContain('attacker')
  })

  it.each(['/movie/550', '/tv/1399/season/1', '/search/multi?query=x', '/trending/movie/day', '/discover/movie', '/genre/movie/list', '/person/1', '/configuration'])(
    'allows the first segment of %s',
    async (path) => {
      fetchMock.mockResolvedValue(jsonResponse({ ok: true }))
      const response = await GET(makeRequest(path))
      expect(response.status).toBe(200)
    }
  )

  it.each(['/account', '/authentication/token/new', '/list/1', '/movie/../account'])(
    'rejects disallowed path %s with 400',
    async (path) => {
      const response = await GET(makeRequest(path))
      expect(response.status).toBe(400)
      expect(fetchMock).not.toHaveBeenCalled()
    }
  )

  it('rejects dot-only segments', async () => {
    // Note: URL parsing already collapses literal '.' and '..' segments, so the
    // route sees those as normal paths (and the first-segment allowlist still
    // constrains them). Longer dot runs are preserved and must be rejected.
    for (const path of ['/movie/...', '/movie/..../images']) {
      const response = await GET(makeRequest(path))
      expect(response.status).toBe(400)
    }
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('passes an upstream 404 through instead of turning it into 502', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ status_message: 'Not found' }, 404))
    const response = await GET(makeRequest('/movie/999999999'))
    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toMatchObject({ status_message: 'Not found' })
  })

  it('passes an upstream 429 through and keeps Retry-After', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ status_message: 'Rate limited' }, 429, { 'retry-after': '12' }))
    const response = await GET(makeRequest('/trending/movie/day'))
    expect(response.status).toBe(429)
    expect(response.headers.get('retry-after')).toBe('12')
  })

  it('maps other upstream failures to 502', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ status_message: 'boom' }, 500))
    const response = await GET(makeRequest('/movie/550'))
    expect(response.status).toBe(502)
  })

  it('does not fall back to NEXT_PUBLIC_TMDB_API_KEY', async () => {
    delete process.env.TMDB_API_KEY
    process.env.NEXT_PUBLIC_TMDB_API_KEY = 'public-key'
    const response = await GET(makeRequest('/movie/550'))
    expect(response.status).toBe(500)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

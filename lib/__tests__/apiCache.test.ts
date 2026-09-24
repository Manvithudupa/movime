// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { searchContent } from '../utils'

const cacheKeys = () =>
  Object.keys(localStorage).filter((key) => key.startsWith('movime_api_cache_v2'))

describe('API response cache', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('does not persist an empty payload from a failed request', async () => {
    // searchContent swallows its own errors and resolves with { results: [] }.
    // Caching that used to pin a momentary network failure for the whole TTL,
    // leaving the section blank for minutes after the connection recovered.
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('network down')
    }))

    const data = await searchContent('cache-test-failure')

    expect(data).toEqual({ results: [] })
    expect(cacheKeys()).toHaveLength(0)
  })

  it('persists a successful response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ results: [{ id: 1, title: 'Something' }] }),
    })))

    const data = await searchContent('cache-test-success')

    expect(data.results).toHaveLength(1)
    expect(cacheKeys().length).toBeGreaterThan(0)
  })
})

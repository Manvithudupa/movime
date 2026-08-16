// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import {
  getVideoUrl,
  formatRuntime,
  filterAdultContent,
  getLocalStorage,
  setLocalStorage,
} from '../utils'

describe('getVideoUrl', () => {
  it('replaces placeholders for movies', () => {
    expect(getVideoUrl('CinemaOS', '123', 'movie')).toBe('https://cinemaos.tech/movie/watch/123')
  })

  it('replaces placeholders for tv with season and episode', () => {
    expect(getVideoUrl('CinemaOS', '123', 'tv', 2, 5)).toBe(
      'https://cinemaos.tech/tv/watch/123?season=2&episode=5'
    )
  })

  it('appends the quality hint to URLs that already have a query string', () => {
    expect(getVideoUrl('VidNest', '123', 'movie', undefined, undefined, '1080p')).toBe(
      'https://vidnest.fun/movie/123?server=gama&quality=1080p'
    )
  })

  it('skips the quality hint for auto or missing quality', () => {
    expect(getVideoUrl('VidNest', '123', 'movie', undefined, undefined, 'auto')).toBe(
      'https://vidnest.fun/movie/123?server=gama'
    )
    expect(getVideoUrl('VidNest', '123', 'movie')).toBe(
      'https://vidnest.fun/movie/123?server=gama'
    )
  })

  it('does not add a quality param to bare-path URLs', () => {
    expect(getVideoUrl('vidsrcrip', '123', 'movie', undefined, undefined, '720p')).toBe(
      'https://vidsrc.rip/embed/movie/123'
    )
  })

  it('returns an empty string for an unknown source', () => {
    expect(getVideoUrl('does-not-exist', '123', 'movie')).toBe('')
  })
})

describe('formatRuntime', () => {
  it('formats minutes into hours and minutes', () => {
    expect(formatRuntime(90)).toBe('1h 30m')
    expect(formatRuntime(45)).toBe('0h 45m')
    expect(formatRuntime(135)).toBe('2h 15m')
    expect(formatRuntime(0)).toBe('')
    expect(formatRuntime(-5)).toBe('')
  })
})

describe('filterAdultContent', () => {
  it('filters out adult content by default', () => {
    const items = [
      { id: 1, title: 'Inception', overview: 'a dream heist' },
      { id: 2, title: 'Adult XXX Party', overview: 'fun times' },
    ]
    const filtered = filterAdultContent(items)
    expect(filtered).toHaveLength(1)
    expect(filtered[0].id).toBe(1)
  })

  it('keeps everything when adult content is allowed', () => {
    const items = [{ id: 2, title: 'Adult XXX Party', overview: 'fun times' }]
    expect(filterAdultContent(items, true)).toHaveLength(1)
  })

  it('filters by overview keywords', () => {
    const items = [{ id: 1, title: 'Documentary', overview: 'an intimate portrait of penguins' }]
    expect(filterAdultContent(items)).toHaveLength(0)
  })
})

describe('localStorage helpers', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('round-trips values and returns the default when missing', () => {
    setLocalStorage('test-key', { a: 1 })
    expect(getLocalStorage('test-key', null)).toEqual({ a: 1 })
    expect(getLocalStorage('missing-key', 'fallback')).toBe('fallback')
  })
})

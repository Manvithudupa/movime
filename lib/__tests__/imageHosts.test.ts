import { describe, it, expect } from 'vitest'
import { isAllowedImageHost, isAllowedImageSrc } from '../imageHosts'

describe('isAllowedImageHost', () => {
  it('accepts allowlisted hosts and their subdomains', () => {
    expect(isAllowedImageHost('image.tmdb.org')).toBe(true)
    expect(isAllowedImageHost('anilist.co')).toBe(true)
    expect(isAllowedImageHost('cdn.anilist.co')).toBe(true)
  })

  it('rejects unknown hosts, lookalikes and empty input', () => {
    expect(isAllowedImageHost('evil.com')).toBe(false)
    expect(isAllowedImageHost('image.tmdb.org.evil.com')).toBe(false)
    expect(isAllowedImageHost('')).toBe(false)
    expect(isAllowedImageHost(null)).toBe(false)
  })
})

describe('isAllowedImageSrc', () => {
  it('trusts same-origin paths', () => {
    expect(isAllowedImageSrc('/logo.png')).toBe(true)
    expect(isAllowedImageSrc('/posters/abc.jpg')).toBe(true)
  })

  it('rejects protocol-relative URLs that only look like local paths', () => {
    // These start with "/" but resolve to an external host — they must go
    // through the allowlist instead of being trusted as same-origin. With
    // images.unoptimized set, an unchecked value here is fetched directly.
    expect(isAllowedImageSrc('//evil.com/tracker.gif')).toBe(false)
    expect(isAllowedImageSrc('//serveproxy.com/?url=https://evil.com')).toBe(false)
  })

  it('accepts allowlisted absolute URLs', () => {
    expect(isAllowedImageSrc('https://image.tmdb.org/t/p/w500/a.jpg')).toBe(true)
    expect(isAllowedImageSrc('https://anilist.co/img/x.png')).toBe(true)
  })

  it('rejects unknown hosts and malformed URLs', () => {
    expect(isAllowedImageSrc('https://evil.com/x.png')).toBe(false)
    expect(isAllowedImageSrc('not a url')).toBe(false)
    expect(isAllowedImageSrc('')).toBe(true) // falsy src means "no image"
  })
})

import { describe, it, expect } from 'vitest'
import { availableSources } from '../sources'

describe('availableSources', () => {
  it('has unique ids', () => {
    const ids = availableSources.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every source has a name and movie/tv URLs with all placeholders', () => {
    for (const source of availableSources) {
      expect(source.name.length).toBeGreaterThan(0)
      expect(source.urls.movie).toContain('{id}')
      expect(source.urls.tv).toContain('{id}')
      expect(source.urls.tv).toContain('{season}')
      expect(source.urls.tv).toContain('{episode}')
    }
  })

  it('movie URLs never contain season/episode placeholders', () => {
    for (const source of availableSources) {
      expect(source.urls.movie).not.toContain('{season}')
      expect(source.urls.movie).not.toContain('{episode}')
    }
  })
})

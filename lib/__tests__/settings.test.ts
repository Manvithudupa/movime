// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  DEFAULT_SETTINGS,
  fetchSettings,
  getLocalSettings,
  saveLocalSettings,
  saveSettings,
} from '../settings'

const fetchMock = vi.fn()

beforeEach(() => {
  localStorage.clear()
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getLocalSettings / saveLocalSettings', () => {
  it('returns defaults when nothing is stored', () => {
    expect(getLocalSettings()).toEqual(DEFAULT_SETTINGS)
  })

  it('round-trips stored values', () => {
    saveLocalSettings({ preferredSource: 'vidsrcxyz', defaultQuality: '1080p', autoPlay: false })
    expect(getLocalSettings()).toEqual({
      preferredSource: 'vidsrcxyz',
      defaultQuality: '1080p',
      autoPlay: false,
    })
  })
})

describe('fetchSettings', () => {
  it('uses localStorage for guests', async () => {
    saveLocalSettings({ preferredSource: 'vidsrcxyz', defaultQuality: '720p', autoPlay: true })
    const settings = await fetchSettings(false)
    expect(settings.preferredSource).toBe('vidsrcxyz')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('uses the server copy when signed in and settings exist', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ settings: { preferredSource: 'cinemaos', defaultQuality: '480p', autoPlay: false } }),
    })
    const settings = await fetchSettings(true)
    expect(settings).toEqual({ preferredSource: 'cinemaos', defaultQuality: '480p', autoPlay: false })
  })

  it('falls back to localStorage when the server has no settings yet', async () => {
    saveLocalSettings({ preferredSource: 'vidsrcxyz', defaultQuality: 'auto', autoPlay: true })
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ settings: null }) })
    const settings = await fetchSettings(true)
    expect(settings.preferredSource).toBe('vidsrcxyz')
  })

  it('falls back to localStorage when the server call fails', async () => {
    saveLocalSettings({ preferredSource: 'vidsrcxyz', defaultQuality: 'auto', autoPlay: true })
    fetchMock.mockRejectedValueOnce(new Error('network down'))
    const settings = await fetchSettings(true)
    expect(settings.preferredSource).toBe('vidsrcxyz')
  })
})

describe('saveSettings', () => {
  it('writes locally and syncs to the server when signed in', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) })
    await saveSettings({ preferredSource: 'cinemaos', defaultQuality: '1080p', autoPlay: false }, true)

    expect(localStorage.getItem('preferredSource')).toBe('"cinemaos"')
    expect(fetchMock).toHaveBeenCalledWith('/api/user/settings', expect.objectContaining({ method: 'PUT' }))
  })

  it('only writes locally for guests', async () => {
    await saveSettings({ preferredSource: 'cinemaos', defaultQuality: 'auto', autoPlay: true }, false)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(localStorage.getItem('preferredSource')).toBe('"cinemaos"')
  })
})

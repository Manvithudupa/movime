import { describe, it, expect } from 'vitest'
import {
  parseContentId,
  isValidSettingValue,
  pickValidSettings,
} from '../validation'

describe('parseContentId', () => {
  it('accepts positive integer strings and numbers', () => {
    expect(parseContentId('123')).toBe(123)
    expect(parseContentId(456)).toBe(456)
    expect(parseContentId(' 789 ')).toBe(789)
  })

  it('rejects trailing garbage that parseInt would truncate', () => {
    expect(parseContentId('12abc')).toBeNull()
    expect(parseContentId('1e3')).toBe(1000) // Number() parses scientific notation
  })

  it('rejects zero, negatives, floats and unsafe integers', () => {
    expect(parseContentId(0)).toBeNull()
    expect(parseContentId('-5')).toBeNull()
    expect(parseContentId('12.5')).toBeNull()
    expect(parseContentId(Number.MAX_SAFE_INTEGER + 1)).toBeNull()
  })

  it('rejects non-numeric and missing values', () => {
    expect(parseContentId(undefined)).toBeNull()
    expect(parseContentId(null)).toBeNull()
    expect(parseContentId('')).toBeNull()
    expect(parseContentId({})).toBeNull()
    expect(parseContentId('abc')).toBeNull()
  })
})

describe('isValidSettingValue', () => {
  it('accepts well-typed, bounded values', () => {
    expect(isValidSettingValue('autoPlay', true)).toBe(true)
    expect(isValidSettingValue('preferredSource', 'cinemaos')).toBe(true)
    expect(isValidSettingValue('defaultQuality', '1080p')).toBe(true)
    expect(isValidSettingValue('preferredSource', '')).toBe(true)
  })

  it('rejects wrong types and oversized values', () => {
    expect(isValidSettingValue('autoPlay', 'yes')).toBe(false)
    expect(isValidSettingValue('autoPlay', 1)).toBe(false)
    expect(isValidSettingValue('preferredSource', 'x'.repeat(101))).toBe(false)
    expect(isValidSettingValue('defaultQuality', 'x'.repeat(21))).toBe(false)
    expect(isValidSettingValue('preferredSource', { evil: true })).toBe(false)
  })

  it('rejects unknown keys', () => {
    expect(isValidSettingValue('isAdmin', true)).toBe(false)
  })
})

describe('pickValidSettings', () => {
  it('keeps only known, valid keys', () => {
    const result = pickValidSettings({
      preferredSource: 'cinemaos',
      autoPlay: false,
      isAdmin: true,
    })
    expect(result).toEqual({ ok: true, value: { preferredSource: 'cinemaos', autoPlay: false } })
  })

  it('allows partial payloads (missing keys are simply absent)', () => {
    const result = pickValidSettings({ defaultQuality: '720p' })
    expect(result).toEqual({ ok: true, value: { defaultQuality: '720p' } })
  })

  it('reports the first invalid key', () => {
    const result = pickValidSettings({ preferredSource: 'ok', autoPlay: 'nope' })
    expect(result).toEqual({ ok: false, invalidKey: 'autoPlay' })
  })
})

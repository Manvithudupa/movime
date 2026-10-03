// Shared, pure input-validation helpers used by API routes and unit tested
// directly. Kept free of Next.js / Supabase imports so any route (or test) can
// reuse them without pulling in a runtime dependency.

/**
 * Parses a TMDB content id.
 *
 * Number() rejects the trailing garbage that parseInt silently truncates
 * ('12abc' -> 12); the safe-integer + positive bounds then reject NaN,
 * negatives, floats, and values that would overflow the DB integer column.
 */
export function parseContentId(value: unknown): number | null {
  const numeric = typeof value === 'string' ? Number(value) : value
  if (typeof numeric !== 'number' || !Number.isSafeInteger(numeric) || numeric <= 0) {
    return null
  }
  return numeric
}

// The only keys that may be stored in a profile's playback-settings JSONB column.
const VALID_SETTING_KEYS = ['preferredSource', 'defaultQuality', 'autoPlay'] as const

/**
 * Validates one setting's value. Restricting the key *names* alone still let a
 * client store arbitrarily large strings or nested objects under them, bloating
 * the profile row and confusing every reader — so values are type- and
 * size-checked too.
 */
export function isValidSettingValue(key: string, value: unknown): boolean {
  switch (key) {
    case 'autoPlay':
      return typeof value === 'boolean'
    case 'preferredSource':
      return typeof value === 'string' && value.length <= 100
    case 'defaultQuality':
      return typeof value === 'string' && value.length <= 20
    default:
      return false
  }
}

type PickSettingsResult =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; invalidKey: string }

/**
 * Picks and validates only the known settings keys out of an untrusted payload,
 * returning the clean partial settings or the first invalid key. Keys the client
 * omitted are simply absent, so a partial save never wipes other preferences.
 */
export function pickValidSettings(settings: Record<string, unknown>): PickSettingsResult {
  const value: Record<string, unknown> = {}
  for (const key of VALID_SETTING_KEYS) {
    if (key in settings) {
      if (!isValidSettingValue(key, settings[key])) {
        return { ok: false, invalidKey: key }
      }
      value[key] = settings[key]
    }
  }
  return { ok: true, value }
}

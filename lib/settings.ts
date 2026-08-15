import { getLocalStorage, setLocalStorage } from './utils'

export interface UserSettings {
  preferredSource: string
  defaultQuality: string
  autoPlay: boolean
}

export const DEFAULT_SETTINGS: UserSettings = {
  preferredSource: '',
  defaultQuality: 'auto',
  autoPlay: true,
}

export function getLocalSettings(): UserSettings {
  return {
    preferredSource:
      getLocalStorage<string>('preferredSource', DEFAULT_SETTINGS.preferredSource) || DEFAULT_SETTINGS.preferredSource,
    defaultQuality:
      getLocalStorage<string>('defaultQuality', DEFAULT_SETTINGS.defaultQuality) || DEFAULT_SETTINGS.defaultQuality,
    autoPlay: getLocalStorage<boolean>('autoPlay', DEFAULT_SETTINGS.autoPlay),
  }
}

export function saveLocalSettings(settings: UserSettings): void {
  setLocalStorage('preferredSource', settings.preferredSource)
  setLocalStorage('defaultQuality', settings.defaultQuality)
  setLocalStorage('autoPlay', settings.autoPlay)
}

/**
 * Loads the user's settings. When signed in, the server copy (synced across
 * devices) wins; localStorage is used for guests or when the server call fails
 * (e.g. the settings column hasn't been added to the database yet).
 */
export async function fetchSettings(isSignedIn: boolean): Promise<UserSettings> {
  if (isSignedIn) {
    try {
      const res = await fetch('/api/user/settings', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        const server = data?.settings
        // Only trust the server when it actually has settings stored — this way
        // a first-time signed-in user keeps their existing local preferences.
        if (server && typeof server === 'object' && Object.keys(server).length > 0) {
          return { ...DEFAULT_SETTINGS, ...server }
        }
      }
    } catch {
      // Fall through to localStorage.
    }
  }
  return getLocalSettings()
}

/** Persists settings locally, and to the server (cross-device) when signed in. */
export async function saveSettings(settings: UserSettings, isSignedIn: boolean): Promise<void> {
  saveLocalSettings(settings)
  if (!isSignedIn) return

  try {
    await fetch('/api/user/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings }),
    })
  } catch {
    // Local copy is already saved — server sync is best-effort.
  }
}

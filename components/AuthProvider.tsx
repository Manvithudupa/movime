'use client'

import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { useWatchlistStore, useContinueWatchingStore } from '@/lib/store'

interface AnimeCharacterData {
  id: number
  name: {
    first: string
    last: string
    full: string
    native?: string
  }
  image: {
    large: string
    medium: string
  }
  media?: {
    nodes: Array<{
      id: number
      title: { romaji?: string; english?: string }
    }>
  }
}

interface AuthContextType {
  user: User | null
  profile: Profile | null
  isLoading: boolean
  isSignedIn: boolean
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

interface Profile {
  id: string
  name: string | null
  email: string | null
  avatar_url: string | null
  bio: string | null
  gender: string | null
  location: string | null
  website: string | null
  anime_character: AnimeCharacterData | null
  preferences: any
  created_at: string
  updated_at: string
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  isLoading: true,
  isSignedIn: false,
  refreshProfile: async () => {},
  signOut: async () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

export type { Profile, AnimeCharacterData }

// --- Cache helpers for user data ---
const CACHE_KEY_USER = 'movime_user_cache';
const CACHE_KEY_PROFILE = 'movime_profile_cache';
const USER_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

function getCachedData<T>(key: string): T | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return undefined;
    const entry = JSON.parse(raw) as CacheEntry<T>;
    if (entry.expiresAt <= Date.now()) {
      window.localStorage.removeItem(key);
      return undefined;
    }
    return entry.data;
  } catch {
    return undefined;
  }
}

function setCachedData<T>(key: string, data: T, ttl = USER_CACHE_TTL) {
  if (typeof window === 'undefined') return;
  try {
    const entry: CacheEntry<T> = { data, expiresAt: Date.now() + ttl };
    window.localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Storage quota or browser issue
  }
}

function removeCachedData(key: string) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch {}
}

// Singleton supabase client reference
let _cachedSupabaseInstance: ReturnType<ReturnType<typeof createClient>> | null = null;

function getSupabaseClient() {
  if (typeof window !== 'undefined' && !_cachedSupabaseInstance) {
    _cachedSupabaseInstance = createClient() as any;
  }
  return _cachedSupabaseInstance || (createClient() as any);
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabaseRef = useRef(getSupabaseClient())

  const fetchProfile = async (userId: string, skipCache = false) => {
    // Try cache first
    if (!skipCache) {
      const cachedProfile = getCachedData<Profile>(`${CACHE_KEY_PROFILE}_${userId}`);
      if (cachedProfile) {
        setProfile(cachedProfile);
        return;
      }
    }

    try {
      const { data } = await supabaseRef.current
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (data) {
        const profileData = data as Profile;
        setProfile(profileData);
        setCachedData(`${CACHE_KEY_PROFILE}_${userId}`, profileData);
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    }
  }

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id, true)
    }
  }

  useEffect(() => {
    // 1. Immediately hydrate from localStorage cache
    const cachedUser = getCachedData<{ id: string; email?: string; user_metadata?: Record<string, unknown> }>(CACHE_KEY_USER);
    if (cachedUser) {
      // Restore user from cache so the UI shows signed-in state instantly
      setUser({ ...cachedUser, aud: '', app_metadata: {}, created_at: '', role: '', updated_at: '' } as User);

      const cachedProfile = getCachedData<Profile>(`${CACHE_KEY_PROFILE}_${cachedUser.id}`);
      if (cachedProfile) {
        setProfile(cachedProfile);
      }
    }

    // 2. Revalidate from Supabase in background
    supabaseRef.current.auth.getSession().then(({ data: { session } }: { data: { session: Record<string, any> | null } }) => {
      const currentUser = session?.user ?? null;
      
      if (currentUser) {
        setUser(currentUser);
        // Cache user data
        setCachedData(CACHE_KEY_USER, {
          id: currentUser.id,
          email: currentUser.email,
          user_metadata: currentUser.user_metadata,
        });
        // Fetch profile (bypass cache to get latest)
        fetchProfile(currentUser.id, true);
      } else {
        setUser(null);
        setProfile(null);
        // Clear cached data
        removeCachedData(CACHE_KEY_USER);
      }

      // The session check is authoritative — always finish hydrating, even when
      // a cached user existed but the cached profile was missing/expired.
      setIsLoading(false);
    }).catch(() => {
      // Never leave the app stuck in a loading state, even if the session
      // check itself fails (e.g. network error).
      setIsLoading(false);
    })

    // 3. Listen for auth changes
    const { data: { subscription } } = supabaseRef.current.auth.onAuthStateChange((_event: string, session: Record<string, any> | null) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (currentUser) {
        setCachedData(CACHE_KEY_USER, {
          id: currentUser.id,
          email: currentUser.email,
          user_metadata: currentUser.user_metadata,
        });
        fetchProfile(currentUser.id, true);
      } else {
        setProfile(null);
        removeCachedData(CACHE_KEY_USER);
        // Remove cached profile for any user
        if (typeof window !== 'undefined') {
          const keys = Object.keys(window.localStorage);
          keys.filter(k => k.startsWith(CACHE_KEY_PROFILE)).forEach(k => window.localStorage.removeItem(k));
        }
      }
      
      setIsLoading(false);
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabaseRef.current.auth.signOut()
    setUser(null)
    setProfile(null)
    removeCachedData(CACHE_KEY_USER)
    // Clear watchlist and continue watching stores
    useWatchlistStore.getState().clear()
    useContinueWatchingStore.getState().clear()
    // Clear all cached profiles
    if (typeof window !== 'undefined') {
      const keys = Object.keys(window.localStorage);
      keys.filter(k => k.startsWith(CACHE_KEY_PROFILE)).forEach(k => window.localStorage.removeItem(k));
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isLoading,
        isSignedIn: !!user,
        refreshProfile,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

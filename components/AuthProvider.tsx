'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

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

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  const fetchProfile = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (data) {
        setProfile(data as Profile)
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    }
  }

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id)
    }
  }

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (currentUser) {
        fetchProfile(currentUser.id)
      }
      setIsLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (currentUser) {
        fetchProfile(currentUser.id)
      } else {
        setProfile(null)
      }
      setIsLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
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

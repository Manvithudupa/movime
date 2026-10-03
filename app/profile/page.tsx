'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth, type Profile, type AnimeCharacterData } from '@/components/AuthProvider'
import AniListCharacterPicker from '@/components/AniListCharacterPicker'
import Avatar from '@/components/Avatar'
import Navbar from '@/components/Navbar'
import { SkeletonProfile } from '@/components/SkeletonProfile'
import { SkeletonPageLayout } from '@/components/SkeletonPageLayout'
import { getViewPath } from '@/lib/routes'
import {
  useWatchlistStore,
  useContinueWatchingStore,
  CONTINUE_WATCHING_HISTORY_LIMIT,
} from '@/lib/store'

interface ProfileStat {
  title: string
  value: React.ReactNode
  subtitle: string
  icon: React.ReactNode
  /** Makes the whole card a link to the page behind the number. */
  href?: string
}

export default function ProfilePage() {
  const { user: authUser, profile: authProfile, isLoading: authLoading, isSignedIn, refreshProfile, signOut } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [showCharacterPicker, setShowCharacterPicker] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    gender: '',
    location: '',
    website: '',
  })
  const [showSearch] = useState(false)
  const watchLaterCount = useWatchlistStore((s) => s.count)
  const fetchWatchlist = useWatchlistStore((s) => s.fetch)
  const continueWatchingItems = useContinueWatchingStore((s) => s.items)
  const fetchContinueWatching = useContinueWatchingStore((s) => s.fetch)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deletePassword, setDeletePassword] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !isSignedIn) {
      router.push('/auth/login')
    }
  }, [authLoading, isSignedIn, router])

  const handleViewChange = (view: string) => router.push(getViewPath(view))

  useEffect(() => {
    if (isSignedIn && authProfile) {
      setProfile(authProfile as Profile)
      setFormData({
        name: authProfile.name || '',
        bio: authProfile.bio || '',
        gender: authProfile.gender || '',
        location: authProfile.location || '',
        website: authProfile.website || '',
      })
      setLoading(false)
    } else if (!authLoading && !isSignedIn) {
      setLoading(false)
    } else {
      fetchProfile()
    }
  }, [isSignedIn, authProfile, authLoading])

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/user/profile')
      if (response.ok) {
        const data = await response.json()
        setProfile(data)
        setFormData({
          name: data.name || '',
          bio: data.bio || '',
          gender: data.gender || '',
          location: data.location || '',
          website: data.website || '',
        })
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isSignedIn) {
      fetchWatchlist(true)
      // Full window, not the home row's latest-20 cache — the stat cards count
      // every entry, so a truncated list would under-report them.
      fetchContinueWatching(true, CONTINUE_WATCHING_HISTORY_LIMIT)
    }
  }, [isSignedIn, fetchWatchlist, fetchContinueWatching])

  // Fix: When setting an anime character, also update avatar_url with the character's image
  const handleCharacterSelect = async (character: AnimeCharacterData) => {
    if (!profile) return
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anime_character: {
            id: character.id,
            name: character.name,
            image: character.image,
          },
          avatar_url: character.image.large, // <-- Fix: Also store the character image as avatar_url
        }),
      })
      if (response.ok) {
        const updatedProfile = await response.json()
        setProfile(updatedProfile)
        refreshProfile()
      } else {
        const err = await response.json()
        console.error('API Error:', err)
        setSaveMessage('Failed to set character avatar. Please try again.')
        setTimeout(() => setSaveMessage(null), 3000)
      }
    } catch (error) {
      console.error('Failed to set character:', error)
      setSaveMessage('Network error. Please try again.')
      setTimeout(() => setSaveMessage(null), 3000)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveMessage(null)
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (response.ok) {
        const updatedProfile = await response.json()
        setProfile(updatedProfile)
        refreshProfile()
        setEditing(false)
        setSaveMessage('Profile updated successfully!')
      } else {
        const err = await response.json()
        setSaveMessage(err.error || 'Failed to save profile.')
      }
    } catch (error) {
      console.error('Failed to update profile:', error)
      setSaveMessage('Network error. Please try again.')
    } finally {
      setSaving(false)
      setTimeout(() => setSaveMessage(null), 3000)
    }
  }

  const removeCharacter = async () => {
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          anime_character: null,
          avatar_url: null, // <-- Fix: Also clear avatar_url when removing anime character
        }),
      })
      if (response.ok) {
        const updatedProfile = await response.json()
        setProfile(updatedProfile)
        refreshProfile()
      } else {
        await response.json()
        setSaveMessage('Failed to remove character.')
        setTimeout(() => setSaveMessage(null), 3000)
      }
    } catch (error) {
      console.error('Failed to remove character:', error)
    }
  }

  // Accounts created with email/password must re-enter their password before
  // deletion. OAuth-only accounts (e.g. Google) have no password to verify.
  const hasPassword = !!authUser?.identities?.some((i) => i.provider === 'email')

  const closeDeleteModal = () => {
    setShowDeleteModal(false)
    setDeleteConfirmText('')
    setDeletePassword('')
    setDeleteError(null)
  }

  const handleDeleteAccount = async () => {
    setDeleting(true)
    setDeleteError(null)
    try {
      const response = await fetch('/api/user/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: hasPassword ? deletePassword : undefined }),
      })
      if (response.ok) {
        // Best-effort sign out — the session is already invalid after the account
        // was deleted, so never block the redirect on it.
        try {
          await signOut()
        } catch (signOutError) {
          console.error('Sign out after account deletion failed:', signOutError)
        }
        router.push('/')
        router.refresh()
        return
      } else {
        const err = await response.json().catch(() => ({}))
        setDeleteError(err.error || 'Failed to delete account. Please try again.')
        setDeleting(false)
      }
    } catch (error) {
      console.error('Failed to delete account:', error)
      setDeleteError('Network error. Please try again.')
      setDeleting(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (signOutError) {
      console.error('Sign out failed:', signOutError)
    }
    router.push('/')
    router.refresh()
  }

  if (authLoading || loading) {
    return (
      <SkeletonPageLayout
        currentView="profile"
        showSearch={showSearch}
        watchLaterCount={watchLaterCount}
        onViewChange={handleViewChange}
      >
        <SkeletonProfile />
      </SkeletonPageLayout>
    )
  }

  if (!isSignedIn || !profile) return null

  const animeChar = profile.anime_character
  const avatarToShow = animeChar?.image?.large || profile.avatar_url

  // "Continue Watching" counts what is still in progress, while the history card
  // counts every entry — they share one continue-watching row per title, so
  // using the raw total for both made the two numbers look identically wrong.
  const inProgressCount = continueWatchingItems.filter((item) => !item.is_completed).length

  const profileStats: ProfileStat[] = [
    {
      title: 'Continue Watching',
      value: inProgressCount,
      subtitle: 'In progress',
      href: '/',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      title: 'Watch History',
      value: continueWatchingItems.length,
      subtitle: 'Titles watched',
      href: '/history',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      title: 'Watchlist',
      value: watchLaterCount,
      subtitle: 'Saved items',
      href: '/watchlist',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
      ),
    },
    {
      title: 'Account',
      value: 'Free',
      subtitle: 'Plan',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
    {
      title: 'Member Since',
      value: profile.created_at
        ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        : 'N/A',
      subtitle: 'Join date',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
  ]

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar
      currentView="profile"
      showSearch={showSearch}
      watchLaterCount={watchLaterCount}
      onViewChange={handleViewChange}
    />

      <div className="max-w-5xl mx-auto px-4 py-32 pt-40">
        {/* Toast notification */}
        <AnimatePresence>
          {saveMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-24 right-4 z-50 px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-sm shadow-2xl"
            >
              <div className="flex items-center gap-2">
                {saveMessage.includes('success') || saveMessage.includes('Successfully') ? (
                  <svg className="w-4 h-4 text-white flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-white flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <span className="text-gray-200">{saveMessage}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Profile Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white/[0.03] border border-white/10 rounded-2xl p-8 mb-8"
        >
          <div className="flex flex-col lg:flex-row lg:items-start lg:gap-10 gap-8">
            {/* Avatar Column */}
            <div className="flex-shrink-0 flex flex-col items-center gap-5">
              <div className="relative group">
                <Avatar
                  src={avatarToShow}
                  alt={profile.name || 'Profile'}
                  size={140}
                  fallbackText={profile.name || 'U'}
                  className="border-4 border-white/20 transition-all duration-300 group-hover:border-white/40"
                />
                {/* Pencil icon overlay for changing avatar */}
                <button
                  onClick={() => setShowCharacterPicker(true)}
                  className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-full cursor-pointer"
                  title="Choose anime avatar"
                >
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                {/* Remove button appears on a separate hover zone */}
                {animeChar && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeCharacter();
                    }}
                    className="absolute -top-1 -right-1 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full p-1.5 border border-white/20 transition-all opacity-0 group-hover:opacity-100"
                    title="Remove anime avatar"
                  >
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Profile Info Column */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                <div>
                  <h1 className="text-2xl sm:text-4xl font-bold">{profile.name || 'User'}</h1>
                  <p className="text-gray-400 mt-1 flex items-center gap-2 flex-wrap">
                    {profile.email}
                    {profile.gender && (
                      <span className="text-xs bg-white/10 px-2.5 py-0.5 rounded-full text-gray-300">
                        {profile.gender === 'male' ? '♂ Male' :
                         profile.gender === 'female' ? '♀ Female' :
                         profile.gender === 'other' ? '⚧ Other' : ''}
                      </span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => setEditing(!editing)}
                  className="px-6 py-2.5 bg-white text-black font-semibold rounded-lg transition-all hover:bg-gray-100 self-start whitespace-nowrap"
                >
                  {editing ? (
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Cancel
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit Profile
                    </span>
                  )}
                </button>
              </div>

              {/* Edit Mode */}
              <AnimatePresence mode="wait">
                {editing ? (
                  <motion.div
                    key="edit"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4 overflow-hidden"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">Name</label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-black border border-white/20 rounded-lg focus:border-white focus:outline-none text-white placeholder-gray-500 transition-colors"
                          placeholder="Your name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">Gender</label>
                        <select
                          value={formData.gender}
                          onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-black border border-white/20 rounded-lg focus:border-white focus:outline-none text-white transition-colors"
                        >
                          <option value="">Prefer not to say</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">Bio</label>
                      <textarea
                        value={formData.bio}
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                        rows={3}
                        className="w-full px-3.5 py-2.5 bg-black border border-white/20 rounded-lg focus:border-white focus:outline-none text-white placeholder-gray-500 resize-none transition-colors"
                        placeholder="Tell us about yourself..."
                      />
                      <p className="text-xs text-gray-500 mt-1 text-right">{formData.bio.length}/500 characters</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">Location</label>
                        <input
                          type="text"
                          value={formData.location}
                          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-black border border-white/20 rounded-lg focus:border-white focus:outline-none text-white placeholder-gray-500 transition-colors"
                          placeholder="Where are you based?"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">Website</label>
                        <input
                          type="url"
                          value={formData.website}
                          onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-black border border-white/20 rounded-lg focus:border-white focus:outline-none text-white placeholder-gray-500 transition-colors"
                          placeholder="https://your-website.com"
                        />
                      </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2.5 bg-white text-black font-semibold rounded-lg hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {saving ? (
                          <>
                            <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Save Changes
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="view"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4"
                  >
                    {profile.bio && (
                      <p className="text-gray-300 leading-relaxed">{profile.bio}</p>
                    )}
                    <div className="flex flex-wrap gap-4">
                      {profile.location && (
                        <span className="text-gray-400 flex items-center gap-1.5 text-sm">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {profile.location}
                        </span>
                      )}
                      {profile.website && (
                        <a
                          href={profile.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-300 hover:text-white flex items-center gap-1.5 text-sm transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                          {profile.website.replace(/^https?:\/\//, '')}
                        </a>
                      )}
                      <span className="text-gray-500 flex items-center gap-1.5 text-sm">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Joined {profile.created_at
                          ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                          : 'Recently'}
                      </span>
                    </div>

                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8"
        >
          {profileStats.map((stat, i) => {
            const card = (
              <>
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-white">{stat.icon}</div>
                  <h3 className="font-medium text-sm text-gray-300">{stat.title}</h3>
                  {stat.href && (
                    <svg className="w-3.5 h-3.5 ml-auto text-gray-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-white">{stat.value}</p>
                <p className="text-gray-500 text-xs mt-1">{stat.subtitle}</p>
              </>
            )

            return (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 * i }}
                className="group bg-white/[0.03] border border-white/10 rounded-xl hover:bg-white/[0.06] transition-colors"
              >
                {stat.href ? (
                  <Link href={stat.href} className="block p-5">
                    {card}
                  </Link>
                ) : (
                  <div className="p-5">{card}</div>
                )}
              </motion.div>
            )
          })}
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="bg-white/[0.03] border border-white/10 rounded-xl p-6"
        >
          <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { href: '/', label: 'Browse', icon: 'M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m6-1a9 9 0 11-18 0 9 9 0 0118 0z' },
              { href: '/search', label: 'Search', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
              { href: '/watchlist', label: 'Watchlist', icon: 'M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z' },
              { href: '/settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
            ].map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-center group hover:scale-[1.02]"
              >
                <div className="text-white/70 group-hover:text-white mb-2 transition-colors">
                  <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={action.icon} />
                  </svg>
                </div>
                <p className="font-medium text-xs text-gray-300 group-hover:text-white transition-colors">{action.label}</p>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Sign Out (mobile only) — the top navbar account dropdown (the
            only other sign-out UI) is hidden on phones, where this page is
            reached from the hamburger menu instead, so sign out lives here. */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="sm:hidden bg-white/[0.03] border border-white/10 rounded-xl p-6 mt-8"
        >
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-300 hover:text-red-200 border border-red-500/25 hover:border-red-500/40 rounded-lg font-semibold text-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </motion.div>

        {/* Danger Zone */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="bg-red-950/20 border border-red-500/20 rounded-xl p-6"
        >
          <h3 className="text-base font-semibold mb-3 flex items-center gap-2 text-red-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            Danger Zone
          </h3>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm text-gray-300 font-medium">Delete Account</p>
              <p className="text-gray-500 text-sm mt-1">
                Permanently delete your account and all associated data — profile, watchlist, continue watching, and more. This cannot be undone.
              </p>
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-5 py-2.5 bg-red-600/15 hover:bg-red-600/30 text-red-400 hover:text-red-300 border border-red-500/30 rounded-lg font-semibold text-sm transition-all whitespace-nowrap"
            >
              Delete Account
            </button>
          </div>
        </motion.div>
      </div>

      {/* Delete Account Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={closeDeleteModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-900 border border-red-500/30 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl"
            >
              <div className="flex items-start gap-4 mb-5">
                <div className="flex-shrink-0 w-11 h-11 rounded-full bg-red-500/15 flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold">Delete your account?</h3>
                  <p className="text-gray-400 text-sm mt-1">
                    This will permanently delete your profile, watchlist, continue watching progress, and all account data. This action cannot be undone.
                  </p>
                </div>
              </div>

              <label className="block text-sm text-gray-300 mb-1.5">
                Type <span className="font-semibold text-white">{profile.email}</span> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                autoFocus
                className="w-full px-3.5 py-2.5 bg-black border border-white/20 rounded-lg focus:border-red-500 focus:outline-none text-white placeholder-gray-500 transition-colors"
                placeholder="Enter your email to confirm"
              />

              {hasPassword && (
                <div className="mt-4">
                  <label className="block text-sm text-gray-300 mb-1.5">Password</label>
                  <input
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-black border border-white/20 rounded-lg focus:border-red-500 focus:outline-none text-white placeholder-gray-500 transition-colors"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                  />
                  <p className="text-xs text-gray-500 mt-1.5">
                    Re-enter your password to confirm this action.
                  </p>
                </div>
              )}

              {deleteError && (
                <p className="mt-3 text-sm text-red-400">{deleteError}</p>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={closeDeleteModal}
                  disabled={deleting}
                  className="flex-1 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting || deleteConfirmText.trim() !== (profile.email || '').trim() || (hasPassword && !deletePassword)}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {deleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete Account'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AniList Character Picker Modal */}
      {showCharacterPicker && (
        <AniListCharacterPicker
          onSelect={handleCharacterSelect}
          onClose={() => setShowCharacterPicker(false)}
          currentCharacter={profile.anime_character as any}
        />
      )}
    </div>
  )
}

'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth, type Profile, type AnimeCharacterData } from '@/components/AuthProvider'
import ProfilePictureUpload from '@/components/ProfilePictureUpload'
import AniListCharacterPicker from '@/components/AniListCharacterPicker'
import Avatar from '@/components/Avatar'
import Navbar from '@/components/Navbar'

export default function ProfilePage() {
  const { user, profile: authProfile, isLoading: authLoading, isSignedIn, refreshProfile } = useAuth()
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
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [watchLaterCount, setWatchLaterCount] = useState(0)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!authLoading && !isSignedIn) {
      router.push('/auth/login')
    }
  }, [authLoading, isSignedIn, router])

  const handleSearchToggle = () => {
    setShowSearch(!showSearch)
    if (!showSearch) setSearchQuery('')
  }

  const handleSearchChange = (query: string) => setSearchQuery(query)

  const handleViewChange = (view: string) => router.push(`/?view=${view}`)

  // Fetch profile
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

  // Fetch watch later count
  useEffect(() => {
    if (isSignedIn) fetchWatchLaterCount()
  }, [isSignedIn])

  const fetchWatchLaterCount = async () => {
    try {
      const response = await fetch('/api/watchlist')
      if (response.ok) {
        const data = await response.json()
        setWatchLaterCount(data.length || 0)
      }
    } catch (error) {
      console.error('Failed to fetch watchlist:', error)
    }
  }

  const handleImageUpdate = (imageUrl: string) => {
    if (profile) {
      setProfile({ ...profile, avatar_url: imageUrl || null })
      refreshProfile()
    }
  }

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
        }),
      })
      if (response.ok) {
        const updatedProfile = await response.json()
        setProfile(updatedProfile)
        refreshProfile()
      }
    } catch (error) {
      console.error('Failed to set character:', error)
    }
  }

  const handleSave = async () => {
    setSaving(true)
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
      }
    } catch (error) {
      console.error('Failed to update profile:', error)
    } finally {
      setSaving(false)
    }
  }

  const removeCharacter = async () => {
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anime_character: null }),
      })
      if (response.ok) {
        const updatedProfile = await response.json()
        setProfile(updatedProfile)
        refreshProfile()
      }
    } catch (error) {
      console.error('Failed to remove character:', error)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-lg">Loading profile...</div>
      </div>
    )
  }

  if (!isSignedIn || !profile) return null

  const animeChar = profile.anime_character
  const avatarToShow = animeChar?.image?.large || profile.avatar_url

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar
        currentView="profile"
        showSearch={showSearch}
        searchQuery={searchQuery}
        watchLaterCount={watchLaterCount}
        onViewChange={handleViewChange}
        onSearchToggle={handleSearchToggle}
        onSearchChange={handleSearchChange}
      />

      <div className="max-w-4xl mx-auto px-4 py-32 pt-40">
        {/* Profile Header */}
        <div className="bg-gray-900/60 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/50 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:space-x-8 space-y-6 lg:space-y-0">
            {/* Avatar Section */}
            <div className="flex-shrink-0 flex flex-col items-center lg:items-start space-y-4">
              <div className="relative group">
                <Avatar
                  src={avatarToShow}
                  alt={profile.name || 'Profile'}
                  size={130}
                  fallbackText={profile.name || 'U'}
                  className="border-4 border-gray-600 rounded-full"
                />
                {animeChar && (
                  <div className="absolute -bottom-1 -right-1 bg-purple-600 rounded-full p-1.5 shadow-lg">
                    <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v.01M8 18a2 2 0 100-4 2 2 0 000 4z" />
                    </svg>
                  </div>
                )}
              </div>

              {!editing && (
                <div className="space-y-2 w-full">
                  <button
                    onClick={() => setShowCharacterPicker(true)}
                    className="w-full px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg text-sm text-purple-300 hover:text-purple-200 transition-all flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v.01M8 18a2 2 0 100-4 2 2 0 000 4z" />
                    </svg>
                    {animeChar ? 'Change Anime Avatar' : 'Choose Anime Avatar'}
                  </button>
                  {animeChar && (
                    <button
                      onClick={removeCharacter}
                      className="w-full px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-lg text-sm text-red-300 hover:text-red-200 transition-all"
                    >
                      Remove Anime Avatar
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-4 sm:space-y-0">
                <div>
                  <h1 className="text-3xl font-bold text-center lg:text-left">{profile.name || 'User'}</h1>
                  <p className="text-gray-400 text-center lg:text-left flex items-center justify-center lg:justify-start gap-2">
                    {profile.email}
                    {profile.gender && (
                      <span className="text-xs bg-gray-800 px-2 py-0.5 rounded-full text-gray-400">
                        {profile.gender === 'male' ? '♂ Male' :
                         profile.gender === 'female' ? '♀ Female' :
                         profile.gender === 'other' ? '⚧ Other' : ''}
                      </span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => setEditing(!editing)}
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors self-center sm:self-auto"
                >
                  {editing ? 'Cancel' : 'Edit Profile'}
                </button>
              </div>

              {editing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:border-purple-500 focus:outline-none text-white"
                        placeholder="Your name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Gender</label>
                      <select
                        value={formData.gender}
                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:border-purple-500 focus:outline-none text-white"
                      >
                        <option value="">Prefer not to say</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Bio</label>
                    <textarea
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:border-purple-500 focus:outline-none text-white resize-none"
                      placeholder="Tell us about yourself..."
                    />
                    <p className="text-xs text-gray-500 mt-1 text-right">{formData.bio.length} characters</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Location</label>
                      <input
                        type="text"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:border-purple-500 focus:outline-none text-white"
                        placeholder="Where are you based?"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Website</label>
                      <input
                        type="url"
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:border-purple-500 focus:outline-none text-white"
                        placeholder="https://your-website.com"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-2.5 bg-gradient-to-r from-[#8A2BE2] to-[#FF6EC4] text-white font-semibold rounded-lg hover:from-[#7B1FA2] hover:to-[#E91E63] transition-all duration-200 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {profile.bio && (
                    <p className="text-gray-300 leading-relaxed">{profile.bio}</p>
                  )}
                  <div className="flex flex-wrap gap-3">
                    {profile.location && (
                      <span className="text-gray-400 flex items-center text-sm">
                        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                        className="text-purple-400 hover:text-purple-300 flex items-center text-sm"
                      >
                        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        {profile.website.replace(/^https?:\/\//, '')}
                      </a>
                    )}
                  </div>
                  {animeChar && (
                    <div className="flex items-center gap-2 text-sm text-gray-400 pt-2 border-t border-gray-800 mt-3">
                      <svg className="w-4 h-4 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v.01M8 18a2 2 0 100-4 2 2 0 000 4z" />
                      </svg>
                      <span>Profile avatar set to <strong className="text-purple-300">{animeChar.name.full}</strong></span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Avatar Upload Section (only in non-editing mode) */}
        {!editing && (
          <div className="bg-gray-900/60 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 mb-8">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Upload Custom Photo
            </h3>
            <ProfilePictureUpload
              currentImage={profile.avatar_url}
              userName={profile.name}
              onImageUpdate={handleImageUpdate}
            />
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-900/60 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              Watchlist
            </h3>
            <p className="text-3xl font-bold text-purple-400">{watchLaterCount || 0}</p>
            <p className="text-gray-400 text-sm mt-1">Saved items</p>
          </div>

          <div className="bg-gray-900/60 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Account
            </h3>
            <p className="text-2xl font-bold text-green-400">Free</p>
            <p className="text-gray-400 text-sm mt-1">Plan</p>
          </div>

          <div className="bg-gray-900/60 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Member Since
            </h3>
            <p className="text-xl font-bold text-blue-400">
              {profile.created_at
                ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                : 'N/A'}
            </p>
            <p className="text-gray-400 text-sm mt-1">Join date</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gray-900/60 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/" className="p-4 bg-gray-800/80 hover:bg-gray-700 rounded-xl transition-colors text-center group">
              <div className="text-purple-400 mb-2 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m6-1a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="font-medium text-sm">Browse</p>
            </Link>
            <Link href="/search" className="p-4 bg-gray-800/80 hover:bg-gray-700 rounded-xl transition-colors text-center group">
              <div className="text-green-400 mb-2 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <p className="font-medium text-sm">Search</p>
            </Link>
            <Link href="/?view=watchlater" className="p-4 bg-gray-800/80 hover:bg-gray-700 rounded-xl transition-colors text-center group">
              <div className="text-orange-400 mb-2 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </div>
              <p className="font-medium text-sm">Watchlist</p>
            </Link>
            <Link href="/settings" className="p-4 bg-gray-800/80 hover:bg-gray-700 rounded-xl transition-colors text-center group">
              <div className="text-gray-400 mb-2 group-hover:rotate-90 transition-transform">
                <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="font-medium text-sm">Settings</p>
            </Link>
          </div>
        </div>
      </div>

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

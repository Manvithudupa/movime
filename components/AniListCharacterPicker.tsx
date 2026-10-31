'use client'

import React, { useState, useEffect, useRef } from 'react'

interface CharacterData {
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
}

interface AniListCharacterPickerProps {
  onSelect: (character: CharacterData) => void
  onClose: () => void
  currentCharacter?: CharacterData | null
}

export default function AniListCharacterPicker({ onSelect, onClose, currentCharacter }: AniListCharacterPickerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [characters, setCharacters] = useState<CharacterData[]>([])
  const [loading, setLoading] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  useEffect(() => {
    if (!searchQuery.trim()) {
      setCharacters([])
      return
    }

    const debounce = setTimeout(async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/anilist/character?q=${encodeURIComponent(searchQuery)}`)
        if (response.ok) {
          const data = await response.json()
          setCharacters(data.characters || [])
        }
      } catch (error) {
        console.error('Error searching characters:', error)
      } finally {
        setLoading(false)
      }
    }, 400)

    return () => clearTimeout(debounce)
  }, [searchQuery])

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div
        ref={modalRef}
        className="bg-black border border-white/10 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="text-xl font-bold text-white">Choose an Anime Character</h3>
          <button
            onClick={onClose}
            aria-label="Close character picker"
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-white/10">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search anime characters..."
              className="w-full px-4 py-3 pl-10 bg-white/5 border border-white/20 rounded-xl focus:border-white focus:outline-none focus:ring-1 focus:ring-white text-white placeholder-gray-500 transition-all"
            />
            <svg className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Character Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i}>
                  <div className="aspect-[3/4] bg-white/5 rounded-xl mb-2"></div>
                  <div className="h-3 bg-white/5 rounded w-3/4 mx-auto"></div>
                </div>
              ))}
            </div>
          ) : characters.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
              {characters.map((character) => (
                <button
                  key={character.id}
                  onClick={() => onSelect(character)}
                  className={`group relative rounded-xl overflow-hidden transition-all duration-200 ${
                    currentCharacter?.id === character.id
                      ? 'ring-2 ring-white scale-105'
                      : 'hover:ring-2 hover:ring-white/50 hover:scale-[1.02]'
                  }`}
                >
                  <div className="aspect-[3/4] relative bg-black">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={character.image.large}
                      alt={character.name.full}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-2 text-left">
                      <p className="text-white text-xs font-semibold leading-tight line-clamp-2 drop-shadow-lg">
                        {character.name.full}
                      </p>
                      {character.name.native && (
                        <p className="text-gray-300 text-xs line-clamp-1 mt-0.5">
                          {character.name.native}
                        </p>
                      )}
                    </div>
                    {currentCharacter?.id === character.id && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center">
                        <svg className="w-3.5 h-3.5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : searchQuery ? (
            <div className="text-center py-12">
              <svg className="w-10 h-10 mx-auto mb-4 text-white/25" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-gray-400">No characters found for &quot;{searchQuery}&quot;</p>
              <p className="text-muted-foreground text-sm mt-1">Try a different name or check the spelling</p>
            </div>
          ) : (
            <div className="text-center py-12">
              <svg className="w-10 h-10 mx-auto mb-4 text-white/25" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <p className="text-gray-400">Start typing to search for anime characters</p>
              <p className="text-muted-foreground text-sm mt-1">Choose your favorite character as your avatar</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-white text-black font-semibold rounded-xl hover:bg-gray-100 transition-all duration-200"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

'use client'

import React, { useState, useEffect, useRef } from 'react'
import Image from '@/components/ProxyImage'

interface CharacterData {
  id: number
  name: {
    first: string
    last: string
    full: string
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

interface AniListCharacterPickerProps {
  onSelect: (character: CharacterData) => void
  onClose: () => void
  currentCharacter: CharacterData | null
}

export default function AniListCharacterPicker({ onSelect, onClose, currentCharacter }: AniListCharacterPickerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [characters, setCharacters] = useState<CharacterData[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<CharacterData | null>(currentCharacter)
  const searchTimeout = useRef<NodeJS.Timeout | null>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setCharacters([])
      return
    }

    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current)
    }

    searchTimeout.current = setTimeout(async () => {
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

    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current)
    }
  }, [searchQuery])

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div
        ref={modalRef}
        className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="p-5 border-b border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">Choose an Anime Character</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for a character (e.g. Naruto, Goku, Luffy...)"
              className="w-full px-4 py-3 pl-10 bg-gray-800 border border-gray-600 rounded-xl focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-white placeholder-gray-500 transition-all"
              autoFocus
            />
            <svg className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Character Grid */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-[3/4] bg-gray-800 rounded-xl mb-2"></div>
                  <div className="h-3 bg-gray-800 rounded w-3/4 mx-auto"></div>
                </div>
              ))}
            </div>
          ) : characters.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
              {characters.map((char) => {
                const isSelected = selected?.id === char.id
                const mediaTitle = char.media?.nodes?.[0]?.title?.english || char.media?.nodes?.[0]?.title?.romaji || ''
                return (
                  <button
                    key={char.id}
                    onClick={() => setSelected(char)}
                    className={`group relative rounded-xl overflow-hidden transition-all duration-200 ${
                      isSelected
                        ? 'ring-2 ring-purple-500 scale-105'
                        : 'hover:ring-2 hover:ring-purple-400/50 hover:scale-[1.02]'
                    }`}
                  >
                    <div className="aspect-[3/4] bg-gray-800">
                      {char.image?.large ? (
                        <Image
                          src={char.image.large}
                          alt={char.name.full}
                          fill
                          className="object-cover group-hover:scale-110 transition-transform duration-300"
                          sizes="(max-width: 640px) 33vw, 25vw"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-600 text-2xl font-bold">
                          {char.name.full?.charAt(0) || '?'}
                        </div>
                      )}
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-2 text-left">
                      <p className="text-white text-xs font-semibold leading-tight line-clamp-2 drop-shadow-lg">
                        {char.name.full}
                      </p>
                      {mediaTitle && (
                        <p className="text-gray-300 text-[10px] line-clamp-1 mt-0.5">
                          {mediaTitle}
                        </p>
                      )}
                    </div>
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center">
                        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          ) : searchQuery.trim() ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">🔍</div>
              <p className="text-gray-400">No characters found for &quot;{searchQuery}&quot;</p>
              <p className="text-gray-600 text-sm mt-1">Try a different name or check the spelling</p>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">🎭</div>
              <p className="text-gray-400 text-lg">Search for your favorite anime character</p>
              <p className="text-gray-600 text-sm mt-1">Use their name to find matching characters</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-700 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors text-sm"
          >
            Cancel
          </button>
          <div className="flex items-center gap-3">
            {selected && (
              <button
                onClick={() => { onSelect(selected); onClose(); }}
                className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white font-semibold rounded-xl transition-all duration-200"
              >
                Set as Profile Avatar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export type { CharacterData }

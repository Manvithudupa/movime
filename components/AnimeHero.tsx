'use client';

import React, { useState, useEffect } from 'react';
import Image from '@/components/ProxyImage';
import Link from 'next/link';
import type { ContentItem } from '@/lib/types';

interface AnimeHeroProps {
  animeContent: ContentItem[];
}

export default function AnimeHero({ animeContent }: AnimeHeroProps) {
  const [animeSliderIndex, setAnimeSliderIndex] = useState(0);

  useEffect(() => {
    if (animeContent.length <= 1) return;
    const interval = setInterval(() => {
      setAnimeSliderIndex((prev) => (prev + 1) % Math.min(animeContent.length, 6));
    }, 6000);
    return () => clearInterval(interval);
  }, [animeContent.length]);

  if (animeContent.length === 0) return null;

  return (
    <div className="relative w-full overflow-hidden" style={{ minHeight: '60vh', isolation: 'isolate' }}>
      {/* Background images */}
      <div className="absolute inset-0">
        {animeContent.slice(0, 6).map((anime, idx) => (
          <div
            key={anime.id}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${idx === animeSliderIndex ? 'opacity-100' : 'opacity-0'}`}
          >
            <Image
              src={`https://image.tmdb.org/t/p/original${anime.backdrop_path || anime.poster_path}`}
              alt={anime.name || anime.title || ''}
              fill
              className="object-cover"
              priority={idx === 0}
            />
          </div>
        ))}
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
      </div>
      {/* Slide indicators */}
      {animeContent.length > 1 && (
        <div className="absolute bottom-4 right-6 z-20 flex space-x-2">
          {animeContent.slice(0, 6).map((_, idx) => (
            <button
              key={idx}
              onClick={() => setAnimeSliderIndex(idx)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${idx === animeSliderIndex ? 'bg-white scale-110' : 'bg-white/50 hover:bg-white/70'}`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
      {/* Prev/Next arrows */}
      {animeContent.length > 1 && (
        <>
          <button
            onClick={() => {
              const total = Math.min(animeContent.length, 6);
              setAnimeSliderIndex((animeSliderIndex - 1 + total) % total);
            }}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition-all"
            aria-label="Previous anime"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
          </button>
          <button
            onClick={() => {
              const total = Math.min(animeContent.length, 6);
              setAnimeSliderIndex((animeSliderIndex + 1) % total);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition-all"
            aria-label="Next anime"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
          </button>
        </>
      )}
      {/* Content */}
      <div className="relative z-10 h-full flex items-center px-4 sm:px-6 lg:px-8 pt-48 pb-12">
        <div className="max-w-2xl">
          {animeContent[animeSliderIndex] && (
            <>
              <h2 className="text-2xl sm:text-4xl lg:text-5xl font-bold text-white mb-3 leading-tight">
                {animeContent[animeSliderIndex].name || animeContent[animeSliderIndex].title}
              </h2>
              <p className="text-gray-200 text-xs sm:text-base mb-5 line-clamp-3 max-w-xl leading-relaxed">
                {animeContent[animeSliderIndex].overview || ''}
              </p>
              <div className="flex flex-wrap gap-2 sm:gap-3">
                <Link
                  href={`/watch?id=${animeContent[animeSliderIndex].id}&type=${animeContent[animeSliderIndex].media_type || 'tv'}`}
                  className="inline-flex items-center px-4 sm:px-6 py-2.5 sm:py-3 bg-white text-black font-semibold rounded-xl transition-all text-xs sm:text-sm hover:bg-gray-100"
                >
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8 5v10l7-5z"/>
                  </svg>
                  Watch Now
                </Link>
                <Link
                  href={`/details?id=${animeContent[animeSliderIndex].id}&type=${animeContent[animeSliderIndex].media_type || 'tv'}`}
                  className="inline-flex items-center px-4 sm:px-6 py-2.5 sm:py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white border border-white/30 rounded-xl font-semibold transition-all text-xs sm:text-sm"
                >
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  More Details
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from '@/components/ProxyImage';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchVideos } from '@/lib/utils';
import type { ContentItem } from '@/lib/types';
import { SkeletonHero } from '@/components/SkeletonHero';

interface AnimeHeroProps {
  animeContent: ContentItem[];
  onAddToWatchLater?: (item: ContentItem) => void;
  isInWatchLater?: (item: ContentItem) => boolean;
  getWatchStatus?: (item: ContentItem) => string | undefined;
}

const statusLabels: Record<string, string> = {
  watching: 'Watching',
  completed: 'Completed',
  plan_to_watch: 'Plan to Watch',
  dropped: 'Dropped',
};

const SWIPE_DISTANCE = 50;

// Common TMDB genre ids -> names, so discover results (which only carry
// numeric genre_ids) can still render meaningful genre chips.
const GENRE_ID_MAP: Record<number, string> = {
  16: 'Animation',
  35: 'Comedy',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  10759: 'Action & Adventure',
  9648: 'Mystery',
  10765: 'Sci-Fi & Fantasy',
  10768: 'War & Politics',
  10762: 'Kids',
  10766: 'Soap',
  10767: 'Talk',
  37: 'Western',
  10770: 'TV Movie',
};

export default function AnimeHero({
  animeContent,
  onAddToWatchLater,
  isInWatchLater,
  getWatchStatus,
}: AnimeHeroProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const total = Math.min(animeContent.length, 6);
  // The list can shrink between renders (a refresh returning fewer titles, or
  // a different genre/category loading into the same mounted component). Clamp
  // the index so the hero can never read past the end of the array — before,
  // that threw on `currentAnime.vote_average` and blanked every slide.
  const activeIndex = total > 0 ? Math.min(currentIndex, total - 1) : 0;
  const currentAnime = animeContent[activeIndex];

  // Bring the stored index back in range too, so navigation keeps working.
  useEffect(() => {
    if (total > 0 && currentIndex >= total) setCurrentIndex(0);
  }, [total, currentIndex]);

  // Track the slide so the async trailer fetch doesn't clobber newer slides
  const indexRef = useRef(currentIndex);
  useEffect(() => {
    indexRef.current = currentIndex;
  }, [currentIndex]);

  // Mobile detection
  useEffect(() => {
    const checkIsMobile = () => setIsMobile(window.innerWidth < 768);
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // Auto-rotate, paused on hover
  useEffect(() => {
    if (total <= 1 || isPaused) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % total);
    }, 7000);
    return () => clearInterval(interval);
  }, [total, isPaused]);

  // Fetch the YouTube trailer for the current anime (lightweight, cached by TMDB CDN)
  useEffect(() => {
    const anime = animeContent[currentIndex];
    if (!anime) {
      setTrailerKey(null);
      return;
    }
    let cancelled = false;
    setTrailerKey(null);
    // Cached request (memory + localStorage, 10-min TTL) — no raw TMDB call
    fetchVideos(String(anime.id), 'tv')
      .then((data) => {
        if (cancelled || indexRef.current !== currentIndex) return;
        const vids = data.results || [];
        const trailer =
          vids.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube') ||
          vids.find((v: any) => v.site === 'YouTube') ||
          null;
        setTrailerKey(trailer?.key || null);
      })
      .catch(() => {
        if (!cancelled) setTrailerKey(null);
      });
    return () => {
      cancelled = true;
    };
  }, [currentIndex, animeContent]);

  if (animeContent.length === 0 || !currentAnime) return <SkeletonHero />;

  const goToSlide = (index: number) => {
    if (index !== currentIndex) setCurrentIndex(index);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > SWIPE_DISTANCE) {
      goToSlide(currentIndex === total - 1 ? 0 : currentIndex + 1);
    } else if (distance < -SWIPE_DISTANCE) {
      goToSlide(currentIndex === 0 ? total - 1 : currentIndex - 1);
    }
  };

  const getTitle = (item: ContentItem) => item.name || item.title || '';

  const getReleaseYear = (item: ContentItem) => {
    const date = item.first_air_date || item.release_date || '';
    if (!date) return '';
    try {
      const year = new Date(date).getFullYear();
      return Number.isNaN(year) ? '' : year;
    } catch {
      return '';
    }
  };

  const getGenres = (item: ContentItem) => {
    if (Array.isArray(item.genres) && item.genres.length > 0) {
      return item.genres.slice(0, 3).map((g) => g.name);
    }
    return (item.genre_ids || [])
      .map((id) => GENRE_ID_MAP[id])
      .filter((name): name is string => Boolean(name))
      .slice(0, 3);
  };

  const truncateOverview = (text: string, maxLength: number) => {
    if (!text) return '';
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
  };

  const isMovieInWatchLater = (item: ContentItem): boolean =>
    isInWatchLater ? isInWatchLater(item) : false;

  const toggleWatchLater = (item: ContentItem) => {
    if (onAddToWatchLater) onAddToWatchLater(item);
  };

  const statusText = (item: ContentItem): string => {
    if (!getWatchStatus) return 'MY LIST';
    const status = getWatchStatus(item);
    return status ? statusLabels[status] || 'MY LIST' : 'MY LIST';
  };

  return (
    <motion.div
      className="relative w-full bg-black overflow-hidden"
      style={{ minHeight: 'calc(100vh - 4rem)', isolation: 'isolate' }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
    >
      {/* Background images */}
      <div className="absolute inset-0">
        {animeContent.slice(0, total).map((anime, index) => (
          <div
            key={anime.id}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
              index === activeIndex ? 'opacity-100 kenburns' : 'opacity-0'
            }`}
          >
            <Image
              src={`https://image.tmdb.org/t/p/original${
                isMobile ? anime.poster_path : anime.backdrop_path
              }`}
              alt={getTitle(anime)}
              fill
              className="object-cover object-center"
              priority={index === 0}
              sizes="100vw"
            />
          </div>
        ))}
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-1/2 md:h-60 bg-gradient-to-t from-black via-black/60 to-transparent" />
      </div>

      {/* Slide indicators */}
      {total > 1 && (
        <div className="hidden md:block absolute bottom-8 right-10 z-30">
          <div className="flex space-x-3">
            {animeContent.slice(0, total).map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  index === activeIndex
                    ? 'bg-white scale-110 shadow-lg'
                    : 'bg-white/50 hover:bg-white/70'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Desktop content */}
      <motion.div
        className="hidden md:flex relative z-20 px-4 sm:px-6 lg:px-8 pl-16 sm:pl-24 lg:pl-32 h-full items-start pt-48 sm:pt-44 md:pt-56 lg:pt-64 pb-32 sm:pb-36 lg:pb-48"
        initial={{ opacity: 0, x: -100 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.3 }}
      >
        <div className="max-w-xl sm:max-w-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIndex}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              transition={{ duration: 0.3 }}
            >
              <motion.h1
                className="text-2xl sm:text-3xl md:text-5xl lg:text-5xl font-bold text-white mb-2 sm:mb-3 md:mb-4 leading-tight"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                {getTitle(currentAnime)}
              </motion.h1>

              <motion.div
                className="flex flex-wrap items-center gap-2 sm:gap-3 md:gap-5 text-xs sm:text-sm text-gray-200 font-medium mb-3 sm:mb-4 md:mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                {getReleaseYear(currentAnime) && (
                  <span>{getReleaseYear(currentAnime)}</span>
                )}
                <span className="bg-white/10 text-white font-semibold px-2 py-1 rounded-sm text-[10px] sm:text-[11px] leading-none">
                  Anime
                </span>
                {getGenres(currentAnime)[0] && (
                  <span>{getGenres(currentAnime)[0]}</span>
                )}
                {currentAnime.vote_average > 0 && (
                  <span className="flex items-center gap-1">
                    <svg
                      className="w-3.5 h-3.5 text-yellow-400 fill-current"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span>{currentAnime.vote_average.toFixed(1)}</span>
                  </span>
                )}
              </motion.div>

              <motion.p
                className="text-gray-300 text-xs sm:text-sm md:text-base lg:text-lg leading-relaxed mb-3 sm:mb-4 md:mb-6 max-w-lg line-clamp-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                {truncateOverview(currentAnime.overview || '', 100)}
              </motion.p>

              <motion.div
                className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6 md:mb-10 max-w-lg"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <Link
                  href={`/watch?id=${currentAnime.id}&type=${
                    currentAnime.media_type || 'tv'
                  }`}
                  className="flex items-center justify-center gap-2 px-5 sm:px-6 md:px-7 py-2.5 sm:py-3 rounded-lg font-semibold text-xs sm:text-sm tracking-wide text-black bg-white hover:bg-gray-100 transition-all duration-300 shadow-lg w-full sm:w-auto"
                >
                  <svg
                    className="w-4 sm:w-5 h-4 sm:h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M8 5v10l7-5z" />
                  </svg>
                  WATCH NOW
                </Link>

                <button
                  onClick={() => toggleWatchLater(currentAnime)}
                  className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 rounded-lg font-semibold text-xs sm:text-sm tracking-wide transition-colors border border-white/30 hover:border-white/50 w-full sm:w-auto"
                >
                  <svg
                    className={`w-4 sm:w-5 h-4 sm:h-5 ${
                      isMovieInWatchLater(currentAnime) ? 'fill-current' : ''
                    }`}
                    fill={isMovieInWatchLater(currentAnime) ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                    />
                  </svg>
                  {isMovieInWatchLater(currentAnime)
                    ? `${statusText(currentAnime)} ✓`
                    : '+ MY LIST'}
                </button>

                <Link
                  href={`/details?id=${currentAnime.id}&type=${
                    currentAnime.media_type || 'tv'
                  }`}
                  className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 rounded-lg font-semibold text-xs sm:text-sm tracking-wide transition-colors border border-white/30 hover:border-white/50 w-full sm:w-auto"
                >
                  <svg
                    className="w-4 sm:w-5 h-4 sm:h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  DETAILS
                </Link>
              </motion.div>

              {trailerKey && (
                <motion.button
                  onClick={() =>
                    window.open(
                      `https://www.youtube.com/watch?v=${trailerKey}`,
                      '_blank',
                      'noopener,noreferrer'
                    )
                  }
                  className="flex items-center gap-3 sm:gap-4 group text-white/90 hover:text-white tracking-wider"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="w-10 sm:w-12 md:w-14 h-10 sm:h-12 md:h-14 rounded-full flex items-center justify-center border-2 border-white/70 group-hover:border-white transition-colors">
                    <svg
                      className="w-5 sm:w-6 md:w-7 h-5 sm:h-6 md:h-7 ml-0.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M8 5v10l7-5z" />
                    </svg>
                  </span>
                  <span className="text-xs sm:text-sm font-medium">WATCH TRAILER</span>
                </motion.button>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Mobile content */}
      <motion.div
        className="md:hidden absolute inset-0 z-20 flex flex-col px-4 pb-8"
        style={{ touchAction: 'pan-y' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="absolute bottom-0 left-0 right-0 h-3/5 bg-gradient-to-t from-black via-black/80 via-60% to-transparent pointer-events-none" />
        <div className="flex-1" />
        <AnimatePresence mode="wait">
          <motion.div
            key={activeIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="relative z-10 flex flex-col"
          >
            <motion.h1
              className="text-2xl font-bold text-white mb-2 leading-tight tracking-wide"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              {getTitle(currentAnime)}
            </motion.h1>

            <motion.div
              className="flex items-center gap-3 mb-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              {getReleaseYear(currentAnime) && (
                <div className="flex items-center gap-2">
                  <svg
                    className="w-3 h-3 text-gray-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span className="text-white text-xs font-medium">
                    {getReleaseYear(currentAnime)}
                  </span>
                </div>
              )}
              <div className="bg-white/10 backdrop-blur-sm px-1.5 py-0.5 rounded shadow-lg">
                <span className="text-white font-bold text-[10px]">ANIME</span>
              </div>
              {currentAnime.vote_average > 0 && (
                <div className="flex items-center gap-1">
                  <svg
                    className="w-3 h-3 text-yellow-400 fill-current"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="text-white text-xs font-medium">
                    {currentAnime.vote_average.toFixed(1)}
                  </span>
                </div>
              )}
            </motion.div>

            {getGenres(currentAnime).length > 0 && (
              <motion.div
                className="flex flex-wrap gap-1.5 mb-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.45 }}
              >
                {getGenres(currentAnime).map((genreName, idx) => (
                  <span
                    key={`${genreName}-${idx}`}
                    className="bg-black/50 backdrop-blur-sm text-white px-2.5 py-0.5 rounded-full text-[10px] font-medium border border-white/20"
                  >
                    {genreName}
                  </span>
                ))}
              </motion.div>
            )}

            {currentAnime.overview && (
              <motion.p
                className="text-gray-200 text-xs leading-relaxed mb-4 line-clamp-3 max-w-md"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                {truncateOverview(currentAnime.overview, 120)}
              </motion.p>
            )}

            <motion.div
              className="flex items-center gap-2.5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.55 }}
            >
              <Link
                href={`/watch?id=${currentAnime.id}&type=${
                  currentAnime.media_type || 'tv'
                }`}
                className="flex-1 flex items-center justify-center gap-2 bg-white text-black py-3 rounded-lg font-bold text-sm tracking-wide shadow-xl hover:bg-gray-100 transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                </svg>
                Watch Now
              </Link>
              <Link
                href={`/details?id=${currentAnime.id}&type=${
                  currentAnime.media_type || 'tv'
                }`}
                className="flex items-center justify-center w-11 h-11 bg-white/10 backdrop-blur-sm text-white rounded-full border border-white/30 hover:bg-white/20 transition-colors shadow-lg"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </Link>
            </motion.div>

            {trailerKey && (
              <motion.button
                onClick={() =>
                  window.open(
                    `https://www.youtube.com/watch?v=${trailerKey}`,
                    '_blank',
                    'noopener,noreferrer'
                  )
                }
                className="flex items-center justify-center gap-2 mt-3 group text-white/80 hover:text-white self-start"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <span className="w-8 h-8 rounded-full flex items-center justify-center border border-white/50 group-hover:border-white transition-colors">
                  <svg
                    className="w-3.5 h-3.5 ml-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M8 5v10l7-5z" />
                  </svg>
                </span>
                <span className="text-[11px] font-medium tracking-wide">
                  Watch Trailer
                </span>
              </motion.button>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Navigation arrows */}
      {total > 1 && (
        <>
          <button
            onClick={() => goToSlide(currentIndex === 0 ? total - 1 : currentIndex - 1)}
            className="hidden lg:flex absolute left-4 top-1/2 -translate-y-1/2 items-center justify-center w-12 h-12 bg-black/60 hover:bg-black/80 text-white rounded-full shadow-lg transition duration-300 hover:scale-110 backdrop-blur-md z-30"
            aria-label="Previous anime"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => goToSlide(currentIndex === total - 1 ? 0 : currentIndex + 1)}
            className="hidden lg:flex absolute right-4 top-1/2 -translate-y-1/2 items-center justify-center w-12 h-12 bg-black/60 hover:bg-black/80 text-white rounded-full shadow-lg transition duration-300 hover:scale-110 backdrop-blur-md z-30"
            aria-label="Next anime"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}
    </motion.div>
  );
}

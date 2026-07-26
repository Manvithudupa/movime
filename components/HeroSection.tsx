'use client';

import React, { useState, useEffect } from 'react';
import Image from '@/components/ProxyImage';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  fetchMovies, 
  TMDB_IMAGE_BASE_URL,
  fetchContentDetails,
  formatRuntime
} from '@/lib/utils';
import type { ContentItem, Movie } from '@/lib/types';

interface HeroSectionProps {
  onWatchNow?: (movie: ContentItem) => void;
  onMoreDetails?: (movie: ContentItem) => void;
  onAddToWatchLater?: (movie: ContentItem) => void;
  isInWatchLater?: (movie: ContentItem) => boolean;
  getWatchStatus?: (movie: ContentItem) => string | undefined;
}

const statusLabels: Record<string, string> = {
  watching: 'Watching',
  completed: 'Completed',
  plan_to_watch: 'Plan to Watch',
  dropped: 'Dropped',
};

export default function HeroSection({ onWatchNow, onMoreDetails, onAddToWatchLater, isInWatchLater, getWatchStatus }: HeroSectionProps) {
  const [featuredMovies, setFeaturedMovies] = useState<Movie[]>([]);
  const [currentMovieIndex, setCurrentMovieIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [localWatchLater, setLocalWatchLater] = useState<any[]>([]);
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  useEffect(() => {
    const loadFeaturedMovies = async () => {
      try {
        setLoading(true);

        const moviesResponse = await fetchMovies(1);
        
        if (moviesResponse.results && moviesResponse.results.length > 0) {
          const topMovies = moviesResponse.results.slice(0, 6);
          const movieDetailsPromises = topMovies.map((movie: any) => fetchContentDetails(movie.id.toString(), 'movie'));
          
          const movieDetails = await Promise.all(movieDetailsPromises);
          const validMovies = movieDetails.filter(movie => movie !== null) as Movie[];
          
          if (validMovies.length > 0) {
            setFeaturedMovies(validMovies);
            setTimeout(() => setHasInitiallyLoaded(true), 100);
          }
        }
      } catch (error) {
        console.error('Error loading featured movies:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFeaturedMovies();
  }, []);

  useEffect(() => {
    if (featuredMovies.length <= 1 || isPaused) return;

    const interval = setInterval(() => {
      setCurrentMovieIndex((prev) => (prev + 1) % featuredMovies.length);
    }, 7000);

    return () => clearInterval(interval);
  }, [featuredMovies.length, isPaused]);

  const formatReleaseYear = (releaseDate: string) => {
    return new Date(releaseDate).getFullYear();
  };

  const truncateOverview = (text: string, maxLength: number = 200) => {
    if (!text || typeof text !== 'string') return '';
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  const handleWatchNow = () => {
    const currentMovie = featuredMovies[currentMovieIndex];
    if (currentMovie && onWatchNow) {
      onWatchNow(currentMovie as ContentItem);
    }
  };

  const handleMoreDetails = () => {
    const currentMovie = featuredMovies[currentMovieIndex];
    if (currentMovie && onMoreDetails) {
      onMoreDetails(currentMovie as ContentItem);
    }
  };

  const goToSlide = (index: number) => {
    if (index !== currentMovieIndex) {
      setCurrentMovieIndex(index);
    }
  };

  const minSwipeDistance = 50;

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
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      goToSlide(currentMovieIndex === featuredMovies.length - 1 ? 0 : currentMovieIndex + 1);
    } else if (isRightSwipe) {
      goToSlide(currentMovieIndex === 0 ? featuredMovies.length - 1 : currentMovieIndex - 1);
    }
  };

  const currentMovie = featuredMovies[currentMovieIndex];

    const isMovieInWatchLater = (movie: any): boolean => {
    if (isInWatchLater) {
      return isInWatchLater(movie as ContentItem);
    }
    return localWatchLater.some(w => w.id === movie.id && w.type === 'movie');
  };
  
  const toggleWatchLater = (movie: any) => {
    // Let the parent callback handle all state (handles both API and localStorage sync)
    if (onAddToWatchLater) {
      onAddToWatchLater(movie as ContentItem);
    }
  };

  const getCertification = (movie: any): string => {
    try {
      const rels = movie.release_dates?.results || [];
      const us = rels.find((r: any) => r.iso_3166_1 === 'US');
      const cert = us?.release_dates?.find((d: any) => d.certification)?.certification;
      return cert || '';
    } catch { return ''; }
  };

  const getRuntime = (movie: any): string => {
    if (movie.runtime) return formatRuntime(movie.runtime);
    return '';
  };

  const getPrimaryGenre = (movie: any): string => movie.genres?.[0]?.name || '';

  const getTrailer = (movie: any) => {
    const vids = movie.videos?.results || [];
    return vids.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube') || vids[0];
  };

  if (loading) {
    return (
      <div className="relative h-screen bg-black">
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent z-10" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent z-10" />
        <div className="relative z-20 px-4 sm:px-6 lg:px-8 h-full flex items-center">
          <div className="max-w-2xl">
            <div className="h-8 bg-white/5 rounded mb-4 w-48"></div>
            <div className="h-12 bg-white/5 rounded mb-6 w-96"></div>
            <div className="space-y-2 mb-6">
              <div className="h-4 bg-white/5 rounded w-full"></div>
              <div className="h-4 bg-white/5 rounded w-4/5"></div>
              <div className="h-4 bg-white/5 rounded w-3/5"></div>
            </div>
            <div className="flex space-x-4">
              <div className="h-12 bg-white/5 rounded w-32"></div>
              <div className="h-12 bg-white/5 rounded w-32"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentMovie) {
    return null;
  }

  return (
    <motion.div 
      className="relative h-auto min-h-screen md:min-h-screen bg-black"
      style={{ minHeight: 'calc(100vh - 4rem)', isolation: 'isolate' }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
    >
      {/* Background Images */}
      <div className="absolute inset-0">
        {featuredMovies.map((movie, index) => (
          <div
            key={movie.id}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${index === currentMovieIndex ? 'opacity-100' : 'opacity-0'}`}
          >
            <Image
              src={`https://image.tmdb.org/t/p/original${isMobile ? movie.poster_path : movie.backdrop_path}`}
              alt={movie.title}
              fill
              className="object-cover object-center"
              priority={index === 0}
              sizes="100vw"
            />
          </div>
        ))}
  <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/40 to-transparent" />
  <div className="absolute bottom-0 left-0 right-0 h-40 md:h-60 bg-gradient-to-t from-black via-black/70 to-transparent" />
      </div>

      {/* Carousel Indicators */}
      {featuredMovies.length > 1 && (
        <div className="hidden md:block absolute bottom-8 right-10 z-30">
          <div className="flex space-x-3">
            {featuredMovies.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  index === currentMovieIndex 
                    ? 'bg-white scale-110 shadow-lg' 
                    : 'bg-white/50 hover:bg-white/70'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Desktop Main Content */}
      <motion.div 
        className="hidden md:flex relative z-20 px-4 sm:px-6 lg:px-8 pl-16 sm:pl-24 lg:pl-32 h-full items-start pt-48 sm:pt-44 md:pt-56 lg:pt-64 pb-32 sm:pb-36 lg:pb-48"
        initial={{ opacity: 0, x: -100 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.3 }}
      >
        <div className="max-w-xl sm:max-w-2xl">
          <AnimatePresence mode="wait">
            <motion.div 
              key={currentMovieIndex}
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
                {currentMovie.title}
              </motion.h1>
              <motion.div 
                className="flex flex-wrap items-center gap-2 sm:gap-3 md:gap-5 text-xs sm:text-sm text-gray-200 font-medium mb-3 sm:mb-4 md:mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
              <span>{formatReleaseYear(currentMovie.release_date)}</span>
              {getCertification(currentMovie) && (
                <span className="bg-white/10 text-white font-semibold px-2 py-1 rounded-sm text-[10px] sm:text-[11px] leading-none">
                  {getCertification(currentMovie)}
                </span>
              )}
              {getRuntime(currentMovie) && <span>{getRuntime(currentMovie)}</span>}
              {getPrimaryGenre(currentMovie) && <span>{getPrimaryGenre(currentMovie)}</span>}
              </motion.div>
              <motion.p 
                className="text-gray-300 text-xs sm:text-sm md:text-base lg:text-lg leading-relaxed mb-3 sm:mb-4 md:mb-6 max-w-lg line-clamp-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                {truncateOverview(currentMovie.overview, 100)}
              </motion.p>
              <motion.div 
                className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6 md:mb-10 max-w-lg"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <motion.button
                  onClick={handleWatchNow}
                  className="flex items-center justify-center gap-2 px-5 sm:px-6 md:px-7 py-2.5 sm:py-3 rounded-lg font-semibold text-xs sm:text-sm tracking-wide text-black bg-white hover:bg-gray-100 transition-all duration-300 shadow-lg focus:outline-none focus:ring-2 focus:ring-white/60 w-full sm:w-auto"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <svg className="w-4 sm:w-5 h-4 sm:h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M8 5v10l7-5z"/></svg>
                  PLAY
                </motion.button>
                <motion.button
                  onClick={() => toggleWatchLater(currentMovie)}
                  className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 rounded-lg font-semibold text-xs sm:text-sm tracking-wide transition-colors border border-white/30 hover:border-white/50 w-full sm:w-auto"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <svg className={`w-4 sm:w-5 h-4 sm:h-5 ${isMovieInWatchLater(currentMovie) ? 'fill-current' : ''}`} fill={isMovieInWatchLater(currentMovie) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                  {isMovieInWatchLater(currentMovie) ? `${getWatchStatus ? statusLabels[getWatchStatus(currentMovie as ContentItem) || 'plan_to_watch'] || 'MY LIST' : 'MY LIST'} ✓` : '+ MY LIST'}
                </motion.button>
                <motion.button
                  onClick={handleMoreDetails}
                  className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 rounded-lg font-semibold text-xs sm:text-sm tracking-wide transition-colors border border-white/30 hover:border-white/50 w-full sm:w-auto"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <svg className="w-4 sm:w-5 h-4 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  DETAILS
                </motion.button>
              </motion.div>
              {getTrailer(currentMovie) && (
                <motion.button
                  onClick={() => {
                    const t = getTrailer(currentMovie); if (t) window.open(`https://www.youtube.com/watch?v=${t.key}`, '_blank', 'noopener,noreferrer');
                  }}
                  className="flex items-center gap-3 sm:gap-4 group text-white/90 hover:text-white tracking-wider"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="w-10 sm:w-12 md:w-14 h-10 sm:h-12 md:h-14 rounded-full flex items-center justify-center border-2 border-white/70 group-hover:border-white transition-colors">
                    <svg className="w-5 sm:w-6 md:w-7 h-5 sm:h-6 md:h-7 ml-0.5" fill="currentColor" viewBox="0 0 20 20"><path d="M8 5v10l7-5z"/></svg>
                  </span>
                  <span className="text-xs sm:text-sm font-medium">WATCH TRAILER</span>
                </motion.button>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Mobile Main Content */}
      <motion.div 
        className="md:hidden relative z-20 h-full flex flex-col justify-end px-4 pb-6 pt-20"
        style={{ touchAction: 'pan-y' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Semi-transparent overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-0" />
        
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentMovieIndex}
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
              {currentMovie.title}
            </motion.h1>

            <motion.div 
              className="flex items-center gap-3 mb-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <div className="flex items-center gap-2">
                <svg className="w-3 h-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-white text-xs font-medium">{formatReleaseYear(currentMovie.release_date)}</span>
              </div>
              
              {getCertification(currentMovie) && (
                <div className="bg-white/10 backdrop-blur-sm px-1.5 py-0.1 rounded shadow-lg">
                  <span className="text-white font-bold text-[10px]">{getCertification(currentMovie)}</span>
                </div>
              )}
              
              {currentMovie.vote_average > 0 && (
                <div className="flex items-center gap-1">
                  <svg className="w-3 h-3 text-yellow-400 fill-current" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="text-white text-xs font-medium">{currentMovie.vote_average.toFixed(1)}</span>
                </div>
              )}
            </motion.div>

            <motion.div 
              className="flex flex-wrap gap-1.5 mb-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.45 }}
            >
              {currentMovie.genres?.slice(0, 3).map((genre: { id: number; name: string }) => (
                <span 
                  key={genre.id} 
                  className="bg-black/50 backdrop-blur-sm text-white px-2.5 py-0.5 rounded-full text-[10px] font-medium border border-white/20"
                >
                  {genre.name}
                </span>
              ))}
            </motion.div>

            {/* Synopsis - now visible on mobile! */}
            {currentMovie.overview && (
              <motion.p 
                className="text-gray-200 text-xs leading-relaxed mb-4 line-clamp-3 max-w-md"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                {truncateOverview(currentMovie.overview, 120)}
              </motion.p>
            )}

            <motion.div 
              className="flex items-center gap-2.5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.55 }}
            >
              <motion.button
                onClick={handleWatchNow}
                className="flex-1 flex items-center justify-center gap-2 bg-white text-black py-3 rounded-lg font-bold text-sm tracking-wide shadow-xl hover:bg-gray-100 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.2 }}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                </svg>
                Watch Now
              </motion.button>

              <motion.button
                onClick={handleMoreDetails}
                className="flex items-center justify-center w-11 h-11 bg-white/10 backdrop-blur-sm text-white rounded-full border border-white/30 hover:bg-white/20 transition-colors shadow-lg"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </motion.button>
            </motion.div>

            {getTrailer(currentMovie) && (
              <motion.button
                onClick={() => {
                  const t = getTrailer(currentMovie); if (t) window.open(`https://www.youtube.com/watch?v=${t.key}`, '_blank', 'noopener,noreferrer');
                }}
                className="flex items-center justify-center gap-2 mt-3 group text-white/80 hover:text-white self-start"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <span className="w-8 h-8 rounded-full flex items-center justify-center border border-white/50 group-hover:border-white transition-colors">
                  <svg className="w-3.5 h-3.5 ml-0.5" fill="currentColor" viewBox="0 0 20 20"><path d="M8 5v10l7-5z"/></svg>
                </span>
                <span className="text-[11px] font-medium tracking-wide">Watch Trailer</span>
              </motion.button>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>

        {/* Navigation Arrows */}
        {featuredMovies.length > 1 && (
          <>
            <motion.button
                onClick={() => goToSlide(currentMovieIndex === 0 ? featuredMovies.length - 1 : currentMovieIndex - 1)}
                className="hidden lg:flex absolute left-4 top-1/2 -translate-y-1/2 items-center justify-center w-12 h-12 bg-black/60 hover:bg-black/80 text-white rounded-full shadow-lg transition duration-300 hover:scale-110 backdrop-blur-md z-30"
                aria-label="Previous movie"
                initial={hasInitiallyLoaded ? false : { opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: hasInitiallyLoaded ? 0.3 : 0.6, delay: hasInitiallyLoaded ? 0 : 1.2 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
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
            </motion.button>

            <motion.button
                onClick={() => goToSlide(currentMovieIndex === featuredMovies.length - 1 ? 0 : currentMovieIndex + 1)}
                className="hidden lg:flex absolute right-4 top-1/2 -translate-y-1/2 items-center justify-center w-12 h-12 bg-black/60 hover:bg-black/80 text-white rounded-full shadow-lg transition duration-300 hover:scale-110 backdrop-blur-md z-30"
                aria-label="Next movie"
                initial={hasInitiallyLoaded ? false : { opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: hasInitiallyLoaded ? 0.3 : 0.6, delay: hasInitiallyLoaded ? 0 : 1.2 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
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
            </motion.button>
          </>
        )}
    </motion.div>
  );
}

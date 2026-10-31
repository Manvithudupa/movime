'use client';

import React, { useState, useEffect, Suspense, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from '@/components/ProxyImage';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  fetchContentDetails, 
  fetchSeasonDetails, 
  TMDB_IMAGE_BASE_URL,
  formatRuntime,
  filterAdultContent,
  blockedMovieIds,
  getLocalStorage,
  setLocalStorage
} from '@/lib/utils';
import type { Movie, TVShow, Season, Episode, Video, CastMember } from '@/lib/types';
import { useAuth } from '@/components/AuthProvider';
import { useWatchlistStore, useContinueWatchingStore } from '@/lib/store';
import { STATUS_INFO } from '@/lib/constants';
import Navbar from '@/components/Navbar';
import ShareButton from '@/components/ShareButton';
import { SkeletonDetails } from '@/components/SkeletonDetails';
import { SkeletonPageLayout } from '@/components/SkeletonPageLayout';

function DetailsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const [content, setContent] = useState<Movie | TVShow | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [seasonData, setSeasonData] = useState<Season | null>(null);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const statusTriggerRef = useRef<HTMLButtonElement>(null);
  const statusMenuRef = useRef<HTMLDivElement>(null);
  const [isTrailerMuted, setIsTrailerMuted] = useState(true);

  const watchLater = useWatchlistStore((s) => s.items);
  const watchLaterCount = useWatchlistStore((s) => s.count);
  const fetchWatchlist = useWatchlistStore((s) => s.fetch);
  const addItemToStore = useWatchlistStore((s) => s.add);
  const removeItemFromStore = useWatchlistStore((s) => s.remove);
  const updateStatusInStore = useWatchlistStore((s) => s.updateStatus);
  const continueWatching = useContinueWatchingStore((s) => s.items);
  const fetchContinueWatching = useContinueWatchingStore((s) => s.fetch);


  const statusLabels = STATUS_INFO;

  const contentId = searchParams.get('id');
  const contentType = searchParams.get('type') as 'movie' | 'tv';

  type MovieReleaseMeta = {
    release_dates?: {
      results?: Array<{
        iso_3166_1: string;
        release_dates?: Array<{ certification?: string }>;
      }>;
    };
  };
  type TVRatingMeta = {
    content_ratings?: {
      results?: Array<{
        iso_3166_1: string;
        rating?: string;
      }>;
    };
  };

  const loadContent = useCallback(async () => {
    if (!contentId || !contentType) return;
    setLoading(true);
    try {
      const data = await fetchContentDetails(contentId, contentType);
      setContent(data);
      if (contentType === 'tv' && data?.seasons?.length) {
        const firstReal = data.seasons.find((s: Season) => s.season_number > 0);
        setSelectedSeason(firstReal?.season_number || 1);
      }
    } catch (error) {
      console.error('Error loading content:', error);
    } finally {
      setLoading(false);
    }
  }, [contentId, contentType]);

  const loadSeasonData = useCallback(async () => {
    if (!contentId || !selectedSeason) return;
    try {
      const data = await fetchSeasonDetails(contentId, selectedSeason);
      setSeasonData(data);
    } catch (error) {
      console.error('Error loading season data:', error);
    }
  }, [contentId, selectedSeason]);

  useEffect(() => {
    if (contentId && contentType) {
      loadContent();
      fetchWatchlist(!!isSignedIn);
      fetchContinueWatching(!!isSignedIn);
    }
  }, [contentId, contentType, loadContent, fetchWatchlist, isSignedIn, fetchContinueWatching]);

  useEffect(() => {
    if (content && contentType === 'tv' && selectedSeason) {
      loadSeasonData();
    }
  }, [content, contentType, selectedSeason, loadSeasonData]);

  const getCurrentStatus = (): string => {
    // Match on type as well as id — a movie and a TV show can share the same
    // TMDB id, so id-only lookups can return the wrong entry.
    const item = watchLater.find(
      (w: any) =>
        (w.content_id === content?.id || w.id === content?.id) &&
        w.content_type === contentType
    );
    return item?.status || 'plan_to_watch';
  };

  const addToWatchLater = async (status?: string) => {
    if (!content) return;
    const itemId = content.id;

    if (isSignedIn) {
      try {
        const response = await fetch('/api/watchlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content_id: itemId,
            content_type: contentType,
            title: 'title' in content ? content.title : content.name,
            poster_path: content.poster_path,
            // Only send an explicit status when one was chosen. Without a status
            // the API treats this as a toggle (add/remove) instead of updating,
            // which is what "Remove from List" relies on.
            status: status || undefined,
          }),
        });
        if (response.ok) {
          const result = await response.json();
          if (result.added && result.item) {
            addItemToStore({
              id: result.item.id,
              content_id: result.item.content_id,
              content_type: result.item.content_type,
              title: result.item.title,
              poster_path: result.item.poster_path,
              status: result.item.status || 'plan_to_watch',
              added_at: result.item.added_at || new Date().toISOString(),
              updated_at: result.item.updated_at || new Date().toISOString(),
            });
          } else {
            removeItemFromStore(itemId, contentType);
          }
        }
      } catch (error) {
        console.error('Error updating watchlist:', error);
        toggleWatchLaterLocal();
      }
    } else if (status) {
      // Guest with an explicit status: add or update the item in the local
      // store + localStorage instead of hitting the (auth-required) API.
      const exists = watchLater.some((w: any) =>
        (w.content_id === itemId || w.id === itemId) && w.content_type === contentType
      );
      if (exists) {
        updateStatusInStore(itemId, status, contentType);
        const saved = getLocalStorage<any[]>('watchLater', []);
        setLocalStorage('watchLater',
          saved.map((w: any) =>
            (w.id === itemId || w.content_id === itemId) &&
            (w.type || w.content_type || (w.title ? 'movie' : 'tv')) === contentType
              ? { ...w, status }
              : w
          )
        );
      } else {
        addItemToStore({
          id: itemId,
          content_id: itemId,
          content_type: contentType as 'movie' | 'tv',
          title: 'title' in content ? content.title : content.name,
          poster_path: content.poster_path,
          status,
          added_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        const saved = getLocalStorage<any[]>('watchLater', []);
        saved.push({ id: itemId, type: contentType, title: 'title' in content ? content.title : content.name, poster: content.poster_path, status, addedAt: new Date().toISOString() });
        setLocalStorage('watchLater', saved);
      }
    } else {
      toggleWatchLaterLocal();
    }
  };

  const toggleWatchLaterLocal = () => {
    if (!content) return;
    const itemId = content.id;
    const exists = watchLater.some((w: any) => 
      (w.content_id === itemId || w.id === itemId) && w.content_type === contentType
    );

    if (exists) {
      removeItemFromStore(itemId, contentType);
      const saved = getLocalStorage<any[]>('watchLater', []);
      setLocalStorage('watchLater',
        saved.filter((w: any) =>
          !((w.id === itemId || w.content_id === itemId) &&
            (w.type || w.content_type || (w.title ? 'movie' : 'tv')) === contentType)
        )
      );
    } else {
      addItemToStore({
        id: itemId,
        content_id: itemId,
        content_type: contentType as 'movie' | 'tv',
        title: 'title' in content ? content.title : content.name,
        poster_path: content.poster_path,
        status: 'plan_to_watch',
        added_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      const saved = getLocalStorage<any[]>('watchLater', []);
      saved.push({ id: itemId, type: contentType, title: 'title' in content ? content.title : content.name, poster: content.poster_path, addedAt: new Date().toISOString() });
      setLocalStorage('watchLater', saved);
    }
  };

  const toggleStatusPicker = () => {
    if (showStatusPicker) {
      setShowStatusPicker(false);
      return;
    }
    // Smart placement: open upward when there isn't enough room below the
    // trigger in the current viewport, so the menu never gets cut off.
    const btn = statusTriggerRef.current;
    if (btn) {
      const rect = btn.getBoundingClientRect();
      const rows = 4 + (isInWatchLater() ? 1 : 0); // status rows + optional "Remove" row
      const estHeight = rows * 44 + 2; // ~44px per row (py-3 + text-sm) + border
      // Reserve room for the fixed bottom nav on phones so the menu doesn't land behind it.
      const bottomBuffer = window.innerWidth < 640 ? 76 : 16;
      const spaceBelow = window.innerHeight - rect.bottom - bottomBuffer;
      const spaceAbove = rect.top - 16;
      setOpenUp(estHeight > spaceBelow && spaceAbove >= estHeight);
    }
    setShowStatusPicker(true);
  };

  // Close the status menu when clicking/tapping outside, pressing Escape, or
  // scrolling/resizing (the menu would otherwise become detached from the button).
  useEffect(() => {
    if (!showStatusPicker) return;
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (statusMenuRef.current?.contains(target) || statusTriggerRef.current?.contains(target)) {
        return;
      }
      setShowStatusPicker(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowStatusPicker(false);
    };
    const closeOnScrollOrResize = () => setShowStatusPicker(false);
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', closeOnScrollOrResize, true);
    window.addEventListener('resize', closeOnScrollOrResize);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', closeOnScrollOrResize, true);
      window.removeEventListener('resize', closeOnScrollOrResize);
    };
  }, [showStatusPicker]);

  const isInWatchLater = () => {
    if (!content) return false;
    return watchLater.some((w: any) => 
      (w.content_id === content.id || w.id === content.id) && w.content_type === contentType
    );
  };

  // Most recent continue-watching entry for this title that hasn't been
  // finished — shared by the PLAY and RESUME buttons so both pick up where
  // the user left off. The store keeps one entry per show/movie.
  const getResumeItem = () => {
    if (!content) return null;
    return continueWatching
      .filter((cw) => cw.content_id === content.id && cw.content_type === contentType)
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .find((cw) => !cw.is_completed) || null;
  };

  const handleWatchNow = (episodeId?: number) => {
    if (!content) return;

    // Clicking a specific episode always plays that exact episode.
    if (contentType === 'tv' && episodeId) {
      router.push(`/watch?id=${contentId}&type=${contentType}&season=${selectedSeason}&episode=${episodeId}`);
      return;
    }

    // Otherwise resume from continue watching (any progress, as long as it
    // isn't finished) instead of always restarting at season 1 episode 1.
    const resumeItem = getResumeItem();
    if (resumeItem) {
      const watchUrl = resumeItem.content_type === 'tv'
        ? `/watch?id=${contentId}&type=tv&season=${resumeItem.season_number || 1}&episode=${resumeItem.episode_number || 1}`
        : `/watch?id=${contentId}&type=movie`;
      router.push(watchUrl);
      return;
    }

    router.push(`/watch?id=${contentId}&type=${contentType}`);
  };

  const getBackdropUrl = () => {
    if (!content?.backdrop_path) return '/placeholder-backdrop.jpg';
    return `${TMDB_IMAGE_BASE_URL.replace('w500', 'w1280')}${content.backdrop_path}`;
  };

  const getTitle = () => {
    if (!content) return '';
    return 'title' in content ? content.title : content.name;
  };

  const getReleaseYear = () => {
    if (!content) return '';
    const date = 'release_date' in content ? content.release_date : content.first_air_date;
    return date ? new Date(date).getFullYear() : '';
  };

  const getGenres = () => {
    if (!content?.genres) return [];
    return content.genres.slice(0, 3);
  };

  const getRuntime = () => {
    if (!content) return '';
    
    if (contentType === 'movie' && 'runtime' in content && content.runtime) {
      return formatRuntime(content.runtime);
    }
    if (contentType === 'tv' && 'episode_run_time' in content && content.episode_run_time && Array.isArray(content.episode_run_time) && content.episode_run_time[0]) {
      return `${content.episode_run_time[0]} min per episode`;
    }
    return '';
  };

  const getCertification = () => {
    if (!content) return '';
    try {
      if (contentType === 'movie') {
        const meta = (content as unknown as Movie & MovieReleaseMeta).release_dates;
        const rels = meta?.results ?? [];
        const us = rels.find((r) => r.iso_3166_1 === 'US');
        const cert = us?.release_dates?.find((d) => d.certification)?.certification;
        return cert || '';
      }
      if (contentType === 'tv') {
        const meta = (content as unknown as TVShow & TVRatingMeta).content_ratings;
        const ratings = meta?.results ?? [];
        const us = ratings.find((r) => r.iso_3166_1 === 'US');
        return us?.rating || '';
      }
    } catch {}
    return '';
  };

  const getPrimaryGenre = () => getGenres()[0]?.name || '';

  const trailer = (() => {
    if (!content) return null;
    const vids: Video[] = content.videos?.results || [];
    return vids.find((v) => v.type === 'Trailer' && v.site === 'YouTube') || vids[0] || null;
  })();

  const getRecommendations = () => {
    if (!content) return [] as Array<Movie | TVShow>;
    const similar: Array<Movie | TVShow> = (content.similar?.results as Array<Movie | TVShow>) || [];
    if (!Array.isArray(similar) || similar.length === 0) return [] as Array<Movie | TVShow>;
    const allowAdult = false;
    const base = similar.filter((item) =>
      item.id !== content.id &&
      !blockedMovieIds.includes(item.id?.toString()) &&
      Boolean(item.poster_path)
    );
    let recs = filterAdultContent(base, allowAdult) as Array<Movie | TVShow>;
    recs = recs.filter((r) => (r.vote_average || 0) >= 5.5);
    const seen = new Set();
    const unique: Array<Movie | TVShow> = [];
    for (const r of recs) { if (!seen.has(r.id)) { seen.add(r.id); unique.push(r); } }
    return unique.slice(0, 15);
  };

  const getCast = () => {
    if (!content?.credits?.cast || !Array.isArray(content.credits.cast)) {
      return [] as CastMember[];
    }
    // Sort by billing order explicitly, then dedupe by id and cap at 15
    const seen = new Set<number>();
    const unique: CastMember[] = [];
    for (const member of content.credits.cast
      .filter((m): m is CastMember => Boolean(m?.id))
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))) {
      if (seen.has(member.id)) continue;
      seen.add(member.id);
      unique.push(member);
      if (unique.length >= 15) break;
    }
    return unique;
  };

  const cast = getCast();
  const recommendations = getRecommendations();

  // Real seasons only (specials/season 0 are excluded). Using the actual
  // season list instead of 1..number_of_seasons keeps the tabs correct for
  // shows with gaps in their season numbering and for anime whose seasons are
  // remapped from AniList.
  const seasonTabs: Season[] = ((content as any)?.seasons || [])
    .filter((s: Season) => s.season_number > 0)
    .sort((a: Season, b: Season) => a.season_number - b.season_number);

  if (loading) {
    return (
      <SkeletonPageLayout
      currentView="details"
      showSearch={false}
      watchLaterCount={watchLaterCount}
      onViewChange={() => {}}
      >
        {/* Back to Home Button — same fixed position as the loaded page */}
        <div className="fixed top-16 sm:top-24 left-2 sm:left-4 z-50">
          <Link
            href="/"
            className="flex items-center space-x-1.5 sm:space-x-2 bg-black/90 hover:bg-black backdrop-blur-sm text-white px-3 sm:px-4 py-2 sm:py-3 rounded-xl transition-all duration-300 border border-white/30 hover:border-white/50 shadow-2xl group"
          >
            <svg className="w-4 sm:w-5 h-4 sm:h-5 group-hover:-translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="font-medium text-xs sm:text-sm">Back to Home</span>
          </Link>
        </div>
        <SkeletonDetails />
      </SkeletonPageLayout>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navbar
          currentView="details"
          showSearch={false}
          watchLaterCount={watchLaterCount}
          onViewChange={() => {}}
        />
        <main id="main-content" className="pt-24 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Content Not Found</h1>
            <p className="text-gray-400 mb-6">The content you are looking for could not be found.</p>
            <Link 
              href="/"
              className="inline-flex items-center px-6 py-3 bg-white text-black font-semibold rounded-lg transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
  <div className="min-h-screen bg-black text-white">
      <Navbar
      currentView="details"
      showSearch={false}
      watchLaterCount={watchLaterCount}
      onViewChange={() => {}}
      />

      <main id="main-content">
      {/* Hero Section — YouTube trailer embed with backdrop fallback */}
      <div className="relative h-[50vh] sm:h-[56vh] md:h-[62vh] overflow-hidden bg-black">
        <div className="absolute inset-0">
          {trailer ? (
            <>
              {/* Backdrop as subtle background behind the trailer */}
              {content.backdrop_path && (
                <Image
                  src={getBackdropUrl()}
                  alt=""
                  fill
                  className="object-cover opacity-30"
                  priority
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/50 to-black/80" />

              {/* Centered trailer container with proper spacing */}
              <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6 md:p-8 lg:p-12">
                <div className="relative w-full max-w-5xl aspect-video rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                  <iframe
                    src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1&mute=${isTrailerMuted ? 1 : 0}&loop=1&playlist=${trailer.key}&controls=0&showinfo=0&rel=0&modestbranding=1&iv_load_policy=3&disablekb=1&playsinline=1`}
                    className="absolute inset-0 w-full h-full"
                    allow="autoplay; encrypted-media"
                    title={`${getTitle()} Trailer`}
                  />
                </div>
              </div>

              {/* Sound toggle button */}
              <button
                onClick={() => setIsTrailerMuted(!isTrailerMuted)}
                className="absolute bottom-4 sm:bottom-6 right-4 sm:right-6 z-20 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-full p-2.5 sm:p-3 border border-white/20 hover:border-white/40 transition-all duration-200 hover:scale-110 active:scale-95"
                aria-label={isTrailerMuted ? "Unmute trailer" : "Mute trailer"}
              >
                {isTrailerMuted ? (
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                )}
              </button>
              
              {/* Bottom gradient overlay for text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent pointer-events-none" />
            </>
          ) : (
            <>
              <Image
                src={getBackdropUrl()}
                alt={getTitle()}
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
            </>
          )}
        </div>

        {/* Gradient overlay for mobile readability — covers the entire navbar area smoothly */}
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/80 via-black/40 to-transparent z-10 pointer-events-none" />
        
        {/* Back to Home Button */}
        <div className="fixed top-16 sm:top-24 left-2 sm:left-4 z-50">
          <Link
            href="/"
            className="flex items-center space-x-1.5 sm:space-x-2 bg-black/90 hover:bg-black backdrop-blur-sm text-white px-3 sm:px-4 py-2 sm:py-3 rounded-xl transition-all duration-300 border border-white/30 hover:border-white/50 shadow-2xl group"
          >
            <svg className="w-4 sm:w-5 h-4 sm:h-5 group-hover:-translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="font-medium text-xs sm:text-sm">Back to Home</span>
          </Link>
        </div>
      </div>

      {/* Details Section */}
      <div className="bg-black py-8 sm:py-10">
        <div className="px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 md:gap-10">
            {content.poster_path && (
              <div className="flex-shrink-0 w-36 sm:w-48 md:w-56 mx-auto sm:mx-0">
                <div className="relative w-full aspect-[2/3] rounded-xl overflow-hidden shadow-2xl">
                  <Image
                    src={`${TMDB_IMAGE_BASE_URL}${content.poster_path}`}
                    alt={getTitle()}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 144px, (max-width: 768px) 192px, 224px"
                  />
                </div>
              </div>
            )}

            <div className="flex-1 min-w-0">
              <h1 className="font-bold leading-tight text-2xl sm:text-3xl md:text-4xl lg:text-5xl mb-3 sm:mb-4">
                {getTitle()}
              </h1>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-300 mb-4 sm:mb-5">
                {getReleaseYear() && <span>{getReleaseYear()}</span>}
                {getCertification() && (
                  <span className="bg-white/10 text-white font-semibold px-2 py-1 rounded-sm text-xs sm:text-xs leading-none">{getCertification()}</span>
                )}
                {getRuntime() && <span>{getRuntime()}</span>}
                {getPrimaryGenre() && <span>{getPrimaryGenre()}</span>}
              </div>
              <p className="text-gray-300 text-sm sm:text-base leading-relaxed mb-6 sm:mb-8 line-clamp-6">
                {content.overview}
              </p>
              <div className="flex flex-wrap gap-3 sm:gap-4 mb-5 sm:mb-6">
                {/* Resume / Continue Watching Button — shows the progress of the
                    entry PLAY would resume from (mid-way through only; a 0%
                    or finished entry stays PLAY-only) */}
                {(() => {
                  const contItem = getResumeItem();

                  if (contItem && contItem.progress_percentage > 0 && contItem.progress_percentage < 100) {
                    const resumeUrl = contItem.content_type === 'tv'
                      ? `/watch?id=${contItem.content_id}&type=tv&season=${contItem.season_number || 1}&episode=${contItem.episode_number || 1}`
                      : `/watch?id=${contItem.content_id}&type=movie`;

                    return (
                      <Link
                        href={resumeUrl}
                        className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white font-semibold px-5 sm:px-6 md:px-7 py-2.5 sm:py-3 rounded-sm text-xs sm:text-sm tracking-wide transition-all border border-white/40 hover:border-white/60"
                      >
                        <svg className="w-4 sm:w-5 h-4 sm:h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"/></svg>
                        RESUME · {contItem.progress_percentage}%
                        {contItem.content_type === 'tv' && contItem.episode_number && (
                          <span className="text-white/70">S{contItem.season_number || 1}:E{contItem.episode_number}</span>
                        )}
                      </Link>
                    );
                  }
                  return null;
                })()}
                
                <button
                  onClick={() => handleWatchNow()}
                  className="flex items-center gap-2 bg-white text-black font-semibold px-5 sm:px-6 md:px-7 py-2.5 sm:py-3 rounded-sm text-xs sm:text-sm tracking-wide transition-all shadow-md hover:shadow-lg hover:bg-gray-100"
                >
                  <svg className="w-4 sm:w-5 h-4 sm:h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M8 5v10l7-5z"/></svg>
                  PLAY
                </button>
                <div className="relative">
                  <button
                    ref={statusTriggerRef}
                    onClick={toggleStatusPicker}
                    aria-expanded={showStatusPicker}
                    aria-controls="watchlist-status-menu"
                    className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-5 sm:px-6 md:px-7 py-2.5 sm:py-3 rounded-sm font-semibold text-xs sm:text-sm tracking-wide transition-all border border-white/20 hover:border-white/40"
                  >
                    <svg className={`w-4 sm:w-5 h-4 sm:h-5 ${isInWatchLater() ? 'fill-current' : ''}`} fill={isInWatchLater() ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                    {isInWatchLater() ? `${statusLabels[getCurrentStatus()]?.label || 'MY LIST'} ✓` : '+ MY LIST'}
                  </button>

                  <AnimatePresence>
                    {showStatusPicker && (
                      <motion.div
                        id="watchlist-status-menu"
                        ref={statusMenuRef}
                        initial={{ opacity: 0, scale: 0.95, y: openUp ? 6 : -6 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: openUp ? 6 : -6 }}
                        transition={{ duration: 0.16, ease: 'easeOut' }}
                        style={{ transformOrigin: openUp ? '50% 100%' : '50% 0%' }}
                        className={`absolute left-0 w-48 bg-black border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden ${
                          openUp ? 'bottom-full mb-2' : 'top-full mt-2'
                        }`}
                      >
                        {Object.entries(statusLabels).map(([key, val]) => {
                          const isCurrent = isInWatchLater() && getCurrentStatus() === key;
                          return (
                            <button
                              key={key}
                              onClick={() => {
                                if (isInWatchLater()) {
                                  if (isSignedIn) {
                                    fetch('/api/watchlist', {
                                      method: 'PATCH',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        content_id: content?.id,
                                        content_type: contentType,
                                        status: key,
                                      }),
                                    })
                                      .then((res) => {
                                        if (res.ok) fetchWatchlist(true);
                                      })
                                      .catch((error) => {
                                        console.error('Failed to update status:', error);
                                      });
                                  } else {
                                    // Guests: update local store + localStorage directly
                                    updateStatusInStore(content!.id, key, contentType);
                                    const saved = getLocalStorage<any[]>('watchLater', []);
                                    setLocalStorage('watchLater',
                                      saved.map((w: any) =>
                                        (w.id === content!.id || w.content_id === content!.id) &&
                                        (w.type || w.content_type || (w.title ? 'movie' : 'tv')) === contentType
                                          ? { ...w, status: key }
                                          : w
                                      )
                                    );
                                  }
                                } else {
                                  addToWatchLater(key);
                                }
                                setShowStatusPicker(false);
                                statusTriggerRef.current?.focus();
                              }}
                              className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors text-left ${
                                isCurrent
                                  ? 'bg-white/10 text-white'
                                  : 'text-gray-200 hover:bg-white/10 hover:text-white'
                              }`}
                            >
                              <span className={`w-2 h-2 rounded-full ${val.color}`}></span>
                              {val.icon} {val.label}
                              {isCurrent && (
                                <svg className="w-4 h-4 ml-auto text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </button>
                          );
                        })}
                        {isInWatchLater() && (
                          <div className="border-t border-white/10">
                            <button
                              onClick={() => {
                                addToWatchLater();
                                setShowStatusPicker(false);
                                statusTriggerRef.current?.focus();
                              }}
                              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-white/10 hover:text-red-300 transition-colors text-left"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Remove from List
                            </button>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                {/* Share button */}
                <ShareButton
                  title={`${getTitle()} - Movime`}
                  text={`Check out ${getTitle()} on Movime`}
                  variant="full"
                />
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Top Billed Cast Section */}
      {cast.length > 0 && (
        <div className="py-8 sm:py-10 md:py-12 bg-black/50 border-t border-white/5">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-wide text-white">Top Billed Cast</h2>
              <span className="text-xs sm:text-xs uppercase tracking-widest text-gray-400">Starring in {getTitle()}</span>
            </div>
            <div className="episodes-slider group relative">
              <div className="overflow-x-auto scrollbar-hide">
                <div className="flex space-x-4 sm:space-x-6 pb-3 sm:pb-4" style={{ width: 'max-content' }}>
                  {cast.map((member) => {
                    const profileSrc = member.profile_path
                      ? `${TMDB_IMAGE_BASE_URL.replace('w500', 'w185')}${member.profile_path}`
                      : null;
                    return (
                      <div
                        key={member.id}
                        className="group/cast flex-shrink-0 w-36 sm:w-40 rounded-xl overflow-hidden bg-white/[0.03] border border-white/10 hover:border-white/30 transition-colors"
                      >
                        <div className="relative aspect-[2/3] bg-white/5">
                          {profileSrc ? (
                            <Image
                              src={profileSrc}
                              alt={member.name}
                              fill
                              className="object-cover group-hover/cast:scale-105 transition-transform duration-500"
                              sizes="160px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-xl font-bold text-gray-300">
                                {member.name.charAt(0).toUpperCase() || '?'}
                              </div>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent opacity-0 group-hover/cast:opacity-100 transition-opacity" />
                        </div>
                        <div className="p-2.5 sm:p-3 space-y-0.5">
                          <h3 className="text-xs sm:text-sm font-semibold leading-snug line-clamp-1 group-hover/cast:text-white transition-colors">
                            {member.name}
                          </h3>
                          <p className="text-xs sm:text-xs text-gray-400 line-clamp-2 leading-snug">
                            {member.character || member.known_for_department || '—'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="absolute top-1/2 -left-4 transform -translate-y-1/2 scroll-button">
                <button
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.preventDefault();
                    const container = e.currentTarget.parentElement?.parentElement?.querySelector('.overflow-x-auto');
                    container?.scrollBy({ left: -400, behavior: 'smooth' });
                  }}
                  aria-label="Scroll left"
                  className="bg-black/80 hover:bg-black text-white rounded-full p-3 shadow-xl backdrop-blur-sm border border-white/20 hover:scale-110 transition-all duration-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
              </div>
              <div className="absolute top-1/2 -right-4 transform -translate-y-1/2 scroll-button">
                <button
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.preventDefault();
                    const container = e.currentTarget.parentElement?.parentElement?.querySelector('.overflow-x-auto');
                    container?.scrollBy({ left: 400, behavior: 'smooth' });
                  }}
                  aria-label="Scroll right"
                  className="bg-black/80 hover:bg-black text-white rounded-full p-3 shadow-xl backdrop-blur-sm border border-white/20 hover:scale-110 transition-all duration-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Episodes Section */}
  {contentType === 'tv' && content && 'number_of_seasons' in content && (
        <div className="py-8 sm:py-10 md:py-12 bg-black/50">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-3 sm:mb-4">Episodes</h2>
              
              {seasonTabs.length > 1 && (
                <div className="flex flex-wrap gap-2 mb-4 sm:mb-6">
                  {seasonTabs.map((season) => (
                    <button
                      key={season.season_number}
                      onClick={() => setSelectedSeason(season.season_number)}
                      className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition-colors ${
                        selectedSeason === season.season_number
                          ? 'bg-white text-black'
                          : 'bg-white/10 text-gray-300 hover:bg-white/20'
                      }`}
                    >
                      Season {season.season_number}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {seasonData?.episodes && (
              <div className="episodes-slider group relative">
                <div className="overflow-x-auto scrollbar-hide">
                  <div className="flex space-x-4 sm:space-x-6 pb-4 sm:pb-6" style={{ width: 'max-content' }}>
                    {seasonData.episodes.map((episode: Episode) => (
                      <div
                        key={episode.id}
                        className="group/card bg-white/[0.03] rounded-xl overflow-hidden hover:bg-white/[0.06] transition-all duration-300 cursor-pointer border border-white/10 hover:border-white/20 flex-shrink-0 w-64 sm:w-72 hover:scale-105 hover:shadow-2xl"
                        onClick={() => handleWatchNow(episode.episode_number)}
                      >
                        <div className="relative aspect-video bg-black">
                          {episode.still_path ? (
                            <Image
                              src={`${TMDB_IMAGE_BASE_URL}${episode.still_path}`}
                              alt={episode.name}
                              fill
                              className="object-cover group-hover/card:scale-105 transition-transform duration-300"
                              sizes="288px"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full text-gray-500">
                              <svg className="w-8 sm:w-12 h-8 sm:h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                          
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                            <div className="bg-white rounded-full p-2 sm:p-3 transform scale-75 group-hover/card:scale-100 transition-transform duration-300">
                              <svg className="w-6 sm:w-8 h-6 sm:h-8 text-black ml-1" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M8 5v10l7-5z"/>
                              </svg>
                            </div>
                          </div>

                          <div className="absolute top-2 sm:top-3 left-2 sm:left-3 bg-black/80 backdrop-blur-sm rounded-lg px-2 py-1 text-xs sm:text-sm font-semibold">
                            Episode {episode.episode_number}
                          </div>
                        </div>

                        <div className="p-3 sm:p-4">
                          <h3 className="font-semibold text-sm sm:text-base md:text-lg mb-2 line-clamp-1 group-hover/card:text-white transition-colors">
                            {episode.name}
                          </h3>
                          
                          <div className="flex items-center gap-2 sm:gap-3 md:gap-4 text-xs sm:text-sm text-gray-400 mb-2 sm:mb-3">
                            {episode.air_date && (
                              <span>{new Date(episode.air_date).getFullYear()}</span>
                            )}
                            {episode.runtime && (
                              <span>{episode.runtime} min</span>
                            )}
                            {episode.vote_average > 0 && (
                              <div className="flex items-center space-x-1">
                                <svg className="w-3 h-3 text-yellow-400 fill-current" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                                </svg>
                                <span>{episode.vote_average.toFixed(1)}</span>
                              </div>
                            )}
                          </div>
                          
                          {episode.overview && (
                            <p className="text-gray-400 text-xs sm:text-sm line-clamp-3 leading-relaxed">
                              {episode.overview}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="absolute top-1/2 -left-4 transform -translate-y-1/2 scroll-button">
                  <button 
                    onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                      e.preventDefault();
                      const container = e.currentTarget.parentElement?.parentElement?.querySelector('.overflow-x-auto');
                      if (container) {
                        container.scrollBy({ left: -400, behavior: 'smooth' });
                      }
                    }}
                    className="bg-black/80 hover:bg-black text-white rounded-full p-3 shadow-xl backdrop-blur-sm border border-white/20 hover:scale-110 transition-all duration-200"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                </div>
                
                <div className="absolute top-1/2 -right-4 transform -translate-y-1/2 scroll-button">
                  <button 
                    onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                      e.preventDefault();
                      const container = e.currentTarget.parentElement?.parentElement?.querySelector('.overflow-x-auto');
                      if (container) {
                        container.scrollBy({ left: 400, behavior: 'smooth' });
                      }
                    }}
                    className="bg-black/80 hover:bg-black text-white rounded-full p-3 shadow-xl backdrop-blur-sm border border-white/20 hover:scale-110 transition-all duration-200"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recommendations Section */}
      {recommendations.length > 0 && (
        <div className="py-8 sm:py-10 md:py-14 bg-black/40 border-t border-white/5">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-wide text-white">Recommended for You</h2>
              <span className="text-xs sm:text-xs uppercase tracking-widest text-gray-400">Based on this {contentType === 'movie' ? 'movie' : 'show'}</span>
            </div>
            <div className="episodes-slider group relative">
              <div className="overflow-x-auto scrollbar-hide">
                <div className="flex space-x-4 sm:space-x-6 pb-3 sm:pb-4" style={{ width: 'max-content' }}>
                  {recommendations.map((item: Movie | TVShow) => {
                    const title = 'title' in item ? item.title : item.name;
                    const yearSrc = 'release_date' in item ? item.release_date : item.first_air_date;
                    const year = (yearSrc || '').slice(0,4);
                    const mediaType = contentType;
                    return (
                      <Link
                        key={item.id}
                        href={`/details?id=${item.id}&type=${mediaType}`}
                        className="group/card w-44 sm:w-48 md:w-52 flex-shrink-0 rounded-xl overflow-hidden bg-white/[0.03] border border-white/10 hover:border-white/30 transition-colors"
                      >
                        <div className="relative aspect-[2/3]">
                          <Image
                            src={`${TMDB_IMAGE_BASE_URL}${item.poster_path}`}
                            alt={title}
                            fill
                            className="object-cover group-hover/card:scale-105 transition-transform duration-500"
                            sizes="208px"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity" />
                          {item.vote_average > 0 && (
                            <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm rounded-md px-2 py-1 text-xs sm:text-xs font-semibold flex items-center gap-1">
                              <svg className="w-2.5 sm:w-3 h-2.5 sm:h-3 text-yellow-400 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                              {item.vote_average.toFixed(1)}
                            </div>
                          )}
                        </div>
                        <div className="p-2.5 sm:p-3 space-y-1">
                          <h3 className="text-xs sm:text-sm font-semibold leading-snug line-clamp-2 group-hover/card:text-white transition-colors">{title}</h3>
                          <div className="flex items-center justify-between text-xs sm:text-xs text-gray-400">
                            <span>{year}</span>
                            {item.vote_average > 0 && (
                              <span className="text-gray-300">★ {item.vote_average.toFixed(1)}</span>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
              <div className="absolute top-1/2 -left-4 transform -translate-y-1/2 scroll-button">
                <button 
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.preventDefault();
                    const container = e.currentTarget.parentElement?.parentElement?.querySelector('.overflow-x-auto');
                    container?.scrollBy({ left: -400, behavior: 'smooth' });
                  }}
                  aria-label="Scroll left"
                  className="bg-black/80 hover:bg-black text-white rounded-full p-3 shadow-xl backdrop-blur-sm border border-white/20 hover:scale-110 transition-all duration-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
              </div>
              <div className="absolute top-1/2 -right-4 transform -translate-y-1/2 scroll-button">
                <button 
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.preventDefault();
                    const container = e.currentTarget.parentElement?.parentElement?.querySelector('.overflow-x-auto');
                    container?.scrollBy({ left: 400, behavior: 'smooth' });
                  }}
                  aria-label="Scroll right"
                  className="bg-black/80 hover:bg-black text-white rounded-full p-3 shadow-xl backdrop-blur-sm border border-white/20 hover:scale-110 transition-all duration-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </main>
    </div>
  );
}

export default function DetailsPage() {
  return (
  <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center"><p className="text-gray-400 text-sm tracking-wide">Loading…</p></div>}>
      <DetailsPageContent />
    </Suspense>
  );
}

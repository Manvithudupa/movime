'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  fetchMovies,
  fetchTVShows,
  fetchAnimeContent,
  fetchByGenre,
  fetchGenres,
  getLocalStorage,
  setLocalStorage,
  blockedMovieIds,
  filterAdultContent
} from '@/lib/utils';
import type { ContentItem, Genre } from '@/lib/types';
import { useAuth } from '@/components/AuthProvider';
import { useWatchlistStore } from '@/lib/store';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AnimeHero from '@/components/AnimeHero';
import ContentCard from '@/components/ContentCard';
import { SkeletonGrid } from '@/components/SkeletonCard';
import { SkeletonHero } from '@/components/SkeletonHero';

export type BrowseCategory = 'movies' | 'tv' | 'anime';

interface BrowseContentProps {
  category: BrowseCategory;
  title: string;
  subtitle?: string;
  showAnimeHero?: boolean;
  /** When set, browses a specific TMDB genre instead of the category default. */
  genreId?: number;
  /** Media type to use with genreId (movies vs TV shows). */
  genreType?: 'movie' | 'tv';
  /** Shows a row of genre chips (links to the dedicated genre pages). */
  showGenreChips?: boolean;
}

const CATEGORY_CONFIG: Record<BrowseCategory, {
  fetch: (page: number) => Promise<{ results: any[] }>;
  filterBlocked: boolean;
}> = {
  movies: { fetch: fetchMovies, filterBlocked: true },
  tv: { fetch: fetchTVShows, filterBlocked: false },
  anime: { fetch: fetchAnimeContent, filterBlocked: true },
};

export default function BrowseContent({
  category,
  title,
  subtitle,
  showAnimeHero = false,
  genreId,
  genreType,
  showGenreChips = false
}: BrowseContentProps) {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [genres, setGenres] = useState<Genre[]>([]);
  const isLoadingMoreRef = useRef(false);

  const watchLater = useWatchlistStore((s) => s.items);
  const fetchWatchlist = useWatchlistStore((s) => s.fetch);
  const addItemToStore = useWatchlistStore((s) => s.add);
  const removeItemFromStore = useWatchlistStore((s) => s.remove);

  // Genre browsing mode: a specific TMDB genre with an explicit media type.
  const isGenreBrowse = genreId !== undefined && genreType !== undefined;

  const config = useMemo(() => {
    if (isGenreBrowse) {
      return {
        fetch: (page: number) => fetchByGenre(genreType!, genreId!, page),
        filterBlocked: genreType === 'movie',
      };
    }
    return CATEGORY_CONFIG[category];
  }, [isGenreBrowse, genreType, genreId, category]);

  // Genre list for the chip row (used by both the genre pages and the
  // Movies/TV pages' quick genre filter).
  const genreFetchType = isGenreBrowse ? genreType : (category === 'movies' ? 'movie' : 'tv');

  useEffect(() => {
    if (!showGenreChips && !isGenreBrowse) return;
    let cancelled = false;
    fetchGenres(genreFetchType as 'movie' | 'tv').then((data) => {
      if (!cancelled && data?.genres) setGenres(data.genres);
    });
    return () => { cancelled = true; };
  }, [showGenreChips, isGenreBrowse, genreFetchType]);

  // Title for genre browsing, e.g. "Action Movies". Falls back gracefully
  // until the genre list loads.
  const genreName = genres.find((g) => g.id === genreId)?.name || '';
  const displayTitle = isGenreBrowse
    ? `${genreName || 'Genre'} ${genreType === 'tv' ? 'TV Shows' : 'Movies'}`
    : title;

  const filterResults = useCallback((results: any[] = []) => {
    const filtered = config.filterBlocked
      ? results.filter((item: any) => !blockedMovieIds.includes(item.id.toString()))
      : results;
    return filterAdultContent(filtered, false) as ContentItem[];
  }, [config]);

  useEffect(() => {
    let cancelled = false;
    const loadContent = async () => {
      setLoading(true);
      try {
        const data = await config.fetch(1);
        if (cancelled) return;
        setItems(filterResults(data.results));
        setPage(1);
      } catch (error) {
        console.error(`Error loading ${category} content:`, error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadContent();
    fetchWatchlist(!!isSignedIn);
    return () => {
      cancelled = true;
    };
  }, [category, isSignedIn, fetchWatchlist, config, filterResults]);

  // Scroll to top when switching between pages or genres
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [category, genreId]);

  const loadMore = async () => {
    if (loading || loadingMore || isLoadingMoreRef.current) return;
    isLoadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const data = await config.fetch(nextPage);
      const filteredNewData = filterResults(data.results);
      setItems((prev) => [...prev, ...filteredNewData]);
      setPage(nextPage);
    } catch (error) {
      console.error(`Error loading more ${category}:`, error);
    } finally {
      setLoadingMore(false);
      isLoadingMoreRef.current = false;
    }
  };

  // Helper to re-add an item to the store when an optimistic remove fails
  const rollbackWatchlistItem = useCallback((item: ContentItem, contentType: string) => {
    addItemToStore({
      id: item.id,
      content_id: item.id as number,
      content_type: contentType as 'movie' | 'tv',
      title: item.title || item.name || '',
      poster_path: item.poster_path,
      status: 'plan_to_watch',
      added_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  }, [addItemToStore])

  const toggleLocalWatchlist = useCallback((item: ContentItem, contentType: string, wasInList: boolean) => {
    const saved = getLocalStorage('watchLater', []);
    const itemId = item.id;
    if (wasInList) {
      const updated = saved.filter((w: any) => w.id !== itemId && w.content_id !== itemId);
      setLocalStorage('watchLater', updated);
      removeItemFromStore(itemId)
    } else {
      const newItem = {
        id: itemId,
        content_id: itemId,
        content_type: contentType as 'movie' | 'tv',
        type: contentType,
        title: item.title || item.name || '',
        poster: item.poster_path,
        poster_path: item.poster_path,
        status: 'plan_to_watch',
        added_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      const updated = [...saved, newItem]
      setLocalStorage('watchLater', updated)
      addItemToStore(newItem)
    }
  }, [addItemToStore, removeItemFromStore])

  const addToWatchLater = useCallback(async (item: ContentItem) => {
    const contentType = item.media_type || (item.title ? 'movie' : 'tv');
    const itemId = item.id;

    // Check if item already exists before optimistic update
    const exists = watchLater.some((w: any) => w.id === itemId || w.content_id === itemId);

    // Optimistically update the store
    if (exists) {
      removeItemFromStore(itemId);
    }

    if (isSignedIn) {
      try {
        const response = await fetch('/api/watchlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content_id: itemId,
            content_type: contentType,
            title: item.title || item.name || '',
            poster_path: item.poster_path,
          }),
        });
        const result = await response.json();
        if (response.ok) {
          if (result.added && result.item) {
            addItemToStore({
              id: result.item.id,
              content_id: result.item.content_id,
              content_type: result.item.content_type as 'movie' | 'tv',
              title: result.item.title,
              poster_path: result.item.poster_path,
              status: result.item.status || 'plan_to_watch',
              added_at: result.item.added_at || new Date().toISOString(),
              updated_at: result.item.updated_at || new Date().toISOString(),
            })
          } else {
            removeItemFromStore(itemId)
          }
        } else {
          console.error('Watchlist API error:', result.error);
          // API failed - reverse the optimistic update
          if (exists) {
            rollbackWatchlistItem(item, contentType);
          }
        }
      } catch (error) {
        console.error('Error updating watchlist:', error);
        // API call failed - reverse the optimistic update
        if (exists) {
          rollbackWatchlistItem(item, contentType);
        }
      }
    } else {
      toggleLocalWatchlist(item, contentType, exists)
    }
  }, [isSignedIn, watchLater, addItemToStore, removeItemFromStore, rollbackWatchlistItem, toggleLocalWatchlist]);

  const isInWatchLater = useCallback((item: ContentItem) => {
    const itemId = item.id;
    return watchLater.some((w: any) => w.id === itemId || w.content_id === itemId);
  }, [watchLater]);

  const hasHero = showAnimeHero && items.length > 0 && !loading;
  const showHeroSkeleton = showAnimeHero && loading;
  const mainClassName = hasHero || showHeroSkeleton ? 'pb-8 pt-2' : 'pt-24 pb-8';

  // The anime page gets its page-level h1 from AnimeHero, so its section
  // title stays an h2; movies/tv/genre pages have no other h1, so their
  // title is the page h1.
  const SectionTitle = category === 'anime' ? 'h2' : 'h1';

  return (
    <motion.div
      className="min-h-screen bg-black text-white overflow-x-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {/* Navigation */}
      <Navbar
        currentView={category}
        showSearch={false}
        searchQuery=""
        watchLaterCount={watchLater.length}
        onViewChange={() => {}}
        onSearchToggle={() => router.push('/search')}
        onSearchChange={() => {}}
      />

      {/* Anime Hero Banner - only on the anime page */}
      {showHeroSkeleton && <SkeletonHero />}
      {hasHero && (
        <AnimeHero
          animeContent={items}
          onAddToWatchLater={addToWatchLater}
          isInWatchLater={isInWatchLater}
          getWatchStatus={(item) => {
            const found = watchLater.find(
              (w: any) => w.id === item.id || w.content_id === item.id
            );
            return found?.status;
          }}
        />
      )}

      {/* Main content */}
      <main className={mainClassName}>
        <div className="px-4 sm:px-6 lg:px-8">
          {/* Section title */}
          <div className="mb-6">
            <SectionTitle className="text-2xl sm:text-3xl font-bold text-white">{displayTitle}</SectionTitle>
            {subtitle && !isGenreBrowse && (
              <p className="text-gray-300 text-sm mt-1">{subtitle}</p>
            )}
          </div>

          {/* Movies / TV toggle — genre browsing only */}
          {isGenreBrowse && (
            <div className="flex items-center gap-2 mb-6">
              {(['movie', 'tv'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => router.push(`/genre/${genreId}?type=${t}`)}
                  aria-pressed={genreType === t}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    genreType === t
                      ? 'bg-white text-black border-white'
                      : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {t === 'movie' ? 'Movies' : 'TV Shows'}
                </button>
              ))}
            </div>
          )}

          {/* Genre chips — links to genre browsing on the search page */}
          {genres.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {genres.map((g) => {
                const active = isGenreBrowse && g.id === genreId;
                return (
                  <Link
                    key={g.id}
                    href={`/search?genre=${g.id}&type=${genreFetchType}`}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      active
                        ? 'bg-white text-black border-white'
                        : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {g.name}
                  </Link>
                );
              })}
            </div>
          )}

          {loading ? (
            // The real layout here is a responsive grid of ContentCards (5/7 ratio),
            // so show a matching grid skeleton instead of horizontal sections.
            <SkeletonGrid count={18} ratio="aspect-[5/7]" />
          ) : (
            <>
              {/* Content grid */}
              <motion.div
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-5 md:gap-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2, staggerChildren: 0.05 }}
              >
                {items.map((item) => (
                  <motion.div
                    key={`${item.id}-${(item as any).type || item.media_type || (item as any).content_type || 'unknown'}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ContentCard
                      item={item}
                      addToWatchLater={addToWatchLater}
                      isInWatchLater={isInWatchLater}
                    />
                  </motion.div>
                ))}
              </motion.div>

              {items.length > 0 && (
                <div className="flex justify-center mt-8">
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="px-8 py-3 bg-white hover:bg-gray-200 disabled:bg-gray-600 disabled:cursor-not-allowed text-black rounded-lg transition-colors font-medium flex items-center space-x-2"
                  >
                    {loadingMore ? (
                      <span className="tracking-wide">Loading…</span>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <span>Load More</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {items.length === 0 && (
                <div className="text-center py-20">
                  <p className="text-gray-400 text-lg">No content available</p>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </motion.div>
  );
}

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  fetchMovies,
  fetchTVShows,
  fetchAnimeContent,
  getLocalStorage,
  setLocalStorage,
  blockedMovieIds,
  filterAdultContent
} from '@/lib/utils';
import type { ContentItem } from '@/lib/types';
import { useAuth } from '@/components/AuthProvider';
import { useWatchlistStore } from '@/lib/store';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AnimeHero from '@/components/AnimeHero';
import ContentCard from '@/components/ContentCard';
import { SkeletonSection } from '@/components/SkeletonCard';

export type BrowseCategory = 'movies' | 'tv' | 'anime';

interface BrowseContentProps {
  category: BrowseCategory;
  title: string;
  subtitle?: string;
  showAnimeHero?: boolean;
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
  showAnimeHero = false
}: BrowseContentProps) {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const isLoadingMoreRef = useRef(false);

  const watchLater = useWatchlistStore((s) => s.items);
  const fetchWatchlist = useWatchlistStore((s) => s.fetch);
  const addItemToStore = useWatchlistStore((s) => s.add);
  const removeItemFromStore = useWatchlistStore((s) => s.remove);

  const config = CATEGORY_CONFIG[category];

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

  // Scroll to top when switching between pages
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [category]);

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
  const mainClassName = hasHero ? 'pb-8 pt-2' : 'pt-24 pb-8';

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
      {hasHero && <AnimeHero animeContent={items} />}

      {/* Main content */}
      <main className={mainClassName}>
        <div className="px-4 sm:px-6 lg:px-8">
          {/* Section title */}
          <div className="mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">{title}</h2>
            {subtitle && (
              <p className="text-gray-300 text-sm mt-1">{subtitle}</p>
            )}
          </div>

          {loading ? (
            <div className="space-y-8">
              <SkeletonSection />
              <SkeletonSection />
              <SkeletonSection />
            </div>
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

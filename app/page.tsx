'use client';

import React, { useState, useEffect, useRef, Suspense, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from '@/components/ProxyImage';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  fetchMovies, 
  fetchTVShows, 
  fetchHollywoodMovies,
  fetchBollywoodMovies,
  fetchAnimeContent,
  fetchNetflixContent,
  fetchAmazonPrimeContent,
  searchContent, 
  getLocalStorage,
  setLocalStorage,
  blockedMovieIds,
  filterAdultContent
} from '@/lib/utils';
import type { ContentItem } from '@/lib/types';
import { useAuth } from '@/components/AuthProvider';
import { useWatchlistStore, useContinueWatchingStore } from '@/lib/store';
import HeroSection from '@/components/HeroSection';
import Navbar from '@/components/Navbar';
import ContentSection from '@/components/ContentSection';
import Footer from '@/components/Footer';
import { SkeletonSection, SkeletonGrid, SkeletonContinueWatching } from '@/components/SkeletonCard';
import ContentCard from '@/components/ContentCard';

function HomePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSignedIn } = useAuth();
  const [currentView, setCurrentView] = useState(() => searchParams.get('view') || 'home');
  const [movies, setMovies] = useState<ContentItem[]>([]);
  const [tvShows, setTVShows] = useState<ContentItem[]>([]);
  const [hollywoodMovies, setHollywoodMovies] = useState<ContentItem[]>([]);
  const [bollywoodMovies, setBollywoodMovies] = useState<ContentItem[]>([]);
  const [animeContent, setAnimeContent] = useState<ContentItem[]>([]);
  const [netflixContent, setNetflixContent] = useState<ContentItem[]>([]);
  const [amazonPrimeContent, setAmazonPrimeContent] = useState<ContentItem[]>([]);
  const [searchResults, setSearchResults] = useState<ContentItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [hollywoodPage, setHollywoodPage] = useState(1);
  const [bollywoodPage, setBollywoodPage] = useState(1);
  const [netflixPage, setNetflixPage] = useState(1);
  const [amazonPrimePage, setAmazonPrimePage] = useState(1);
  const watchLater = useWatchlistStore((s) => s.items);
  const fetchWatchlist = useWatchlistStore((s) => s.fetch);
  const addItemToStore = useWatchlistStore((s) => s.add);
  const removeItemFromStore = useWatchlistStore((s) => s.remove);
  const continueWatching = useContinueWatchingStore((s) => s.items);
  const continueWatchingLoading = useContinueWatchingStore((s) => s.isLoading);
  const fetchContinueWatching = useContinueWatchingStore((s) => s.fetch);
  const removeContinueWatching = useContinueWatchingStore((s) => s.remove);
  
  // Ref to track if we're loading more content
  const isLoadingMoreRef = useRef(false);

  useEffect(() => {
    loadContent();
    fetchWatchlist(!!isSignedIn);
    fetchContinueWatching(!!isSignedIn);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn, fetchWatchlist, fetchContinueWatching]);

  // Scroll to top whenever the view changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [currentView]);

  useEffect(() => {
    if (searchQuery) {
      const timer = setTimeout(() => {
        handleSearch();
      }, 500);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const loadContent = async () => {
    setLoading(true);
    try {
      const [
        moviesData, 
        tvData, 
        hollywoodData, 
        bollywoodData, 
        animeData,
        netflixData,
        amazonPrimeData
      ] = await Promise.all([
        fetchMovies(1),
        fetchTVShows(1),
        fetchHollywoodMovies(hollywoodPage),
        fetchBollywoodMovies(bollywoodPage),
        fetchAnimeContent(1),
        fetchNetflixContent(netflixPage),
        fetchAmazonPrimeContent(amazonPrimePage)
      ]);

      const filteredMovies = filterAdultContent(
        moviesData.results?.filter(
          (movie: any) => !blockedMovieIds.includes(movie.id.toString())
        ) || [],
        false
      ) as ContentItem[];

      const filteredHollywood = filterAdultContent(
        hollywoodData.results?.filter(
          (movie: any) => !blockedMovieIds.includes(movie.id.toString())
        ) || [],
        false
      ) as ContentItem[];

      const filteredBollywood = filterAdultContent(
        bollywoodData.results?.filter(
          (movie: any) => !blockedMovieIds.includes(movie.id.toString())
        ) || [],
        false
      ) as ContentItem[];

      const filteredAnime = filterAdultContent(
        animeData.results?.filter(
          (item: any) => !blockedMovieIds.includes(item.id.toString())
        ) || [],
        false
      ) as ContentItem[];

      const filteredTVShows = filterAdultContent(
        tvData.results || [],
        false
      ) as ContentItem[];

      const filteredNetflix = filterAdultContent(
        netflixData.results?.filter(
          (movie: any) => !blockedMovieIds.includes(movie.id.toString())
        ) || [],
        false
      ) as ContentItem[];

      const filteredAmazonPrime = filterAdultContent(
        amazonPrimeData.results?.filter(
          (movie: any) => !blockedMovieIds.includes(movie.id.toString())
        ) || [],
        false
      ) as ContentItem[];

      setMovies(filteredMovies);
      setTVShows(filteredTVShows);
      setHollywoodMovies(filteredHollywood);
      setBollywoodMovies(filteredBollywood);
      setAnimeContent(filteredAnime);
      setNetflixContent(filteredNetflix);
      setAmazonPrimeContent(filteredAmazonPrime);
    } catch (error) {
      console.error('Error loading content:', error);
    } finally {
      setLoading(false);
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
      // Match on type as well as id — TMDB ids are only unique per media type.
      const updated = saved.filter((w: any) =>
        !((w.id === itemId || w.content_id === itemId) &&
          (w.type || w.content_type || (w.title ? 'movie' : 'tv')) === contentType)
      );
      setLocalStorage('watchLater', updated);
      removeItemFromStore(itemId, contentType as 'movie' | 'tv')
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

    // Check if item already exists before optimistic update. Match on type as
    // well as id — a movie and a TV show can share the same TMDB id.
    const exists = watchLater.some(
      (w: any) =>
        (w.id === itemId || w.content_id === itemId) && w.content_type === contentType
    );
    
    // Optimistically update the store
    if (exists) {
      removeItemFromStore(itemId, contentType as 'movie' | 'tv');
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
            removeItemFromStore(itemId, contentType as 'movie' | 'tv')
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
    const itemType = item.media_type || (item.title ? 'movie' : 'tv');
    return watchLater.some(
      (w: any) =>
        (w.id === itemId || w.content_id === itemId) && w.content_type === itemType
    );
  }, [watchLater]);

  const loadMoreContent = async (contentType: string) => {
    if (loading || loadingMore || isLoadingMoreRef.current) {
      return;
    }
    
    isLoadingMoreRef.current = true;
    
    setLoadingMore(true);
    try {
      let nextPage;
      let currentContent;
      let setContent;
      let setPage;

      switch (contentType) {
        case 'hollywood':
          nextPage = hollywoodPage + 1;
          currentContent = hollywoodMovies;
          setContent = setHollywoodMovies;
          setPage = setHollywoodPage;
          break;
        case 'bollywood':
          nextPage = bollywoodPage + 1;
          currentContent = bollywoodMovies;
          setContent = setBollywoodMovies;
          setPage = setBollywoodPage;
          break;
        case 'netflix':
          nextPage = netflixPage + 1;
          currentContent = netflixContent;
          setContent = setNetflixContent;
          setPage = setNetflixPage;
          break;
        case 'amazonprime':
          nextPage = amazonPrimePage + 1;
          currentContent = amazonPrimeContent;
          setContent = setAmazonPrimeContent;
          setPage = setAmazonPrimePage;
          break;
        default:
          return;
      }

      let newData;
      switch (contentType) {
        case 'hollywood':
          newData = await fetchHollywoodMovies(nextPage);
          break;
        case 'bollywood':
          newData = await fetchBollywoodMovies(nextPage);
          break;
        case 'netflix':
          newData = await fetchNetflixContent(nextPage);
          break;
        case 'amazonprime':
          newData = await fetchAmazonPrimeContent(nextPage);
          break;
        default:
          return;
      }

      const filteredNewData = filterAdultContent(
        newData.results?.filter(
          (item: any) => !blockedMovieIds.includes(item.id.toString())
        ) || [],
        false
      ) as ContentItem[];

      setContent([...currentContent, ...filteredNewData]);
      setPage(nextPage);
    } catch (error) {
      console.error(`Error loading more ${contentType}:`, error);
    } finally {
      setLoadingMore(false);
      isLoadingMoreRef.current = false;
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const results = await searchContent(searchQuery);
      
      // Multi-search can return people/companies — only keep watchable titles
      // so cards link to valid /details and /watch pages.
      // Always filter by item metadata (genre_ids, adult flag, title keywords)
      // rather than bypassing based on the user's search query, which could
      // cause false positives for legitimate titles like "Adult Swim".
      const filteredResults = filterAdultContent(
        results.results?.filter(
          (item: any) =>
            !blockedMovieIds.includes(item.id.toString()) &&
            (item.media_type === 'movie' || item.media_type === 'tv')
        ) || [],
        false
      ) as ContentItem[];
      
      setSearchResults(filteredResults);
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleHeroWatchNow = (movie: ContentItem) => {
    // Derive the media type the same way the details handler does — hardcoding
    // 'movie' would send a TV title to the movie endpoint ("Content Not Found").
    const type = movie.media_type || (movie.title ? 'movie' : 'tv');
    router.push(`/watch?id=${movie.id}&type=${type}`);
  };

  const handleHeroMoreDetails = (movie: ContentItem) => {
    const type = movie.media_type || (movie.title ? 'movie' : 'tv');
    router.push(`/details?id=${movie.id}&type=${type}`);
  };

  const filteredContent = useMemo(() => {
    let content: (ContentItem | any)[] = [];
    
    if (currentView === 'home') {
      content = [...movies, ...tvShows];
    } else if (currentView === 'hollywood') {
      content = hollywoodMovies;
    } else if (currentView === 'bollywood') {
      content = bollywoodMovies;
    } else if (currentView === 'netflix') {
      content = netflixContent;
    } else if (currentView === 'amazonprime') {
      content = amazonPrimeContent;
    } else if (currentView === 'search') {
      content = searchResults;
    }

    // Apply filters
    if (selectedGenre !== 'all') {
      content = content.filter((item: any) => 
        item.genre_ids?.includes(parseInt(selectedGenre))
      );
    }

    if (selectedYear !== 'all') {
      content = content.filter((item: any) => {
        const year = new Date(item.release_date || item.first_air_date || '').getFullYear();
        return year.toString() === selectedYear;
      });
    }

    return content;
  }, [currentView, movies, tvShows, hollywoodMovies, bollywoodMovies, netflixContent, amazonPrimeContent, searchResults, selectedGenre, selectedYear]);

  const mainClassName = currentView === 'home'
    ? 'pb-8 pt-2'
    : 'pt-24 pb-8';

  return (
    <motion.div 
      className="min-h-screen bg-black text-white overflow-x-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {/* Navigation */}
      <Navbar
        currentView={currentView}
        showSearch={false}
        watchLaterCount={watchLater.length}
        onViewChange={(view) => {
          setCurrentView(view);
          if (view !== 'search') {
            setSearchQuery('');
          }
          // Reset filters when changing views
          setSelectedGenre('all');
          setSelectedYear('all');
        }}
      />

      {/* Hero Section - Only show on home page */}
      {currentView === 'home' && (              <HeroSection 
          onWatchNow={handleHeroWatchNow}
          onMoreDetails={handleHeroMoreDetails}
          onAddToWatchLater={addToWatchLater}
          isInWatchLater={isInWatchLater}
          getWatchStatus={(item) => {
            const itemType = item.media_type || (item.title ? 'movie' : 'tv');
            const found = watchLater.find(
              (w: any) =>
                (w.id === item.id || w.content_id === item.id) && w.content_type === itemType
            );
            return found?.status;
          }}
        />
      )}

      {/* Continue Watching Section - between hero/spotlight and trending content */}
      {currentView === 'home' && (continueWatchingLoading ? (
        <SkeletonContinueWatching />
      ) : continueWatching.length > 0 ? (
        <div className="pt-8 sm:pt-10">
          <div className="px-4 sm:px-6 lg:px-8 max-w-screen-2xl mx-auto">
            <div className="mb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Continue Watching
              </h2>
              <p className="text-gray-400 text-sm mt-1">Pick up where you left off</p>
            </div>
            <div className="episodes-slider group relative">
            <div className="flex overflow-x-auto scrollbar-hide gap-4 pb-4">
              {continueWatching.slice(0, 10).map((item) => {
                const href = item.content_type === 'tv'
                  ? `/watch?id=${item.content_id}&type=tv&season=${item.season_number || 1}&episode=${item.episode_number || 1}`
                  : `/watch?id=${item.content_id}&type=movie`;
                
                const posterSrc = item.poster_path 
                  ? (item.poster_path.startsWith('http') 
                    ? item.poster_path 
                    : `https://image.tmdb.org/t/p/w342${item.poster_path}`)
                  : null;

                return (
                  <Link
                    key={`cw-${item.content_id}-${item.season_number || ''}-${item.episode_number || ''}`}
                    href={href}
                    className="group flex-shrink-0 w-40"
                  >
                    <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-white/5">
                      {posterSrc ? (
                        <Image
                          src={posterSrc}
                          alt={item.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="160px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No Image</div>
                      )}
                      
                      {/* Progress bar at bottom */}
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                        <div 
                          className="h-full bg-white transition-all duration-300"
                          style={{ width: `${Math.min(item.progress_percentage, 100)}%` }}
                        />
                      </div>

                      {/* Play overlay on hover */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/90 rounded-full p-3">
                          <svg className="w-6 h-6 text-black ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>

                      {/* Dismiss button */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          removeContinueWatching(
                            item.content_id, 
                            item.content_type, 
                            !!isSignedIn,
                            item.season_number ?? undefined, 
                            item.episode_number ?? undefined
                          );
                        }}
                        className="absolute top-2 right-2 z-20 bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200"
                        title="Remove from continue watching"
                        aria-label={`Remove ${item.title} from continue watching`}
                      >
                        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5 line-clamp-1 group-hover:text-white transition-colors font-medium">
                      {item.title}
                    </p>
                    {item.content_type === 'tv' && item.episode_number && (
                      <p className="text-xs text-gray-500 line-clamp-1">
                        S{item.season_number || 1} · E{item.episode_number}
                        {item.episode_title && ` · ${item.episode_title}`}
                      </p>
                    )}
                    {item.progress_percentage > 0 && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {item.progress_percentage >= 90 ? 'Almost done' : `${item.progress_percentage}% watched`}
                      </p>
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Rail scroll controls */}
            <div className="absolute top-1/2 -left-4 -translate-y-1/2 z-20 scroll-button hidden md:block">
              <button
                onClick={(e) => {
                  const container = e.currentTarget.parentElement?.parentElement?.querySelector('.overflow-x-auto');
                  container?.scrollBy({ left: -400, behavior: 'smooth' });
                }}
                aria-label="Scroll continue watching left"
                className="bg-black/80 hover:bg-black text-white rounded-full p-3 shadow-xl backdrop-blur-sm border border-white/20 hover:scale-110 transition-all duration-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            </div>
            <div className="absolute top-1/2 -right-4 -translate-y-1/2 z-20 scroll-button hidden md:block">
              <button
                onClick={(e) => {
                  const container = e.currentTarget.parentElement?.parentElement?.querySelector('.overflow-x-auto');
                  container?.scrollBy({ left: 400, behavior: 'smooth' });
                }}
                aria-label="Scroll continue watching right"
                className="bg-black/80 hover:bg-black text-white rounded-full p-3 shadow-xl backdrop-blur-sm border border-white/20 hover:scale-110 transition-all duration-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            </div>
          </div>
        </div>
      ) : null)}

      {/* Main content */}
      <main id="main-content" className={mainClassName}>
        <div className="px-4 sm:px-6 lg:px-8">
          {/* Filters */}
          {currentView !== 'home' && (
            <div className="mb-8 space-y-4">
              
              
              {currentView !== 'search' && (
                <div className="text-xs text-gray-500 flex items-center space-x-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <span>Content is filtered for appropriate audiences. Search for specific content to view all results.</span>
                </div>
              )}
            </div>
          )}
          
          {/* Content */}
          {loading ? (
            currentView === 'home' ? (
              // Home shows horizontal ContentSection rows — keep section skeletons.
              <div className="space-y-8">
                <SkeletonSection />
                <SkeletonSection />
                <SkeletonSection />
              </div>
            ) : (
              // Category views render a ContentCard grid (5/7 ratio) — match it.
              <SkeletonGrid count={18} ratio="aspect-[5/7]" />
            )
          ) : currentView === 'home' ? (
            <div className="space-y-8">

              {/* Popular Movies Section */}
              <ContentSection
                title="Trending Movies"
                subtitle="Most popular movies right now"
                content={movies}
                onAddToWatchLater={addToWatchLater}
                isInWatchLater={isInWatchLater}
                sectionId="movies"
                onViewAll={() => router.push('/movies')}
              />
              
              {/* Popular TV Shows Section */}
              <ContentSection
                title="Popular TV Shows"
                subtitle="Binge-worthy series and shows"
                content={tvShows}
                onAddToWatchLater={addToWatchLater}
                isInWatchLater={isInWatchLater}
                sectionId="tv"
                onViewAll={() => router.push('/tv')}
              />
              
              {/* Hollywood Section */}
              <ContentSection
                title="Hollywood"
                subtitle="Latest blockbusters and Hollywood hits"
                content={hollywoodMovies}
                onAddToWatchLater={addToWatchLater}
                isInWatchLater={isInWatchLater}
                sectionId="hollywood"
                onViewAll={() => setCurrentView('hollywood')}
              />
              
              {/* Bollywood Section */}
              <ContentSection
                title="Bollywood"
                subtitle="Popular Hindi movies and entertainment"
                content={bollywoodMovies}
                onAddToWatchLater={addToWatchLater}
                isInWatchLater={isInWatchLater}
                sectionId="bollywood"
                onViewAll={() => setCurrentView('bollywood')}
              />
              
              {/* Anime Section */}
              <ContentSection
                title="Anime"
                subtitle="Top Japanese animation series and movies"
                content={animeContent}
                onAddToWatchLater={addToWatchLater}
                isInWatchLater={isInWatchLater}
                sectionId="anime"
                onViewAll={() => router.push('/anime')}
              />
              
              {/* Netflix Section */}
              <ContentSection
                title="Netflix Originals"
                subtitle="Exclusive Netflix movies and series"
                content={netflixContent}
                onAddToWatchLater={addToWatchLater}
                isInWatchLater={isInWatchLater}
                sectionId="netflix"
                onViewAll={() => setCurrentView('netflix')}
              />
              
              {/* Amazon Prime Section */}
              <ContentSection
                title="Amazon Prime"
                subtitle="Prime Video exclusive content"
                content={amazonPrimeContent}
                onAddToWatchLater={addToWatchLater}
                isInWatchLater={isInWatchLater}
                sectionId="amazonprime"
                onViewAll={() => setCurrentView('amazonprime')}
              />
              
            </div>
          ) : (
            <>
              {/* Section title */}
              <div className="mb-6">
                <h2 className="text-2xl sm:text-3xl font-bold text-white">
                  {currentView === 'hollywood' && 'Hollywood Movies'}
                  {currentView === 'bollywood' && 'Bollywood Movies'}
                  {currentView === 'netflix' && 'Netflix Content'}
                  {currentView === 'amazonprime' && 'Amazon Prime Video'}
                  {currentView === 'search' && `Results for "${searchQuery}"`}
                </h2>
              </div>
              
              {/* Content grid */}
              <motion.div 
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-5 md:gap-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2, staggerChildren: 0.05 }}
              >
                {filteredContent.map((item) => (
                  <motion.div
                    key={`${item.id}-${item.type || item.media_type || item.content_type || 'unknown'}`}
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

              {(currentView === 'hollywood' || currentView === 'bollywood' || currentView === 'netflix' || currentView === 'amazonprime') && filteredContent.length > 0 && (
                <div className="flex justify-center mt-8">
                  <button
                    onClick={() => loadMoreContent(currentView)}
                    disabled={loadingMore}
                    className="px-8 py-3 bg-white hover:bg-gray-200 disabled:bg-gray-600 disabled:cursor-not-allowed text-black rounded-lg transition-colors font-medium flex items-center space-x-2"
                  >
                    {loadingMore ? (
                      <>
                        <span className="tracking-wide">Loading…</span>
                      </>
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
              
              {filteredContent.length === 0 && (
                <div className="text-center py-20">
                  <p className="text-gray-400 text-lg">
                    {currentView === 'search' ? 'No results found' : 'No content available'}
                  </p>
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

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    }>
      <HomePageContent />
    </Suspense>
  );
}

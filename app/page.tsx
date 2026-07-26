'use client';

import React, { useState, useEffect, useRef, Suspense, useCallback, useMemo, memo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from '@/components/ProxyImage';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  fetchMovies, 
  fetchTVShows, 
  fetchHollywoodMovies,
  fetchBollywoodMovies,
  fetchAnimeContent,
  fetchNetflixContent,
  fetchAmazonPrimeContent,
  searchContent, 
  TMDB_IMAGE_BASE_URL,
  getLocalStorage,
  setLocalStorage,
  blockedMovieIds,
  filterAdultContent
} from '@/lib/utils';
import type { ContentItem } from '@/lib/types';
import { useAuth } from '@/components/AuthProvider';
import HeroSection from '@/components/HeroSection';
import Navbar from '@/components/Navbar';
import ContentSection from '@/components/ContentSection';
import Footer from '@/components/Footer';
import AnimeHero from '@/components/AnimeHero';
import { SkeletonSection } from '@/components/SkeletonCard';

// Memoized ContentCard outside to prevent recreation
const ContentCard = memo(({ 
  item, 
  addToWatchLater, 
  isInWatchLater 
}: { 
  item: ContentItem | any, 
  addToWatchLater: (item: ContentItem) => void,
  isInWatchLater: (item: ContentItem) => boolean
}) => {
  const title = item.title || item.name || '';
  const posterPath = item.poster_path || item.poster;
  const rating = item.vote_average || 0;
  const type = item.type || item.media_type || (item.title ? 'movie' : 'tv');
  const router = useRouter();

  const handleCardClick = () => {
    router.push(`/details?id=${item.id}&type=${type}`);
  };

  return (
    <motion.div 
      className="group relative bg-white/[0.03] border border-white/5 rounded-xl overflow-hidden card-hover"
      initial={false}
      whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.95 }}
      style={{ willChange: 'transform' }}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`View details for ${title}`}
    >
      <div className="relative aspect-[5/7]">
        {posterPath ? (
          <Image
            src={item.poster ? posterPath : `${TMDB_IMAGE_BASE_URL}${posterPath}`}
            alt={title}
            fill
            className="object-cover transition-all duration-200"
            sizes="(max-width: 768px) 150px, (max-width: 1200px) 200px, 250px"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-white/5 flex items-center justify-center">
            <span className="text-gray-400">No Image</span>
          </div>
        )}
        
        {/* Status Badge */}
        {item.status && (
          <div className={`absolute top-3 left-3 z-10 px-2 py-0.5 rounded-full text-[10px] font-semibold shadow-lg ${
            item.status === 'watching' ? 'bg-white text-black' :
            item.status === 'completed' ? 'bg-white/70 text-black' :
            item.status === 'dropped' ? 'bg-white/40 text-black' :
            'bg-white/20 text-black'
          }`}>
            {item.status === 'watching' ? '▶ Watching' :
             item.status === 'completed' ? '✓ Completed' :
             item.status === 'dropped' ? '✕ Dropped' :
             '⏳ Plan to Watch'}
          </div>
        )}
        
        {/* Bookmark icon */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            addToWatchLater(item);
          }}
          className="absolute top-3 right-3 z-10 bg-black/60 backdrop-blur-sm rounded-full p-2 transition-all duration-200 hover:bg-black/80"
        >
          <svg 
            className={`w-5 h-5 transition-colors ${
              isInWatchLater(item) ? 'text-red-500 fill-current' : 'text-white'
            }`} 
            fill={isInWatchLater(item) ? 'currentColor' : 'none'} 
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
        </button>
        
        {/* Hover overlay with details */}
        <div className="card-overlay absolute inset-0 flex flex-col justify-end p-4 text-white">
          <div className="space-y-2">
            <h3 className="font-bold text-sm leading-tight">{title}</h3>
            
            {rating > 0 && (
              <div className="flex items-center space-x-1">
                <svg className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                </svg>
                <span className="text-sm font-semibold">{rating.toFixed(1)}/10</span>
              </div>
            )}
            
            <div className="flex items-center gap-2 mt-3">
              <Link
                href={`/watch?id=${item.id}&type=${type}`}
                className="flex-1 bg-white hover:bg-gray-100 text-black py-1.5 rounded-md text-xs font-bold transition-colors flex items-center justify-center gap-1"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8 5v10l7-5z"/>
                </svg>
                WATCH
              </Link>
              <Link
                href={`/details?id=${item.id}&type=${type}`}
                className="bg-white/20 hover:bg-white/30 backdrop-blur-md text-white p-1.5 rounded-md transition-colors"
                title="View Details"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

ContentCard.displayName = 'ContentCard';

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
  const [watchlistFilter, setWatchlistFilter] = useState('all');
  const [moviesPage, setMoviesPage] = useState(1);
  const [tvPage, setTvPage] = useState(1);
  const [hollywoodPage, setHollywoodPage] = useState(1);
  const [bollywoodPage, setBollywoodPage] = useState(1);
  const [animePage, setAnimePage] = useState(1);
  const [netflixPage, setNetflixPage] = useState(1);
  const [amazonPrimePage, setAmazonPrimePage] = useState(1);
  const [watchLater, setWatchLater] = useState<any[]>([]);
  const showSearchInput = false; // Search is handled via /search page
  
  // Ref to track if we're loading more content
  const isLoadingMoreRef = useRef(false);

  useEffect(() => {
    loadContent();
    loadWatchLater();
  }, [isSignedIn]);

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
        fetchMovies(moviesPage),
        fetchTVShows(tvPage),
        fetchHollywoodMovies(hollywoodPage),
        fetchBollywoodMovies(bollywoodPage),
        fetchAnimeContent(animePage),
        fetchNetflixContent(netflixPage),
        fetchAmazonPrimeContent(amazonPrimePage)
      ]);

      const filteredMovies = filterAdultContent(
        moviesData.results?.filter(
          (movie: any) => !blockedMovieIds.includes(movie.id.toString())
        ) || [],
        false
      );

      const filteredHollywood = filterAdultContent(
        hollywoodData.results?.filter(
          (movie: any) => !blockedMovieIds.includes(movie.id.toString())
        ) || [],
        false
      );

      const filteredBollywood = filterAdultContent(
        bollywoodData.results?.filter(
          (movie: any) => !blockedMovieIds.includes(movie.id.toString())
        ) || [],
        false
      );

      const filteredAnime = filterAdultContent(
        animeData.results?.filter(
          (item: any) => !blockedMovieIds.includes(item.id.toString())
        ) || [],
        false
      );

      const filteredTVShows = filterAdultContent(
        tvData.results || [],
        false
      );

      const filteredNetflix = filterAdultContent(
        netflixData.results?.filter(
          (movie: any) => !blockedMovieIds.includes(movie.id.toString())
        ) || [],
        false
      );

      const filteredAmazonPrime = filterAdultContent(
        amazonPrimeData.results?.filter(
          (movie: any) => !blockedMovieIds.includes(movie.id.toString())
        ) || [],
        false
      );

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

  const loadWatchLater = useCallback(async () => {
    if (!isSignedIn) {
      // Fallback to localStorage for non-authenticated users
      const saved = getLocalStorage('watchLater', []);
      setWatchLater(saved);
      return;
    }
    try {
      const response = await fetch('/api/watchlist');
      if (response.ok) {
        const data = await response.json();
        // Transform API data to ContentCard-compatible format
        const transformed = data.map((item: any) => ({
          id: item.content_id,
          type: item.content_type,
          media_type: item.content_type,
          title: item.title,
          poster_path: item.poster_path,
          vote_average: 0,
          overview: '',
          status: item.status || 'plan_to_watch',
          _apiRowId: item.id,
        }));
        setWatchLater(transformed);
      }
    } catch (error) {
      console.error('Error loading watchlist:', error);
      // Fallback to localStorage
      const saved = getLocalStorage('watchLater', []);
      setWatchLater(saved);
    }
  }, [isSignedIn]);

  const statusLabels: Record<string, { label: string, color: string }> = {
    watching: { label: 'Watching', color: 'bg-green-500' },
    completed: { label: 'Completed', color: 'bg-blue-500' },
    plan_to_watch: { label: 'Plan to Watch', color: 'bg-yellow-500' },
    dropped: { label: 'Dropped', color: 'bg-red-500' },
  };

  const transformApiItem = (apiItem: any) => ({
    id: apiItem.content_id,
    type: apiItem.content_type,
    media_type: apiItem.content_type,
    title: apiItem.title,
    poster_path: apiItem.poster_path,
    vote_average: 0,
    overview: '',
    status: apiItem.status || 'plan_to_watch',
    _apiRowId: apiItem.id,
  });

  const addToWatchLater = useCallback(async (item: ContentItem) => {
    const contentType = item.media_type || (item.title ? 'movie' : 'tv');
    const itemId = item.id;

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
          if (result.added) {
            setWatchLater(prev => [...prev, transformApiItem(result.item)]);
          } else {
            setWatchLater(prev => prev.filter((w: any) => w.id !== itemId));
          }
        } else {
          console.error('Watchlist API error:', result.error);
          // Fallback to localStorage
          setWatchLater(prev => {
            const existingIndex = prev.findIndex((w: any) => w.id === itemId);
            let newWatchLater;
            if (existingIndex >= 0) {
              newWatchLater = prev.filter((_, index) => index !== existingIndex);
            } else {
              newWatchLater = [...prev, { id: itemId, type: contentType, title: item.title || item.name || '', poster: item.poster_path }];
            }
            setLocalStorage('watchLater', newWatchLater);
            return newWatchLater;
          });
        }
      } catch (error) {
        console.error('Error updating watchlist:', error);
        setWatchLater(prev => {
          const existingIndex = prev.findIndex((w: any) => w.id === itemId);
          let newWatchLater;
          if (existingIndex >= 0) {
            newWatchLater = prev.filter((_, index) => index !== existingIndex);
          } else {
            newWatchLater = [...prev, { id: itemId, type: contentType, title: item.title || item.name || '', poster: item.poster_path }];
          }
          setLocalStorage('watchLater', newWatchLater);
          return newWatchLater;
        });
      }
    } else {
      setWatchLater(prev => {
        const existingIndex = prev.findIndex((w: any) => w.id === itemId);
        let newWatchLater;
        if (existingIndex >= 0) {
          newWatchLater = prev.filter((_, index) => index !== existingIndex);
        } else {
          newWatchLater = [...prev, { id: itemId, type: contentType, title: item.title || item.name || '', poster: item.poster_path }];
        }
        setLocalStorage('watchLater', newWatchLater);
        return newWatchLater;
      });
    }
  }, [isSignedIn]);

  const isInWatchLater = useCallback((item: ContentItem) => {
    const itemId = item.id;
    return watchLater.some((w: any) => w.id === itemId);
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
      let fetchFn;

      switch (contentType) {
        case 'movies':
          nextPage = moviesPage + 1;
          currentContent = movies;
          setContent = setMovies;
          setPage = setMoviesPage;
          fetchFn = fetchMovies;
          break;
        case 'tv':
          nextPage = tvPage + 1;
          currentContent = tvShows;
          setContent = setTVShows;
          setPage = setTvPage;
          fetchFn = fetchTVShows;
          break;
        case 'hollywood':
          nextPage = hollywoodPage + 1;
          currentContent = hollywoodMovies;
          setContent = setHollywoodMovies;
          setPage = setHollywoodPage;
          fetchFn = fetchHollywoodMovies;
          break;
        case 'bollywood':
          nextPage = bollywoodPage + 1;
          currentContent = bollywoodMovies;
          setContent = setBollywoodMovies;
          setPage = setBollywoodPage;
          fetchFn = fetchBollywoodMovies;
          break;
        case 'anime':
          nextPage = animePage + 1;
          currentContent = animeContent;
          setContent = setAnimeContent;
          setPage = setAnimePage;
          fetchFn = fetchAnimeContent;
          break;
        case 'netflix':
          nextPage = netflixPage + 1;
          currentContent = netflixContent;
          setContent = setNetflixContent;
          setPage = setNetflixPage;
          fetchFn = fetchNetflixContent;
          break;
        case 'amazonprime':
          nextPage = amazonPrimePage + 1;
          currentContent = amazonPrimeContent;
          setContent = setAmazonPrimeContent;
          setPage = setAmazonPrimePage;
          fetchFn = fetchAmazonPrimeContent;
          break;
        default:
          return;
      }

      let newData;
      switch (contentType) {
        case 'movies':
          newData = await fetchMovies(nextPage);
          break;
        case 'tv':
          newData = await fetchTVShows(nextPage);
          break;
        case 'hollywood':
          newData = await fetchHollywoodMovies(nextPage);
          break;
        case 'bollywood':
          newData = await fetchBollywoodMovies(nextPage);
          break;
        case 'anime':
          newData = await fetchAnimeContent(nextPage);
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
      );

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
      
      const searchTerms = searchQuery.toLowerCase();
      const isAdultSearch = ['adult', 'sex', 'erotic', 'xxx', 'porn', 'explicit', 'nude'].some(
        term => searchTerms.includes(term)
      );
      
      const filteredResults = filterAdultContent(
        results.results?.filter(
          (item: any) => !blockedMovieIds.includes(item.id.toString())
        ) || [],
        isAdultSearch
      );
      
      setSearchResults(filteredResults);
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleHeroWatchNow = (movie: ContentItem) => {
    router.push(`/watch?id=${movie.id}&type=movie`);
  };

  const handleHeroMoreDetails = (movie: ContentItem) => {
    const type = movie.media_type || (movie.title ? 'movie' : 'tv');
    router.push(`/details?id=${movie.id}&type=${type}`);
  };

  const filteredContent = useMemo(() => {
    let content: (ContentItem | any)[] = [];
    
    if (currentView === 'home') {
      content = [...movies, ...tvShows];
    } else if (currentView === 'movies') {
      content = movies;
    } else if (currentView === 'tv') {
      content = tvShows;
    } else if (currentView === 'hollywood') {
      content = hollywoodMovies;
    } else if (currentView === 'bollywood') {
      content = bollywoodMovies;
    } else if (currentView === 'anime') {
      content = animeContent;
    } else if (currentView === 'netflix') {
      content = netflixContent;
    } else if (currentView === 'amazonprime') {
      content = amazonPrimeContent;
    } else if (currentView === 'search') {
      content = searchResults;
    } else if (currentView === 'watchlater') {
      return watchLater;
    }

    // Apply filters
    if (currentView === 'watchlater' && watchlistFilter !== 'all') {
      content = content.filter((item: any) => item.status === watchlistFilter);
    } else if (selectedGenre !== 'all') {
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
  }, [currentView, movies, tvShows, hollywoodMovies, bollywoodMovies, animeContent, netflixContent, amazonPrimeContent, searchResults, watchLater, selectedGenre, selectedYear, watchlistFilter]);

  const mainClassName = (currentView === 'home' || (currentView === 'anime' && animeContent.length > 0 && !loading))
    ? 'pb-8'
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
        showSearch={showSearchInput}
        searchQuery={searchQuery}
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
        onSearchToggle={() => { router.push('/search'); }}
        onSearchChange={setSearchQuery}
      />

      {/* Hero Section - Only show on home page */}
      {currentView === 'home' && (
        <HeroSection 
          onWatchNow={handleHeroWatchNow}
          onMoreDetails={handleHeroMoreDetails}
        />
      )}

      {/* Anime Hero Banner - Only show on anime view */}
      {currentView === 'anime' && animeContent.length > 0 && !loading && (
        <AnimeHero animeContent={animeContent} />
      )}

      {/* Main content */}
      <main className={mainClassName}>
        <div className="px-4 sm:px-6 lg:px-8">
          {/* Filters */}
          {currentView !== 'watchlater' && currentView !== 'home' && (
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
            <div className="space-y-8">
              <SkeletonSection />
              <SkeletonSection />
              <SkeletonSection />
            </div>
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
                onViewAll={() => setCurrentView('movies')}
              />
              
              {/* Popular TV Shows Section */}
              <ContentSection
                title="Popular TV Shows"
                subtitle="Binge-worthy series and shows"
                content={tvShows}
                onAddToWatchLater={addToWatchLater}
                isInWatchLater={isInWatchLater}
                sectionId="tv"
                onViewAll={() => setCurrentView('tv')}
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
                onViewAll={() => setCurrentView('anime')}
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
                  {currentView === 'movies' && '🎬 Popular Movies'}
                  {currentView === 'tv' && '📺 Popular TV Shows'}
                  {currentView === 'hollywood' && '🌟 Hollywood Movies'}
                  {currentView === 'bollywood' && '🎭 Bollywood Movies'}
                  {currentView === 'anime' && '⚡ Anime Collection'}
                  {currentView === 'netflix' && '🔴 Netflix Content'}
                  {currentView === 'amazonprime' && '🎥 Amazon Prime Video'}
                  {currentView === 'search' && `🔍 Results for "${searchQuery}"`}
                  {currentView === 'watchlater' && (
            <>
              🔖 Watch Later
              <div className="flex flex-wrap gap-2 mt-3">
                {['all', 'watching', 'plan_to_watch', 'completed', 'dropped'].map(filter => (
                  <button
                    key={filter}
                    onClick={() => setWatchlistFilter(filter)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      watchlistFilter === filter
                        ? 'bg-white text-black'
                        : 'bg-white/10 text-gray-400 hover:bg-white/20'
                    }`}
                  >
                    {filter === 'all' ? 'All' : statusLabels[filter]?.label || filter}
                  </button>
                ))}
              </div>
            </>
          )}
                </h2>
                {currentView === 'anime' && (
                  <p className="text-gray-300 text-sm mt-1">Top Japanese animation series and movies</p>
                )}
              </div>
              
              {/* Content grid */}
              <motion.div 
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2, staggerChildren: 0.05 }}
              >
                {filteredContent.map((item, index) => (
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

              {(currentView === 'movies' || currentView === 'tv' || currentView === 'hollywood' || currentView === 'bollywood' || currentView === 'anime' || currentView === 'netflix' || currentView === 'amazonprime') && filteredContent.length > 0 && (
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

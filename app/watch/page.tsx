'use client';

import React, { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from '@/components/ProxyImage';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  fetchContentDetails, 
  fetchSeasonDetails, 
  getVideoUrl, 
  TMDB_API_KEY,
  TMDB_IMAGE_BASE_URL
} from '@/lib/utils';
import { availableSources } from '@/lib/sources';
import type { Movie, TVShow, Season } from '@/lib/types';
import Navbar from '@/components/Navbar';
import { useWatchlistStore } from '@/lib/store';
import Footer from '@/components/Footer';
import dynamic from 'next/dynamic';

const PlayerComponent = dynamic(() => import('@/components/PlayerComponent'), { ssr: false });

function WatchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [content, setContent] = useState<Movie | TVShow | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentSource, setCurrentSource] = useState(availableSources[0]);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [selectedEpisode, setSelectedEpisode] = useState<number>(1);
  const [seasonData, setSeasonData] = useState<Season | null>(null);
  const [securityLevel] = useState<'secure' | 'balanced' | 'permissive'>('balanced');
  const [showSearch, setShowSearch] = useState(false);
  const watchLaterCount = useWatchlistStore((s) => s.count);
  const fetchWatchlist = useWatchlistStore((s) => s.fetch);
  const [searchQuery, setSearchQuery] = useState('');
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [iframeKey, setIframeKey] = useState(0);
  const contentId = searchParams.get('id');
  const contentType = searchParams.get('type') as 'movie' | 'tv';
  const seasonParamStr = searchParams.get('season');
  const episodeParamStr = searchParams.get('episode');
  const seasonFromQuery = seasonParamStr ? parseInt(seasonParamStr, 10) : undefined;
  const episodeFromQuery = episodeParamStr ? parseInt(episodeParamStr, 10) : undefined;

  const initFromQueryRef = useRef(false);

  useEffect(() => {
    if (contentId && contentType) loadContent();
  }, [contentId, contentType]);

  useEffect(() => {
    if (content && contentType === 'tv' && selectedSeason) loadSeasonData();
  }, [content, selectedSeason]);

  useEffect(() => {
    fetchWatchlist(false);
  }, [fetchWatchlist]);

  const loadContent = async () => {
    if (!contentId || !contentType) return;
    setLoading(true);
    try {
      const data = await fetchContentDetails(contentId, contentType);
      setContent(data);

      const rec = await fetch(
        `https://api.themoviedb.org/3/${contentType}/${contentId}/recommendations?api_key=${TMDB_API_KEY}`
      );
      const recData = await rec.json();
      setRecommendations(recData.results || []);

      if (contentType === 'tv' && data?.seasons) {
        let targetSeason: number | undefined = undefined;
        if (typeof seasonFromQuery === 'number' && !Number.isNaN(seasonFromQuery)) {
          const exists = data.seasons.some((s: Season) => s.season_number === seasonFromQuery);
          if (exists) targetSeason = seasonFromQuery;
        }
        if (targetSeason === undefined) {
          const firstSeason = data.seasons.find((s: Season) => s.season_number > 0);
          if (firstSeason) targetSeason = firstSeason.season_number;
        }
        if (targetSeason !== undefined) setSelectedSeason(targetSeason);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadSeasonData = async () => {
    if (!contentId || contentType !== 'tv') return;
    try {
      const data = await fetchSeasonDetails(contentId, selectedSeason);
      setSeasonData(data);
      
      let nextEpisode = 1;
      
      if (typeof seasonFromQuery === 'number' && 
          typeof episodeFromQuery === 'number' && 
          selectedSeason === seasonFromQuery && 
          !Number.isNaN(episodeFromQuery)) {
        const valid = data.episodes?.some((e: any) => e.episode_number === episodeFromQuery);
        nextEpisode = valid ? episodeFromQuery : 1;
      } else if (!initFromQueryRef.current) {
        nextEpisode = 1;
        initFromQueryRef.current = true;
      } else {
        const stillValid = data.episodes?.some((e: any) => e.episode_number === selectedEpisode);
        nextEpisode = stillValid ? selectedEpisode : 1;
      }
      
      setSelectedEpisode(nextEpisode);
    } catch (err) { console.error(err); }
  };

  const getCurrentVideoUrl = () => {
    if (!content || !currentSource) return '';
    return getVideoUrl(
      currentSource.id,
      contentId!,
      contentType,
      contentType === 'tv' ? selectedSeason : undefined,
      contentType === 'tv' ? selectedEpisode : undefined
    );
  };

  const handleSourceFailure = () => {
    const currentIndex = availableSources.findIndex((source) => source.id === currentSource.id);
    const fallbackSource = availableSources
      .slice(currentIndex + 1)
      .find((source) => securityLevel !== 'secure' || !source.requiresNoSandbox);

    if (fallbackSource) {
      setCurrentSource(fallbackSource);
      setIframeKey((value) => value + 1);
      return;
    }

    const fallbackFromStart = availableSources.find(
      (source) => source.id !== currentSource.id && (securityLevel !== 'secure' || !source.requiresNoSandbox)
    );

    if (fallbackFromStart) {
      setCurrentSource(fallbackFromStart);
      setIframeKey((value) => value + 1);
    }
  };

  const getBackdropUrl = () =>
    content?.backdrop_path
      ? `${TMDB_IMAGE_BASE_URL.replace('w500', 'w1280')}${content.backdrop_path}`
      : '';

  if (loading) return <div className="min-h-screen bg-black" />;

  if (!content) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Content Not Found</h1>
          <Link href="/" className="text-white hover:text-gray-300">Return to Home</Link>
        </div>
      </div>
    );
  }

  const contentTitle = contentType === 'movie' ? (content as Movie).title : (content as TVShow).name;
  const releaseYear = (() => {
    try {
      const d = contentType === 'movie' ? (content as Movie).release_date : (content as TVShow).first_air_date;
      return d ? new Date(d).getFullYear() : '';
    } catch (e) {
      console.error('Failed to parse release date:', e);
      return '';
    }
  })();

  return (
    <motion.div 
      className="min-h-screen bg-black text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <Navbar
        currentView="watch"
        showSearch={showSearch}
        searchQuery={searchQuery}
        watchLaterCount={watchLaterCount}
        onViewChange={(view) => router.push(view === 'home' ? '/' : `/?view=${view}`)}
        onSearchToggle={() => setShowSearch(!showSearch)}
        onSearchChange={(q) => setSearchQuery(q)}
      />

      {/* Top bar */}
      <div className="pt-16 bg-black">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3">
          <Link
            href={`/details?id=${contentId}&type=${contentType}`}
            className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-sm group"
          >
            <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Details</span>
          </Link>
          <span className="text-gray-600">/</span>
          <span className="text-white font-medium text-sm line-clamp-1">{contentTitle}</span>
          {contentType === 'tv' && (
            <span className="text-gray-400 text-sm ml-auto shrink-0">
              S{selectedSeason} · E{selectedEpisode}
            </span>
          )}
        </div>
      </div>

      {/* Player area */}
      <div className="bg-black w-full">
        <div className="max-w-screen-2xl mx-auto">
          <div className="flex flex-col xl:flex-row gap-0">
            {/* Player */}
            <div className="flex-1 min-w-0">
              <div className="aspect-video w-full bg-black">
              {getCurrentVideoUrl() ? (
                <iframe
                  key={iframeKey}
                  src={getCurrentVideoUrl()}
                  className="w-full h-full"
                  allowFullScreen
                  onError={handleSourceFailure}
                  allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="no-referrer-when-downgrade"
                  loading="lazy"
                  sandbox={currentSource.requiresNoSandbox ? undefined : "allow-scripts allow-same-origin allow-presentation allow-forms"}
                  title="Player"
                  style={{ border: 'none', background: '#000' }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">🎬 Video Loading...</div>
              )}
               </div>
            </div>

            {/* Sources sidebar */}
            <div className="w-full xl:w-80 shrink-0 bg-black border-t xl:border-t-0 xl:border-l border-white/10">
              <div className="p-4 border-b border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-white flex items-center gap-2">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                    Sources
                  </span>
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider">Switch if not working</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableSources
                    .filter(source => securityLevel !== 'secure' || !source.requiresNoSandbox)
                    .map((source) => (
                      <button
                        key={source.id}
                        onClick={() => setCurrentSource(source)}
                        className={`relative px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 ${
                          currentSource.id === source.id
                            ? 'border-white bg-white/20 text-white'
                            : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                        }`}
                        title={source.playerType === 'native' ? 'Native player - no ads' : 'Third-party embed - ads may appear'}
                      >
                        <span>{source.name}</span>
                      </button>
                    ))}
                </div>
                <p className="text-[11px] text-gray-600 mt-3 leading-relaxed">
                  If a source has low quality or doesn&apos;t work, try another one.
                </p>

                {/* Ad-blocker tip */}
                <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 4h.01M20.5 12a8.5 8.5 0 11-17 0 8.5 8.5 0 0117 0zm-8.5-6h.01M12 9v4" />
                    </svg>
                    <p className="text-[11px] text-blue-300/80 leading-relaxed">
                      These sources use third-party embeds which may show ads. For the best experience, 
                      install <strong>uBlock Origin</strong> (free ad blocker) in your browser.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content below player */}
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Info row */}
        <div className="flex flex-col sm:flex-row gap-8">
          {/* Poster */}
          {content.poster_path && (
            <div className="flex-shrink-0 w-32 sm:w-36 mx-auto sm:mx-0">
              <div className="relative aspect-[2/3] rounded-lg overflow-hidden">
                <Image
                  src={`${TMDB_IMAGE_BASE_URL}${content.poster_path}`}
                  alt={contentTitle}
                  fill
                  className="object-cover"
                  sizes="144px"
                />
              </div>
            </div>
          )}

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">{contentTitle}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400 mb-4">
              {releaseYear && <span>{releaseYear}</span>}
              {content.vote_average > 0 && <span>★ {content.vote_average.toFixed(1)}</span>}
              {'number_of_seasons' in content && content.number_of_seasons && (
                <span>{content.number_of_seasons} Season{content.number_of_seasons > 1 ? 's' : ''}</span>
              )}
            </div>
            <p className="text-gray-300 text-sm leading-relaxed line-clamp-4">{content.overview}</p>
            {/* Genre tags */}
            {content.genres && content.genres.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {content.genres.map((genre: any) => (
                  <span key={genre.id} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-gray-300">
                    {genre.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Episode Selector for TV */}
        {contentType === 'tv' && seasonData?.episodes && seasonData.episodes.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3">Episodes - Season {selectedSeason}</h2>
            <div className="flex flex-wrap gap-2 mb-4">
              {seasonData.episodes.map((ep: any) => (
                <button
                  key={ep.episode_number}
                  onClick={() => setSelectedEpisode(ep.episode_number)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    selectedEpisode === ep.episode_number
                      ? 'bg-white text-black'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  {ep.episode_number}
                </button>
              ))}
            </div>
            {seasonData.season_number > 0 && (
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: (content as any).number_of_seasons || 1 }, (_, i) => i + 1).map(seasonNum => (
                  <button
                    key={seasonNum}
                    onClick={() => setSelectedSeason(seasonNum)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      selectedSeason === seasonNum
                        ? 'bg-white text-black'
                        : 'bg-white/10 text-gray-300 hover:bg-white/20'
                    }`}
                  >
                    S{seasonNum}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">You Might Also Like</h2>
            <div className="flex overflow-x-auto scrollbar-hide gap-4 pb-4">
              {recommendations.slice(0, 10).map((rec: any) => {
                const recTitle = rec.title || rec.name || '';
                const recPoster = rec.poster_path;
                return (
                  <Link
                    key={rec.id}
                    href={`/details?id=${rec.id}&type=${contentType}`}
                    className="group flex-shrink-0 w-36"
                  >
                    <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-black">
                      {recPoster ? (
                        <Image
                          src={`${TMDB_IMAGE_BASE_URL}${recPoster}`}
                          alt={recTitle}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="144px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">No Image</div>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2 group-hover:text-white transition-colors">{recTitle}</p>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <Footer />
    </motion.div>
  );
}

export default function WatchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <WatchPageContent />
    </Suspense>
  );
}

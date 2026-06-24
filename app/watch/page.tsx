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
  TMDB_IMAGE_BASE_URL,
  formatRuntime,
  getLocalStorage
} from '@/lib/utils';
import { availableSources } from '@/lib/sources';
import type { Movie, TVShow, Season } from '@/lib/types';
import Navbar from '@/components/Navbar';
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
  const [watchLaterCount, setWatchLaterCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [recommendations, setRecommendations] = useState<any[]>([]);
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
    const watchLater = getLocalStorage('watchLater', []);
    setWatchLaterCount(watchLater.length);
  }, []);

  const loadContent = async () => {
    if (!contentId || !contentType) return;
    setLoading(true);
    try {
      const data = await fetchContentDetails(contentId, contentType);
      setContent(data);

      const rec = await fetch(
        `https://api.themoviedb.org/3/${contentType}/${contentId}/recommendations?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}`
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

    const tvSeason = contentType === 'tv'
      ? selectedSeason || seasonFromQuery || (content as TVShow)?.seasons?.find((s) => s.season_number > 0)?.season_number || 1
      : undefined;
    const tvEpisode = contentType === 'tv'
      ? selectedEpisode || episodeFromQuery || seasonData?.episodes?.[0]?.episode_number || 1
      : undefined;

    return getVideoUrl(
      currentSource.id,
      contentId!,
      contentType,
      tvSeason,
      tvEpisode
    );
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
          <Link href="/" className="text-red-500 hover:text-red-400">Return to Home</Link>
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
      className="min-h-screen bg-[#0a0a0f] text-white"
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

      {/* Top bar with back button + title */}
      <div className="pt-16 bg-[#0a0a0f]">
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

      {/* Player area — full width, max 16:9 */}
      <div className="bg-black w-full">
        <div className="max-w-screen-2xl mx-auto">
          {/* Player + Sources row */}
          <div className="flex flex-col xl:flex-row gap-0">
            {/* Player */}
            <div className="flex-1 min-w-0">
              <div className="aspect-video w-full bg-black">
              {getCurrentVideoUrl() ? (
                <iframe
                  src={getCurrentVideoUrl()}
                  className="w-full h-full"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                  referrerPolicy="no-referrer-when-cross-origin"
                  loading="lazy"
                  sandbox={currentSource.requiresNoSandbox ? undefined : "allow-scripts allow-same-origin allow-presentation allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"}
                  title="Player"
                  style={{ border: 'none', background: '#000' }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">🎬 Video Loading...</div>
              )}
               </div>
            </div>

            {/* Sources sidebar */}
            <div className="xl:w-80 shrink-0 bg-[#111118] border-t xl:border-t-0 xl:border-l border-white/5">
              <div className="p-4 border-b border-white/5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-white flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 ${
                          currentSource.id === source.id
                            ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                            : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {source.name}
                      </button>
                    ))}
                </div>
                <p className="text-[11px] text-gray-600 mt-3 leading-relaxed">
                  If a source has low quality or doesn&apos;t work, try another one.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content below player */}
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {/* Episodes */}
        <AnimatePresence>
          {contentType === 'tv' && seasonData?.episodes && (
            <motion.div 
              className="py-2"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <h3 className="text-xl font-bold mb-4 text-white">Episodes</h3>
              
              {/* Season Selector */}
              {(content as TVShow).seasons && (content as TVShow).seasons.filter(s => s.season_number > 0).length > 1 && (
                <div className="flex flex-wrap gap-2 mb-5">
                  {(content as TVShow).seasons?.filter(s => s.season_number > 0).map(season => (
                    <button
                      key={season.id}
                      onClick={() => setSelectedSeason(season.season_number)}
                      className={`px-3 py-1.5 rounded-lg font-medium text-xs transition-colors ${
                        selectedSeason === season.season_number
                          ? 'bg-red-600 text-white'
                          : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10'
                      }`}
                    >
                      Season {season.season_number}
                    </button>
                  ))}
                </div>
              )}

              {/* Episodes Horizontal Scroll */}
              <div className="overflow-x-auto scrollbar-hide">
                <div className="flex space-x-3 pb-4 pt-1" style={{ width: 'max-content' }}>
                  {seasonData.episodes.map((episode) => (
                    <div
                      key={episode.id}
                      className={`group cursor-pointer bg-[#111118] rounded-xl overflow-hidden transition-all duration-300 flex-shrink-0 w-64 border ${
                        selectedEpisode === episode.episode_number
                          ? 'ring-2 ring-red-500 border-red-500/50'
                          : 'border-white/5 hover:border-white/20 hover:bg-[#16161f]'
                      }`}
                      onClick={() => setSelectedEpisode(episode.episode_number)}
                    >
                      {/* Episode Thumbnail */}
                      <div className="relative aspect-video bg-gray-800">
                        {episode.still_path ? (
                          <img
                            src={`${TMDB_IMAGE_BASE_URL}${episode.still_path}`}
                            alt={episode.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-gray-500">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                        
                        {/* Episode Number Badge */}
                        <div className="absolute top-2 left-2 bg-black bg-opacity-80 backdrop-blur-sm rounded px-2 py-1 text-xs font-bold text-white">
                          Episode {episode.episode_number}
                        </div>
                      </div>

                      {/* Episode Info */}
                      <div className="p-4">
                        <h4 className="font-bold text-white text-sm mb-2 line-clamp-1">
                          {episode.name || `Episode ${episode.episode_number}`}
                        </h4>
                        
                        {/* Meta info row */}
                        <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
                          <span>
                            {episode.air_date ? new Date(episode.air_date).getFullYear() : '2022'}
                          </span>
                          <span>
                            {episode.runtime || 49} min
                          </span>
                          <div className="flex items-center">
                            <svg className="w-3 h-3 text-yellow-400 fill-current mr-1" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                            </svg>
                            <span>{episode.vote_average ? episode.vote_average.toFixed(1) : '8.5'}</span>
                          </div>
                        </div>
                        
                        {/* Description */}
                        <p className="text-gray-400 text-xs line-clamp-3 leading-relaxed">
                          {episode.overview || 'When a deliciously wicked prank gets Wednesday expelled, her parents ship her off to Nevermore Academy, the boarding school where they fell in love...'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Details Card */}
        <div className="bg-[#111118] rounded-2xl border border-white/5 overflow-hidden">
          <div className="flex flex-col sm:flex-row gap-0">
            {/* Poster */}
            {content.poster_path && (
              <div className="sm:w-48 shrink-0">
                <div className="relative aspect-[2/3] sm:h-full w-full sm:w-48">
                  <Image
                    src={`${TMDB_IMAGE_BASE_URL}${content.poster_path}`}
                    alt={contentTitle}
                    fill
                    className="object-cover"
                    sizes="192px"
                  />
                </div>
              </div>
            )}
            {/* Info */}
            <div className="flex-1 p-6 space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-white leading-tight">{contentTitle}</h2>
                {contentType === 'tv' && (content as TVShow).number_of_seasons && (
                  <p className="text-sm text-gray-400 mt-1">
                    {(content as TVShow).number_of_seasons} Season{(content as TVShow).number_of_seasons > 1 ? 's' : ''} · {(content as TVShow).number_of_episodes} Episodes
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                {releaseYear && <span className="text-gray-300">{releaseYear}</span>}
                {contentType === 'movie' && (content as Movie).runtime && (
                  <span className="text-gray-300">{formatRuntime((content as Movie).runtime)}</span>
                )}
                {content.vote_average > 0 && (
                  <span className="flex items-center gap-1 text-yellow-400 font-semibold">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                    </svg>
                    {content.vote_average.toFixed(1)} / 10
                  </span>
                )}
              </div>
              {content.genres && content.genres.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {content.genres.map((genre) => (
                    <span key={genre.id} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-gray-300">
                      {genre.name}
                    </span>
                  ))}
                </div>
              )}
              {content.overview && (
                <p className="text-gray-400 text-sm leading-relaxed">{content.overview}</p>
              )}
              <Link
                href={`/details?id=${contentId}&type=${contentType}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 rounded-lg text-sm text-gray-300 hover:text-white transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                View Full Details
              </Link>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div>
            <h3 className="text-xl font-bold mb-4 text-white">More Like This</h3>
            <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4">
              {recommendations.slice(0, 12).map((rec) => (
                <Link
                  key={rec.id}
                  href={`/details?id=${rec.id}&type=${rec.media_type || contentType}`}
                  className="flex-shrink-0 w-36 group"
                >
                  <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-gray-800">
                    <Image
                      src={`https://image.tmdb.org/t/p/w300${rec.poster_path}`}
                      alt={rec.title || rec.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="mt-2 text-xs text-gray-400 group-hover:text-white transition-colors line-clamp-2">{rec.title || rec.name}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
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

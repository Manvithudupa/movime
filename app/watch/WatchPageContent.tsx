'use client';

import React, { useState, useEffect, Suspense, useRef, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { useSearchParams, useRouter } from 'next/navigation';
import { getViewPath } from '@/lib/routes';
import Image from '@/components/ProxyImage';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  fetchContentDetails, 
  fetchSeasonDetails, 
  getVideoUrl,
  TMDB_IMAGE_BASE_URL
} from '@/lib/utils';
import { fetchSettings } from '@/lib/settings';
import { availableSources } from '@/lib/sources';
import type { Movie, TVShow, Season } from '@/lib/types';
import Navbar from '@/components/Navbar';
import ShareButton from '@/components/ShareButton';
import { useAuth } from '@/components/AuthProvider';
import { useWatchlistStore, useContinueWatchingStore } from '@/lib/store';
import Footer from '@/components/Footer';
import { SkeletonWatch } from '@/components/SkeletonWatch';
import { SkeletonPageLayout } from '@/components/SkeletonPageLayout';

// SECURITY: every third-party embed is sandboxed. The sandbox allows what a
// video player needs (scripts, its own storage/cookies, forms, popups,
// fullscreen) but deliberately omits allow-top-navigation and
// allow-popups-to-escape-sandbox — so a compromised or malicious source cannot
// redirect users off-site to phishing/malware. Sources used to be rendered
// with NO sandbox at all when requiresNoSandbox was set; that hole is closed.
// (allow-scripts + allow-same-origin is safe here because every embed is
// cross-origin — a same-origin frame could strip its own sandbox, these cannot.)
const EMBED_SANDBOX = 'allow-scripts allow-same-origin allow-forms allow-presentation allow-popups'

function WatchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const [content, setContent] = useState<Movie | TVShow | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentSource, setCurrentSource] = useState(availableSources[0]);
  const [autoPlay, setAutoPlay] = useState(true);
  const [defaultQuality, setDefaultQuality] = useState('auto');

  // Apply the user's Settings once mounted — server copy (synced across
  // devices) when signed in, else localStorage. Reading localStorage during the
  // useState initializer would mismatch the server render (SSR has no
  // localStorage) and trigger a React hydration error.
  useEffect(() => {
    let cancelled = false;
    fetchSettings(!!isSignedIn).then((settings) => {
      if (cancelled) return;
      const match = availableSources.find((s) => s.id === settings.preferredSource);
      if (match) setCurrentSource(match);
      setAutoPlay(settings.autoPlay);
      setDefaultQuality(settings.defaultQuality);
    });
    return () => { cancelled = true; };
  }, [isSignedIn]);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [selectedEpisode, setSelectedEpisode] = useState<number>(1);
  const [seasonData, setSeasonData] = useState<Season | null>(null);
  const [securityLevel] = useState<'secure' | 'balanced' | 'permissive'>('balanced');
  const [showSearch, setShowSearch] = useState(false);
  const watchLaterCount = useWatchlistStore((s) => s.count);
  const fetchWatchlist = useWatchlistStore((s) => s.fetch);
  const upsertContinueWatching = useContinueWatchingStore((s) => s.upsert);
  const fetchContinueWatching = useContinueWatchingStore((s) => s.fetch);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentId, contentType]);

  useEffect(() => {
    if (content && contentType === 'tv' && selectedSeason) loadSeasonData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, selectedSeason]);

  useEffect(() => {
    fetchWatchlist(!!isSignedIn);
    fetchContinueWatching(!!isSignedIn);
  }, [isSignedIn, fetchWatchlist, fetchContinueWatching]);

  const loadContent = async () => {
    if (!contentId || !contentType) return;
    setLoading(true);
    try {
      const data = await fetchContentDetails(contentId, contentType);
      setContent(data);

      // Recommendations come from the cached details payload (append_to_response=similar)
      // instead of a separate uncached TMDB /recommendations request.
      setRecommendations(data?.similar?.results || []);

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
      contentType === 'tv' ? selectedEpisode : undefined,
      defaultQuality
    );
  };

  // Called when the current movie/episode crosses the completion threshold.
  // With the autoPlay setting enabled, TV shows advance to the next episode
  // (or the next season when the current one ends).
  const handleEpisodeCompleted = useCallback(() => {
    if (!autoPlay || contentType !== 'tv') return;

    const episodes = seasonData?.episodes || [];
    const sorted = [...episodes].sort((a, b) => a.episode_number - b.episode_number);
    const currentIndex = sorted.findIndex((e: any) => e.episode_number === selectedEpisode);
    const nextEpisode = currentIndex >= 0 ? sorted[currentIndex + 1] : undefined;

    if (nextEpisode) {
      toast(`▶ Auto-playing next episode: ${nextEpisode.name || `Episode ${nextEpisode.episode_number}`}`, {
        duration: 3000,
      });
      setSelectedEpisode(nextEpisode.episode_number);
      return;
    }

    // Last episode of the season — jump to the first available later season.
    const seasons = (content as any)?.seasons?.filter((s: any) => s.season_number > 0) || [];
    const nextSeason = seasons
      .filter((s: any) => s.season_number > selectedSeason)
      .sort((a: any, b: any) => a.season_number - b.season_number)[0];

    if (nextSeason) {
      toast(`▶ Auto-playing Season ${nextSeason.season_number}`, { duration: 3000 });
      setSelectedSeason(nextSeason.season_number);
      setSelectedEpisode(1);
    }
  }, [autoPlay, contentType, seasonData, selectedEpisode, selectedSeason, content]);

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

  if (loading) {
    return (
      <SkeletonPageLayout
        currentView="watch"
        showSearch={showSearch}
        searchQuery={searchQuery}
        watchLaterCount={watchLaterCount}
        onViewChange={(view) => router.push(getViewPath(view))}
        onSearchToggle={() => setShowSearch(!showSearch)}
        onSearchChange={(q) => setSearchQuery(q)}
      >
        <SkeletonWatch isTV={contentType === 'tv'} />
      </SkeletonPageLayout>
    );
  }

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
        onViewChange={(view) => router.push(getViewPath(view))}
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
            <span className="text-gray-400 text-sm shrink-0">
              S{selectedSeason} · E{selectedEpisode}
            </span>
          )}
          <div className="ml-auto flex items-center">
            <ShareButton
              title={`${contentTitle} - Movime`}
              text={`Check out ${contentTitle} on Movime`}
            />
          </div>
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
                  sandbox={EMBED_SANDBOX}
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
          {/* Save progress on first load, on a timer while watching, and when episode changes */}
      <SaveProgress 
        contentId={contentId!}
        contentType={contentType}
        content={content}
        contentTitle={contentTitle}
        seasonData={seasonData}
        selectedSeason={selectedSeason}
        selectedEpisode={selectedEpisode}
        isSignedIn={isSignedIn}
        upsertContinueWatching={upsertContinueWatching}
        onEpisodeCompleted={handleEpisodeCompleted}
      />

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
        {contentType === 'tv' && (
          <div>
            {/* Season tabs are kept outside the episodes block so users can always
                switch seasons, even when the currently selected season has no episodes. */}
            {(() => {
              const seasonCount =
                (content as any).seasons?.filter((s: any) => s.season_number > 0).length ||
                (content as any).number_of_seasons ||
                1;
              if (seasonCount <= 1) return null;
              return (
                <div className="flex flex-wrap gap-2 mb-4">
                  {Array.from({ length: seasonCount }, (_, i) => i + 1).map(seasonNum => (
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
              );
            })()}

            {seasonData?.episodes && seasonData.episodes.length > 0 && (
              <>
                <h2 className="text-lg font-semibold mb-3">Episodes - Season {selectedSeason}</h2>
            <div className="episodes-slider group relative">
              <div className="overflow-x-auto scrollbar-hide">
                <div className="flex gap-4 pb-4" style={{ width: 'max-content' }}>
                  {seasonData.episodes.map((ep: any) => {
                    const isActive = selectedEpisode === ep.episode_number;
                    return (
                      <div
                        key={ep.episode_number}
                        onClick={() => setSelectedEpisode(ep.episode_number)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedEpisode(ep.episode_number);
                          }
                        }}
                        className={`group/card flex-shrink-0 w-56 sm:w-64 rounded-xl overflow-hidden text-left cursor-pointer border transition-all duration-300 focus-visible:outline-none focus-visible:border-white focus-visible:ring-2 focus-visible:ring-white/40 ${
                          isActive
                            ? 'border-white bg-white/10'
                            : 'border-white/10 bg-white/[0.03] hover:border-white/30 hover:bg-white/[0.06]'
                        }`}
                      >
                        <div className="relative aspect-video bg-black">
                          {ep.still_path ? (
                            <Image
                              src={`${TMDB_IMAGE_BASE_URL}${ep.still_path}`}
                              alt={ep.name || `Episode ${ep.episode_number}`}
                              fill
                              className="object-cover group-hover/card:scale-105 transition-transform duration-300"
                              sizes="256px"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full text-gray-500">
                              <svg className="w-8 sm:w-10 h-8 sm:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}

                          {isActive && (
                            <div className="absolute top-2 left-2 z-10 bg-white text-black text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                              Now Playing
                            </div>
                          )}
                          <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-sm rounded-lg px-2 py-1 text-xs font-semibold">
                            E{ep.episode_number}
                          </div>

                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                            <div className="bg-white rounded-full p-2.5 transform scale-75 group-hover/card:scale-100 transition-transform duration-300">
                              <svg className="w-6 h-6 text-black ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M8 5v10l7-5z" />
                              </svg>
                            </div>
                          </div>
                        </div>

                        <div className="p-3">
                          <h3 className="font-semibold text-sm line-clamp-1">
                            {ep.name || `Episode ${ep.episode_number}`}
                          </h3>
                          <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                            {ep.air_date && (
                              <span>{new Date(ep.air_date).getFullYear()}</span>
                            )}
                            {ep.runtime && (
                              <span>{ep.runtime} min</span>
                            )}
                            {ep.vote_average > 0 && (
                              <span>★ {ep.vote_average.toFixed(1)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="absolute top-1/2 -left-4 transform -translate-y-1/2 scroll-button">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    const container = e.currentTarget.parentElement?.parentElement?.querySelector('.overflow-x-auto');
                    container?.scrollBy({ left: -400, behavior: 'smooth' });
                  }}
                  aria-label="Previous episodes"
                  className="bg-black/80 hover:bg-black text-white rounded-full p-3 shadow-xl backdrop-blur-sm border border-white/20 hover:scale-110 transition-all duration-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              </div>

              <div className="absolute top-1/2 -right-4 transform -translate-y-1/2 scroll-button">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    const container = e.currentTarget.parentElement?.parentElement?.querySelector('.overflow-x-auto');
                    container?.scrollBy({ left: 400, behavior: 'smooth' });
                  }}
                  aria-label="Next episodes"
                  className="bg-black/80 hover:bg-black text-white rounded-full p-3 shadow-xl backdrop-blur-sm border border-white/20 hover:scale-110 transition-all duration-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
              </>
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

// Component to save watch progress for the continue watching feature.
//
// Playback happens inside a cross-origin iframe, so the actual video position
// can't be read directly. Instead we track how long the user actively keeps the
// watch page open (tab visible AND focused) and compare that against the
// content's runtime (from TMDB) to derive a progress percentage.
function SaveProgress({ 
  contentId, 
  contentType, 
  content, 
  contentTitle, 
  seasonData, 
  selectedSeason, 
  selectedEpisode, 
  isSignedIn, 
  upsertContinueWatching,
  onEpisodeCompleted
}: { 
  contentId: string; 
  contentType: string; 
  content: Record<string, any>; 
  contentTitle: string; 
  seasonData: Season | null; 
  selectedSeason: number; 
  selectedEpisode: number; 
  isSignedIn: boolean; 
  upsertContinueWatching: (item: Record<string, any>, isSignedIn: boolean) => Promise<void>; 
  onEpisodeCompleted: () => void; 
}) {
  // Fallback runtimes when TMDB doesn't provide one (minutes).
  const DEFAULT_MOVIE_MINUTES = 120;
  const DEFAULT_EPISODE_MINUTES = 45;
  // Watching 90% of the runtime counts as "completed" (credits roll etc).
  const COMPLETION_THRESHOLD = 0.9;
  const SAVE_INTERVAL_MS = 15 * 1000;

  const watchedSecondsRef = useRef(0);
  const lastTickRef = useRef(Date.now());
  const completedRef = useRef(false);
  const isUnmountingRef = useRef(false);

  // Latest props, read through a ref so the interval/cleanup closures stay
  // stable while still seeing fresh values without restarting timers.
  const latest = useRef({
    contentId, contentType, content, contentTitle, seasonData,
    selectedSeason, selectedEpisode, isSignedIn, upsertContinueWatching, onEpisodeCompleted,
  });
  latest.current = {
    contentId, contentType, content, contentTitle, seasonData,
    selectedSeason, selectedEpisode, isSignedIn, upsertContinueWatching, onEpisodeCompleted,
  };

  // Runtime (seconds) of the current movie/episode, derived from TMDB data with
  // a sensible fallback so the progress bar is always meaningful.
  const durationSeconds = useMemo(() => {
    if (!content) return 0;
    let minutes = 0;
    if (contentType === 'tv') {
      const episode = seasonData?.episodes?.find((e: any) => e.episode_number === selectedEpisode);
      minutes = episode?.runtime || (content as any).episode_run_time?.[0] || DEFAULT_EPISODE_MINUTES;
    } else {
      minutes = (content as any).runtime || DEFAULT_MOVIE_MINUTES;
    }
    return Math.max(minutes, 1) * 60;
  }, [content, contentType, seasonData, selectedEpisode]);

  // Reset per-episode tracking whenever the target changes.
  useEffect(() => {
    watchedSecondsRef.current = 0;
    lastTickRef.current = Date.now();
    completedRef.current = false;
  }, [contentId, contentType, selectedSeason, selectedEpisode]);

  const saveProgress = useCallback(() => {
    const {
      contentId: cId, contentType: cType, content: c, contentTitle: cTitle, seasonData: sData,
      selectedSeason: sSeason, selectedEpisode: sEpisode, isSignedIn: signedIn,
      upsertContinueWatching: upsert, onEpisodeCompleted: onCompleted,
    } = latest.current;

    if (!cId || !c) return;

    const elapsed = Math.min(Math.floor(watchedSecondsRef.current), Math.floor(durationSeconds));
    const percentage = durationSeconds > 0
      ? Math.min(Math.round((elapsed / durationSeconds) * 100), 100)
      : 0;
    const completed = completedRef.current || elapsed >= durationSeconds * COMPLETION_THRESHOLD;

    if (completed && !completedRef.current) {
      completedRef.current = true;
      // Don't trigger auto-advance while the page is tearing down (the parent
      // may already be unmounting too).
      if (!isUnmountingRef.current) onCompleted();
    }

    const episode = cType === 'tv'
      ? sData?.episodes?.find((e: any) => e.episode_number === sEpisode)
      : undefined;

    upsert({
      content_id: parseInt(cId, 10),
      content_type: cType,
      title: cTitle,
      poster_path: c.poster_path || null,
      backdrop_path: c.backdrop_path || null,
      season_number: cType === 'tv' ? sSeason : null,
      episode_number: cType === 'tv' ? sEpisode : null,
      episode_title: cType === 'tv' ? (episode?.name || null) : null,
      progress_seconds: elapsed,
      duration_seconds: durationSeconds,
      progress_percentage: completed ? 100 : percentage,
      is_completed: completed,
    }, signedIn);
  }, [durationSeconds]);

  // Interval tick: accumulate active watch time and persist progress, plus a
  // final save when the tab is hidden and when the page unmounts.
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      // Only count time while the page is visible and focused — backgrounded
      // tabs (e.g. music playing) shouldn't inflate progress.
      if (document.visibilityState === 'visible' && document.hasFocus()) {
        watchedSecondsRef.current += (now - lastTickRef.current) / 1000;
      }
      lastTickRef.current = now;
      saveProgress();
    };

    const interval = setInterval(tick, SAVE_INTERVAL_MS);

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        // Persist up to the moment the tab was hidden.
        const now = Date.now();
        watchedSecondsRef.current += (now - lastTickRef.current) / 1000;
        lastTickRef.current = now;
        saveProgress();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Save once immediately so the item appears in Continue Watching on load.
    const initialSave = setTimeout(() => saveProgress(), 0);

    return () => {
      isUnmountingRef.current = true;
      clearInterval(interval);
      clearTimeout(initialSave);
      document.removeEventListener('visibilitychange', handleVisibility);
      // Final save so progress up to navigation is persisted.
      const now = Date.now();
      if (document.visibilityState === 'visible') {
        watchedSecondsRef.current += (now - lastTickRef.current) / 1000;
      }
      saveProgress();
    };
  }, [saveProgress]);

  return null;
}

export default function WatchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <WatchPageContent />
    </Suspense>
  );
}

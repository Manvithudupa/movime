import { availableSources } from './sources';

// TMDB API configuration.
// SECURITY: all TMDB requests go through the server-side proxy at /api/tmdb
// so the API key never ships in the client bundle. The proxy injects the key
// server-side (TMDB_API_KEY, falling back to NEXT_PUBLIC_TMDB_API_KEY) and
// caches responses for 10 minutes.
export const TMDB_PROXY_BASE = '/api/tmdb';
export const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

const API_CACHE_TTL_MS = 10 * 60 * 1000;        // 10 min default
const API_CACHE_STORAGE_KEY = 'movime_api_cache_v2';
const apiMemoryCache = new Map<string, { expiresAt: number; value: any }>();

// In-flight request deduplication: prevents duplicate requests for the same key
const inflightRequests = new Map<string, Promise<any>>();

let storageCleanupDone = false;
function cleanupOldCacheFormat() {
  if (typeof window === 'undefined' || storageCleanupDone) return;
  storageCleanupDone = true;
  try {
    // Remove old cache format keys
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith('movime_api_cache_v1')) {
        window.localStorage.removeItem(key);
      }
    }
  } catch {}
}

const serializeCacheKey = (parts: unknown[]) =>
  parts.map(part => (typeof part === 'string' ? part : JSON.stringify(part))).join('::');

const getCachedApiValue = <T>(key: string): T | undefined => {
  const memoryEntry = apiMemoryCache.get(key);
  if (memoryEntry && memoryEntry.expiresAt > Date.now()) {
    return memoryEntry.value as T;
  }

  if (memoryEntry) {
    apiMemoryCache.delete(key);
  }

  if (typeof window === 'undefined') {
    return undefined;
  }

  try {
    const storedValue = window.localStorage.getItem(`${API_CACHE_STORAGE_KEY}:${key}`);
    if (!storedValue) {
      return undefined;
    }

    const parsed = JSON.parse(storedValue) as { expiresAt: number; value: T };
    if (!parsed || parsed.expiresAt <= Date.now()) {
      window.localStorage.removeItem(`${API_CACHE_STORAGE_KEY}:${key}`);
      return undefined;
    }

    apiMemoryCache.set(key, { expiresAt: parsed.expiresAt, value: parsed.value });
    return parsed.value as T;
  } catch {
    return undefined;
  }
};

const setCachedApiValue = (key: string, value: unknown, ttlMs = API_CACHE_TTL_MS) => {
  const expiresAt = Date.now() + ttlMs;
  apiMemoryCache.set(key, { expiresAt, value });

  if (typeof window !== 'undefined') {
    try {
      cleanupOldCacheFormat();
      window.localStorage.setItem(
        `${API_CACHE_STORAGE_KEY}:${key}`,
        JSON.stringify({ expiresAt, value })
      );
    } catch {
      // Ignore storage quota or browser issues.
    }
  }
};

/**
 * Cached API request with:
 * - In-memory cache (fastest)
 * - localStorage persistence (survives page refreshes)
 * - Request deduplication (prevents duplicate in-flight requests)
 * - Configurable TTL
 */
const cachedApiRequest = async <T>(key: string, request: () => Promise<T>, ttlMs = API_CACHE_TTL_MS): Promise<T> => {
  cleanupOldCacheFormat();

  // 1. Check cache
  const cachedValue = getCachedApiValue<T>(key);
  if (cachedValue !== undefined) {
    return cachedValue;
  }

  // 2. Deduplicate in-flight requests
  if (inflightRequests.has(key)) {
    return inflightRequests.get(key) as Promise<T>;
  }

  // 3. Fetch with dedup tracking
  const promise = request().then(data => {
    setCachedApiValue(key, data, ttlMs);
    inflightRequests.delete(key);
    return data;
  }).catch(err => {
    inflightRequests.delete(key);
    throw err;
  });

  inflightRequests.set(key, promise);
  return promise;
};

// AniList API configuration
const ANILIST_API_URL = 'https://graphql.anilist.co';

// AniList GraphQL queries
const ANILIST_SEARCH_QUERY = `
  query ($search: String) {
    Media(search: $search, type: ANIME) {
      id
      title {
        romaji
        english
        native
      }
      episodes
      format
      status
      seasonYear
      studios {
        nodes {
          name
        }
      }
    }
  }
`;

export const isAnimeContent = (item: Record<string, any>): boolean => {
  if (!item) return false;
  
  const genres = item.genres || [];
  const keywords = item.keywords?.results || [];
  const originCountry = item.origin_country || [];
  
  const hasAnimeGenre = genres.some((genre: any) => 
    genre.name?.toLowerCase().includes('animation')
  );
  
  const hasAnimeKeyword = keywords.some((keyword: any) => 
    keyword.name?.toLowerCase().includes('anime') ||
    keyword.name?.toLowerCase().includes('manga')
  );
  
  const isJapanese = originCountry.includes('JP');
  
  return hasAnimeGenre && (hasAnimeKeyword || isJapanese);
};

const searchAniListAnime = async (title: string) => {
  const cacheKey = serializeCacheKey(['aniListSearch', title]);

  return cachedApiRequest(cacheKey, async () => {
    try {
      const response = await fetch(ANILIST_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: ANILIST_SEARCH_QUERY,
          variables: { search: title }
        })
      });
      
      const data = await response.json();
      return data.data?.Media || null;
    } catch (error) {
      console.warn('AniList search failed:', error);
      return null;
    }
  }, 15 * 60 * 1000);
};


export const fetchMovies = async (page = 1) => {
  const cacheKey = serializeCacheKey(['fetchMovies', page]);

  return cachedApiRequest(cacheKey, async () => {
    try {
      const response = await fetch(
        `${TMDB_PROXY_BASE}/trending/movie/day?page=${page}&language=en-US`
      );
      return await response.json();
    } catch (error) {
      console.error('Error fetching movies:', error);
      return { results: [] };
    }
  });
};

export const fetchTVShows = async (page = 1) => {
  const cacheKey = serializeCacheKey(['fetchTVShows', page]);

  return cachedApiRequest(cacheKey, async () => {
    try {
      const response = await fetch(
        `${TMDB_PROXY_BASE}/tv/popular?page=${page}&language=en-US`
      );
      return await response.json();
    } catch (error) {
      console.error('Error fetching TV shows:', error);
      return { results: [] };
    }
  });
};

export const fetchHollywoodMovies = async (page = 1) => {
  const cacheKey = serializeCacheKey(['fetchHollywoodMovies', page]);

  return cachedApiRequest(cacheKey, async () => {
    try {
      const response = await fetch(
        `${TMDB_PROXY_BASE}/discover/movie?page=${page}&language=en-US&region=US&sort_by=popularity.desc&with_original_language=en`
      );
      return await response.json();
    } catch (error) {
      console.error('Error fetching Hollywood movies:', error);
      return { results: [] };
    }
  });
};

export const fetchBollywoodMovies = async (page = 1) => {
  const cacheKey = serializeCacheKey(['fetchBollywoodMovies', page]);

  return cachedApiRequest(cacheKey, async () => {
    try {
      const response = await fetch(
        `${TMDB_PROXY_BASE}/discover/movie?page=${page}&language=hi-IN&region=IN&sort_by=popularity.desc&with_original_language=hi`
      );
      return await response.json();
    } catch (error) {
      console.error('Error fetching Bollywood movies:', error);
      return { results: [] };
    }
  });
};

export const fetchAnimeContent = async (page = 1) => {
  const cacheKey = serializeCacheKey(['fetchAnimeContent', page]);

  return cachedApiRequest(cacheKey, async () => {
    try {
      const response = await fetch(
        `${TMDB_PROXY_BASE}/discover/tv?page=${page}&language=en-US&with_genres=16&with_origin_country=JP&sort_by=popularity.desc`
      );
      return await response.json();
    } catch (error) {
      console.error('Error fetching anime content:', error);
      return { results: [] };
    }
  });
};

export const fetchByGenre = async (type: 'movie' | 'tv', genreId: number | string, page = 1) => {
  const cacheKey = serializeCacheKey(['fetchByGenre', type, genreId, page]);

  return cachedApiRequest(cacheKey, async () => {
    try {
      const response = await fetch(
        `${TMDB_PROXY_BASE}/discover/${type}?page=${page}&language=en-US&with_genres=${genreId}&sort_by=popularity.desc`
      );
      return await response.json();
    } catch (error) {
      console.error('Error fetching genre content:', error);
      return { results: [] };
    }
  });
};

export const searchContent = async (query: string, type = 'multi') => {
  const cacheKey = serializeCacheKey(['searchContent', query, type]);

  return cachedApiRequest(cacheKey, async () => {
    try {
      const response = await fetch(
        `${TMDB_PROXY_BASE}/search/${type}?query=${encodeURIComponent(query)}&language=en-US`
      );
      return await response.json();
    } catch (error) {
      console.error('Error searching content:', error);
      return { results: [] };
    }
  }, 2 * 60 * 1000);
};

export const fetchNetflixContent = async (page = 1) => {
  const cacheKey = serializeCacheKey(['fetchNetflixContent', page]);

  return cachedApiRequest(cacheKey, async () => {
    try {
      const [moviesResponse, tvResponse] = await Promise.all([
        fetch(`${TMDB_PROXY_BASE}/discover/movie?page=${page}&language=en-US&with_watch_providers=8&watch_region=US&sort_by=popularity.desc`),
        fetch(`${TMDB_PROXY_BASE}/discover/tv?page=${page}&language=en-US&with_watch_providers=8&watch_region=US&sort_by=popularity.desc`)
      ]);
      
      const [moviesData, tvData] = await Promise.all([
        moviesResponse.json(),
        tvResponse.json()
      ]);
      
      let combinedResults = [
        ...(moviesData.results || []),
        ...(tvData.results || [])
      ];
      
      if (combinedResults.length === 0) {
        console.log('No Netflix watch provider results, trying fallback...');
        const fallbackResponse = await fetch(
          `${TMDB_PROXY_BASE}/discover/movie?page=${page}&language=en-US&sort_by=popularity.desc&with_companies=2452`
        );
        const fallbackData = await fallbackResponse.json();
        combinedResults = fallbackData.results || [];
      }
      
      return { results: combinedResults.slice(0, 20) };
    } catch (error) {
      console.error('Error fetching Netflix content:', error);
      return { results: [] };
    }
  });
};

export const fetchAmazonPrimeContent = async (page = 1) => {
  const cacheKey = serializeCacheKey(['fetchAmazonPrimeContent', page]);

  return cachedApiRequest(cacheKey, async () => {
    try {
      let results: any[] = [];
      
      try {
        const response = await fetch(
          `${TMDB_PROXY_BASE}/discover/movie?page=${page}&language=en-US&with_watch_providers=119&watch_region=US&sort_by=popularity.desc`
        );
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          results = data.results;
        }
      } catch {
        console.log('Amazon Prime watch provider failed, trying fallback');
      }
      
      if (results.length === 0) {
        try {
          const response = await fetch(
            `${TMDB_PROXY_BASE}/discover/movie?page=${page}&language=en-US&sort_by=popularity.desc&with_companies=1024`
          );
          const data = await response.json();
          results = data.results || [];
        } catch (error) {
          console.error('Amazon Studios fallback failed:', error);
        }
      }
      
      if (results.length === 0) {
        try {
          const response = await fetch(
            `${TMDB_PROXY_BASE}/discover/movie?page=${page}&language=en-US&sort_by=popularity.desc&with_genres=28,18&vote_average.gte=7.0`
          );
          const data = await response.json();
          results = data.results?.slice(0, 10) || [];
        } catch (error) {
          console.error('Final fallback failed:', error);
          results = [];
        }
      }
      
      return { results: results.slice(0, 20) };
    } catch (error) {
      console.error('Error fetching Amazon Prime content:', error);
      return { results: [] };
    }
  });
};

export const fetchContentDetails = async (id: string, type: 'movie' | 'tv') => {
  const cacheKey = serializeCacheKey(['fetchContentDetails', id, type]);

  return cachedApiRequest(cacheKey, async () => {
    try {
      const extra = type === 'movie' ? 'release_dates' : 'content_ratings';
      const response = await fetch(
        `${TMDB_PROXY_BASE}/${type}/${id}?append_to_response=images,videos,credits,similar,keywords,${extra}&language=en-US&include_image_language=en,null`
      );
      const data = await response.json();

      if (type === 'tv' && isAnimeContent(data)) {
        console.log(`[Anime Mapper] Detected anime: ${data.name}, applying AniList+TMDB mapping`);
        
        try {
          const { getAnimeSeasonBreakdown, mapAniListToTmdb } = await import('./animeMapper');

          const aniListSeasons = await getAnimeSeasonBreakdown(data.name || data.original_name);
          
          if (aniListSeasons.length > 0) {
            let allTmdbEpisodes: any[] = [];
            
            for (let seasonNum = 1; seasonNum <= 3; seasonNum++) {
              try {
                const seasonResponse = await fetch(
                  `${TMDB_PROXY_BASE}/tv/${id}/season/${seasonNum}?language=en-US`
                );
                const seasonData = await seasonResponse.json();
                
                if (seasonData.episodes && seasonData.episodes.length > 0) {
                  allTmdbEpisodes = [...allTmdbEpisodes, ...seasonData.episodes];
                  console.log(`[Anime Mapper] Found ${seasonData.episodes.length} episodes in TMDB Season ${seasonNum}`);
                } else {
                  break;
                }
              } catch {
                break; 
              }
            }
            
            console.log(`[Anime Mapper] Total TMDB episodes: ${allTmdbEpisodes.length}`);
            
            if (allTmdbEpisodes.length > 0) {
              const mappedData = mapAniListToTmdb(aniListSeasons, allTmdbEpisodes, data);
              
              if (mappedData) {
                console.log(`[Anime Mapper] Successfully mapped anime with ${mappedData.seasons.length} seasons`);
                return mappedData;
              }
            }
          }
          
          console.log(`[Anime Mapper] AniList mapping failed, falling back to original anime patch`);
        } catch (error) {
          console.error('[Anime Mapper] Error during anime mapping:', error);
          console.log('[Anime Mapper] Falling back to original anime patch');
        }
        
        data.seasons = (data.seasons || [])
          .filter((s: any) => s.season_number > 0)
          .map((s: any) => ({
            id: s.id,
            season_number: s.season_number,
            episode_count: s.episode_count,
            air_date: s.air_date,
            name: s.name,
            overview: s.overview,
            poster_path: s.poster_path,
          }));

        data.total_episodes = data.seasons.reduce(
          (sum: number, s: any) => sum + (s.episode_count || 0),
          0
        );
        
        data._source = "TMDB (fallback)";
      }

      return data;
    } catch (error) {
      console.error('Error fetching content details:', error);
      return null;
    }
  });
};

export const fetchVideos = async (id: string, type: 'movie' | 'tv') => {
  const cacheKey = serializeCacheKey(['fetchVideos', id, type]);

  return cachedApiRequest(cacheKey, async () => {
    try {
      const response = await fetch(
        `${TMDB_PROXY_BASE}/${type}/${id}/videos?language=en-US`
      );
      return await response.json();
    } catch (error) {
      console.error('Error fetching videos:', error);
      return { results: [] };
    }
  });
};

export const fetchGenres = async (type: 'movie' | 'tv') => {
  const cacheKey = serializeCacheKey(['fetchGenres', type]);

  return cachedApiRequest(cacheKey, async () => {
    try {
      const response = await fetch(
        `${TMDB_PROXY_BASE}/genre/${type}/list?language=en-US`
      );
      return await response.json();
    } catch (error) {
      console.error('Error fetching genres:', error);
      return { genres: [] };
    }
  });
};

export const fetchSeasonDetails = async (id: string, seasonNumber: number) => {
  const cacheKey = serializeCacheKey(['fetchSeasonDetails', id, seasonNumber]);

  return cachedApiRequest(cacheKey, async () => {
    try {
      if (seasonNumber === 0) return null;
      
      console.log(`[Season Details] Fetching season ${seasonNumber} for content ID: ${id}`);
      
      // Reuse the cached content-details payload (already includes keywords) so we
      // don't issue a second raw TMDB request per season change.
      const showData = await fetchContentDetails(id, 'tv');
      if (!showData) return { episodes: [] };
      
      console.log(`[Season Details] Show data:`, {
        name: showData.name,
        origin_country: showData.origin_country,
        genres: showData.genres?.map((g: any) => g.name),
        isAnime: isAnimeContent(showData)
      });
      
      if (isAnimeContent(showData)) {
        console.log(`[Season Details] Anime detected: ${showData.name}`);

        try {
          const enhancedData = await fetchContentDetails(id, 'tv');
          
          if (enhancedData && enhancedData._source === "AniList+TMDB" && enhancedData.seasons) {
            console.log(`[Season Details] Using AniList+TMDB mapped data`);

            const season = enhancedData.seasons.find((s: any) => s.season_number === seasonNumber);
            
            if (season) {
              console.log(`[Season Details] Found mapped season ${seasonNumber} with ${season.episodes.length} episodes`);
              return season;
            } else {
              console.log(`[Season Details] Season ${seasonNumber} not found in mapped data`);
              return { episodes: [] };
            }
          }
          
          console.log(`[Season Details] Enhanced data not available, falling back to legacy anime logic`);
        } catch (error) {
          console.error('[Season Details] Error getting enhanced data:', error);
        }

        const aniListData = await searchAniListAnime(showData.name || showData.original_name);

        try {
          let allEpisodes: any[] = [];
          let totalTmdbEpisodes = 0;

          for (let tmdbSeason = 1; tmdbSeason <= 3; tmdbSeason++) {
            try {
              const seasonResponse = await fetch(
                `${TMDB_PROXY_BASE}/tv/${id}/season/${tmdbSeason}?language=en-US`
              );
              const seasonData = await seasonResponse.json();
              
              if (seasonData.episodes && seasonData.episodes.length > 0) {
                allEpisodes = [...allEpisodes, ...seasonData.episodes];
                totalTmdbEpisodes += seasonData.episodes.length;
                console.log(`[Season Details] TMDB Season ${tmdbSeason}: ${seasonData.episodes.length} episodes`);
              } else {
                break;
              }
            } catch {
              break;
            }
          }
          
          console.log(`[Season Details] Total TMDB episodes across all seasons: ${totalTmdbEpisodes}`);
          
          if (allEpisodes.length > 0) {
            let totalEpisodes = totalTmdbEpisodes;
            let episodeSource = 'TMDB';
            
            if (aniListData && aniListData.episodes && aniListData.episodes > totalTmdbEpisodes) {
              totalEpisodes = aniListData.episodes;
              episodeSource = 'AniList';
            }
            
            console.log(`[Season Details] Using ${episodeSource} episode count: ${totalEpisodes}`);
            
            let episodesPerSeason;
            let totalSeasons;
            
            if (totalEpisodes <= 12) {
              episodesPerSeason = totalEpisodes;
              totalSeasons = 1;
            } else if (totalEpisodes <= 26) {
              episodesPerSeason = Math.ceil(totalEpisodes / 2);
              totalSeasons = 2;
            } else if (totalEpisodes <= 50) {
              episodesPerSeason = 24;
              totalSeasons = Math.ceil(totalEpisodes / 24);
            } else {
              episodesPerSeason = 12;
              totalSeasons = Math.ceil(totalEpisodes / 12);
            }
            
            console.log(`[Season Details] Smart episode distribution:`, {
              totalEpisodes,
              totalSeasons,
              episodesPerSeason,
              source: episodeSource
            });
            
            const seasonStartIndex = (seasonNumber - 1) * episodesPerSeason;
            const seasonEndIndex = Math.min(seasonStartIndex + episodesPerSeason, totalEpisodes);
            

            if (seasonStartIndex < totalEpisodes) {
              const seasonEpisodes = allEpisodes.slice(seasonStartIndex, seasonEndIndex);
              
              console.log(`[Season Details] Season ${seasonNumber} episodes:`, {
                startIndex: seasonStartIndex,
                endIndex: seasonEndIndex,
                episodeCount: seasonEpisodes.length
              });
              
              if (seasonEpisodes.length > 0) {
                const episodes = seasonEpisodes.map((episode: any, index: number) => ({
                  ...episode,
                  episode_number: index + 1,
                  season_number: seasonNumber,
                  original_episode_number: episode.episode_number
                }));
                
                console.log(`[Season Details] Generated ${episodes.length} episodes for season ${seasonNumber}`);
                
                return {
                  id: `season-${seasonNumber}`,
                  season_number: seasonNumber,
                  name: `Season ${seasonNumber}`,
                  episodes,
                  _anime_enhanced: true
                };
              }
            } else {
              console.log(`[Season Details] Season ${seasonNumber} does not exist (only ${totalSeasons} seasons)`);
              return { episodes: [] };
            }
          }
        } catch (error) {
          console.error(`[Season Details] Error fetching TMDB seasons:`, error);
        }
      } else {
        console.log(`[Season Details] Not anime content, using regular TMDB fetch`);
      }
      
      console.log(`[Season Details] Falling back to regular TMDB season ${seasonNumber}`);
      const response = await fetch(
        `${TMDB_PROXY_BASE}/tv/${id}/season/${seasonNumber}?language=en-US`
      );
      return await response.json();
    } catch (error) {
      console.error('Error fetching season details:', error);
      return { episodes: [] };
    }
  });
};

// Utility functions
export const formatRuntime = (minutes: number) => {
  if (!minutes || Number.isNaN(minutes) || minutes <= 0) return '';
  // Round the total first so fractional runtimes can't overflow into "0h 60m".
  const total = Math.round(minutes);
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  return `${hours}h ${mins}m`;
};

export const getVideoUrl = (sourceId: string, contentId: string, type: 'movie' | 'tv', season?: number, episode?: number, quality?: string) => {
  const source = availableSources.find((s: any) => s.id === sourceId);
  
  if (!source) return '';
  
  let url = source.urls[type];
  if (!url) return '';
  
  // SECURITY: the id/season/episode values come from the URL query string, so
  // percent-encode them before substituting into the embed URL. Otherwise a
  // crafted link like /watch?id=123%26server=evil injects extra parameters
  // into the third-party provider's URL.
  url = url.replace('{id}', encodeURIComponent(contentId));
  
  if (type === 'tv') {
    const seasonValue = typeof season === 'number' && !Number.isNaN(season) ? season.toString() : '1';
    const episodeValue = typeof episode === 'number' && !Number.isNaN(episode) ? episode.toString() : '1';
    url = url.replace('{season}', encodeURIComponent(seasonValue));
    url = url.replace('{episode}', encodeURIComponent(episodeValue));
  }
  
  // Quality hint from the user's Settings. Only appended to embed URLs that
  // already carry a query string — those providers demonstrably tolerate extra
  // params — while bare-path embeds are left untouched so the setting can never
  // produce a broken embed URL.
  if (quality && quality !== 'auto' && url.includes('?')) {
    const separator = url.includes('?') ? '&' : '?';
    url = `${url}${separator}quality=${encodeURIComponent(quality)}`;
  }
  
  return url;
};

// Local storage helpers
// Overload: when a non-null default is provided, the return type excludes null
export function getLocalStorage<T>(key: string, defaultValue: T): T;
// Overload: when no default or null default is provided, return type includes null
export function getLocalStorage<T = any>(key: string, defaultValue?: T | null): T | null;
export function getLocalStorage<T = any>(key: string, defaultValue: T | null = null): T | null {
  if (typeof window === 'undefined') return defaultValue;
  
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
};

export const setLocalStorage = (key: string, value: unknown): void => {
  if (typeof window === 'undefined') return;
  
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error setting localStorage:', error);
  }
};

// Blocked movie IDs
export const blockedMovieIds = [
  "106862", "15774", "570341", "160242", "363343", "464515", "272668", 
  "216969", "307609", "33081", "132744", "160243", "8079", "170991", 
  "566319", "520517", "441906", "872906", "598859", "421097", "14134", 
  "15419", "107800", "160255", "277432", "15772", "503577", "376371", 
  "304246", "413543", "45002", "801526", "370665", "205022", "21210", 
  "138934", "114436", "581361", "102353", "16345", "96112", "4252", 
  "4435", "205077", "304157", "474084", "14478", "421701", "960876"
];

// Adult filter
export const adultGenreIds: number[] = [];

export const adultContentKeywords = [
  'xxx', 'porn', 'erotic', 'explicit', 'adult', 'sex', 'nude', 'naked', 
  'sensual', 'intimate', 'seductive', 'temptation', 'desire', 'passion',
  'lust', 'sexual', 'sexuality', 'arousal', 'provocative', 'steamy',
  'sensuous', 'sultry', 'kinky', 'fetish', 'escort', 'stripper',
  'brothel', 'prostitute', 'call girl', 'gigolo', 'swinger'
];

export const isAdultContent = (item: Record<string, any>): boolean => {
  if (!item) return false;
  
  const title = (item.title || item.name || '').toLowerCase();
  const overview = (item.overview || '').toLowerCase();
  
  const hasAdultKeywords = adultContentKeywords.some(keyword => 
    title.includes(keyword) || overview.includes(keyword)
  );
  
  const isExplicitRating = item.adult === true;
  
  const genreIds = item.genre_ids || [];
  const hasAdultGenreCombination = genreIds.includes(18) && 
    (genreIds.includes(10749) || genreIds.includes(53));
  
  return hasAdultKeywords || isExplicitRating || (hasAdultGenreCombination && hasAdultKeywords);
};

export const filterAdultContent = <T extends Record<string, any>>(items: T[], allowAdultContent: boolean = false): T[] => {
  if (allowAdultContent) return items;
  return items.filter(item => !isAdultContent(item));
};

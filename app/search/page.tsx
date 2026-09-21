"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getViewPath } from '@/lib/routes';
import Navbar from '@/components/Navbar';
import SearchAutocomplete from '@/components/SearchAutocomplete';
import Image from '@/components/ProxyImage';
import Link from 'next/link';
import { searchContent, fetchByGenre, fetchGenres, TMDB_IMAGE_BASE_URL, filterAdultContent, blockedMovieIds, fetchContentDetails } from '@/lib/utils';
import type { ContentItem, Genre } from '@/lib/types';
import { useWatchlistStore } from '@/lib/store';
import { SkeletonSearch } from '@/components/SkeletonSearch';

const SearchContentCard = ({ item }: { item: Record<string, any> }) => {
  const title = item.title || item.name || '';
  const poster = item.poster_path;
  const type = item.media_type || (item.title ? 'movie' : 'tv');
  return (
    <Link href={`/details?id=${item.id}&type=${type}`} className="group relative rounded-lg overflow-hidden bg-white/[0.03] border border-white/5 hover:border-white/20 transition-all">
      <div className="relative aspect-[2/3] w-full">
        {poster ? (
          <Image src={`${TMDB_IMAGE_BASE_URL}${poster}`} alt={title} fill className="object-cover group-hover:scale-105 transition-all duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">No Image</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="absolute bottom-0 p-3">
          <h3 className="text-sm font-semibold leading-tight line-clamp-2">{title}</h3>
        </div>
      </div>
    </Link>
  );
};

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(() => searchParams.get('q') || '');
  const [results, setResults] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const watchLaterCount = useWatchlistStore((s) => s.count);
  const [sortBy, setSortBy] = useState<'relevance' | 'popularity' | 'rating' | 'year' | 'title'>('relevance');
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Genre browsing — driven by ?genre= and ?type= URL params so old
  // /genre/[id] links (redirected here) and deep links keep working.
  const [genreId, setGenreId] = useState<number | null>(() => {
    const g = searchParams.get('genre');
    return g ? parseInt(g, 10) || null : null;
  });
  const [genreType, setGenreType] = useState<'movie' | 'tv'>(() => (searchParams.get('type') === 'tv' ? 'tv' : 'movie'));
  const [genresMovie, setGenresMovie] = useState<Genre[]>([]);
  const [genresTv, setGenresTv] = useState<Genre[]>([]);
  const [genreItems, setGenreItems] = useState<ContentItem[]>([]);
  const [genrePage, setGenrePage] = useState(1);
  const [genreLoading, setGenreLoading] = useState(false);
  const [genreLoadingMore, setGenreLoadingMore] = useState(false);

  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const runtimeCache = useRef<Record<string, number>>({});
  const lastBasicResults = useRef<string>('');
  // Holds the most recent query so async work can avoid clobbering newer results
  const queryRef = useRef('');

  const performSearch = useCallback(async (q: string) => {
    queryRef.current = q;
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const data = await searchContent(q);
      const qLower = q.toLowerCase();
      // Only an explicit whole-word adult term lifts the metadata filter. The
      // old substring check also matched innocent queries ("adulting",
      // "unisex", "adult swim") and silently switched filtering off for them.
      const allowAdult = /\b(adult|sex|erotic|xxx|porn|explicit|nude)\b/i.test(qLower);
      // Multi-search can return people/companies — only keep watchable titles
      // so cards link to valid /details and /watch pages.
      let filtered = filterAdultContent(
        data.results?.filter((item:any)=>(
          !blockedMovieIds.includes(item.id.toString()) &&
          (item.media_type === 'movie' || item.media_type === 'tv')
        )) || [],
        allowAdult
      ) as ContentItem[];

      const MIN_YEAR = 2004;
      const explicitOlderYearMatch = q.match(/\b(19\d{2}|200[0-3])\b/);
      if (!explicitOlderYearMatch) {
        filtered = filtered.filter((item: any) => {
          const date = item.release_date || item.first_air_date;
          if (!date) return true; 
          const year = parseInt(date.slice(0,4));
          if (!year) return true;
          return year >= MIN_YEAR;
        });
      }

      const wantsReality = /\breality\b/i.test(qLower);
      if (!wantsReality) {
        filtered = filtered.filter((item:any) => {
          if (item.genre_ids?.includes(10764)) return false;
          const t = (item.title || item.name || '').toLowerCase();
          if (t.includes('reality')) return false;
          return true;
        });
      }

      const normalize = (s:string) => s.toLowerCase().replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
      const queryNorm = normalize(qLower);
      const score = (title:string): number => {
        const t = normalize(title);
        if (!t) return 0;
        if (t === queryNorm) return 1.0;
        if (t.startsWith(queryNorm)) return 0.92;
        if (t.split(' ').some(w=>w.startsWith(queryNorm))) return 0.86;
        if (t.includes(queryNorm)) return 0.72;
        let qi=0; for (let i=0;i<t.length && qi<queryNorm.length;i++){ if(t[i]===queryNorm[qi]) qi++; }
        const seqRatio = qi / queryNorm.length;
        if (seqRatio >= 0.8) return 0.6 + (seqRatio-0.8)*0.2;
        return seqRatio >= 0.5 ? 0.4 + (seqRatio-0.5)*0.2 : 0;
      };
      filtered = filtered.map((item:any)=>({ ...item, __rel: score(item.title || item.name || '') }));
      const minScore = queryNorm.length <= 4 ? 0.86 : queryNorm.length <= 6 ? 0.6 : 0.5;
      filtered = filtered.filter((i:any)=> i.__rel >= minScore);
      filtered.sort((a:any,b:any)=> (b.__rel - a.__rel) || ((b.popularity||0)-(a.popularity||0)) );
      filtered = filtered.map((i:any)=>{ delete i.__rel; return i; });
      const base = filtered.slice(0,60); 
      setResults(base.slice(0,40) as ContentItem[]);

      const allowShort = /\b(short|clip|mini|reel)\b/i.test(qLower);
      const MIN_DURATION_MIN = 40;
      if (!allowShort && base.length && lastBasicResults.current !== q) {
        lastBasicResults.current = q;
        (async () => {
          try {
            // Fetch runtimes in parallel with a small concurrency cap to stay
            // gentle on the TMDB API (was sequential — up to ~30s of blocking).
            const toFetch = base.slice(0, 30).filter((item: any) => !(item.id.toString() in runtimeCache.current));
            const CONCURRENCY = 6;
            let index = 0;
            const worker = async () => {
              while (index < toFetch.length) {
                const item = toFetch[index++];
                try {
                  const key = item.id.toString();
                  const type = item.media_type === 'tv' ? 'tv' : 'movie';
                  const details = await fetchContentDetails(key, type as any);
                  const dur = details?.runtime || (Array.isArray(details?.episode_run_time) ? details?.episode_run_time[0] : undefined);
                  if (dur) runtimeCache.current[key] = dur;
                } catch {}
              }
            };
            await Promise.allSettled(Array.from({ length: Math.min(CONCURRENCY, toFetch.length) }, () => worker()));
            const filteredRuntime = base.filter(it => {
              const dur = runtimeCache.current[it.id];
              if (!dur) return true;
              return dur >= MIN_DURATION_MIN;
            }).slice(0,40);
            // Only apply if the user hasn't typed a newer query in the meantime.
            setResults(prev => queryRef.current === q ? filteredRuntime as ContentItem[] : prev);
          } catch {}
        })();
      }
    } catch (e) {
      console.error('Search error', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(()=>{
  const h = setTimeout(()=>performSearch(query), 550); 
    return ()=>clearTimeout(h);
  }, [query, performSearch]);

  // Keep genre state in sync with the URL (chip clicks, toggle, redirects,
  // and browser back/forward all go through the URL).
  useEffect(() => {
    const g = searchParams.get('genre');
    setGenreId(g ? parseInt(g, 10) || null : null);
    setGenreType(searchParams.get('type') === 'tv' ? 'tv' : 'movie');
  }, [searchParams]);

  // Load the genre lists once (used for chips and the browse-by-genre landing).
  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchGenres('movie'), fetchGenres('tv')]).then(([m, t]) => {
      if (cancelled) return;
      setGenresMovie(m.genres || []);
      setGenresTv(t.genres || []);
    });
    return () => { cancelled = true; };
  }, []);

  const filterGenreResults = useCallback((results: any[] = []) => {
    const filtered = genreType === 'movie'
      ? results.filter((item: any) => !blockedMovieIds.includes(item.id.toString()))
      : results;
    return filterAdultContent(filtered, false) as ContentItem[];
  }, [genreType]);

  // Fetch the active genre's content (TMDB discover, popularity-sorted).
  useEffect(() => {
    if (genreId == null) {
      setGenreItems([]);
      setGenrePage(1);
      return;
    }
    setSortBy('popularity');
    let cancelled = false;
    const load = async () => {
      setGenreLoading(true);
      try {
        const data = await fetchByGenre(genreType, genreId, 1);
        if (cancelled) return;
        setGenreItems(filterGenreResults(data.results));
        setGenrePage(1);
      } catch (error) {
        console.error('Error loading genre content:', error);
      } finally {
        if (!cancelled) setGenreLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [genreId, genreType, filterGenreResults]);

  const loadMoreGenres = useCallback(async () => {
    if (genreId == null || genreLoading || genreLoadingMore) return;
    setGenreLoadingMore(true);
    try {
      const nextPage = genrePage + 1;
      const data = await fetchByGenre(genreType, genreId, nextPage);
      setGenreItems((prev) => [...prev, ...filterGenreResults(data.results)]);
      setGenrePage(nextPage);
    } catch (error) {
      console.error('Error loading more genre content:', error);
    } finally {
      setGenreLoadingMore(false);
    }
  }, [genreId, genreType, genrePage, genreLoading, genreLoadingMore, filterGenreResults]);

  // Infinite scroll for genre browsing.
  useEffect(() => {
    if (genreId == null) return;
    const onScroll = () => {
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 800) {
        loadMoreGenres();
      }
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, [genreId, loadMoreGenres]);

  const selectGenre = (id: number, type: 'movie' | 'tv') => {
    setQuery('');
    router.push(`/search?genre=${id}&type=${type}`);
  };

  // Typing a query leaves genre mode (search results take over).
  const onQueryChange = (v: string) => {
    setQuery(v);
    if (v && genreId != null) {
      router.replace('/search', { scroll: false });
    }
  };

  const genreList = useMemo(() => (genreType === 'tv' ? genresTv : genresMovie), [genreType, genresTv, genresMovie]);
  const genreName = useMemo(() => genreList.find((g) => g.id === genreId)?.name || '', [genreList, genreId]);

  const sortedResults = useMemo(()=>{
    const list = [...results];
    switch (sortBy) {
      case 'popularity': return list.sort((a:any,b:any)=>(b.popularity||0)-(a.popularity||0));
      case 'rating': return list.sort((a:any,b:any)=>(b.vote_average||0)-(a.vote_average||0));
      case 'year': return list.sort((a:any,b:any)=>{
        const ay = parseInt((a.release_date||a.first_air_date||'').slice(0,4))||0;
        const by = parseInt((b.release_date||b.first_air_date||'').slice(0,4))||0;
        return by - ay;
      });
      case 'title': return list.sort((a:any,b:any)=> (a.title||a.name||'').localeCompare(b.title||b.name||''));
      default: return list; 
    }
  }, [results, sortBy]);

  const genreSorted = useMemo(() => {
    const list = [...genreItems];
    switch (sortBy) {
      case 'popularity': return list.sort((a:any,b:any)=>(b.popularity||0)-(a.popularity||0));
      case 'rating': return list.sort((a:any,b:any)=>(b.vote_average||0)-(a.vote_average||0));
      case 'year': return list.sort((a:any,b:any)=>{
        const ay = parseInt((a.release_date||a.first_air_date||'').slice(0,4))||0;
        const by = parseInt((b.release_date||b.first_air_date||'').slice(0,4))||0;
        return by - ay;
      });
      case 'title': return list.sort((a:any,b:any)=> (a.title||a.name||'').localeCompare(b.title||b.name||''));
      default: return list;
    }
  }, [genreItems, sortBy]);

  const showingGenre = genreId != null;

  return (
  <div className="min-h-screen bg-black text-white">
      <Navbar
        currentView="search"
        showSearch={true}
        searchQuery={query}
        watchLaterCount={watchLaterCount}
        onViewChange={(view) => router.push(getViewPath(view))}
        onSearchToggle={() => {}}
        onSearchChange={onQueryChange}
      />

      <main className="pt-28 pb-20 px-4 max-w-6xl mx-auto w-full">
        <div className="flex flex-col items-center text-center mb-6">
          {query.length === 0 && !showingGenre ? (
            <>
              <h1 className="text-2xl sm:text-4xl font-bold mb-4 text-white">Find something to watch</h1>
              <p className="text-sm text-gray-400 mb-6">Search movies, TV shows, anime and more — or browse by genre below.</p>
            </>
          ) : (
            <h1 className="sr-only">Search</h1>
          )}
          <div className="w-full max-w-2xl relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              value={query}
              onChange={(e)=>onQueryChange(e.target.value)}
              onFocus={()=>setIsFocused(true)}
              placeholder="Have something in mind? (try: any genre / name)"
              className="w-full pl-12 pr-4 py-4 rounded-full movime-search-input outline-none text-sm text-white placeholder-white/40 transition-all"
              autoFocus
            />
            {/* Autocomplete dropdown */}
            <SearchAutocomplete
              query={query}
              onSelect={(suggestion) => {
                setQuery(suggestion);
                if (genreId != null) router.replace('/search', { scroll: false });
                setIsFocused(false);
                inputRef.current?.blur();
                performSearch(suggestion);
              }}
              isFocused={isFocused}
              onFocusChange={setIsFocused}
              inputRef={inputRef}
            />
          </div>

          {/* Browse-by-genre landing — replaces the old /genres page */}
          {query.length === 0 && !showingGenre && (
            <div className="w-full max-w-4xl mx-auto mt-10 text-left">
              <h2 className="text-xl sm:text-2xl font-bold mb-1">Browse by Genre</h2>
              <p className="text-gray-400 text-sm mb-8">Discover movies and TV shows by genre.</p>
              <GenreSection title="Movies" genres={genresMovie} type="movie" onSelect={selectGenre} />
              <GenreSection title="TV Shows" genres={genresTv} type="tv" onSelect={selectGenre} />
            </div>
          )}

          {/* Genre browse toolbar: Movies/TV toggle + genre chips */}
          {showingGenre && (
            <div className="w-full max-w-4xl mx-auto mt-8 text-left">
              <div className="flex items-center gap-2 mb-5">
                {(['movie', 'tv'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => router.push(`/search?genre=${genreId}&type=${t}`)}
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
              <div className="flex flex-wrap gap-2">
                {genreList.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => selectGenre(g.id, genreType)}
                    aria-pressed={g.id === genreId}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      g.id === genreId
                        ? 'bg-white text-black border-white'
                        : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {(query.length > 0 || showingGenre) && (
          <div className="mb-10">
            <div className="flex items-center justify-center gap-4 sm:gap-6 mb-6 sm:mb-8">
              <span className="h-px w-16 sm:w-32 bg-gradient-to-r from-white/20 to-transparent" />
              <h2 className="text-xl sm:text-3xl font-semibold tracking-wide text-white">
                {showingGenre ? `${genreName || 'Genre'} ${genreType === 'tv' ? 'TV Shows' : 'Movies'}` : 'Search results'}
              </h2>
              <span className="h-px w-16 sm:w-32 bg-gradient-to-l from-white/20 to-transparent" />
            </div>
            <div className="flex justify-center">
              <div className="relative" onMouseLeave={()=>setShowSortMenu(false)}>
                <button
                  onClick={()=>setShowSortMenu(s=>!s)}
                  className="px-5 py-2 bg-white/10 hover:bg-white/15 border border-white/15 rounded-sm text-xs tracking-wide uppercase flex items-center gap-2 transition-colors backdrop-blur-sm">
                  {sortBy === 'relevance' && 'search by relevance'}
                  {sortBy === 'popularity' && 'sort: popularity'}
                  {sortBy === 'rating' && 'sort: rating'}
                  {sortBy === 'year' && 'sort: year'}
                  {sortBy === 'title' && 'sort: title'}
                  <svg className={`w-3 h-3 transition-transform ${showSortMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showSortMenu && (
                  <div className="absolute left-0 mt-2 w-40 bg-black/90 border border-white/10 rounded-sm shadow-xl backdrop-blur-xl z-10 py-1 text-xs">
                    {(['relevance','popularity','rating','year','title'] as const).map(opt => (
                      <button
                        key={opt}
                        onClick={()=>{ setSortBy(opt); setShowSortMenu(false); }}
                        className={`w-full text-left px-3 py-2 hover:bg-white/10 capitalize ${sortBy===opt ? 'text-white' : 'text-gray-300'}`}
                      >
                        {opt === 'relevance' ? 'Search by relevance' : `Sort: ${opt}`}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {(loading || genreLoading) && (
          <SkeletonSearch />
        )}

        {!loading && !genreLoading && query.length > 0 && results.length === 0 && (
          <p className="text-center text-gray-500">No results for &quot;{query}&quot;</p>
        )}

        {!loading && !genreLoading && showingGenre && genreItems.length === 0 && (
          <p className="text-center text-gray-500">No titles found in this genre.</p>
        )}

        {((!loading && results.length > 0) || (!genreLoading && genreItems.length > 0)) && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-5 md:gap-6">
            {(showingGenre ? genreSorted : sortedResults).map(item => <SearchContentCard key={`${item.id}-${item.media_type || 'x'}`} item={item} />)}
          </div>
        )}

        {showingGenre && genreLoadingMore && (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        )}
      </main>
    </div>
  );
}

function GenreSection({ title, genres, type, onSelect }: { title: string; genres: Genre[]; type: 'movie' | 'tv'; onSelect: (id: number, type: 'movie' | 'tv') => void }) {
  if (genres.length === 0) return null;

  return (
    <section className="mb-8">
      <h3 className="text-base font-semibold mb-3">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {genres.map((g) => (
          <button
            key={g.id}
            onClick={() => onSelect(g.id, type)}
            className="px-4 py-2 rounded-full text-sm font-medium border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
          >
            {g.name}
          </button>
        ))}
      </div>
    </section>
  );
}

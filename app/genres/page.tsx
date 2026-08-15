'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { fetchGenres } from '@/lib/utils';
import type { Genre } from '@/lib/types';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useWatchlistStore } from '@/lib/store';

export default function GenresPage() {
  const router = useRouter();
  const [movieGenres, setMovieGenres] = useState<Genre[]>([]);
  const [tvGenres, setTvGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);
  const watchLaterCount = useWatchlistStore((s) => s.count);
  const fetchWatchlist = useWatchlistStore((s) => s.fetch);

  useEffect(() => {
    let cancelled = false;
    fetchWatchlist(false);
    Promise.all([fetchGenres('movie'), fetchGenres('tv')]).then(([movies, tv]) => {
      if (cancelled) return;
      setMovieGenres(movies.genres || []);
      setTvGenres(tv.genres || []);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [fetchWatchlist]);

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <Navbar
        currentView=""
        showSearch={false}
        searchQuery=""
        watchLaterCount={watchLaterCount}
        onViewChange={() => {}}
        onSearchToggle={() => router.push('/search')}
        onSearchChange={() => {}}
      />

      <main className="pt-24 pb-8">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Browse by Genre</h1>
          <p className="text-gray-400 text-sm mb-8">Discover movies and TV shows by genre.</p>

          {loading ? (
            <div className="text-gray-500">Loading genres…</div>
          ) : (
            <>
              <GenreSection title="🎬 Movies" genres={movieGenres} type="movie" />
              <GenreSection title="📺 TV Shows" genres={tvGenres} type="tv" />
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

function GenreSection({ title, genres, type }: { title: string; genres: Genre[]; type: 'movie' | 'tv' }) {
  if (genres.length === 0) return null;

  return (
    <section className="mb-10">
      <h2 className="text-lg font-semibold mb-4">{title}</h2>
      <div className="flex flex-wrap gap-2">
        {genres.map((g) => (
          <Link
            key={g.id}
            href={`/genre/${g.id}?type=${type}`}
            className="px-4 py-2 rounded-full text-sm font-medium border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
          >
            {g.name}
          </Link>
        ))}
      </div>
    </section>
  );
}

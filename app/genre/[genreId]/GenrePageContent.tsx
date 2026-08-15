'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import BrowseContent from '@/components/BrowseContent';

function GenreBrowseInner({ genreId }: { genreId: number }) {
  const searchParams = useSearchParams();
  const type = searchParams.get('type') === 'tv' ? 'tv' : 'movie';

  return (
    <BrowseContent
      category={type === 'tv' ? 'tv' : 'movies'}
      genreId={genreId}
      genreType={type}
      showGenreChips
      title=""
    />
  );
}

export default function GenrePageContent({ genreId }: { genreId: number }) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-black">
          <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      }
    >
      <GenreBrowseInner genreId={genreId} />
    </Suspense>
  );
}

'use client';

import React, { Suspense } from 'react';
import BrowseContent from '@/components/BrowseContent';

function MoviesPageContent() {
  return (
    <BrowseContent
      category="movies"
      title="Popular Movies"
      subtitle="Trending and most popular movies right now"
      showGenreChips
    />
  );
}

export default function MoviesPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    }>
      <MoviesPageContent />
    </Suspense>
  );
}

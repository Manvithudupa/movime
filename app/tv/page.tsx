'use client';

import React, { Suspense } from 'react';
import BrowseContent from '@/components/BrowseContent';

function TVShowsPageContent() {
  return (
    <BrowseContent
      category="tv"
      title="📺 Popular TV Shows"
      subtitle="Binge-worthy series and shows"
      showGenreChips
    />
  );
}

export default function TVShowsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    }>
      <TVShowsPageContent />
    </Suspense>
  );
}

'use client';

import React, { Suspense } from 'react';
import BrowseContent from '@/components/BrowseContent';

function AnimePageContent() {
  return (
    <BrowseContent
      category="anime"
      title="⚡ Anime Collection"
      subtitle="Top Japanese animation series and movies"
      showAnimeHero
    />
  );
}

export default function AnimePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    }>
      <AnimePageContent />
    </Suspense>
  );
}

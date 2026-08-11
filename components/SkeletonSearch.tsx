'use client';

import { SkeletonGrid } from '@/components/SkeletonCard';

/**
 * Loading skeleton for the search results section.
 * Mirrors the real layout so the swap is seamless:
 * - "Search results" divider header
 * - sort dropdown pill
 * - the responsive results grid (poster-only cards, matching gap)
 */
export function SkeletonSearch() {
  return (
    <div aria-hidden="true">
      {/* Results header */}
      <div className="mb-10">
        <div className="flex items-center justify-center gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="h-px w-16 sm:w-32 bg-white/20" />
          <div className="h-6 sm:h-8 w-48 rounded-lg skeleton-shimmer" />
          <div className="h-px w-16 sm:w-32 bg-white/20" />
        </div>
        {/* Sort pill */}
        <div className="flex justify-center">
          <div className="h-9 w-44 rounded-sm skeleton-shimmer" />
        </div>
      </div>

      {/* Card grid — mirrors the real results grid (poster-only cards,
          capped at 5 columns since the page container is max-w-6xl) */}
      <SkeletonGrid
        count={10}
        cols="grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
        gap="gap-3 sm:gap-5 md:gap-6"
      />
    </div>
  );
}

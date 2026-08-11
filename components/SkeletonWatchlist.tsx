'use client';

import { SkeletonGrid } from '@/components/SkeletonCard';

/**
 * Loading skeleton for the watchlist page.
 * Mirrors the real page layout so the swap is seamless:
 * - page header: title + item count, Browse Content button, status filter tabs
 * - the watchlist card grid (poster + title below, matching gap-5)
 */
export function SkeletonWatchlist() {
  const filterChips = Array.from({ length: 5 }, (_, i) => `filter-skeleton-${i}`);

  return (
    <div aria-hidden="true">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="h-8 sm:h-10 w-52 rounded-lg skeleton-shimmer" />
            <div className="h-4 w-32 rounded skeleton-shimmer mt-2" />
          </div>
          <div className="h-10 w-40 rounded-lg skeleton-shimmer" />
        </div>

        {/* Status filter tabs */}
        <div className="flex flex-wrap gap-2 mt-6">
          {filterChips.map((key) => (
            <div key={key} className="h-7 w-24 rounded-full skeleton-shimmer" />
          ))}
        </div>
      </div>

      {/* Card grid — mirrors the real grid (gap-5, title below poster) */}
      <SkeletonGrid count={10} showTitle gap="gap-5" />
    </div>
  );
}

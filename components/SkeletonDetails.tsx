'use client';

/**
 * Loading skeleton for the content details page.
 * Mirrors the real page layout so the swap is seamless:
 * - trailer/backdrop hero block (same heights)
 * - poster + title + meta chips + overview + action buttons
 * - Top Billed Cast row
 * - Recommended for You row
 */
export function SkeletonDetails() {
  const castCards = Array.from({ length: 5 }, (_, i) => `cast-skeleton-${i}`);
  const recCards = Array.from({ length: 6 }, (_, i) => `rec-skeleton-${i}`);

  return (
    <div aria-hidden="true">
      {/* Hero section skeleton — mirrors the trailer/backdrop hero */}
      <div className="relative h-[50vh] sm:h-[56vh] md:h-[62vh] overflow-hidden bg-black">
        <div className="absolute inset-0 skeleton-shimmer" />
        {/* Same bottom + top gradients as the loaded hero */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/80 via-black/40 to-transparent z-10" />
      </div>

      {/* Details section skeleton */}
      <div className="bg-black py-8 sm:py-10">
        <div className="px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 md:gap-10">
            {/* Poster placeholder — matches the loaded poster size/aspect */}
            <div className="flex-shrink-0 w-36 sm:w-48 md:w-56 mx-auto sm:mx-0">
              <div className="relative w-full aspect-[2/3] rounded-xl overflow-hidden bg-white/[0.03] border border-white/5">
                <div className="absolute inset-0 skeleton-shimmer" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              {/* Title */}
              <div className="h-8 sm:h-10 md:h-12 lg:h-14 w-3/4 max-w-xl rounded-lg skeleton-shimmer mb-3 sm:mb-4" />
              {/* Meta chips (year / cert / runtime / genre) */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4 sm:mb-5">
                <div className="h-4 w-12 rounded skeleton-shimmer" />
                <div className="h-5 w-10 rounded-sm skeleton-shimmer" />
                <div className="h-4 w-20 rounded skeleton-shimmer" />
                <div className="h-4 w-16 rounded skeleton-shimmer" />
              </div>
              {/* Overview lines */}
              <div className="space-y-2 mb-6 sm:mb-8">
                <div className="h-4 w-full max-w-xl rounded skeleton-shimmer" />
                <div className="h-4 w-11/12 max-w-lg rounded skeleton-shimmer" />
                <div className="h-4 w-4/5 max-w-md rounded skeleton-shimmer" />
                <div className="h-4 w-2/3 max-w-sm rounded skeleton-shimmer" />
              </div>
              {/* Action buttons (resume / play / my list / share) */}
              <div className="flex flex-wrap gap-3 sm:gap-4">
                <div className="h-11 w-28 rounded-sm skeleton-shimmer" />
                <div className="h-11 w-36 rounded-sm skeleton-shimmer" />
                <div className="h-11 w-32 rounded-sm skeleton-shimmer" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Billed Cast skeleton — mirrors the horizontal cast row */}
      <div className="py-8 sm:py-10 md:py-12 bg-black/50 border-t border-white/5">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="mb-6 sm:mb-8">
            <div className="h-6 sm:h-8 w-48 rounded-lg skeleton-shimmer" />
            <div className="h-3 sm:h-4 w-64 mt-2 rounded-lg skeleton-shimmer" />
          </div>
          <div className="flex overflow-hidden gap-4 sm:gap-6 pb-4">
            {castCards.map((key) => (
              <div key={key} className="w-36 sm:w-40 flex-shrink-0">
                <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-white/[0.03] border border-white/5">
                  <div className="absolute inset-0 skeleton-shimmer" />
                </div>
                <div className="h-3 w-3/4 rounded skeleton-shimmer mt-2" />
                <div className="h-2.5 w-1/2 rounded skeleton-shimmer mt-1" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recommended for You skeleton — mirrors the recommendation cards */}
      <div className="py-8 sm:py-10 md:py-14 bg-black/40 border-t border-white/5">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <div className="h-6 sm:h-8 w-56 rounded-lg skeleton-shimmer" />
            <div className="h-3 sm:h-4 w-36 rounded-lg skeleton-shimmer" />
          </div>
          <div className="flex overflow-hidden gap-4 sm:gap-6 pb-4">
            {recCards.map((key) => (
              <div key={key} className="w-44 sm:w-48 md:w-52 flex-shrink-0">
                <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-white/[0.03] border border-white/5">
                  <div className="absolute inset-0 skeleton-shimmer" />
                </div>
                <div className="h-3 w-3/4 rounded skeleton-shimmer mt-2" />
                <div className="h-2.5 w-1/2 rounded skeleton-shimmer mt-1" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

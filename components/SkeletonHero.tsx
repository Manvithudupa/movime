'use client';

/**
 * Shared loading skeleton for the hero banners (HeroSection + AnimeHero).
 * Mirrors the loaded hero layout exactly so the swap is seamless:
 * - shimmer backdrop standing in for the poster/backdrop
 * - identical gradient overlays
 * - left-aligned desktop content skeleton
 * - bottom-anchored mobile content skeleton
 */
export function SkeletonHero() {
  return (
    <div
      aria-hidden="true"
      className="relative h-auto min-h-screen md:min-h-screen bg-black overflow-hidden"
      style={{ minHeight: 'calc(100vh - 4rem)', isolation: 'isolate' }}
    >
      {/* Animated shimmer backdrop — stands in for the backdrop while loading */}
      <div className="absolute inset-0 skeleton-shimmer" />

      {/* Gradient overlays — identical to the loaded hero so the swap is seamless */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/40 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-1/2 md:h-60 bg-gradient-to-t from-black via-black/60 to-transparent" />

      {/* Desktop skeleton — mirrors the hero's left-aligned content */}
      <div className="hidden md:flex relative z-20 px-4 sm:px-6 lg:px-8 pl-16 sm:pl-24 lg:pl-32 h-full items-start pt-48 sm:pt-44 md:pt-56 lg:pt-64 pb-32 sm:pb-36 lg:pb-48">
        <div className="max-w-xl sm:max-w-2xl w-full">
          {/* Title */}
          <div className="h-10 sm:h-12 md:h-14 w-72 sm:w-96 lg:w-[28rem] rounded-lg skeleton-shimmer mb-3 sm:mb-4" />
          {/* Meta chips (year / cert / runtime / genre) */}
          <div className="flex flex-wrap items-center gap-3 mb-4 md:mb-6">
            <div className="h-4 w-14 rounded skeleton-shimmer" />
            <div className="h-5 w-10 rounded-sm skeleton-shimmer" />
            <div className="h-4 w-20 rounded skeleton-shimmer" />
            <div className="h-4 w-16 rounded skeleton-shimmer" />
          </div>
          {/* Description lines */}
          <div className="space-y-2 mb-5 md:mb-7">
            <div className="h-4 w-full max-w-lg rounded skeleton-shimmer" />
            <div className="h-4 w-4/5 max-w-md rounded skeleton-shimmer" />
            <div className="h-4 w-3/5 max-w-sm rounded skeleton-shimmer" />
          </div>
          {/* Buttons */}
          <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-2 sm:gap-3 md:gap-4">
            <div className="h-11 w-32 rounded-lg skeleton-shimmer" />
            <div className="h-11 w-36 rounded-lg skeleton-shimmer" />
            <div className="h-11 w-32 rounded-lg skeleton-shimmer" />
          </div>
          {/* Trailer button */}
          <div className="flex items-center gap-3 mt-6">
            <div className="w-12 h-12 rounded-full skeleton-shimmer" />
            <div className="h-4 w-28 rounded skeleton-shimmer" />
          </div>
        </div>
      </div>

      {/* Mobile skeleton — bottom-anchored like the loaded mobile hero */}
      <div className="md:hidden absolute inset-0 z-20 flex flex-col px-4 pb-8">
        <div className="absolute bottom-0 left-0 right-0 h-3/5 bg-gradient-to-t from-black via-black/80 via-60% to-transparent pointer-events-none" />
        <div className="flex-1" />
        <div className="relative z-10 flex flex-col space-y-3">
          {/* Title */}
          <div className="h-8 w-64 rounded-lg skeleton-shimmer" />
          {/* Meta chips */}
          <div className="flex items-center gap-3">
            <div className="h-4 w-12 rounded skeleton-shimmer" />
            <div className="h-5 w-8 rounded skeleton-shimmer" />
            <div className="h-4 w-12 rounded skeleton-shimmer" />
          </div>
          {/* Description lines */}
          <div className="h-3 w-full max-w-xs rounded skeleton-shimmer" />
          <div className="h-3 w-3/4 max-w-[240px] rounded skeleton-shimmer" />
          {/* Buttons */}
          <div className="flex items-center gap-2.5 pt-1">
            <div className="h-11 flex-1 rounded-lg skeleton-shimmer" />
            <div className="h-11 w-11 rounded-full skeleton-shimmer" />
          </div>
        </div>
      </div>
    </div>
  );
}

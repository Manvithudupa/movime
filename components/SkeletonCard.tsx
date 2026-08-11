'use client';

import React from 'react';

interface SkeletonCardProps {
  /** Tailwind aspect-ratio class. Match the real card's ratio to avoid layout shift. */
  ratio?: string;
  /** Render title lines below the poster (watchlist-style cards). */
  showTitle?: boolean;
}

export function SkeletonCard({ ratio = 'aspect-[2/3]', showTitle = false }: SkeletonCardProps) {
  return (
    <div className="relative bg-white/[0.03] border border-white/5 rounded-xl overflow-hidden">
      <div className={`relative ${ratio} skeleton-shimmer`} />
      {showTitle && (
        <div className="p-2.5 space-y-1.5">
          <div className="h-3 rounded skeleton-shimmer" />
          <div className="h-2.5 rounded w-1/2 skeleton-shimmer" />
        </div>
      )}
    </div>
  );
}

interface SkeletonGridProps {
  count?: number;
  ratio?: string;
  showTitle?: boolean;
  /** Gap classes replacing the default (prevents conflicting utilities). */
  gap?: string;
  /** Column classes replacing the default (prevents conflicting utilities). */
  cols?: string;
  /** Extra classes appended to the responsive grid. */
  className?: string;
}

export function SkeletonGrid({
  count = 12,
  ratio = 'aspect-[2/3]',
  showTitle = false,
  gap = 'gap-3 sm:gap-5 md:gap-8',
  cols = 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6',
  className = '',
}: SkeletonGridProps) {
  return (
    <div
      className={`grid ${cols} ${gap} ${className}`}
      aria-hidden="true"
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} ratio={ratio} showTitle={showTitle} />
      ))}
    </div>
  );
}

export function SkeletonContinueWatching() {
  return (
    <div className="pt-8 sm:pt-10" aria-hidden="true">
      <div className="px-4 sm:px-6 lg:px-8 max-w-screen-2xl mx-auto">
        {/* Title skeleton */}
        <div className="mb-4">
          <div className="h-6 sm:h-7 w-44 rounded-lg skeleton-shimmer" />
          <div className="h-3 sm:h-4 w-56 mt-1 rounded-lg skeleton-shimmer" />
        </div>

        {/* Card row skeleton — mirrors the real w-40 continue-watching cards */}
        <div className="flex overflow-hidden gap-4 pb-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={`cw-skeleton-${i}`} className="w-40 flex-shrink-0">
              <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-white/[0.03] border border-white/5">
                <div className="absolute inset-0 skeleton-shimmer" />
                {/* Progress bar placeholder */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                  <div className="h-full w-2/3 bg-white/30" />
                </div>
              </div>
              <div className="h-3 rounded skeleton-shimmer mt-1.5" />
              <div className="h-2.5 rounded skeleton-shimmer mt-1 w-2/3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SkeletonSection() {
  return (
    <div className="mb-8 sm:mb-10 md:mb-12">
      {/* Title skeleton */}
      <div className="flex items-center justify-between mb-4 sm:mb-5 md:mb-6">
        <div className="space-y-2">
          <div className="h-6 sm:h-7 md:h-8 w-40 sm:w-52 rounded-lg skeleton-shimmer" />
          <div className="h-3 sm:h-4 w-28 sm:w-36 rounded-lg skeleton-shimmer" />
        </div>
        <div className="h-4 w-16 rounded-lg skeleton-shimmer" />
      </div>

      {/* Cards skeleton */}
      <div className="overflow-x-hidden pb-4">
        <div className="flex space-x-4" style={{ width: 'max-content' }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={`skeleton-${i}`}
              className="w-32 sm:w-36 md:w-40 lg:w-48 flex-shrink-0"
            >
              <SkeletonCard />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

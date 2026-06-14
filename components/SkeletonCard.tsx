'use client';

import React from 'react';

export function SkeletonCard() {
  return (
    <div className="relative bg-gray-900 rounded-xl overflow-hidden">
      <div className="relative aspect-[2/3] skeleton-shimmer" />
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

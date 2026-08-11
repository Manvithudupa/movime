'use client';

/**
 * Loading skeleton for the watch page.
 * Mirrors the real page layout so the swap is seamless:
 * - breadcrumb/title top bar
 * - the player area (aspect-video block + sources sidebar)
 * - poster + info row below the player
 * - optional TV episodes row (rendered only for TV content)
 */
export function SkeletonWatch({ isTV = false }: { isTV?: boolean }) {
  const sourceChips = Array.from({ length: 5 }, (_, i) => `source-skeleton-${i}`);
  const genreChips = Array.from({ length: 3 }, (_, i) => `genre-skeleton-${i}`);
  const episodeCards = Array.from({ length: 4 }, (_, i) => `episode-skeleton-${i}`);

  return (
    <div aria-hidden="true">
      {/* Top bar — mirrors the breadcrumb/title bar under the Navbar */}
      <div className="pt-16 bg-black">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3">
          <div className="h-4 w-16 rounded skeleton-shimmer" />
          <div className="w-px h-4 bg-gray-700" />
          <div className="h-4 w-48 rounded skeleton-shimmer" />
          {isTV && <div className="h-4 w-14 rounded skeleton-shimmer shrink-0" />}
          <div className="ml-auto">
            <div className="w-8 h-8 rounded-full bg-white/[0.03] border border-white/10 skeleton-shimmer" />
          </div>
        </div>
      </div>

      {/* Player area — mirrors the player + sources sidebar */}
      <div className="bg-black w-full">
        <div className="max-w-screen-2xl mx-auto">
          <div className="flex flex-col xl:flex-row gap-0">
            {/* Player */}
            <div className="flex-1 min-w-0">
              <div className="aspect-video w-full bg-black relative">
                <div className="absolute inset-0 skeleton-shimmer" />
                {/* Play button placeholder */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-black/40 border border-white/20 backdrop-blur-sm flex items-center justify-center">
                    <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white/80 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M8 5v10l7-5z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Sources sidebar */}
            <div className="w-full xl:w-80 shrink-0 bg-black border-t xl:border-t-0 xl:border-l border-white/10">
              <div className="p-4 border-b border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <div className="h-4 w-16 rounded skeleton-shimmer" />
                  <div className="h-3 w-24 rounded skeleton-shimmer" />
                </div>
                {/* Source chips */}
                <div className="flex flex-wrap gap-2">
                  {sourceChips.map((key) => (
                    <div key={key} className="h-8 w-16 rounded-lg skeleton-shimmer" />
                  ))}
                </div>
                {/* Hint text */}
                <div className="h-3 w-3/4 rounded skeleton-shimmer mt-4" />
                <div className="h-3 w-2/3 rounded skeleton-shimmer mt-1.5" />
                {/* Ad-blocker tip box */}
                <div className="relative mt-4 h-20 rounded-lg bg-white/[0.03] border border-white/5 overflow-hidden">
                  <div className="absolute inset-0 skeleton-shimmer" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content below player */}
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Info row */}
        <div className="flex flex-col sm:flex-row gap-8">
          {/* Poster placeholder — matches the loaded poster size */}
          <div className="flex-shrink-0 w-32 sm:w-36 mx-auto sm:mx-0">
            <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-white/[0.03] border border-white/5">
              <div className="absolute inset-0 skeleton-shimmer" />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            {/* Title */}
            <div className="h-7 sm:h-9 lg:h-10 w-3/4 max-w-xl rounded-lg skeleton-shimmer mb-2" />
            {/* Meta (year / rating / seasons) */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="h-4 w-12 rounded skeleton-shimmer" />
              <div className="h-4 w-16 rounded skeleton-shimmer" />
            </div>
            {/* Overview lines */}
            <div className="space-y-2">
              <div className="h-4 w-full max-w-2xl rounded skeleton-shimmer" />
              <div className="h-4 w-11/12 max-w-xl rounded skeleton-shimmer" />
              <div className="h-4 w-3/4 max-w-lg rounded skeleton-shimmer" />
            </div>
            {/* Genre tags */}
            <div className="flex flex-wrap gap-2 mt-4">
              {genreChips.map((key) => (
                <div key={key} className="h-6 w-20 rounded-full skeleton-shimmer" />
              ))}
            </div>
          </div>
        </div>

        {/* Episodes row (TV only) — mirrors the episode cards */}
        {isTV && (
          <div>
            <div className="h-5 w-40 rounded-lg skeleton-shimmer mb-4" />
            <div className="flex overflow-hidden gap-4 pb-4">
              {episodeCards.map((key) => (
                <div key={key} className="w-56 sm:w-64 flex-shrink-0">
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-white/[0.03] border border-white/5">
                    <div className="absolute inset-0 skeleton-shimmer" />
                  </div>
                  <div className="h-3 w-3/4 rounded skeleton-shimmer mt-2" />
                  <div className="h-2.5 w-1/2 rounded skeleton-shimmer mt-1" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

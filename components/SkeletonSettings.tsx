'use client';

/**
 * Loading skeleton for the settings page.
 * Mirrors the real page layout so the swap is seamless:
 * - page header (title + subtitle)
 * - two-column grid: Playback Settings card + Data Management card
 * - About Movime card
 */
export function SkeletonSettings() {
  return (
    <div aria-hidden="true">
      <div className="pt-24 pb-8">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Page header */}
          <div className="mb-8">
            <div className="h-8 sm:h-9 md:h-10 w-40 rounded-lg skeleton-shimmer mb-4" />
            <div className="h-4 w-72 rounded skeleton-shimmer" />
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Playback Settings card */}
            <div className="bg-white/[0.03] border border-white/10 rounded-lg p-6">
              <div className="h-6 w-52 rounded-lg skeleton-shimmer mb-6" />
              <div className="space-y-6">
                <div>
                  <div className="h-4 w-40 rounded skeleton-shimmer mb-2" />
                  <div className="h-10 w-full rounded-lg skeleton-shimmer" />
                  <div className="h-3 w-52 rounded skeleton-shimmer mt-2" />
                </div>
                <div>
                  <div className="h-4 w-32 rounded skeleton-shimmer mb-2" />
                  <div className="h-10 w-full rounded-lg skeleton-shimmer" />
                  <div className="h-3 w-48 rounded skeleton-shimmer mt-2" />
                </div>
                <div>
                  <div className="h-4 w-44 rounded skeleton-shimmer mb-2" />
                  <div className="h-3 w-64 rounded skeleton-shimmer" />
                </div>
              </div>
              {/* Save button */}
              <div className="h-10 w-full rounded-lg skeleton-shimmer mt-6" />
            </div>

            {/* Data Management card */}
            <div className="bg-white/[0.03] border border-white/10 rounded-lg p-6">
              <div className="h-6 w-48 rounded-lg skeleton-shimmer mb-6" />
              <div className="space-y-6">
                <div>
                  <div className="h-4 w-28 rounded skeleton-shimmer mb-2" />
                  <div className="h-3 w-56 rounded skeleton-shimmer mb-3" />
                  <div className="h-9 w-40 rounded-lg skeleton-shimmer" />
                </div>
                <div>
                  <div className="h-4 w-24 rounded skeleton-shimmer mb-2" />
                  <div className="h-3 w-60 rounded skeleton-shimmer mb-3" />
                  <div className="h-9 w-40 rounded-lg skeleton-shimmer" />
                </div>
              </div>
            </div>
          </div>

          {/* About Movime card */}
          <div className="mt-8 bg-white/[0.03] border border-white/10 rounded-lg p-6">
            <div className="h-6 w-40 rounded-lg skeleton-shimmer mb-6" />
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="h-4 w-36 rounded skeleton-shimmer" />
                <div className="h-3 w-56 rounded skeleton-shimmer" />
                <div className="h-3 w-48 rounded skeleton-shimmer" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-24 rounded skeleton-shimmer" />
                <div className="h-3 w-40 rounded skeleton-shimmer" />
                <div className="h-3 w-44 rounded skeleton-shimmer" />
                <div className="h-3 w-36 rounded skeleton-shimmer" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

/**
 * Loading skeleton for the profile page.
 * Mirrors the real page layout so the swap is seamless:
 * - profile header card (avatar circle + name/email + edit button)
 * - 4-stat grid
 * - quick actions grid
 * - danger zone block
 */
export function SkeletonProfile() {
  const stats = Array.from({ length: 4 }, (_, i) => `stat-skeleton-${i}`);
  const actions = Array.from({ length: 4 }, (_, i) => `action-skeleton-${i}`);

  return (
    <div aria-hidden="true">
      <div className="max-w-5xl mx-auto px-4 pt-40 pb-32">
        {/* Profile Header Card */}
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-8 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:gap-10 gap-8">
            {/* Avatar placeholder — same size as the loaded Avatar (140px) */}
            <div className="flex-shrink-0 flex flex-col items-center gap-5">
              <div className="relative w-[140px] h-[140px] rounded-full bg-white/[0.03] border border-white/10 overflow-hidden">
                <div className="absolute inset-0 skeleton-shimmer" />
              </div>
            </div>

            {/* Profile info placeholder */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                <div className="w-full">
                  <div className="h-8 sm:h-10 w-56 rounded-lg skeleton-shimmer mb-2" />
                  <div className="h-4 w-64 rounded skeleton-shimmer" />
                </div>
                <div className="h-10 w-36 rounded-lg skeleton-shimmer shrink-0" />
              </div>
              {/* Bio lines */}
              <div className="h-4 w-3/4 max-w-md rounded skeleton-shimmer" />
              <div className="h-4 w-1/2 max-w-sm rounded skeleton-shimmer mt-2" />
              {/* Joined / location row */}
              <div className="h-3 w-40 rounded skeleton-shimmer mt-4" />
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((key) => (
            <div key={key} className="bg-white/[0.03] border border-white/10 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-5 h-5 rounded skeleton-shimmer" />
                <div className="h-4 w-24 rounded skeleton-shimmer" />
              </div>
              <div className="h-8 w-16 rounded-lg skeleton-shimmer" />
              <div className="h-3 w-14 rounded skeleton-shimmer mt-2" />
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6 mb-8">
          <div className="h-4 w-32 rounded skeleton-shimmer mb-4" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {actions.map((key) => (
              <div key={key} className="p-4 bg-white/5 rounded-xl">
                <div className="w-6 h-6 mx-auto rounded skeleton-shimmer mb-2" />
                <div className="h-3 w-16 mx-auto rounded skeleton-shimmer" />
              </div>
            ))}
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-red-950/20 border border-red-500/20 rounded-xl p-6">
          <div className="h-4 w-32 rounded skeleton-shimmer mb-4" />
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1">
              <div className="h-4 w-40 rounded skeleton-shimmer" />
              <div className="h-3 w-3/4 rounded skeleton-shimmer mt-2" />
              <div className="h-3 w-2/3 rounded skeleton-shimmer mt-1.5" />
            </div>
            <div className="h-10 w-36 rounded-lg skeleton-shimmer shrink-0" />
          </div>
        </div>
      </div>
    </div>
  );
}

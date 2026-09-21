// Shared watchlist status labels used across components

export const STATUS_LABELS: Record<string, string> = {
  watching: 'Watching',
  completed: 'Completed',
  plan_to_watch: 'Plan to Watch',
  dropped: 'Dropped',
}

export const STATUS_INFO: Record<string, { label: string, color: string, icon: string }> = {
  watching: { label: 'Watching', color: 'bg-white', icon: '▶' },
  completed: { label: 'Completed', color: 'bg-white/60', icon: '✓' },
  // '○' keeps the four icons in the same geometric family (▶ ✓ ✕ ○). The
  // previous hourglass was a colour emoji and rendered inconsistently next to
  // the plain glyphs on every platform.
  plan_to_watch: { label: 'Plan to Watch', color: 'bg-white/30', icon: '○' },
  dropped: { label: 'Dropped', color: 'bg-white/10', icon: '✕' },
}

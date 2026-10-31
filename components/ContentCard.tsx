'use client';

import React, { memo } from 'react';
import Image from '@/components/ProxyImage';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { TMDB_IMAGE_BASE_URL } from '@/lib/utils';
import type { ContentItem } from '@/lib/types';

interface ContentCardProps {
  item: ContentItem | any;
  addToWatchLater: (item: ContentItem) => void;
  isInWatchLater: (item: ContentItem) => boolean;
}

// Memoized ContentCard shared by the home page and category pages.
//
// The whole card is a real <Link> via the stretched-link pattern: an absolutely
// positioned Link covers the card, and the interactive controls (bookmark,
// WATCH, Details) sit above it. This keeps native link behaviour (open in new
// tab, status bar URL, prefetch) without a router.push onClick or manual
// Enter/Space key handling.
const ContentCard = memo(({
  item,
  addToWatchLater,
  isInWatchLater
}: ContentCardProps) => {
  const title = item.title || item.name || '';
  const posterPath = item.poster_path || item.poster;
  const rating = item.vote_average || 0;
  const type = item.type || item.media_type || (item.title ? 'movie' : 'tv');
  const detailsHref = `/details?id=${item.id}&type=${type}`;
  const saved = isInWatchLater(item);

  return (
    <motion.div
      className="group relative bg-white/[0.03] border border-white/10 rounded-xl overflow-hidden card-hover"
      initial={false}
      whileHover={{
        // 1.03 rather than 1.05: in a tight grid the larger scale made
        // adjacent cards overlap and clipped neighbours at the container edge.
        scale: 1.03,
        transition: { duration: 0.2 },
      }}
      whileTap={{ scale: 0.98 }}
      style={{ willChange: 'transform' }}
    >
      <div className="relative aspect-[5/7]">
        {posterPath ? (
          <Image
            src={item.poster ? posterPath : `${TMDB_IMAGE_BASE_URL}${posterPath}`}
            alt={title}
            fill
            className="object-cover transition-all duration-200"
            sizes="(max-width: 768px) 150px, (max-width: 1200px) 200px, 250px"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-white/5 flex items-center justify-center">
            <span className="text-muted-foreground">No Image</span>
          </div>
        )}

        {/* Stretched link — covers the card but sits below every control. */}
        <Link
          href={detailsHref}
          className="absolute inset-0 z-10"
          aria-label={`View details for ${title}`}
        >
          <span className="sr-only">{title}</span>
        </Link>

        {/* Status Badge — the palette mirrors STATUS_INFO so a badge reads the
            same here and on the watchlist. Every variant is white-backed
            with black text. Non-interactive, so it must not intercept clicks
            intended for the stretched link. */}
        {item.status && (
          <div className={`absolute top-3 left-3 z-20 pointer-events-none px-2 py-0.5 rounded-full text-xs font-semibold shadow-lg ${
            item.status === 'watching' ? 'bg-white text-black' :
            item.status === 'completed' ? 'bg-white/80 text-black' :
            item.status === 'plan_to_watch' ? 'bg-white/55 text-black' :
            'bg-white/30 text-black'
          }`}>
            {item.status === 'watching' ? '▶ Watching' :
             item.status === 'completed' ? '✓ Completed' :
             item.status === 'plan_to_watch' ? '○ Plan to Watch' :
             '✕ Dropped'}
          </div>
        )}

        {/* Bookmark icon */}
        <button
          onClick={() => addToWatchLater(item)}
          aria-label={saved ? `Remove ${title} from My List` : `Add ${title} to My List`}
          aria-pressed={saved}
          className="absolute top-3 right-3 z-30 bg-black/60 backdrop-blur-sm rounded-full p-2 transition-all duration-200 hover:bg-black/80"
        >
          {/* Saved state is the filled bookmark, not a red one — red is
              reserved for destructive actions across the site. */}
          <svg
            className={`w-5 h-5 transition-colors ${
              saved ? 'text-white fill-current' : 'text-white/80'
            }`}
            fill={saved ? 'currentColor' : 'none'}
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
            />
          </svg>
        </button>

        {/* Hover overlay with details — visual only; its links are re-enabled
            individually so they sit above the stretched link. */}
        <div className="card-overlay absolute inset-0 z-20 pointer-events-none flex flex-col justify-end p-4 text-white">
          <div className="space-y-2">
            <h3 className="font-bold text-sm leading-tight">{title}</h3>

            {rating > 0 && (
              <div className="flex items-center space-x-1">
                <svg className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                </svg>
                <span className="text-sm font-semibold">{rating.toFixed(1)}/10</span>
              </div>
            )}

            <div className="flex items-center gap-2 mt-3 pointer-events-auto">
              <Link
                href={`/watch?id=${item.id}&type=${type}`}
                className="relative z-30 flex-1 bg-white hover:bg-gray-100 text-black py-1.5 rounded-md text-xs font-bold transition-colors flex items-center justify-center gap-1"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8 5v10l7-5z"/>
                </svg>
                WATCH
              </Link>
              <Link
                href={detailsHref}
                className="relative z-30 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white p-1.5 rounded-md transition-colors"
                aria-label={`View details for ${title}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

ContentCard.displayName = 'ContentCard';

export default ContentCard;

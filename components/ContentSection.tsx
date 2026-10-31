'use client';

import React, { memo, useRef, useCallback } from 'react';
import Image from '@/components/ProxyImage';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { TMDB_IMAGE_BASE_URL } from '@/lib/utils';
import type { ContentItem } from '@/lib/types';
import { SkeletonSection } from '@/components/SkeletonCard';

interface ContentSectionProps {
  title: string;
  subtitle?: string;
  content: ContentItem[];
  onAddToWatchLater: (item: ContentItem) => void;
  isInWatchLater: (item: ContentItem) => boolean;
  sectionId: string;
  onViewAll?: () => void;
  isLoading?: boolean;
}

// Local compact card for the horizontal rails. Like ContentCard, the card
// itself is a real <Link> (stretched-link pattern) and the controls sit above
// it, so there is no router.push click handler or manual key handling.
const RailCard = memo(({
  item,
  onAddToWatchLater,
  isInWatchLater
}: {
  item: ContentItem | any,
  onAddToWatchLater: (item: ContentItem) => void,
  isInWatchLater: (item: ContentItem) => boolean
}) => {
  const itemTitle = item.title || item.name || '';
  const posterPath = item.poster_path || item.poster;
  const rating = item.vote_average || 0;
  const type = item.type || item.media_type || (item.title ? 'movie' : 'tv');
  const detailsHref = `/details?id=${item.id}&type=${type}`;
  const saved = isInWatchLater(item);

  return (
    <motion.div
      className="group relative bg-white/[0.03] border border-white/5 rounded-xl overflow-hidden"
      whileHover={{
        scale: 1.03,
        y: -5,
        transition: { duration: 0.2, ease: 'easeOut' }
      }}
      whileTap={{ scale: 0.98 }}
      initial={false}
      animate={{ opacity: 1 }}
      style={{ willChange: 'transform' }}
    >
      <div className="relative aspect-[2/3]">
        {posterPath ? (
          <Image
            src={`${TMDB_IMAGE_BASE_URL}${posterPath}`}
            alt={itemTitle}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 144px, (max-width: 1024px) 160px, 192px"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-white/5 flex items-center justify-center">
            <span className="text-muted-foreground text-sm">No Image</span>
          </div>
        )}

        {/* Stretched link — below the controls. */}
        <Link
          href={detailsHref}
          className="absolute inset-0 z-10"
          aria-label={`View details for ${itemTitle}`}
        >
          <span className="sr-only">{itemTitle}</span>
        </Link>

        {/* Gradient overlay (visual only) */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />

        {/* Bookmark icon */}
        <motion.button
          onClick={() => onAddToWatchLater(item)}
          aria-label={saved ? `Remove ${itemTitle} from My List` : `Add ${itemTitle} to My List`}
          aria-pressed={saved}
          className="absolute top-3 right-3 z-30 bg-black/60 backdrop-blur-sm rounded-full p-2 transition-colors duration-200 hover:bg-black/80 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <svg
            className={`w-4 h-4 transition-colors ${
              saved ? 'text-white fill-current' : 'text-white'
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
        </motion.button>

        {/* Content overlay — visual only; links are re-enabled individually. */}
        <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 text-white opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-all duration-200 pointer-events-none z-20">
          <h4 className="font-semibold text-xs sm:text-sm mb-1 line-clamp-2">{itemTitle}</h4>
          {rating > 0 && (
            <div className="flex items-center space-x-1 mb-2">
              <svg className="w-3 h-3 text-yellow-400 fill-current" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
              </svg>
              <span className="text-xs">{rating.toFixed(1)}</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 pointer-events-auto">
            <Link
              href={`/watch?id=${item.id}&type=${type}`}
              className="relative z-30 inline-flex items-center px-2.5 py-1 bg-white text-black rounded-lg transition-colors text-xs font-medium"
            >
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8 5v10l7-5z"/>
              </svg>
              Watch
            </Link>
            <Link
              href={detailsHref}
              className="relative z-30 inline-flex items-center px-2.5 py-1 bg-white/10 backdrop-blur-sm text-white border border-white/30 rounded-lg transition-colors text-xs font-medium"
            >
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              Details
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

RailCard.displayName = 'RailCard';

export default function ContentSection({
  title,
  subtitle,
  content,
  onAddToWatchLater,
  isInWatchLater,
  sectionId,
  onViewAll,
  isLoading = false,
}: ContentSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollByCards = useCallback((direction: number) => {
    const el = scrollRef.current;
    if (!el) return;
    // Approximate one card + gap (card widths vary 8rem–12rem) — scroll ~3 cards
    const cardWidth = 10 * 16; // ~160px average
    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({
      left: direction * cardWidth * 3,
      behavior: reducedMotion ? 'auto' : 'smooth',
    });
  }, []);

  if (isLoading) return <SkeletonSection />;

  if (content.length === 0) return null;

  return (
    <motion.section
      className="mb-8 sm:mb-10 md:mb-12"
      initial={false}
      animate={{ opacity: 1 }}
      aria-labelledby={`section-${sectionId}`}
    >
      <div className="flex items-center justify-between mb-4 sm:mb-5 md:mb-6 px-4">
        <div>
          <h2 id={`section-${sectionId}`} className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-white mb-1">
            {title}
          </h2>
          {subtitle && (
            <p className="text-muted-foreground text-xs sm:text-sm md:text-base">
              {subtitle}
            </p>
          )}
        </div>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-white hover:text-gray-300 transition-colors text-xs sm:text-sm font-medium flex items-center group"
          >
            View All
            <svg
              className="w-3 sm:w-4 h-3 sm:h-4 ml-1 transition-transform group-hover:translate-x-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      {/* Edge fades come from the shared .episodes-slider styles. */}
      <div className="episodes-slider group/rail relative">

        {/* Left scroll arrow */}
        <div className="absolute top-1/2 -left-4 transform -translate-y-1/2 z-20 scroll-button hidden md:block">
          <button
            onClick={() => scrollByCards(-1)}
            aria-label={`Scroll ${title} left`}
            className="bg-black/80 hover:bg-black text-white rounded-full p-3 shadow-xl backdrop-blur-sm border border-white/20 hover:scale-110 transition-all duration-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        <div
          ref={scrollRef}
          className="overflow-x-auto scrollbar-hide pb-4 px-4"
        >
          <div className="flex space-x-4 w-max">
            {content.slice(0, 15).map((item, index) => (
              <div
                key={`${sectionId}-${item.id}-${index}`}
                className="w-32 sm:w-36 md:w-40 lg:w-48 flex-shrink-0"
              >
                <RailCard
                  item={item}
                  onAddToWatchLater={onAddToWatchLater}
                  isInWatchLater={isInWatchLater}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Right scroll arrow */}
        <div className="absolute top-1/2 -right-4 transform -translate-y-1/2 z-20 scroll-button hidden md:block">
          <button
            onClick={() => scrollByCards(1)}
            aria-label={`Scroll ${title} right`}
            className="bg-black/80 hover:bg-black text-white rounded-full p-3 shadow-xl backdrop-blur-sm border border-white/20 hover:scale-110 transition-all duration-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </motion.section>
  );
}

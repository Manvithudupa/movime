'use client';

import React, { memo } from 'react';
import Image from '@/components/ProxyImage';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { TMDB_IMAGE_BASE_URL } from '@/lib/utils';
import type { ContentItem } from '@/lib/types';

interface ContentCardProps {
  item: ContentItem | any;
  addToWatchLater: (item: ContentItem) => void;
  isInWatchLater: (item: ContentItem) => boolean;
}

// Memoized ContentCard shared by the home page and category pages
const ContentCard = memo(({ 
  item, 
  addToWatchLater, 
  isInWatchLater 
}: ContentCardProps) => {
  const title = item.title || item.name || '';
  const posterPath = item.poster_path || item.poster;
  const rating = item.vote_average || 0;
  const type = item.type || item.media_type || (item.title ? 'movie' : 'tv');
  const router = useRouter();

  const handleCardClick = () => {
    router.push(`/details?id=${item.id}&type=${type}`);
  };

  return (
    <motion.div 
      className="group relative bg-white/[0.03] border border-white/5 rounded-xl overflow-hidden card-hover"
      initial={false}
      whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.95 }}
      style={{ willChange: 'transform' }}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        // Don't swallow Enter/Space for the inner WATCH / Details links
        if ((e.target as HTMLElement).closest('a, button')) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`View details for ${title}`}
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
            <span className="text-gray-400">No Image</span>
          </div>
        )}
        
        {/* Status Badge */}
        {item.status && (
          <div className={`absolute top-3 left-3 z-10 px-2 py-0.5 rounded-full text-[10px] font-semibold shadow-lg ${
            item.status === 'watching' ? 'bg-white text-black' :
            item.status === 'completed' ? 'bg-white/70 text-black' :
            item.status === 'dropped' ? 'bg-white/40 text-black' :
            'bg-white/25 text-white'
          }`}>
            {item.status === 'watching' ? '▶ Watching' :
             item.status === 'completed' ? '✓ Completed' :
             item.status === 'dropped' ? '✕ Dropped' :
             '⏳ Plan to Watch'}
          </div>
        )}
        
        {/* Bookmark icon */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            addToWatchLater(item);
          }}
          className="absolute top-3 right-3 z-10 bg-black/60 backdrop-blur-sm rounded-full p-2 transition-all duration-200 hover:bg-black/80"
        >
          <svg 
            className={`w-5 h-5 transition-colors ${
              isInWatchLater(item) ? 'text-red-500 fill-current' : 'text-white'
            }`} 
            fill={isInWatchLater(item) ? 'currentColor' : 'none'} 
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
        
        {/* Hover overlay with details */}
        <div className="card-overlay absolute inset-0 flex flex-col justify-end p-4 text-white">
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
            
            <div className="flex items-center gap-2 mt-3">
              <Link
                href={`/watch?id=${item.id}&type=${type}`}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 bg-white hover:bg-gray-100 text-black py-1.5 rounded-md text-xs font-bold transition-colors flex items-center justify-center gap-1"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8 5v10l7-5z"/>
                </svg>
                WATCH
              </Link>
              <Link
                href={`/details?id=${item.id}&type=${type}`}
                onClick={(e) => e.stopPropagation()}
                className="bg-white/20 hover:bg-white/30 backdrop-blur-md text-white p-1.5 rounded-md transition-colors"
                title="View Details"
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

'use client';

import React from 'react';
import Navbar from '@/components/Navbar';

interface SkeletonPageLayoutProps {
  currentView: string;
  showSearch: boolean;
  watchLaterCount: number;
  onViewChange: (view: string) => void;
  /** The page's loading skeleton(s) rendered below the Navbar. */
  children?: React.ReactNode;
}

/**
 * Shared wrapper for page loading states. Rendering the real Navbar during
 * loading keeps the chrome consistent (and interactive) while the page
 * skeleton swaps in below — no layout jump when content arrives.
 */
export function SkeletonPageLayout({
  currentView,
  showSearch,
  watchLaterCount,
  onViewChange,
  children,
}: SkeletonPageLayoutProps) {
  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar
        currentView={currentView}
        showSearch={showSearch}
        watchLaterCount={watchLaterCount}
        onViewChange={onViewChange}
      />
      {children}
    </div>
  );
}

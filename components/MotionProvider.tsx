'use client';

import React from 'react';
import { MotionConfig } from 'framer-motion';

/**
 * Applies MotionConfig globally so every framer-motion animation in the app
 * (page fades, card hovers, menu slides, etc.) respects the user's
 * `prefers-reduced-motion` OS setting.
 */
export default function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

-- =============================================================
-- Movime Continue Watching Schema
-- Run this in your Supabase SQL Editor (one-time setup)
-- Separate from main schema.sql for easy copy-paste
-- =============================================================

-- 1. Create continue_watching table
CREATE TABLE IF NOT EXISTS public.continue_watching (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id INTEGER NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('movie', 'tv')),
  title TEXT NOT NULL,
  poster_path TEXT,
  backdrop_path TEXT,
  season_number INTEGER DEFAULT NULL,
  episode_number INTEGER DEFAULT NULL,
  episode_title TEXT DEFAULT NULL,
  progress_seconds FLOAT DEFAULT 0,
  duration_seconds FLOAT DEFAULT 0,
  progress_percentage FLOAT DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- For movies: unique on (user_id, content_id, content_type)
-- For TV: unique on (user_id, content_id, content_type, season_number, episode_number)

-- Unique index to prevent duplicates (handles NULL season/episode for movies)
CREATE UNIQUE INDEX IF NOT EXISTS idx_continue_watching_unique
  ON public.continue_watching(user_id, content_id, content_type, COALESCE(season_number, -1), COALESCE(episode_number, -1));

-- 2. Enable Row Level Security
ALTER TABLE public.continue_watching ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for continue_watching
-- Users can only see their own continue watching items
CREATE POLICY "Users can view own continue watching"
  ON public.continue_watching FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own continue watching items
CREATE POLICY "Users can insert own continue watching"
  ON public.continue_watching FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own continue watching items
CREATE POLICY "Users can update own continue watching"
  ON public.continue_watching FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own continue watching items
CREATE POLICY "Users can delete own continue watching"
  ON public.continue_watching FOR DELETE
  USING (auth.uid() = user_id);

-- 4. Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_continue_watching_user_id
  ON public.continue_watching(user_id);
CREATE INDEX IF NOT EXISTS idx_continue_watching_updated_at
  ON public.continue_watching(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_continue_watching_content
  ON public.continue_watching(content_id, content_type);

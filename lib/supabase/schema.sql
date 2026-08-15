-- =============================================================
-- Movime Supabase Schema
-- Run this in your Supabase SQL Editor (one-time setup)
-- =============================================================

-- 1. Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  avatar_url TEXT,
  bio TEXT,
  gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  location TEXT,
  website TEXT,
  anime_character JSONB DEFAULT NULL,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create watch_later table with status field
CREATE TABLE IF NOT EXISTS public.watch_later (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id INTEGER NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('movie', 'tv')),
  title TEXT NOT NULL,
  poster_path TEXT,
  status TEXT DEFAULT 'plan_to_watch' CHECK (status IN ('completed', 'watching', 'plan_to_watch', 'dropped')),
  added_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, content_id, content_type)
);

-- 3. Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_later ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for profiles
-- SECURITY: profiles must NOT be world-readable. The public anon key is
-- embedded in the client bundle, so an open SELECT policy lets anyone dump
-- every user's email + profile data straight from the Supabase REST API.
-- Users can only read their own profile. If a public profile feature is
-- added later, expose only non-sensitive fields through a dedicated view or
-- a narrow column-level policy instead of opening the whole table.
-- (For existing databases, run fix_profiles_rls.sql to swap this policy.)
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can insert their own profile (auto-created on signup)
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- 5. RLS Policies for watch_later
-- Users can only see their own watch later items
CREATE POLICY "Users can view own watch later"
  ON public.watch_later FOR SELECT
  USING (auth.uid() = user_id);

-- Users can add items to their own watch later
CREATE POLICY "Users can insert own watch later"
  ON public.watch_later FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own watch later items
CREATE POLICY "Users can update own watch later"
  ON public.watch_later FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete items from their own watch later
CREATE POLICY "Users can delete own watch later"
  ON public.watch_later FOR DELETE
  USING (auth.uid() = user_id);

-- 6. Create a trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it already exists, then create it
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

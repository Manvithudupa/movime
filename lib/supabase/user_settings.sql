-- =============================================================
-- Movime User Settings Sync
-- Run this in your Supabase SQL Editor (one-time setup, safe to
-- re-run). Adds a JSONB column to profiles that stores the user's
-- playback settings (preferred source, default quality, auto-play)
-- so they sync across devices.
-- =============================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

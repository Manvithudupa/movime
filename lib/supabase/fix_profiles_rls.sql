-- =============================================================
-- SECURITY FIX: Restrict public.profiles SELECT to the user's own row
--
-- The old policy ("Profiles are viewable by everyone", USING (true)) made the
-- whole table world-readable through the public anon key, which is embedded in
-- the client bundle. Anyone could run:
--     GET https://<project>.supabase.co/rest/v1/profiles?select=*
-- and retrieve every user's email, bio, location, website, gender and settings.
--
-- Run this in the Supabase SQL Editor (safe to re-run). For fresh setups this
-- is already reflected in schema.sql.
-- =============================================================

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

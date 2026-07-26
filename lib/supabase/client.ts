'use client'

import { createBrowserClient } from '@supabase/ssr'

let cachedClient: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (cachedClient && typeof window !== 'undefined') {
    return cachedClient;
  }
  const client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  if (typeof window !== 'undefined') {
    cachedClient = client;
  }
  return client;
}


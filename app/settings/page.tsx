'use client';

import React, { useState, useEffect } from 'react';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { availableSources } from '@/lib/sources';
import { setLocalStorage } from '@/lib/utils';
import { fetchSettings, saveSettings, DEFAULT_SETTINGS, type UserSettings } from '@/lib/settings';
import { useAuth } from '@/components/AuthProvider';
import Navbar from '@/components/Navbar';
import { SkeletonSettings } from '@/components/SkeletonSettings';
import { SkeletonPageLayout } from '@/components/SkeletonPageLayout';
import { getViewPath } from '@/lib/routes';
import { useWatchlistStore, useContinueWatchingStore } from '@/lib/store';

export default function SettingsPage() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const [preferredSource, setPreferredSource] = useState('');
  // Initialize from the real default so the dropdown doesn't flash '720p'
  // before the saved settings load.
  const [defaultQuality, setDefaultQuality] = useState(DEFAULT_SETTINGS.defaultQuality);
  const [autoPlay, setAutoPlay] = useState(true);
  const [loading, setLoading] = useState(true);
  const [showSearch] = useState(false);
  const watchLaterCount = useWatchlistStore((s) => s.count);
  const fetchWatchlist = useWatchlistStore((s) => s.fetch);

  const applySettings = (settings: UserSettings) => {
    // Ignore a saved preferred source that no longer exists (e.g. it was
    // removed because the provider went offline).
    setPreferredSource(
      availableSources.some((s) => s.id === settings.preferredSource)
        ? settings.preferredSource
        : availableSources[0]?.id || ''
    );
    setDefaultQuality(settings.defaultQuality);
    setAutoPlay(settings.autoPlay);
  };

  useEffect(() => {
    fetchWatchlist(!!isSignedIn);
    // Load settings — the server copy (synced across devices) wins when signed
    // in, otherwise localStorage.
    fetchSettings(!!isSignedIn).then((settings) => {
      applySettings(settings);
      setLoading(false);
    });
  }, [isSignedIn, fetchWatchlist]);

  const handleSaveSettings = async () => {
    await saveSettings({ preferredSource, defaultQuality, autoPlay }, !!isSignedIn);
    toast.success('Settings saved successfully!');
  };

  const clearWatchLater = async () => {
    if (!confirm('Are you sure you want to clear your watch later list?')) {
      return;
    }

    // Guests have no server copy — localStorage is their store.
    if (!isSignedIn) {
      setLocalStorage('watchLater', []);
      useWatchlistStore.getState().clear();
      toast.success('Watch later list cleared!');
      return;
    }

    // One scoped request instead of the per-item DELETEs this used to loop:
    // the watchlist route's rate limit cut that loop off on long lists, so
    // most rows stayed behind while the UI still reported success.
    try {
      const response = await fetch('/api/user/data?scope=watchlist', { method: 'DELETE' });
      if (!response.ok) {
        toast.error('Failed to clear your watchlist. Please try again.');
        return;
      }
      useWatchlistStore.getState().clear();
      toast.success('Watch later list cleared!');
    } catch (error) {
      console.error('Error clearing watchlist:', error);
      toast.error('Failed to clear your watchlist. Please try again.');
    }
  };

  const clearAllData = async () => {
    if (!confirm('Clear all your data? This erases your watchlist, watch history, and saved settings — on this device and, when signed in, from your account.')) {
      return;
    }

    // Clear the account copy first: if that fails, the local data is still
    // there to retry with, and the user is told the wipe was partial.
    let serverCleared = true;
    if (isSignedIn) {
      try {
        const response = await fetch('/api/user/data', { method: 'DELETE' });
        serverCleared = response.ok;
      } catch (error) {
        console.error('Error clearing account data:', error);
        serverCleared = false;
      }
    }

    // Local copy — guest data and settings keys live here, and the in-memory
    // stores are reset so counts/items vanish immediately instead of lingering
    // until the next page reload.
    localStorage.clear();
    useWatchlistStore.getState().clear();
    useContinueWatchingStore.getState().clear();

    // Rewrites the local settings keys with defaults and, when signed in,
    // pushes the reset so the synced copy doesn't restore the old preferences.
    await saveSettings(DEFAULT_SETTINGS, !!isSignedIn);
    applySettings(DEFAULT_SETTINGS);

    if (serverCleared) {
      toast.success('All data cleared successfully!');
    } else {
      toast.error('Cleared this device, but your account data could not be cleared. Please try again.');
    }
  };

  const handleViewChange = (view: string) => {
    if (view === 'settings') return;
    router.push(getViewPath(view));
  };

  if (loading) {
    return (
      <SkeletonPageLayout
        currentView="settings"
        showSearch={showSearch}
        watchLaterCount={watchLaterCount}
        onViewChange={handleViewChange}
      >
        <SkeletonSettings />
      </SkeletonPageLayout>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar
        currentView="settings"
        showSearch={showSearch}
        watchLaterCount={watchLaterCount}
        onViewChange={handleViewChange}
      />

      <main className="pt-24 pb-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">Settings</h1>
            <p className="text-gray-400">Customize your Movime streaming experience</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Playback Settings */}
            <div className="bg-white/[0.03] border border-white/10 rounded-lg p-6">
              <h2 className="text-2xl font-semibold mb-6 flex items-center">
                <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.5a2.5 2.5 0 000-5H9v5zm0 0H7.5a2.5 2.5 0 000 5H9v-5zm0 0v5m0-5h2.5m-.5-2a2.5 2.5 0 000-5m0 5v5" />
                </svg>
                Playback Settings
              </h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Preferred Video Source</label>
                  <select
                    value={preferredSource}
                    onChange={(e) => setPreferredSource(e.target.value)}
                    className="w-full px-3 py-2 bg-white/[0.04] border border-white/15 rounded-lg focus:border-white/60 focus:outline-none text-white transition-colors"
                  >
                    {availableSources.map(source => (
                      <option key={source.id} value={source.id}>
                        {source.name} {source.requiresNoSandbox ? '(Embed - Unrestricted)' : '(Embed - Sandboxed)'}
                      </option>
                    ))}
                  </select>
                  <p className="text-sm text-gray-400 mt-1">
                    Default video source for playback
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Default Quality</label>
                  <select
                    value={defaultQuality}
                    onChange={(e) => setDefaultQuality(e.target.value)}
                    className="w-full px-3 py-2 bg-white/[0.04] border border-white/15 rounded-lg focus:border-white/60 focus:outline-none text-white transition-colors"
                  >
                    <option value="1080p">1080p (Full HD)</option>
                    <option value="720p">720p (HD)</option>
                    <option value="480p">480p (SD)</option>
                    <option value="auto">Auto (Recommended)</option>
                  </select>
                  <p className="text-sm text-gray-400 mt-1">
                    Preferred quality — applied as a hint to embed sources that support it. Most embeds choose quality automatically.
                  </p>
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={autoPlay}
                      onChange={(e) => setAutoPlay(e.target.checked)}
                      className="mr-3 w-4 h-4 text-white bg-black border-white/20 rounded focus:ring-white"
                    />
                    <span className="text-sm font-medium">Auto-play next episode</span>
                  </label>
                  <p className="text-sm text-gray-400 mt-1 ml-7">
                    Automatically play the next episode for TV shows
                  </p>
                </div>
              </div>

              <button
                onClick={handleSaveSettings}
                className="w-full mt-6 px-4 py-2 bg-white text-black font-semibold rounded-lg hover:bg-gray-100 transition-colors"
              >
                Save Settings
              </button>
            </div>

            {/* Data Management */}
            <div className="bg-white/[0.03] border border-white/10 rounded-lg p-6">
              <h2 className="text-2xl font-semibold mb-6 flex items-center">
                <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                </svg>
                Data Management
              </h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium mb-2">Watch Later</h3>
                  <p className="text-gray-400 text-sm mb-3">
                    You have {watchLaterCount} items in your watch later list
                  </p>
                  {/* Destructive actions share the red treatment used for
                      sign out, so danger is signalled consistently. */}
                  <button
                    onClick={clearWatchLater}
                    className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-300 hover:text-red-200 border border-red-500/25 hover:border-red-500/40 rounded-lg transition-colors"
                  >
                    Clear Watch Later
                  </button>
                </div>

                <div>
                  <h3 className="font-medium mb-2">All Data</h3>
                  <p className="text-gray-400 text-sm mb-3">
                    Erase your watchlist, watch history, and saved settings — on this device and, when signed in, from your account.
                  </p>
                  <button
                    onClick={clearAllData}
                    className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-300 hover:text-red-200 border border-red-500/25 hover:border-red-500/40 rounded-lg transition-colors"
                  >
                    Clear All Data
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* App Info */}
          <div className="mt-8 bg-white/[0.03] border border-white/10 rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-6 flex items-center">
              <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              About Movime
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6 text-sm">
              <div>
                <h3 className="font-medium mb-2">Version Information</h3>
                <p className="text-gray-400">Movime Streaming Platform v2.0</p>
                <p className="text-gray-400">Built with Next.js, React, and Supabase</p>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Features</h3>
                <ul className="text-gray-400 space-y-1">
                  <li>• HD/4K Video Streaming</li>
                  <li>• TV Shows & Movies</li>
                  <li>• Cloud-Synced Watchlist</li>
                  <li>• Multiple Video Sources</li>
                  <li>• Cross-Device Sync</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

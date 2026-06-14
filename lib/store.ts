import { create } from 'zustand';

// Store for anime title preferences (romaji, english, etc.)
interface TitleStore {
  animetitle: 'romaji' | 'english' | 'native';
  setAnimetitle: (title: 'romaji' | 'english' | 'native') => void;
}

export const useTitle = create<TitleStore>((set) => ({
  animetitle: 'romaji',
  setAnimetitle: (title) => set({ animetitle: title }),
}));

// Store for currently playing episode info
interface NowPlayingStore {
  nowPlaying: {
    download: string | null;
    skiptimes: Array<{
      startTime: number;
      endTime: number;
      text: string;
    }>;
    epId: string | null;
    provider: string | null;
    epNum: string | number | null;
    subtype: string | null;
  } | null;
}

export const useNowPlaying = create<NowPlayingStore>((set) => ({
  nowPlaying: null,
}));

// Store for anime data info
interface DataInfoStore {
  dataInfo: any | null;
}

export const useDataInfo = create<DataInfoStore>((set) => ({
  dataInfo: null,
}));

import { useCallback, useEffect, useState } from 'react';
import { getYouTubeApiKey } from '../lib/youtube';
import type { YouTubeChannelData } from '../lib/youtube';
import { clearYoutubeChannelCache, getYoutubeChannelDataCached } from '../lib/youtubeChannelCache';

/**
 * Loads the shared YouTube channel snapshot once (uploads + playlists merge, caps, etc.).
 * Multiple components can call this hook — the underlying `getYoutubeChannelDataCached`
 * dedupes the network request.
 */
export type UseYoutubeChannelDataResult = {
  data: YouTubeChannelData | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
  /** False when `VITE_YOUTUBE_API_KEY` is missing — overlays will stay empty */
  hasApiKey: boolean;
};

export function useYoutubeChannelData(): UseYoutubeChannelDataResult {
  const [data, setData] = useState<YouTubeChannelData | null>(null);
  const [loading, setLoading] = useState(() => !!getYouTubeApiKey());
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const hasApiKey = !!getYouTubeApiKey();

  const retry = useCallback(() => {
    clearYoutubeChannelCache();
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!hasApiKey) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    getYoutubeChannelDataCached()
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setError(null);
      })
      .catch((e) => {
        if (cancelled) return;
        setData(null);
        setError(e instanceof Error ? e.message : String(e));
        console.error('[EGGS YouTube API] useYoutubeChannelData: fetch failed.', e);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [attempt, hasApiKey]);

  return { data, loading, error, retry, hasApiKey };
}

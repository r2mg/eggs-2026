import { useCallback, useEffect, useState } from 'react';
import { getYouTubeApiKey } from '../lib/youtube';
import type { YouTubeChannelData } from '../lib/youtube';
import { clearYoutubeChannelCache, getYoutubeChannelHomeLiteCached } from '../lib/youtubeChannelCache';

/**
 * Homepage-only YouTube load: **small** snapshot (uploads + Featured + Start Here + short
 * excluded-list scan). Same return shape as `useYoutubeChannelData`, but does not pull
 * every topic playlist’s items — that work stays on the archive route.
 */
export type UseYoutubeHomeChannelDataResult = {
  data: YouTubeChannelData | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
  hasApiKey: boolean;
};

export function useYoutubeHomeChannelData(): UseYoutubeHomeChannelDataResult {
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

    getYoutubeChannelHomeLiteCached()
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setError(null);
      })
      .catch((e) => {
        if (cancelled) return;
        setData(null);
        setError(e instanceof Error ? e.message : String(e));
        console.error('[EGGS YouTube API] useYoutubeHomeChannelData: fetch failed.', e);
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

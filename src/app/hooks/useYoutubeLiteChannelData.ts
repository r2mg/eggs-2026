import { useCallback, useEffect, useState } from 'react';
import { getYouTubeApiKey } from '../lib/youtube';
import type { YouTubeChannelData } from '../lib/youtube';
import { clearYoutubeChannelCache, getYoutubeChannelHomeLiteCached } from '../lib/youtubeChannelCache';

/**
 * **Lite** YouTube channel snapshot (shared by Home + Archive).
 *
 * Loads the same small payload as the homepage originally did: uploads + Featured + Start Here
 * (see `fetchYouTubeChannelHomeLite` in `youtube.ts`). Uses `getYoutubeChannelHomeLiteCached`
 * so only one network request runs no matter how many components call this hook.
 */
export type UseYoutubeLiteChannelDataResult = {
  data: YouTubeChannelData | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
  hasApiKey: boolean;
};

export function useYoutubeLiteChannelData(): UseYoutubeLiteChannelDataResult {
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
        console.error('[EGGS YouTube API] useYoutubeLiteChannelData: fetch failed.', e);
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

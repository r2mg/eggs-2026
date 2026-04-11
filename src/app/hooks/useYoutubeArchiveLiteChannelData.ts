import { useCallback, useEffect, useState } from 'react';
import { getYouTubeApiKey } from '../lib/youtube';
import type { YouTubeChannelData } from '../lib/youtube';
import { clearYoutubeChannelCache, getYoutubeChannelHomeLiteCached } from '../lib/youtubeChannelCache';

/**
 * **Archive (All Episodes) — fast card thumbnails**
 *
 * Uses the same small YouTube snapshot as the homepage (`getYoutubeChannelHomeLiteCached`):
 * recent uploads + Featured + Start Here, not the full multi-playlist merge.
 *
 * The archive page also loads the **full** channel in the background (`useYoutubeChannelData`)
 * for topic filters, featured badges, and sorting — but **card images** should not wait on that.
 */
export type UseYoutubeArchiveLiteChannelDataResult = {
  data: YouTubeChannelData | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
  hasApiKey: boolean;
};

export function useYoutubeArchiveLiteChannelData(): UseYoutubeArchiveLiteChannelDataResult {
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
        console.error('[EGGS YouTube API] useYoutubeArchiveLiteChannelData: fetch failed.', e);
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

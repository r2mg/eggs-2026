import { useCallback, useEffect, useState } from 'react';
import { fetchRssEpisodes } from '../lib/rss';
import type { Episode } from '../types/episode';

/**
 * Stable RSS-only episode list (Anchor feed).
 * ------------------------------------------------------------------
 * This hook **never** merges YouTube into `data`. YouTube fields on `Episode` stay
 * unset here; use `useYoutubeOverlaysForSlugs` (or the progressive hook) and
 * `mergeEpisodeForDisplay()` in JSX for thumbnails / embeds.
 *
 * One shared in-memory cache keeps the feed download single-flight across routes.
 */
let cachedRssEpisodes: Episode[] | null = null;
let rssInflight: Promise<Episode[]> | null = null;

export function clearRssEpisodesCache(): void {
  cachedRssEpisodes = null;
  rssInflight = null;
}

function loadRssOnce(): Promise<Episode[]> {
  if (cachedRssEpisodes) return Promise.resolve(cachedRssEpisodes);
  if (!rssInflight) {
    rssInflight = fetchRssEpisodes()
      .then((list) => {
        cachedRssEpisodes = list.map((e) => ({ ...e }));
        return cachedRssEpisodes;
      })
      .finally(() => {
        rssInflight = null;
      });
  }
  return rssInflight;
}

export type UseRssEpisodesResult = {
  data: Episode[];
  loading: boolean;
  error: string | null;
  retry: () => void;
};

export function useRssEpisodes(): UseRssEpisodesResult {
  const [data, setData] = useState<Episode[]>(() => cachedRssEpisodes ?? []);
  const [loading, setLoading] = useState(() => cachedRssEpisodes === null);
  const [error, setError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);

  const retry = useCallback(() => {
    clearRssEpisodesCache();
    setLoadAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    if (cachedRssEpisodes) {
      setData(cachedRssEpisodes);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    loadRssOnce()
      .then((list) => {
        if (cancelled) return;
        setData(list);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        const message = e instanceof Error ? e.message : 'Could not load episodes.';
        console.error(
          '[EGGS RSS] useRssEpisodes: feed load failed — see `[EGGS RSS]` logs in `fetchRssEpisodes` / `parseRssXml`.',
          e,
        );
        setError(message);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [loadAttempt]);

  return { data, loading, error, retry };
}

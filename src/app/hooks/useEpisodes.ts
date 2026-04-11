import { useCallback, useEffect, useState } from 'react';
import { enrichEpisodesWithYouTube } from '../lib/enrichEpisodesWithYouTube';
import type { YoutubeEnrichmentInfo } from '../lib/enrichEpisodesWithYouTube';
import { fetchRssEpisodes } from '../lib/rss';
import type { Episode } from '../types/episode';

/**
 * useEpisodes — shared podcast list for Home, Archive, and Episode Detail
 * =======================================================================
 *
 * **RSS:** Loaded via `fetchRssEpisodes()` in `src/app/lib/rss.ts`.
 *
 * **YouTube (optional):** After RSS loads, the UI shows episodes **right away**, then
 * `enrichEpisodesWithYouTube()` runs in the background when `VITE_YOUTUBE_API_KEY` is set.
 * If the key is missing or YouTube errors, you keep RSS-only episodes — see `youtubeInfo`.
 *
 * **Routing:** Episode paths use `episodePathFromSlug()` in `src/app/episodePaths.ts`.
 */

let cachedEpisodes: Episode[] | null = null;
let cachedYoutubeInfo: YoutubeEnrichmentInfo | null = null;

export type UseEpisodesResult = {
  data: Episode[];
  loading: boolean;
  error: string | null;
  retry: () => void;
  /** YouTube API enrichment summary (null before first successful load) */
  youtubeInfo: YoutubeEnrichmentInfo | null;
};

/**
 * 1. `const { data, loading, error, retry, youtubeInfo } = useEpisodes()`
 * 2. Loading / error handling unchanged from before.
 * 3. Read `youtubeInfo` in devtools or optional UI to see match counts.
 */
export function useEpisodes(): UseEpisodesResult {
  const [data, setData] = useState<Episode[]>(() => cachedEpisodes ?? []);
  const [loading, setLoading] = useState(() => cachedEpisodes === null);
  const [error, setError] = useState<string | null>(null);
  const [youtubeInfo, setYoutubeInfo] = useState<YoutubeEnrichmentInfo | null>(() => cachedYoutubeInfo);
  const [loadAttempt, setLoadAttempt] = useState(0);

  const retry = useCallback(() => {
    cachedEpisodes = null;
    cachedYoutubeInfo = null;
    setLoadAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    if (cachedEpisodes) {
      setData(cachedEpisodes);
      setYoutubeInfo(cachedYoutubeInfo);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const rss = await fetchRssEpisodes();
        if (cancelled) return;
        setData(rss.map((e) => ({ ...e })));
        setLoading(false);

        const enriched = await enrichEpisodesWithYouTube(rss);
        if (cancelled) return;
        cachedEpisodes = enriched.episodes;
        cachedYoutubeInfo = enriched.youtubeInfo;
        setData(enriched.episodes);
        setYoutubeInfo(enriched.youtubeInfo);
      } catch (e) {
        if (cancelled) return;
        const message = e instanceof Error ? e.message : 'Could not load episodes.';
        console.error(
          '[EGGS RSS] useEpisodes: loading the episode list failed. The UI should show `error`; see earlier “[EGGS RSS]” logs from `fetchRssEpisodes` / `parseRssXml` for the root cause.',
          e,
        );
        setError(message);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadAttempt]);

  return { data, loading, error, retry, youtubeInfo };
}

import { useEffect, useState } from 'react';
import type { Episode } from '../types/episode';
import type { YoutubeEpisodeOverlay } from '../types/youtubeOverlay';
import type { YouTubeChannelData } from '../lib/youtube';
import { computeEpisodeYoutubeOverlay, youtubeCandidatesFromChannelData } from '../lib/computeEpisodeYoutubeOverlay';

const CHUNK_SIZE = 35;

/**
 * Fills a `slug → overlay` map for **all** RSS episodes in small batches so the main thread
 * stays responsive. Used for topic counts / filters that need `collections` across the
 * archive without blocking first paint.
 *
 * Updates `overlays` incrementally — RSS `data` from `useRssEpisodes` never changes here.
 */
export function useYoutubeOverlaysProgressive(
  rssEpisodes: Episode[] | null,
  channelData: YouTubeChannelData | null,
): { overlays: Record<string, YoutubeEpisodeOverlay>; working: boolean } {
  const [overlays, setOverlays] = useState<Record<string, YoutubeEpisodeOverlay>>({});
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!rssEpisodes?.length || !channelData) {
      setOverlays({});
      setWorking(false);
      return;
    }

    let cancelled = false;
    const catalog = youtubeCandidatesFromChannelData(channelData);
    setWorking(true);
    setOverlays({});

    (async () => {
      for (let start = 0; start < rssEpisodes.length; start += CHUNK_SIZE) {
        if (cancelled) return;
        const end = Math.min(start + CHUNK_SIZE, rssEpisodes.length);
        const batch: Record<string, YoutubeEpisodeOverlay> = {};
        for (let i = start; i < end; i++) {
          const ep = rssEpisodes[i];
          const o = computeEpisodeYoutubeOverlay(ep, channelData, catalog);
          if (o) batch[ep.slug] = o;
        }
        if (Object.keys(batch).length > 0) {
          setOverlays((prev) => ({ ...prev, ...batch }));
        }
        if (end < rssEpisodes.length) {
          await new Promise<void>((resolve) => {
            window.setTimeout(resolve, 0);
          });
        }
      }
      if (!cancelled) setWorking(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [rssEpisodes, channelData]);

  return { overlays, working };
}

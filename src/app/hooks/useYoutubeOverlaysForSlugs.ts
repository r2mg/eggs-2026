import { useMemo } from 'react';
import { buildYoutubeOverlaysForEpisodes } from '../lib/computeEpisodeYoutubeOverlay';
import type { Episode } from '../types/episode';
import type { YoutubeEpisodeOverlay } from '../types/youtubeOverlay';
import { mergeYoutubeCatalogForMatching } from '../lib/youtubeChannelCache';
import { useYoutubeChannelData } from './useYoutubeChannelData';
import { useYoutubeLiteChannelData } from './useYoutubeLiteChannelData';

/** Stable key for dependency arrays (order-insensitive). */
function slugsDependencyKey(slugs: string[]): string {
  if (slugs.length === 0) return '';
  return [...new Set(slugs.filter(Boolean))].sort().join('|');
}

/**
 * YouTube overlay map for **only** the slugs you pass in (e.g. visible archive rows or
 * one episode detail page). RSS rows stay unchanged; merge in the component with
 * `mergeEpisodeForDisplay(ep, overlays[ep.slug] ?? null)` where needed.
 *
 * **Catalog:** Uses the same **lite + full** merge as Home and the archive (`mergeYoutubeCatalogForMatching`)
 * so the first available snapshot can run matching without waiting for the slow full channel pull.
 *
 * **Overlay map:** Every requested slug gets an entry once `mergedCatalog` exists: either a matched
 * overlay object or **`null`** (tried, no YouTube). While the API key exists but no merged catalog
 * is ready yet, `overlays` is empty.
 *
 * **Which flag for skeletons?**
 * - `awaitYoutubeCatalog` — true only when there is no merged catalog yet **and** a request is in flight
 *   (good when you care about “no overlay keys yet”).
 * - `hasApiKey && channelLoading` — true while **either** lite or full channel hook is still loading
 *   (use on **EpisodeDetail** so the hero and RSS audio do not appear until both loads settle, avoiding
 *   a two-step swap when the full catalog refines matches).
 */
export function useYoutubeOverlaysForSlugs(rssEpisodes: Episode[] | null, slugs: string[]) {
  const full = useYoutubeChannelData();
  const lite = useYoutubeLiteChannelData();
  const hasApiKey = full.hasApiKey;

  const mergedCatalog = useMemo(
    () => mergeYoutubeCatalogForMatching(full.data, lite.data),
    [full.data, lite.data],
  );

  /**
   * True only during the window where we expect YouTube matching to run soon: key exists,
   * we do not yet have **any** merged catalog, and at least one channel request is still in flight.
   * If both requests finish with no data, this becomes false so pages fall back to RSS media
   * instead of shimmering forever.
   */
  const awaitYoutubeCatalog =
    hasApiKey &&
    !mergedCatalog &&
    (lite.loading || full.loading);

  const overlays = useMemo(() => {
    if (!mergedCatalog || !rssEpisodes?.length || slugs.length === 0) {
      return {} as Record<string, YoutubeEpisodeOverlay | null>;
    }
    const want = new Set(slugs.filter(Boolean));
    const subset = rssEpisodes.filter((e) => want.has(e.slug));
    return buildYoutubeOverlaysForEpisodes(subset, mergedCatalog);
  }, [mergedCatalog, rssEpisodes, slugsDependencyKey(slugs)]);

  return {
    overlays,
    mergedCatalog,
    /** When true, hero/cards should show `PreferredYoutubeImageSlot` with `awaitYoutubeOverlay` and no RSS image yet. */
    awaitYoutubeCatalog,
    hasApiKey,
    channelLoading: full.loading || lite.loading,
    channelError: full.error ?? lite.error,
    retryChannel: () => {
      full.retry();
      lite.retry();
    },
  };
}

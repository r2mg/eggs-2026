import { useLayoutEffect, useRef, useState } from 'react';
import type { Episode } from '../types/episode';
import type { YoutubeEpisodeOverlay } from '../types/youtubeOverlay';
import type { YouTubeChannelData } from '../lib/youtube';
import {
  computeEpisodeYoutubeOverlay,
  youtubeCandidatesFromChannelData,
} from '../lib/computeEpisodeYoutubeOverlay';

/**
 * What we store per slug after we have tried to match that episode to YouTube:
 * - an overlay object when a video matched
 * - `null` when there is definitively no match for the current catalog
 * - (missing key) means we have not processed that slug yet → keep showing the shimmer
 */
export type ArchiveYoutubeOverlayMap = Record<string, YoutubeEpisodeOverlay | null>;

type Params = {
  /**
   * Episodes in a **stable** order for enrichment (on the archive page this is the search-filtered
   * list). We only match YouTube for `filteredEpisodes.slice(0, visibleCount)` — align
   * `visibleCount` with `ARCHIVE_INITIAL_PAGE_SIZE` / `ARCHIVE_LOAD_MORE_SIZE` on the caller.
   */
  filteredEpisodes: Episode[];
  /** How many rows from the top of `filteredEpisodes` get YouTube matching on this pass. */
  visibleCount: number;
  /**
   * Video catalog used for matching — prefer the **full** channel when it exists so older
   * episodes can still match after it loads; until then the **lite** snapshot is enough for
   * the newest rows.
   */
  catalog: YouTubeChannelData | null;
  /**
   * Bump this after a manual retry / cache clear so the in-memory slug map starts fresh.
   * (Does not affect episodes the user has not scrolled to yet — those keys were never set.)
   */
  resetToken: number;
};

/**
 * All Episodes — **batch-only** YouTube overlays (no whole-archive progressive pass).
 *
 * Walks `filteredEpisodes.slice(0, visibleCount)` **from top to bottom** once per relevant
 * change, and only calls `computeEpisodeYoutubeOverlay` for slugs that are not already in the
 * map. That keeps thumbnail work aligned with visible paging and preserves earlier results.
 */
export function useYoutubeArchiveBatchOverlays({
  filteredEpisodes,
  visibleCount,
  catalog,
  resetToken,
}: Params): { overlayBySlug: ArchiveYoutubeOverlayMap } {
  const [overlayBySlug, setOverlayBySlug] = useState<ArchiveYoutubeOverlayMap>({});
  const lastResetTokenRef = useRef(resetToken);

  useLayoutEffect(() => {
    if (!catalog) return;

    const slice = filteredEpisodes.slice(0, Math.min(visibleCount, filteredEpisodes.length));
    const candidateList = youtubeCandidatesFromChannelData(catalog);

    setOverlayBySlug((prev) => {
      const resetHappened = lastResetTokenRef.current !== resetToken;
      if (resetHappened) {
        lastResetTokenRef.current = resetToken;
      }
      const base: ArchiveYoutubeOverlayMap = resetHappened ? {} : { ...prev };

      let changed = resetHappened;
      for (const ep of slice) {
        if (Object.prototype.hasOwnProperty.call(base, ep.slug)) continue;
        base[ep.slug] = computeEpisodeYoutubeOverlay(ep, catalog, candidateList);
        changed = true;
      }

      return changed ? base : prev;
    });
  }, [catalog, filteredEpisodes, visibleCount, resetToken]);

  return { overlayBySlug };
}

import { useEffect, useRef, useState } from 'react';
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

/** How many episodes we match synchronously before yielding so clicks/scroll stay responsive. */
const OVERLAY_CHUNK_SIZE = 40;

type Params = {
  /**
   * Episodes in a **stable** order for enrichment (on the archive page this is the search-filtered
   * list). We only match YouTube for `filteredEpisodes.slice(0, visibleCount)`.
   *
   * Callers usually pass `visibleCount` = paging size. For **Featured** sort/topic on `/episodes`,
   * pass `visibleCount === filteredEpisodes.length` so every row gets an overlay and `featured`
   * flags are complete for the current search.
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
 *
 * **Why `useEffect` (not `useLayoutEffect`):** matching many rows synchronously blocked the main
 * thread before paint, so the page felt frozen / unclickable. We run **after** paint and, for
 * large slices, **chunk** work with short timeouts so the browser can still handle input.
 */
export function useYoutubeArchiveBatchOverlays({
  filteredEpisodes,
  visibleCount,
  catalog,
  resetToken,
}: Params): { overlayBySlug: ArchiveYoutubeOverlayMap } {
  const [overlayBySlug, setOverlayBySlug] = useState<ArchiveYoutubeOverlayMap>({});
  const lastResetTokenRef = useRef(resetToken);
  const catalogRef = useRef(catalog);
  /** Cancels in-flight chunked work when deps change or unmount. */
  const runGenerationRef = useRef(0);

  useEffect(() => {
    if (!catalog) return;

    const slice = filteredEpisodes.slice(0, Math.min(visibleCount, filteredEpisodes.length));
    const candidateList = youtubeCandidatesFromChannelData(catalog);
    const resetHappened = lastResetTokenRef.current !== resetToken;
    if (resetHappened) {
      lastResetTokenRef.current = resetToken;
    }
    const catalogChanged = catalogRef.current !== catalog;
    catalogRef.current = catalog;
    const shouldClearAll = resetHappened || catalogChanged;

    const gen = ++runGenerationRef.current;
    let cancelled = false;
    let chunkIndex = 0;

    const processRange = (from: number, to: number) => {
      setOverlayBySlug((prev) => {
        const base =
          from === 0 && shouldClearAll ? {} : { ...prev };
        for (let i = from; i < to; i++) {
          const ep = slice[i];
          if (Object.prototype.hasOwnProperty.call(base, ep.slug)) continue;
          base[ep.slug] = computeEpisodeYoutubeOverlay(ep, catalog, candidateList);
        }
        return base;
      });
    };

    const scheduleNext = () => {
      if (cancelled || gen !== runGenerationRef.current) return;
      const from = chunkIndex * OVERLAY_CHUNK_SIZE;
      if (from >= slice.length) return;
      const to = Math.min(from + OVERLAY_CHUNK_SIZE, slice.length);
      processRange(from, to);
      chunkIndex += 1;
      if (to < slice.length) {
        window.setTimeout(scheduleNext, 0);
      }
    };

    if (slice.length === 0) return;

    // First chunk runs after paint; further chunks yield with setTimeout(0) so clicks aren’t stuck.
    window.setTimeout(scheduleNext, 0);

    return () => {
      cancelled = true;
    };
  }, [catalog, filteredEpisodes, visibleCount, resetToken]);

  return { overlayBySlug };
}

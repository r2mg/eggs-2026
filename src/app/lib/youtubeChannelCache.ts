/**
 * One shared in-flight request for `fetchYouTubeChannelData()` so every hook that needs
 * YouTube hits the network **once**, then reuses the result.
 *
 * The homepage uses a **separate** lighter cache (`getYoutubeChannelHomeLiteCached`) so
 * first paint does not wait on the full channel merge used by the archive.
 */

import {
  fetchYouTubeChannelData,
  fetchYouTubeChannelHomeLite,
  getYouTubeApiKey,
  type YouTubeChannelData,
} from './youtube';

const empty: YouTubeChannelData = {
  uploadsPlaylistId: null,
  playlists: [],
  videosById: new Map(),
  blockedVideoIds: new Set(),
};

let inflight: Promise<YouTubeChannelData> | null = null;
let inflightHomeLite: Promise<YouTubeChannelData> | null = null;

/** Clears both memos so the next caller fetches again (used by “retry” in dev). */
export function clearYoutubeChannelCache(): void {
  inflight = null;
  inflightHomeLite = null;
}

/**
 * Returns cached channel snapshot, or starts a single fetch shared by all subscribers.
 * When the API key is missing, resolves immediately to an empty structure (no throw).
 */
export function getYoutubeChannelDataCached(): Promise<YouTubeChannelData> {
  if (!getYouTubeApiKey()) {
    return Promise.resolve(empty);
  }
  if (!inflight) {
    inflight = fetchYouTubeChannelData().catch((err) => {
      inflight = null;
      throw err;
    });
  }
  return inflight;
}

/**
 * Smaller YouTube payload for the **homepage only** (see `fetchYouTubeChannelHomeLite` in `youtube.ts`).
 * Archive pages should keep using `getYoutubeChannelDataCached()`.
 */
export function getYoutubeChannelHomeLiteCached(): Promise<YouTubeChannelData> {
  if (!getYouTubeApiKey()) {
    return Promise.resolve(empty);
  }
  if (!inflightHomeLite) {
    inflightHomeLite = fetchYouTubeChannelHomeLite().catch((err) => {
      inflightHomeLite = null;
      throw err;
    });
  }
  return inflightHomeLite;
}

/**
 * One catalog object for **matching** RSS episodes to YouTube (same rules as
 * `buildYoutubeOverlaysForEpisodes` / `computeEpisodeYoutubeOverlay` everywhere).
 *
 * Prefer the **full** channel merge when it exists (complete `videosById` for older episodes);
 * otherwise use the **lite** snapshot (fast, smaller caps — see `fetchYouTubeChannelHomeLite`).
 */
export function mergeYoutubeCatalogForMatching(
  full: YouTubeChannelData | null | undefined,
  lite: YouTubeChannelData | null | undefined,
): YouTubeChannelData | null {
  return full ?? lite ?? null;
}

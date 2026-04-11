/**
 * One shared in-flight request for `fetchYouTubeChannelData()` so every hook that needs
 * YouTube hits the network **once**, then reuses the result.
 */

import { fetchYouTubeChannelData, getYouTubeApiKey, type YouTubeChannelData } from './youtube';

const empty: YouTubeChannelData = {
  uploadsPlaylistId: null,
  playlists: [],
  videosById: new Map(),
  blockedVideoIds: new Set(),
};

let inflight: Promise<YouTubeChannelData> | null = null;

/** Clears the memo so the next caller fetches again (used by “retry” in dev). */
export function clearYoutubeChannelCache(): void {
  inflight = null;
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

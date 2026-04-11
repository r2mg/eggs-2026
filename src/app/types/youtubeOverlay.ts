import type { Episode } from './episode';

/**
 * YouTube-only fields layered on top of a stable RSS `Episode`.
 * Kept separate so the RSS list never has to be replaced when YouTube finishes loading.
 */
export type YoutubeEpisodeOverlay = {
  youtubeVideoId?: string;
  youtubeUrl?: string;
  youtubeEmbedUrl?: string;
  youtubeThumbnail?: string;
  featured?: boolean;
  featuredRank?: number;
  collections?: string[];
  startHere?: boolean;
};

/**
 * Merge for **display only** — does not mutate the RSS episode object.
 * Components pass `rssEpisode` + optional overlay to get one object for JSX.
 */
export function mergeEpisodeForDisplay(ep: Episode, overlay?: YoutubeEpisodeOverlay | null): Episode {
  if (!overlay) return ep;
  return { ...ep, ...overlay };
}

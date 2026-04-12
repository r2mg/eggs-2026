/**
 * Computes YouTube-only fields for one RSS episode using already-fetched channel data.
 * Shared by full-feed enrichment (legacy), per-slug hooks, and the archive “overlay map”.
 */

import type { Episode } from '../types/episode';
import type { YoutubeEpisodeOverlay } from '../types/youtubeOverlay';
import {
  pickBestThumbnailUrl,
  resolveEditorialPlaylistIds,
  type YouTubeChannelData,
  type YouTubeVideo,
} from './youtube';
import { resolveYouTubeForEpisode, type YoutubeCandidate } from './youtubeMatching';
import { youtubeHqThumbnailUrl } from './youtubeThumbnails';

function toCandidate(v: YouTubeVideo): YoutubeCandidate {
  return {
    videoId: v.videoId,
    title: v.title,
    publishedAt: v.publishedAt,
    thumbnailUrl: pickBestThumbnailUrl(v.thumbnails),
  };
}

function collectionsForVideo(
  yv: YouTubeVideo,
  titleById: Map<string, string>,
  uploadsId: string | null | undefined,
  featuredId: string | null,
  startHereId: string | null,
): string[] {
  const out: string[] = [];
  for (const id of yv.playlistIds ?? []) {
    if (id === uploadsId || id === featuredId || id === startHereId) continue;
    const t = titleById.get(id);
    if (t) out.push(t);
  }
  return out;
}

/** Build the candidate list once per channel snapshot (same as enrichment). */
export function youtubeCandidatesFromChannelData(data: YouTubeChannelData): YoutubeCandidate[] {
  return Array.from(data.videosById.values()).map(toCandidate);
}

/**
 * Returns overlay fields when we can match a YouTube video; returns `null` when there is
 * no safe match (RSS-only for video UI).
 */
export function computeEpisodeYoutubeOverlay(
  ep: Episode,
  data: YouTubeChannelData,
  catalog: YoutubeCandidate[],
): YoutubeEpisodeOverlay | null {
  const titleById = new Map(data.playlists.map((p) => [p.id, p.title]));
  const { featuredId, startHereId } = resolveEditorialPlaylistIds(data.playlists);
  const uploadsId = data.uploadsPlaylistId;
  const blocked = data.blockedVideoIds;

  const resolved = resolveYouTubeForEpisode(ep, catalog);
  if (!resolved.videoId || !resolved.watchUrl || blocked.has(resolved.videoId)) {
    return null;
  }

  const yv = data.videosById.get(resolved.videoId);
  const thumb =
    pickBestThumbnailUrl(yv?.thumbnails) ??
    resolved.thumbnailUrl?.trim() ??
    youtubeHqThumbnailUrl(resolved.videoId);

  const collections = yv ? collectionsForVideo(yv, titleById, uploadsId, featuredId, startHereId) : [];

  const inFeatured = !!(yv && featuredId && yv.playlistIds?.includes(featuredId));
  const inStartHere = !!(yv && startHereId && yv.playlistIds?.includes(startHereId));

  return {
    youtubeVideoId: resolved.videoId,
    youtubeUrl: resolved.watchUrl,
    youtubeEmbedUrl: `https://www.youtube.com/embed/${resolved.videoId}`,
    youtubeThumbnail: thumb,
    featured: inFeatured || !!ep.featured,
    featuredRank: inFeatured ? yv?.positionsByPlaylist?.[featuredId!] : ep.featuredRank,
    collections,
    startHere: inStartHere || !!ep.startHere,
  };
}

/**
 * One overlay entry per episode slug: a matched object, or **`null`** when we tried and found
 * no confident YouTube video. Callers can tell “still loading” (no key yet) from “RSS-only for
 * media” (`null`) — same contract as the archive batch map.
 */
export function buildYoutubeOverlaysForEpisodes(
  episodes: Episode[],
  data: YouTubeChannelData,
): Record<string, YoutubeEpisodeOverlay | null> {
  const catalog = youtubeCandidatesFromChannelData(data);
  const out: Record<string, YoutubeEpisodeOverlay | null> = {};
  for (const ep of episodes) {
    out[ep.slug] = computeEpisodeYoutubeOverlay(ep, data, catalog);
  }
  return out;
}

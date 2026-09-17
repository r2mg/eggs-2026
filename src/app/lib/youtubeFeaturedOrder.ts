/**
 * Orders RSS episodes to match the **EGGS Featured** playlist (same playlist id as everywhere:
 * `KNOWN_PLAYLIST_IDS.featured` in `youtubeChannel.ts`, else title `EGGS Featured`).
 */

import type { Episode } from '../types/episode';
import type { YoutubeEpisodeOverlay } from '../types/youtubeOverlay';
import { resolveEditorialPlaylistIds, type YouTubeChannelData } from './youtube';
import { resolveYouTubeForEpisode } from './youtubeMatching';
import { youtubeCandidatesFromChannelData } from './computeEpisodeYoutubeOverlay';

function episodeByYoutubeVideoId(
  episodes: Episode[],
  overlays: Record<string, YoutubeEpisodeOverlay | null> | undefined,
): Map<string, Episode> {
  const map = new Map<string, Episode>();
  for (const ep of episodes) {
    const id = overlays?.[ep.slug]?.youtubeVideoId || ep.youtubeVideoId;
    if (id && !map.has(id)) map.set(id, ep);
  }
  return map;
}

/** Playlist video ids → RSS episodes, in the given order. Skips ids with no episode match. */
export function episodesFromFeaturedVideoIds(
  episodes: Episode[],
  videoIds: string[],
  overlays?: Record<string, YoutubeEpisodeOverlay | null>,
  excludeSlug?: string,
): Episode[] {
  if (videoIds.length === 0) return [];
  const byId = episodeByYoutubeVideoId(episodes, overlays);
  const used = new Set<string>();
  const out: Episode[] = [];
  for (const videoId of videoIds) {
    const ep = byId.get(videoId);
    if (!ep || ep.slug === excludeSlug || used.has(ep.slug)) continue;
    used.add(ep.slug);
    out.push(ep);
  }
  return out;
}

/**
 * RSS episodes that appear in the Featured playlist, in playlist order (first item first).
 * Prefers already-matched overlay video ids so retitled YouTube uploads still count.
 */
export function getFeaturedEpisodesInPlaylistOrder(
  rssEpisodes: Episode[],
  data: YouTubeChannelData,
  overlays?: Record<string, YoutubeEpisodeOverlay | null>,
): Episode[] {
  const { featuredId } = resolveEditorialPlaylistIds(data.playlists);
  if (!featuredId) return [];

  const catalog = youtubeCandidatesFromChannelData(data);
  const blocked = data.blockedVideoIds;
  const byOverlayId = episodeByYoutubeVideoId(rssEpisodes, overlays);

  const inPlaylist = [...data.videosById.values()]
    .filter((yv) => yv.playlistIds?.includes(featuredId) && !blocked.has(yv.videoId))
    .sort(
      (a, b) =>
        (a.positionsByPlaylist?.[featuredId] ?? 9999) - (b.positionsByPlaylist?.[featuredId] ?? 9999),
    );

  const usedSlugs = new Set<string>();
  const out: Episode[] = [];

  for (const yv of inPlaylist) {
    if (blocked.has(yv.videoId)) continue;
    const match =
      byOverlayId.get(yv.videoId) ??
      rssEpisodes.find((ep) => {
        const r = resolveYouTubeForEpisode(ep, catalog);
        return r.videoId === yv.videoId && !!r.videoId;
      });
    if (match && !usedSlugs.has(match.slug)) {
      usedSlugs.add(match.slug);
      out.push(match);
    }
  }

  return out;
}

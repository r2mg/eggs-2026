/**
 * Orders RSS episodes to match the **EGGS Featured** playlist (same playlist id as everywhere:
 * `KNOWN_PLAYLIST_IDS.featured` in `youtubeChannel.ts`, else title `EGGS Featured`).
 */

import type { Episode } from '../types/episode';
import { resolveEditorialPlaylistIds, type YouTubeChannelData } from './youtube';
import { resolveYouTubeForEpisode } from './youtubeMatching';
import { youtubeCandidatesFromChannelData } from './computeEpisodeYoutubeOverlay';

/**
 * RSS episodes that appear in the Featured playlist, in playlist order (first item first).
 */
export function getFeaturedEpisodesInPlaylistOrder(
  rssEpisodes: Episode[],
  data: YouTubeChannelData,
): Episode[] {
  const { featuredId } = resolveEditorialPlaylistIds(data.playlists);
  if (!featuredId) return [];

  const catalog = youtubeCandidatesFromChannelData(data);
  const blocked = data.blockedVideoIds;

  const inPlaylist = [...data.videosById.values()]
    .filter((yv) => yv.playlistIds?.includes(featuredId) && !blocked.has(yv.videoId))
    .sort(
      (a, b) =>
        (a.positionsByPlaylist?.[featuredId] ?? 9999) - (b.positionsByPlaylist?.[featuredId] ?? 9999),
    );

  const usedSlugs = new Set<string>();
  const out: Episode[] = [];

  for (const yv of inPlaylist) {
    const match = rssEpisodes.find((ep) => {
      const r = resolveYouTubeForEpisode(ep, catalog);
      return r.videoId === yv.videoId && r.videoId && !blocked.has(r.videoId);
    });
    if (match && !usedSlugs.has(match.slug)) {
      usedSlugs.add(match.slug);
      out.push(match);
    }
  }

  return out;
}

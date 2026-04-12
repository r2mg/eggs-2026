/**
 * Optional **batch** merge of YouTube data into RSS episodes (legacy / debugging).
 * ---------------------------------------------------------------------------
 * The live site prefers **separate** overlays (`computeEpisodeYoutubeOverlay` +
 * `mergeEpisodeForDisplay`) so RSS rows stay stable. This function remains useful for
 * scripts or one-off tooling that want a merged array in memory.
 */

import type { Episode } from '../types/episode';
import {
  expectedTopicPlaylistTitles,
  fetchYouTubeChannelData,
  getYouTubeApiKey,
  type YouTubeChannelData,
} from './youtube';
import { buildYoutubeOverlaysForEpisodes } from './computeEpisodeYoutubeOverlay';

export type YoutubeEnrichmentInfo = {
  usedApi: boolean;
  skippedReason?: 'missing_api_key' | 'fetch_error';
  uploadsPlaylistId?: string | null;
  playlistCount: number;
  uniqueVideoCount: number;
  matchedEpisodeCount: number;
  unmatchedEpisodes: { slug: string; title: string }[];
  topicCards: { label: string; episodeCount: number; playlistTitle: string }[];
  errorMessage?: string;
};

function emptyInfo(partial: Partial<YoutubeEnrichmentInfo>): YoutubeEnrichmentInfo {
  return {
    usedApi: false,
    playlistCount: 0,
    uniqueVideoCount: 0,
    matchedEpisodeCount: 0,
    unmatchedEpisodes: [],
    topicCards: [],
    ...partial,
  };
}

/**
 * Fetches YouTube channel data once, builds overlays, returns merged episodes + stats.
 * Prefer the hook-based overlay flow in the UI for stable RSS rendering.
 */
export async function enrichEpisodesWithYouTube(episodes: Episode[]): Promise<{
  episodes: Episode[];
  youtubeInfo: YoutubeEnrichmentInfo;
}> {
  if (!getYouTubeApiKey()) {
    return {
      episodes: episodes.map((e) => ({ ...e })),
      youtubeInfo: emptyInfo({ skippedReason: 'missing_api_key' }),
    };
  }

  let data: YouTubeChannelData;
  try {
    data = await fetchYouTubeChannelData();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[EGGS YouTube API] Could not load channel data — continuing with RSS only.', e);
    return {
      episodes: episodes.map((e) => ({ ...e })),
      youtubeInfo: emptyInfo({
        usedApi: true,
        skippedReason: 'fetch_error',
        errorMessage: msg,
      }),
    };
  }

  const overlays = buildYoutubeOverlaysForEpisodes(episodes, data);
  const out = episodes.map((ep) => {
    const o = overlays[ep.slug];
    return o ? { ...ep, ...o } : { ...ep };
  });

  const matched = episodes.filter((ep) => overlays[ep.slug]).length;
  const unmatched = episodes.filter((ep) => !overlays[ep.slug]).map((ep) => ({ slug: ep.slug, title: ep.title }));

  console.log(
    `[EGGS YouTube API] Channel playlists loaded: ${data.playlists.length}. Uploads playlist id: ${data.uploadsPlaylistId ?? '(none)'}.`,
  );
  console.log(`[EGGS YouTube API] Unique YouTube videos merged from playlists: ${data.videosById.size}.`);
  console.log(`[EGGS YouTube API] Matched ${matched} / ${episodes.length} RSS episodes to a YouTube video.`);
  if (unmatched.length > 0) {
    console.warn(
      '[EGGS YouTube API] Episodes without a confident YouTube match (RSS-only for YouTube fields):',
      unmatched.map((u) => `${u.slug} — ${u.title}`),
    );
  }

  const topicCards = expectedTopicPlaylistTitles().map((playlistTitle) => ({
    playlistTitle,
    label: playlistTitle.replace(/^EGGS\s+/i, '').trim(),
    episodeCount: out.filter((e) => e.collections?.includes(playlistTitle)).length,
  }));

  return {
    episodes: out,
    youtubeInfo: {
      usedApi: true,
      uploadsPlaylistId: data.uploadsPlaylistId,
      playlistCount: data.playlists.length,
      uniqueVideoCount: data.videosById.size,
      matchedEpisodeCount: matched,
      unmatchedEpisodes: unmatched,
      topicCards,
    },
  };
}

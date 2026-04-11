/**
 * After RSS episodes are loaded, this file optionally enriches them with YouTube Data.
 *
 * **Order of truth:**
 * 1. RSS always supplies the episode list, titles, summaries, audio, Spotify links, etc.
 * 2. YouTube (when the API key is present and the request succeeds) adds:
 *    widescreen thumbnails, watch/embed URLs, `featured` / `featuredRank`, `collections`,
 *    and `startHere` based on which **playlists** each video belongs to.
 * 3. If anything goes wrong, you still get the same RSS episodes — nothing is deleted.
 */

import type { Episode } from '../types/episode';
import {
  expectedTopicPlaylistTitles,
  fetchYouTubeChannelData,
  getYouTubeApiKey,
  pickBestThumbnailUrl,
  resolveEditorialPlaylistIds,
  type YouTubeChannelData,
  type YouTubeVideo,
} from './youtube';
import { resolveYouTubeForEpisode, type YoutubeCandidate } from './youtubeMatching';
import { youtubeHqThumbnailUrl } from './youtubeThumbnails';

export type YoutubeEnrichmentInfo = {
  /** `true` only when a key was present and we attempted a full fetch */
  usedApi: boolean;
  skippedReason?: 'missing_api_key' | 'fetch_error';
  uploadsPlaylistId?: string | null;
  playlistCount: number;
  uniqueVideoCount: number;
  matchedEpisodeCount: number;
  unmatchedEpisodes: { slug: string; title: string }[];
  /** For the Home “Explore by Topic” grid — counts from `Episode.collections` */
  topicCards: { label: string; episodeCount: number; playlistTitle: string }[];
  errorMessage?: string;
};

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

/**
 * Returns **new** episode objects so the RSS parser output is never mutated in place.
 */
export async function enrichEpisodesWithYouTube(episodes: Episode[]): Promise<{
  episodes: Episode[];
  youtubeInfo: YoutubeEnrichmentInfo;
}> {
  const emptyInfo = (partial: Partial<YoutubeEnrichmentInfo>): YoutubeEnrichmentInfo => ({
    usedApi: false,
    playlistCount: 0,
    uniqueVideoCount: 0,
    matchedEpisodeCount: 0,
    unmatchedEpisodes: [],
    topicCards: [],
    ...partial,
  });

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

  const titleById = new Map(data.playlists.map((p) => [p.id, p.title]));
  const { featuredId, startHereId } = resolveEditorialPlaylistIds(data.playlists);
  const uploadsId = data.uploadsPlaylistId;
  const blocked = data.blockedVideoIds;

  const catalog: YoutubeCandidate[] = Array.from(data.videosById.values()).map(toCandidate);

  console.log(
    `[EGGS YouTube API] Channel playlists loaded: ${data.playlists.length}. Uploads playlist id: ${data.uploadsPlaylistId ?? '(none)'}.`,
  );
  console.log(`[EGGS YouTube API] Unique YouTube videos merged from playlists: ${data.videosById.size}.`);

  const unmatched: { slug: string; title: string }[] = [];
  let matched = 0;
  let rejectedBlocked = 0;

  const out: Episode[] = episodes.map((ep) => {
    const resolved = resolveYouTubeForEpisode(ep, catalog);
    if (!resolved.videoId || !resolved.watchUrl || blocked.has(resolved.videoId)) {
      if (resolved.videoId && blocked.has(resolved.videoId)) rejectedBlocked += 1;
      unmatched.push({ slug: ep.slug, title: ep.title });
      return { ...ep };
    }

    matched += 1;
    const yv = data.videosById.get(resolved.videoId);
    const thumb =
      pickBestThumbnailUrl(yv?.thumbnails) ??
      resolved.thumbnailUrl?.trim() ??
      youtubeHqThumbnailUrl(resolved.videoId);

    const collections = yv ? collectionsForVideo(yv, titleById, uploadsId, featuredId, startHereId) : [];

    const inFeatured = !!(yv && featuredId && yv.playlistIds?.includes(featuredId));
    const inStartHere = !!(yv && startHereId && yv.playlistIds?.includes(startHereId));

    return {
      ...ep,
      youtubeVideoId: resolved.videoId,
      youtubeUrl: resolved.watchUrl,
      youtubeEmbedUrl: `https://www.youtube.com/embed/${resolved.videoId}`,
      youtubeThumbnail: thumb,
      featured: inFeatured || !!ep.featured,
      featuredRank: inFeatured ? yv?.positionsByPlaylist?.[featuredId!] : ep.featuredRank,
      collections,
      startHere: inStartHere || !!ep.startHere,
    };
  });

  console.log(`[EGGS YouTube API] Matched ${matched} / ${episodes.length} RSS episodes to a YouTube video.`);
  if (rejectedBlocked > 0) {
    console.log(
      `[EGGS YouTube API] Ignored ${rejectedBlocked} would-be match(es) whose video id is on an excluded playlist (e.g. audio edition).`,
    );
  }
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
      uploadsPlaylistId: uploadsId,
      playlistCount: data.playlists.length,
      uniqueVideoCount: data.videosById.size,
      matchedEpisodeCount: matched,
      unmatchedEpisodes: unmatched,
      topicCards,
    },
  };
}

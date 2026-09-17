/**
 * Public YouTube Atom feed — no Data API key, no quota.
 * Only the newest ~15 uploads; enough to catch this week's long-form episode.
 */
import { XMLParser } from 'fast-xml-parser';
import { KNOWN_PLAYLIST_IDS, YOUTUBE_CHANNEL_ID } from '../config/youtubeChannel';
import type { Episode } from '../types/episode';
import type { YoutubeEpisodeOverlay } from '../types/youtubeOverlay';
import { isLikelyYouTubeShortTitle } from './youtubeShorts';
import { emptyYouTubeChannelData, type YouTubeChannelData, type YouTubeVideo } from './youtube';
import { resolveYouTubeForEpisode } from './youtubeMatching';
import { youtubeCandidatesFromChannelData } from './computeEpisodeYoutubeOverlay';
import { youtubeHqThumbnailUrl, youtubeMaxresThumbnailUrl } from './youtubeThumbnails';

const YOUTUBE_FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${YOUTUBE_CHANNEL_ID}`;

const ATOM_XML_PARSER = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  trimValues: true,
});

function ensureArray(value: unknown): unknown[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function pickString(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string') return value.trim() || undefined;
  if (typeof value === 'object' && value && '#text' in value) {
    const text = String((value as { '#text': unknown })['#text']).trim();
    return text || undefined;
  }
  return String(value).trim() || undefined;
}

export async function fetchYouTubeAtomChannelData(): Promise<YouTubeChannelData> {
  const data = emptyYouTubeChannelData();
  try {
    const res = await fetch(YOUTUBE_FEED_URL, {
      cache: 'no-store',
      headers: {
        'user-agent': 'eggs-site-build/1.0',
        'Cache-Control': 'no-cache',
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`Atom feed ${res.status}`);
    const xml = await res.text();
    const parsed = ATOM_XML_PARSER.parse(xml);
    const entries = ensureArray(parsed?.feed?.entry);
    for (const entry of entries) {
      const title = pickString((entry as { title?: unknown }).title);
      if (isLikelyYouTubeShortTitle(title)) continue;
      const videoId =
        pickString((entry as { 'yt:videoId'?: unknown })['yt:videoId']) ??
        pickString((entry as { id?: unknown }).id)?.replace(/^yt:video:/, '');
      if (!videoId || videoId.length !== 11) continue;
      const publishedAt = pickString((entry as { published?: unknown }).published);
      const video: YouTubeVideo = {
        videoId,
        title: title || '(untitled)',
        publishedAt,
        thumbnails: { high: youtubeHqThumbnailUrl(videoId), maxres: youtubeMaxresThumbnailUrl(videoId) },
        youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
        embedUrl: `https://www.youtube.com/embed/${videoId}`,
      };
      data.videosById.set(videoId, video);
    }
    console.log(`[EGGS YouTube Atom] Loaded ${data.videosById.size} long-form video(s) from the public feed.`);
  } catch (err) {
    console.warn('[EGGS YouTube Atom] Feed load skipped:', err instanceof Error ? err.message : err);
  }
  return data;
}

/**
 * Public playlist Atom — no Data API. Order follows the feed (same as the playlist page
 * for the small EGGS Featured list). Caps around 15 items, which is enough for Featured.
 */
export async function fetchYouTubePlaylistOrderedVideoIds(playlistId: string): Promise<string[]> {
  const url = `https://www.youtube.com/feeds/videos.xml?playlist_id=${encodeURIComponent(playlistId)}`;
  const ids: string[] = [];
  try {
    const res = await fetch(url, {
      cache: 'no-store',
      headers: {
        'user-agent': 'eggs-site-build/1.0',
        'Cache-Control': 'no-cache',
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`playlist Atom ${res.status}`);
    const xml = await res.text();
    const parsed = ATOM_XML_PARSER.parse(xml);
    for (const entry of ensureArray(parsed?.feed?.entry)) {
      const videoId =
        pickString((entry as { 'yt:videoId'?: unknown })['yt:videoId']) ??
        pickString((entry as { id?: unknown }).id)?.replace(/^yt:video:/, '');
      if (!videoId || videoId.length !== 11 || ids.includes(videoId)) continue;
      ids.push(videoId);
    }
    console.log(`[EGGS YouTube Atom] Playlist ${playlistId.slice(0, 8)}…: ${ids.length} video(s).`);
  } catch (err) {
    console.warn('[EGGS YouTube Atom] Playlist feed skipped:', err instanceof Error ? err.message : err);
  }
  return ids;
}

export async function fetchFeaturedPlaylistVideoIds(): Promise<string[]> {
  const id = KNOWN_PLAYLIST_IDS.featured;
  if (!id) return [];
  return fetchYouTubePlaylistOrderedVideoIds(id);
}

export function applyAtomOverlays(
  overlays: Record<string, YoutubeEpisodeOverlay | null>,
  episodes: Episode[],
  atom: YouTubeChannelData,
): number {
  if (atom.videosById.size === 0) return 0;
  const catalog = youtubeCandidatesFromChannelData(atom);
  let applied = 0;
  for (const ep of episodes) {
    if (overlays[ep.slug]?.youtubeVideoId) continue;
    const resolved = resolveYouTubeForEpisode(ep, catalog);
    if (!resolved.videoId || !resolved.watchUrl) continue;
    overlays[ep.slug] = {
      youtubeVideoId: resolved.videoId,
      youtubeUrl: resolved.watchUrl,
      youtubeEmbedUrl: `https://www.youtube.com/embed/${resolved.videoId}`,
      youtubeThumbnail: resolved.thumbnailUrl?.trim() || youtubeMaxresThumbnailUrl(resolved.videoId),
    };
    applied += 1;
  }
  return applied;
}

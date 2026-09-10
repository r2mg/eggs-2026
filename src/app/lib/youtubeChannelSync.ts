/**
 * Build-time YouTube catalog: persist last success, merge “what’s new”, never wipe the
 * site to RSS-only when quota is gone.
 *
 * - First run / stale catalog: full playlist fetch, then merge into any existing cache
 *   (so older long-form videos are not discarded when Shorts fill the newest-450 window).
 * - Fresh catalog: walk uploads newest-first until we hit videos we already know.
 * - Shorts / hashtag clips are not stored for episode matching.
 */

import { isLikelyYouTubeShortTitle } from './youtubeShorts';
import { isAudioEditionVideoTitle, YOUTUBE_CHANNEL_ID } from '../config/youtubeChannel';
import {
  channelDataToPersisted,
  isYouTubeQuotaExhaustedToday,
  loadPersistedYouTubeCatalog,
  markYouTubeQuotaExhausted,
  persistedToChannelData,
  savePersistedYouTubeCatalog,
} from './youtubeChannelStore';
import {
  cloneYouTubeChannelData,
  emptyYouTubeChannelData,
  fetchChannelUploadsPlaylistId,
  fetchPlaylistItemsPage,
  fetchYouTubeChannelData,
  getYouTubeApiKey,
  getYouTubeRequestCount,
  isYouTubeQuotaError,
  mergePlaylistItemIntoCatalog,
  resetYouTubeRequestCount,
  type YouTubeChannelData,
  type YouTubeVideo,
} from './youtube';

/** Topic / Audio Edition / featured membership refresh at most once per day (when a build runs). */
const FULL_REFRESH_MS = 24 * 60 * 60 * 1000;

/** Stop incremental paging after this many known long-form videos in a row. */
const INCREMENTAL_CONSECUTIVE_KNOWN = 3;

/** Safety cap: 8 pages × 50 = 400 newest uploads (covers a large Shorts burst). */
const INCREMENTAL_MAX_PAGES = 8;

export type YoutubeCatalogSource = 'full' | 'incremental' | 'cache' | 'empty';

export type YoutubeCatalogForBuild = {
  data: YouTubeChannelData;
  source: YoutubeCatalogSource;
};

function dropShortFormVideos(data: YouTubeChannelData): number {
  let removed = 0;
  for (const [id, video] of data.videosById) {
    if (isLikelyYouTubeShortTitle(video.title) || isAudioEditionVideoTitle(video.title)) {
      data.videosById.delete(id);
      removed += 1;
    }
  }
  return removed;
}

function applyBlockedIds(data: YouTubeChannelData): number {
  let removed = 0;
  for (const id of data.blockedVideoIds) {
    if (data.videosById.delete(id)) removed += 1;
  }
  return removed;
}

/** Keep historical long-form videos; overlay this fetch’s titles, thumbs, and playlists. */
export function mergeChannelCatalogs(
  base: YouTubeChannelData,
  incoming: YouTubeChannelData,
): YouTubeChannelData {
  const out = cloneYouTubeChannelData(base);
  out.uploadsPlaylistId = incoming.uploadsPlaylistId ?? out.uploadsPlaylistId;
  if (incoming.playlists.length > 0) out.playlists = incoming.playlists;

  for (const id of incoming.blockedVideoIds) out.blockedVideoIds.add(id);

  for (const [id, video] of incoming.videosById) {
    if (isLikelyYouTubeShortTitle(video.title) || isAudioEditionVideoTitle(video.title)) continue;
    const existing = out.videosById.get(id);
    if (!existing) {
      out.videosById.set(id, video);
      continue;
    }
    out.videosById.set(id, mergeVideoRecords(existing, video));
  }

  applyBlockedIds(out);
  dropShortFormVideos(out);
  return out;
}

function mergeVideoRecords(existing: YouTubeVideo, incoming: YouTubeVideo): YouTubeVideo {
  const playlistIds = [...new Set([...(existing.playlistIds ?? []), ...(incoming.playlistIds ?? [])])];
  const playlistTitles = [...new Set([...(existing.playlistTitles ?? []), ...(incoming.playlistTitles ?? [])])];
  return {
    ...existing,
    ...incoming,
    playlistIds,
    playlistTitles,
    positionsByPlaylist: {
      ...(existing.positionsByPlaylist ?? {}),
      ...(incoming.positionsByPlaylist ?? {}),
    },
    thumbnails: incoming.thumbnails ?? existing.thumbnails,
    description: incoming.description || existing.description,
  };
}

async function syncNewUploads(cached: YouTubeChannelData): Promise<{
  data: YouTubeChannelData;
  pages: number;
  added: number;
}> {
  const data = cloneYouTubeChannelData(cached);
  const uploadsId =
    data.uploadsPlaylistId ?? (await fetchChannelUploadsPlaylistId(YOUTUBE_CHANNEL_ID));
  if (!uploadsId) return { data, pages: 0, added: 0 };
  data.uploadsPlaylistId = uploadsId;

  const uploadsMeta = data.playlists.find((p) => p.id === uploadsId);
  const playlistTitle = uploadsMeta?.title ?? 'Uploads';

  let pageToken: string | undefined;
  let pages = 0;
  let added = 0;
  let consecutiveKnown = 0;
  let caughtUp = false;

  while (pages < INCREMENTAL_MAX_PAGES && !caughtUp) {
    const page = await fetchPlaylistItemsPage(uploadsId, pageToken);
    pages += 1;
    if (page.items.length === 0) break;

    for (const row of page.items) {
      const vid = row.snippet?.resourceId?.videoId;
      if (!vid || vid.length !== 11) continue;
      const title = row.snippet?.title;
      if (isLikelyYouTubeShortTitle(title) || isAudioEditionVideoTitle(title)) continue;

      const known = data.videosById.has(vid);
      mergePlaylistItemIntoCatalog(
        data.videosById,
        vid,
        row.snippet,
        { id: uploadsId, title: playlistTitle },
        row.snippet?.position ?? 0,
        row.contentDetails?.videoPublishedAt,
      );
      if (known) {
        consecutiveKnown += 1;
        if (consecutiveKnown >= INCREMENTAL_CONSECUTIVE_KNOWN) {
          caughtUp = true;
          break;
        }
      } else {
        consecutiveKnown = 0;
        added += 1;
      }
    }

    pageToken = page.nextPageToken;
    if (!pageToken) break;
  }

  applyBlockedIds(data);
  dropShortFormVideos(data);
  return { data, pages, added };
}

function cacheIsFresh(lastFullFetchAt: string): boolean {
  const at = Date.parse(lastFullFetchAt);
  if (Number.isNaN(at)) return false;
  return Date.now() - at < FULL_REFRESH_MS;
}

let inflight: Promise<YoutubeCatalogForBuild> | null = null;

function youtubeSyncAllowed(): boolean {
  if (process.env.EGGS_YOUTUBE_SYNC === '1') return true;
  try {
    return Boolean(import.meta.env?.DEV);
  } catch {
    return false;
  }
}

/**
 * Download / refresh the catalog **once** at the start of `astro build`.
 * Page rendering must not call the Data API — Astro can prerender routes in
 * parallel isolates, and an in-memory promise does not span those workers.
 */
export async function warmupYouTubeCatalogForBuild(): Promise<YoutubeCatalogForBuild> {
  process.env.EGGS_YOUTUBE_SYNC = '1';
  inflight = null;
  const result = await getYouTubeChannelDataForBuild();
  console.log(
    `[EGGS YouTube catalog] Warmup done: source=${result.source}, videos=${result.data.videosById.size}, Data API requests=${getYouTubeRequestCount()}.`,
  );
  return result;
}

/**
 * Resolve the YouTube catalog for this build. During page generation this only
 * reads the catalog saved by `warmupYouTubeCatalogForBuild`.
 */
export function getYouTubeChannelDataForBuild(): Promise<YoutubeCatalogForBuild> {
  if (!inflight) inflight = resolveYouTubeCatalogForBuild();
  return inflight;
}

async function resolveYouTubeCatalogForBuild(): Promise<YoutubeCatalogForBuild> {
  const persisted = await loadPersistedYouTubeCatalog();
  const cached = persisted ? persistedToChannelData(persisted) : null;
  const hasCache = !!(cached && cached.videosById.size > 0);
  const key = getYouTubeApiKey();
  const allowFetch = youtubeSyncAllowed();

  if (!key) {
    if (hasCache && cached) {
      console.info('[EGGS build] No YouTube API key — using saved catalog.');
      return { data: cached, source: 'cache' };
    }
    console.info(
      '[EGGS build] No YouTube API key (YOUTUBE_API_KEY) — building RSS-only (no thumbnails/topics/featured).',
    );
    return { data: emptyYouTubeChannelData(), source: 'empty' };
  }

  if (!allowFetch) {
    if (hasCache && cached) {
      console.info(
        `[EGGS build] Using warmed YouTube catalog (${cached.videosById.size} videos) — no Data API during page render.`,
      );
      return { data: cached, source: 'cache' };
    }
    console.info(
      '[EGGS build] YouTube catalog was not warmed before page render — RSS-only for this process.',
    );
    return { data: emptyYouTubeChannelData(), source: 'empty' };
  }

  if (await isYouTubeQuotaExhaustedToday()) {
    if (hasCache && cached) {
      console.info(
        '[EGGS build] YouTube quota already exhausted today — using saved catalog (no Data API calls).',
      );
      return { data: cached, source: 'cache' };
    }
    console.info(
      '[EGGS build] Quota marker is set but no catalog is saved — attempting one warmup fetch.',
    );
  }

  const needsFull = !persisted || !cacheIsFresh(persisted.lastFullFetchAt);

  try {
    resetYouTubeRequestCount();
    if (needsFull) {
      const fetched = await fetchYouTubeChannelData();
      dropShortFormVideos(fetched);
      const data = hasCache && cached ? mergeChannelCatalogs(cached, fetched) : fetched;
      applyBlockedIds(data);
      const now = new Date().toISOString();
      await savePersistedYouTubeCatalog(channelDataToPersisted(data, now, now));
      console.log(
        `[EGGS YouTube catalog] Full refresh merged to ${data.videosById.size} long-form videos (${getYouTubeRequestCount()} Data API requests).`,
      );
      return { data, source: 'full' };
    }

    const { data, pages, added } = await syncNewUploads(cached!);
    await savePersistedYouTubeCatalog(
      channelDataToPersisted(data, persisted!.lastFullFetchAt),
    );
    console.log(
      `[EGGS YouTube catalog] Incremental uploads: ${pages} page(s), ${added} new long-form video(s), catalog ${data.videosById.size} (${getYouTubeRequestCount()} Data API requests).`,
    );
    return { data, source: 'incremental' };
  } catch (err) {
    const quota = isYouTubeQuotaError(err);
    if (quota) await markYouTubeQuotaExhausted();
    if (hasCache && cached) {
      console.error(
        `[EGGS build] YouTube fetch failed (${quota ? 'quota' : 'error'}) after ${getYouTubeRequestCount()} request(s) — using saved catalog (${cached.videosById.size} videos).`,
        err,
      );
      return { data: cached, source: 'cache' };
    }
    console.error(
      `[EGGS build] YouTube fetch failed after ${getYouTubeRequestCount()} request(s) — continuing RSS-only.`,
      err,
    );
    return { data: emptyYouTubeChannelData(), source: 'empty' };
  }
}

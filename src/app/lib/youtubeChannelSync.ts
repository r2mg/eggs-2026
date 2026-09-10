/**
 * Build-time YouTube catalog: persist last success, merge “what’s new”, never wipe the
 * site to RSS-only when quota is gone.
 *
 * - First run / stale catalog: full playlist fetch, then merge into any existing cache
 *   (so older long-form videos are not discarded when Shorts fill the newest-450 window).
 * - Fresh catalog: walk uploads newest-first until we hit videos we already know.
 * - Shorts / hashtag clips are not stored for episode matching.
 */

import { existsSync } from 'node:fs';
import { mkdir, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
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

const CACHE_DIR = path.join(process.cwd(), '.cache');
const WARMUP_LOCK = path.join(CACHE_DIR, 'youtube-warmup.lock');
const WARMUP_DONE = path.join(CACHE_DIR, 'youtube-warmup.done');
const WARMUP_WAIT_MS = 180_000;
const STALE_LOCK_MS = 3 * 60 * 1000;

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

function isDevBuild(): boolean {
  try {
    return Boolean(import.meta.env?.DEV);
  } catch {
    return false;
  }
}

async function tryBecomeWarmupOwner(): Promise<boolean> {
  await mkdir(CACHE_DIR, { recursive: true });
  try {
    await writeFile(WARMUP_LOCK, `${process.pid}\n${new Date().toISOString()}\n`, { flag: 'wx' });
    return true;
  } catch {
    try {
      const info = await stat(WARMUP_LOCK);
      if (Date.now() - info.mtimeMs > STALE_LOCK_MS) {
        await unlink(WARMUP_LOCK);
        await writeFile(WARMUP_LOCK, `${process.pid}\n${new Date().toISOString()}\n`, { flag: 'wx' });
        return true;
      }
    } catch {
      // Another process won the race.
    }
    return false;
  }
}

async function waitForWarmup(): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < WARMUP_WAIT_MS) {
    if (existsSync(WARMUP_DONE)) return;
    const persisted = await loadPersistedYouTubeCatalog();
    if (persisted && persisted.videos.length > 0) return;
    await new Promise((r) => setTimeout(r, 250));
  }
  console.warn('[EGGS YouTube catalog] Timed out waiting for the warmup owner — continuing without a new fetch.');
}

async function markWarmupDone(): Promise<void> {
  try {
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(WARMUP_DONE, new Date().toISOString());
  } catch {
    // Ignore
  }
}

/**
 * Resolve the YouTube catalog for this build. The first process to take the lock
 * downloads (or incrementally updates) the catalog; every other Astro worker waits
 * and only reads the saved file. That avoids repeating the Data API across isolates.
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

  let owner = isDevBuild();
  if (!owner) {
    owner = await tryBecomeWarmupOwner();
    if (!owner) {
      await waitForWarmup();
      const ready = await loadPersistedYouTubeCatalog();
      const readyData = ready ? persistedToChannelData(ready) : null;
      if (readyData && readyData.videosById.size > 0) {
        console.info(
          `[EGGS build] Using warmed YouTube catalog (${readyData.videosById.size} videos) — no Data API in this process.`,
        );
        return { data: readyData, source: 'cache' };
      }
      console.info('[EGGS build] No warmed catalog in this process — RSS-only here.');
      return { data: emptyYouTubeChannelData(), source: 'empty' };
    }
  }

  if (await isYouTubeQuotaExhaustedToday()) {
    if (hasCache && cached) {
      console.info(
        '[EGGS build] YouTube quota already exhausted today — using saved catalog (no Data API calls).',
      );
      await markWarmupDone();
      return { data: cached, source: 'cache' };
    }
    console.info(
      '[EGGS build] Quota exhausted and no catalog is saved — skipping the Data API. Baked matches and the public Atom feed will still attach Watch links.',
    );
    await markWarmupDone();
    return { data: emptyYouTubeChannelData(), source: 'empty' };
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
  } finally {
    await markWarmupDone();
  }
}

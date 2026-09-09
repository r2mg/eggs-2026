/**
 * Persist the YouTube matching catalog between builds.
 *
 * Production: Netlify Blobs (survives deploys). Local: `.cache/youtube-channel.json`.
 * The catalog is the source of truth for episode ↔ video matching; builds merge new
 * uploads into it instead of re-downloading the whole channel every time.
 */

import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { YouTubeChannelData, YouTubePlaylist, YouTubeVideo } from './youtube';

export const YOUTUBE_CATALOG_BLOB_STORE = 'youtube-catalog';
export const YOUTUBE_CATALOG_BLOB_KEY = 'channel-v1';
export const YOUTUBE_QUOTA_BLOB_KEY = 'quota-exhausted-v1';

const LOCAL_CACHE_PATH = path.join(process.cwd(), '.cache', 'youtube-channel.json');
const LOCAL_QUOTA_PATH = path.join(process.cwd(), '.cache', 'youtube-quota.json');

type QuotaExhaustedMarker = {
  exhaustedOnPacificDate: string;
  at: string;
};

/** YouTube Data API quota resets at midnight Pacific. */
export function youtubeQuotaPacificDateKey(d = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

export type PersistedYouTubeCatalog = {
  version: 1;
  savedAt: string;
  lastFullFetchAt: string;
  uploadsPlaylistId: string | null;
  playlists: YouTubePlaylist[];
  videos: YouTubeVideo[];
  blockedVideoIds: string[];
};

export function channelDataToPersisted(
  data: YouTubeChannelData,
  lastFullFetchAt: string,
  savedAt: string = new Date().toISOString(),
): PersistedYouTubeCatalog {
  return {
    version: 1,
    savedAt,
    lastFullFetchAt,
    uploadsPlaylistId: data.uploadsPlaylistId,
    playlists: data.playlists,
    videos: Array.from(data.videosById.values()),
    blockedVideoIds: Array.from(data.blockedVideoIds),
  };
}

export function persistedToChannelData(persisted: PersistedYouTubeCatalog): YouTubeChannelData {
  return {
    uploadsPlaylistId: persisted.uploadsPlaylistId,
    playlists: persisted.playlists ?? [],
    videosById: new Map((persisted.videos ?? []).map((v) => [v.videoId, v])),
    blockedVideoIds: new Set(persisted.blockedVideoIds ?? []),
  };
}

function isPersistedCatalog(value: unknown): value is PersistedYouTubeCatalog {
  if (!value || typeof value !== 'object') return false;
  const v = value as PersistedYouTubeCatalog;
  return v.version === 1 && Array.isArray(v.videos);
}

async function getCatalogStore() {
  const { getStore } = await import('@netlify/blobs');
  if (process.env.NETLIFY_BLOBS_CONTEXT) {
    return getStore(YOUTUBE_CATALOG_BLOB_STORE);
  }
  const siteID = process.env.NETLIFY_SITE_ID || process.env.SITE_ID;
  const token = process.env.NETLIFY_AUTH_TOKEN || process.env.NETLIFY_BLOBS_TOKEN;
  if (siteID && token) {
    return getStore({ name: YOUTUBE_CATALOG_BLOB_STORE, siteID, token });
  }
  return getStore(YOUTUBE_CATALOG_BLOB_STORE);
}

async function loadFromBlobs(): Promise<PersistedYouTubeCatalog | null> {
  try {
    const store = await getCatalogStore();
    const json = await store.get(YOUTUBE_CATALOG_BLOB_KEY, { type: 'json' });
    const parsed = typeof json === 'string' ? (JSON.parse(json) as unknown) : json;
    if (isPersistedCatalog(parsed)) return parsed;
    return null;
  } catch (err) {
    console.warn(
      '[EGGS YouTube catalog] Netlify Blobs load skipped:',
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

async function saveToBlobs(catalog: PersistedYouTubeCatalog): Promise<boolean> {
  try {
    const store = await getCatalogStore();
    await store.set(YOUTUBE_CATALOG_BLOB_KEY, JSON.stringify(catalog));
    return true;
  } catch (err) {
    console.warn('[EGGS YouTube catalog] Netlify Blobs save skipped:', err instanceof Error ? err.message : err);
    return false;
  }
}

async function loadFromFile(): Promise<PersistedYouTubeCatalog | null> {
  try {
    const raw = await readFile(LOCAL_CACHE_PATH, 'utf8');
    const json = JSON.parse(raw) as unknown;
    if (isPersistedCatalog(json)) return json;
    return null;
  } catch {
    return null;
  }
}

async function saveToFile(catalog: PersistedYouTubeCatalog): Promise<void> {
  try {
    await mkdir(path.dirname(LOCAL_CACHE_PATH), { recursive: true });
    await writeFile(LOCAL_CACHE_PATH, JSON.stringify(catalog), 'utf8');
  } catch (err) {
    console.warn('[EGGS YouTube catalog] Local cache save skipped:', err instanceof Error ? err.message : err);
  }
}

export async function loadPersistedYouTubeCatalog(): Promise<PersistedYouTubeCatalog | null> {
  const fromBlobs = await loadFromBlobs();
  if (fromBlobs) {
    console.log(
      `[EGGS YouTube catalog] Loaded ${fromBlobs.videos.length} videos from Netlify Blobs (full fetch ${fromBlobs.lastFullFetchAt}).`,
    );
    return fromBlobs;
  }
  const fromFile = await loadFromFile();
  if (fromFile) {
    console.log(
      `[EGGS YouTube catalog] Loaded ${fromFile.videos.length} videos from local .cache (full fetch ${fromFile.lastFullFetchAt}).`,
    );
    return fromFile;
  }
  return null;
}

export async function savePersistedYouTubeCatalog(catalog: PersistedYouTubeCatalog): Promise<void> {
  const blobOk = await saveToBlobs(catalog);
  await saveToFile(catalog);
  await clearQuotaExhaustedMarker();
  console.log(
    `[EGGS YouTube catalog] Saved ${catalog.videos.length} videos (${blobOk ? 'Blobs + ' : ''}local cache).`,
  );
}

function isQuotaMarker(value: unknown): value is QuotaExhaustedMarker {
  if (!value || typeof value !== 'object') return false;
  const v = value as QuotaExhaustedMarker;
  return typeof v.exhaustedOnPacificDate === 'string' && typeof v.at === 'string';
}

async function loadQuotaMarkerFromBlobs(): Promise<QuotaExhaustedMarker | null> {
  try {
    const store = await getCatalogStore();
    const json = await store.get(YOUTUBE_QUOTA_BLOB_KEY, { type: 'json' });
    const parsed = typeof json === 'string' ? (JSON.parse(json) as unknown) : json;
    return isQuotaMarker(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function loadQuotaMarkerFromFile(): Promise<QuotaExhaustedMarker | null> {
  try {
    const raw = await readFile(LOCAL_QUOTA_PATH, 'utf8');
    const json = JSON.parse(raw) as unknown;
    return isQuotaMarker(json) ? json : null;
  } catch {
    return null;
  }
}

/** True when a build today already hit YouTube quota — skip further Data API calls until Pacific midnight. */
export async function isYouTubeQuotaExhaustedToday(): Promise<boolean> {
  const today = youtubeQuotaPacificDateKey();
  const fromBlobs = await loadQuotaMarkerFromBlobs();
  if (fromBlobs?.exhaustedOnPacificDate === today) return true;
  const fromFile = await loadQuotaMarkerFromFile();
  return fromFile?.exhaustedOnPacificDate === today;
}

export async function markYouTubeQuotaExhausted(): Promise<void> {
  const marker: QuotaExhaustedMarker = {
    exhaustedOnPacificDate: youtubeQuotaPacificDateKey(),
    at: new Date().toISOString(),
  };
  try {
    const store = await getCatalogStore();
    await store.set(YOUTUBE_QUOTA_BLOB_KEY, JSON.stringify(marker));
  } catch {
    // Blobs unavailable in local Astro — file fallback is enough.
  }
  try {
    await mkdir(path.dirname(LOCAL_QUOTA_PATH), { recursive: true });
    await writeFile(LOCAL_QUOTA_PATH, JSON.stringify(marker));
  } catch {
    // Ignore
  }
  console.warn(
    `[EGGS YouTube catalog] Quota exhausted for Pacific date ${marker.exhaustedOnPacificDate} — later builds today will not call the Data API.`,
  );
}

export async function clearQuotaExhaustedMarker(): Promise<void> {
  try {
    const store = await getCatalogStore();
    await store.delete(YOUTUBE_QUOTA_BLOB_KEY);
  } catch {
    // Ignore
  }
  try {
    await unlink(LOCAL_QUOTA_PATH);
  } catch {
    // Ignore
  }
}

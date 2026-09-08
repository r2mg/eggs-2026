/**
 * Persist the YouTube matching catalog between builds.
 *
 * Production: Netlify Blobs (survives deploys). Local: `.cache/youtube-channel.json`.
 * The catalog is the source of truth for episode ↔ video matching; builds merge new
 * uploads into it instead of re-downloading the whole channel every time.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { YouTubeChannelData, YouTubePlaylist, YouTubeVideo } from './youtube';

export const YOUTUBE_CATALOG_BLOB_STORE = 'youtube-catalog';
export const YOUTUBE_CATALOG_BLOB_KEY = 'channel-v1';

const LOCAL_CACHE_PATH = path.join(process.cwd(), '.cache', 'youtube-channel.json');

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

async function loadFromBlobs(): Promise<PersistedYouTubeCatalog | null> {
  try {
    const { getStore } = await import('@netlify/blobs');
    const store = getStore(YOUTUBE_CATALOG_BLOB_STORE);
    const json = await store.get(YOUTUBE_CATALOG_BLOB_KEY, { type: 'json' });
    const parsed = typeof json === 'string' ? (JSON.parse(json) as unknown) : json;
    if (isPersistedCatalog(parsed)) return parsed;
    return null;
  } catch {
    return null;
  }
}

async function saveToBlobs(catalog: PersistedYouTubeCatalog): Promise<boolean> {
  try {
    const { getStore } = await import('@netlify/blobs');
    const store = getStore(YOUTUBE_CATALOG_BLOB_STORE);
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
  console.log(
    `[EGGS YouTube catalog] Saved ${catalog.videos.length} videos (${blobOk ? 'Blobs + ' : ''}local cache).`,
  );
}

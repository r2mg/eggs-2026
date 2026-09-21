/**
 * Locked RSS slug → YouTube video id.
 *
 * Titles change when videos are renamed for SEO. The 11-character video id does not.
 * Once we have a match, later builds reuse it instead of re-scoring titles.
 *
 * Production: Netlify Blobs (same store as the channel catalog). Local: `.cache/youtube-episode-map.json`.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { MANUAL_EPISODE_SLUG_TO_YOUTUBE_VIDEO_ID } from './youtubeMatching';
import { seedSlugToVideoIdMap } from './youtubeSlugSeed';
import { YOUTUBE_CATALOG_BLOB_STORE } from './youtubeChannelStore';

export const YOUTUBE_EPISODE_MAP_BLOB_KEY = 'episode-map-v1';
const LOCAL_MAP_PATH = path.join(process.cwd(), '.cache', 'youtube-episode-map.json');

type PersistedEpisodeMap = {
  version: 1;
  savedAt: string;
  bySlug: Record<string, string>;
};

function isPersistedMap(value: unknown): value is PersistedEpisodeMap {
  if (!value || typeof value !== 'object') return false;
  const v = value as PersistedEpisodeMap;
  return v.version === 1 && !!v.bySlug && typeof v.bySlug === 'object';
}

async function getMapStore() {
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

async function loadPersistedMap(): Promise<Record<string, string>> {
  try {
    const store = await getMapStore();
    const json = await store.get(YOUTUBE_EPISODE_MAP_BLOB_KEY, { type: 'json' });
    const parsed = typeof json === 'string' ? (JSON.parse(json) as unknown) : json;
    if (isPersistedMap(parsed)) return { ...parsed.bySlug };
  } catch {
    // Blobs unavailable in some local builds.
  }
  try {
    const raw = await readFile(LOCAL_MAP_PATH, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (isPersistedMap(parsed)) return { ...parsed.bySlug };
  } catch {
    // No local cache yet.
  }
  return {};
}

/**
 * Manual pins win, then previously saved matches, then the baked seed.
 * Title similarity is not consulted here.
 */
export async function loadYoutubeEpisodeMap(): Promise<Record<string, string>> {
  const map = {
    ...seedSlugToVideoIdMap(),
    ...(await loadPersistedMap()),
    ...MANUAL_EPISODE_SLUG_TO_YOUTUBE_VIDEO_ID,
  };
  const cleaned: Record<string, string> = {};
  for (const [slug, id] of Object.entries(map)) {
    const videoId = id?.trim();
    if (slug && videoId && videoId.length === 11) cleaned[slug] = videoId;
  }
  console.log(`[EGGS YouTube map] ${Object.keys(cleaned).length} locked episode → video id(s).`);
  return cleaned;
}

export function overlayVideoIds(overlays: Record<string, { youtubeVideoId?: string } | null>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [slug, overlay] of Object.entries(overlays)) {
    const id = overlay?.youtubeVideoId?.trim();
    if (id && id.length === 11) out[slug] = id;
  }
  return out;
}

/** Merge new matches into the saved map. Never deletes an existing slug. */
export async function saveYoutubeEpisodeMap(newIds: Record<string, string>): Promise<void> {
  const merged = { ...(await loadPersistedMap()) };
  let added = 0;
  for (const [slug, id] of Object.entries(newIds)) {
    const videoId = id?.trim();
    if (!slug || !videoId || videoId.length !== 11) continue;
    if (merged[slug] === videoId) continue;
    if (!merged[slug]) added += 1;
    merged[slug] = videoId;
  }

  const payload: PersistedEpisodeMap = {
    version: 1,
    savedAt: new Date().toISOString(),
    bySlug: merged,
  };
  const body = JSON.stringify(payload);

  try {
    const store = await getMapStore();
    await store.set(YOUTUBE_EPISODE_MAP_BLOB_KEY, body);
  } catch (err) {
    console.warn(
      '[EGGS YouTube map] Netlify Blobs save skipped:',
      err instanceof Error ? err.message : err,
    );
  }
  try {
    await mkdir(path.dirname(LOCAL_MAP_PATH), { recursive: true });
    await writeFile(LOCAL_MAP_PATH, body, 'utf8');
  } catch (err) {
    console.warn('[EGGS YouTube map] Local save skipped:', err instanceof Error ? err.message : err);
  }
  console.log(
    `[EGGS YouTube map] Saved ${Object.keys(merged).length} locked matches (${added} new this build).`,
  );
}

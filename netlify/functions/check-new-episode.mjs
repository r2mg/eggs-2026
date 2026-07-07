/**
 * Scheduled function: keep production in sync with Anchor/Spotify RSS and YouTube uploads.
 *
 * The EGGS! site is a STATIC Astro build — episodes are baked in at build time
 * (see `src/data/content.ts`), so a deployed site only knows about the episodes
 * that existed when it was last built. Neither Anchor / Spotify for Podcasters nor
 * YouTube emit a webhook we can rely on, so we poll both feeds on a schedule and
 * trigger a production rebuild ONLY when something new appears.
 *
 * State (last-seen RSS guid, last-seen YouTube upload id, and that upload's Atom
 * `updated` timestamp) lives in Netlify Blobs so we don't rebuild on every run.
 * The `updated` field catches metadata edits on the current newest upload (e.g. a
 * custom thumbnail swap) without requiring a brand-new video id.
 */
import { getStore } from '@netlify/blobs';
import { XMLParser } from 'fast-xml-parser';

const RSS_FEED_URL = 'https://anchor.fm/s/fc17887c/podcast/rss';
/** Matches `YOUTUBE_CHANNEL_ID` in `src/app/config/youtubeChannel.ts`. */
const YOUTUBE_CHANNEL_ID = 'UCz53WsQ9KmEJb5yKeMTsmGg';
const YOUTUBE_FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${YOUTUBE_CHANNEL_ID}`;

const STORE_NAME = 'rss-episode-watch';
const RSS_STATE_KEY = 'latest-episode-id';
const YOUTUBE_STATE_KEY = 'latest-youtube-video-id';
const YOUTUBE_UPDATED_STATE_KEY = 'latest-youtube-video-updated';

const USER_AGENT = 'eggs-content-watch/1.0 (+netlify-scheduled-function)';

/** Anchor's feed is huge; entity-heavy `<itunes:summary>` blocks exceed default caps. */
const RSS_XML_PARSER = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  trimValues: true,
  processEntities: {
    maxTotalExpansions: 500_000,
    maxEntityCount: 50_000,
    maxExpandedLength: 50_000_000,
  },
});

const ATOM_XML_PARSER = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  trimValues: true,
});

function ensureArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function pickString(value) {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string') return value.trim() || undefined;
  if (typeof value === 'object' && '#text' in value) {
    const text = String(value['#text']).trim();
    return text || undefined;
  }
  return String(value).trim() || undefined;
}

function newestByPublished(items, getPublishedAt) {
  if (items.length === 0) return null;
  return items.reduce(
    (latest, item) => {
      const time = Date.parse(getPublishedAt(item) ?? '') || 0;
      return time > latest.time ? { time, item } : latest;
    },
    { time: -1, item: items[0] },
  ).item;
}

/**
 * @returns {Promise<{ latestId: string | null, error: string | null }>}
 */
async function fetchLatestRssEpisodeId() {
  let xml;
  try {
    const res = await fetch(RSS_FEED_URL, {
      headers: { 'user-agent': USER_AGENT },
    });
    if (!res.ok) throw new Error(`RSS responded ${res.status}`);
    xml = await res.text();
  } catch (err) {
    return { latestId: null, error: `fetch failed: ${err}` };
  }

  try {
    const feed = RSS_XML_PARSER.parse(xml);
    const items = ensureArray(feed?.rss?.channel?.item);
    if (items.length === 0) {
      return { latestId: null, error: 'feed had no episodes' };
    }

    const newest = newestByPublished(items, (item) => item?.pubDate);
    const guidRaw = newest?.guid;
    const latestId = pickString(
      guidRaw && typeof guidRaw === 'object' ? guidRaw['#text'] : guidRaw,
    ) ?? pickString(newest?.title);

    if (!latestId) {
      return { latestId: null, error: 'could not determine episode id' };
    }
    return { latestId, error: null };
  } catch (err) {
    return { latestId: null, error: `parse failed: ${err}` };
  }
}

/**
 * @returns {Promise<{ videoId: string | null, updatedAt: string | null, error: string | null }>}
 */
async function fetchLatestYoutubeUploadState() {
  let xml;
  try {
    const res = await fetch(YOUTUBE_FEED_URL, {
      headers: { 'user-agent': USER_AGENT },
    });
    if (!res.ok) throw new Error(`YouTube feed responded ${res.status}`);
    xml = await res.text();
  } catch (err) {
    return { videoId: null, updatedAt: null, error: `fetch failed: ${err}` };
  }

  try {
    const parsed = ATOM_XML_PARSER.parse(xml);
    const entries = ensureArray(parsed?.feed?.entry);
    if (entries.length === 0) {
      return { videoId: null, updatedAt: null, error: 'feed had no entries' };
    }

    const newest = newestByPublished(entries, (entry) => entry?.published);
    const videoId =
      pickString(newest?.['yt:videoId']) ??
      pickString(newest?.id)?.replace(/^yt:video:/, '');
    const updatedAt = pickString(newest?.updated);

    if (!videoId) {
      return { videoId: null, updatedAt: null, error: 'could not determine video id' };
    }
    return { videoId, updatedAt, error: null };
  } catch (err) {
    return { videoId: null, updatedAt: null, error: `parse failed: ${err}` };
  }
}

export default async () => {
  const buildHookUrl = process.env.BUILD_HOOK_URL;
  if (!buildHookUrl) {
    console.error('[content-watch] BUILD_HOOK_URL is not set — cannot trigger rebuilds.');
    return new Response('Missing BUILD_HOOK_URL', { status: 500 });
  }

  const [rssResult, youtubeResult] = await Promise.all([
    fetchLatestRssEpisodeId(),
    fetchLatestYoutubeUploadState(),
  ]);

  if (rssResult.error) {
    console.warn(`[content-watch] RSS check skipped: ${rssResult.error}`);
  }
  if (youtubeResult.error) {
    console.warn(`[content-watch] YouTube check skipped: ${youtubeResult.error}`);
  }

  if (!rssResult.latestId && !youtubeResult.videoId) {
    console.error('[content-watch] Both RSS and YouTube checks failed — nothing to compare.');
    return new Response('All source checks failed', { status: 502 });
  }

  const store = getStore(STORE_NAME);
  const [previousRssId, previousYoutubeId, previousYoutubeUpdated] = await Promise.all([
    store.get(RSS_STATE_KEY),
    store.get(YOUTUBE_STATE_KEY),
    store.get(YOUTUBE_UPDATED_STATE_KEY),
  ]);

  const rssChanged = !!(rssResult.latestId && previousRssId !== rssResult.latestId);
  const youtubeIdChanged = !!(
    youtubeResult.videoId && previousYoutubeId !== youtubeResult.videoId
  );
  const youtubeUpdatedChanged = !!(
    youtubeResult.videoId &&
    youtubeResult.updatedAt &&
    previousYoutubeId === youtubeResult.videoId &&
    previousYoutubeUpdated !== youtubeResult.updatedAt
  );
  const youtubeChanged = youtubeIdChanged || youtubeUpdatedChanged;

  if (!rssChanged && !youtubeChanged) {
    console.log(
      `[content-watch] No changes (RSS: ${rssResult.latestId ?? 'n/a'}, YouTube: ${youtubeResult.videoId ?? 'n/a'}).`,
    );
    return new Response('No change', { status: 200 });
  }

  const reasons = [];
  if (rssChanged) {
    reasons.push(
      `RSS episode ${rssResult.latestId}` +
        (previousRssId ? ` (was ${previousRssId})` : ' (first run)'),
    );
  }
  if (youtubeIdChanged) {
    reasons.push(
      `YouTube upload ${youtubeResult.videoId}` +
        (previousYoutubeId ? ` (was ${previousYoutubeId})` : ' (first run)'),
    );
  } else if (youtubeUpdatedChanged) {
    reasons.push(
      `YouTube upload ${youtubeResult.videoId} updated` +
        (previousYoutubeUpdated ? ` (was ${previousYoutubeUpdated})` : ' (first run)'),
    );
  }

  try {
    const hookRes = await fetch(buildHookUrl, { method: 'POST' });
    if (!hookRes.ok) throw new Error(`Build hook responded ${hookRes.status}`);
  } catch (err) {
    console.error('[content-watch] Failed to trigger build hook:', err);
    // Don't store ids, so we retry on the next run.
    return new Response('Build hook failed', { status: 502 });
  }

  if (rssResult.latestId) {
    await store.set(RSS_STATE_KEY, rssResult.latestId);
  }
  if (youtubeResult.videoId) {
    await store.set(YOUTUBE_STATE_KEY, youtubeResult.videoId);
  }
  if (youtubeResult.updatedAt) {
    await store.set(YOUTUBE_UPDATED_STATE_KEY, youtubeResult.updatedAt);
  }

  console.log(`[content-watch] Triggered production rebuild: ${reasons.join('; ')}.`);
  return new Response('Triggered rebuild', { status: 200 });
};

export const config = {
  schedule: '@hourly',
};

/**
 * Scheduled function: keep production in sync with the podcast RSS feed.
 *
 * The EGGS! site is a STATIC Astro build — episodes are baked in at build time
 * (see `src/data/content.ts`), so a deployed site only knows about the episodes
 * that existed when it was last built. Anchor / Spotify for Podcasters does not
 * emit a webhook when a new episode publishes, so instead we poll the feed on a
 * schedule and trigger a production rebuild ONLY when the newest episode changes.
 *
 * State (the last episode we acted on) is stored in Netlify Blobs so we don't
 * rebuild on every run — only when there is genuinely something new.
 */
import { getStore } from '@netlify/blobs';
import { XMLParser } from 'fast-xml-parser';

const RSS_FEED_URL = 'https://anchor.fm/s/fc17887c/podcast/rss';
const STORE_NAME = 'rss-episode-watch';
const STATE_KEY = 'latest-episode-id';

export default async () => {
  const buildHookUrl = process.env.BUILD_HOOK_URL;
  if (!buildHookUrl) {
    console.error('[rss-watch] BUILD_HOOK_URL is not set — cannot trigger rebuilds.');
    return new Response('Missing BUILD_HOOK_URL', { status: 500 });
  }

  // 1. Fetch the feed.
  let xml;
  try {
    const res = await fetch(RSS_FEED_URL, {
      headers: { 'user-agent': 'eggs-rss-watch/1.0 (+netlify-scheduled-function)' },
    });
    if (!res.ok) throw new Error(`RSS responded ${res.status}`);
    xml = await res.text();
  } catch (err) {
    console.error('[rss-watch] Failed to fetch RSS feed:', err);
    return new Response('RSS fetch failed', { status: 502 });
  }

  // 2. Parse and find the newest episode by publish date (don't trust item order).
  let items = [];
  try {
    // Anchor's feed is huge; entity-heavy `<itunes:summary>` blocks exceed the
    // library's default expansion cap, so raise the limits (mirrors src/app/lib/rss.ts).
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      trimValues: true,
      processEntities: {
        maxTotalExpansions: 500_000,
        maxEntityCount: 50_000,
        maxExpandedLength: 50_000_000,
      },
    });
    const feed = parser.parse(xml);
    const rawItems = feed?.rss?.channel?.item ?? [];
    items = Array.isArray(rawItems) ? rawItems : [rawItems];
  } catch (err) {
    console.error('[rss-watch] Failed to parse RSS feed:', err);
    return new Response('RSS parse failed', { status: 502 });
  }

  if (items.length === 0) {
    console.warn('[rss-watch] Feed had no episodes; skipping.');
    return new Response('No episodes in feed', { status: 200 });
  }

  const newest = items.reduce(
    (latest, item) => {
      const time = Date.parse(item?.pubDate ?? '') || 0;
      return time > latest.time ? { time, item } : latest;
    },
    { time: -1, item: items[0] },
  ).item;

  // `<guid>` can be a string or an object ({ '#text': ..., '@_isPermaLink': ... }).
  const guidRaw = newest?.guid;
  const latestId = String(
    (guidRaw && typeof guidRaw === 'object' ? guidRaw['#text'] : guidRaw) ?? newest?.title ?? '',
  ).trim();

  if (!latestId) {
    console.warn('[rss-watch] Could not determine an episode id; skipping.');
    return new Response('No episode id', { status: 200 });
  }

  // 3. Compare against the last episode we acted on.
  const store = getStore(STORE_NAME);
  const previousId = await store.get(STATE_KEY);

  if (previousId === latestId) {
    console.log(`[rss-watch] No new episode (latest: ${latestId}). No rebuild needed.`);
    return new Response('No change', { status: 200 });
  }

  // 4. New (or first-seen) episode → trigger a production rebuild.
  try {
    const hookRes = await fetch(buildHookUrl, { method: 'POST' });
    if (!hookRes.ok) throw new Error(`Build hook responded ${hookRes.status}`);
  } catch (err) {
    console.error('[rss-watch] Failed to trigger build hook:', err);
    // Don't store the id, so we retry on the next run.
    return new Response('Build hook failed', { status: 502 });
  }

  await store.set(STATE_KEY, latestId);
  console.log(
    `[rss-watch] New episode detected (${latestId}); triggered production rebuild` +
      (previousId ? ` (previous: ${previousId}).` : ' (first run).'),
  );
  return new Response('Triggered rebuild', { status: 200 });
};

export const config = {
  schedule: '@hourly',
};

/**
 * Build-time content layer (`src/data/content.ts`)
 * =================================================
 *
 * This is the heart of the Astro rebuild. Instead of every visitor's browser fetching the RSS
 * feed, fetching YouTube, and running fuzzy matching (the old SPA behaviour — the cause of the
 * "some images/audio load, some don't" flakiness), we do all of it **once, here, at build time**:
 *
 *  1. Download the Anchor RSS feed and parse it into stable `Episode` rows (existing `rss.ts`).
 *  2. Download YouTube channel data (uploads + editorial/topic playlists) when an API key is set.
 *  3. Match every episode to its YouTube video and merge the overlay (thumbnail, embed, featured,
 *     topics) into the episode — deterministically, with the full dataset available.
 *  4. Derive guests and topics so we can statically generate `/guests/*` and `/topics/*` pages.
 *
 * Every Astro page imports `getSiteContent()` in its server-side frontmatter, so the resulting
 * HTML ships fully populated — great for SEO, social unfurls, and LLM crawlers.
 *
 * The result is memoised for the duration of a single build so we only hit the network once.
 */

import type { Episode } from '../app/types/episode';
import {
  ANCHOR_EGGS_RSS_FEED,
  EGGS_LISTEN_LINKS,
  fetchRssEpisodes,
  slugify,
} from '../app/lib/rss';
import {
  fetchYouTubeChannelData,
  getYouTubeApiKey,
  type YouTubeChannelData,
} from '../app/lib/youtube';
import { buildYoutubeOverlaysForEpisodes } from '../app/lib/computeEpisodeYoutubeOverlay';
import { getFeaturedEpisodesInPlaylistOrder } from '../app/lib/youtubeFeaturedOrder';
import { mergeEpisodeForDisplay } from '../app/types/youtubeOverlay';
import {
  EGGS_TOPIC_PLAYLIST_TITLES,
  PLAYLIST_TITLE_FEATURED,
  titleMatchesPlaylist,
} from '../app/config/youtubeChannel';

/** A guest derived from episode titles ("… with Jane Doe"), with all of their appearances. */
export interface Guest {
  /** Display name, e.g. "Jane Doe" */
  name: string;
  /** URL-safe slug for `/guests/:slug` */
  slug: string;
  /** Episodes this guest appears on, newest first */
  episodes: Episode[];
}

/** A topic/category derived from the YouTube playlist membership baked onto each episode. */
export interface Topic {
  /** Full playlist title, e.g. "EGGS Entrepreneurship" */
  title: string;
  /** Human label with the "EGGS " prefix removed, e.g. "Entrepreneurship" */
  label: string;
  /** URL-safe slug for `/topics/:slug` */
  slug: string;
  /** Episodes tagged with this topic, newest first */
  episodes: Episode[];
}

export interface SiteContent {
  /** All episodes, YouTube-enriched, newest first. */
  episodes: Episode[];
  /** The single newest episode (homepage hero), or null if the feed is empty. */
  latest: Episode | null;
  /** Featured episodes in "EGGS Featured" playlist order (falls back to recent episodes). */
  featured: Episode[];
  /** All guests, sorted by number of appearances then name. */
  guests: Guest[];
  /** All topics that have at least one episode, in the configured order. */
  topics: Topic[];
  /** True when YouTube enrichment ran (an API key was available at build time). */
  youtubeEnabled: boolean;
}

const EMPTY_CHANNEL: YouTubeChannelData = {
  uploadsPlaylistId: null,
  playlists: [],
  videosById: new Map(),
  blockedVideoIds: new Set(),
};

let cached: SiteContent | null = null;

/** Newest-first comparator by ISO publish date. */
function byNewest(a: Episode, b: Episode): number {
  return Date.parse(b.publishedAt) - Date.parse(a.publishedAt);
}

/** Build the guest directory from enriched episodes. */
function deriveGuests(episodes: Episode[]): Guest[] {
  const bySlug = new Map<string, Guest>();
  for (const ep of episodes) {
    const name = ep.guest?.trim();
    if (!name) continue;
    const slug = slugify(name, 80);
    if (!slug) continue;
    const existing = bySlug.get(slug);
    if (existing) {
      existing.episodes.push(ep);
    } else {
      bySlug.set(slug, { name, slug, episodes: [ep] });
    }
  }
  const guests = [...bySlug.values()];
  for (const g of guests) g.episodes.sort(byNewest);
  guests.sort((a, b) => b.episodes.length - a.episodes.length || a.name.localeCompare(b.name));
  return guests;
}

/** Build topic pages from the YouTube `collections` baked onto each episode. */
function deriveTopics(episodes: Episode[]): Topic[] {
  const order = new Map(EGGS_TOPIC_PLAYLIST_TITLES.map((t, i) => [t, i] as const));
  const byTitle = new Map<string, Topic>();

  for (const ep of episodes) {
    for (const title of ep.collections ?? []) {
      // Featured is an editorial flag, not a browsable topic.
      if (titleMatchesPlaylist(PLAYLIST_TITLE_FEATURED, title)) continue;
      const existing = byTitle.get(title);
      if (existing) {
        existing.episodes.push(ep);
      } else {
        byTitle.set(title, {
          title,
          label: title.replace(/^EGGS\s+/i, '').trim(),
          slug: slugify(title.replace(/^EGGS\s+/i, '').trim(), 80),
          episodes: [ep],
        });
      }
    }
  }

  const topics = [...byTitle.values()];
  for (const t of topics) t.episodes.sort(byNewest);
  topics.sort(
    (a, b) =>
      (order.get(a.title) ?? 999) - (order.get(b.title) ?? 999) || a.label.localeCompare(b.label),
  );
  return topics;
}

/**
 * Fetch + enrich + derive all site content. Memoised for the build.
 * Never throws: if the network or YouTube fails, we degrade to whatever we have (RSS, or empty).
 */
export async function getSiteContent(): Promise<SiteContent> {
  if (cached) return cached;

  // 1. RSS — fetch Anchor directly (no Vite dev proxy at build time).
  let rss: Episode[] = [];
  try {
    rss = await fetchRssEpisodes({ feedUrl: ANCHOR_EGGS_RSS_FEED });
  } catch (err) {
    console.error('[EGGS build] RSS fetch failed — generating with no episodes.', err);
  }

  // 2. YouTube — optional; only runs when a key is configured.
  const youtubeEnabled = Boolean(getYouTubeApiKey());
  let channel: YouTubeChannelData = EMPTY_CHANNEL;
  if (youtubeEnabled) {
    try {
      channel = await fetchYouTubeChannelData();
    } catch (err) {
      console.error('[EGGS build] YouTube fetch failed — continuing RSS-only.', err);
    }
  } else {
    console.info(
      '[EGGS build] No YouTube API key (YOUTUBE_API_KEY) — building RSS-only (no thumbnails/topics/featured).',
    );
  }

  // 3. Match + merge overlays into stable episode objects, once.
  const overlays = buildYoutubeOverlaysForEpisodes(rss, channel);
  const episodes = rss
    .map((ep) => mergeEpisodeForDisplay(ep, overlays[ep.slug] ?? null))
    .sort(byNewest);

  // 4. Featured order from the editorial playlist; fall back to recent episodes after the latest.
  let featured = getFeaturedEpisodesInPlaylistOrder(rss, channel)
    .map((ep) => mergeEpisodeForDisplay(ep, overlays[ep.slug] ?? null));
  if (featured.length === 0) featured = episodes.slice(1, 7);

  cached = {
    episodes,
    latest: episodes[0] ?? null,
    featured,
    guests: deriveGuests(episodes),
    topics: deriveTopics(episodes),
    youtubeEnabled,
  };

  console.log(
    `[EGGS build] Content ready: ${cached.episodes.length} episodes, ${cached.guests.length} guests, ${cached.topics.length} topics (YouTube ${youtubeEnabled ? 'on' : 'off'}).`,
  );

  return cached;
}

/** Convenience: stable site-wide constants reused across pages and SEO. */
export const SITE = {
  name: 'EGGS! The Podcast',
  shortName: 'EGGS!',
  description:
    'Conversations on creativity, entrepreneurship, branding, and the people behind interesting work.',
  listen: EGGS_LISTEN_LINKS,
} as const;

/**
 * Podcast RSS loading and parsing
 * ================================
 *
 * **Where the feed is fetched:** `fetchRssEpisodes()` (near the bottom of this file).
 * It uses `resolvePodcastRssUrl()` so dev can hit Vite’s `/podcast-rss.xml` proxy and
 * production can use Anchor or `VITE_PODCAST_RSS_URL`.
 *
 * **How episode slugs are built:** `buildEpisodeSlug()` combines the episode number
 * (when known) with a slugified title tail — see that function’s comment block.
 *
 * **Debugging:** If something breaks, open the browser devtools **Console**. Any RSS
 * problem should log a message starting with `[EGGS RSS]` plus the feed URL and hint.
 */
import { XMLParser } from 'fast-xml-parser';
import { isEpisodeTitleExcludedFromSite } from '../config/youtubeChannel';
import type { Episode, EpisodeChapter } from '../types/episode';

// ---------------------------------------------------------------------------
// Feed URL
// ---------------------------------------------------------------------------

/** Public Anchor RSS URL for EGGS! The Podcast */
export const ANCHOR_EGGS_RSS_FEED = 'https://anchor.fm/s/fc17887c/podcast/rss';

/**
 * Stable “listen” links from the show’s own marketing (RSS / Spotify for Podcasters).
 * Used in the footer so visitors get real destinations, not dead `#` links.
 */
export const EGGS_LISTEN_LINKS = {
  rss: ANCHOR_EGGS_RSS_FEED,
  spotify: 'https://podcasters.spotify.com/pod/show/eggsthepodcast',
  /** Recurring “On iTunes” short link from episode show notes */
  apple: 'https://itun.es/i6dX3pCOn',
} as const;

/**
 * Which URL `fetchRssEpisodes` uses by default.
 *
 * - In **development**, we default to `/podcast-rss.xml` so Vite can proxy the
 *   request and avoid browser CORS issues.
 * - In **production**, we call Anchor directly. If your host blocks that, set
 *   `VITE_PODCAST_RSS_URL` in `.env` to your own same-origin proxy path.
 */
export function resolvePodcastRssUrl(): string {
  const env = import.meta.env;
  if (env?.VITE_PODCAST_RSS_URL) return String(env.VITE_PODCAST_RSS_URL);
  if (env?.DEV) return '/podcast-rss.xml';
  return ANCHOR_EGGS_RSS_FEED;
}

// ---------------------------------------------------------------------------
// Text helpers (exported for reuse in UI or tests)
// ---------------------------------------------------------------------------

/**
 * Removes HTML tags and collapses whitespace. Good for turning show notes
 * into a plain preview — not a full HTML5 sanitizer.
 */
export function stripHtmlTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Decodes a few common entities found in RSS / iTunes fields */
export function decodeBasicHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

// ---------------------------------------------------------------------------
// Episode number
// ---------------------------------------------------------------------------

/**
 * Reads “Eggs 461: …” from the start of the title (this show’s convention).
 */
export function extractEpisodeNumberFromTitle(title: string): number | undefined {
  const m = title.trim().match(/^Eggs\s+(\d+)\s*:/i);
  if (!m) return undefined;
  const n = Number.parseInt(m[1], 10);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Reads `<itunes:episode>` when present (sometimes missing on newest items).
 */
export function extractEpisodeNumberFromItunesTag(itunesEpisode: unknown): number | undefined {
  if (itunesEpisode === undefined || itunesEpisode === null) return undefined;
  const s = String(itunesEpisode).trim();
  if (!/^\d+$/.test(s)) return undefined;
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) ? n : undefined;
}

/** Prefers the iTunes tag, then falls back to parsing the title */
export function resolveEpisodeNumber(itunesEpisode: unknown, title: string): number | undefined {
  return extractEpisodeNumberFromItunesTag(itunesEpisode) ?? extractEpisodeNumberFromTitle(title);
}

// ---------------------------------------------------------------------------
// Slug
// ---------------------------------------------------------------------------

/**
 * Turns free text into a URL-safe slug (lowercase, hyphens, trimmed length).
 */
export function slugify(text: string, maxLength = 80): string {
  const s = text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return s.slice(0, maxLength).replace(/-+$/g, '') || 'episode';
}

/**
 * Builds the `Episode.slug` field used in URLs like `/episodes/461-topic-name`.
 *
 * - Strips the leading `Eggs 461:` style prefix from the title, slugifies the rest.
 * - If we have an episode number: `{number}-{slugified-tail}`.
 * - If we do not: `{slugified-tail}-{short-id-from-guid}` so two items never collide.
 *
 * The UI turns this into a path with `episodePathFromSlug()` in `episodePaths.ts`.
 */
export function buildEpisodeSlug(options: {
  episodeNumber?: number;
  title: string;
  /** RSS guid — keeps slugs unique when there is no episode number */
  stableId: string;
}): string {
  const withoutPrefix = options.title.replace(/^Eggs\s+\d+\s*:\s*/i, '').trim();
  // Long enough for guest names in the slug tail; total URL segment still reasonable.
  const tail = slugify(withoutPrefix, 96);
  if (options.episodeNumber !== undefined && Number.isFinite(options.episodeNumber)) {
    return `${options.episodeNumber}-${tail}`;
  }
  return `${tail}-${slugify(options.stableId, 12)}`;
}

// ---------------------------------------------------------------------------
// Chapters & summary (Anchor HTML show notes)
// ---------------------------------------------------------------------------

/**
 * Pulls chapter lines like `00:00 Introduction` from the “Chapters” section of
 * the HTML description. Returns `undefined` if that section is not found.
 */
export function extractChaptersFromDescriptionHtml(html: string): EpisodeChapter[] | undefined {
  const header = /<strong>\s*Chapters\s*<\/strong>\s*<\/p>/i;
  const found = header.exec(html);
  if (!found) return undefined;

  // Only scan after the Chapters heading so we do not pick up random timestamps earlier in the HTML.
  const tail = html.slice(found.index + found[0].length);
  const chapters: EpisodeChapter[] = [];
  // Match paragraphs that start with a timestamp (MM:SS or HH:MM:SS)
  const line = /<p>\s*(\d{1,2}:\d{2}(?::\d{2})?)\s+([^<]+?)\s*<\/p>/gi;
  let m: RegExpExecArray | null;
  while ((m = line.exec(tail)) !== null) {
    const title = stripHtmlTags(decodeBasicHtmlEntities(m[2])).trim();
    if (title) chapters.push({ time: m[1], title });
    if (chapters.length > 250) break;
  }
  return chapters.length > 0 ? chapters : undefined;
}

/**
 * First paragraph under the “Summary” heading in the HTML description.
 */
export function extractSummaryFromDescriptionHtml(html: string): string | undefined {
  const m = html.match(/<strong>\s*Summary\s*<\/strong>\s*<\/p>\s*<p>([\s\S]*?)<\/p>/i);
  if (!m) return undefined;
  const plain = stripHtmlTags(decodeBasicHtmlEntities(m[1])).trim();
  return plain || undefined;
}

/**
 * Bullet list under the “Takeaways” heading in show notes (Anchor HTML).
 */
export function extractTakeawaysFromDescriptionHtml(html: string): string[] | undefined {
  const m = html.match(/<strong>\s*Takeaways\s*<\/strong>\s*<\/p>\s*<ul>([\s\S]*?)<\/ul>/i);
  if (!m) return undefined;
  const ul = m[1];
  const out: string[] = [];
  const li = /<li>([\s\S]*?)<\/li>/gi;
  let row: RegExpExecArray | null;
  while ((row = li.exec(ul)) !== null) {
    const t = stripHtmlTags(decodeBasicHtmlEntities(row[1])).trim();
    if (t) out.push(t);
  }
  return out.length > 0 ? out : undefined;
}

// ---------------------------------------------------------------------------
// Guest (heuristic for this podcast’s titles)
// ---------------------------------------------------------------------------

/** “Eggs 461: Topic with Jane Doe” → “Jane Doe” */
export function extractGuestFromTitle(title: string): string | undefined {
  const m = title.match(/\s+with\s+(.+)$/i);
  const name = m?.[1]?.trim();
  return name || undefined;
}

/**
 * Many Anchor show notes repeat the same Apple / iTunes marketing line.
 * This finds the first Apple Podcasts or itun.es URL in HTML (often show-level, not per-episode).
 */
export function extractApplePodcastsUrl(html: string | undefined): string | undefined {
  if (!html) return undefined;
  const full = html.match(/https?:\/\/(?:podcasts\.apple\.com\/[\w./?=&-]+|itun\.es\/[a-zA-Z0-9]+)/i);
  if (full) return full[0];
  const short = html.match(/\bitun\.es\/[a-zA-Z0-9]+/i);
  return short ? `https://${short[0]}` : undefined;
}

/**
 * Finds every 11-character YouTube video id referenced in HTML (watch, embed, or youtu.be).
 * Order is first appearance in the page; duplicates are skipped.
 *
 * The UI usually prefers `resolveYouTubeWatchUrlForEpisode()` in `youtubeMatching.ts`, which
 * uses these ids plus playlist data and scoring — this function is the low-level extractor.
 */
export function extractAllYouTubeVideoIdsFromHtml(html: string | undefined): string[] {
  if (!html) return [];
  const re =
    /https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=([\w-]{11})(?:&[^"'>\s]*)?|embed\/([\w-]{11}))|youtu\.be\/([\w-]{11}))/gi;
  const seen = new Set<string>();
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const id = (m[1] || m[2] || m[3] || '').trim();
    if (id.length === 11 && !seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

/** First YouTube watch URL for a video id found in show notes (stable `watch?v=` form). */
export function extractYouTubeUrl(html: string | undefined): string | undefined {
  const ids = extractAllYouTubeVideoIdsFromHtml(html);
  return ids[0] ? `https://www.youtube.com/watch?v=${ids[0]}` : undefined;
}

// ---------------------------------------------------------------------------
// XML → Episode
// ---------------------------------------------------------------------------

// Anchor’s feed is huge; many `&lt;` / `&amp;` entities in `<itunes:summary>` can exceed the library’s default expansion cap.
const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  trimValues: true,
  processEntities: {
    maxTotalExpansions: 500_000,
    maxEntityCount: 50_000,
    maxExpandedLength: 50_000_000,
  },
});

function ensureArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function pickString(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string') return value.trim() || undefined;
  if (typeof value === 'object' && '#text' in value) {
    const t = String((value as { '#text': unknown })['#text']).trim();
    return t || undefined;
  }
  return String(value).trim() || undefined;
}

function guidToId(guid: unknown): string {
  return pickString(guid) ?? 'unknown-guid';
}

function enclosureUrl(enclosure: unknown): string | undefined {
  if (enclosure && typeof enclosure === 'object' && '@_url' in enclosure) {
    const u = (enclosure as { '@_url': string })['@_url'];
    return typeof u === 'string' && u ? u : undefined;
  }
  return undefined;
}

function itunesImageHref(node: unknown): string | undefined {
  if (node && typeof node === 'object' && '@_href' in node) {
    const u = (node as { '@_href': string })['@_href'];
    return typeof u === 'string' && u ? u : undefined;
  }
  return undefined;
}

function pubDateToIso(pubDate: string | undefined): string {
  if (!pubDate) return new Date(0).toISOString();
  const d = new Date(pubDate);
  return Number.isNaN(d.getTime()) ? new Date(0).toISOString() : d.toISOString();
}

function rawItemToEpisode(raw: Record<string, unknown>): Episode {
  const title = pickString(raw.title) ?? 'Untitled episode';
  const id = guidToId(raw.guid);
  const descriptionHtml = pickString(raw.description);
  const itunesEpisode = raw['itunes:episode'];
  const episodeNumber = resolveEpisodeNumber(itunesEpisode, title);

  const summary =
    descriptionHtml !== undefined
      ? extractSummaryFromDescriptionHtml(descriptionHtml)
      : undefined;

  const chapters =
    descriptionHtml !== undefined ? extractChaptersFromDescriptionHtml(descriptionHtml) : undefined;

  const slug = buildEpisodeSlug({
    episodeNumber,
    title,
    stableId: id,
  });

  return {
    id,
    slug,
    title,
    episodeNumber,
    guest: extractGuestFromTitle(title),
    publishedAt: pubDateToIso(pickString(raw.pubDate)),
    duration: pickString(raw['itunes:duration']),
    summary,
    descriptionHtml,
    image: itunesImageHref(raw['itunes:image']),
    audioUrl: enclosureUrl(raw.enclosure),
    spotifyUrl: pickString(raw.link),
    chapters,
  };
}

/**
 * Parses already-downloaded RSS XML into normalized episodes.
 * Newest episodes first (by `publishedAt`).
 */
export function parseRssXml(xml: string): Episode[] {
  // May throw if the body is not valid XML — `fetchRssEpisodes` catches and logs `[EGGS RSS]`.
  const doc = xmlParser.parse(xml) as Record<string, unknown>;
  const channel = (doc.rss as Record<string, unknown> | undefined)?.channel as
    | Record<string, unknown>
    | undefined;
  if (!channel) {
    console.warn('[EGGS RSS] Parsed XML but found no `rss.channel` node — returning 0 episodes.');
    return [];
  }

  const items = ensureArray<Record<string, unknown>>(channel.item as Record<string, unknown> | Record<string, unknown>[]);

  const episodes = items.map((item) => rawItemToEpisode(item));

  episodes.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  if (episodes.length === 0) {
    console.warn('[EGGS RSS] Feed had a channel but no `item` entries — returning 0 episodes.');
  }
  return episodes;
}

export type FetchRssEpisodesOptions = {
  /** Override the default feed URL */
  feedUrl?: string;
  /** Passed through to `fetch` (e.g. `{ signal: controller.signal }`) */
  init?: RequestInit;
};

/**
 * Downloads the RSS feed and returns normalized episodes.
 *
 * **This is the only place the app performs the HTTP request** for the episode list.
 * Components use `useRssEpisodes()` (see `src/app/hooks/useRssEpisodes.ts`) instead of calling this directly.
 *
 * @throws If the network fails, HTTP status is not ok, the body is empty, or XML parse fails
 */
export async function fetchRssEpisodes(options?: FetchRssEpisodesOptions): Promise<Episode[]> {
  const url = options?.feedUrl ?? resolvePodcastRssUrl();

  let res: Response;
  try {
    res = await fetch(url, {
      ...options?.init,
      headers: {
        Accept: 'application/rss+xml, application/xml, text/xml, */*',
        ...options?.init?.headers,
      },
    });
  } catch (networkErr) {
    console.error(
      '[EGGS RSS] Network request failed (offline, DNS, blocked request, or CORS in the browser).',
      { url, error: networkErr },
    );
    console.error(
      '[EGGS RSS] Hint: In local dev the app usually loads `/podcast-rss.xml` via the Vite proxy (see `vite.config.ts`).',
    );
    throw new Error(
      `Could not reach the podcast feed. Check your connection and the console for “[EGGS RSS]”. URL: ${url}`,
    );
  }

  if (!res.ok) {
    console.error('[EGGS RSS] Server responded with a non-OK HTTP status.', {
      url,
      status: res.status,
      statusText: res.statusText,
    });
    throw new Error(
      `Podcast feed returned HTTP ${res.status} ${res.statusText}. Open the Network tab and inspect the request to "${url}".`,
    );
  }

  const xml = await res.text();
  if (!xml.trim()) {
    console.error('[EGGS RSS] Download succeeded but the response body was empty.', { url });
    throw new Error(`Podcast feed returned an empty body. URL: ${url}`);
  }

  try {
    const parsed = parseRssXml(xml);
    const filtered = parsed.filter((ep) => !isEpisodeTitleExcludedFromSite(ep.title));
    const dropped = parsed.length - filtered.length;
    if (dropped > 0) {
      console.log(
        `[EGGS RSS] Hid ${dropped} episode(s) whose titles match “exclude from site” rules in youtubeChannel.ts (e.g. audio edition duplicates).`,
      );
    }
    return filtered;
  } catch (parseErr) {
    console.error('[EGGS RSS] Downloaded data could not be parsed as RSS/XML.', { url, error: parseErr });
    throw new Error(
      `Podcast feed was not valid RSS/XML. See the console for “[EGGS RSS]”. URL: ${url}`,
    );
  }
}

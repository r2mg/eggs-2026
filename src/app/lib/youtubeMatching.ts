/**
 * RSS episode ↔ YouTube video matching (forgiving, score-based)
 * ==============================================================
 *
 * **What this file does (plain English):**
 * The podcast RSS feed does not always include a clean YouTube link in show notes, and
 * YouTube titles do not always follow the same wording as the RSS title. This module
 * compares an RSS episode to a list of YouTube videos (usually from your channel’s
 * public playlist feed) using several “signals” at once — title similarity, shared
 * words, how close the publish dates are, and (when we can guess a guest name) a small
 * overlap check. The best-scoring video wins if the score is high enough.
 *
 * **Order of decisions:**
 * 1. If the episode slug is listed in the manual map below → use that video id (always wins).
 * 2. Otherwise score every YouTube candidate; a small bonus is added if that video’s id
 *    already appears as a link in show notes (we trust the editor, but still compare titles).
 * 3. If the best score clears a safety threshold → open that video.
 * 4. If not → fall back to the first YouTube link found in show notes (old behavior).
 *
 * **“with Guest Name”** is only a tiny optional hint — not required for a match.
 *
 * **Posters / thumbnails:** Use `resolveYouTubeForEpisode()` — it returns `thumbnailUrl`
 * (playlist image when available, otherwise a public `i.ytimg.com` URL) plus `watchUrl` and `videoId`.
 */

import type { Episode } from '../types/episode';
import {
  extractAllYouTubeVideoIdsFromHtml,
  extractGuestFromTitle,
  extractYouTubeUrl,
} from './rss';
import { videoIdFromYouTubeWatchUrl, youtubeHqThumbnailUrl } from './youtubeThumbnails';

// ---------------------------------------------------------------------------
// Manual overrides (episode slug from the site URL → YouTube video id)
// ---------------------------------------------------------------------------

/**
 * When automatic matching is wrong or impossible, add a row here.
 * The slug is the part after `/episodes/` in your site (copy it from the browser).
 * The value is only the 11-character YouTube id (from the watch URL).
 */
export const MANUAL_EPISODE_SLUG_TO_YOUTUBE_VIDEO_ID: Record<string, string> = {
  // Example (remove the // to activate):
  // '461-brand-story-with-jane-doe': 'dQw4w9WgXcQ',
};

// ---------------------------------------------------------------------------
// Scoring weights (tuned to be forgiving; sum is not required to equal 1)
// ---------------------------------------------------------------------------

/** How much we trust “the same important words appear in both titles” */
const WEIGHT_TOKEN_OVERLAP = 0.34;
/** How much we trust fuzzy character similarity after cleanup */
const WEIGHT_FUZZY_STRING = 0.26;
/** How much we trust publish dates being close together */
const WEIGHT_DATE_PROXIMITY = 0.22;
/** How much we trust the guest name (from RSS) appearing inside the YouTube title */
const WEIGHT_GUEST_OVERLAP = 0.16;
/** Extra points when this video id is already linked in show notes */
const BONUS_LINKED_IN_SHOW_NOTES = 0.18;

/** Below this total, we refuse to guess and fall back to the raw link in show notes (if any). */
const MIN_SCORE_TO_ACCEPT_MATCH = 0.38;

/** Ignore very short words when comparing titles (cuts noise like “a”, “or”). */
const MIN_TOKEN_LENGTH = 2;

// Words removed from titles before comparison (lowercase, no punctuation yet).
const TITLE_FILLER_TOKENS = new Set([
  'eggs',
  'egg',
  'the',
  'a',
  'an',
  'and',
  'or',
  'of',
  'for',
  'to',
  'in',
  'on',
  'at',
  'by',
  'from',
  'with',
  'podcast',
  'episode',
  'ep',
  'show',
  'interview',
  'conversation',
  'talk',
  'ft',
  'featuring',
  'hosted',
  'host',
]);

export type YoutubeCandidate = {
  videoId: string;
  /** Title as YouTube / the playlist feed provides it */
  title: string;
  /** ISO date when the video went live, if known */
  publishedAt?: string;
  /** From the playlist Atom `<media:thumbnail>` when present; otherwise we use `i.ytimg.com` */
  thumbnailUrl?: string;
};

/** Everything the UI needs to show a “Watch on YouTube” treatment with a poster image */
export type ResolvedYouTube = {
  watchUrl?: string;
  videoId?: string;
  thumbnailUrl?: string;
  youtubeTitle?: string;
};

// ---------------------------------------------------------------------------
// Normalization (aggressive so different formats still compare fairly)
// ---------------------------------------------------------------------------

/**
 * Lowercase, remove accents, strip punctuation, collapse spaces, drop common filler words,
 * and optionally remove a leading episode number token (digits at the start).
 */
export function normalizeTitleForMatching(raw: string, options?: { stripLeadingEpisodeNumber?: boolean }): string {
  let s = raw
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  s = s.replace(/[^a-z0-9\s]/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();

  let parts = s.split(' ').filter(Boolean);

  if (options?.stripLeadingEpisodeNumber !== false) {
    while (parts.length > 0 && /^\d+$/.test(parts[0])) {
      parts.shift();
    }
    if (parts.length > 0 && parts[0] === 'ep') {
      parts.shift();
      if (parts.length > 0 && /^\d+$/.test(parts[0])) parts.shift();
    }
  }

  parts = parts.filter((w) => w.length >= MIN_TOKEN_LENGTH && !TITLE_FILLER_TOKENS.has(w));
  return parts.join(' ');
}

function meaningfulTokens(normalized: string): string[] {
  return normalized.split(/\s+/).filter((t) => t.length >= MIN_TOKEN_LENGTH);
}

/** How similar two token lists are (0 = no overlap, 1 = identical sets). */
function tokenJaccard(a: string[], b: string[]): number {
  const A = new Set(a);
  const B = new Set(b);
  if (A.size === 0 && B.size === 0) return 1;
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const t of A) {
    if (B.has(t)) inter += 1;
  }
  return inter / (A.size + B.size - inter);
}

/** Simple Levenshtein distance (titles are short, so this is fast enough). */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const row = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) row[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = row[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
      prev = tmp;
    }
  }
  return row[n];
}

/** Turns distance into a 0–1 similarity (1 = identical). */
function fuzzySimilarity(a: string, b: string): number {
  const cap = 160;
  const sa = a.slice(0, cap).replace(/\s/g, '');
  const sb = b.slice(0, cap).replace(/\s/g, '');
  if (sa.length === 0 && sb.length === 0) return 1;
  if (sa.length === 0 || sb.length === 0) return 0;
  const dist = levenshtein(sa, sb);
  const denom = Math.max(sa.length, sb.length);
  return Math.max(0, 1 - dist / denom);
}

function dateProximityScore(rssIso: string, ytIso: string | undefined): number {
  if (!ytIso) return 0;
  const a = Date.parse(rssIso);
  const b = Date.parse(ytIso);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  const days = Math.abs(a - b) / (86_400_000);
  if (days <= 1) return 1;
  if (days <= 5) return 0.9;
  if (days <= 14) return 0.72;
  if (days <= 30) return 0.55;
  if (days <= 60) return 0.35;
  if (days <= 120) return 0.2;
  return 0.08;
}

/**
 * If the RSS title ends with “with Jane Doe”, compare those name tokens to the YouTube title.
 * We do **not** require YouTube to use the word “with”.
 */
function guestOverlapScore(rssGuest: string | undefined, youtubeTitleRaw: string): number {
  if (!rssGuest?.trim()) return 0;
  const gTokens = meaningfulTokens(normalizeTitleForMatching(rssGuest, { stripLeadingEpisodeNumber: false }));
  if (gTokens.length === 0) return 0;
  const ytTokens = new Set(meaningfulTokens(normalizeTitleForMatching(youtubeTitleRaw, { stripLeadingEpisodeNumber: false })));
  if (ytTokens.size === 0) return 0;
  let hits = 0;
  for (const t of gTokens) {
    if (ytTokens.has(t)) hits += 1;
  }
  return hits / gTokens.length;
}

/** Optional: text after “ with ” on YouTube — tiny extra overlap with RSS title tokens. */
function withClauseHintOverlap(rssNorm: string, youtubeTitleRaw: string): number {
  const m = youtubeTitleRaw.match(/\s+with\s+(.+)$/i);
  const tail = m?.[1];
  if (!tail) return 0;
  const ytTailTokens = new Set(meaningfulTokens(normalizeTitleForMatching(tail, { stripLeadingEpisodeNumber: false })));
  const rssTokens = new Set(meaningfulTokens(rssNorm));
  if (ytTailTokens.size === 0 || rssTokens.size === 0) return 0;
  let inter = 0;
  for (const t of ytTailTokens) {
    if (rssTokens.has(t)) inter += 1;
  }
  return inter / ytTailTokens.size;
}

function scoreEpisodeAgainstCandidate(
  episode: Episode,
  candidate: YoutubeCandidate,
  idsLinkedInHtml: Set<string>,
): number {
  const rssTitleNorm = normalizeTitleForMatching(episode.title, { stripLeadingEpisodeNumber: true });
  const ytTitleNorm = normalizeTitleForMatching(candidate.title, { stripLeadingEpisodeNumber: true });

  if (rssTitleNorm.length > 0 && rssTitleNorm === ytTitleNorm) {
    return 1;
  }

  const rssTokens = meaningfulTokens(rssTitleNorm);
  const ytTokens = meaningfulTokens(ytTitleNorm);
  const tokenScore = tokenJaccard(rssTokens, ytTokens);

  const fuzzyScore = fuzzySimilarity(rssTitleNorm, ytTitleNorm);

  const dateScore = dateProximityScore(episode.publishedAt, candidate.publishedAt);

  const guestFromRss = episode.guest?.trim() || extractGuestFromTitle(episode.title);
  const guestScore = guestOverlapScore(guestFromRss, candidate.title);
  const withHintScore = withClauseHintOverlap(rssTitleNorm, candidate.title);
  const guestBlend = Math.max(guestScore, withHintScore * 0.85);

  let total =
    WEIGHT_TOKEN_OVERLAP * tokenScore +
    WEIGHT_FUZZY_STRING * fuzzyScore +
    WEIGHT_DATE_PROXIMITY * dateScore +
    WEIGHT_GUEST_OVERLAP * guestBlend;

  if (idsLinkedInHtml.has(candidate.videoId)) {
    total += BONUS_LINKED_IN_SHOW_NOTES;
  }

  return Math.min(1, total);
}

function watchUrlFromVideoId(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

function posterForCandidate(candidate: YoutubeCandidate | undefined, videoId: string): string {
  if (candidate?.thumbnailUrl?.trim()) return candidate.thumbnailUrl.trim();
  return youtubeHqThumbnailUrl(videoId);
}

/**
 * Pick the best YouTube match for this RSS episode: watch link, video id, poster URL, and
 * YouTube title when we know it (from the playlist feed).
 */
export function resolveYouTubeForEpisode(episode: Episode, youtubeCatalog: YoutubeCandidate[]): ResolvedYouTube {
  const catalogById = new Map(youtubeCatalog.map((c) => [c.videoId, c]));

  const manualId = MANUAL_EPISODE_SLUG_TO_YOUTUBE_VIDEO_ID[episode.slug]?.trim();
  if (manualId) {
    const c = catalogById.get(manualId);
    return {
      watchUrl: watchUrlFromVideoId(manualId),
      videoId: manualId,
      thumbnailUrl: posterForCandidate(c, manualId),
      youtubeTitle: c?.title,
    };
  }

  const idsInHtml = extractAllYouTubeVideoIdsFromHtml(episode.descriptionHtml);
  const linkedSet = new Set(idsInHtml);

  const candidateIds = new Set<string>();
  for (const c of youtubeCatalog) candidateIds.add(c.videoId);
  for (const id of idsInHtml) candidateIds.add(id);

  if (candidateIds.size === 0) {
    const fallbackUrl = extractYouTubeUrl(episode.descriptionHtml);
    const vid = videoIdFromYouTubeWatchUrl(fallbackUrl);
    if (fallbackUrl && vid) {
      const c = catalogById.get(vid);
      return {
        watchUrl: fallbackUrl,
        videoId: vid,
        thumbnailUrl: posterForCandidate(c, vid),
        youtubeTitle: c?.title,
      };
    }
    return {};
  }

  let bestId: string | null = null;
  let bestScore = -1;

  for (const videoId of candidateIds) {
    const fromCatalog = catalogById.get(videoId);
    const candidate: YoutubeCandidate = fromCatalog ?? {
      videoId,
      title: '',
      publishedAt: undefined,
    };

    const score = scoreEpisodeAgainstCandidate(episode, candidate, linkedSet);
    if (score > bestScore) {
      bestScore = score;
      bestId = videoId;
    }
  }

  if (bestId && bestScore >= MIN_SCORE_TO_ACCEPT_MATCH) {
    const c = catalogById.get(bestId);
    return {
      watchUrl: watchUrlFromVideoId(bestId),
      videoId: bestId,
      thumbnailUrl: posterForCandidate(c, bestId),
      youtubeTitle: c?.title,
    };
  }

  const fallbackUrl = extractYouTubeUrl(episode.descriptionHtml);
  const vid = videoIdFromYouTubeWatchUrl(fallbackUrl);
  if (fallbackUrl && vid) {
    const c = catalogById.get(vid);
    return {
      watchUrl: fallbackUrl,
      videoId: vid,
      thumbnailUrl: posterForCandidate(c, vid),
      youtubeTitle: c?.title,
    };
  }

  return {};
}

/**
 * Watch URL only — same rules as {@link resolveYouTubeForEpisode}; kept for call sites
 * that only need the link.
 */
export function resolveYouTubeWatchUrlForEpisode(episode: Episode, youtubeCatalog: YoutubeCandidate[]): string | undefined {
  return resolveYouTubeForEpisode(episode, youtubeCatalog).watchUrl;
}

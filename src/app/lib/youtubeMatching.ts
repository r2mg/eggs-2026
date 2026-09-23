/**
 * RSS episode ↔ YouTube video matching
 * =====================================
 *
 * **Stable identity is the YouTube video id.** Titles and descriptions can be rewritten
 * for SEO; the id does not change. Once a slug is locked to an id, later builds reuse it
 * and never re-guess from wording.
 *
 * **First-time match (no locked id yet):**
 * 1. YouTube title still says `Eggs NNN` / `Episode NNN` — that number wins.
 * 2. Guest name from the RSS title in the YouTube title or description, plus a close
 *    publish date. Prefer the public retitled upload over an older `Eggs NNN:` copy.
 * 3. If there is no parseable guest, fall back to title similarity (legacy), but never
 *    across a different Eggs number or a different guest name.
 * 4. Last resort: a YouTube link already in the RSS show notes.
 *
 * Locked ids are ignored when they fail those checks (wrong episode number or guest).
 * Build-time QC then makes sure one video is not assigned to two episodes.
 *
 * You do **not** need to keep the show title, episode number, or any special line in the
 * YouTube description after the video exists. The number in the title is used only when
 * it is still there.
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
  '483-curiosity-driven-leadership-with-jon-beebe': 'XZ7Gf37v778',
  '472-lead-anyway-with-greg-hoover': '4SywEx93y3E',
  '443-closing-the-gap-between-belief-and-breakthrough-with-david-neagle': '0c6Eeo_WmwA',
  '354-startup-success-ryan-carson-s-journey-in-building-an-ai-driven-company': 'yYbWJ1_P21o',
  '407-ai-s-transformative-role-in-modern-marketing-with-perry-marshall': 'CEgYCIVSODQ',
  '454-the-evolution-of-marketing-embracing-change-with-perry-marshall': 'Po7YsltWWOo',
  '484-human-creativity-in-an-ai-world-with-joe-baron': 'fzmNjGNDrpQ',
  '326-ian-paget-graphic-designer-and-founder-of-logogeek-uk': '5irs3kKIkdI',
  '327-how-to-win-at-real-estate-investing-when-the-market-sucks-with-alan-siebenaler': 'idF1tXIDxTA',
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
/** How much we trust the guest name (from RSS) appearing in the YouTube title or description */
const WEIGHT_GUEST_OVERLAP = 0.16;

/** Full guest-name overlap required for a first-time identity match. */
const MIN_GUEST_OVERLAP_FOR_IDENTITY = 1;
/** ~30 days — weekly episodes plus a delayed YouTube upload still line up. */
const MIN_DATE_SCORE_FOR_IDENTITY = 0.55;
/** Extra points when this video id is already linked in show notes */
const BONUS_LINKED_IN_SHOW_NOTES = 0.18;
/** Extra points when the YouTube title includes the same episode number (e.g. “Eggs 354”). */
const BONUS_EPISODE_NUMBER_IN_TITLE = 0.32;

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
  /** YouTube description — used for guest-name matching when titles diverge after SEO edits */
  description?: string;
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
 * Fraction of guest-name tokens found in a YouTube title or description blob.
 * We do **not** require YouTube to use the word “with”.
 */
export function guestNameOverlapInText(rssGuest: string | undefined, textRaw: string | undefined): number {
  if (!rssGuest?.trim() || !textRaw?.trim()) return 0;
  const gTokens = meaningfulTokens(normalizeTitleForMatching(rssGuest, { stripLeadingEpisodeNumber: false }));
  if (gTokens.length === 0) return 0;
  const textTokens = new Set(meaningfulTokens(normalizeTitleForMatching(textRaw, { stripLeadingEpisodeNumber: false })));
  if (textTokens.size === 0) return 0;
  let hits = 0;
  for (const t of gTokens) {
    if (textTokens.has(t)) hits += 1;
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
    const dateScore = dateProximityScore(episode.publishedAt, candidate.publishedAt);
    // Classics reruns reuse the original title; same wording years later is not identity.
    if (dateScore >= MIN_DATE_SCORE_FOR_IDENTITY) return 1;
    return Math.min(0.45, WEIGHT_DATE_PROXIMITY * dateScore + 0.12);
  }

  const rssTokens = meaningfulTokens(rssTitleNorm);
  const ytTokens = meaningfulTokens(ytTitleNorm);
  const tokenScore = tokenJaccard(rssTokens, ytTokens);

  const fuzzyScore = fuzzySimilarity(rssTitleNorm, ytTitleNorm);

  const dateScore = dateProximityScore(episode.publishedAt, candidate.publishedAt);

  const guestFromRss = episode.guest?.trim() || extractGuestFromTitle(episode.title);
  const guestInTitle = guestNameOverlapInText(guestFromRss, candidate.title);
  const guestInDescription = guestNameOverlapInText(guestFromRss, candidate.description);
  const withHintScore = withClauseHintOverlap(rssTitleNorm, candidate.title);
  const guestBlend = Math.max(guestInTitle, guestInDescription, withHintScore * 0.85);

  let total =
    WEIGHT_TOKEN_OVERLAP * tokenScore +
    WEIGHT_FUZZY_STRING * fuzzyScore +
    WEIGHT_DATE_PROXIMITY * dateScore +
    WEIGHT_GUEST_OVERLAP * guestBlend;

  if (idsLinkedInHtml.has(candidate.videoId)) {
    total += BONUS_LINKED_IN_SHOW_NOTES;
  }

  const episodeNo = episode.episodeNumber;
  if (
    episodeNo !== undefined &&
    Number.isFinite(episodeNo) &&
    new RegExp(`(?:eggs\\s+|episode\\s+)${episodeNo}\\b`, 'i').test(candidate.title)
  ) {
    total += BONUS_EPISODE_NUMBER_IN_TITLE;
  }

  return Math.min(1, total);
}

function isEggsNumberedTitle(title: string | undefined): boolean {
  return !!title && /^eggs\s+\d+\s*:/i.test(title.trim());
}

/**
 * Many episodes have two YouTube uploads: the original “Eggs 407: …” title and a later
 * public title (“Marketing, AI, and the 80/20 Rule | Perry Marshall”). Prefer the public one.
 */
function preferPublicYoutubeVersion(
  episode: Episode,
  bestId: string,
  candidateIds: Iterable<string>,
  catalogById: Map<string, YoutubeCandidate>,
): string {
  const best = catalogById.get(bestId);
  if (!isEggsNumberedTitle(best?.title)) return bestId;

  const guest = episode.guest?.trim() || extractGuestFromTitle(episode.title);
  let chosen = bestId;
  let chosenDate = dateProximityScore(episode.publishedAt, best?.publishedAt);

  for (const videoId of candidateIds) {
    if (videoId === bestId) continue;
    const candidate = catalogById.get(videoId);
    if (!candidate?.title || isEggsNumberedTitle(candidate.title)) continue;
    if (guest && guestNameOverlapInText(guest, candidate.title) < 1) continue;
    const dateScore = dateProximityScore(episode.publishedAt, candidate.publishedAt);
    if (dateScore < 0.35) continue;
    if (chosen === bestId || dateScore > chosenDate) {
      chosen = videoId;
      chosenDate = dateScore;
    }
  }
  return chosen;
}

function watchUrlFromVideoId(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

function posterForCandidate(candidate: YoutubeCandidate | undefined, videoId: string): string {
  if (candidate?.thumbnailUrl?.trim()) return candidate.thumbnailUrl.trim();
  return youtubeHqThumbnailUrl(videoId);
}

function resolvedYouTubeFromCandidate(
  catalogById: Map<string, YoutubeCandidate>,
  videoId: string,
): ResolvedYouTube {
  const c = catalogById.get(videoId);
  return {
    watchUrl: watchUrlFromVideoId(videoId),
    videoId,
    thumbnailUrl: posterForCandidate(c, videoId),
    youtubeTitle: c?.title,
  };
}

/**
 * First-time match: same guest (title or description) and a close publish date.
 * Title wording is ignored. Prefers the public retitled upload when two copies exist.
 */
function resolveByGuestAndDate(
  episode: Episode,
  candidateIds: Iterable<string>,
  catalogById: Map<string, YoutubeCandidate>,
  excludeVideoIds?: Set<string>,
): string | null {
  const guest = episode.guest?.trim() || extractGuestFromTitle(episode.title);
  if (!guest) return null;

  const hits: { id: string; dateScore: number; publicTitle: boolean }[] = [];
  for (const videoId of candidateIds) {
    if (excludeVideoIds?.has(videoId)) continue;
    const candidate = catalogById.get(videoId);
    if (!candidate) continue;
    if (youtubeAssignmentConflicts(episode, candidate)) continue;
    const guestScore = Math.max(
      guestNameOverlapInText(guest, candidate.title),
      guestNameOverlapInText(guest, candidate.description),
    );
    if (guestScore < MIN_GUEST_OVERLAP_FOR_IDENTITY) continue;
    const dateScore = dateProximityScore(episode.publishedAt, candidate.publishedAt);
    if (dateScore < MIN_DATE_SCORE_FOR_IDENTITY) continue;
    hits.push({
      id: videoId,
      dateScore,
      publicTitle: !isEggsNumberedTitle(candidate.title),
    });
  }
  if (hits.length === 0) return null;
  hits.sort((a, b) => Number(b.publicTitle) - Number(a.publicTitle) || b.dateScore - a.dateScore);
  return hits[0]!.id;
}

/** “Eggs 326: …” / “Episode 038” in a YouTube title — the video id for that show number. */
export function episodeNumberFromYoutubeTitle(title: string | undefined): number | undefined {
  if (!title?.trim()) return undefined;
  const m = title.trim().match(/\b(?:eggs|episode)\s+0*(\d{1,4})\b/i);
  if (!m) return undefined;
  const n = Number.parseInt(m[1]!, 10);
  return Number.isFinite(n) ? n : undefined;
}

function resolveByEpisodeNumber(
  episode: Episode,
  candidateIds: Iterable<string>,
  catalogById: Map<string, YoutubeCandidate>,
  excludeVideoIds?: Set<string>,
): string | null {
  const n = episode.episodeNumber;
  if (n === undefined || !Number.isFinite(n)) return null;
  const hits: { id: string; dateScore: number }[] = [];
  for (const videoId of candidateIds) {
    if (excludeVideoIds?.has(videoId)) continue;
    const candidate = catalogById.get(videoId);
    if (!candidate?.title) continue;
    if (episodeNumberFromYoutubeTitle(candidate.title) !== n) continue;
    hits.push({
      id: videoId,
      dateScore: dateProximityScore(episode.publishedAt, candidate.publishedAt),
    });
  }
  if (hits.length === 0) return null;
  hits.sort((a, b) => b.dateScore - a.dateScore);
  return hits[0]!.id;
}

/**
 * True when this video cannot belong to the RSS episode: wrong Eggs number in the
 * YouTube title, or a different guest in the YouTube title.
 */
export function youtubeAssignmentConflicts(
  episode: Episode,
  candidate: YoutubeCandidate | undefined,
): string | undefined {
  if (!candidate?.title && !candidate?.description) return undefined;

  const ytNum = episodeNumberFromYoutubeTitle(candidate.title);
  if (
    episode.episodeNumber !== undefined &&
    ytNum !== undefined &&
    ytNum !== episode.episodeNumber
  ) {
    return `YouTube title is Eggs ${ytNum}, RSS is episode ${episode.episodeNumber}`;
  }

  const guest = episode.guest?.trim() || extractGuestFromTitle(episode.title);
  if (!guest) return undefined;

  const overlap = Math.max(
    guestNameOverlapInText(guest, candidate.title),
    guestNameOverlapInText(guest, candidate.description),
  );
  if (overlap >= MIN_GUEST_OVERLAP_FOR_IDENTITY) return undefined;

  const ytGuest = extractGuestFromTitle(candidate.title ?? '');
  if (ytGuest && guestNameOverlapInText(guest, ytGuest) < MIN_GUEST_OVERLAP_FOR_IDENTITY) {
    return `YouTube guest “${ytGuest}” does not match RSS guest “${guest}”`;
  }
  return undefined;
}

/**
 * Pick the best YouTube match for this RSS episode: watch link, video id, poster URL, and
 * YouTube title when we know it (from the playlist feed).
 */
export function resolveYouTubeForEpisode(
  episode: Episode,
  youtubeCatalog: YoutubeCandidate[],
  lockedVideoId?: string,
  excludeVideoIds?: Set<string>,
): ResolvedYouTube {
  const catalogById = new Map(youtubeCatalog.map((c) => [c.videoId, c]));

  const pinned =
    lockedVideoId?.trim() || MANUAL_EPISODE_SLUG_TO_YOUTUBE_VIDEO_ID[episode.slug]?.trim();
  if (pinned && pinned.length === 11 && !excludeVideoIds?.has(pinned)) {
    const pinnedCandidate = catalogById.get(pinned);
    if (!youtubeAssignmentConflicts(episode, pinnedCandidate ?? { videoId: pinned, title: '' })) {
      return resolvedYouTubeFromCandidate(catalogById, pinned);
    }
  }

  const idsInHtml = extractAllYouTubeVideoIdsFromHtml(episode.descriptionHtml);
  const linkedSet = new Set(idsInHtml);

  const candidateIds = new Set<string>();
  for (const c of youtubeCatalog) candidateIds.add(c.videoId);
  for (const id of idsInHtml) candidateIds.add(id);

  if (candidateIds.size === 0) {
    const fallbackUrl = extractYouTubeUrl(episode.descriptionHtml);
    const vid = videoIdFromYouTubeWatchUrl(fallbackUrl);
    if (fallbackUrl && vid && !excludeVideoIds?.has(vid)) {
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

  const byNumber = resolveByEpisodeNumber(episode, candidateIds, catalogById, excludeVideoIds);
  if (byNumber) {
    return resolvedYouTubeFromCandidate(catalogById, byNumber);
  }

  const byGuestAndDate = resolveByGuestAndDate(episode, candidateIds, catalogById, excludeVideoIds);
  if (byGuestAndDate) {
    return resolvedYouTubeFromCandidate(catalogById, byGuestAndDate);
  }

  let bestId: string | null = null;
  let bestScore = -1;

  for (const videoId of candidateIds) {
    if (excludeVideoIds?.has(videoId)) continue;
    const fromCatalog = catalogById.get(videoId);
    const candidate: YoutubeCandidate = fromCatalog ?? {
      videoId,
      title: '',
      publishedAt: undefined,
    };
    if (youtubeAssignmentConflicts(episode, candidate)) continue;

    const score = scoreEpisodeAgainstCandidate(episode, candidate, linkedSet);
    if (score > bestScore) {
      bestScore = score;
      bestId = videoId;
    }
  }

  if (bestId && bestScore >= MIN_SCORE_TO_ACCEPT_MATCH) {
    const publicId = preferPublicYoutubeVersion(episode, bestId, candidateIds, catalogById);
    if (!excludeVideoIds?.has(publicId)) {
      return resolvedYouTubeFromCandidate(catalogById, publicId);
    }
    return resolvedYouTubeFromCandidate(catalogById, bestId);
  }

  const fallbackUrl = extractYouTubeUrl(episode.descriptionHtml);
  const vid = videoIdFromYouTubeWatchUrl(fallbackUrl);
  if (fallbackUrl && vid && !excludeVideoIds?.has(vid)) {
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

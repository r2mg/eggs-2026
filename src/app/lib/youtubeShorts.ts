/**
 * Heuristics for YouTube Shorts / clip uploads vs long-form podcast episodes.
 *
 * The public channel Atom feed does not include duration. EGGS Shorts currently use a
 * punchy title plus several #hashtags; long-form episode titles do not. Keep in sync with
 * `isLikelyYouTubeShortTitle` in `netlify/functions/check-new-episode.mjs`.
 */

const SHORTS_HASHTAG_RE = /#shorts?\b/i;

/** Two or more #tags is how current EGGS clip titles are formatted. */
const MIN_HASHTAGS_FOR_CLIP = 2;

export function isLikelyYouTubeShortTitle(title: string | undefined): boolean {
  if (!title?.trim()) return false;
  const t = title.trim();
  if (SHORTS_HASHTAG_RE.test(t)) return true;
  const tags = t.match(/#\w+/g) ?? [];
  return tags.length >= MIN_HASHTAGS_FOR_CLIP;
}

/** Parse YouTube `contentDetails.duration` (ISO 8601, e.g. PT45S, PT1H2M). */
export function parseIso8601DurationSeconds(iso: string | undefined): number {
  if (!iso?.trim()) return 0;
  const m = iso.trim().match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);
  if (!m) return 0;
  const h = m[1] ? Number(m[1]) : 0;
  const min = m[2] ? Number(m[2]) : 0;
  const s = m[3] ? Number(m[3]) : 0;
  return h * 3600 + min * 60 + s;
}

/** Shorts shelf is typically under 3 minutes; podcast episodes are far longer. */
export function isShortFormDuration(iso: string | undefined): boolean {
  const seconds = parseIso8601DurationSeconds(iso);
  return seconds > 0 && seconds < 180;
}

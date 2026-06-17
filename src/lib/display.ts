/** Small presentation helpers shared across Astro pages. */
import { format } from 'date-fns';

/** URL builders for the static routes. */
export const episodePath = (slug: string): string => `/episodes/${encodeURIComponent(slug)}`;
export const guestPath = (slug: string): string => `/guests/${encodeURIComponent(slug)}`;
export const topicPath = (slug: string): string => `/topics/${encodeURIComponent(slug)}`;

/** Turn `<itunes:duration>` like `01:04:14` into a short human label. */
export function formatDurationLabel(raw: string | undefined): string {
  if (!raw?.trim()) return '—';
  const parts = raw.trim().split(':').map((p) => Number.parseInt(p, 10));
  if (parts.some((n) => Number.isNaN(n))) return raw.trim();
  if (parts.length === 3) {
    const [h, m] = parts;
    if (h > 0) return `${h}h ${m}m`;
    return `${m} min`;
  }
  if (parts.length === 2) return `${parts[0]} min`;
  return raw.trim();
}

/** ISO timestamp → "June 17, 2026". Returns "" on bad input. */
export function formatDate(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : format(d, 'MMMM d, yyyy');
}

/** Uppercased eyebrow line: "EPISODE 461 • JUNE 17, 2026 • 58 MIN". */
export function episodeEyebrow(episodeNumber: number | undefined, iso: string, duration: string | undefined): string {
  const num = episodeNumber !== undefined ? String(episodeNumber) : '—';
  return `Episode ${num} • ${formatDate(iso)} • ${formatDurationLabel(duration)}`.toUpperCase();
}

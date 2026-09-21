/**
 * Last-known-good YouTube matches (slug → video id) when the Data API is over quota.
 * Snapshot from production deploy 6a9f503 (2026-09-08), plus the current long-form upload.
 */
import type { Episode } from '../types/episode';
import type { YoutubeEpisodeOverlay } from '../types/youtubeOverlay';
import { youtubeMaxresThumbnailUrl } from './youtubeThumbnails';
import seed from '../../data/youtube-slug-seed.json';

export type YoutubeSlugSeedEntry = {
  slug: string;
  videoId: string;
  featured?: boolean;
  collections?: string[];
};

function seedEntries(): YoutubeSlugSeedEntry[] {
  const entries = (seed as { entries?: YoutubeSlugSeedEntry[] }).entries;
  return Array.isArray(entries) ? entries : [];
}

export function seedSlugToVideoIdMap(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const row of seedEntries()) {
    if (row.slug && row.videoId) out[row.slug] = row.videoId;
  }
  return out;
}

function overlayFromSeed(row: YoutubeSlugSeedEntry): YoutubeEpisodeOverlay {
  return {
    youtubeVideoId: row.videoId,
    youtubeUrl: `https://www.youtube.com/watch?v=${row.videoId}`,
    youtubeEmbedUrl: `https://www.youtube.com/embed/${row.videoId}`,
    youtubeThumbnail: youtubeMaxresThumbnailUrl(row.videoId),
    featured: !!row.featured,
    collections: row.collections?.length ? [...row.collections] : undefined,
  };
}

/** Prefer the saved public YouTube match. Catalog matching often keeps the older “Eggs NNN:” upload. */
export function applyYoutubeSlugSeed(
  overlays: Record<string, YoutubeEpisodeOverlay | null>,
  episodes: Episode[],
): number {
  const bySlug = new Map(seedEntries().map((row) => [row.slug, row]));
  let applied = 0;
  for (const ep of episodes) {
    const row = bySlug.get(ep.slug);
    if (!row?.videoId) continue;
    const existing = overlays[ep.slug];
    if (existing?.youtubeVideoId === row.videoId) continue;
    const seeded = overlayFromSeed(row);
    overlays[ep.slug] = {
      ...seeded,
      featured: existing?.featured || seeded.featured,
      featuredRank: existing?.featuredRank,
      collections: existing?.collections?.length ? existing.collections : seeded.collections,
      startHere: existing?.startHere,
    };
    applied += 1;
  }
  return applied;
}

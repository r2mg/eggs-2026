/**
 * Last-known-good YouTube matches (slug → video id) when the Data API is over quota.
 * Snapshot from production deploy 6a9f503 (2026-09-08), plus the current long-form upload.
 */
import type { Episode } from '../types/episode';
import type { YoutubeEpisodeOverlay } from '../types/youtubeOverlay';
import { youtubeHqThumbnailUrl } from './youtubeThumbnails';
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

function overlayFromSeed(row: YoutubeSlugSeedEntry): YoutubeEpisodeOverlay {
  return {
    youtubeVideoId: row.videoId,
    youtubeUrl: `https://www.youtube.com/watch?v=${row.videoId}`,
    youtubeEmbedUrl: `https://www.youtube.com/embed/${row.videoId}`,
    youtubeThumbnail: youtubeHqThumbnailUrl(row.videoId),
    featured: !!row.featured,
    collections: row.collections?.length ? [...row.collections] : undefined,
  };
}

/** Fill gaps only — never replace a Data API / Atom match. */
export function applyYoutubeSlugSeed(
  overlays: Record<string, YoutubeEpisodeOverlay | null>,
  episodes: Episode[],
): number {
  const bySlug = new Map(seedEntries().map((row) => [row.slug, row]));
  let applied = 0;
  for (const ep of episodes) {
    if (overlays[ep.slug]?.youtubeVideoId) continue;
    const row = bySlug.get(ep.slug);
    if (!row?.videoId) continue;
    overlays[ep.slug] = overlayFromSeed(row);
    applied += 1;
  }
  return applied;
}

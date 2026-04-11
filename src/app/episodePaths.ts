/**
 * Episode URL helpers (`src/app/episodePaths.ts`)
 * ===============================================
 *
 * **Where routing lives:** The React Router paths (e.g. `/episodes/:slug`) are declared
 * in `src/app/App.tsx` inside `<Routes>`. These functions only build path *strings* that
 * match those routes.
 *
 * **How slugs are created:** Each `Episode.slug` is built in `buildEpisodeSlug()` in
 * `src/app/lib/rss.ts` when the RSS feed is parsed. It is *not* defined here — this file
 * only encodes that slug into a safe URL segment.
 *
 * **Numeric URLs:** `EpisodeDetail` also accepts a plain number in the path (e.g. `/episodes/461`)
 * for older links; those strings are built inline, not by a helper here.
 */

/**
 * Path for the episode detail route: `/episodes/:slug`.
 * Uses `encodeURIComponent` so slugs with spaces or special characters still work.
 */
export function episodePathFromSlug(slug: string): string {
  return `/episodes/${encodeURIComponent(slug)}`;
}

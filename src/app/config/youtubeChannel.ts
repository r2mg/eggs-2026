/**
 * EGGS! YouTube channel — one place for IDs and editorial playlist *names*
 * ========================================================================
 *
 * **Playlist IDs:** You do *not* have to paste IDs here. The app loads every public
 * playlist on the channel and finds the right ones by **matching these titles** (case
 * and extra spaces are ignored).
 *
 * **What you should do in YouTube Studio:**
 * 1. Create playlists whose titles match the constants below (exact wording helps).
 * 2. Add videos to those playlists in the order you want (Featured order = `featuredRank`).
 *
 * **Where your API key goes:** *not* in this file. Put `VITE_YOUTUBE_API_KEY=...` in a
 * file named `.env` in the **project root** (same folder as `package.json`). Never commit
 * `.env` to git.
 */

/** From your channel URL — used for all YouTube Data API v3 calls */
export const YOUTUBE_CHANNEL_ID = 'UCz53WsQ9KmEJb5yKeMTsmGg';

/** Human-friendly channel link (not used by the API, for your own reference) */
export const YOUTUBE_CHANNEL_HANDLE_URL = 'https://www.youtube.com/@EggsThePodcast';

/** Custom channel URL — use for “Watch on YouTube” style CTAs that should open the channel, not one video. */
export const YOUTUBE_CHANNEL_PAGE_URL = 'https://www.youtube.com/EggsThePodcast';

/**
 * Editorial playlists — the app finds them by **title** after listing all channel playlists.
 * Rename your YouTube playlists to match (or change these strings to match your playlists).
 */
export const PLAYLIST_TITLE_FEATURED = 'EGGS Featured';
export const PLAYLIST_TITLE_START_HERE = 'EGGS Start Here';

/**
 * Topic / category playlists. Each title should match a YouTube playlist.
 * Episode `collections` will include the full title string (e.g. "EGGS Entrepreneurship").
 */
export const EGGS_TOPIC_PLAYLIST_TITLES = [
  'EGGS Entrepreneurship',
  'EGGS Branding',
  'EGGS Creativity',
  'EGGS Business Growth',
  'EGGS Technology',
  'EGGS Culture',
  'EGGS Leadership',
  'EGGS Expertise',
] as const;

/** Optional: paste a playlist ID here later if you prefer ID-based matching for that list */
export const KNOWN_PLAYLIST_IDS: Partial<{
  featured: string;
  startHere: string;
  uploads: string;
}> = {};

/** Normalize playlist titles for comparison (lowercase, single spaces) */
export function normalizePlaylistTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function titleMatchesPlaylist(expected: string, actual: string): boolean {
  return normalizePlaylistTitle(actual) === normalizePlaylistTitle(expected);
}

/**
 * Playlists whose **items** are not merged into the site’s YouTube catalog.
 *
 * Use this for lists like an “audio edition” that duplicate the same episodes as other
 * playlists and would confuse matching or featured/topic logic. Title matching is
 * case-insensitive and ignores extra spaces (same rules as `titleMatchesPlaylist`).
 */
export const PLAYLIST_TITLES_EXCLUDED_FROM_YOUTUBE_MERGE: readonly string[] = [
  'Eggs the Podcast Audio Edition',
  'EGGS The Podcast Audio Edition',
];

/**
 * RSS episodes whose **title** contains any of these (case-insensitive) are dropped from
 * the site list (archive, home, routing). Use for duplicate “audio only” feed items.
 */
export const EPISODE_TITLE_SUBSTRINGS_EXCLUDE_FROM_SITE: readonly string[] = ['audio edition'];

/** `true` if this playlist should be skipped when loading playlist items for matching / CMS */
export function isPlaylistExcludedFromYouTubeMerge(playlistTitle: string): boolean {
  if (
    PLAYLIST_TITLES_EXCLUDED_FROM_YOUTUBE_MERGE.some((excluded) =>
      titleMatchesPlaylist(excluded, playlistTitle),
    )
  ) {
    return true;
  }
  const n = normalizePlaylistTitle(playlistTitle);
  // YouTube title variants (spacing, “EGGS”, punctuation) still often contain this phrase.
  if (n.includes('audio edition') && (n.includes('egg') || n.includes('podcast'))) {
    return true;
  }
  return false;
}

/** Hide RSS rows that are clearly the separate “audio edition” feed duplicates */
export function isEpisodeTitleExcludedFromSite(episodeTitle: string): boolean {
  const t = episodeTitle.toLowerCase();
  return EPISODE_TITLE_SUBSTRINGS_EXCLUDE_FROM_SITE.some((frag) => t.includes(frag.toLowerCase()));
}

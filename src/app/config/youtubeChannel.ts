/**
 * EGGS! YouTube channel — editorial playlists (IDs + titles)
 * ===========================================================
 *
 * **Featured playlist (recommended):** Paste the real playlist id below in
 * `KNOWN_PLAYLIST_IDS.featured`. That id is the **source of truth** for:
 * - Homepage “Featured Conversations” order
 * - Archive “Featured” sort and `featured` badges
 *
 * The id works even if the playlist is **Unlisted** (it may not appear in the channel’s
 * public playlist list — the app still fetches it by id). If you leave `featured` empty,
 * the app falls back to finding a playlist whose **title** matches `PLAYLIST_TITLE_FEATURED`
 * (e.g. `EGGS Featured`) among playlists returned for the channel.
 *
 * **Other playlists:** You can still rely on **title** matching for lists that appear in
 * the channel playlist list, or add optional ids in `KNOWN_PLAYLIST_IDS` the same way.
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
 * **Fallback** titles — used only when no `KNOWN_PLAYLIST_IDS.*` is set for that slot.
 * Title matching is case-insensitive; extra spaces are normalized.
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
  'EGGS Featured',
  'EGGS Technology',
  'EGGS Culture',
  'EGGS Leadership',
  'EGGS Expertise',
] as const;

/**
 * **Deterministic playlist ids** (optional but recommended for Featured).
 * Paste the id from the playlist URL: `youtube.com/playlist?list=THIS_PART`
 *
 * - `featured` — editorial “EGGS Featured” list (homepage Featured row + archive Featured logic).
 * - `startHere` — optional; same idea for “EGGS Start Here” if you want id-based resolution.
 * - `uploads` — rarely needed; only if you must override the channel uploads playlist id.
 */
export const KNOWN_PLAYLIST_IDS: Partial<{
  featured: string;
  startHere: string;
  uploads: string;
}> = {
  /** EGGS Featured — https://www.youtube.com/playlist?list=PLkk4WlaE-9QQGk6LvEo3iltt5qFs28JQ7 */
  featured: 'PLkk4WlaE-9QQGk6LvEo3iltt5qFs28JQ7',
};

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

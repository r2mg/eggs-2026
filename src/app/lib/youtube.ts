/**
 * YouTube Data API v3 — EGGS! podcast site
 * =========================================
 *
 * **Your API key (required for YouTube features):**
 * Create a file named `.env` in the project root (next to `package.json`) and add **one line**:
 *
 *   VITE_YOUTUBE_API_KEY=paste_your_key_here
 *
 * Restart `npm run dev` after saving `.env`.
 *
 * **Security note (important):** Any name starting with `VITE_` is **embedded in the
 * JavaScript bundle** visitors download. That means the key is **public**. For a small
 * podcast site this is often acceptable if you **restrict the key** in Google Cloud
 * Console to only the YouTube Data API and set **HTTP referrer** restrictions to your
 * domain. For stronger secrecy you would need a tiny server proxy (not part of this app).
 *
 * If `VITE_YOUTUBE_API_KEY` is missing, the app **still runs** on RSS only; this module
 * logs a clear message and returns empty results.
 */

import {
  EGGS_TOPIC_PLAYLIST_TITLES,
  KNOWN_PLAYLIST_IDS,
  PLAYLIST_TITLE_FEATURED,
  PLAYLIST_TITLE_START_HERE,
  YOUTUBE_CHANNEL_ID,
  isPlaylistExcludedFromYouTubeMerge,
  titleMatchesPlaylist,
} from '../config/youtubeChannel';

const API_ROOT = 'https://www.googleapis.com/youtube/v3';

// ---------------------------------------------------------------------------
// Fetch limits (keeps first paint fast — tune in one place)
// ---------------------------------------------------------------------------
/** Uploads list is newest-first; this many items is plenty for RSS title matching */
const YOUTUBE_UPLOADS_PLAYLIST_MAX_ITEMS = 450;
/** Per EGGS topic / editorial playlist (each is usually much smaller than uploads) */
const YOUTUBE_OTHER_PLAYLIST_MAX_ITEMS = 200;
/** Scan excluded lists (e.g. “Audio Edition”) this deep to learn which video ids to ban */
const YOUTUBE_EXCLUDED_PLAYLIST_MAX_ITEMS = 6000;

// ---------------------------------------------------------------------------
// Homepage “lite” fetch — much smaller than `fetchYouTubeChannelData` (see bottom of file)
// ---------------------------------------------------------------------------
/** Newest uploads merged into the homepage catalog (enough for latest + typical matches). */
const YOUTUBE_HOME_LITE_UPLOADS_MAX_ITEMS = 180;
/** Featured / Start Here playlist rows to pull (only these editorial lists, not every EGGS topic list). */
const YOUTUBE_HOME_LITE_EDITORIAL_PLAYLIST_MAX_ITEMS = 80;
/** Still learn “blocked” ids from excluded playlists, but do not scan thousands of rows on first paint. */
const YOUTUBE_HOME_LITE_EXCLUDED_PLAYLIST_MAX_ITEMS = 300;
/** How many playlistItem requests run at once (each playlist still pages sequentially) */
const YOUTUBE_PLAYLIST_FETCH_CONCURRENCY = 5;

// ---------------------------------------------------------------------------
// Types (match your editorial / UI needs)
// ---------------------------------------------------------------------------

export type YouTubeThumbnails = {
  default?: string;
  medium?: string;
  high?: string;
  standard?: string;
  maxres?: string;
};

export type YouTubeVideo = {
  videoId: string;
  title: string;
  description?: string;
  publishedAt?: string;
  thumbnails?: YouTubeThumbnails;
  playlistIds?: string[];
  playlistTitles?: string[];
  positionsByPlaylist?: Record<string, number>;
  youtubeUrl: string;
  embedUrl: string;
};

export type YouTubePlaylist = {
  id: string;
  title: string;
  description?: string;
  itemCount?: number;
};

type ApiPage<T> = {
  items?: T[];
  nextPageToken?: string;
};

// ---------------------------------------------------------------------------
// API key
// ---------------------------------------------------------------------------

let loggedMissingKey = false;

/**
 * Reads `import.meta.env.VITE_YOUTUBE_API_KEY` (set from root `.env` in Vite).
 * Returns `null` if unset — callers should fall back to RSS-only behaviour.
 */
export function getYouTubeApiKey(): string | null {
  const raw = import.meta.env.VITE_YOUTUBE_API_KEY;
  if (typeof raw !== 'string' || !raw.trim()) {
    if (!loggedMissingKey) {
      loggedMissingKey = true;
      if (import.meta.env.DEV) {
        console.warn(
          '[EGGS YouTube API] Missing VITE_YOUTUBE_API_KEY.\n' +
            'Copy `.env.example` to `.env` in the project root and set:\n' +
            '  VITE_YOUTUBE_API_KEY=your_key_here\n' +
            'Then restart the dev server. The site keeps working on RSS only without this key.',
        );
      } else {
        console.info('[EGGS YouTube API] No VITE_YOUTUBE_API_KEY — YouTube enrichment off (RSS only).');
      }
    }
    return null;
  }
  return raw.trim();
}

// ---------------------------------------------------------------------------
// Low-level HTTP helper
// ---------------------------------------------------------------------------

async function youtubeGet<T extends Record<string, unknown>>(
  endpoint: string,
  params: Record<string, string>,
): Promise<T> {
  const key = getYouTubeApiKey();
  if (!key) {
    throw new Error('YouTube API key is not configured');
  }

  const url = new URL(`${API_ROOT}/${endpoint}`);
  url.searchParams.set('key', key);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString());
  const json = (await res.json()) as T & { error?: { message?: string } };

  if (!res.ok) {
    const msg = json.error?.message ?? res.statusText;
    console.error('[EGGS YouTube API] Request failed:', endpoint, res.status, msg, url.pathname);
    throw new Error(msg);
  }

  return json;
}

async function paginateItems<T>(
  fetchPage: (pageToken?: string) => Promise<ApiPage<T>>,
): Promise<T[]> {
  const out: T[] = [];
  let token: string | undefined;
  do {
    const page = await fetchPage(token);
    if (page.items?.length) out.push(...page.items);
    token = page.nextPageToken;
  } while (token);
  return out;
}

// ---------------------------------------------------------------------------
// Thumbnail helpers (from API `thumbnails` object)
// ---------------------------------------------------------------------------

export function pickBestThumbnailUrl(thumbnails?: YouTubeThumbnails): string | undefined {
  if (!thumbnails) return undefined;
  return (
    thumbnails.maxres ??
    thumbnails.standard ??
    thumbnails.high ??
    thumbnails.medium ??
    thumbnails.default
  );
}

function mapThumbnails(raw: Record<string, { url?: string }> | undefined): YouTubeThumbnails | undefined {
  if (!raw) return undefined;
  return {
    default: raw.default?.url,
    medium: raw.medium?.url,
    high: raw.high?.url,
    standard: raw.standard?.url,
    maxres: raw.maxres?.url,
  };
}

// ---------------------------------------------------------------------------
// Public API functions
// ---------------------------------------------------------------------------

/** Loads `contentDetails` so we can read the **uploads** playlist id. */
export async function fetchChannelUploadsPlaylistId(channelId: string = YOUTUBE_CHANNEL_ID): Promise<string | null> {
  const key = getYouTubeApiKey();
  if (!key) return null;

  const data = await youtubeGet<{ items?: { contentDetails?: { relatedPlaylists?: { uploads?: string } } }[] }>(
    'channels',
    { part: 'contentDetails', id: channelId },
  );
  const uploads = data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploads) {
    console.warn('[EGGS YouTube API] No uploads playlist id on channel response.');
    return null;
  }
  return uploads;
}

/** Every public playlist on the channel (title + id + item count). */
export async function fetchPlaylistsForChannel(channelId: string = YOUTUBE_CHANNEL_ID): Promise<YouTubePlaylist[]> {
  const key = getYouTubeApiKey();
  if (!key) return [];

  const items = await paginateItems((pageToken) =>
    youtubeGet<ApiPage<{ id: string; snippet?: { title?: string; description?: string }; contentDetails?: { itemCount?: number } }>>(
      'playlists',
      {
        part: 'snippet,contentDetails',
        channelId,
        maxResults: '50',
        ...(pageToken ? { pageToken } : {}),
      },
    ),
  );

  return items.map((row) => ({
    id: row.id,
    title: row.snippet?.title?.trim() || '(untitled playlist)',
    description: row.snippet?.description?.trim(),
    itemCount: row.contentDetails?.itemCount,
  }));
}

type PlaylistItemRow = {
  snippet?: {
    title?: string;
    description?: string;
    publishedAt?: string;
    position?: number;
    resourceId?: { videoId?: string };
    thumbnails?: Record<string, { url?: string }>;
  };
  contentDetails?: {
    videoPublishedAt?: string;
  };
};

/**
 * Playlist items, up to `maxItems` rows (then stops — avoids downloading an entire channel history).
 * Pass `Number.MAX_SAFE_INTEGER` to fetch everything (rare; mostly for debugging).
 */
export async function fetchPlaylistItemsUpTo(
  playlistId: string,
  maxItems: number,
): Promise<PlaylistItemRow[]> {
  const key = getYouTubeApiKey();
  if (!key) return [];

  const out: PlaylistItemRow[] = [];
  let token: string | undefined;
  const cap = Number.isFinite(maxItems) ? maxItems : Number.MAX_SAFE_INTEGER;

  do {
    const page = await youtubeGet<ApiPage<PlaylistItemRow>>('playlistItems', {
      part: 'snippet,contentDetails',
      playlistId,
      maxResults: '50',
      ...(token ? { pageToken: token } : {}),
    });
    const batch = page.items ?? [];
    for (const row of batch) {
      out.push(row);
      if (out.length >= cap) return out;
    }
    token = page.nextPageToken;
  } while (token);

  return out;
}

/** All items in a playlist (full pagination — can be slow on huge lists). */
export async function fetchPlaylistItems(playlistId: string): Promise<PlaylistItemRow[]> {
  return fetchPlaylistItemsUpTo(playlistId, Number.MAX_SAFE_INTEGER);
}

export type YouTubeChannelData = {
  uploadsPlaylistId: string | null;
  playlists: YouTubePlaylist[];
  /** One entry per video id (merged across playlists) */
  videosById: Map<string, YouTubeVideo>;
  /**
   * Video ids from excluded playlists (e.g. “Audio Edition”) — removed from `videosById`
   * and must not “win” via show-notes fallback matching either.
   */
  blockedVideoIds: Set<string>;
};

/**
 * Fetches uploads + all “EGGS …” playlists (and always the uploads list), merges videos,
 * and returns a map you can match RSS episodes against.
 */
export async function fetchYouTubeChannelData(
  channelId: string = YOUTUBE_CHANNEL_ID,
): Promise<YouTubeChannelData> {
  const empty: YouTubeChannelData = {
    uploadsPlaylistId: null,
    playlists: [],
    videosById: new Map(),
    blockedVideoIds: new Set(),
  };

  if (!getYouTubeApiKey()) return empty;

  let uploadsPlaylistId =
    KNOWN_PLAYLIST_IDS.uploads ??
    (await fetchChannelUploadsPlaylistId(channelId));

  const playlists = await fetchPlaylistsForChannel(channelId);

  const excludedPlaylists = playlists.filter((p) => isPlaylistExcludedFromYouTubeMerge(p.title));
  const blockedVideoIds = new Set<string>();
  await Promise.all(
    excludedPlaylists.map(async (p) => {
      const items = await fetchPlaylistItemsUpTo(p.id, YOUTUBE_EXCLUDED_PLAYLIST_MAX_ITEMS);
      for (const row of items) {
        const vid = row.snippet?.resourceId?.videoId;
        if (vid && vid.length === 11) blockedVideoIds.add(vid);
      }
    }),
  );
  if (excludedPlaylists.length > 0) {
    console.log(
      `[EGGS YouTube API] Excluded playlist(s): ${excludedPlaylists.map((p) => p.title).join(' | ')} — collected ${blockedVideoIds.size} video id(s) to omit (even when the same video also appears in Uploads).`,
    );
  }

  const playlistIdsToLoad = new Set<string>();
  if (uploadsPlaylistId) playlistIdsToLoad.add(uploadsPlaylistId);

  for (const p of playlists) {
    if (isPlaylistExcludedFromYouTubeMerge(p.title)) continue;
    const t = p.title.trim();
    if (t.toLowerCase().startsWith('eggs')) {
      playlistIdsToLoad.add(p.id);
    }
  }

  if (KNOWN_PLAYLIST_IDS.featured) playlistIdsToLoad.add(KNOWN_PLAYLIST_IDS.featured);
  if (KNOWN_PLAYLIST_IDS.startHere) playlistIdsToLoad.add(KNOWN_PLAYLIST_IDS.startHere);

  const videosById = new Map<string, YouTubeVideo>();

  const mergeItem = (
    videoId: string,
    snippet: PlaylistItemRow['snippet'],
    playlist: { id: string; title: string },
    position: number,
    videoPublishedAt?: string,
  ) => {
    const title = snippet?.title?.trim() || '(untitled)';
    const description = snippet?.description?.trim();
    const publishedAt = videoPublishedAt || snippet?.publishedAt;
    const thumbnails = mapThumbnails(snippet?.thumbnails);

    const existing = videosById.get(videoId);
    if (!existing) {
      videosById.set(videoId, {
        videoId,
        title,
        description,
        publishedAt,
        thumbnails,
        playlistIds: [playlist.id],
        playlistTitles: [playlist.title],
        positionsByPlaylist: { [playlist.id]: position },
        youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
        embedUrl: `https://www.youtube.com/embed/${videoId}`,
      });
      return;
    }

    const ids = new Set(existing.playlistIds ?? []);
    const titles = new Set(existing.playlistTitles ?? []);
    ids.add(playlist.id);
    titles.add(playlist.title);
    existing.playlistIds = [...ids];
    existing.playlistTitles = [...titles];
    existing.positionsByPlaylist = {
      ...(existing.positionsByPlaylist ?? {}),
      [playlist.id]: position,
    };
    if (!existing.description && description) existing.description = description;
    if (!existing.publishedAt && publishedAt) existing.publishedAt = publishedAt;
    if (!pickBestThumbnailUrl(existing.thumbnails) && thumbnails) existing.thumbnails = thumbnails;
    if (title && title !== '(untitled)') existing.title = title;
  };

  const playlistLoadList = [...playlistIdsToLoad];
  for (let i = 0; i < playlistLoadList.length; i += YOUTUBE_PLAYLIST_FETCH_CONCURRENCY) {
    const batch = playlistLoadList.slice(i, i + YOUTUBE_PLAYLIST_FETCH_CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (pid) => {
        const meta = playlists.find((p) => p.id === pid);
        const playlistTitle = meta?.title ?? '(playlist)';
        const maxItems =
          uploadsPlaylistId && pid === uploadsPlaylistId
            ? YOUTUBE_UPLOADS_PLAYLIST_MAX_ITEMS
            : YOUTUBE_OTHER_PLAYLIST_MAX_ITEMS;
        const items = await fetchPlaylistItemsUpTo(pid, maxItems);
        return { pid, playlistTitle, items };
      }),
    );
    for (const { pid, playlistTitle, items } of results) {
      for (const row of items) {
        const vid = row.snippet?.resourceId?.videoId;
        if (!vid || vid.length !== 11) continue;
        const pos = row.snippet?.position ?? 0;
        const published = row.contentDetails?.videoPublishedAt;
        mergeItem(vid, row.snippet, { id: pid, title: playlistTitle }, pos, published);
      }
    }
  }

  let removedBlocked = 0;
  for (const vid of blockedVideoIds) {
    if (videosById.delete(vid)) removedBlocked += 1;
  }
  if (removedBlocked > 0) {
    console.log(
      `[EGGS YouTube API] Removed ${removedBlocked} video(s) from the merge catalog because they appear on excluded playlist(s).`,
    );
  }

  if (!uploadsPlaylistId && playlists.length) {
    console.warn('[EGGS YouTube API] Uploads playlist id missing; matching may be incomplete.');
  }

  console.log(
    `[EGGS YouTube API] Playlist fetch caps: uploads ≤${YOUTUBE_UPLOADS_PLAYLIST_MAX_ITEMS} items, other lists ≤${YOUTUBE_OTHER_PLAYLIST_MAX_ITEMS} items each (${YOUTUBE_PLAYLIST_FETCH_CONCURRENCY} playlists in parallel per batch).`,
  );

  return {
    uploadsPlaylistId,
    playlists,
    videosById,
    blockedVideoIds,
  };
}

/**
 * **Homepage-only** YouTube snapshot — same `YouTubeChannelData` shape, far less network + CPU.
 *
 * What we skip compared to `fetchYouTubeChannelData`:
 * - We do **not** download every “EGGS …” topic playlist’s videos (those lists can be huge).
 * - We only merge **uploads + Featured + Start Here** (plus a capped scan of excluded lists for blocked ids).
 * - Uploads and excluded scans use **smaller caps** so first paint wins.
 *
 * The archive (`/episodes`) still uses the full fetch so matching older episodes stays reliable.
 */
export async function fetchYouTubeChannelHomeLite(
  channelId: string = YOUTUBE_CHANNEL_ID,
): Promise<YouTubeChannelData> {
  const empty: YouTubeChannelData = {
    uploadsPlaylistId: null,
    playlists: [],
    videosById: new Map(),
    blockedVideoIds: new Set(),
  };

  if (!getYouTubeApiKey()) return empty;

  let uploadsPlaylistId =
    KNOWN_PLAYLIST_IDS.uploads ?? (await fetchChannelUploadsPlaylistId(channelId));

  const playlists = await fetchPlaylistsForChannel(channelId);

  const excludedPlaylists = playlists.filter((p) => isPlaylistExcludedFromYouTubeMerge(p.title));
  const blockedVideoIds = new Set<string>();
  await Promise.all(
    excludedPlaylists.map(async (p) => {
      const items = await fetchPlaylistItemsUpTo(p.id, YOUTUBE_HOME_LITE_EXCLUDED_PLAYLIST_MAX_ITEMS);
      for (const row of items) {
        const vid = row.snippet?.resourceId?.videoId;
        if (vid && vid.length === 11) blockedVideoIds.add(vid);
      }
    }),
  );

  const { featuredId, startHereId } = resolveEditorialPlaylistIds(playlists);

  const playlistIdsToLoad = new Set<string>();
  if (uploadsPlaylistId) playlistIdsToLoad.add(uploadsPlaylistId);
  if (featuredId) playlistIdsToLoad.add(featuredId);
  if (startHereId) playlistIdsToLoad.add(startHereId);

  const videosById = new Map<string, YouTubeVideo>();

  const mergeItem = (
    videoId: string,
    snippet: PlaylistItemRow['snippet'],
    playlist: { id: string; title: string },
    position: number,
    videoPublishedAt?: string,
  ) => {
    const title = snippet?.title?.trim() || '(untitled)';
    const description = snippet?.description?.trim();
    const publishedAt = videoPublishedAt || snippet?.publishedAt;
    const thumbnails = mapThumbnails(snippet?.thumbnails);

    const existing = videosById.get(videoId);
    if (!existing) {
      videosById.set(videoId, {
        videoId,
        title,
        description,
        publishedAt,
        thumbnails,
        playlistIds: [playlist.id],
        playlistTitles: [playlist.title],
        positionsByPlaylist: { [playlist.id]: position },
        youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
        embedUrl: `https://www.youtube.com/embed/${videoId}`,
      });
      return;
    }

    const ids = new Set(existing.playlistIds ?? []);
    const titles = new Set(existing.playlistTitles ?? []);
    ids.add(playlist.id);
    titles.add(playlist.title);
    existing.playlistIds = [...ids];
    existing.playlistTitles = [...titles];
    existing.positionsByPlaylist = {
      ...(existing.positionsByPlaylist ?? {}),
      [playlist.id]: position,
    };
    if (!existing.description && description) existing.description = description;
    if (!existing.publishedAt && publishedAt) existing.publishedAt = publishedAt;
    if (!pickBestThumbnailUrl(existing.thumbnails) && thumbnails) existing.thumbnails = thumbnails;
    if (title && title !== '(untitled)') existing.title = title;
  };

  const playlistLoadList = [...playlistIdsToLoad];
  for (let i = 0; i < playlistLoadList.length; i += YOUTUBE_PLAYLIST_FETCH_CONCURRENCY) {
    const batch = playlistLoadList.slice(i, i + YOUTUBE_PLAYLIST_FETCH_CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (pid) => {
        const meta = playlists.find((p) => p.id === pid);
        const playlistTitle = meta?.title ?? '(playlist)';
        const maxItems =
          uploadsPlaylistId && pid === uploadsPlaylistId
            ? YOUTUBE_HOME_LITE_UPLOADS_MAX_ITEMS
            : YOUTUBE_HOME_LITE_EDITORIAL_PLAYLIST_MAX_ITEMS;
        const items = await fetchPlaylistItemsUpTo(pid, maxItems);
        return { pid, playlistTitle, items };
      }),
    );
    for (const { pid, playlistTitle, items } of results) {
      for (const row of items) {
        const vid = row.snippet?.resourceId?.videoId;
        if (!vid || vid.length !== 11) continue;
        const pos = row.snippet?.position ?? 0;
        const published = row.contentDetails?.videoPublishedAt;
        mergeItem(vid, row.snippet, { id: pid, title: playlistTitle }, pos, published);
      }
    }
  }

  let removedBlocked = 0;
  for (const vid of blockedVideoIds) {
    if (videosById.delete(vid)) removedBlocked += 1;
  }
  if (removedBlocked > 0) {
    console.log(
      `[EGGS YouTube API] Home lite: removed ${removedBlocked} blocked video(s) from the small merge catalog.`,
    );
  }

  console.log(
    `[EGGS YouTube API] Home lite snapshot: uploads ≤${YOUTUBE_HOME_LITE_UPLOADS_MAX_ITEMS}, editorial lists ≤${YOUTUBE_HOME_LITE_EDITORIAL_PLAYLIST_MAX_ITEMS}, excluded scan ≤${YOUTUBE_HOME_LITE_EXCLUDED_PLAYLIST_MAX_ITEMS} per excluded playlist.`,
  );

  return {
    uploadsPlaylistId,
    playlists,
    videosById,
    blockedVideoIds,
  };
}

/** Resolve special playlist ids (featured / start here) for enrichment */
export function resolveEditorialPlaylistIds(playlists: YouTubePlaylist[]): {
  featuredId: string | null;
  startHereId: string | null;
} {
  const featured =
    KNOWN_PLAYLIST_IDS.featured ??
    playlists.find((p) => titleMatchesPlaylist(PLAYLIST_TITLE_FEATURED, p.title))?.id ??
    null;
  const startHere =
    KNOWN_PLAYLIST_IDS.startHere ??
    playlists.find((p) => titleMatchesPlaylist(PLAYLIST_TITLE_START_HERE, p.title))?.id ??
    null;
  return { featuredId: featured, startHereId: startHere };
}

/** Topic playlist titles from config — used for Explore counts */
export function expectedTopicPlaylistTitles(): readonly string[] {
  return EGGS_TOPIC_PLAYLIST_TITLES;
}

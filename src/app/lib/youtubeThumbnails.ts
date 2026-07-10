/**
 * YouTube still images (thumbnails / posters) without the Data API
 * ================================================================
 *
 * YouTube exposes predictable image URLs for every public video id. They are served
 * from Google’s CDN (`i.ytimg.com`) and work in a normal `<img src="…">` with **no API key**
 * and **no backend**.
 *
 * **Quality order:** We try sharper sizes first; some shorts or old uploads do not have
 * `maxresdefault`, so the browser may 404 once — use `onError` to fall back (see
 * `YouTubePosterImage` or `youtubeThumbnailFallbackUrls()`).
 *
 * **What you do *not* get from thumbnails alone:** view counts, full descriptions, or
 * duration. Those need either the **YouTube Data API** (API key + quota, usually server-side)
 * or scraping (not recommended). The playlist Atom feed already gives **title** and
 * **published** date per video when you configure `VITE_YOUTUBE_PLAYLIST_ID`.
 */

const YT_IMG = 'https://i.ytimg.com/vi';

/** 1280×720 when available; often missing for older or very short videos */
export function youtubeMaxresThumbnailUrl(videoId: string): string {
  return `${YT_IMG}/${videoId}/maxresdefault.jpg`;
}

/** 480×360 — reliable default for UI cards */
export function youtubeHqThumbnailUrl(videoId: string): string {
  return `${YT_IMG}/${videoId}/hqdefault.jpg`;
}

export function youtubeMqThumbnailUrl(videoId: string): string {
  return `${YT_IMG}/${videoId}/mqdefault.jpg`;
}

export function youtubeDefaultThumbnailUrl(videoId: string): string {
  return `${YT_IMG}/${videoId}/default.jpg`;
}

/**
 * Order: try sharpest first; use the next URL if `onError` fires on `<img>`.
 */
export function youtubeThumbnailFallbackUrls(videoId: string): string[] {
  const id = videoId.trim();
  if (id.length !== 11) return [];
  return [
    youtubeMaxresThumbnailUrl(id),
    youtubeHqThumbnailUrl(id),
    youtubeMqThumbnailUrl(id),
    youtubeDefaultThumbnailUrl(id),
  ];
}

/** YouTube `i.ytimg.com` URLs include the video id in a predictable segment. */
const YT_IMG_VIDEO_RE = /\/vi\/([\w-]{11})\//;

/**
 * Pick a display-sized thumbnail URL. Hero/detail keeps the build-time URL (often maxres/high);
 * cards downgrade YouTube JPEGs to hqdefault to avoid downloading 1280px images into small grids.
 */
export function episodeThumbnailForDisplay(
  url: string | undefined,
  size: 'hero' | 'card' = 'card',
): string {
  const trimmed = url?.trim();
  if (!trimmed) return '';
  if (size === 'hero') return trimmed;
  const id = trimmed.match(YT_IMG_VIDEO_RE)?.[1];
  if (id) return youtubeHqThumbnailUrl(id);
  return trimmed;
}

/** Pull the 11-character id from a `watch?v=` or `youtu.be` URL. */
export function videoIdFromYouTubeWatchUrl(url: string | undefined): string | undefined {
  if (!url?.trim()) return undefined;
  const m =
    url.match(/[?&]v=([\w-]{11})(?:&|$)/i)?.[1] ??
    url.match(/youtu\.be\/([\w-]{11})/i)?.[1] ??
    url.match(/youtube\.com\/embed\/([\w-]{11})/i)?.[1];
  return m?.trim();
}

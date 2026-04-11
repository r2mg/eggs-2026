/**
 * Normalized podcast episode used across the app.
 * Populated from the RSS feed (see `src/app/lib/rss.ts`).
 */
export type EpisodeChapter = {
  time: string;
  title: string;
};

export type Episode = {
  /** Stable id — we use the RSS `<guid>` value */
  id: string;
  /** URL-safe slug for routing and links (see `buildEpisodeSlug` in rss.ts) */
  slug: string;
  /** Full episode title from the feed (often includes “Eggs NNN: …”) */
  title: string;
  episodeNumber?: number;
  /** Parsed from the title when it ends with “with Guest Name” (common on this show) */
  guest?: string;
  /** ISO 8601 timestamp from `<pubDate>` */
  publishedAt: string;
  /** Raw `<itunes:duration>` string, e.g. `01:04:14` */
  duration?: string;
  /** Short plain-text summary when we can read it from the HTML description */
  summary?: string;
  /** Full `<description>` HTML (show notes) */
  descriptionHtml?: string;
  image?: string;
  audioUrl?: string;
  /** Episode page on Spotify / Anchor (the `<link>` field on this feed) */
  spotifyUrl?: string;
  /** Reserved for future iTunes/category fields — not set by the current RSS parser */
  topic?: string;
  /**
   * `featured` / `featuredRank` are normally set by YouTube playlist membership
   * (“EGGS Featured”) when `VITE_YOUTUBE_API_KEY` is configured — see `enrichEpisodesWithYouTube.ts`.
   */
  featured?: boolean;
  /** Order within the “EGGS Featured” YouTube playlist (lower = earlier in playlist). */
  featuredRank?: number;
  /** Topic / category playlist titles from YouTube (e.g. “EGGS Entrepreneurship”). */
  collections?: string[];
  /** True when the video is in the “EGGS Start Here” YouTube playlist */
  startHere?: boolean;
  /** Set when RSS was matched to a YouTube upload (Data API v3 + scoring) */
  youtubeVideoId?: string;
  youtubeUrl?: string;
  youtubeEmbedUrl?: string;
  /** Prefer this 16:9 image in the UI when present; else use RSS `image` */
  youtubeThumbnail?: string;
  transcript?: string;
  chapters?: EpisodeChapter[];
};

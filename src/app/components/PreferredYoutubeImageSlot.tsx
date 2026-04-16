import { useEffect, useMemo, useState } from 'react';
import { youtubeThumbnailFallbackUrls } from '../lib/youtubeThumbnails';
import { MediaLoadingShimmer } from './MediaLoadingShimmer';

type Props = {
  /**
   * Change this when the episode identity changes (usually the RSS slug) so internal
   * “which URL are we trying?” state resets cleanly.
   */
  resetKey: string;
  /** Podcast artwork from the RSS feed — used only after we know YouTube will not be shown, or as a backup. */
  rssImage?: string;
  /** Present when the YouTube overlay matched this episode to a video. */
  youtubeVideoId?: string;
  /** Optional sharper URL from the Data API — we try it before the public `i.ytimg.com` chain. */
  youtubeThumbnailPreferred?: string;
  /**
   * True while the site is still fetching the YouTube channel snapshot (when an API key exists).
   * During this time we **only** show the skeleton — not the RSS image — so you never see RSS
   * swap to YouTube a moment later.
   */
  awaitYoutubeOverlay: boolean;
  /** Extra classes for the final `<img>` (for example `object-cover` and hover zoom). Opacity is handled here. */
  imageClassName?: string;
};

/**
 * Shared YouTube/RSS episode image slot for **featured cards, archive, episode detail**, etc.
 * Chain: Data API `youtubeThumbnailPreferred` (if any) **then** maxres → hq → mq → default.
 *
 * The **homepage latest-episode hero** does **not** use this — it uses `HomeHeroYoutubeThumb`
 * (mq first, then one sharp layer; no “preferred” as first paint).
 *
 * The parent should keep `aspect-video` (or any fixed ratio) on the outer box; this layer
 * fills it with `absolute inset-0`.
 */
export default function PreferredYoutubeImageSlot({
  resetKey,
  rssImage,
  youtubeVideoId,
  youtubeThumbnailPreferred,
  awaitYoutubeOverlay,
  imageClassName = '',
}: Props) {
  const rss = rssImage?.trim() ?? '';

  const ytUrls = useMemo(() => {
    const id = youtubeVideoId?.trim();
    if (!id || id.length !== 11) return [];
    const chain = youtubeThumbnailFallbackUrls(id);
    const p = youtubeThumbnailPreferred?.trim();
    if (!p) return chain;
    return [p, ...chain.filter((u) => u !== p)];
  }, [youtubeVideoId, youtubeThumbnailPreferred]);

  // --- “Try YouTube, then RSS” branch ---
  const [useRssFallback, setUseRssFallback] = useState(false);
  const [ytIndex, setYtIndex] = useState(0);
  const [pixelsReady, setPixelsReady] = useState(false);

  useEffect(() => {
    setUseRssFallback(false);
    setYtIndex(0);
    setPixelsReady(false);
  }, [resetKey, youtubeVideoId, awaitYoutubeOverlay]);

  // --- Branch 1: YouTube is still “on its way” from the server ---
  // We deliberately do **not** paint the RSS image here, because that is what caused the
  // old “flash then swap” effect when the YouTube thumbnail arrived a moment later.
  if (awaitYoutubeOverlay) {
    return (
      <>
        <MediaLoadingShimmer retreating={false} />
        <span className="sr-only">Loading episode artwork</span>
      </>
    );
  }

  // --- Branch 2: We know the video id — try Google’s thumbnail URLs (same idea as `YouTubePosterImage`) ---
  if (ytUrls.length > 0 && !useRssFallback) {
    const src = ytUrls[Math.min(ytIndex, ytUrls.length - 1)];

    return (
      <>
        {/* Shimmer (z-5) under the photo (z-10) until pixels load; card scrims stay at z-2 */}
        <MediaLoadingShimmer retreating={pixelsReady} />
        <img
          key={`yt-${ytIndex}-${src}`}
          src={src}
          alt=""
          className={`absolute inset-0 z-[10] h-full w-full object-cover transition-opacity duration-500 ${
            pixelsReady ? 'opacity-100' : 'opacity-0'
          } ${imageClassName}`}
          onLoad={() => setPixelsReady(true)}
          onError={() => {
            setPixelsReady(false);
            if (ytIndex < ytUrls.length - 1) {
              setYtIndex((i) => i + 1);
            } else {
              // No more YouTube URLs — either RSS below, or the empty placeholder at the end.
              setUseRssFallback(true);
            }
          }}
        />
      </>
    );
  }

  // --- Branch 3: Either there was no YouTube match, or every thumbnail URL failed ---
  // Now it is finally safe to show the podcast artwork from the RSS feed.
  if (rss) {
    return (
      <>
        <MediaLoadingShimmer retreating={pixelsReady} />
        <img
          src={rss}
          alt=""
          className={`absolute inset-0 z-[10] h-full w-full object-cover transition-opacity duration-500 ${
            pixelsReady ? 'opacity-100' : 'opacity-0'
          } ${imageClassName}`}
          onLoad={() => setPixelsReady(true)}
        />
      </>
    );
  }

  return <div className="absolute inset-0 z-[5] eggs-skeleton-block" aria-hidden />;
}

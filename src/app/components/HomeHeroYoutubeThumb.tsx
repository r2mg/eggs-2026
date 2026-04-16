import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  youtubeHeroFirstPaintThumbnailUrls,
  youtubeHeroSharperUpgradeUrl,
} from '../lib/youtubeThumbnails';
import { MediaLoadingShimmer } from './MediaLoadingShimmer';

type Props = {
  /** Changes when the episode changes (RSS slug) so loading state resets cleanly. */
  resetKey: string;
  /** Podcast artwork from RSS — only used when YouTube has no match or every URL fails (never shown during the “wait for YouTube” phase). */
  rssImage?: string;
  /** Set when the app matched this episode to a YouTube upload. */
  youtubeVideoId?: string;
  /** Optional high-quality URL from the YouTube Data API — used for the *sharp upgrade* layer, not as the first paint. */
  youtubeThumbnailPreferred?: string;
  /**
   * True while the YouTube channel snapshot is still loading (when an API key exists).
   * We show only the skeleton — never the RSS image — so there is no RSS-to-YouTube flash.
   */
  awaitYoutubeOverlay: boolean;
  /** Passed through to the `<img>` tags (e.g. hover zoom). */
  imageClassName?: string;
};

/**
 * **Homepage latest-episode hero only** — tuned for speed:
 *
 * 1. **Skeleton first** while `awaitYoutubeOverlay` is true (same rule as the rest of the site).
 * 2. **First paint** uses a small, reliable YouTube file (`hqdefault.jpg`), *not* `maxresdefault`,
 *    which is often slower or missing.
 * 3. **Progressive upgrade**: after the quick image is showing, we optionally load a sharper URL
 *    (Data API thumbnail if we have it, otherwise `maxresdefault`) and fade it in on top — no layout change.
 * 4. **Browser hints**: high priority + preload for the first-paint URL; the upgrade uses lower priority
 *    so it does not compete with the image you see first.
 *
 * Archive cards and other pages keep using `PreferredYoutubeImageSlot` (maxres-first chain).
 */
export default function HomeHeroYoutubeThumb({
  resetKey,
  rssImage,
  youtubeVideoId,
  youtubeThumbnailPreferred,
  awaitYoutubeOverlay,
  imageClassName = '',
}: Props) {
  const rss = rssImage?.trim() ?? '';
  const id = youtubeVideoId?.trim() ?? '';

  /** Step 1 for the hero: `hqdefault` → `mqdefault` → `default` (no maxres in this list). */
  const baseUrls = useMemo(() => {
    if (!id || id.length !== 11) return [];
    return youtubeHeroFirstPaintThumbnailUrls(id);
  }, [id]);

  /** Step 2: sharper image on top when it finishes loading (optional). */
  const upgradeUrl = useMemo(
    () => (id.length === 11 ? youtubeHeroSharperUpgradeUrl(id, youtubeThumbnailPreferred) : undefined),
    [id, youtubeThumbnailPreferred],
  );

  const [ytIndex, setYtIndex] = useState(0);
  const [useRssFallback, setUseRssFallback] = useState(false);
  const [baseReady, setBaseReady] = useState(false);
  const [upgradeReady, setUpgradeReady] = useState(false);
  const [upgradeFailed, setUpgradeFailed] = useState(false);

  useEffect(() => {
    setYtIndex(0);
    setUseRssFallback(false);
    setBaseReady(false);
    setUpgradeReady(false);
    setUpgradeFailed(false);
  }, [resetKey, id, awaitYoutubeOverlay]);

  /**
   * Ask the browser to start fetching the first-paint URL as soon as we leave the skeleton state.
   * The `<img>` below requests the same URL; together this helps the hero win the network queue.
   */
  useLayoutEffect(() => {
    if (awaitYoutubeOverlay || baseUrls.length === 0) return;
    const href = baseUrls[0];
    const linkId = `eggs-hero-thumb-preload-${resetKey}`;
    if (document.getElementById(linkId)) return;
    const link = document.createElement('link');
    link.id = linkId;
    link.rel = 'preload';
    link.as = 'image';
    link.href = href;
    link.setAttribute('fetchpriority', 'high');
    document.head.appendChild(link);
    return () => {
      document.getElementById(linkId)?.remove();
    };
  }, [awaitYoutubeOverlay, resetKey, baseUrls]);

  if (awaitYoutubeOverlay) {
    return (
      <>
        <MediaLoadingShimmer retreating={false} />
        <span className="sr-only">Loading episode artwork</span>
      </>
    );
  }

  if (baseUrls.length > 0 && !useRssFallback) {
    const baseSrc = baseUrls[Math.min(ytIndex, baseUrls.length - 1)];
    const showUpgrade = Boolean(upgradeUrl && !upgradeFailed && upgradeUrl !== baseSrc);

    return (
      <>
        <MediaLoadingShimmer retreating={baseReady} />
        {/* Layer A — fast, reliable thumbnail (never starts with maxresdefault.jpg) */}
        <img
          key={`hero-base-${ytIndex}-${baseSrc}`}
          src={baseSrc}
          alt=""
          loading="eager"
          fetchPriority="high"
          className={`absolute inset-0 z-[10] h-full w-full object-cover transition-opacity duration-500 ${
            baseReady ? 'opacity-100' : 'opacity-0'
          } ${imageClassName}`}
          onLoad={() => setBaseReady(true)}
          onError={() => {
            setBaseReady(false);
            if (ytIndex < baseUrls.length - 1) {
              setYtIndex((i) => i + 1);
            } else {
              setUseRssFallback(true);
            }
          }}
        />
        {/* Layer B — optional sharper image; stays invisible until both it and the base have loaded */}
        {showUpgrade && (
          <img
            key={`hero-upgrade-${upgradeUrl}`}
            src={upgradeUrl}
            alt=""
            loading="eager"
            fetchPriority="low"
            className={`absolute inset-0 z-[12] h-full w-full object-cover transition-opacity duration-700 ${
              baseReady && upgradeReady ? 'opacity-100' : 'opacity-0'
            } ${imageClassName}`}
            onLoad={() => setUpgradeReady(true)}
            onError={() => setUpgradeFailed(true)}
          />
        )}
      </>
    );
  }

  if (rss) {
    return (
      <>
        <MediaLoadingShimmer retreating={baseReady} />
        <img
          src={rss}
          alt=""
          loading="eager"
          fetchPriority="high"
          className={`absolute inset-0 z-[10] h-full w-full object-cover transition-opacity duration-500 ${
            baseReady ? 'opacity-100' : 'opacity-0'
          } ${imageClassName}`}
          onLoad={() => setBaseReady(true)}
        />
      </>
    );
  }

  return <div className="absolute inset-0 z-[5] eggs-skeleton-block" aria-hidden />;
}

import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  youtubeHeroFinestUpgradeUrl,
  youtubeHeroFirstPaintThumbnailUrls,
  youtubeHeroMidUpgradeUrl,
} from '../lib/youtubeThumbnails';
import { MediaLoadingShimmer } from './MediaLoadingShimmer';

const HERO_THUMB_SESSION_PREFIX = 'eggs-hero-thumb-url:';

function readCachedHeroThumbUrl(slug: string): string | undefined {
  try {
    const u = sessionStorage.getItem(HERO_THUMB_SESSION_PREFIX + slug)?.trim();
    return u || undefined;
  } catch {
    return undefined;
  }
}

function writeCachedHeroThumbUrl(slug: string, url: string) {
  try {
    sessionStorage.setItem(HERO_THUMB_SESSION_PREFIX + slug, url);
  } catch {
    /* storage full or disabled — ignore */
  }
}

type Props = {
  /** Changes when the episode changes (RSS slug) so loading state resets cleanly. */
  resetKey: string;
  /** Podcast artwork from RSS — only when YouTube has no match or every URL fails (never during skeleton / cache-only phase). */
  rssImage?: string;
  /** Set when the app matched this episode to a YouTube upload. */
  youtubeVideoId?: string;
  /**
   * Data API thumbnail URL — **never** used as the first paint. It is only a *finest* upgrade layer
   * after mq → hq have had a chance to show.
   */
  youtubeThumbnailPreferred?: string;
  /**
   * True while the YouTube channel snapshot is still loading (when an API key exists).
   * We never show RSS art here — only skeleton, or a **session-cached YouTube URL** for this slug
   * (still YouTube, not RSS — avoids the old RSS→YouTube flash).
   */
  awaitYoutubeOverlay: boolean;
  /** Passed through to the `<img>` tags (e.g. hover zoom). */
  imageClassName?: string;
};

/**
 * **Homepage latest-episode hero only** — perceived speed first:
 *
 * 1. **Skeleton** while `awaitYoutubeOverlay`, **unless** we have a **session-cached YouTube URL**
 *    for this slug — then we paint that immediately (still not RSS).
 * 2. **First paint** is always a **small** CDN file: `mqdefault.jpg`, then `default.jpg` on error.
 *    We never start with `youtubeThumbnailPreferred` or `maxresdefault` — that was the old bug
 *    when “preferred” was merged into the first chain.
 * 3. **Upgrade A (`hqdefault`)** loads in parallel and crossfades in over the tiny image.
 * 4. **Upgrade B** — Data API `youtubeThumbnailPreferred` if it is a different URL, else
 *    `maxresdefault.jpg` — crossfades in last when ready.
 * 5. The **best** URL we successfully show is saved to `sessionStorage` for the next visit.
 *
 * Featured rows and the archive still use `PreferredYoutubeImageSlot` (unchanged).
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

  const cachedWhileWaiting = useMemo(() => readCachedHeroThumbUrl(resetKey), [resetKey]);

  /** Smallest first: mq → default (never hq or “preferred” here). */
  const baseUrls = useMemo(() => {
    if (!id || id.length !== 11) return [];
    return youtubeHeroFirstPaintThumbnailUrls(id);
  }, [id]);

  const hqUrl = useMemo(() => (id.length === 11 ? youtubeHeroMidUpgradeUrl(id) : undefined), [id]);

  const finestUrl = useMemo(
    () => (id.length === 11 ? youtubeHeroFinestUpgradeUrl(id, youtubeThumbnailPreferred) : undefined),
    [id, youtubeThumbnailPreferred],
  );

  const [ytIndex, setYtIndex] = useState(0);
  const [useRssFallback, setUseRssFallback] = useState(false);
  const [baseReady, setBaseReady] = useState(false);
  const [hqReady, setHqReady] = useState(false);
  const [hqFailed, setHqFailed] = useState(false);
  const [finestReady, setFinestReady] = useState(false);
  const [finestFailed, setFinestFailed] = useState(false);

  useEffect(() => {
    setYtIndex(0);
    setUseRssFallback(false);
    setBaseReady(false);
    setHqReady(false);
    setHqFailed(false);
    setFinestReady(false);
    setFinestFailed(false);
  }, [resetKey, id, awaitYoutubeOverlay]);

  /** First-paint URL only — `mqdefault` (or `default` after errors). */
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

  /**
   * Still waiting on YouTube channel data: show skeleton, **or** a cached YouTube thumbnail for this
   * slug so repeat visits feel instant (not RSS — avoids the ugly swap).
   */
  if (awaitYoutubeOverlay) {
    if (cachedWhileWaiting) {
      return (
        <img
          src={cachedWhileWaiting}
          alt=""
          loading="eager"
          fetchPriority="high"
          className={`absolute inset-0 z-[10] h-full w-full object-cover ${imageClassName}`}
        />
      );
    }
    return (
      <>
        <MediaLoadingShimmer retreating={false} />
        <span className="sr-only">Loading episode artwork</span>
      </>
    );
  }

  if (baseUrls.length > 0 && !useRssFallback) {
    const baseSrc = baseUrls[Math.min(ytIndex, baseUrls.length - 1)];
    const showHq = Boolean(hqUrl && !hqFailed);
    const showFinest = Boolean(
      finestUrl && !finestFailed && finestUrl !== baseSrc && finestUrl !== hqUrl,
    );

    /** Softer look on the tiny mq layer until hq, finest, or “give up on hq with no finest” kicks in. */
    const sharpVisible =
      hqReady || finestReady || (Boolean(hqFailed) && !showFinest);
    const blurBase = baseReady && !sharpVisible;

    return (
      <>
        <MediaLoadingShimmer retreating={baseReady} />
        {/* Layer 1 — fastest file size (mq / default). Never youtubeThumbnailPreferred. */}
        <img
          key={`hero-base-${ytIndex}-${baseSrc}`}
          src={baseSrc}
          alt=""
          loading="eager"
          fetchPriority="high"
          className={`absolute inset-0 z-[10] h-full w-full object-cover transition-all duration-500 ${
            baseReady ? 'opacity-100' : 'opacity-0'
          } ${blurBase ? 'blur-sm scale-[1.02]' : ''} ${imageClassName}`}
          onLoad={() => {
            setBaseReady(true);
            writeCachedHeroThumbUrl(resetKey, baseSrc);
          }}
          onError={() => {
            setBaseReady(false);
            if (ytIndex < baseUrls.length - 1) {
              setYtIndex((i) => i + 1);
            } else {
              setUseRssFallback(true);
            }
          }}
        />
        {/* Layer 2 — hq (parallel); not the first paint, but much sharper than mq */}
        {showHq && hqUrl && (
          <img
            key={`hero-hq-${hqUrl}`}
            src={hqUrl}
            alt=""
            loading="eager"
            fetchPriority="auto"
            className={`absolute inset-0 z-[11] h-full w-full object-cover transition-opacity duration-500 ${
              baseReady && hqReady ? 'opacity-100' : 'opacity-0'
            } ${imageClassName}`}
            onLoad={() => {
              setHqReady(true);
              writeCachedHeroThumbUrl(resetKey, hqUrl);
            }}
            onError={() => setHqFailed(true)}
          />
        )}
        {/* Layer 3 — API preferred or maxres; never competes with first paint */}
        {showFinest && finestUrl && (
          <img
            key={`hero-finest-${finestUrl}`}
            src={finestUrl}
            alt=""
            loading="eager"
            fetchPriority="low"
            className={`absolute inset-0 z-[12] h-full w-full object-cover transition-opacity duration-700 ${
              baseReady && finestReady ? 'opacity-100' : 'opacity-0'
            } ${imageClassName}`}
            onLoad={() => {
              setFinestReady(true);
              writeCachedHeroThumbUrl(resetKey, finestUrl);
            }}
            onError={() => setFinestFailed(true)}
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

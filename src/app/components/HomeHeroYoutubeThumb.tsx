import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { youtubeHeroFirstPaintThumbnailUrls, youtubeHeroSharpUpgradeUrl } from '../lib/youtubeThumbnails';
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
  resetKey: string;
  rssImage?: string;
  /**
   * Resolved id for thumbnail URLs — from the parent. Usually the overlay match; while the channel
   * is still loading it may be an id parsed from RSS show notes (still `i.ytimg.com`, not podcast art).
   */
  youtubeVideoId?: string;
  /** Data API URL — never the first `<img>` src; only the optional sharp upgrade layer. */
  youtubeThumbnailPreferred?: string;
  /**
   * When true, show skeleton (or session-cached YouTube URL) — hero is still waiting for a usable
   * id. Parent sets this to **false** when an RSS-derived guess exists so the hero need not wait on
   * the full YouTube channel pipeline.
   */
  awaitYoutubeOverlay: boolean;
  imageClassName?: string;
};

/**
 * **Only** the homepage latest-episode hero uses this component.
 *
 * One strategy: **small first paint** (`mqdefault` → `default`), then **one** sharper layer
 * (`youtubeHeroSharpUpgradeUrl` — API thumb when it differs from mq/hq, else `hqdefault`).
 * No RSS image until all YouTube URLs fail or the parent decides there is no id (see `Home.tsx`).
 * Session cache can show a previous YouTube URL only while the hero is still blocked on overlay
 * **without** a guessed id (still not RSS artwork).
 *
 * Featured grid and `/episodes` use `PreferredYoutubeImageSlot` (maxres-first chain) — unchanged.
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

  const baseUrls = useMemo(() => {
    if (!id || id.length !== 11) return [];
    return youtubeHeroFirstPaintThumbnailUrls(id);
  }, [id]);

  const sharpUrl = useMemo(
    () => (id.length === 11 ? youtubeHeroSharpUpgradeUrl(id, youtubeThumbnailPreferred) : undefined),
    [id, youtubeThumbnailPreferred],
  );

  const [ytIndex, setYtIndex] = useState(0);
  const [useRssFallback, setUseRssFallback] = useState(false);
  const [baseReady, setBaseReady] = useState(false);
  const [sharpReady, setSharpReady] = useState(false);
  const [sharpFailed, setSharpFailed] = useState(false);

  useEffect(() => {
    setYtIndex(0);
    setUseRssFallback(false);
    setBaseReady(false);
    setSharpReady(false);
    setSharpFailed(false);
  }, [resetKey, id, awaitYoutubeOverlay]);

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
    const showSharp = Boolean(
      sharpUrl && !sharpFailed && sharpUrl !== baseSrc,
    );
    const sharpDone = sharpReady || sharpFailed;
    const blurBase = baseReady && !sharpDone;

    return (
      <>
        <MediaLoadingShimmer retreating={baseReady} />
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
        {showSharp && sharpUrl && (
          <img
            key={`hero-sharp-${sharpUrl}`}
            src={sharpUrl}
            alt=""
            loading="eager"
            fetchPriority="low"
            className={`absolute inset-0 z-[11] h-full w-full object-cover transition-opacity duration-500 ${
              baseReady && sharpReady ? 'opacity-100' : 'opacity-0'
            } ${imageClassName}`}
            onLoad={() => {
              setSharpReady(true);
              writeCachedHeroThumbUrl(resetKey, sharpUrl);
            }}
            onError={() => setSharpFailed(true)}
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

import { useMemo, useState } from 'react';
import { youtubeThumbnailFallbackUrls } from '../lib/youtubeThumbnails';

type Props = {
  videoId: string;
  /** When the playlist feed already gave a `<media:thumbnail>` URL, try it first */
  preferredUrl?: string;
  className?: string;
};

/**
 * Renders a YouTube poster image, stepping down through quality URLs if one 404s.
 * No API key — uses Google’s public `i.ytimg.com` URLs (plus an optional feed thumbnail first).
 */
export default function YouTubePosterImage({ videoId, preferredUrl, className }: Props) {
  const urls = useMemo(() => {
    const chain = youtubeThumbnailFallbackUrls(videoId);
    const p = preferredUrl?.trim();
    if (!p) return chain;
    const rest = chain.filter((u) => u !== p);
    return [p, ...rest];
  }, [videoId, preferredUrl]);

  const [index, setIndex] = useState(0);

  if (urls.length === 0) return null;

  return (
    <img
      src={urls[index]}
      alt=""
      className={className}
      onError={() => {
        setIndex((i) => (i < urls.length - 1 ? i + 1 : i));
      }}
    />
  );
}

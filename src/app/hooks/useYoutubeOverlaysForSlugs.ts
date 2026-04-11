import { useMemo } from 'react';
import { buildYoutubeOverlaysForEpisodes } from '../lib/computeEpisodeYoutubeOverlay';
import type { Episode } from '../types/episode';
import type { YoutubeEpisodeOverlay } from '../types/youtubeOverlay';
import { useYoutubeChannelData } from './useYoutubeChannelData';

/** Stable key for dependency arrays (order-insensitive). */
function slugsDependencyKey(slugs: string[]): string {
  if (slugs.length === 0) return '';
  return [...new Set(slugs.filter(Boolean))].sort().join('|');
}

/**
 * YouTube overlay map for **only** the slugs you pass in (e.g. visible archive rows or
 * one episode detail page). RSS rows stay unchanged; merge in the component with
 * `mergeEpisodeForDisplay(ep, overlays[ep.slug])` where needed.
 */
export function useYoutubeOverlaysForSlugs(rssEpisodes: Episode[] | null, slugs: string[]) {
  const channel = useYoutubeChannelData();

  const overlays = useMemo(() => {
    if (!channel.data || !rssEpisodes?.length || slugs.length === 0) {
      return {} as Record<string, YoutubeEpisodeOverlay>;
    }
    const want = new Set(slugs.filter(Boolean));
    const subset = rssEpisodes.filter((e) => want.has(e.slug));
    return buildYoutubeOverlaysForEpisodes(subset, channel.data);
  }, [channel.data, rssEpisodes, slugsDependencyKey(slugs)]);

  return {
    overlays,
    channelLoading: channel.loading,
    channelError: channel.error,
    retryChannel: channel.retry,
    hasApiKey: channel.hasApiKey,
  };
}
